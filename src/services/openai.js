// services/openai.js

class OpenAIService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.openai.com/v1/chat/completions';
  }

  /**
   * Summarize text at a given level (paragraph, section, chapter, book).
   * @param {string} text - The text to summarize
   * @param {string} level - The level of summarization ('paragraph', 'section', 'chapter', 'book')
   * @returns {Promise<string>} - The summary or 'null' if no body text to summarize
   */
  async summarizeText(text, level) {
    try {
      const promptMap = {
        paragraph: `You are an expert summarizer with a talent for distilling complex information into concise, accurate statements. Your task is to create a one-sentence summary of the following text. If the text does not contain substantive body content to summarize, return "null".

<input_text>
${text}
</input_text>

Please follow these steps to create your summary:
1. Carefully read and analyze the input text.
2. Determine if the text contains substantive body content that can be summarized. If not, return "null". Return "null" if the paragraph is an acknowledgment, table of contents, references, something similar.
3. If the text contains substantial content, identify the main points and key information.
4. Formulate a concise summary that accurately captures the essence of the text.
5. Ensure your summary is exactly one sentence long.
6. Do not say "This paragraph" or "In this paragraph"; just state the summary of the content as if from the author themselves.`,

        section: `You are an expert summarizer skilled at synthesizing complex information. Your task is to create a clear, structured summary of the following section. If the section does not contain substantive body content to summarize, return "null".

<input_text>
${text}
</input_text>

Please follow these steps to create your summary:
1. Carefully read and analyze the section.
2. Determine if the section contains substantive body content that can be summarized. If not, return "null". Return "null" if the section is an acknowledgment, table of contents, references, something similar.
3. If the section contains substantial content, identify the main themes and key supporting points.
4. Formulate a concise summary that preserves the logical flow.
5. Ensure your summary is 1 paragraph long.`,

        chapter: `You are an expert summarizer specializing in comprehensive chapter analysis. Your task is to create a detailed summary of the following chapter. If the chapter does not contain substantive body content to summarize (e.g., it is an acknowledgment, table of contents, or references), return "null".

<input_text>
${text}
</input_text>

Please follow these steps to create your summary:
1. Carefully read and analyze the chapter content.
2. Determine if the chapter contains substantive body content that can be summarized. If not, return "null". Return "null" if the chapter is an acknowledgment, table of contents, references, something similar.
3. If the chapter contains substantial content, identify major themes, key arguments, and their connections.
4. Create a structured summary that maintains narrative flow.
5. Include important supporting details and examples.
6. Ensure your summary is approximately 75 words long.
7. Do not preface the summary with a title or heading; just return the summary.
8. Do not say "This chapter" or "In this chapter"; just state the summary of the content as if from the author themselves.`,

        book: `You are an expert summarizer specializing in comprehensive book analysis. Your task is to create a detailed summary of the following book. If the content does not contain substantive body text to summarize, return "null".

<input_text>
${text}
</input_text>

Please follow these steps to create your summary:
1. Carefully read and analyze the book's content.
2. Determine if the content contains substantive body text that can be summarized. If not, return "null".
3. If the content contains substantial content, identify the main themes, arguments, and conclusions.
4. Create a structured summary that captures the book's progression.
5. Include key supporting evidence and examples.
6. Highlight significant conclusions and implications.
7. Ensure your summary is approximately 150 words long.
8. Do not preface the summary with a title or heading; just return the summary.
9. Do not say "This book" or "In this book"; just state the summary of the content as if from the author themselves.`
      };

      const prompt = promptMap[level] || promptMap.paragraph;

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
              content: 'You are a precise summarizer that maintains accuracy while being concise.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3, // Lower temperature for more consistent summaries
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const summary = data.choices[0].message.content.trim();

      // Check if the model returned "null"
      if (summary.toLowerCase() === 'null') {
        return null;
      }

      return summary;
    } catch (error) {
      console.error('Summarization error:', error);
      throw error;
    }
  }

  /**
   * Analyze HTML classes to identify those used for body text.
   * @param {string} prompt - The prompt containing the class list
   * @returns {Promise<string>} - JSON array of body text classes
   */
  async analyzeClasses(prompt) {
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
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content.trim();

      // Since the assistant is instructed to return only JSON, we can return the content directly
      return content;
    } catch (error) {
      console.error('OpenAI analyzeClasses error:', error);
      throw error;
    }
  }

  /**
   * Batch summarize multiple text segments with progress callback.
   * @param {Array<string>} texts - Array of text segments to summarize
   * @param {string} level - Summarization level
   * @param {Function} onProgress - Callback function for progress updates
   * @returns {Promise<Array<string>>} - Array of summaries
   */
  async batchSummarize(texts, level, onProgress) {
    const summaries = [];
    let completed = 0;

    for (const text of texts) {
      try {
        const summary = await this.summarizeText(text, level);
        summaries.push(summary);
        completed++;
        if (onProgress) {
          onProgress(completed / texts.length);
        }
      } catch (error) {
        summaries.push(`Error summarizing text: ${error.message}`);
      }
    }

    return summaries;
  }
}

export default OpenAIService;