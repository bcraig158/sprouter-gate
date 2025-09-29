declare module 'luxon' {
  export class DateTime {
    static fromISO(iso: string): DateTime;
    static fromFormat(format: string, pattern: string): DateTime;
    static now(): DateTime;
    static fromJSDate(date: Date): DateTime;
    
    setZone(zone: string): DateTime;
    set(options: { hour?: number; minute?: number }): DateTime;
    toFormat(format: string): string;
    diff(other: DateTime): Duration;
    
    hour: number;
    minute: number;
  }
  
  export class Duration {
    as(unit: string): number;
  }
}
