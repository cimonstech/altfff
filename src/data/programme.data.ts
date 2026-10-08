// data/programme.data.ts
import type { ScheduleSession, Room, Listing, Partner, Speaker, ProgrammePerson } from '@/types/programme';

export const keynoteSpeaker: Speaker = {
  id: 'afua-asare',
  name: 'Osafohene Dr. Afua Asabea Asare',
  role: 'Strategist · Export & Trade Leader · Creative',
  bio: 'Former CEO of the Ghana Export Promotion Authority, credited with 11% growth in Ghana\'s export sector. Osafohene of Tutu Akuapem.',
  initials: 'AA',
};

export const featuredQuote = {
  text: `Africa's fashion story begins with our fabrics, our craftsmanship, and our people… positioning Ghana as the home of fashion-led cultural and economic transformation.`,
  attribution: 'Mr. Rex Owusu Marfo',
  role: 'Presidential Staffer & Coordinator, Black Star Experience',
};

export const scheduleSessions: ScheduleSession[] = [
  {
    id: 'opening-ceremony',
    meta: 'MAIN STAGE · 9:00–10:30',
    title: 'Opening Ceremony',
    subtitle: 'Host: Apiorkor Seyiram Ashong',
    detail: [
      { time: '9:00', label: 'Arrival & seating', name: 'Apiorkor Ashong' },
      { time: '9:05', label: 'Welcome & opening', name: 'Makeba Boateng' },
      { time: '9:10', label: 'Kora performance', name: 'François Lawankila' },
      { time: '9:13', label: 'Solidarity message', name: 'Ghana Culture Forum' },
      { time: '9:16', label: 'Diplomatic messages', name: "Barbados, Mozambique, Angola, Côte d'Ivoire, UNESCO (TBC)" },
      { time: '9:28', label: 'Speech', name: 'Rex Owusu Marfo' },
      { time: '9:36', label: 'Ghana Tourism Authority address', name: 'Gilbert Abeiku Aggrey' },
      { time: '9:46', label: 'Sponsor remarks', name: 'Uwem Utip, DIMO' },
      { time: '9:51', label: 'Keynote address', name: 'Dr Afua Asare' },
      { time: '10:11', label: 'Launch moment / declaration', name: 'MOTAC · GTA · BSE (TBC)' },
      { time: '10:20', label: 'Closing reflections', name: 'Apiorkor Ashong' },
      { time: '10:25', label: 'Official photo / transition', name: '—' },
    ],
  },
  {
    id: 'trade-fair',
    meta: 'ALL DAY · 10:30–20:00',
    title: 'Trade Fair & Experience Zones',
    subtitle: 'Manufacturers, materials, installations and country-led displays',
    detailNote:
      'Experience Hall, The Moving Loom, Green Artist Area and exhibitor listings remain open throughout the day alongside main-stage programming.',
    detail: [],
  },
  {
    id: 'panel-one',
    meta: 'MAIN STAGE · 12:00–13:00',
    title: "Panel One — Building Africa's Material Economy",
    subtitle: 'Moderator: Apiorkor Seyiram Ashong',
    detailNote: 'What can we actually produce in Africa?',
    detail: [
      { time: '01', label: 'AfCFTA Secretariat — single African market for materials & fashion', name: 'Charlotte Tambala Kaliati' },
      { time: '02', label: 'Creative Art Agency Ghana — accessing African markets', name: 'Gideon Aryeequaye' },
      { time: '03', label: 'Raniel Frights Logistics — moving materials across borders', name: 'Jacob Seddoh' },
      { time: '04', label: 'Oakwood Green Africa (TBC) — financing the material economy', name: 'Cynthia Eryuo' },
    ],
  },
  {
    id: 'correspondent',
    meta: '13:00–13:05',
    title: 'Alt.FFF Correspondent',
    subtitle: 'Ursula Ngonadi',
    detail: [],
    detailNote: 'Workshop & Loom Room / Experience Hall highlights, and introduces François Lawankila for the second kora solo.',
  },
  {
    id: 'workshops',
    meta: 'WORKSHOP ROOM · 13:15–16:00',
    title: 'Workshop Sessions',
    subtitle: 'Scale Up · Built Africa · Identity & Markets',
    detail: [
      { time: '13:15', label: 'Scale Up — business growth & sustainable enterprises', name: 'Jessica Okwabi' },
      { time: '14:15', label: 'Built Africa — digital tools & intra-African trade', name: 'Stella Niiney Amoatey' },
      { time: '15:15', label: 'How Can Identity Create Markets — interactive workshop', name: 'Zeena L. Amini' },
    ],
  },
  {
    id: 'second-kora',
    meta: 'MAIN STAGE · 14:30–15:00',
    title: 'Second Kora Solo',
    subtitle: 'François Lawankila, Kora Soloist',
    detail: [],
    detailNote: 'A second solo on the twenty-one string kora, marking the transition from the afternoon workshops back to the Main Stage.',
  },
  {
    id: 'panel-two',
    meta: 'MAIN STAGE · 17:30–18:30',
    title: 'Panel Two — The Next Market: Alt.FFF 2027',
    subtitle: 'Moderator: Ivy Prosper',
    detailNote: 'What do we want to build together? Who is missing from the room?',
    detail: [
      { time: '01', label: 'Founder & Director, Fashion Forum Africa', name: 'Makeba Boateng' },
      { time: '02', label: 'Head of Auxiliary Arts, Ghana Culture Forum', name: 'Eyetsa Lorraine Ocloo' },
      { time: '03', label: 'CEO, TEKURA Designs; President, IDDG', name: 'Audrey Forson' },
      { time: '04', label: 'Nubuke Foundation', name: 'Nana Opoku' },
      { time: '05', label: 'CEO & Creative Director, Kokrobitey Institute', name: 'Renée C Neblett' },
    ],
  },
  {
    id: 'closing-ceremony',
    meta: 'MAIN STAGE · 19:00–19:30',
    title: 'Closing Ceremony — From Materials to Momentum',
    subtitle: 'Host: Ivy Prosper',
    detail: [
      { time: '19:00', label: 'Welcome & closing framing', name: 'Ivy Prosper' },
      { time: '19:03', label: 'One-day outcomes & reflections', name: 'Dr Afua Asabea Asare' },
      { time: '19:08', label: 'Partner recognition', name: 'Faith Senam Ocloo' },
      { time: '19:12', label: 'Key learnings from the day', name: 'George Lartey' },
      { time: '19:17', label: 'Wider perspective / road ahead', name: 'Rex Owusu Marfo' },
      { time: '19:22', label: 'Alt.FFF 2027 — visionary closing', name: 'Makeba Boateng' },
      { time: '19:27', label: 'Formal close', name: 'Ivy Prosper' },
    ],
  },
];

