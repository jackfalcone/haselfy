import React, { useState } from 'react';
import AppointmentList from './components/AppointmentList';
import CalendarExport from './components/CalendarExport';
import { SmartCamera } from './components/SmartCamera';  // Use named import
import { processOCR } from './services/OCRService';

function App() {
  const [extractedText, setExtractedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [logFinalWords, setLogFinalWords] = useState('');

  const handleImageCaptured = async (imageData) => {
    setIsProcessing(true);
    console.log(imageData);
    try {
      const text = await processOCR(imageData);
      setExtractedText(text);
      setLogFinalWords(text);
    } catch (error) {
      console.error('OCR processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <SmartCamera onImageCaptured={handleImageCaptured} />
      {isProcessing ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      ) : (
        <AppointmentList 
          extractedText={extractedText}
          onAppointmentsProcessed={(appointments) => {
            // Handle processed appointments
          }}
        />
      )}
    </div>
  );
}

export default App;