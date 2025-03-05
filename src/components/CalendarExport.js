import React from 'react';
import ical from 'ical-generator';

function CalendarExport({ appointments }) {
  const handleExport = () => {
    const calendar = ical({
      name: 'Klinik im hasel Appointments',
      timezone: 'Europe/Berlin'
    });

    appointments.forEach(appointment => {
      calendar.createEvent({
        start: appointment.startDate,
        end: appointment.endDate,
        summary: appointment.description,
        location: appointment.location,
        description: appointment.rawText
      });
    });

    // Generate and download the .ics file
    const blob = new Blob([calendar.toString()], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appointments-${new Date().toISOString().split('T')[0]}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-6">
      <button
        onClick={handleExport}
        disabled={!appointments.length}
        className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-colors
          ${appointments.length 
            ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800' 
            : 'bg-gray-400 cursor-not-allowed'
          }`}
      >
        Export {appointments.length} Appointment{appointments.length !== 1 ? 's' : ''} to Calendar
      </button>
      {appointments.length > 0 && (
        <p className="text-sm text-gray-500 text-center mt-2">
          Creates a .ics file you can import into your calendar
        </p>
      )}
    </div>
  );
}

export default CalendarExport;