import React, { useRef, useState, useEffect } from 'react';
import { processImages } from '../utils/imageProcessing';

export function SmartCamera({ onImageCaptured }) {
  const videoRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
    const [debugLog, setDebugLog] = useState([]);

    const logDebug = (message, data) => {
        console.log(message, data);
        setDebugLog(prev => [...prev, `${message}: ${JSON.stringify(data, null, 2)}`]);
    }
      
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 3508 },  // A4 at 300 DPI
          height: { ideal: 2480 }, // A4 at 300 DPI
          torch: true
        } 
      });

      videoRef.current.srcObject = stream;
      setIsStreaming(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  };

  // Add new state at the top with other states
  const [debugImages, setDebugImages] = useState({ raw: null, processed: null });

  // Modify the captureImage function
  const captureImage = async () => {
    if (!videoRef.current || isProcessing) return;

    setIsProcessing(true);
    setCaptureProgress(0);
    setDebugImages({ raw: null, processed: null });
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      const images = [];
      const totalShots = 5;
      
      // Save the first shot for debugging
      ctx.drawImage(videoRef.current, 0, 0);
      const firstShot = canvas.toDataURL('image/png', 1.0);
      setDebugImages(prev => ({ ...prev, raw: firstShot }));
      images.push(firstShot);
      
      // Continue with remaining shots
      for (let i = 1; i < totalShots; i++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        ctx.drawImage(videoRef.current, 0, 0);
        images.push(canvas.toDataURL('image/png', 1.0));
        setCaptureProgress(((i + 1) / totalShots) * 100);
      }
      
      const enhancedImage = await processImages(images);
      setDebugImages(prev => ({ ...prev, processed: enhancedImage }));
      onImageCaptured(enhancedImage);
      stopCamera();
    } catch (error) {
      console.error('Error capturing image:', error);
    } finally {
      setIsProcessing(false);
      setCaptureProgress(0);
    }
  };

  // Add this section at the bottom of the return statement, after the buttons
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-md aspect-[1/1.414] bg-gray-100 rounded overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          onCanPlay={() => videoRef.current.play()}
        />
        {isStreaming && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Document border guide */}
            <div className="absolute inset-4 border-2 border-white border-opacity-50 rounded-lg"></div>

            {isProcessing ? (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="mb-2">Hold Steady - Capturing ({Math.round(captureProgress)}%)</div>
                  <div className="w-48 h-2 bg-gray-700 rounded-full">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all duration-200"
                      style={{ width: `${captureProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
                  Hold steady
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {!isStreaming ? (
        <button 
          onClick={startCamera}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Start Camera
        </button>
      ) : (
        <button 
          onClick={captureImage}
          disabled={isProcessing}
          className={`px-4 py-2 text-white rounded ${
            isProcessing 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {isProcessing ? 'Processing...' : 'Capture'}
        </button>
      )}
      
      {(debugImages.raw || debugImages.processed) && (
        <div className="w-full max-w-md space-y-4 mt-4">
          {debugImages.raw && (
            <div>
              <h3 className="text-sm font-medium mb-2">Raw Capture:</h3>
              <img src={debugImages.raw} alt="Raw capture" className="w-full rounded-lg" />
            </div>
          )}
          {debugImages.processed && (
            <div>
              <h3 className="text-sm font-medium mb-2">Processed Result:</h3>
              <img src={debugImages.processed} alt="Processed result" className="w-full rounded-lg" />
            </div>
          )}
        </div>
      )}

// Add this to your JSX, after the debug images
  {debugLog.length > 0 && (
    <div className="w-full max-w-md mt-4 p-2 bg-gray-100 rounded">
      <h3 className="text-sm font-medium mb-2">Debug Log:</h3>
      <pre className="text-xs overflow-auto max-h-40">
        {debugLog.join('\n')}
      </pre>
    </div>
  )}

      
    </div>
  );
}