import React, { useState } from 'react';
import { Eye, EyeOff, Key } from 'lucide-react';

const APIKeyInput = ({ onApiKeySubmit }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValid, setIsValid] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Basic validation - OpenAI API keys typically start with 'sk-'
    if (apiKey.startsWith('sk-') && apiKey.length > 20) {
      onApiKeySubmit(apiKey);
      setIsValid(true);
    } else {
      setIsValid(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <Key className="w-5 h-5 text-gray-500" />
          <h2 className="text-xl font-semibold text-gray-700">Enter OpenAI API Key</h2>
        </div>

        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className={`w-full px-4 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 
              ${!isValid ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="sk-..."
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {!isValid && (
          <p className="text-red-500 text-sm mt-1">
            Please enter a valid OpenAI API key (starts with 'sk-')
          </p>
        )}

        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            transition-colors duration-200"
        >
          Submit
        </button>
      </form>
    </div>
  );
};

export default APIKeyInput;