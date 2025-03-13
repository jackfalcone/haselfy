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
    
    // Ensure text is properly formatted for processing
    const textContent = Array.isArray(text) ? text.join('\n') : String(text);
    
    const lines = textContent.split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    lines.forEach(line => {
      // Date pattern
      const dateMatch = line.match(/(?:Mo|Di|Mi|Do|Fr|Sa|So)\.\s*(\d{2})\.(\d{2})\.(\d{4})/);
      if (dateMatch) {
        currentDate = `${dateMatch[1]}.${dateMatch[2]}.${dateMatch[3]}`;
        return;
      }

      // Time pattern (handles both ranges and single times)
      const timeMatch = line.match(/^(\d{1,2}[:\.]\d{2})(?:\s*-\s*(\d{1,2}[:\.]\d{2})|$)/);
      if (timeMatch && currentDate) {
        const startTime = timeMatch[1].replace('.', ':');
        let endTime = timeMatch[2]?.replace('.', ':');
        
        let remainingText = line.slice(timeMatch[0].length).trim();

        // Extract location
        let location = '';
        const locations = dictionaries.find(d => d.type === 'locations')?.dict || [];
        const foundLocation = locations.find(loc => remainingText.includes(loc));
        if (foundLocation) {
          location = foundLocation;
          remainingText = remainingText.replace(foundLocation, '').trim();
        }

        // Improved organizer pattern
        // Extract organizers
        const organizers = [];
        const namePattern = /(?:Dr\.\s*(?:med\.)?\s*)?(?:[A-ZÄÖÜ]\.\s*[A-Za-zäöüß-]+|[A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß-]+)*)/g;
        let nameMatch;
        while ((nameMatch = namePattern.exec(remainingText)) !== null) {
          const name = nameMatch[0].trim();
          if (name.length > 2) {
            organizers.push(name);
            remainingText = remainingText.replace(name, '').trim();
          }
        }

        // Clean up description
        const description = remainingText
          .replace(/\s+/g, ' ')
          .replace(/^\s*[-:]\s*/, '')
          .trim();

        // Handle end time
        if (!endTime && startTime) {
          const [hours, minutes] = startTime.split(':').map(Number);
          const endDate = new Date(2000, 0, 1, hours, minutes);
          endDate.setMinutes(endDate.getMinutes() + 30);
          endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
        }

        // Create appointment if we have the minimum required data
        if (startTime && (description || location)) {
          appointments.push({
            startDate: parseDateTime(currentDate, startTime),
            endDate: parseDateTime(currentDate, endTime),
            description,
            location,
            organizers,
            rawText: line
          });
        }
      }
    });
    
    return appointments.sort((a, b) => a.startDate - b.startDate);
  };

  useEffect(() => {
    if (extractedText) {
      const appointments = parseAppointments(extractedText.text);
      setParsedAppointments(appointments);
      onAppointmentsProcessed(appointments);
    }
  }, [extractedText, onAppointmentsProcessed]);

  // Add this helper function
  const groupAppointmentsByDate = (appointments) => {
    return appointments.reduce((groups, appointment) => {
      const date = appointment.startDate.toLocaleDateString('de-DE', {
        weekday: 'short',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(appointment);
      return groups;
    }, {});
  };

  // Update the render section:
  // Add this function at the top with other functions
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .catch(err => console.error('Failed to copy text:', err));
  };

  // In the return statement, add this before the appointments list
  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">Detected Appointments</h2>
      
      {extractedText && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-700">Extracted Text:</h3>
            <button
              onClick={() => copyToClipboard(extractedText.text)}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Copy Text
            </button>
          </div>
          <pre className="text-xs overflow-auto max-h-60 whitespace-pre-wrap bg-white p-3 rounded border">
            {extractedText.text}
          </pre>
        </div>
      )}

      {parsedAppointments.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupAppointmentsByDate(parsedAppointments)).map(([date, dayAppointments]) => (
            <div key={date} className="space-y-2">
              <h3 className="text-lg font-medium text-gray-800 border-b pb-2">
                {date}
              </h3>
              <ul className="space-y-2">
                {dayAppointments.map((appointment, index) => (
                  <li 
                    key={index}
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {/* Rest of the appointment card remains the same */}
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <p className="font-medium">
                          {appointment.startDate.toLocaleTimeString()} - {appointment.endDate.toLocaleTimeString()}
                        </p>
                        {appointment.location && (
                          <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            {appointment.location}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700">
                        {appointment.description}
                        {appointment.organizers && appointment.organizers.length > 0 && (
                          <span className="ml-2 text-sm text-purple-600 bg-purple-50 px-2 py-1 rounded">
                            {appointment.organizers.join(', ')}
                          </span>
                        )}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center">
          No appointments detected yet. Upload an image to get started.
        </p>
      )}
    </div>
  );
}

export default AppointmentList;