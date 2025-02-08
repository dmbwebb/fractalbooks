// services/summarizer.js

class Summarizer {
  constructor(openaiService) {
    this.openai = openaiService;
    this.summaryCache = new Map();
  }

  // Helper function: separate chain-of-thought from final summary
  parseAnalysisAndSummary(text) {
    let analysis = '';
    let summary = '';

    const chapterAnalysisMatch = text.match(/<chapter_analysis>([\s\S]*?)<\/chapter_analysis>/i);
    const bookAnalysisMatch = text.match(/<book_analysis>([\s\S]*?)<\/book_analysis>/i);

    if (chapterAnalysisMatch) {
      analysis = chapterAnalysisMatch[1].trim();
    } else if (bookAnalysisMatch) {
      analysis = bookAnalysisMatch[1].trim();
    }

    const summaryMatch = text.match(/<summary>([\s\S]*?)<\/summary>/i);
    if (summaryMatch) {
      summary = summaryMatch[1].trim();
    } else {
      // fallback if <summary> not found
      summary = text;
    }

    return { analysis, summary };
  }

  // Reordered flow: book -> chapters -> paragraphs
  async processBookStructure(bookStructure, onProgress) {
    console.log('[Summarizer] Starting summarization process...');

    // First, get excluded classes for HTML cleaning
    let excludedClasses = [];
    try {
      const sampleHtml = bookStructure.levels.book.content;
      const classList = Array.from(new Set([...sampleHtml.matchAll(/class="([^"]+)"/g)].map(m => m[1]))).join('\n');
      excludedClasses = JSON.parse(await this.openai.analyzeClasses(classList, sampleHtml));
    } catch (error) {
      console.warn('[Summarizer] Error analyzing classes:', error);
    }

    try {
      // Try to summarize entire book first
      await this.processBook(bookStructure, onProgress, excludedClasses);
    } catch (error) {
      if (error.message === 'TOKEN_LIMIT_EXCEEDED') {
        console.log('[Summarizer] Book too long, falling back to chapter-first approach');
        // Reset book structure
        bookStructure.levels.book.skip = false;
        bookStructure.levels.book.analysis = '';
        bookStructure.levels.book.summary = '';
        
        // Summarize chapters without book context
        await this.processChapters(bookStructure, onProgress, excludedClasses);
        
        // Combine chapter summaries into book summary
        const chapterSummaries = bookStructure.levels.chapters
          .filter(ch => !ch.skip)
          .map(ch => ch.summary)
          .join('\n\n');
        
        // Summarize the combined chapter summaries as the book summary
        const bookSummary = await this.openai.summarizeText(
          chapterSummaries,
          'book',
          { excludedClasses }
        );
        
        bookStructure.levels.book.summary = bookSummary;
      } else {
        throw error;
      }
    }

    // Skip subsequent steps if book was unsubstantial
    if (bookStructure.levels.book.skip) {
      console.warn('[Summarizer] Book was null or unsubstantial, skipping chapters & paragraphs.');
      return bookStructure;
    }

    // Process remaining levels
    if (!bookStructure.levels.book.skip) {
      await this.processChapters(bookStructure, onProgress, excludedClasses);
      bookStructure.levels.chapters = bookStructure.levels.chapters.filter(ch => !ch.skip);
      await this.processParagraphs(bookStructure, onProgress, excludedClasses);
      
      // Clean up empty paragraphs
      for (const ch of bookStructure.levels.chapters) {
        ch.paragraphs = ch.paragraphs.filter(p => !p.skip);
      }
    }

    return bookStructure;
  }

  async processBook(bookStructure, onProgress, excludedClasses) {
    console.log('[Summarizer] Summarizing entire book first...');
    const bookContent = bookStructure.levels.book.content || '';
    const cacheKey = this.generateCacheKey(bookContent, 'book');

    // If we have a cached summary
    if (this.summaryCache.has(cacheKey)) {
      const cachedVal = this.summaryCache.get(cacheKey);
      if (cachedVal === 'null') {
        bookStructure.levels.book.skip = true;
      } else if (typeof cachedVal === 'object') {
        bookStructure.levels.book.analysis = cachedVal.analysis;
        bookStructure.levels.book.summary = cachedVal.summary;
        bookStructure.levels.book.skip = false;
      } else {
        // fallback older format
        bookStructure.levels.book.analysis = '';
        bookStructure.levels.book.summary = cachedVal;
        bookStructure.levels.book.skip = false;
      }
      onProgress?.(1);
      return;
    }

    try {
      const raw = await this.openai.summarizeText(bookContent, 'book', { excludedClasses });
      if (raw === null) {
        console.warn('[Summarizer] Book-level returned null; skipping subsequent steps.');
        bookStructure.levels.book.skip = true;
        this.summaryCache.set(cacheKey, 'null');
      } else {
        const { analysis, summary } = this.parseAnalysisAndSummary(raw);
        bookStructure.levels.book.analysis = analysis;
        bookStructure.levels.book.summary = summary;
        bookStructure.levels.book.skip = false;
        this.summaryCache.set(cacheKey, { analysis, summary });
      }
    } catch (error) {
      console.error('[Summarizer] Error summarizing book:', error);
      bookStructure.levels.book.skip = false;
      bookStructure.levels.book.analysis = '';
      bookStructure.levels.book.summary = 'Error generating summary';
    }

    onProgress?.(1);
  }

  async processChapters(bookStructure, onProgress, excludedClasses) {
    console.log('[Summarizer] Summarizing chapters with the final book summary...');

    // If the book was flagged as skip, or there's no summary, do nothing
    if (bookStructure.levels.book.skip) {
      console.warn('[Summarizer] Book skip is true; skipping chapters.');
      return;
    }
    const bookSummaryText = bookStructure.levels.book.summary || '';

    // Summarize each chapter
    const chapters = bookStructure.levels.chapters;
    let completed = 0;
    for (let cIndex = 0; cIndex < chapters.length; cIndex++) {
      const chapter = chapters[cIndex];
      const cacheKey = this.generateCacheKey(chapter.content, 'chapter');

      if (!this.summaryCache.has(cacheKey)) {
        // Summarize using the entire raw chapter text + book summary
        try {
          const raw = await this.openai.summarizeText(chapter.content, 'chapter', {
            bookSummary: bookSummaryText,
            excludedClasses
          });

          if (raw === null) {
            chapter.skip = true;
            this.summaryCache.set(cacheKey, 'null');
          } else {
            const { analysis, summary } = this.parseAnalysisAndSummary(raw);
            chapter.analysis = analysis;
            chapter.summary = summary;
            chapter.skip = false;
            this.summaryCache.set(cacheKey, { analysis, summary });
          }
        } catch (error) {
          console.error(`[Summarizer] Error summarizing chapter ${chapter.title}:`, error);
          chapter.analysis = '';
          chapter.summary = 'Error generating summary';
          chapter.skip = false;
        }
      } else {
        // Use cached
        const cachedVal = this.summaryCache.get(cacheKey);
        if (cachedVal === 'null') {
          chapter.skip = true;
        } else if (typeof cachedVal === 'object') {
          chapter.analysis = cachedVal.analysis;
          chapter.summary = cachedVal.summary;
          chapter.skip = false;
        } else {
          // fallback older format
          chapter.analysis = '';
          chapter.summary = cachedVal;
          chapter.skip = false;
        }
      }

      completed++;
      onProgress?.(completed / chapters.length);
    }
  }

  async processParagraphs(bookStructure, onProgress, excludedClasses) {
    console.log('[Summarizer] Summarizing paragraphs last...');
    let totalParagraphs = 0;
    let completed = 0;

    // Count how many paragraphs we have total
    for (const ch of bookStructure.levels.chapters) {
      totalParagraphs += ch.paragraphs.length;
    }

    for (const ch of bookStructure.levels.chapters) {
      for (const para of ch.paragraphs) {
        const cacheKey = this.generateCacheKey(para.content, 'paragraph');
        if (!this.summaryCache.has(cacheKey)) {
          try {
            const summary = await this.openai.summarizeText(para.content, 'paragraph', { excludedClasses });
            if (summary === null) {
              para.skip = true;
              this.summaryCache.set(cacheKey, 'null');
            } else {
              para.summary = summary;
              para.skip = false;
              this.summaryCache.set(cacheKey, summary);
            }
          } catch (error) {
            console.error('[Summarizer] Error summarizing paragraph:', error);
            para.summary = 'Error generating summary';
            para.skip = false;
          }
        } else {
          // Use cached
          const cachedVal = this.summaryCache.get(cacheKey);
          if (cachedVal === 'null') {
            para.skip = true;
          } else {
            para.summary = cachedVal;
            para.skip = false;
          }
        }

        completed++;
        onProgress?.(completed / totalParagraphs);
      }
    }
  }

  generateCacheKey(content, level) {
    const hash = content
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0)
      .toString(16);
    return `${level}-${hash}`;
  }

  // Clears entire summary cache
  clearCache() {
    this.summaryCache.clear();
  }

  // Exports all cached summaries
  exportSummaries() {
    return Array.from(this.summaryCache.entries()).reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  }

  // Imports previously cached summaries
  importSummaries(summaries) {
    this.summaryCache.clear();
    for (const [key, val] of Object.entries(summaries)) {
      this.summaryCache.set(key, val);
    }
  }
}

export default Summarizer;
