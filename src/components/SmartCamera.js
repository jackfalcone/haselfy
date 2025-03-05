import React, { useRef, useState, useEffect } from 'react';
import { processImages } from '../utils/imageProcessing';

export function SmartCamera({ onImageCaptured }) {
  const videoRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [hasFlash, setHasFlash] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 3840 }, // Increased to 4K
          height: { ideal: 2160 },
          advanced: [
            { focusMode: 'continuous' },
            { exposureMode: 'continuous' },
            { torch: true },
            { whiteBalanceMode: 'continuous' },
            { brightness: 1 }, // Increase brightness
            { contrast: 1 } // Increase contrast
          ]
        }
      });
      
      // Check if torch is supported
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      setHasFlash(capabilities.torch || false);
      
      if (capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: true }]
        });
      }

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

  const captureImage = async () => {
    if (!videoRef.current || isProcessing) return;

    setIsProcessing(true);
    setCaptureProgress(0);
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      const images = [];
      const totalShots = 5;
      
      for (let i = 0; i < totalShots; i++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        ctx.drawImage(videoRef.current, 0, 0);
        images.push(canvas.toDataURL('image/png', 1.0));
        setCaptureProgress(((i + 1) / totalShots) * 100);
      }
      
      const enhancedImage = await processImages(images);
      onImageCaptured(enhancedImage);
      stopCamera(); // Stop camera after successful capture
    } catch (error) {
      console.error('Error capturing image:', error);
    } finally {
      setIsProcessing(false);
      setCaptureProgress(0);
    }
  };

  // Update useEffect to use the new stopCamera function
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-md aspect-[3/4] bg-gray-100 rounded overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
          onCanPlay={() => videoRef.current.play()}
        />
        {isProcessing && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="mb-2">Capturing ({Math.round(captureProgress)}%)</div>
              <div className="w-48 h-2 bg-gray-700 rounded-full">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all duration-200"
                  style={{ width: `${captureProgress}%` }}
                />
              </div>
            </div>
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
    </div>
  );
}