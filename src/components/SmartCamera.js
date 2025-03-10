import React, { useRef, useState, useEffect } from 'react';
import { processImages } from '../utils/imageProcessing';
import { extractAndCombineText } from '../utils/textProcessing';

export function SmartCamera({ onImageCaptured }) {
  const videoRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
    const [debugLog, setDebugLog] = useState([]);
    const [processingPhase, setProcessingPhase] = useState('');
    const [ocrProgress, setOcrProgress] = useState(0);

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
  
  // Modify the captureImage function
  const captureImage = async () => {
    if (!videoRef.current || isProcessing) return;

    setIsProcessing(true);
    setCaptureProgress(0);
    setOcrProgress(0);
    setProcessingPhase('Capturing images...');
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      const images = [];
      const totalShots = 3;
      
      // Continue with remaining shots
      for (let i = 0; i < totalShots; i++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        ctx.drawImage(videoRef.current, 0, 0);
        images.push(canvas.toDataURL('image/png', 1.0));
        setCaptureProgress(((i + 1) / totalShots) * 100);
      }
      
      setProcessingPhase('Processing images...');
      const processedImages = await processImages(images);
      
      setProcessingPhase('Performing OCR...');
      const { text, words, ocrResults } = await extractAndCombineText(
        processedImages,
        (progress) => {
          setOcrProgress(progress);
        }
      );
      
      // Log debug information
      logDebug('OCR Results', {
        individualResults: ocrResults.map((r, i) => ({
          image: i + 1,
          confidence: r.confidence,
          processingTime: `${Math.round(r.time)}ms`
        })),
        finalWords: words.map(w => ({
          text: w.text,
          confidence: Math.round(w.confidence),
          occurrences: w.occurrences
        }))
      });
      
      onImageCaptured(processedImages[0], text);
      stopCamera();
    } catch (error) {
      console.error('Error capturing image:', error);
      setProcessingPhase('Error occurred');
    } finally {
      setIsProcessing(false);
      setCaptureProgress(0);
      setOcrProgress(0);
      setProcessingPhase('');
    }
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
        {isStreaming && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-4 border-2 border-white border-opacity-50 rounded-lg"></div>
            {isProcessing ? (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="mb-2">{processingPhase}</div>
                  <div className="w-48 h-2 bg-gray-700 rounded-full">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all duration-200"
                      style={{ width: `${processingPhase === 'Capturing images...' ? captureProgress : ocrProgress}%` }}
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
      
      {/* Controls */}
      <div className="relative z-20">
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

      {/* Debug sections */}

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