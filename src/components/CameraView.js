import React from 'react';

export function CameraView({ 
  videoRef, 
  hasTorch, 
  torchEnabled, 
  onTorchToggle, 
  onCapture, 
  isProcessing 
}) {
  return (
    <>
      <div className="relative w-full max-w-md aspect-[1/1.414] bg-gray-100 rounded overflow-hidden z-10">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          onCanPlay={() => videoRef.current.play()}
        />
        
        <div className="absolute inset-0">
          <div className="absolute inset-4 border-2 border-white border-opacity-50 rounded-lg pointer-events-none" />
          
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
              Hold steady
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-4 mt-4">
        {hasTorch && (
          <button
            onClick={onTorchToggle}
            className={`p-2 rounded-full ${
              torchEnabled ? 'bg-yellow-400' : 'bg-gray-400'
            } text-white`}
            title="Toggle flash"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </button>
        )}
        <button 
          onClick={onCapture}
          disabled={isProcessing}
          className={`px-4 py-2 text-white rounded ${
            isProcessing 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {isProcessing ? 'Processing...' : 'Capture'}
        </button>
      </div>
    </>
  );
}

export default CameraView;