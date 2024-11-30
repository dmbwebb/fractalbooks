import React, { useState, useEffect } from 'react';
import APIKeyInput from './APIKeyInput';
import FileUpload from './FileUpload';
import FractalView from './FractalView/FractalView';
import Navigation from './FractalView/Navigation';
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

  useEffect(() => {
    if (apiKey) {
      services.openai = new OpenAIService(apiKey);
      services.summarizer = new Summarizer(services.openai);
    }
  }, [apiKey]);

  const handleFileSelect = async (arrayBuffer, filename) => {
    setError(null);
    setIsProcessing(true);
    setProgress(0);

    try {
      // Parse EPUB
      const structure = await services.epubParser.loadBook(arrayBuffer, filename);
      setProgress(0.2);

      // Generate summaries
      const processedStructure = await services.summarizer.processBookStructure(
          structure,
          (progress) => setProgress(0.2 + progress * 0.8)
      );

      setBookStructure(processedStructure);
      setCurrentPath([]);
    } catch (err) {
      console.error('Error processing file:', err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    if (!bookStructure) return;

    const exportData = {
      structure: bookStructure,
      summaries: services.summarizer.exportSummaries()
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

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);
        setBookStructure(importData.structure);
        if (services.summarizer) {
          services.summarizer.importSummaries(importData.summaries);
        }
        setCurrentPath([]);
      } catch (err) {
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
              {bookStructure && (
                  <div className="flex space-x-4">
                    <button
                        onClick={handleExport}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Export
                    </button>
                    <label className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer">
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
              )}
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {/* Setup Section */}
          {!apiKey && (
              <div className="max-w-md mx-auto">
                <APIKeyInput onApiKeySubmit={setApiKey} />
              </div>
          )}

          {/* File Upload Section */}
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

          {/* Book View */}
          {bookStructure && !isProcessing && (
              <div className="mt-6">
                <Navigation
                    currentPath={currentPath}
                    structure={bookStructure}
                    onNavigate={setCurrentPath}
                />
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