// services/epubParser.js
import ePub from 'epubjs';
import OpenAIService from './openai';

class EPUBParser {
  constructor(openaiService) {
    this.book = null;
    this.structure = null;
    this.bodyTextClasses = [];
    this.openai = openaiService;
  }

  /**
   * Load the EPUB file into ePubJS and parse its structure.
   * @param {ArrayBuffer} arrayBuffer - The EPUB file data as an ArrayBuffer
   * @param {string} filename - The original file name
   */
  async loadBook(arrayBuffer, filename) {
    try {
      console.log('[EPUBParser] Starting to load EPUB file:', filename);
      console.log('[EPUBParser] ArrayBuffer size:', arrayBuffer.byteLength);

      // Initialize ePubJS Book object
      this.book = ePub();
      await this.book.open(arrayBuffer);
      console.log('[EPUBParser] Book opened successfully');

      // Ensure all essential parts of the book are loaded
      await Promise.all([
        this.book.loaded.spine,
        this.book.loaded.metadata,
        this.book.loaded.navigation,
        this.book.loaded.resources,
      ]);
      console.log(
        '[EPUBParser] All book components loaded (spine, metadata, navigation, resources)'
      );

      if (
        !this.book.spine ||
        !this.book.spine.items ||
        this.book.spine.items.length === 0
      ) {
        console.warn(
          '[EPUBParser] No spine items found via book.spine. Attempting fallback approach for Apple Books–style structure'
        );
        await this.fallbackSpineCheck();
      }

      if (
        !this.book.spine ||
        !this.book.spine.items ||
        this.book.spine.items.length === 0
      ) {
        throw new Error(
          '[EPUBParser] Even after fallback, no spine items were found. The EPUB might be corrupted or heavily DRM-locked.'
        );
      }

      console.log('[EPUBParser] Starting to identify body text classes...');
      await this.identifyBodyTextClasses();
      console.log(
        '[EPUBParser] Identified body text classes:',
        this.bodyTextClasses
      );

      console.log('[EPUBParser] Starting to parse book structure...');
      this.structure = await this.parseBookStructure();
      console.log('[EPUBParser] Book structure parsed successfully');

      return this.structure;
    } catch (error) {
      console.error('[EPUBParser] Error in loadBook:', error);
      throw new Error(`Failed to load EPUB file: ${error.message}`);
    }
  }

  /**
   * Attempt to find spine items manually if ePubJS doesn't populate them.
   */
  async fallbackSpineCheck() {
    try {
      console.log(
        '[EPUBParser][Fallback] Checking resources for possible OEBPS items...'
      );
      if (this.book.resources && this.book.resources.resources) {
        const resourceItems = this.book.resources.resources;
        console.log(
          '[EPUBParser][Fallback] Resource items found:',
          Object.keys(resourceItems)
        );

        const potentialChapters = Object.keys(resourceItems).filter((key) => {
          const lowerKey = key.toLowerCase();
          return (
            (lowerKey.endsWith('.xhtml') || lowerKey.endsWith('.html')) &&
            !lowerKey.includes('nav') &&
            !lowerKey.includes('cover')
          );
        });

        console.log(
          '[EPUBParser][Fallback] Potential chapters in OEBPS:',
          potentialChapters
        );

        this.book.spine.items = potentialChapters.map((itemHref, index) => {
          return {
            id: index, // fallback ID
            index,
            href: itemHref,
            url: itemHref, // ePubJS typically sets 'url' to the path
            linear: 'yes',
          };
        });

        if (this.book.spine.items.length === 0) {
          console.warn(
            '[EPUBParser][Fallback] No fallback chapters found in OEBPS.'
          );
        } else {
          console.log(
            `[EPUBParser][Fallback] Fallback spine created with ${this.book.spine.items.length} items.`
          );
        }
      } else {
        console.warn(
          '[EPUBParser][Fallback] No resources found to build fallback spine. Aborting fallback.'
        );
      }
    } catch (err) {
      console.error(
        '[EPUBParser][Fallback] Error while performing fallback spine check:',
        err
      );
    }
  }

