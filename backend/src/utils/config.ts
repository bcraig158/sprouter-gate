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
  tue530: process.env.SPROUTER_TUE_530_URL || 'https://events.sprouter.online/events/MTAvMjhALTU6MzBwbUAtfEAtc29ALXlvdUAtdGhpbmtALXlvdUAtY2FuQC1kYW5jZSFALTYxNzc3NjNjNzFlNGM5ZDI5MTliYTZ5eWVrMzcwcw==',
  tue630: process.env.SPROUTER_TUE_630_URL || 'https://events.sprouter.online/events/MTAvMjhALTY6MzBwbUAtfEAtc29ALXlvdUAtdGhpbmtALXlvdUAtY2FuQC1kYW5jZSFALWJmMjE4YjRlY2YzYTM2NzczNTYxMjV5eWVrMzcxcw==',
  thu530: process.env.SPROUTER_THU_530_URL || 'https://events.sprouter.online/events/MTAvMzBALTU6MzBwbUAtfEAtc29ALXlvdUAtdGhpbmtALXlvdUAtY2FuQC1kYW5jZSFALTI0ZTQ1NDkxYTg4MjQ2NWU0MjhjZjl5eWVrMzcycw==',
  thu630: process.env.SPROUTER_THU_630_URL || 'https://events.sprouter.online/events/MTAvMzBALTY6MzBwbUAtfEAtc29ALXlvdUAtdGhpbmtALXlvdUAtY2FuQC1kYW5jZSFALWFjODE2ZGUxNDczN2QyNmEyYTRhMGV5eWVrMzczcw==',
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
