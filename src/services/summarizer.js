// services/summarizer.js

class Summarizer {
  constructor(openaiService) {
    this.openai = openaiService;
    this.summaryCache = new Map();
  }

  // Generate a cache key for storing summaries
  generateCacheKey(content, level) {
    const hash = content.split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0)
      .toString(16);
    return `${level}-${hash}`;
  }

  // Process entire book structure and generate summaries
  // New order: paragraphs -> chapters -> book
  async processBookStructure(bookStructure, onProgress) {
    console.log('[Summarizer] Starting to process entire book structure...');
    const totalTasks = this.countTotalSummarizationTasks(bookStructure);
    console.log(`[Summarizer] Total summarization tasks: ${totalTasks}`);
    let completedTasks = 0;

    const updateProgress = () => {
      completedTasks++;
      const progress = completedTasks / totalTasks;
      console.log(`[Summarizer] Progress: ${Math.round(progress * 100)}% (${completedTasks}/${totalTasks})`);
      onProgress?.(progress);
    };

    try {
      console.log('[Summarizer] Starting paragraph-level summarization...');
      await this.processParagraphs(bookStructure, updateProgress);
      console.log('[Summarizer] Paragraph-level summarization complete.');

      console.log('[Summarizer] Starting chapter-level summarization...');
      await this.processChapters(bookStructure, updateProgress);
      console.log('[Summarizer] Chapter-level summarization complete.');

      console.log('[Summarizer] Starting book-level summarization...');
      await this.processBook(bookStructure, updateProgress);
      console.log('[Summarizer] Book-level summarization complete.');

      console.log('[Summarizer] All summarization tasks finished.');
      return bookStructure;
    } catch (error) {
      console.error('[Summarizer] Error processing book structure:', error);
      throw new Error('Failed to process book structure: ' + error.message);
    }
  }

  // Count total number of summarization tasks
  // 1 for the book, +1 per chapter, +1 per paragraph
  countTotalSummarizationTasks(bookStructure) {
    let count = 1; // Book level

    // Chapter level
    count += bookStructure.levels.chapters.length;

    // Paragraph level
    for (const chapter of bookStructure.levels.chapters) {
      count += chapter.paragraphs.length;
    }

    return count;
  }

  // Process paragraphs for all chapters
  async processParagraphs(bookStructure, onProgress) {
    console.log('[Summarizer] Processing paragraphs...');
    for (let cIndex = 0; cIndex < bookStructure.levels.chapters.length; cIndex++) {
      const chapter = bookStructure.levels.chapters[cIndex];
      console.log(`[Summarizer] Chapter ${cIndex + 1}: Summarizing ${chapter.paragraphs.length} paragraphs`);
      await Promise.all(
        chapter.paragraphs.map(async (paragraph, pIndex) => {
          const cacheKey = this.generateCacheKey(paragraph.content, 'paragraph');
          console.log(`[Summarizer] Paragraph ${pIndex + 1} cacheKey: ${cacheKey}`);

          if (!this.summaryCache.has(cacheKey)) {
            try {
              console.log('[Summarizer] Sending paragraph to OpenAI for summarization...');
              const summary = await this.openai.summarizeText(paragraph.content, 'paragraph');
              console.log('[Summarizer] Received paragraph summary:', summary);
              this.summaryCache.set(cacheKey, summary);
            } catch (error) {
              console.error('[Summarizer] Error summarizing paragraph:', error);
              this.summaryCache.set(cacheKey, 'Error generating summary');
            }
          } else {
            console.log('[Summarizer] Using cached summary for this paragraph.');
          }

          paragraph.summary = this.summaryCache.get(cacheKey);
          console.log('[Summarizer] Paragraph summary set:', paragraph.summary);
          onProgress?.();
        })
      );
    }
  }

  // Process chapters using summaries from their paragraphs
  async processChapters(bookStructure, onProgress) {
    console.log('[Summarizer] Processing chapters...');
    const chapters = bookStructure.levels.chapters;
    await Promise.all(
      chapters.map(async (chapter, cIndex) => {
        const cacheKey = this.generateCacheKey(chapter.content, 'chapter');
        console.log(`[Summarizer] Summarizing Chapter ${cIndex + 1} with cacheKey: ${cacheKey}`);

        if (!this.summaryCache.has(cacheKey)) {
          try {
            console.log('[Summarizer] Combining chapter content with paragraph summaries...');
            const contextContent = `
              Chapter Content:
              ${chapter.content}
              
              Paragraph Summaries:
              ${chapter.paragraphs.map(p => p.summary).join('\n')}
            `;
            console.log('[Summarizer] Sending chapter to OpenAI for summarization...');
            const summary = await this.openai.summarizeText(contextContent, 'chapter');
            console.log('[Summarizer] Received chapter summary:', summary);
            this.summaryCache.set(cacheKey, summary);
          } catch (error) {
            console.error('[Summarizer] Error summarizing chapter:', error);
            this.summaryCache.set(cacheKey, 'Error generating summary');
          }
        } else {
          console.log('[Summarizer] Using cached summary for this chapter.');
        }

        chapter.summary = this.summaryCache.get(cacheKey);
        console.log('[Summarizer] Chapter summary set:', chapter.summary);
        onProgress?.();
      })
    );
  }

  // Process entire book using chapter summaries
  async processBook(bookStructure, onProgress) {
    console.log('[Summarizer] Processing book-level summary...');
    const cacheKey = this.generateCacheKey(bookStructure.levels.book.content, 'book');
    console.log(`[Summarizer] Summarizing entire book with cacheKey: ${cacheKey}`);

    if (!this.summaryCache.has(cacheKey)) {
      try {
        console.log('[Summarizer] Combining book-level content and chapter summaries...');
        const contextContent = `
          Book Title: ${bookStructure.title}
          ${bookStructure.metadata ? `Author: ${bookStructure.metadata.creator}` : ''}
          
          Chapter Summaries:
          ${bookStructure.levels.chapters.map(c => c.summary).join('\n\n')}
          
          Complete Book Content:
          ${bookStructure.levels.book.content}
        `;
        console.log('[Summarizer] Sending entire book to OpenAI for summarization...');
        const summary = await this.openai.summarizeText(contextContent, 'book');
        console.log('[Summarizer] Received book summary:', summary);
        this.summaryCache.set(cacheKey, summary);
      } catch (error) {
        console.error('[Summarizer] Error summarizing book:', error);
        this.summaryCache.set(cacheKey, 'Error generating summary');
      }
    } else {
      console.log('[Summarizer] Using cached summary for the entire book.');
    }

    bookStructure.levels.book.summary = this.summaryCache.get(cacheKey);
    console.log('[Summarizer] Book-level summary set:', bookStructure.levels.book.summary);
    onProgress?.();
  }

  // Clear the summary cache
  clearCache() {
    console.log('[Summarizer] Clearing summary cache...');
    this.summaryCache.clear();
  }

  // Export summaries for saving
  exportSummaries() {
    console.log('[Summarizer] Exporting summaries...');
    return Array.from(this.summaryCache.entries()).reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  }

  // Import previously saved summaries
  importSummaries(summaries) {
    console.log('[Summarizer] Importing summaries...');
    this.summaryCache.clear();
    Object.entries(summaries).forEach(([key, value]) => {
      this.summaryCache.set(key, value);
    });
    console.log('[Summarizer] Summaries imported successfully.');
  }
}

export default Summarizer;
