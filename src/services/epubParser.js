// services/epubParser.js
import ePub from 'epubjs';

class EPUBParser {
  constructor() {
    this.book = null;
    this.structure = null;
  }

  async loadBook(arrayBuffer, filename) {
    try {
      console.log('Starting to load EPUB file:', filename);
      console.log('ArrayBuffer size:', arrayBuffer.byteLength);

      // Create the book instance directly from ArrayBuffer
      this.book = ePub();
      await this.book.open(arrayBuffer);
      console.log('Book opened successfully');

      // Wait for key book components to load
      await Promise.all([
        this.book.loaded.spine,
        this.book.loaded.metadata,
        this.book.loaded.navigation,
        this.book.loaded.resources
      ]);
      console.log('All book components loaded');

      // Basic validation
      if (!this.book.spine) {
        throw new Error('Invalid EPUB: No spine found');
      }

      // Parse the book structure
      console.log('Starting to parse book structure...');
      this.structure = await this.parseBookStructure();
      console.log('Book structure parsed successfully');

      return this.structure;
    } catch (error) {
      console.error('Error in loadBook:', error);
      throw new Error(`Failed to load EPUB file: ${error.message}`);
    }
  }

  async parseBookStructure() {
    try {
      console.log('Creating initial structure object');
      const structure = {
        title: this.book.package.metadata.title,
        metadata: this.book.package.metadata,
        levels: {
          book: {
            content: '',
            summaries: []
          },
          chapters: [],
          sections: [],
          paragraphs: []
        }
      };

      // Filter out any non-content spine items (like nav or cover)
      const contentItems = this.book.spine.items.filter(item => {
        const href = item.href || item.url;
        return href && !href.includes('nav') && !href.includes('cover');
      });

      console.log(`Starting to process content items. Total: ${contentItems.length}`);
      console.log('All spine items:', contentItems.map(item => item.href || item.url));

      // Process each chapter
      for (let i = 0; i < contentItems.length; i++) {
        const spineItem = contentItems[i];
        const itemHref = spineItem.href || spineItem.url;
        console.log(`Processing chapter ${i + 1}/${contentItems.length}:`, itemHref);

        try {
          const chapter = {
            id: spineItem.index,
            href: spineItem.href,
            title: await this.findTitleFromToc(spineItem.href) || `Chapter ${i + 1}`,
            content: '',
            sections: [],
            summaries: []
          };

          console.log(`Loading content for chapter: ${chapter.title}`);
          const chapterText = await this.getChapterContent(spineItem.href);
          chapter.content = chapterText;
          console.log(`Chapter content loaded, length: ${chapter.content.length} characters`);

          // Parse sections using a temporary DOM element
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = chapterText;
          const sections = this.parseSections(tempDiv);
          chapter.sections = sections;
          console.log(`Parsed ${sections.length} sections in chapter`);

          structure.levels.chapters.push(chapter);
          console.log(`Completed processing chapter ${i + 1}`);
        } catch (error) {
          console.error(`Error processing chapter ${i + 1}:`, error);
          // Continue with next chapter even if one fails
        }
      }

      console.log('Combining all text for book-level summary');
      structure.levels.book.content = structure.levels.chapters
        .map(chapter => chapter.content)
        .join('\n\n');

      console.log('Structure parsing complete');
      console.log('Total chapters:', structure.levels.chapters.length);
      console.log('Total book content length:', structure.levels.book.content.length);

      return structure;
    } catch (error) {
      console.error('Error in parseBookStructure:', error);
      throw error;
    }
  }

  async getChapterContent(href) {
    try {
      console.log('Loading chapter content:', href);

      // Get the spine index for this href
      const index = this.book.spine.items.findIndex(item => {
        const itemHref = item.href || item.url;
        return itemHref === href ||
               itemHref === href.replace(/^text\//, '') ||
               `text/${itemHref}` === href;
      });

      if (index === -1) {
        console.log('Available spine items:',
          this.book.spine.items.map(item => item.href || item.url)
        );
        throw new Error(`Chapter not found: ${href}`);
      }

      // Get the section from the spine
      const section = this.book.spine.get(index);
      if (!section) {
        throw new Error(`Could not load section for: ${href}`);
      }

      // Load the section content before accessing the document
      await section.load(this.book.load.bind(this.book));

      const doc = section.document;
      if (!doc) {
        throw new Error(`Document not loaded for: ${href}`);
      }

      console.log('Section loaded, getting raw content...');
      const content = doc.documentElement.outerHTML;
      console.log('Raw content preview:', content?.substring(0, 100));

      // Create a temporary div to parse the content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;

      // Get just the body content
      const bodyElement = tempDiv.querySelector('body');
      const actualContent = bodyElement ? bodyElement.innerHTML : tempDiv.innerHTML;

      // Print out the first 200 characters of the chapter's actual content
      console.log('Raw chapter content (first 1000 chars):', actualContent.substring(0, 1000));

      console.log('Content extracted, length:', actualContent?.length || 0);
      console.log('Content preview:', actualContent?.substring(0, 100));

      return actualContent;
    } catch (error) {
      console.error('Error loading chapter content:', error);
      throw error;
    }
  }

  parseSections(element) {
    const sections = [];
    let currentSection = {
      title: '',
      content: '',
      paragraphs: [],
      summaries: []
    };

    let inParagraph = false;
    let paragraphText = '';

    const processNode = (node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toUpperCase();

        // Handle headings
        if (/^H[1-3]$/.test(tagName)) {
          if (currentSection.content) {
            sections.push({...currentSection});
          }
          currentSection = {
            title: node.textContent.trim(),
            content: '',
            paragraphs: [],
            summaries: []
          };
          return;
        }

        // Handle paragraphs
        if (tagName === 'P') {
          inParagraph = true;
          paragraphText = '';
        }

        // Process child nodes
        node.childNodes.forEach(processNode);

        if (tagName === 'P' && inParagraph) {
          inParagraph = false;
          if (paragraphText.trim()) {
            currentSection.paragraphs.push({
              content: paragraphText.trim(),
              summaries: []
            });
            currentSection.content += paragraphText.trim() + '\n\n';
          }
        }
      } else if (node.nodeType === Node.TEXT_NODE && inParagraph) {
        paragraphText += node.textContent;
      }
    };

    processNode(element);

    // Add the last section if it has content
    if (currentSection.content) {
      sections.push(currentSection);
    }

    return sections;
  }

  async findTitleFromToc(href) {
    try {
      const navigation = await this.book.navigation;
      if (!navigation || !navigation.toc) {
        return null;
      }

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

      return findInItems(navigation.toc) || null;
    } catch (error) {
      console.error('Error finding title:', error);
      return null;
    }
  }

  exportStructure() {
    console.log('Exporting book structure');
    return {
      structure: this.structure,
      metadata: {
        title: this.book.package.metadata.title,
        creator: this.book.package.metadata.creator,
        exportDate: new Date().toISOString()
      }
    };
  }

  importStructure(exportedData) {
    console.log('Importing book structure');
    if (!exportedData.structure || !exportedData.metadata) {
      throw new Error('Invalid export data format');
    }
    this.structure = exportedData.structure;
    return this.structure;
  }
}

export default EPUBParser;
