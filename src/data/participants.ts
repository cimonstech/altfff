export type Participant = {
  code: string; // ISO alpha-2, matches path id
  name: string;
  exhibitors?: number; // omit until FFA confirms real counts
  sectors?: string[]; // e.g. ["Woven", "Dyes"]
};

export const participants: Participant[] = [
  { code: "GH", name: "Ghana" }, // host country, always present
  // TODO: populate from FFA's confirmed exhibitor list. Do not invent data.
];


