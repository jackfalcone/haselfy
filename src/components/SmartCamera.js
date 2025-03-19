import React, { useRef, useState } from 'react';
import { processImage } from '../utils/imageProcessing';
import { isImageSharp, isBrightnessGood, isMotionBlurLow } from '../utils/imageQuality';
import InputSelection from './InputSelection';
import CameraView from './CameraView';
import ImagePreview from './ImagePreview';
import QualityCheck from './QualityCheck';

export function SmartCamera({ onImageCaptured }) {
  const videoRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingPhase, setProcessingPhase] = useState('');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [imageQuality, setImageQuality] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);
  const [qualityIssues, setQualityIssues] = useState([]);

  const startCamera = async () => {
    try {
      setIsStreaming(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 3508 },  // A4 at 300 DPI
          height: { ideal: 2480 }, // A4 at 300 DPI
          advanced: [{ torch: torchEnabled }]
        }  
      });

      videoRef.current.srcObject = stream;
      

      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();

      setHasTorch(capabilities.torch || false);

    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };

  const toggleTorch = async () => {
    if (!videoRef.current?.srcObject) return;

    const track = videoRef.current.srcObject.getVideoTracks()[0];
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchEnabled }] });
      setTorchEnabled(!torchEnabled);
    } catch (error) {
      console.error('Error toggling torch:', error);
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
    setProcessingPhase('Processing image...');

    try {
      const imageUrl = URL.createObjectURL(imageBlob);
      setPreviewImage(imageUrl);

      setProcessingPhase('Checking image quality...');
      
      const qualityChecks = await Promise.all([
        isImageSharp(imageUrl),
        isBrightnessGood(imageUrl),
        isMotionBlurLow(imageUrl)
      ]);

      const [sharpness, brightness, motionBlur] = qualityChecks;

      if (!sharpness.isSharp || !brightness.isGood || !motionBlur.isNotBlurred) {

        const qualityIssues = [];
        if (!sharpness.isSharp) {
          qualityIssues.push('Image is unsharp');
        }
        if (!brightness.isGood) {
          if (brightness.brightnessScore < .25) {
            qualityIssues.push('Image is too dark');
          }
          if (brightness.brightnessScore > .75) {
            qualityIssues.push('Image is too bright');
          }
        }
        if (!motionBlur.isNotBlurred) {
          qualityIssues.push('Image has motion blur');
        }

        return {
          success: false,
          qualityIssues
        }
      };

      setProcessingPhase('Optimize image for text extraction');
      const processedImage = await processImage(imageUrl, brightness, torchEnabled);

      setPreviewImage(processedImage.final);
      onImageCaptured(processedImage.final);

      if (videoRef.current?.srcObject) {
        stopCamera();
      }

      setProcessingPhase('');

      return { success: true };
    } catch (error) {
      console.error('Error processing image:', error);
      setProcessingPhase('An unexpected error occurred');
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
        setImageQuality(false);
      }
    }, 'image/png');
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const result = await handleImage(file);
      if (!result.success) {
        setProcessingPhase(`Please try again. ${result.qualityIssues.join(', ')}`);
        setImageQuality(false);
      }
    };
  };

  const handleTryAgain = () => {
    setIsProcessing(false);
    setProcessingPhase('');
    setImageQuality(true);
    setQualityIssues([]);
    stopCamera(); // Always stop the camera
    setIsStreaming(false); // Ensure streaming is false to show input selection
    setPreviewImage(null);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {!isStreaming && !previewImage && (
        <InputSelection 
          onCameraStart={startCamera}
          onImageUpload={handleImageUpload}
        />
      )}

      {isStreaming && !previewImage && (
        <CameraView
          videoRef={videoRef}
          hasTorch={hasTorch}
          torchEnabled={torchEnabled}
          onTorchToggle={toggleTorch}
          onCapture={captureImage}
          isProcessing={isProcessing}
        />
      )}

      {previewImage && (
        <ImagePreview
          imageUrl={previewImage}
          isProcessing={isProcessing}
          processingPhase={processingPhase}
          imageQuality={imageQuality}
          onTryAgain={handleTryAgain}
        />
      )}

      {!imageQuality && (
        <QualityCheck
          qualityIssues={qualityIssues}
          onTryAgain={handleTryAgain}
        />
      )}
    </div>
  );
}

export default SmartCamera;