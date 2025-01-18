// services/summarizer.js

class Summarizer {
  constructor(openaiService) {
    this.openai = openaiService;
    this.summaryCache = new Map();
  }

  // Generate a cache key for storing summaries
  generateCacheKey(content, level) {
    const hash = content
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0)
      .toString(16);
    return `${level}-${hash}`;
  }

  // Process entire book structure and generate summaries
  // New order: paragraphs -> chapters -> book
  async processBookStructure(bookStructure, onProgress) {
    console.log('[Summarizer] Starting to process entire book structure...');

    // Count total tasks considering skips
    const totalTasks = this.countTotalSummarizationTasks(bookStructure);
    console.log(`[Summarizer] Total summarization tasks: ${totalTasks}`);
    let completedTasks = 0;

    const updateProgress = () => {
      completedTasks++;
      const progress = completedTasks / totalTasks;
      console.log(
        `[Summarizer] Progress: ${Math.round(progress * 100)}% (${completedTasks}/${totalTasks})`
      );
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

  // Count total number of summarization tasks considering skips
  countTotalSummarizationTasks(bookStructure) {
    let count = 0;

    // Paragraph level
    for (const chapter of bookStructure.levels.chapters) {
      for (const paragraph of chapter.paragraphs) {
        count += 1;
      }
    }

    // Chapter level
    count += bookStructure.levels.chapters.length;

    // Book level
    count += 1; // For the book summary

    return count;
  }

  // Process paragraphs for all chapters
  async processParagraphs(bookStructure, onProgress) {
    console.log('[Summarizer] Processing paragraphs...');
    for (let cIndex = 0; cIndex < bookStructure.levels.chapters.length; cIndex++) {
      const chapter = bookStructure.levels.chapters[cIndex];
      console.log(
        `[Summarizer] Chapter ${cIndex + 1}: Summarizing ${chapter.paragraphs.length} paragraphs`
      );

      for (let pIndex = 0; pIndex < chapter.paragraphs.length; pIndex++) {
        const paragraph = chapter.paragraphs[pIndex];
        const cacheKey = this.generateCacheKey(paragraph.content, 'paragraph');
        console.log(`[Summarizer] Paragraph ${pIndex + 1} cacheKey: ${cacheKey}`);

        if (!this.summaryCache.has(cacheKey)) {
          try {
            console.log('[Summarizer] Sending paragraph to OpenAI for summarization...');
            const summary = await this.openai.summarizeText(paragraph.content, 'paragraph');

            if (summary === null) {
              console.log(
                `[Summarizer] Paragraph ${pIndex + 1} returned null summary. Skipping.`
              );
              paragraph.skip = true;
            } else {
              console.log('[Summarizer] Received paragraph summary:', summary);
              this.summaryCache.set(cacheKey, summary);
              paragraph.summary = summary;
              paragraph.skip = false;
            }
          } catch (error) {
            console.error('[Summarizer] Error summarizing paragraph:', error);
            paragraph.summary = 'Error generating summary';
            paragraph.skip = false;
          }
        } else {
          console.log('[Summarizer] Using cached summary for this paragraph.');
          paragraph.summary = this.summaryCache.get(cacheKey);
          paragraph.skip = false;
        }

        onProgress?.();
      }

      // Remove skipped paragraphs
      chapter.paragraphs = chapter.paragraphs.filter((para) => !para.skip);
      console.log(
        `[Summarizer] Chapter ${cIndex + 1} has ${chapter.paragraphs.length} paragraphs after filtering.`
      );
    }
  }

  // Process chapters using summaries from their paragraphs
  async processChapters(bookStructure, onProgress) {
    console.log('[Summarizer] Processing chapters...');
    const chapters = bookStructure.levels.chapters;

    for (let cIndex = 0; cIndex < chapters.length; cIndex++) {
      const chapter = chapters[cIndex];
      const cacheKey = this.generateCacheKey(chapter.content, 'chapter');
      console.log(
        `[Summarizer] Summarizing Chapter ${cIndex + 1} with cacheKey: ${cacheKey}`
      );

      if (!this.summaryCache.has(cacheKey)) {
        try {
          // Skip chapter if all paragraphs are skipped
          if (chapter.paragraphs.length === 0) {
            console.log(`[Summarizer] No paragraphs to summarize in Chapter ${cIndex + 1}. Skipping chapter.`);
            chapter.skip = true;
            onProgress?.();
            continue;
          }

          console.log('[Summarizer] Combining paragraph summaries for chapter...');
          const contextContent = chapter.paragraphs
            .map((p) => p.summary)
            .join('\n');

          console.log('[Summarizer] Sending chapter to OpenAI for summarization...');
          const summary = await this.openai.summarizeText(contextContent, 'chapter');

          if (summary === null) {
            console.log(`[Summarizer] Chapter ${cIndex + 1} returned null summary. Skipping.`);
            chapter.skip = true;
          } else {
            console.log('[Summarizer] Received chapter summary:', summary);
            this.summaryCache.set(cacheKey, summary);
            chapter.summary = summary;
            chapter.skip = false;
          }
        } catch (error) {
          console.error('[Summarizer] Error summarizing chapter:', error);
          chapter.summary = 'Error generating summary';
          chapter.skip = false;
        }
      } else {
        console.log('[Summarizer] Using cached summary for this chapter.');
        chapter.summary = this.summaryCache.get(cacheKey);
        chapter.skip = false;
      }

      onProgress?.();
    }

    // Remove skipped chapters
    bookStructure.levels.chapters = chapters.filter((chapter) => !chapter.skip);
    console.log(
      `[Summarizer] ${bookStructure.levels.chapters.length} chapters remaining after filtering.`
    );
  }

  // Process entire book using chapter summaries
  async processBook(bookStructure, onProgress) {
    console.log('[Summarizer] Processing book-level summary...');
    const cacheKey = this.generateCacheKey(bookStructure.levels.book.content, 'book');
    console.log(`[Summarizer] Summarizing entire book with cacheKey: ${cacheKey}`);

    if (!this.summaryCache.has(cacheKey)) {
      try {
        // Skip book summary if there are no chapters
        if (bookStructure.levels.chapters.length === 0) {
          console.log('[Summarizer] No chapters to summarize for the book. Skipping book summary.');
          bookStructure.levels.book.skip = true;
          onProgress?.();
          return;
        }

        console.log('[Summarizer] Combining chapter summaries for book...');
        const contextContent = bookStructure.levels.chapters
          .map((c) => c.summary)
          .join('\n\n');

        console.log('[Summarizer] Sending entire book to OpenAI for summarization...');
        const summary = await this.openai.summarizeText(contextContent, 'book');

        if (summary === null) {
          console.log('[Summarizer] Book-level summary returned null. Skipping.');
          bookStructure.levels.book.skip = true;
        } else {
          console.log('[Summarizer] Received book summary:', summary);
          this.summaryCache.set(cacheKey, summary);
          bookStructure.levels.book.summary = summary;
          bookStructure.levels.book.skip = false;
        }
      } catch (error) {
        console.error('[Summarizer] Error summarizing book:', error);
        bookStructure.levels.book.summary = 'Error generating summary';
        bookStructure.levels.book.skip = false;
      }
    } else {
      console.log('[Summarizer] Using cached summary for the entire book.');
      bookStructure.levels.book.summary = this.summaryCache.get(cacheKey);
      bookStructure.levels.book.skip = false;
    }

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