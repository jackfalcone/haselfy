import React from 'react';

export function ImagePreview({ 
  imageUrl, 
  isProcessing, 
  processingPhase,
  imageQuality,
  onTryAgain 
}) {
  return (
    <div className="relative w-full max-w-md aspect-[1/1.414] bg-gray-100 rounded overflow-hidden z-10">
      <img 
        src={imageUrl} 
        alt="Preview" 
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-center p-4 bg-black bg-opacity-50 rounded-lg">
            <div className="mb-2 text-lg pointer-events-none">
              {processingPhase}
            </div>
            
            {!imageQuality && (
              <div className="mt-4">
                <button
                  onClick={onTryAgain}
                  className="px-4 py-2 bg-white text-black rounded hover:bg-gray-200"
                >
                  Try Again
                </button>
              </div>
            )}
            
            {processingPhase === 'Processing image...' && (
              <div className="w-48 h-2 bg-gray-700 rounded-full pointer-events-none" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ImagePreview;