export const rooms: Room[] = [
  {
    id: 'workshop-room',
    tag: '24 × 16 FT',
    title: 'Workshop Room',
    description: 'Practical sessions on scaling creative businesses and intra-African trade.',
    subSessions: [
      { title: 'Scale Up', time: '13:15–14:00', facilitator: 'Jessica Okwabi, JOK Consulting' },
      { title: 'Built Africa', time: '14:15–15:00', facilitator: 'Stella Niiney Amoatey · digital tools & intra-African trade' },
      { title: 'How Can Identity Create Markets', time: '15:15–16:00', facilitator: 'Zeena L. Amini · interactive workshop' },
    ],
  },
  {
    id: 'moving-loom',
    tag: 'DARK ROOM · ALL DAY',
    title: 'The Moving Loom',
    description: "An immersive room playing looped 5–30 minute videos from supporters and enthusiasts who couldn't make it in person. Come and go as you please.",
    subSessions: [
      { title: 'A · Protecting African Creativity', facilitator: 'Dr. Benjamin Oduro Arhin Jnr (Bnoskka)' },
      { title: 'B · Africa-Local — What Is That?', facilitator: 'Zeena Amini' },
      { title: 'C · Kokrobitey Institute & Repurposing', facilitator: 'Facilitator: Esi' },
      { title: 'D · An Interview With A Living Legend', facilitator: 'Makeba Boateng, with Tetteh Adzedu' },
    ],
  },
  {
    id: 'experience-hall',
    tag: 'OPEN ALL DAY',
    title: 'Experience Hall',
    description: 'Country-led displays of materials, textiles and transformation — from raw fibres like cotton and raffia to finished forms.',
    pills: ['Raw materials', 'Textiles', 'Leather', 'Fibres', 'Innovation'],
    subSessions: [
      { title: 'Curators', facilitator: 'Sammi Laryea (Kofi Ansah Section) · Eyetsa Lorraine Ocloo (Cloth Section)' },
    ],
  },
  {
    id: 'green-artist-area',
    tag: 'IMMERSIVE INSTALLATIONS',
    title: 'The Green Artist Area',
    description: 'Led by Geez, Recycling Artist (Guadeloupe) — live installations using reclaimed and alternative materials.',
    subSessions: [
      { title: 'Water — The Source' },
      { title: 'River Banks & Galamsey' },
      { title: 'Waste As A Resource' },
    ],
  },
];

export const floorPlanZones: string[] = [
  'Experience Hall',
  'VIP Lounge',
  'Main Stage',
  'Materials Zones',
  'Sustainability Zone',
  'Furniture Zone',
  'Business & Service',
  'Photobooth',
];

