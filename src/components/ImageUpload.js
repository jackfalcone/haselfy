import React, { useState, useEffect } from 'react';
import { createWorker } from 'tesseract.js';
import imageCompression from 'browser-image-compression';

function ImageUpload({ onTextExtracted }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [worker, setWorker] = useState(null);

  useEffect(() => {
    const initWorker = async () => {
      try {
        console.log('Starting worker initialization...');
        const newWorker = await createWorker({
          logger: m => {
            console.log('Worker status:', m.status, m.progress);
            if (m.status === 'recognizing text') {
              setProgress(parseInt(m.progress * 100));
            }
          }
        });
        console.log('Worker created, loading German language...');
        await newWorker.loadLanguage('deu');
        console.log('Language loaded, initializing...');
        await newWorker.initialize('deu');
        console.log('Worker initialization complete');
        setWorker(newWorker);
      } catch (error) {
        console.error('Worker initialization failed:', error);
      }
    };

    initWorker();
    return () => {
      if (worker) {
        console.log('Cleaning up worker...');
        worker.terminate();
      }
    };
  }, []);

  const compressImage = async (file) => {
    console.log('Starting image compression...', file.size);
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 2048,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.8
    };

    try {
      const compressed = await imageCompression(file, options);
      console.log('Compression complete. New size:', compressed.size);
      return compressed;
    } catch (error) {
      console.error('Compression failed:', error);
      return file;
    }
  };

  const preprocessImage = async (imageData) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Maintain original size for better text recognition
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Clear background
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw image with high contrast
          ctx.filter = 'contrast(1.2) brightness(1.1)';
          ctx.drawImage(img, 0, 0);
          
          // Convert to grayscale using a simple approach
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          for (let i = 0; i < data.length; i += 4) {
            const brightness = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
            data[i] = brightness;
            data[i + 1] = brightness;
            data[i + 2] = brightness;
          }
          
          ctx.putImageData(imageData, 0, 0);
          
          resolve(canvas.toDataURL('image/png', 1.0));
        };
        img.src = imageData;
      });
    };
  
  const processImage = async (file) => {
    if (!worker) {
      console.error('Worker not initialized yet');
      return;
    }
    
    setIsProcessing(true);
    setProgress(0);
    
    try {
      // Read the file
      const reader = new FileReader();
      const imageData = await new Promise((resolve, reject) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });
  
      // Preprocess the image
      console.log('Preprocessing image...');
      const processedImageData = await preprocessImage(imageData);
      
      console.log('Starting OCR...');
      const result = await worker.recognize(processedImageData);
      console.log('Extracted text:', result.data.text);
      onTextExtracted(result.data.text);
    } catch (error) {
      console.error('Processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      processImage(file);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center w-full">
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
      {isProcessing && (
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
    </div>
  );
}

export default ImageUpload;