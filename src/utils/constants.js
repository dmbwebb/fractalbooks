// utils/constants.js

// API Configuration
export const API_CONFIG = {
  OPENAI_MODEL: 'gpt-4o-mini',
  API_BASE_URL: 'https://api.openai.com/v1',
  MAX_TOKENS: {
    PARAGRAPH: 250,
    SECTION: 500,
    CHAPTER: 750,
    BOOK: 1000
  },
  TEMPERATURE: 0.3
};

// Content Structure
export const STRUCTURE_LEVELS = {
  BOOK: 'book',
  CHAPTER: 'chapter',
  SECTION: 'section',
  PARAGRAPH: 'paragraph'
};

// Summary Prompts
export const SUMMARY_PROMPTS = {
  [STRUCTURE_LEVELS.PARAGRAPH]:
    "Summarize this paragraph concisely while preserving key information: ",
  [STRUCTURE_LEVELS.SECTION]:
    "Provide a summary of this section, capturing main themes and key points: ",
  [STRUCTURE_LEVELS.CHAPTER]:
    "Create a comprehensive chapter summary highlighting major points and their connections: ",
  [STRUCTURE_LEVELS.BOOK]:
    "Provide a complete book summary capturing the main themes, arguments, and conclusions: "
};

// UI Constants
export const UI_CONFIG = {
  ANIMATIONS: {
    DURATION: 300,
    EASING: 'cubic-bezier(0.4, 0, 0.2, 1)'
  },
  COLORS: {
    PRIMARY: 'blue',
    SECONDARY: 'gray',
    SUCCESS: 'green',
    ERROR: 'red',
    WARNING: 'yellow'
  },
  BREAKPOINTS: {
    SM: '640px',
    MD: '768px',
    LG: '1024px',
    XL: '1280px'
  }
};

// File Processing
export const FILE_CONFIG = {
  ACCEPTED_TYPES: [
    'application/epub+zip'
  ],
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  CHUNK_SIZE: 4096
};

// Cache Configuration
export const CACHE_CONFIG = {
  MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
  VERSION: '1.0'
};

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_API_KEY: 'Please enter a valid OpenAI API key (starts with "sk-")',
  FILE_TOO_LARGE: 'File size exceeds maximum limit of 50MB',
  INVALID_FILE_TYPE: 'Please upload a valid EPUB file',
  PROCESSING_ERROR: 'An error occurred while processing the book',
  API_ERROR: 'Failed to communicate with OpenAI API',
  IMPORT_ERROR: 'Failed to import summaries: Invalid format'
};

// Progress Steps
export const PROGRESS_STEPS = {
  UPLOAD: 0.1,
  PARSE: 0.2,
  SUMMARIZE_PARAGRAPHS: 0.5,
  SUMMARIZE_SECTIONS: 0.7,
  SUMMARIZE_CHAPTERS: 0.9,
  SUMMARIZE_BOOK: 1.0
};

// Local Storage Keys
export const STORAGE_KEYS = {
  API_KEY: 'fractal-book-api-key',
  THEME: 'fractal-book-theme',
  CACHE: 'fractal-book-cache'
};