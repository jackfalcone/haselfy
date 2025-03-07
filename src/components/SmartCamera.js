import React, { useRef, useState, useEffect } from 'react';
import { processImages } from '../utils/imageProcessing';

export function SmartCamera({ onImageCaptured }) {
  const videoRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);

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
            { whiteBalanceMode: 'continuous' },
            { brightness: 1.2 }, // Increase brightness
            { contrast: 1.2 }, // Increase contrast
            { sharpness: 2 },
            { saturation: 1.2 },
            { iso: 100 }
          ]
        }
      });
      
      // Check if torch is supported
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      
        // Set optimal focus distance for document scanning
        if (capabilities.focusDistance) {
        await track.applyConstraints({
            focusDistance: 30, // Optimal distance for document scanning
            focusMode: 'manual'
        });
        }

        // Set exposure for document scanning
        if (capabilities.exposureTime) {
        await track.applyConstraints({
            exposureTime: 1000, // Faster exposure for better text capture
            exposureMode: 'manual'
        });
        }

        // Set white balance for document scanning
        if (capabilities.whiteBalanceMode && capabilities.colorTemperature) {
            await track.applyConstraints({
            whiteBalanceMode: 'manual',
            colorTemperature: 5500  // Daylight white balance (5500K is standard daylight)
            });
        }

        // // Set zoom for better detail if available
        // if (capabilities.zoom) {
        //     await track.applyConstraints({
        //     zoom: 1.5  // Slight zoom for better detail
        //     });
        // }

       // Use torch only if ambient light is low
       if (capabilities.torch) {
        try {
          const imageCapture = new ImageCapture(track);
          const photoCapabilities = await imageCapture.getPhotoCapabilities();
          
          // Only enable torch if light level is low
          if (photoCapabilities.redEyeReduction) {
            await track.applyConstraints({
              advanced: [{ torch: true }]
            });
          }
        } catch (torchErr) {
          console.log('Torch error:', torchErr);
        }
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
    </div>
  );
}