// Directory listings — logo only, no contact info or website shown per client request.
// Logo files expected at /public/tradeguide/<id>.png
export const directoryListings: Listing[] = [
  { id: 'wrapped-to-go', name: 'Wrapped To Go', logoSrc: '/tradeguide/wrappedtogo.jpeg' },
  { id: 'nuava-handmade', name: 'Nuava Handmade', logoSrc: '/tradeguide/NuaVaLogo.jpeg' },
  { id: 'the-gele-center', name: 'The Gele Center', logoSrc: '/tradeguide/GeleCenter.jpeg' },
  { id: 'theephotoberry', name: 'TheePhotoBerry', logoSrc: '/tradeguide/theephotoberry.png' },
  { id: 'dakope', name: 'Dakope', logoSrc: '/tradeguide/dakope.png' },
  { id: 'versatile-agency', name: 'Versatile Agency', logoSrc: '/tradeguide/VersatileAgency.jpeg' },
  { id: 'jaywillz-studios', name: 'Jaywillz Studios', logoSrc: '/tradeguide/jaywillz.jpeg' },
];

export const partners: Partner[] = [
  { id: 'dimo', name: 'DIMO', logoSrc: '/supporters/dimo.png', tier: 'sponsor' },
  { id: 'black-star-experience', name: 'Black Star Experience', logoSrc: '/supporters/blackStarExperience.png', tier: 'partner' },
  { id: 'fashion-forum-africa', name: 'Fashion Forum Africa', logoSrc: '/supporters/fashionForumAfrica.png', tier: 'partner' },
  { id: 'mcpr-africa', name: 'MCPR Africa', logoSrc: '/supporters/MCPR-Africa.png', tier: 'partner' },
  { id: 'agi', name: 'AGI', logoSrc: '/supporters/agi.png', tier: 'supporter' },
  { id: 'ghana-tourism-authority', name: 'Ghana Tourism Authority', logoSrc: '/supporters/GTA.png', tier: 'supporter' },
  { id: 'ghana-culture-forum', name: 'Ghana Culture Forum', logoSrc: '/supporters/gcf.png', tier: 'supporter' },
  { id: 'national-commission-on-culture', name: 'National Commission on Culture', logoSrc: '/supporters/ncc.png', tier: 'supporter' },
  { id: 'itfp-ghana', name: 'ITFP-Ghana', logoSrc: '/supporters/itfpg.png', tier: 'supporter' },
  { id: 'creative-arts-agency', name: 'Creative Arts Agency', logoSrc: '/supporters/CAAG.png', tier: 'supporter' },
];

export const heroStats = [
  { num: '25+', label: 'Manufacturers' },
  { num: '54', label: 'Countries' },
  { num: '1,500+', label: 'Buyers' },
  { num: '1', label: 'Day' },
];

