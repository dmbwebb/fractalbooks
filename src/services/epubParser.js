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
        this.book.loaded.cover,
        this.book.loaded.resources
      ]);
      console.log('All book components loaded');

      // Basic validation
      if (!this.book.spine) {
        throw new Error('Invalid EPUB: No spine found');
      }

      if (!this.book.packaging.metadata) {
        console.warn('No metadata found in EPUB');
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

  readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Error reading file'));
      reader.readAsArrayBuffer(file);
    });
  }

  async parseBookStructure() {
    try {
      console.log('Creating initial structure object');
      const structure = {
        title: this.book.packaging.metadata.title,
        metadata: this.book.packaging.metadata,
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

      const spine = this.book.spine;
      console.log(`Starting to process spine items (chapters). Total: ${spine.items.length}`);

      for (let i = 0; i < spine.items.length; i++) {
        const spineItem = spine.items[i];
        console.log(`Processing chapter ${i + 1}/${spine.items.length}:`, spineItem.href);

        try {
          const chapter = {
            id: spineItem.id,
            href: spineItem.href,
            title: await this.findTitleFromToc(spineItem.href) || `Chapter ${i + 1}`,
            content: '',
            sections: [],
            summaries: []
          };

          console.log(`Loading content for chapter: ${chapter.title}`);
          const chapterDoc = await this.getChapterDocument(spineItem);
          chapter.content = this.extractCleanText(chapterDoc);
          console.log(`Chapter content loaded, length: ${chapter.content.length} characters`);

          // Parse sections
          const sections = this.parseSections(chapterDoc);
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

  parseSections(doc) {
    const sections = [];
    let currentSection = {
      title: '',
      content: '',
      paragraphs: [],
      summaries: []
    };

    Array.from(doc.body.children).forEach(element => {
      if (this.isHeading(element)) {
        if (currentSection.content) {
          sections.push({...currentSection});
        }
        currentSection = {
          title: element.textContent.trim(),
          content: '',
          paragraphs: [],
          summaries: []
        };
      } else if (element.tagName === 'P') {
        const paragraphText = element.textContent.trim();
        if (paragraphText) {
          currentSection.paragraphs.push({
            content: paragraphText,
            summaries: []
          });
          currentSection.content += paragraphText + '\n\n';
        }
      }
    });

    if (currentSection.content) {
      sections.push(currentSection);
    }

    return sections;
  }

  async getChapterDocument(spineItem) {
    try {
      console.log('Loading chapter HTML:', spineItem.href);
      const html = await spineItem.load();
      console.log('Parsing chapter HTML to DOM');
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      console.log('Chapter document parsed successfully');
      return doc;
    } catch (error) {
      console.error('Error in getChapterDocument:', error);
      throw error;
    }
  }

  isHeading(element) {
    return /^H[1-3]$/.test(element.tagName);
  }

  async findTitleFromToc(href) {
    try {
      console.log('Finding title for href:', href);
      const toc = await this.book.navigation.toc;

      const findTitle = (items) => {
        for (const item of items) {
          if (item.href && item.href.includes(href)) {
            console.log('Found title:', item.label);
            return item.label;
          }
          if (item.subitems && item.subitems.length > 0) {
            const subTitle = findTitle(item.subitems);
            if (subTitle) return subTitle;
          }
        }
        return null;
      };

      const title = findTitle(toc);
      console.log('Title search result:', title);
      return title;
    } catch (error) {
      console.error('Error in findTitleFromToc:', error);
      return null;
    }
  }

  extractCleanText(doc) {
    try {
      // Remove scripts and styles
      doc.querySelectorAll('script, style').forEach(el => el.remove());

      // Get text content
      let text = doc.body.textContent;

      // Clean up whitespace
      text = text.replace(/\s+/g, ' ').trim();
      console.log(`Extracted ${text.length} characters of clean text`);

      return text;
    } catch (error) {
      console.error('Error in extractCleanText:', error);
      throw error;
    }
  }

  getReadingTimeEstimate(text) {
    const wordsPerMinute = 200;
    const wordCount = text.trim().split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  exportStructure() {
    console.log('Exporting book structure');
    return {
      structure: this.structure,
      metadata: {
        title: this.book.packaging.metadata.title,
        creator: this.book.packaging.metadata.creator,
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