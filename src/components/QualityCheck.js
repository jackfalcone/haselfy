import React from 'react';

export function QualityCheck({ 
  qualityIssues, 
  onTryAgain 
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-white text-center p-4">
        <ul className="mb-4 text-sm">
          {qualityIssues.map((issue, index) => (
            <li key={index} className="mb-1">
              {issue}
            </li>
          ))}
        </ul>
        <button
          onClick={onTryAgain}
          className="px-4 py-2 bg-white text-black rounded hover:bg-gray-200"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

export default QualityCheck;