// src/components/App.jsx

import React, { useState, useEffect } from 'react';
import APIKeyInput from './APIKeyInput';
import FileUpload from './FileUpload';
import FractalView from './FractalView/FractalView';
// import Navigation from './FractalView/Navigation';
import ProgressIndicator from './ProgressIndicator';
import { Save, Upload } from 'lucide-react';

import EPUBParser from '../services/epubParser';
import OpenAIService from '../services/openai';
import Summarizer from '../services/summarizer';

const App = () => {
  const [apiKey, setApiKey] = useState('');
  const [bookStructure, setBookStructure] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPath, setCurrentPath] = useState([]);
  const [error, setError] = useState(null);

  // Initialize services
  const [services] = useState(() => ({
    epubParser: new EPUBParser(),
    openai: null,
    summarizer: null
  }));

  // Whenever the user enters an API key, rebuild our OpenAI and Summarizer service
  useEffect(() => {
    if (apiKey) {
      services.openai = new OpenAIService(apiKey);
      services.summarizer = new Summarizer(services.openai);
    }
  }, [apiKey, services]);

  /**
   * handleFileSelect:
   * Called when user uploads an EPUB (or PDF).
   * We parse the file, then run the Summarizer's process.
   */
  const handleFileSelect = async (arrayBuffer, filename) => {
    setError(null);
    setIsProcessing(true);
    setProgress(0);

    try {
      // 1. Parse EPUB
      const structure = await services.epubParser.loadBook(arrayBuffer, filename);
      setProgress(0.2);

      // 2. Summarize
      // If no API key is set, Summarizer won't work. But let's assume
      // we only do this if we have a valid key.
      if (!services.summarizer) {
        throw new Error('No API key provided. Please enter your API key first.');
      }
      const processedStructure = await services.summarizer.processBookStructure(
        structure,
        (p) => setProgress(0.2 + p * 0.8)
      );

      setBookStructure(processedStructure);
      setCurrentPath([]);
    } catch (err) {
      console.error('[App] Error processing file:', err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * handleExport:
   * Exports the entire structure + Summaries as JSON
   */
  const handleExport = () => {
    if (!bookStructure) return;

    const exportData = {
      structure: bookStructure,
      summaries: services.summarizer?.exportSummaries() || {}
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
   * handleImport:
   * Imports a previously exported JSON file with full structure + summaries.
   * If we have no book loaded yet, we skip parsing entirely and just load from JSON.
   */
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);
        // The JSON is assumed to contain the full "structure" + "summaries"

        // Set the entire fractal structure from JSON
        setBookStructure(importData.structure);
        // If we have a Summarizer instance, import the summaries
        if (services.summarizer && importData.summaries) {
          services.summarizer.importSummaries(importData.summaries);
        }

        // Reset current path to show the top level
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
            <h1 className="text-xl font-semibold text-gray-900">Fractal Book</h1>

            {/* Always show Export/Import controls, even if no book is loaded */}
            <div className="flex space-x-4">
              <button
                onClick={handleExport}
                disabled={!bookStructure}
                className={`inline-flex items-center px-3 py-2 border border-gray-300 
                shadow-sm text-sm leading-4 font-medium rounded-md 
                ${bookStructure ? 'text-gray-700 bg-white hover:bg-gray-50' : 'text-gray-400 bg-gray-100 cursor-not-allowed'}
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              >
                <Save className="w-4 h-4 mr-2" />
                Export
              </button>

              <label
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm 
                           text-sm leading-4 font-medium rounded-md text-gray-700 bg-white 
                           hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 
                           focus:ring-indigo-500 cursor-pointer"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* API Key Prompt */}
        {!apiKey && (
          <div className="max-w-md mx-auto">
            <APIKeyInput onApiKeySubmit={setApiKey} />
          </div>
        )}

        {/* File Upload Section (only if we have an API key & no book yet & not processing) */}
        {apiKey && !bookStructure && !isProcessing && (
          <div className="max-w-md mx-auto mt-8">
            <FileUpload onFileSelect={handleFileSelect} />
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

        {/* Error Display */}
        {error && (
          <div className="max-w-md mx-auto mt-4 p-4 bg-red-50 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Fractal Book View */}
        {bookStructure && !isProcessing && (
          <div className="mt-6">
            {/*<Navigation*/}
            {/*  currentPath={currentPath}*/}
            {/*  structure={bookStructure}*/}
            {/*  onNavigate={setCurrentPath}*/}
            {/*/>*/}
            <div className="mt-6">
              <FractalView
                bookStructure={bookStructure}
                currentPath={currentPath}
                onPathChange={setCurrentPath}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