export const programmePeople: ProgrammePerson[] = [
  {
    id: 'afua-asare',
    name: 'Osafohene Dr. Afua Asabea Asare',
    role: 'Strategist · Export & Trade Leader · Creative',
    bio: keynoteSpeaker.bio,
    appearances: ['Opening Ceremony — Keynote address', 'Closing Ceremony — One-day outcomes & reflections'],
  },
  {
    id: 'apiorkor-ashong',
    name: 'Apiorkor Seyiram Ashong',
    role: 'Host & Moderator',
    appearances: [
      'Opening Ceremony — Host',
      'Panel One — Moderator',
      'Opening Ceremony — Closing reflections',
    ],
  },
  {
    id: 'makeba-boateng',
    name: 'Makeba Boateng',
    role: 'Founder & Director, Fashion Forum Africa',
    appearances: [
      'Opening Ceremony — Welcome & opening',
      'Panel Two — Founder perspective',
      'Closing Ceremony — Alt.FFF 2027 visionary closing',
      'The Moving Loom — Interview With A Living Legend',
    ],
  },
  {
    id: 'francois-lawankila',
    name: 'François Lawankila',
    role: 'Kora Soloist',
    appearances: ['Opening Ceremony — Kora performance', 'Main Stage — Second Kora Solo (14:30–15:00)'],
  },
  {
    id: 'rex-owusu-marfo',
    name: 'Mr. Rex Owusu Marfo',
    role: 'Presidential Staffer & Coordinator, Black Star Experience',
    appearances: ['Opening Ceremony — Speech', 'Closing Ceremony — Wider perspective / road ahead'],
  },
  {
    id: 'gilbert-abeiku-aggrey',
    name: 'Gilbert Abeiku Aggrey',
    role: 'Ghana Tourism Authority',
    appearances: ['Opening Ceremony — GTA address'],
  },
  {
    id: 'uwem-utip',
    name: 'Uwem Utip',
    role: 'DIMO',
    appearances: ['Opening Ceremony — Sponsor remarks'],
  },
  {
    id: 'charlotte-kaliati',
    name: 'Charlotte Tambala Kaliati',
    role: 'AfCFTA Secretariat',
    appearances: ['Panel One — Single African market for materials & fashion'],
  },
  {
    id: 'gideon-aryeequaye',
    name: 'Gideon Aryeequaye',
    role: 'Creative Arts Agency Ghana',
    appearances: ['Panel One — Accessing African markets'],
  },
  {
    id: 'jacob-seddoh',
    name: 'Jacob Seddoh',
    role: 'Raniel Frights Logistics',
    appearances: ['Panel One — Moving materials across borders'],
  },
  {
    id: 'cynthia-eryuo',
    name: 'Cynthia Eryuo',
    role: 'Oakwood Green Africa (TBC)',
    appearances: ['Panel One — Financing the material economy'],
  },
  {
    id: 'ursula-ngonadi',
    name: 'Ursula Ngonadi',
    role: 'Alt.FFF Correspondent',
    appearances: ['Main Stage — Alt.FFF Correspondent (13:00–13:05)'],
  },
  {
    id: 'jessica-okwabi',
    name: 'Jessica Okwabi',
    role: 'JOK Consulting',
    appearances: ['Workshop Room — Scale Up (13:15–14:00)'],
  },
  {
    id: 'stella-amoatey',
    name: 'Stella Niiney Amoatey',
    role: 'Built Africa',
    appearances: ['Workshop Room — Built Africa (14:15–15:00)'],
  },
  {
    id: 'zeena-amini',
    name: 'Zeena L. Amini',
    role: 'Identity & Markets Workshop Facilitator',
    appearances: [
      'Workshop Room — How Can Identity Create Markets (15:15–16:00)',
      'The Moving Loom — Africa-Local — What Is That?',
    ],
  },
  {
    id: 'ivy-prosper',
    name: 'Ivy Prosper',
    role: 'Host & Moderator',
    appearances: [
      'Panel Two — Moderator',
      'Closing Ceremony — Host',
      'Closing Ceremony — Welcome & closing framing',
      'Closing Ceremony — Formal close',
    ],
  },
  {
    id: 'eyetsa-ocloo',
    name: 'Eyetsa Lorraine Ocloo',
    role: 'Head of Auxiliary Arts, Ghana Culture Forum',
    appearances: ['Panel Two — Ghana Culture Forum perspective', 'Experience Hall — Cloth Section curator'],
  },
  {
    id: 'audrey-forson',
    name: 'Audrey Forson',
    role: 'CEO, TEKURA Designs; President, IDDG',
    appearances: ['Panel Two — TEKURA / IDDG perspective'],
  },
  {
    id: 'nana-opoku',
    name: 'Nana Opoku',
    role: 'Nubuke Foundation',
    appearances: ['Panel Two — Nubuke Foundation perspective'],
  },
  {
    id: 'renee-neblett',
    name: 'Renée C Neblett',
    role: 'CEO & Creative Director, Kokrobitey Institute',
    appearances: ['Panel Two — Kokrobitey Institute perspective'],
  },
  {
    id: 'faith-senam-ocloo',
    name: 'Faith Senam Ocloo',
    role: 'Fashion Forum Africa',
    appearances: ['Closing Ceremony — Partner recognition'],
  },
  {
    id: 'george-lartey',
    name: 'George Lartey',
    role: 'Alt.FFF Team',
    appearances: ['Closing Ceremony — Key learnings from the day'],
  },
  {
    id: 'sammi-laryea',
    name: 'Sammi Laryea',
    role: 'Experience Hall Curator',
    appearances: ['Experience Hall — Kofi Ansah Section'],
  },
  {
    id: 'geez',
    name: 'Geez',
    role: 'Recycling Artist (Guadeloupe)',
    appearances: ['Green Artist Area — Live installations'],
  },
  {
    id: 'benjamin-arhin',
    name: 'Dr. Benjamin Oduro Arhin Jnr',
    role: 'Bnoskka',
    appearances: ['The Moving Loom — Protecting African Creativity'],
  },
  {
    id: 'esi',
    name: 'Esi',
    role: 'Facilitator',
    appearances: ['The Moving Loom — Kokrobitey Institute & Repurposing'],
  },
  {
    id: 'tetteh-adzedu',
    name: 'Tetteh Adzedu',
    role: 'Living Legend',
    appearances: ['The Moving Loom — An Interview With A Living Legend'],
  },
  {
    id: 'ghana-culture-forum',
    name: 'Ghana Culture Forum',
    role: 'Solidarity message',
    appearances: ['Opening Ceremony — Solidarity message'],
  },
  {
    id: 'diplomatic-representatives',
    name: 'Diplomatic Representatives',
    role: 'Barbados · Mozambique · Angola · Côte d\'Ivoire · UNESCO (TBC)',
    appearances: ['Opening Ceremony — Diplomatic messages'],
  },
];
