import React from 'react';

const ProgressIndicator = ({ progress, status }) => {
  const percentage = Math.round(progress * 100);

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <div className="mb-2 flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">
          {status || 'Processing...'}
        </span>
        <span className="text-sm font-medium text-gray-700">
          {percentage}%
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {progress === 1 && (
        <div className="mt-2 text-center text-sm text-green-600 font-medium">
          Processing complete!
        </div>
      )}
    </div>
  );
};

export default ProgressIndicator;