  /**
   * Identify HTML classes used for body text by analyzing two middle chapters.
   */
  async identifyBodyTextClasses() {
    try {
      const contentItems = this.getContentItems();
      if (contentItems.length < 3) {
        console.warn(
          '[EPUBParser] Not enough chapters to perform body class identification.'
        );
        return;
      }

      // Select two chapters from the middle of the book
      const middleIndex = Math.floor(contentItems.length / 2);
      const sampleIndices = [middleIndex - 1, middleIndex];

      let combinedHtmlContent = '';

      for (const index of sampleIndices) {
        const spineItem = contentItems[index];
        const itemHref = spineItem.href || spineItem.url;
        console.log(
          `[EPUBParser] Analyzing chapter at index ${index}: ${itemHref}`
        );

        const chapterContent = await this.getChapterContent(itemHref);
        combinedHtmlContent += chapterContent;
      }

      // Feed the combined HTML content to OpenAI
      this.bodyTextClasses = await this.extractBodyTextClassesFromHtml(
        combinedHtmlContent
      );

      console.log(
        '[EPUBParser] Body text classes identified:',
        this.bodyTextClasses
      );
    } catch (error) {
      console.error(
        '[EPUBParser] Error identifying body text classes:',
        error
      );
      throw error;
    }
  }

