// services/openai.js

class OpenAIService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.openai.com/v1/chat/completions';
  }

  async summarizeText(text, level) {
    try {
      const promptMap = {
        paragraph: "Summarize this paragraph concisely while preserving key information: ",
        section: "Provide a summary of this section, capturing main themes and key points: ",
        chapter: "Create a comprehensive chapter summary highlighting major points and their connections: ",
        book: "Provide a complete book summary capturing the main themes, arguments, and conclusions: "
      };

      const prompt = promptMap[level] || promptMap.paragraph;

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-0125-preview',
          messages: [
            {
              role: 'system',
              content: 'You are a precise summarizer that maintains accuracy while being concise.'
            },
            {
              role: 'user',
              content: `${prompt}\n\n${text}`
            }
          ],
          temperature: 0.3, // Lower temperature for more consistent summaries
          max_tokens: level === 'book' ? 1000 : 500
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