// src/components/App.jsx

import React, { useState, useEffect } from 'react';
import APIKeyInput from './APIKeyInput';
import FileUpload from './FileUpload';
import FractalView from './FractalView/FractalView';
import ProgressIndicator from './ProgressIndicator';
import { Save, Upload } from 'lucide-react';
import OpenAIService from '../services/openai';
import EPUBParser from '../services/epubParser';
import Summarizer from '../services/summarizer';

const App = () => {
  const [apiKey, setApiKey] = useState('');
  const [bookStructure, setBookStructure] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPath, setCurrentPath] = useState([]);
  const [error, setError] = useState(null);

  // For instructions display
  const [showInstructions, setShowInstructions] = useState(true);

  // Initialize services
  const [services, setServices] = useState({
    epubParser: null,
    openai: null,
    summarizer: null,
  });

  // Build services whenever the user sets an API key
  useEffect(() => {
    if (apiKey) {
      const openaiService = new OpenAIService(apiKey);
      const epubParser = new EPUBParser(openaiService);
      const summarizer = new Summarizer(openaiService);

      setServices({
        openai: openaiService,
        epubParser: epubParser,
        summarizer: summarizer,
      });
    } else {
      setServices({
        epubParser: null,
        openai: null,
        summarizer: null,
      });
    }
  }, [apiKey]);

  /**
   * Handle file upload
   */
  const handleFileSelect = async (arrayBuffer, filename) => {
    // Hide instructions once user starts uploading
    setShowInstructions(false);
    setError(null);
    setIsProcessing(true);
    setProgress(0);

    try {
      if (!services.openai || !services.epubParser || !services.summarizer) {
        throw new Error('Services are not initialized. Please enter your API key first.');
      }

      // 1) Parse the EPUB
      await services.epubParser.loadBook(arrayBuffer, filename);
      // For demonstration, consider parsing as ~10% of the pipeline
      setProgress(0.1);

      // 2) Summarize (book → chapters → paragraphs). Summarizer calls onProgress in [0..1].
      const processedStructure = await services.summarizer.processBookStructure(
        services.epubParser.structure,
        // We combine the Summarizer's fraction (p from 0..1) into overall pipeline
        (p) => setProgress(0.1 + 0.9 * p)
      );

      setBookStructure(processedStructure);
      setCurrentPath([]);
      setProgress(1);
    } catch (err) {
      console.error('[App] Error processing file:', err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Export entire structure + summaries as JSON
   */
  const handleExport = () => {
    if (!bookStructure) return;
    const exportData = {
      structure: bookStructure,
      summaries: services.summarizer?.exportSummaries() || {},
    };
    const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bookStructure.title || 'book'}-summaries.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Import a previously exported JSON file
   */
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);
        setBookStructure(importData.structure);
        if (services.summarizer && importData.summaries) {
          services.summarizer.importSummaries(importData.summaries);
        }
        setCurrentPath([]);
        setError(null);
      } catch (err) {
        console.error('[App] Failed to import JSON', err);
        setError('Failed to import summaries: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-900">FractalBooks</h1>
            {/* Export/Import controls */}
            <div className="flex space-x-4">
              <button
                onClick={handleExport}
                disabled={!bookStructure}
                className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md ${
                  bookStructure
                    ? 'text-gray-700 bg-white hover:bg-gray-50'
                    : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              >
                <Save className="w-4 h-4 mr-2" />
                Export
              </button>
              <label className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                Import
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* API Key prompt */}
        {!apiKey && (
          <div className="max-w-md mx-auto">
            <APIKeyInput onApiKeySubmit={setApiKey} />
          </div>
        )}

        {/* File Upload if we have key & no book & not processing */}
        {apiKey && !bookStructure && !isProcessing && (
          <div className="max-w-md mx-auto mt-8">
            <FileUpload onFileSelect={handleFileSelect} />
          </div>
        )}

        {/* Instructions Box */}
        {showInstructions && !bookStructure && !isProcessing && (
          <div className="max-w-md mx-auto mt-8 p-4 bg-gray-200 text-gray-800 rounded-lg shadow transition-opacity duration-700">
            <p>
              Welcome to <strong>Fractal Book Summaries!</strong>
              This application allows you to upload an EPUB file
              and automatically generate hierarchical summaries.
              You can explore summaries at different levels,
              from high-level overviews down to individual paragraphs.
              To get started, enter your OpenAI API key and then upload your ebook.
              Once processed, you’ll be able to navigate through fractal summaries
              and dive deeper into the text in a structured way.
            </p>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="max-w-md mx-auto mt-8">
            <ProgressIndicator
              progress={progress}
              status="Processing book and generating summaries..."
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="max-w-md mx-auto mt-4 p-4 bg-red-50 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Fractal View */}
        {bookStructure && !isProcessing && (
          <div className="mt-6">
            <FractalView
              bookStructure={bookStructure}
              currentPath={currentPath}
              onPathChange={setCurrentPath}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
