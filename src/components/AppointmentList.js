import React, { useEffect, useState } from 'react';

function AppointmentList({ extractedText, onAppointmentsProcessed }) {
  const [parsedAppointments, setParsedAppointments] = useState([]);

  const parseDateTime = (dateStr, timeStr) => {
    const [day, month, year] = dateStr.split('.');
    const [hours, minutes] = timeStr.split(':');
    return new Date(year, month - 1, day, hours, minutes);
  };

  const parseAppointments = (text) => {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    const appointments = [];
    let currentDate = '';
    let isInDailySchedule = false;  // Flag to track if we're in the daily schedule section
    
    // Add pattern to detect the end of daily schedule
    const scheduleEndPattern = /Medikamentenabgabe|Essenszeiten|Pausen|NA-Meeting/i;
    
    // Add invalid line patterns
    const invalidLinePatterns = [
      /^\d{2}\.\d{2}\.\d{4}\s*\/\s*-/, // Matches date format like "28.02.2025 / -"
      /^CIM\s*$/,                       // Matches standalone CIM
      /^\s*:\s*['`]\s*\d{2}\.\d{2}\.\d{4}/ // Matches timestamp-like entries
    ];

    // Enhanced patterns
    const datePattern = /(?:Mo|Di|Mi|Do|Fr|Sa|So)\.\s*(\d{2}\.\d{2}\.\d{4})/i;
    const timePattern = /(\d{1,2}:\d{2})\s*(?:-\s*(\d{1,2}:\d{2})|)/;
    const endTimePattern = /(?:^|\s)(\d{1,2}:\d{2})|(?:^|\s)(\d{4})/;
    const durationPattern = /(?:^|\s)(\d{2,3})(?:['']|\s*min|\s*')/i;
    const locationPatterns = [
      /GR\s*Matterhorn/i,
      /Arztzimmer/i,
      /Schulungsraum/i,
      /Station\s*\d+/i,
      /Eingangshalle(?:\s+Hauptgebäude)?/i,
      /Auditorium(?:_|\s*)Go/i,
      /Sitzungszimmer\s+Venus/i,
      /Soz\.-Dienstzimmer\s*(?:\(Fr\.\s*Widmer\))?/i,
      /Ergotherapieraum/i,
      /TZ\s*\d+\s*(?:\(Treffpunkt\s+Eingangshalle(?:\s+Hauptgebäude)?\))?/i
    ];

    const cleanDescription = (text) => {
      return text
        .replace(/^[Z_\s]+/, '')        // Remove leading Z and underscores
        .replace(/^\d{1,2}:\d{2}\s*/, '') // Remove leading time
        .replace(/\s+/g, ' ')           // Normalize spaces
        .replace(/['']/g, "'")          // Normalize quotes
        .trim();
    };

    lines.forEach(line => {
      // Skip invalid lines
      if (invalidLinePatterns.some(pattern => pattern.test(line))) {
        return;
      }

      // Check if we've reached the general information section
      if (scheduleEndPattern.test(line)) {
        isInDailySchedule = false;
        return;
      }

      // Check for date - this also indicates we're in the daily schedule
      const dateMatch = line.match(datePattern);
      if (dateMatch) {
        currentDate = dateMatch[1];
        isInDailySchedule = true;
        return;
      }

      // Only process appointments if we're in the daily schedule section
      if (!isInDailySchedule) return;

      const timeMatch = line.match(timePattern);
      // Inside the time matching block:
      if (timeMatch) {
          const startTime = timeMatch[1];
          let endTime = timeMatch[2];
          let location = '';
          let description = cleanDescription(line);
      
          // Look for explicit end time in description first
          const explicitEndMatch = description.match(endTimePattern);
          if (explicitEndMatch) {
              if (explicitEndMatch[1]) {
                  endTime = explicitEndMatch[1];
              } else if (explicitEndMatch[2]) {
                  const time = explicitEndMatch[2];
                  endTime = `${time.slice(0,2)}:${time.slice(2)}`;
              }
              description = description.replace(explicitEndMatch[0], '').trim();
          }
          
          // If no end time, look for duration
          if (!endTime || endTime === startTime) {
              const durationMatch = description.match(durationPattern);
              if (durationMatch) {
                  const duration = parseInt(durationMatch[1]);
                  const [hours, minutes] = startTime.split(':').map(Number);
                  const endDate = new Date(2000, 0, 1, hours, minutes);
                  endDate.setMinutes(endDate.getMinutes() + duration);
                  endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
                  description = description.replace(durationMatch[0], '').trim();
              }
          }

          // Extract location and clean up description
          description = description
              .replace(timePattern, '')
              .replace(/\s*-\s*$/, '')
              .replace(/\s+/g, ' ')
              .replace(/^\s*-\s*/, '')
              .replace(/^[;—]+\s*/, '')
              .replace(/\s*[;.]+\s*$/, '')
              .replace(/\s*\([^)]*\)\s*$/, '')
              .replace(/\s*\(Treffpunkt[^)]*\)/, '')
              .replace(/\s*Hauptgebäude\)?/, '')
              .replace(/\|/g, 'I')
              .replace(/^(?:RE|EZEE|Ba)\s+/, '') // Remove specific prefixes
              .trim();
      
          if (!endTime) {
              const [hours, minutes] = startTime.split(':').map(Number);
              const endDate = new Date(2000, 0, 1, hours, minutes);
              endDate.setMinutes(endDate.getMinutes() + 30);
              endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
          }

          const organizerPattern = /(?:Dr\.\s*med\.)?\s*[A-Z]\.\s*[A-Za-zäöüß]+/;
      
          // In the time matching block where appointments are created:
          if (startTime && description) {
              // Extract location
              let location = '';
              let organizer = '';
              
              // Check for location matches
              for (const pattern of locationPatterns) {
                  const match = description.match(pattern);
                  if (match) {
                      location = match[0];
                      description = description.replace(match[0], '').trim();
                      break;
                  }
              }
              
              // Extract organizer
              const organizerMatch = description.match(organizerPattern);
              if (organizerMatch) {
                  organizer = organizerMatch[0];
                  description = description.replace(organizerMatch[0], '').trim();
              }
      
              const [year, month, day] = currentDate.split('.').reverse();
              appointments.push({
                  startDate: parseDateTime(currentDate, startTime),
                  endDate: parseDateTime(currentDate, endTime),
                  description,
                  location,
                  organizer,
                  rawText: line.trim()
              });
          }
      }
    });

    return appointments;
  };

  useEffect(() => {
    if (extractedText) {
      const appointments = parseAppointments(extractedText);
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
              onClick={() => copyToClipboard(extractedText)}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Copy Text
            </button>
          </div>
          <pre className="text-xs overflow-auto max-h-60 whitespace-pre-wrap bg-white p-3 rounded border">
            {extractedText}
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
                        {appointment.organizer && (
                          <span className="ml-2 text-sm text-purple-600 bg-purple-50 px-2 py-1 rounded">
                            {appointment.organizer}
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