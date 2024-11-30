// services/summarizer.js

class Summarizer {
  constructor(openaiService) {
    this.openai = openaiService;
    this.summaryCache = new Map();
  }

  // Generate a cache key for storing summaries
  generateCacheKey(content, level) {
    // Simple hash function for content
    const hash = content.split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0)
      .toString(16);
    return `${level}-${hash}`;
  }

  // Process entire book structure and generate summaries at all levels
  async processBookStructure(bookStructure, onProgress) {
    const totalTasks = this.countTotalSummarizationTasks(bookStructure);
    let completedTasks = 0;

    // Process each level in parallel, but levels themselves in sequence
    // (paragraph -> section -> chapter -> book)
    try {
      // Start with paragraphs
      await this.processParagraphs(bookStructure, (progress) => {
        completedTasks++;
        onProgress?.(completedTasks / totalTasks);
      });

      // Then sections
      await this.processSections(bookStructure, (progress) => {
        completedTasks++;
        onProgress?.(completedTasks / totalTasks);
      });

      // Then chapters
      await this.processChapters(bookStructure, (progress) => {
        completedTasks++;
        onProgress?.(completedTasks / totalTasks);
      });

      // Finally, the whole book
      await this.processBook(bookStructure, (progress) => {
        completedTasks++;
        onProgress?.(completedTasks / totalTasks);
      });

      return bookStructure;
    } catch (error) {
      console.error('Error processing book structure:', error);
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
    for (const chapter of bookStructure.levels.chapters) {
      for (const section of chapter.sections) {
        await Promise.all(
          section.paragraphs.map(async (paragraph) => {
            const cacheKey = this.generateCacheKey(paragraph.content, 'paragraph');

            if (!this.summaryCache.has(cacheKey)) {
              try {
                const summary = await this.openai.summarizeText(
                  paragraph.content,
                  'paragraph'
                );
                this.summaryCache.set(cacheKey, summary);
              } catch (error) {
                console.error('Error summarizing paragraph:', error);
                this.summaryCache.set(cacheKey, 'Error generating summary');
              }
            }

            paragraph.summary = this.summaryCache.get(cacheKey);
            onProgress?.();
          })
        );
      }
    }
  }

  // Process sections using summaries from their paragraphs
  async processSections(bookStructure, onProgress) {
    for (const chapter of bookStructure.levels.chapters) {
      await Promise.all(
        chapter.sections.map(async (section) => {
          const cacheKey = this.generateCacheKey(section.content, 'section');

          if (!this.summaryCache.has(cacheKey)) {
            try {
              // Combine paragraph summaries with section content for better context
              const contextContent = `
                Section Content:
                ${section.content}
                
                Paragraph Summaries:
                ${section.paragraphs.map(p => p.summary).join('\n')}
              `;

              const summary = await this.openai.summarizeText(
                contextContent,
                'section'
              );
              this.summaryCache.set(cacheKey, summary);
            } catch (error) {
              console.error('Error summarizing section:', error);
              this.summaryCache.set(cacheKey, 'Error generating summary');
            }
          }

          section.summary = this.summaryCache.get(cacheKey);
          onProgress?.();
        })
      );
    }
  }

  // Process chapters using summaries from their sections
  async processChapters(bookStructure, onProgress) {
    await Promise.all(
      bookStructure.levels.chapters.map(async (chapter) => {
        const cacheKey = this.generateCacheKey(chapter.content, 'chapter');

        if (!this.summaryCache.has(cacheKey)) {
          try {
            // Combine section summaries with chapter content
            const contextContent = `
              Chapter Content:
              ${chapter.content}
              
              Section Summaries:
              ${chapter.sections.map(s => s.summary).join('\n')}
            `;

            const summary = await this.openai.summarizeText(
              contextContent,
              'chapter'
            );
            this.summaryCache.set(cacheKey, summary);
          } catch (error) {
            console.error('Error summarizing chapter:', error);
            this.summaryCache.set(cacheKey, 'Error generating summary');
          }
        }

        chapter.summary = this.summaryCache.get(cacheKey);
        onProgress?.();
      })
    );
  }

  // Process entire book using chapter summaries
  async processBook(bookStructure, onProgress) {
    const cacheKey = this.generateCacheKey(bookStructure.levels.book.content, 'book');

    if (!this.summaryCache.has(cacheKey)) {
      try {
        // Combine chapter summaries with book metadata
        const contextContent = `
          Book Title: ${bookStructure.title}
          ${bookStructure.metadata ? `Author: ${bookStructure.metadata.creator}` : ''}
          
          Chapter Summaries:
          ${bookStructure.levels.chapters.map(c => c.summary).join('\n\n')}
          
          Complete Book Content:
          ${bookStructure.levels.book.content}
        `;

        const summary = await this.openai.summarizeText(
          contextContent,
          'book'
        );
        this.summaryCache.set(cacheKey, summary);
      } catch (error) {
        console.error('Error summarizing book:', error);
        this.summaryCache.set(cacheKey, 'Error generating summary');
      }
    }

    bookStructure.levels.book.summary = this.summaryCache.get(cacheKey);
    onProgress?.();
  }

  // Clear the summary cache
  clearCache() {
    this.summaryCache.clear();
  }

  // Export summaries for saving
  exportSummaries() {
    return Array.from(this.summaryCache.entries()).reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  }

  // Import previously saved summaries
  importSummaries(summaries) {
    this.summaryCache.clear();
    Object.entries(summaries).forEach(([key, value]) => {
      this.summaryCache.set(key, value);
    });
  }
}

export default Summarizer;