import React, { useState } from 'react';
// import ImageUpload from './components/ImageUpload';
// import AppointmentList from './components/AppointmentList';
// import CalendarExport from './components/CalendarExport';

function App() {
  const [extractedText, setExtractedText] = useState('');
  const [appointments, setAppointments] = useState([]);

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <h1 className="text-2xl font-bold text-center mb-8">
                  Appointment Scanner
                </h1>
                {/* <ImageUpload onTextExtracted={setExtractedText} />
                <AppointmentList 
                  extractedText={extractedText}
                  onAppointmentsProcessed={setAppointments}
                />
                <CalendarExport appointments={appointments} /> */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;