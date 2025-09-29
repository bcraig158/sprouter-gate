import { DateTime } from 'luxon';

export interface EventConfig {
  date: string;
  time: string;
  key: string;
  name: string;
}

export interface PhaseConfig {
  initialTicketsPerNight: number;
  volunteerBonusTickets: number;
  secondWaveAdditionalTickets: number;
  maxTicketsPerNight: number;
  maxTicketsWithVolunteer: number;
  secondWaveStartDate: string;
  salesCloseHour: number;
}

// Event configuration
export const EVENTS: Record<string, EventConfig> = {
  'tue-530': {
    date: process.env.EVENT_TUE_530_DATE || '2025-10-28',
    time: process.env.EVENT_TUE_530_TIME || '17:30',
    key: 'tue-530',
    name: 'Tuesday 5:30 PM'
  },
  'tue-630': {
    date: process.env.EVENT_TUE_630_DATE || '2025-10-28',
    time: process.env.EVENT_TUE_630_TIME || '18:30',
    key: 'tue-630',
    name: 'Tuesday 6:30 PM'
  },
  'thu-530': {
    date: process.env.EVENT_THU_530_DATE || '2025-10-30',
    time: process.env.EVENT_THU_530_TIME || '17:30',
    key: 'thu-530',
    name: 'Thursday 5:30 PM'
  },
  'thu-630': {
    date: process.env.EVENT_THU_630_DATE || '2025-10-30',
    time: process.env.EVENT_THU_630_TIME || '18:30',
    key: 'thu-630',
    name: 'Thursday 6:30 PM'
  }
};

// Phase configuration
export const PHASE_CONFIG: PhaseConfig = {
  initialTicketsPerNight: parseInt(process.env.INITIAL_TICKETS_PER_NIGHT || '2'),
  volunteerBonusTickets: parseInt(process.env.VOLUNTEER_BONUS_TICKETS || '2'),
  secondWaveAdditionalTickets: parseInt(process.env.SECOND_WAVE_ADDITIONAL_TICKETS || '4'),
  maxTicketsPerNight: parseInt(process.env.MAX_TICKETS_PER_NIGHT || '6'),
  maxTicketsWithVolunteer: parseInt(process.env.MAX_TICKETS_WITH_VOLUNTEER || '8'),
  secondWaveStartDate: process.env.SECOND_WAVE_START_DATE || '2025-10-20',
  salesCloseHour: parseInt(process.env.SALES_CLOSE_HOUR || '16')
};

export interface NightInfo {
  night: 'tue' | 'thu';
  date: string;
  events: EventConfig[];
}

export interface AllowanceInfo {
  baseAllowance: number;
  volunteerBonus: number;
  secondWaveBonus: number;
  totalAllowance: number;
  isVolunteer: boolean;
  isSecondWave: boolean;
  maxAllowed: number;
}

/**
 * Get the current phase based on the current date
 */
export function getCurrentPhase(): 'initial' | 'second-wave' {
  const now = DateTime.now().setZone('America/Los_Angeles');
  const secondWaveStart = DateTime.fromISO(PHASE_CONFIG.secondWaveStartDate).setZone('America/Los_Angeles');
  
  return now >= secondWaveStart ? 'second-wave' : 'initial';
}

/**
 * Check if sales are currently open for a specific event
 */
export function isSalesOpen(eventKey: string): boolean {
  const event = EVENTS[eventKey];
  if (!event) return false;

  const now = DateTime.now().setZone('America/Los_Angeles');
  const eventDate = DateTime.fromISO(event.date).setZone('America/Los_Angeles');
  const salesCloseTime = eventDate.set({ 
    hour: PHASE_CONFIG.salesCloseHour, 
    minute: 0, 
    second: 0, 
    millisecond: 0 
  });

  return now < salesCloseTime;
}

/**
 * Get night information for a given event
 */
export function getNightForEvent(eventKey: string): NightInfo | null {
  if (eventKey.startsWith('tue-')) {
    return {
      night: 'tue',
      date: EVENTS['tue-530'].date,
      events: [EVENTS['tue-530'], EVENTS['tue-630']]
    };
  } else if (eventKey.startsWith('thu-')) {
    return {
      night: 'thu',
      date: EVENTS['thu-530'].date,
      events: [EVENTS['thu-530'], EVENTS['thu-630']]
    };
  }
  return null;
}

/**
 * Calculate allowance for a household based on volunteer status and current phase
 */
export function calculateAllowance(
  isVolunteer: boolean,
  currentPhase: 'initial' | 'second-wave' = getCurrentPhase()
): AllowanceInfo {
  const baseAllowance = PHASE_CONFIG.initialTicketsPerNight;
  const volunteerBonus = isVolunteer ? PHASE_CONFIG.volunteerBonusTickets : 0;
  const secondWaveBonus = currentPhase === 'second-wave' ? PHASE_CONFIG.secondWaveAdditionalTickets : 0;
  
  const totalAllowance = baseAllowance + volunteerBonus + secondWaveBonus;
  const maxAllowed = isVolunteer ? PHASE_CONFIG.maxTicketsWithVolunteer : PHASE_CONFIG.maxTicketsPerNight;

  return {
    baseAllowance,
    volunteerBonus,
    secondWaveBonus,
    totalAllowance: Math.min(totalAllowance, maxAllowed),
    isVolunteer,
    isSecondWave: currentPhase === 'second-wave',
    maxAllowed
  };
}

/**
 * Get all available events with their current status
 */
export function getAvailableEvents(): Array<EventConfig & { isAvailable: boolean; night: string }> {
  const currentPhase = getCurrentPhase();
  
  return Object.values(EVENTS).map(event => {
    const nightInfo = getNightForEvent(event.key);
    return {
      ...event,
      isAvailable: isSalesOpen(event.key),
      night: nightInfo?.night || 'unknown'
    };
  });
}

/**
 * Validate if a household can request tickets for a specific night
 */
export function canRequestTicketsForNight(
  night: 'tue' | 'thu',
  currentTicketsRequested: number,
  currentTicketsPurchased: number,
  isVolunteer: boolean,
  currentPhase: 'initial' | 'second-wave' = getCurrentPhase()
): { canRequest: boolean; reason?: string; allowance: AllowanceInfo } {
  const allowance = calculateAllowance(isVolunteer, currentPhase);
  const totalUsed = currentTicketsRequested + currentTicketsPurchased;
  
  if (totalUsed >= allowance.totalAllowance) {
    return {
      canRequest: false,
      reason: `Maximum allowance of ${allowance.totalAllowance} tickets reached`,
      allowance
    };
  }

  // Check if any events for this night are still available
  const nightEvents = night === 'tue' 
    ? [EVENTS['tue-530'], EVENTS['tue-630']]
    : [EVENTS['thu-530'], EVENTS['thu-630']];
  
  const hasAvailableEvents = nightEvents.some(event => isSalesOpen(event.key));
  
  if (!hasAvailableEvents) {
    return {
      canRequest: false,
      reason: 'Sales have closed for this night',
      allowance
    };
  }

  return {
    canRequest: true,
    allowance
  };
}
