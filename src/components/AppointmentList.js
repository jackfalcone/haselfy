import React, { useEffect, useState } from 'react';
import { dictionaries } from '../data/dictionaries';

function AppointmentList({ extractedText, onAppointmentsProcessed }) {
  const [parsedAppointments, setParsedAppointments] = useState([]);

  // Clean description from common OCR artifacts and gibberish
  const cleanupDescription = (text) => {
    return text
      // First, clean up obvious OCR artifacts and special characters
      .replace(/[\\|/_(){}<>[\]]+/g, ' ')
      .replace(/[*&^%$#@!]+/g, ' ')
      .replace(/\d+[*&^%$#@!]+/g, ' ')
      // Remove everything after common OCR artifact patterns
      .replace(/\s+[|\\]+[^\n]*/, '')  // Changed to preserve newlines
      .replace(/\s+sn\s+.*$/, '')
      // Clean up parentheses content with gibberish
      .replace(/\([^)]*?[\\|/_*&^%$#@!]+[^)]*?\)/g, ' ')
      // Remove standalone special characters
      .replace(/\s+[.,;]\s+/g, ' ')
      // Keep words with letters and numbers, remove gibberish
      .split(' ')
      .filter(word => {
        // Keep words with mostly valid characters
        const validChars = word.match(/[a-zA-ZäöüßÄÖÜ0-9]/g) || [];
        const hasEnoughValidChars = validChars.length / word.length > 0.7;
        // Keep words that are either numbers or have enough valid characters
        return /^\d+$/.test(word) || (word.length > 1 && hasEnoughValidChars);
      })
      .join(' ')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
  };

  const parseAppointments = (text) => {
    // Add this new function to process description
    const processAppointmentDescription = (appointment) => {
      const description = appointment.description;
      
      // Pattern for names like "C. Jordi" or "M. Alicioglu"
      const namePattern = /[A-Z]\.\s+[A-Z][a-zäöüß]+/g;
      const foundNames = description.match(namePattern) || [];
      
      const words = description.split(' ');

      // Find names in the description by matching the dictionary
      const organizersDict = dictionaries.find(dict => dict.type === 'organizers');
      const organizersDictMatches = words.filter(word => {
        return organizersDict.dict.includes(word) && word.length > 1;
      });

      // Filter out dictionary matches that are already included in pattern matches
      const uniqueOrganizerMatches = organizersDictMatches.filter(surname => 
        !foundNames.some(fullName => fullName.endsWith(surname))
      );

      // Set the organizers (preferring pattern matches)
      appointment.organizers = [...foundNames, ...uniqueOrganizerMatches];

      // Find location from dictionary
      const locationsDict = dictionaries.find(dict => dict.type === 'locations');
      const locationMatches = words.filter(word => {
        return locationsDict.dict.includes(word) && word.length > 1;
      });
      if (locationMatches.length > 0) {
        appointment.location = locationMatches.join(' ');
      }

      // Clean up description
      let cleanDescription = appointment.description;
      [...appointment.organizers, ...(appointment.location ? appointment.location.split(' ') : [])]
        .forEach(term => {
          cleanDescription = cleanDescription.replace(term, '');
        });

      appointment.description = cleanDescription.replace(/\s+/g, ' ').trim();
    };
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
          processAppointmentDescription(currentAppointment);
          appointments.push(currentAppointment);
        }

        // Create new appointment
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
          description: cleanupDescription(line.slice(line.indexOf(timeMatch[0]) + timeMatch[0].length).trim()),
          organizers: [],
          location: null
        };
      } else if (currentAppointment && !dateMatch && !timeMatch) {
        currentAppointment.description += ' ' + line;
      }
    });

    if (currentAppointment) {
      processAppointmentDescription(currentAppointment);
      appointments.push(currentAppointment);
    }
    
    return appointments;
  };

  useEffect(() => {
    if (extractedText) {
      const appointments = parseAppointments(extractedText.text);
      setParsedAppointments(appointments);
      onAppointmentsProcessed(appointments);
    }
  }, [extractedText, onAppointmentsProcessed]);

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">Detected Appointments</h2>
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
                {appointment.organizers.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <p>{appointment.organizers.join(', ')}</p>
                  </div>
                )}
                {appointment.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p>{appointment.location}</p>
                  </div>
                )}
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