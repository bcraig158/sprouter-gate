import { DateTime } from 'luxon';

export const TIMEZONE = 'America/Los_Angeles';

export function formatDate(date: string | Date): string {
  const dt = typeof date === 'string' ? DateTime.fromISO(date) : DateTime.fromJSDate(date);
  return dt.setZone(TIMEZONE).toFormat('ccc, MMM d, yyyy');
}

export function formatTime(time: string): string {
  const dt = DateTime.fromFormat(time, 'HH:mm');
  return dt.toFormat('h:mm a');
}

export function formatDateTime(date: string, time: string): string {
  const dt = DateTime.fromISO(date).setZone(TIMEZONE);
  const timeDt = DateTime.fromFormat(time, 'HH:mm');
  const combined = dt.set({ 
    hour: timeDt.hour, 
    minute: timeDt.minute 
  });
  return combined.toFormat('ccc, MMM d, yyyy \'at\' h:mm a');
}

export function isDateInPast(date: string, time: string): boolean {
  const dt = DateTime.fromISO(date).setZone(TIMEZONE);
  const timeDt = DateTime.fromFormat(time, 'HH:mm');
  const combined = dt.set({ 
    hour: timeDt.hour, 
    minute: timeDt.minute 
  });
  return combined < DateTime.now().setZone(TIMEZONE);
}

export function getTimeUntilEvent(date: string, time: string): string {
  const dt = DateTime.fromISO(date).setZone(TIMEZONE);
  const timeDt = DateTime.fromFormat(time, 'HH:mm');
  const combined = dt.set({ 
    hour: timeDt.hour, 
    minute: timeDt.minute 
  });
  
  const now = DateTime.now().setZone(TIMEZONE);
  const diff = combined.diff(now);
  
  if (diff.as('milliseconds') <= 0) {
    return 'Event has passed';
  }
  
  const days = Math.floor(diff.as('days'));
  const hours = Math.floor(diff.as('hours') % 24);
  const minutes = Math.floor(diff.as('minutes') % 60);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}, ${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
}

export function getCurrentPhase(): 'initial' | 'second-wave' {
  const now = DateTime.now().setZone(TIMEZONE);
  const secondWaveStart = DateTime.fromISO('2025-10-20').setZone(TIMEZONE);
  return now >= secondWaveStart ? 'second-wave' : 'initial';
}
