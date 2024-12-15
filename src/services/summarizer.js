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

  // Process entire book structure and generate summaries at all levels
  async processBookStructure(bookStructure, onProgress) {
    console.log('[Summarizer] Starting to process entire book structure for summarization...');
    const totalTasks = this.countTotalSummarizationTasks(bookStructure);
    console.log(`[Summarizer] Total summarization tasks identified: ${totalTasks}`);
    let completedTasks = 0;

    // Define a helper to update progress
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

      console.log('[Summarizer] Starting section-level summarization...');
      await this.processSections(bookStructure, updateProgress);
      console.log('[Summarizer] Section-level summarization complete.');

      console.log('[Summarizer] Starting chapter-level summarization...');
      await this.processChapters(bookStructure, updateProgress);
      console.log('[Summarizer] Chapter-level summarization complete.');

      console.log('[Summarizer] Starting book-level summarization...');
      await this.processBook(bookStructure, updateProgress);
      console.log('[Summarizer] Book-level summarization complete.');

      console.log('[Summarizer] All summarization tasks are finished.');
      return bookStructure;
    } catch (error) {
      console.error('[Summarizer] Error processing book structure:', error);
      throw new Error('Failed to process book structure: ' + error.message);
    }
  }

  // Count total number of summarization tasks
  countTotalSummarizationTasks(bookStructure) {
    let count = 1; // Book level
    count += bookStructure.levels.chapters.length; // Chapter level

    // Section level
    bookStructure.levels.chapters.forEach(chapter => {
      count += chapter.sections.length;
    });

    // Paragraph level
    bookStructure.levels.chapters.forEach(chapter => {
      chapter.sections.forEach(section => {
        count += section.paragraphs.length;
      });
    });

    return count;
  }

  // Process paragraphs in parallel within each section
  async processParagraphs(bookStructure, onProgress) {
    console.log('[Summarizer] Starting paragraph summaries...');
    for (const chapter of bookStructure.levels.chapters) {
      console.log(`[Summarizer] Processing paragraphs in Chapter: ${chapter.title}`);
      for (const section of chapter.sections) {
        console.log(`[Summarizer] Processing paragraphs in Section: ${section.title || '(no title)'}`);
        await Promise.all(
          section.paragraphs.map(async (paragraph, idx) => {
            const cacheKey = this.generateCacheKey(paragraph.content, 'paragraph');
            console.log(`[Summarizer] Summarizing Paragraph #${idx+1} with cacheKey: ${cacheKey}`);
            if (!this.summaryCache.has(cacheKey)) {
              try {
                console.log('[Summarizer] Sending paragraph to OpenAI for summarization...');
                const summary = await this.openai.summarizeText(
                  paragraph.content,
                  'paragraph'
                );
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
  }

  // Process sections using summaries from their paragraphs
  async processSections(bookStructure, onProgress) {
    console.log('[Summarizer] Starting section summaries...');
    for (const chapter of bookStructure.levels.chapters) {
      console.log(`[Summarizer] Processing sections in Chapter: ${chapter.title}`);
      await Promise.all(
        chapter.sections.map(async (section, idx) => {
          const cacheKey = this.generateCacheKey(section.content, 'section');
          console.log(`[Summarizer] Summarizing Section #${idx+1} with cacheKey: ${cacheKey}`);
          if (!this.summaryCache.has(cacheKey)) {
            try {
              console.log('[Summarizer] Combining section content with paragraph summaries...');
              const contextContent = `
                Section Content:
                ${section.content}
                
                Paragraph Summaries:
                ${section.paragraphs.map(p => p.summary).join('\n')}
              `;
              console.log('[Summarizer] Sending section to OpenAI for summarization...');
              const summary = await this.openai.summarizeText(
                contextContent,
                'section'
              );
              console.log('[Summarizer] Received section summary:', summary);
              this.summaryCache.set(cacheKey, summary);
            } catch (error) {
              console.error('[Summarizer] Error summarizing section:', error);
              this.summaryCache.set(cacheKey, 'Error generating summary');
            }
          } else {
            console.log('[Summarizer] Using cached summary for this section.');
          }

          section.summary = this.summaryCache.get(cacheKey);
          console.log('[Summarizer] Section summary set:', section.summary);
          onProgress?.();
        })
      );
    }
  }

  // Process chapters using summaries from their sections
  async processChapters(bookStructure, onProgress) {
    console.log('[Summarizer] Starting chapter summaries...');
    await Promise.all(
      bookStructure.levels.chapters.map(async (chapter, idx) => {
        const cacheKey = this.generateCacheKey(chapter.content, 'chapter');
        console.log(`[Summarizer] Summarizing Chapter #${idx+1} (${chapter.title}) with cacheKey: ${cacheKey}`);
        if (!this.summaryCache.has(cacheKey)) {
          try {
            console.log('[Summarizer] Combining chapter content with section summaries...');
            const contextContent = `
              Chapter Content:
              ${chapter.content}
              
              Section Summaries:
              ${chapter.sections.map(s => s.summary).join('\n')}
            `;
            console.log('[Summarizer] Sending chapter to OpenAI for summarization...');
            const summary = await this.openai.summarizeText(
              contextContent,
              'chapter'
            );
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
    console.log('[Summarizer] Starting book-level summary...');
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
        const summary = await this.openai.summarizeText(
          contextContent,
          'book'
        );
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
    console.log('[Summarizer] Importing summaries from external source...');
    this.summaryCache.clear();
    Object.entries(summaries).forEach(([key, value]) => {
      this.summaryCache.set(key, value);
    });
    console.log('[Summarizer] Summaries imported successfully.');
  }
}

export default Summarizer;
