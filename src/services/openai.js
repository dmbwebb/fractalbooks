// services/openai.js

class OpenAIService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.openai.com/v1/chat/completions';
  }

  async summarizeText(text, level) {
    try {
      const promptMap = {
        paragraph: `You are an expert summarizer with a talent for distilling complex information into concise, accurate statements. Your task is to create a one-sentence summary of the following text:
<input_text>
${text}
</input_text>
Please follow these steps to create your summary:
1. Carefully read and analyze the input text.
2. Identify the main points and key information.
3. Formulate a concise summary that accurately captures the essence of the text.
4. Ensure your summary is exactly one sentence long.
5. Do not say "This paragraph" or "In this paragraph", just state the summary of the arguments as if from the author themselves.`,

        section: `You are an expert summarizer skilled at synthesizing complex information. Your task is to create a clear, structured summary of the following section:
<input_text>
${text}
</input_text>
Please follow these steps to create your summary:
1. Carefully read and analyze the section.
2. Identify the main themes and key supporting points.
3. Formulate a concise summary that preserves the logical flow.
4. Ensure your summary is 1 paragraphs long.`,

        chapter: `You are an expert summarizer specializing in comprehensive chapter analysis. Your task is to create a detailed summary of the following chapter:
<input_text>
${text}
</input_text>
Please follow these steps to create your summary:
1. Carefully read and analyze the chapter content.
2. Identify major themes, key arguments, and their connections.
3. Create a structured summary that maintains narrative flow.
4. Include important supporting details and examples.
5. Ensure your summary approximately 75 words long.
6. Do not preface the summary with a title or heading, just return the summary.
7. Do not say "This chapter" or "In this chapter", just state the summary of the arguments as if from the author themselves.`,

        book: `You are an expert summarizer specializing in comprehensive book analysis. Your task is to create a detailed summary of the following book:
<input_text>
${text}
</input_text>
Please follow these steps to create your summary:
1. Carefully read and analyze the book's content.
2. Identify the main themes, arguments, and conclusions.
3. Create a structured summary that captures the book's progression.
4. Include key supporting evidence and examples.
5. Highlight significant conclusions and implications.
6. Ensure your summary is approximately 150 words long.
7. Do not preface the summary with a title or heading, just return the summary.
8. Do not say "This book" or "In this book", just state the summary of the arguments as if from the author themselves.
`
      };

      const prompt = promptMap[level] || promptMap.paragraph;

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a precise summarizer that maintains accuracy while being concise.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3 // Lower temperature for more consistent summaries
          // max_tokens: level === 'book' ? 1000 : 500
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Summarization error:', error);
      throw error;
    }
  }

  // Batch summarize multiple text segments
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