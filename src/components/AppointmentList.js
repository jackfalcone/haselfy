import React, { useEffect, useState } from 'react';
import { dictionaries } from '../data/dictionaries';

function AppointmentList({ extractedText, onAppointmentsProcessed }) {
  const [parsedAppointments, setParsedAppointments] = useState([]);

  const parseDateTime = (dateStr, timeStr) => {
    const [day, month, year] = dateStr.split('.');
    const [hours, minutes] = timeStr.split(':');
    return new Date(year, month - 1, day, hours, minutes);
  };

  const parseAppointments = (text) => {
    const appointments = [];
    let currentDate = null;
    let currentAppointment = null;

    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(Boolean);
    
    lines.forEach(line => {
      const dateMatch = line.match(/.*?((?:Mo|Di|Mi|Do|Fr|Sa|So)\.\s*\d{2}\.\d{2}\.\d{4})/);
      if (dateMatch) {
        const fullDate = dateMatch[1];
        const [_, day, month, year] = fullDate.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        currentDate = new Date(year, month - 1, day);
      }

      const timeMatch = line.match(/.*?(\d{1,2}[:\.]\d{2})\s+(\d{1,2}[:\.]\d{2})/);
      if (timeMatch && currentDate) {
        if (currentAppointment) {
          appointments.push(currentAppointment);
        }

        const startTime = timeMatch[1].replace('.', ':');
        const endTime = timeMatch[2].replace('.', ':');
        
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);

        const startDate = new Date(currentDate);
        startDate.setHours(startHours, startMinutes);

        const endDate = new Date(currentDate);
        endDate.setHours(endHours, endMinutes);

        currentAppointment = {
          startDate,
          endDate,
          description: line.slice(line.indexOf(timeMatch[0]) + timeMatch[0].length).trim()
        };
      } else if (currentAppointment && !dateMatch && !timeMatch) {
        currentAppointment.description += ' ' + line;
      }
    });

    if (currentAppointment) {
      appointments.push(currentAppointment);
    }
    
    return appointments;
  };

  useEffect(() => {
    if (extractedText) {
      const appointments = parseAppointments(extractedText.text);
      setParsedAppointments(appointments);
      console.log('Parsed Appointments:', appointments);
      onAppointmentsProcessed(appointments);
    }
  }, [extractedText, onAppointmentsProcessed]);

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">Detected Appointments</h2>
      
      {extractedText && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <pre className="text-xs overflow-auto max-h-60 whitespace-pre-wrap bg-white p-3 rounded border">
            {extractedText.text}
          </pre>
        </div>
      )}

      {parsedAppointments.length > 0 ? (
        <ul className="space-y-2">
          {parsedAppointments.map((appointment, index) => (
            <li 
              key={index}
              className="p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex flex-col gap-2">
                <p className="font-medium">
                  {appointment.startDate.toLocaleTimeString()} - {appointment.endDate.toLocaleTimeString()}
                </p>
                <p className="text-gray-700">
                  {appointment.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-center">
          No appointments detected yet. Upload an image to get started.
        </p>
      )}
    </div>
  );
}

export default AppointmentList;