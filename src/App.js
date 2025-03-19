import React, { useState, useEffect } from 'react';
import AppointmentList from './components/AppointmentList';
import CalendarExport from './components/CalendarExport';
import { SmartCamera } from './components/SmartCamera';
import { processOCR } from './services/OCRService';

function App() {
  const [extractedText, setExtractedText] = useState('');
  const [processedAppointments, setProcessedAppointments] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (processedAppointments.length > 0) {
      const appointmentList = document.getElementById('appointment-list');
      if (appointmentList) {
        appointmentList.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [processedAppointments])

  const handleImageCaptured = async (imageData) => {
    setIsProcessing(true);
    try {
      const text = await processOCR(imageData);
      setExtractedText(text);
    } catch (error) {
      console.error('OCR processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <header className="mb-2 text-center">
        <h1 className="text-3xl font-bold text-gray-800 font-['Audiowide'] tracking-wide">Haselfy</h1>
      </header>
      <SmartCamera onImageCaptured={handleImageCaptured} OcrIsProcessing={isProcessing} />
      {!isProcessing && (
        <div id="appointment-list">
          <AppointmentList 
            extractedText={extractedText}
            onAppointmentsProcessed={(appointments) => {
              setProcessedAppointments(appointments);
            }}
          />
          {processedAppointments.length > 0 && (
            <CalendarExport appointments={processedAppointments} />
          )}
        </div>
      )}
      <footer className="mt-12 text-center text-sm text-gray-600">
        <p className="mb-2">Created by Yves Dätwyler</p>
        <a 
          href="https://github.com/jackfalcone/haselfy" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          Explore the code & Join the journey
        </a>
      </footer>
    </div>
  );
}

export default App;