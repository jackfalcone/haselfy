import React, { useRef, useState, useEffect } from 'react';
import { processImages } from '../utils/imageProcessing';
import { isImageSharp, isBrightnessGood, isMotionBlurLow } from '../utils/imageQuality';

export function SmartCamera({ onImageCaptured }) {
  const videoRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [debugLog, setDebugLog] = useState([]);
  const [processingPhase, setProcessingPhase] = useState('');
  // Remove unused state
  // const [debugImages, setDebugImages] = useState([]);

  const logDebug = (message, data) => {
    console.log(message, data);
    setDebugLog(prev => [...prev, { message, data, timestamp: new Date().toISOString() }]);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 3508 },  // A4 at 300 DPI
          height: { ideal: 2480 }, // A4 at 300 DPI
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

  const handleImage = async (imageBlob) => {
    setIsProcessing(true);
    setCaptureProgress(0);
    setProcessingPhase('Processing image...');

    try {
      const imageUrl = URL.createObjectURL(imageBlob);

      setProcessingPhase('Checking image quality...');
      
      const qualityChecks = await Promise.all([
        isImageSharp(imageUrl),
        isBrightnessGood(imageUrl),
        isMotionBlurLow(imageUrl)
      ]);

      const [sharpness, brightness, motionBlur] = qualityChecks;

      if (!sharpness || !brightness || !motionBlur) {
        setProcessingPhase('Image quality issues detected:');

        const qualityIssues = [];
        if (!sharpness) {
          qualityIssues.push('Image is unsharp');
        }
        if (!brightness) {
          qualityIssues.push('Image is too dark');
        }
        if (!motionBlur) {
          qualityIssues.push('Image has motion blur');
        }

        setProcessingPhase(`Quality issues: ${qualityIssues.join(', ')}`);
        setIsProcessing(true);  // Keep processing state true to show message

        return {
          success: false,
          qualityIssues
        }
      };

      setProcessingPhase('Processing image...');
      const processedImage = await processImages(imageUrl);
      
      logDebug('Original Image', [imageUrl]);
      if ( processedImage.variations &&  processedImage.variations.length > 0) {
        logDebug('Processing Variations',  processedImage.variations.map(v => ({
          name: v.name,
          image: v.url
        })));
      }
      logDebug('Final Result', [ processedImage.final]);

      onImageCaptured(processedImage.final);

      if (videoRef.current?.srcObject) {
        stopCamera();
      }
      return { success: true };
    } catch (error) {
      console.error('Error processing image:', error);
      setProcessingPhase('An unexpected error occurred');
      setIsProcessing(true);
      return { success: false, issues: ['Technical error occurred'] };
    }
  };
  
  const captureImage = async () => {
    if (!videoRef.current || isProcessing) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(videoRef.current, 0, 0);

    canvas.toBlob(async (blob) => {
      const result = await handleImage(blob);

      if (!result.success) {
        setProcessingPhase(`Please try again. ${result.qualityIssues.join(', ')}`);
      }
    }, 'image/png');
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const result = await handleImage(file);
      if (!result.success) {
        setProcessingPhase(`Please try again. ${result.qualityIssues.join(', ')}`);
      }
    };
  };

  // Update the processing UI in the return statement
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Camera viewport */}
      <div className="relative w-full max-w-md aspect-[1/1.414] bg-gray-100 rounded overflow-hidden z-10">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          onCanPlay={() => videoRef.current.play()}
        />
        <div className="absolute inset-0 pointer-events-none">
          {isStreaming && (
            <div className="absolute inset-4 border-2 border-white border-opacity-50 rounded-lg"></div>
          )}
          {isProcessing && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="text-white text-center p-4">
                <div className="mb-2 text-lg">{processingPhase}</div>
                {processingPhase === 'Processing image...' && (
                  <div className="w-48 h-2 bg-gray-700 rounded-full">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all duration-200"
                      style={{ width: `${captureProgress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          {isStreaming && !isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
                Hold steady
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Controls */}
      <div className="relative z-20">
        {!isStreaming ? (
          <div>
            <button 
              onClick={startCamera}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Start Camera
            </button>
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
            </svg>
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">PNG, JPG or PDF</p>
          </div>
          <input 
            type="file" 
            className="hidden" 
            accept="image/*,.pdf"
            onChange={handleImageUpload}
          />
        </label>
          </div>
          
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

      {/* Debug sections */}

      {/* Update the debug sections */}
      {debugLog.length > 0 && (
          <div className="w-full max-w-md mt-4 p-2 bg-gray-100 rounded">
            <h3 className="text-sm font-medium mb-2">Debug Log:</h3>
            <div className="space-y-4">
              {debugLog.map((log, index) => (
                <div key={index} className="text-xs">
                  <div className="font-medium">{log.message}</div>
                  {log.message === 'Processing Variations' ? (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {log.data.map((variation, vIndex) => (
                        <div key={vIndex} className="flex flex-col items-center">
                          <div className="text-xs font-medium mb-1">{variation.name}</div>
                          <img 
                            src={variation.image}
                            alt={`${variation.name} variation`}
                            className="max-w-full border rounded"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    Array.isArray(log.data) && log.data.some(url => url.startsWith('blob:')) ? (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {log.data.map((url, imgIndex) => (
                          <img 
                            key={imgIndex}
                            src={url}
                            alt={`Debug image ${imgIndex + 1}`}
                            className="max-w-[200px] border rounded"
                          />
                        ))}
                      </div>
                    ) : (
                      <pre className="overflow-auto max-h-40 whitespace-pre-wrap">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
      )}
    </div>
  );
}
export default SmartCamera;