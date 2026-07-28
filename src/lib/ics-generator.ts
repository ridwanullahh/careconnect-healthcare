export interface CalendarEvent {
  title: string;
  description: string;
  location?: string;
  start: Date;
  end: Date;
  organizer?: string;
  attendeeEmail?: string;
  uid?: string;
}

function formatDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeICS(text: string): string {
  return text.replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
}

export function generateICS(event: CalendarEvent): string {
  const uid = event.uid || `careconnect-${Date.now()}-${Math.random().toString(36).slice(2)}@careconnect.health`;
  const now = formatDate(new Date());

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CareConnect//Healthcare Platform//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatDate(event.start)}`,
    `DTEND:${formatDate(event.end)}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `DESCRIPTION:${escapeICS(event.description)}`,
  ];

  if (event.location) lines.push(`LOCATION:${escapeICS(event.location)}`);
  if (event.organizer) lines.push(`ORGANIZER:CN=${escapeICS(event.organizer)}`);
  if (event.attendeeEmail) lines.push(`ATTENDEE;RSVP=TRUE:mailto:${event.attendeeEmail}`);

  lines.push(
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: ${escapeICS(event.title)} in 1 hour`,
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: ${escapeICS(event.title)} tomorrow`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  );

  return lines.join('\r\n');
}

export function downloadICS(event: CalendarEvent, filename?: string): void {
  const icsContent = generateICS(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function bookingToCalendarEvent(booking: any): CalendarEvent {
  const start = new Date(booking.date + 'T' + booking.time);
  const end = new Date(start.getTime() + (booking.duration_minutes || 30) * 60000);
  return {
    title: `${booking.service_name || 'Appointment'} - ${booking.entity_name || 'CareConnect'}`,
    description: [
      `Booking Reference: ${booking.booking_reference || booking.id}`,
      `Service: ${booking.service_name || 'N/A'}`,
      `Provider: ${booking.entity_name || 'N/A'}`,
      booking.notes ? `Notes: ${booking.notes}` : '',
    ].filter(Boolean).join('\n'),
    location: booking.entity_address || '',
    start,
    end,
    organizer: booking.entity_name,
    attendeeEmail: booking.user_email,
  };
}

export default { generateICS, downloadICS, bookingToCalendarEvent };
