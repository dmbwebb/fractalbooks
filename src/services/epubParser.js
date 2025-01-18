// services/epubParser.js
import ePub from 'epubjs';

class EPUBParser {
  constructor() {
    this.book = null;
    this.structure = null;
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
        this.book.loaded.resources
      ]);
      console.log('[EPUBParser] All book components loaded (spine, metadata, navigation, resources)');

      if (!this.book.spine || !this.book.spine.items || this.book.spine.items.length === 0) {
        console.warn('[EPUBParser] No spine items found via book.spine. Attempting fallback approach for Apple Books–style structure');
        await this.fallbackSpineCheck();
      }

      if (!this.book.spine || !this.book.spine.items || this.book.spine.items.length === 0) {
        throw new Error('[EPUBParser] Even after fallback, no spine items were found. The EPUB might be corrupted or heavily DRM-locked.');
      }

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
   * This is a fallback approach for Apple Books–style EPUBs that may place content in OEBPS.
   */
  async fallbackSpineCheck() {
    try {
      console.log('[EPUBParser][Fallback] Checking resources for possible OEBPS items...');
      if (this.book.resources && this.book.resources.resources) {
        const resourceItems = this.book.resources.resources;
        // This logs out all resource paths for debugging
        console.log('[EPUBParser][Fallback] Resource items found:', Object.keys(resourceItems));

        // Attempt to find all ".xhtml" or ".html" files in OEBPS folder
        const potentialChapters = Object.keys(resourceItems).filter((key) => {
          const lowerKey = key.toLowerCase();
          return (
            (lowerKey.endsWith('.xhtml') || lowerKey.endsWith('.html')) &&
            !lowerKey.includes('nav') &&
            !lowerKey.includes('cover')
          );
        });

        console.log('[EPUBParser][Fallback] Potential chapters in OEBPS:', potentialChapters);

        // Manually build a fallback spine for ePubJS
        this.book.spine.items = potentialChapters.map((itemHref, index) => {
          return {
            id: index, // fallback ID
            index,
            href: itemHref,
            url: itemHref, // ePubJS typically sets 'url' to the path
            linear: 'yes'
          };
        });

        // If we still have no items, log a warning
        if (this.book.spine.items.length === 0) {
          console.warn('[EPUBParser][Fallback] No fallback chapters found in OEBPS.');
        } else {
          console.log(`[EPUBParser][Fallback] Fallback spine created with ${this.book.spine.items.length} items.`);
        }
      } else {
        console.warn('[EPUBParser][Fallback] No resources found to build fallback spine. Aborting fallback.');
      }
    } catch (err) {
      console.error('[EPUBParser][Fallback] Error while performing fallback spine check:', err);
    }
  }

  /**
   * Parse the overall structure of the loaded book (title, chapters, paragraphs, etc.).
   * @returns {Object} - The structured representation of the EPUB
   */
  async parseBookStructure() {
    console.log('[EPUBParser] Creating initial structure object');
    const structure = {
      title: this.book.package?.metadata?.title || 'Untitled EPUB',
      metadata: this.book.package?.metadata || {},
      levels: {
        book: {
          content: '',
          summaries: []
        },
        chapters: []
      }
    };

    // Filter out nav or cover files from the spine
    const contentItems = (this.book.spine?.items || []).filter(item => {
      const href = item.href || item.url;
      if (!href) return false;
      const lowerHref = href.toLowerCase();
      // skip 'nav' or 'cover' references
      if (lowerHref.includes('nav') || lowerHref.includes('cover')) {
        console.log('[EPUBParser] Skipping spine item (nav/cover):', href);
        return false;
      }
      return true;
    });

    console.log(`[EPUBParser] Spine-based content items to parse: ${contentItems.length}`);

    for (let i = 0; i < contentItems.length; i++) {
      const spineItem = contentItems[i];
      const itemHref = spineItem.href || spineItem.url;
      console.log(`[EPUBParser] Processing chapter ${i + 1}/${contentItems.length}: ${itemHref}`);

      try {
        const chapterTitle = await this.findTitleFromToc(itemHref) || `Chapter ${i + 1}`;
        const chapter = {
          id: spineItem.index ?? i,
          href: itemHref,
          title: chapterTitle,
          content: '',
          paragraphs: [],
          summaries: []
        };

        console.log(`[EPUBParser] Loading content for chapter: ${chapter.title} (${itemHref})`);
        const chapterText = await this.getChapterContent(itemHref);
        chapter.content = chapterText;
        console.log(`[EPUBParser] Chapter content loaded, length: ${chapter.content.length}`);

        // Extract paragraphs by searching for <p> tags
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = chapterText;
        const paragraphs = Array.from(tempDiv.querySelectorAll('p'));
        chapter.paragraphs = paragraphs.map(p => ({
          content: p.textContent.trim(),
          summaries: []
        }));

        console.log(`[EPUBParser] Extracted ${chapter.paragraphs.length} paragraphs from chapter "${chapter.title}"`);

        structure.levels.chapters.push(chapter);
        console.log(`[EPUBParser] Completed processing chapter ${i + 1}`);
      } catch (error) {
        console.error(`[EPUBParser] Error processing chapter ${i + 1}:`, error);
      }
    }

    console.log('[EPUBParser] Combining all chapter text for book-level content');
    structure.levels.book.content = structure.levels.chapters
      .map(chapter => chapter.content)
      .join('\n\n');

    console.log('[EPUBParser] Structure parsing complete');
    console.log('[EPUBParser] Total chapters parsed:', structure.levels.chapters.length);
    console.log('[EPUBParser] Total book content length:', structure.levels.book.content.length);

    return structure;
  }

  /**
   * Fetch the full HTML content of the chapter identified by href.
   * @param {string} href - The chapter file path
   * @returns {Promise<string>} - The raw HTML content of the chapter
   */
  async getChapterContent(href) {
    console.log('[EPUBParser] Attempting to load chapter content:', href);

    // Attempt to find the item index within the spine
    const index = this.book.spine?.items?.findIndex(item => {
      const itemHref = item.href || item.url || '';
      return (
        itemHref === href ||
        itemHref === href.replace(/^text\//, '') ||
        `text/${itemHref}` === href ||
        // handle possible OEBPS folder prefix (e.g., 'OEBPS/chapter_01.xhtml')
        itemHref === href.replace(/^OEBPS\//, '') ||
        `OEBPS/${itemHref}` === href
      );
    });

    if (typeof index !== 'number' || index === -1) {
      console.warn('[EPUBParser] Chapter not found in spine:', href);
      console.log('[EPUBParser] Available spine items:',
        (this.book.spine?.items || []).map(item => item.href || item.url)
      );
      throw new Error(`Chapter not found: ${href}`);
    }

    const section = this.book.spine.get(index);
    if (!section) {
      throw new Error(`Could not load section for: ${href}`);
    }

    console.log(`[EPUBParser] Section found in spine at index ${index}. Loading document...`);
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
        console.warn('[EPUBParser] No navigation or TOC object found in book.navigation');
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
        foundLabel = findInItems(navigation.toc.map(item => {
          return { ...item, href: `OEBPS/${item.href}` };
        }));
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
        exportDate: new Date().toISOString()
      }
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
      throw new Error('[EPUBParser] Invalid export data format: missing structure/metadata');
    }
    this.structure = exportedData.structure;
    return this.structure;
  }
}

export default EPUBParser;
