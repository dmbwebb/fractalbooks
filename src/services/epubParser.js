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

      this.book = ePub();
      await this.book.open(arrayBuffer);
      console.log('Book opened successfully');

      await Promise.all([
        this.book.loaded.spine,
        this.book.loaded.metadata,
        this.book.loaded.navigation,
        this.book.loaded.resources
      ]);
      console.log('All book components loaded');

      if (!this.book.spine) {
        throw new Error('Invalid EPUB: No spine found');
      }

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
    console.log('Creating initial structure object');
    const structure = {
      title: this.book.package.metadata.title,
      metadata: this.book.package.metadata,
      levels: {
        book: {
          content: '',
          summaries: []
        },
        chapters: []
      }
    };

    const contentItems = this.book.spine.items.filter(item => {
      const href = item.href || item.url;
      return href && !href.includes('nav') && !href.includes('cover');
    });

    console.log(`Starting to process content items. Total: ${contentItems.length}`);

    for (let i = 0; i < contentItems.length; i++) {
      const spineItem = contentItems[i];
      const itemHref = spineItem.href || spineItem.url;
      console.log(`Processing chapter ${i + 1}/${contentItems.length}: ${itemHref}`);

      try {
        const chapter = {
          id: spineItem.index,
          href: spineItem.href,
          title: await this.findTitleFromToc(spineItem.href) || `Chapter ${i + 1}`,
          content: '',
          paragraphs: [], // no sections, just paragraphs
          summaries: []
        };

        console.log(`Loading content for chapter: ${chapter.title}`);
        const chapterText = await this.getChapterContent(spineItem.href);
        chapter.content = chapterText;
        console.log(`Chapter content loaded, length: ${chapter.content.length}`);

        // Extract paragraphs
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = chapterText;
        const paragraphs = Array.from(tempDiv.querySelectorAll('p'));
        chapter.paragraphs = paragraphs.map(p => ({
          content: p.textContent.trim(),
          summaries: []
        }));

        console.log(`Extracted ${chapter.paragraphs.length} paragraphs from chapter`);

        structure.levels.chapters.push(chapter);
        console.log(`Completed processing chapter ${i + 1}`);
      } catch (error) {
        console.error(`Error processing chapter ${i + 1}:`, error);
      }
    }

    console.log('Combining all text for book-level content');
    structure.levels.book.content = structure.levels.chapters
      .map(chapter => chapter.content)
      .join('\n\n');

    console.log('Structure parsing complete');
    console.log('Total chapters:', structure.levels.chapters.length);
    console.log('Total book content length:', structure.levels.book.content.length);

    return structure;
  }

  async getChapterContent(href) {
    console.log('Loading chapter content:', href);
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

    const section = this.book.spine.get(index);
    if (!section) {
      throw new Error(`Could not load section for: ${href}`);
    }

    await section.load(this.book.load.bind(this.book));

    const doc = section.document;
    if (!doc) {
      throw new Error(`Document not loaded for: ${href}`);
    }

    const content = doc.documentElement.outerHTML;
    return content;
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
