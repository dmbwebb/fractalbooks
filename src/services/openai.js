// services/openai.js

class OpenAIService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.openai.com/v1/chat/completions';
  }

  /**
   * Summarize text at a given level: 'paragraph', 'section', 'chapter', or 'book'.
   * Optionally pass in { bookSummary } when summarizing chapters.
   *
   * @param {string} text - The text to summarize
   * @param {string} level - One of: 'paragraph', 'section', 'chapter', 'book'
   * @param {object} options - Optional config (e.g. { bookSummary: '...' })
   * @returns {Promise<string|null>} - The summary string or null if no substantive content
   */
  async summarizeText(text, level, options = {}) {
    const { bookSummary = '', excludedClasses = [] } = options;

    try {
      // Clean HTML before summarization
      const cleanedText = this.cleanHtml(text, excludedClasses);

      // We define base prompts with placeholders
      const promptMap = {
        paragraph: `You are an expert summarizer with a remarkable ability to distill complex information into concise, accurate statements. Your task is to create a one-sentence summary of the following text:

<input_text>
{{text}}
</input_text>

Please follow these steps to complete your task:

1. Evaluate the content:
   - Determine if the text contains substantive information that can be summarized.
   - If the text is an acknowledgment, table of contents, reference list, or similar non-substantive content, return "null" as your summary.

2. If the text contains substantial content:
   - Identify the main points and key information.
   - Formulate a concise summary that accurately captures the essence of the text.

3. Ensure your summary adheres to these criteria:
   - It must be exactly one sentence long.
   - Do not begin with phrases like "This paragraph" or "In this paragraph".
   - Present the summary as if it's coming directly from the original author.`,

        section: `You are an expert summarizer skilled at synthesizing complex information. Your task is to create a clear, structured summary of the following section. If the section does not contain substantive body content to summarize, return "null".

<input_text>
{{text}}
</input_text>

Please follow these steps to create your summary:
1. Carefully read and analyze the section.
2. Determine if the section contains substantive body content that can be summarized. If not, return "null". Return "null" if the section is an acknowledgment, table of contents, references, or something similar.
3. If the section contains substantial content, identify the main themes and key supporting points.
4. Formulate a concise summary that preserves the logical flow.
5. Ensure your summary is 1 paragraph long.`,

        // We'll fill in placeholders for chapter_text and book_summary below
        chapter: `You are an expert summarizer specializing in comprehensive chapter analysis. Your task is to create a detailed, coherent summary of a chapter within the context of its book. You will be provided with two pieces of information:

1. The full text of the chapter:
<chapter_text>
{{chapter_text}}
</chapter_text>

2. A summary of the entire book, which provides context for this chapter:
<book_summary>
{{book_summary}}
</book_summary>

Please follow these steps to create your summary:

1. Carefully read and analyze both the chapter content and the book summary.

2. Determine if the chapter contains substantive body content that can be summarized. If the chapter is an acknowledgment, table of contents, references, or similar non-substantive content, return "null" as your final answer.

3. If the chapter contains substantial content, proceed with the following analysis process. Wrap your analysis inside <chapter_analysis> tags:

   <chapter_analysis>
   a. Outline the chapter's structure (e.g., introduction, main sections, conclusion).
   b. Identify the major themes and key arguments presented in the chapter.
   c. Note how these themes and arguments develop throughout the chapter.
   d. Extract 3-5 key quotes from the chapter that support the main themes or arguments.
   e. Identify important supporting details and examples.
   f. List key concepts or ideas introduced in the chapter.
   h. Consider how the various elements of the chapter connect to form a cohesive narrative.
   i. Identify any potential challenges in summarizing this chapter (e.g., complex ideas, many subtopics).
   j. Explicitly connect the chapter's themes to the broader themes of the book, referencing the provided book summary.
   k. Ensure that your analysis covers the entire chapter, not just the beginning.
   </chapter_analysis>

4. Based on your analysis, create a structured summary that:
   - Maintains a clear narrative flow
   - Includes the major themes and key arguments
   - Incorporates important supporting details and examples
   - Covers the entire chapter's content evenly
   - Is approximately 75 words long
   - Relates the chapter's content to the broader themes or narrative of the book

5. Review your summary to ensure:
   - It flows coherently, with each sentence connecting logically to the next
   - It accurately represents the entire chapter, not just the beginning
   - It does not use phrases like "This chapter" or "In this chapter"
   - It reads as if it's coming directly from the author of the chapter
   - It effectively places the chapter's content within the context of the entire book

6. Present your final summary as a single paragraph without any title or heading, enclosed in <summary> tags.

Remember, the goal is to provide a concise yet comprehensive overview of the chapter that captures its essence and main arguments while maintaining coherence and flow, and situating it within the broader context of the book.`,

        book: `You are an expert summarizer specializing in comprehensive book analysis. Your task is to create a detailed, coherent summary of a book. You will be provided with the book text below:

The full text of the book:
<book_text>
{{text}}
</book_text>

Please follow these steps to create your summary:

1. Carefully read and analyze the book text.

3. Proceed with the following analysis process. Wrap your analysis inside <book_analysis> tags:

   <book_analysis>
   a. Outline the book's structure (e.g., introduction, main chapters, conclusion).
   b. Identify the major themes and key arguments presented in the book.
   c. Note how these themes and arguments develop throughout the book.
   d. Extract 3-5 key quotes from the book that support the main themes or arguments.
   e. Identify important supporting details and examples.
   f. List key concepts or ideas introduced in the book.
   h. Consider how the various elements of the book connect to form a cohesive narrative.
   i. Identify any potential challenges in summarizing this book (e.g., complex ideas, many subtopics).
   k. Ensure that your analysis covers the entire book, not just the beginning.
   </book_analysis>

4. Based on your analysis, create a structured summary that:
   - Maintains a clear narrative flow
   - Includes the major themes and key arguments
   - Incorporates important supporting details and examples
   - Covers the entire book's content evenly
   - Is approximately 200 words long
   - Relates the chapter's content to the broader themes or narrative of the book

5. Review your summary to ensure:
   - It flows coherently, with each sentence connecting logically to the next
   - It accurately represents the entire book, not just the beginning
   - It does not use phrases like "This book" or "In this book"
   - It reads as if it's coming directly from the author of the chapter

6. Present your final summary as a single paragraph without any title or heading, enclosed in <summary> tags.

Remember, the goal is to provide a concise yet comprehensive overview of the book that captures its essence and main arguments while maintaining coherence and flow.`
      };

      // Base prompt
      let promptTemplate = promptMap[level] || promptMap.paragraph;

      // If it's a paragraph or section or book, just replace {{text}}
      if (level === 'paragraph' || level === 'section' || level === 'book') {
        promptTemplate = promptTemplate.replace('{{text}}', cleanedText);
      }

      // If it's a chapter, we have placeholders for {{chapter_text}} and {{book_summary}}
      if (level === 'chapter') {
        promptTemplate = promptTemplate
          .replace('{{chapter_text}}', cleanedText)
          .replace('{{book_summary}}', bookSummary || '');
      }

      const requestBody = {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a precise summarizer that maintains accuracy while being concise.',
          },
          {
            role: 'user',
            content: promptTemplate,
          },
        ],
        temperature: 0.3,
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('OpenAI API Error:', errorBody);
        
        // Check if it's a token length error
        if (errorBody.includes('context_length_exceeded')) {
          const errorJson = JSON.parse(errorBody);
          throw new Error(`Token limit exceeded: ${errorJson.error.message}`);
        }
        
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const summary = data.choices[0]?.message?.content?.trim() || '';

      // Check if the model returned "null"
      if (summary.toLowerCase() === 'null') {
        return null;
      }

      // For book and chapter levels, extract content between <summary> tags
      if (level === 'book' || level === 'chapter') {
        const summaryMatch = summary.match(/<summary>([\s\S]*?)<\/summary>/i);
        return summaryMatch ? summaryMatch[1].trim() : summary;
      }

      return summary;
    } catch (error) {
      // Add specific handling for token length errors
      if (error.message?.includes('context_length_exceeded')) {
        throw new Error('TOKEN_LIMIT_EXCEEDED');
      }
      console.error('Summarization error:', error);
      throw error;
    }
  }

  /**
   * Analyze HTML classes to identify those used for body text.
   * @param {string} classList - JSON array of class names to analyze
   * @param {string} htmlSample - Sample of HTML content for context
   * @returns {Promise<string>} - JSON array of body text classes
   */
  async analyzeClasses(classList, htmlSample) {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an expert at identifying HTML classes that should be excluded from content extraction. Be conservative in what you exclude - if in doubt, do not exclude the class.`
            },
            {
              role: 'user',
              content: `You are analyzing HTML classes from an EPUB book. Here are two pieces of information:

1. The list of available class names:
${classList}

2. A sample of the HTML content showing how these classes are used:
<html_sample>
${htmlSample}
</html_sample>

Analyze both the class names AND their usage in the HTML sample to determine which classes should be EXCLUDED when extracting meaningful text. Return a JSON array of class names that should be excluded.

Include a class in the exclusion list ONLY if you are very confident it is used exclusively for:
- Headers/titles (h1, h2, etc.)
- Navigation elements
- Page numbers
- Footnotes
- Image captions
- Tables of contents
- Copyright notices
- Metadata

Be conservative - if a class might contain any meaningful body text, do NOT include it in the exclusion list. We want to ensure we don't accidentally exclude important content.

Return only the JSON array of classes to exclude, no explanation needed.`
            },
          ],
          temperature: 0.1,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content?.trim() || '';

      return content;
    } catch (error) {
      console.error('OpenAI analyzeClasses error:', error);
      throw error;
    }
  }

  /**
   * Batch summarize multiple text segments with progress callback.
   */
  async batchSummarize(texts, level, onProgress) {
    const summaries = [];
    let completed = 0;

    for (const text of texts) {
      try {
        const summary = await this.summarizeText(text, level);
        summaries.push(summary);
      } catch (error) {
        summaries.push(`Error summarizing text: ${error.message}`);
      }
      completed++;
      onProgress?.(completed / texts.length);
    }

    return summaries;
  }

  // Add new method for cleaning HTML
  cleanHtml(html, excludedClasses = []) {
    try {
      // Create a temporary div to parse HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Remove elements with excluded classes
      excludedClasses.forEach(className => {
        const elements = doc.getElementsByClassName(className);
        Array.from(elements).forEach(el => el.remove());
      });

      // Get text content (removes all HTML tags)
      return doc.body.textContent.trim();
    } catch (error) {
      console.error('Error cleaning HTML:', error);
      // Fallback to basic tag stripping if DOM parsing fails
      return html.replace(/<[^>]*>/g, '').trim();
    }
  }
}

export default OpenAIService;