  /**
   * Extract all HTML classes from the chapter content.
   * @param {string} htmlContent - The HTML content of a chapter
   * @returns {Array<string>} - List of class names
   */
  async extractBodyTextClassesFromHtml(htmlContent) {
    try {
      console.log(
        '[EPUBParser] Extracting body text classes from HTML content using OpenAI...'
      );

      // Trim the content if it's too long (OpenAI has input token limits)
      const maxTokens = 3000; // Adjust as needed to stay within OpenAI limits
      const tokenizedContent = this.tokenizeText(htmlContent);
      let trimmedContent = tokenizedContent.slice(0, maxTokens).join('');

      // Prompt to send to OpenAI
      const prompt = `You are analyzing the HTML content of an EPUB book to identify the HTML classes or tags used for main body text paragraphs. The following is the combined HTML content of two sample chapters:

<sample_html>
${trimmedContent}
</sample_html>

Please analyze this HTML content and return a JSON array of the class names or tag names that are consistently used for main body text paragraphs in the book. Exclude any classes or tags used for headings, titles, footers, images, or other non-body content. Only include selectors that can be used to extract the main textual content of the book.

Return the JSON array only, without any additional text, markdown formatting, or explanations. Do not include any code block markers like \`\`\`.`;

      const response = await this.openai.analyzeClasses(prompt);

      // Sanitize and parse the JSON response
      let jsonResponse = response.trim();

      // Remove any code block markers or ```json if present
      jsonResponse = jsonResponse.replace(/```(?:json)?/g, '').trim();

      // Optionally, remove any leading or trailing text before the JSON array
      const jsonStart = jsonResponse.indexOf('[');
      const jsonEnd = jsonResponse.lastIndexOf(']');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        jsonResponse = jsonResponse.substring(jsonStart, jsonEnd + 1);
      } else {
        throw new Error('Invalid JSON response from OpenAI.');
      }

      const bodySelectors = JSON.parse(jsonResponse);

      return bodySelectors;
    } catch (error) {
      console.error(
        '[EPUBParser] Error extracting body text classes from HTML:',
        error
      );
      throw error;
    }
  }

  /**
   * Tokenize text into approximate tokens for OpenAI.
   * @param {string} text - The text to tokenize
   * @returns {Array<string>} - Array of tokens
   */
  tokenizeText(text) {
    // Simple tokenizer splitting on spaces and newlines
    return text.split(/\s+/);
  }

  /**
   * Get content items excluding nav and cover pages.
   * @returns {Array} - List of spine items to be processed
   */
  getContentItems() {
    // Filter out nav or cover files from the spine
    return (this.book.spine?.items || []).filter((item) => {
      const href = item.href || item.url;
      if (!href) return false;
      const lowerHref = href.toLowerCase();
      // Skip 'nav' or 'cover' references
      if (lowerHref.includes('nav') || lowerHref.includes('cover')) {
        console.log('[EPUBParser] Skipping spine item (nav/cover):', href);
        return false;
      }
      return true;
    });
  }

  /**
   * Use OpenAI to refine the list of body text classes.
   * @param {Array<string>} classList - List of class names to analyze
   * @returns {Array<string>} - List of classes corresponding to body text
   */
  /**
   * Use OpenAI to refine the list of body text classes.
   * @param {Array<string>} classList - List of class names to analyze
   * @returns {Array<string>} - List of classes corresponding to body text
   */
  async refineBodyTextClasses(classList) {
    try {
      console.log(
        '[EPUBParser] Refining body text classes using OpenAI...',
        classList
      );

      const prompt = `You are analyzing HTML classes from an EPUB book. The following is a JSON array of class names extracted from chapter body text:

${JSON.stringify(classList)}

Analyze this list and return a JSON array of class names that are most likely used for normal body text paragraphs in the book. Exclude any classes used for headings, titles, footers, images, or other non-body content. Only include classes that are consistently used for main body text across chapters.

Return the JSON array only, without any additional text, markdown formatting, or explanations. Do not include any code block markers like \`\`\`.`;

      const response = await this.openai.analyzeClasses(prompt);

      // Sanitize and parse the JSON response
      let jsonResponse = response.trim();

      // Remove any code block markers or ```json if present
      jsonResponse = jsonResponse.replace(/```(?:json)?/g, '').trim();

      // Optionally, remove any leading or trailing text before the JSON array
      const jsonStart = jsonResponse.indexOf('[');
      const jsonEnd = jsonResponse.lastIndexOf(']');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        jsonResponse = jsonResponse.substring(jsonStart, jsonEnd + 1);
      } else {
        throw new Error('Invalid JSON response from OpenAI.');
      }

      const bodyClasses = JSON.parse(jsonResponse);

      console.log('[EPUBParser] Body text classes identified:', bodyClasses);

      return bodyClasses;
    } catch (error) {
      console.error('[EPUBParser] Error refining body text classes:', error);
      throw error;
    }
  }


  /**
   * Parse the overall structure of the loaded book (title, chapters, paragraphs, etc.).
   * @returns {Object} - The structured representation of the EPUB
   */
  async parseBookStructure() {
    console.log('[EPUBParser] Creating initial structure object');
    const structure = {
      title:
        this.book.package?.metadata?.title || 'Untitled EPUB',
      metadata: this.book.package?.metadata || {},
      levels: {
        book: {
          content: '',
          summaries: [],
        },
        chapters: [],
      },
    };

    const contentItems = this.getContentItems();

    console.log(
      `[EPUBParser] Spine-based content items to parse: ${contentItems.length}`
    );

    for (let i = 0; i < contentItems.length; i++) {
      const spineItem = contentItems[i];
      const itemHref = spineItem.href || spineItem.url;
      console.log(
        `[EPUBParser] Processing chapter ${i + 1}/${contentItems.length}: ${itemHref}`
      );

      try {
        const chapterTitle =
          (await this.findTitleFromToc(itemHref)) || `Chapter ${i + 1}`;
        const chapter = {
          id: spineItem.index ?? i,
          href: itemHref,
          title: chapterTitle,
          content: '',
          paragraphs: [],
          summaries: [],
          skip: false,
        };

        console.log(
          `[EPUBParser] Loading content for chapter: ${chapter.title} (${itemHref})`
        );
        const chapterText = await this.getChapterContent(itemHref);
        chapter.content = chapterText;
        console.log(
          `[EPUBParser] Chapter content loaded, length: ${chapter.content.length}`
        );

        // Extract paragraphs using the identified body text classes
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = chapterText;

        let paragraphs = [];

        if (this.bodyTextClasses.length > 0) {
          this.bodyTextClasses.forEach((cls) => {
            const elements = tempDiv.querySelectorAll(`.${cls}`);
            elements.forEach((el) => {
              paragraphs.push(el.textContent.trim());
            });
          });
        } else {
          // Fallback to using <p> tags
          console.warn(
            '[EPUBParser] No body text classes identified, falling back to <p> tags.'
          );
          const pElements = tempDiv.querySelectorAll('p');
          pElements.forEach((el) => {
            paragraphs.push(el.textContent.trim());
          });
        }

        // Remove empty paragraphs
        paragraphs = paragraphs.filter((para) => para.length > 0);

        // If no paragraphs found, mark chapter to be skipped
        if (paragraphs.length === 0) {
          console.warn(
            `[EPUBParser] No body text found in chapter "${chapter.title}", marking as skipped.`
          );
          chapter.skip = true;
        }

        chapter.paragraphs = paragraphs.map((para) => ({
          content: para,
          summaries: [],
        }));

        console.log(
          `[EPUBParser] Extracted ${chapter.paragraphs.length} paragraphs from chapter "${chapter.title}"`
        );

        if (!chapter.skip) {
          structure.levels.chapters.push(chapter);
        } else {
          console.log(`[EPUBParser] Chapter "${chapter.title}" skipped.`);
        }

        console.log(`[EPUBParser] Completed processing chapter ${i + 1}`);
      } catch (error) {
        console.error(`[EPUBParser] Error processing chapter ${i + 1}:`, error);
      }
    }

    console.log(
      '[EPUBParser] Combining all chapter text for book-level content'
    );
    structure.levels.book.content = structure.levels.chapters
      .map((chapter) => chapter.content)
      .join('\n\n');

    console.log('[EPUBParser] Structure parsing complete');
    console.log(
      '[EPUBParser] Total chapters parsed:',
      structure.levels.chapters.length
    );
    console.log(
      '[EPUBParser] Total book content length:',
      structure.levels.book.content.length
    );

    return structure;
  }

  /**
   * Get content items excluding nav and cover pages.
   * @returns {Array} - List of spine items to be processed
   */
  getContentItems() {
    // Filter out nav or cover files from the spine
    return (this.book.spine?.items || []).filter((item) => {
      const href = item.href || item.url;
      if (!href) return false;
      const lowerHref = href.toLowerCase();
      // Skip 'nav' or 'cover' references
      if (lowerHref.includes('nav') || lowerHref.includes('cover')) {
        console.log('[EPUBParser] Skipping spine item (nav/cover):', href);
        return false;
      }
      return true;
    });
  }

  /**
   * Fetch the full HTML content of the chapter identified by href.
   * @param {string} href - The chapter file path
   * @returns {Promise<string>} - The raw HTML content of the chapter
   */
  async getChapterContent(href) {
    console.log('[EPUBParser] Attempting to load chapter content:', href);

    // Attempt to find the item index within the spine
    const index = this.book.spine?.items?.findIndex((item) => {
      const itemHref = item.href || item.url || '';
      return (
        itemHref === href ||
        itemHref === href.replace(/^text\//, '') ||
        `text/${itemHref}` === href ||
        // Handle possible OEBPS folder prefix (e.g., 'OEBPS/chapter_01.xhtml')
        itemHref === href.replace(/^OEBPS\//, '') ||
        `OEBPS/${itemHref}` === href
      );
    });

    if (typeof index !== 'number' || index === -1) {
      console.warn('[EPUBParser] Chapter not found in spine:', href);
      console.log(
        '[EPUBParser] Available spine items:',
        (this.book.spine?.items || []).map((item) => item.href || item.url)
      );
      throw new Error(`Chapter not found: ${href}`);
    }

    const section = this.book.spine.get(index);
    if (!section) {
      throw new Error(`Could not load section for: ${href}`);
    }

    console.log(
      `[EPUBParser] Section found in spine at index ${index}. Loading document...`
    );
    await section.load(this.book.load.bind(this.book));

    const doc = section.document;
    if (!doc) {
      throw new Error(`Document not loaded for: ${href}`);
    }

    const content = doc.documentElement.outerHTML;
    return content;
  }

  /**
   * Attempt to find the chapter title from the navigation or fallback to the item label in the TOC.
   * @param {string} href - The chapter file path
   * @returns {Promise<string|null>}
   */
  async findTitleFromToc(href) {
    try {
      const navigation = await this.book.navigation;
      if (!navigation || !navigation.toc) {
        console.warn(
          '[EPUBParser] No navigation or TOC object found in book.navigation'
        );
        return null;
      }

      // Recursively search items and subitems
      const findInItems = (items) => {
        for (const item of items) {
          if (item.href && item.href.includes(href)) {
            return item.label;
          }
          if (item.subitems) {
            const result = findInItems(item.subitems);
            if (result) return result;
          }
        }
        return null;
      };

      // Some Apple Books files may store the href with an "OEBPS/" prefix
      // or a different relative path. We'll try a few variations.
      let foundLabel = findInItems(navigation.toc);
      if (!foundLabel) {
        const altHrefOebps = `OEBPS/${href}`;
        foundLabel = findInItems(
          navigation.toc.map((item) => {
            return { ...item, href: `OEBPS/${item.href}` };
          })
        );
        if (foundLabel) {
          console.log('[EPUBParser] Found a matching label via OEBPS prefix');
        }
      }

      if (foundLabel) {
        console.log('[EPUBParser] Title found in TOC:', foundLabel);
        return foundLabel;
      }
      return null;
    } catch (error) {
      console.error('[EPUBParser] Error in findTitleFromToc:', error);
      return null;
    }
  }

  /**
   * Export the internal structure and relevant metadata in a JSON-friendly format.
   * @returns {Object}
   */
  exportStructure() {
    console.log('[EPUBParser] Exporting book structure');
    return {
      structure: this.structure,
      metadata: {
        title: this.book?.package?.metadata?.title || 'Untitled EPUB',
        creator: this.book?.package?.metadata?.creator,
        exportDate: new Date().toISOString(),
      },
    };
  }

  /**
   * Import a previously exported structure, overriding the current structure.
   * @param {Object} exportedData - The JSON data from a previous export
   * @returns {Object} - The newly imported structure
   */
  importStructure(exportedData) {
    console.log('[EPUBParser] Importing book structure');
    if (!exportedData.structure || !exportedData.metadata) {
      throw new Error(
        '[EPUBParser] Invalid export data format: missing structure/metadata'
      );
    }
    this.structure = exportedData.structure;
    return this.structure;
  }
}

export default EPUBParser;