// types/programme.ts

export interface ScheduleItem {
  time: string;
  label: string;
  name: string;
}

export interface ScheduleSession {
  id: string;
  meta: string;       // e.g. "MAIN STAGE · 9:00–10:30"
  title: string;
  subtitle: string;   // host / moderator / short line shown collapsed
  detail?: ScheduleItem[];
  detailNote?: string; // free-text note shown above the detail rows
}

export interface SubSession {
  title: string;
  time?: string;
  facilitator?: string;
}

export interface Room {
  id: string;
  tag: string;        // e.g. "24 × 16 FT" or "ALL DAY"
  title: string;
  description: string;
  pills?: string[];
  subSessions?: SubSession[];
}

export interface Listing {
  id: string;
  name: string;
  logoSrc: string;     // e.g. "/tradeguide/wrapped-to-go.png"
}

export interface Partner {
  id: string;
  name: string;
  logoSrc: string;      // e.g. "/tradeguide/partners/dimo.png"
  tier: 'sponsor' | 'partner' | 'supporter';
}

export interface Speaker {
  id: string;
  name: string;
  role: string;
  bio: string;
  initials: string; // fallback if no photo
  photoSrc?: string;
}

/** Named person appearing across the programme — hosts, speakers, facilitators, curators. */
export interface ProgrammePerson {
  id: string;
  name: string;
  role: string;
  appearances: string[];
  bio?: string;
}
