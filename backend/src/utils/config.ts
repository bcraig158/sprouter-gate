import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface SprouterConfig {
  tue530: string;
  tue630: string;
  thu530: string;
  thu630: string;
}

export const sprouterConfig: SprouterConfig = {
  tue530: process.env.SPROUTER_TUE_530_URL || 'https://events.sprouter.online/events/MTAvMjhALTU6MzBwbUAtfEAtc29ALXlvdUAtdGhpbmtALXlvdUAtY2FuQC1kYW5jZSFALTZmNGVjMmI4OWM4ZjcxYjhiN2UwYzl5eWVrMzUxcw==',
  tue630: process.env.SPROUTER_TUE_630_URL || 'https://events.sprouter.online/events/MTAvMjhALTY6MzBALXBtQC18QC1zb0AteW91QC10aGlua0AteW91QC1jYW5ALWRhbmNlIUAtNjY1M2NjNjZjZmNiOWRjYTEzNGJhZnl5ZWszNTZz',
  thu530: process.env.SPROUTER_THU_530_URL || 'https://events.sprouter.online/events/MTAvMzBALTU6MzBwbUAtfEAtc29ALXlvdUAtdGhpbmtALXlvdUAtY2FuQC1kYW5jZSFALTAwYzQ5NDQ2ZjBjZGI4MGExMmQ4YWV5eWVrMzU3cw==',
  thu630: process.env.SPROUTER_THU_630_URL || 'https://events.sprouter.online/events/MTAvMzBALTY6MzBwbUAtfEAtc29ALXlvdUAtdGhpbmtALXlvdUAtY2FuQC1kYW5jZSFALTE4ZjM4MWM0M2Y0ODU5YjQzZmVjMWN5eWVrMzU4cw==',
};

export function getSprouterUrl(eventKey: string): string {
  switch (eventKey) {
    case 'tue-530':
      return sprouterConfig.tue530;
    case 'tue-630':
      return sprouterConfig.tue630;
    case 'thu-530':
      return sprouterConfig.thu530;
    case 'thu-630':
      return sprouterConfig.thu630;
    default:
      throw new Error(`Unknown event key: ${eventKey}`);
  }
}
