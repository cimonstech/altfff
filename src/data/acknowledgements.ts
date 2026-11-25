export type AcknowledgementLink = {
  label: string;
  href: string;
};

export type Acknowledgement = {
  id: string;
  name: string;
  logoSrc?: string;
  phone?: string;
  emails?: string[];
  links?: AcknowledgementLink[];
};

/** Organisations previously listed under Acknowledgements in the trade show guide. */
export const acknowledgements: Acknowledgement[] = [
  {
    id: "iamadinkra",
    name: "IamAdinkra",
    phone: "026 234 6572",
    logoSrc: "/acknowledgement/iamadinkra.jpg",
  },
  {
    id: "motivo-limited",
    name: "Motivo Limited",
    phone: "055 301 8172",
    logoSrc: "/acknowledgement/motivoLimited.jpg",
    links: [{ label: "thisismotivo.com", href: "https://thisismotivo.com" }],
  },
  {
    id: "mhaxillian-concepts",
    name: "Mhaxillian Koncepts",
    phone: "024 443 7799",
    logoSrc: "/acknowledgement/mhaxillianKoncepts.jpg",
    links: [{ label: "mhaxilliankoncepts.com", href: "https://mhaxilliankoncepts.com" }],
  },
  {
    id: "theephotoberry",
    name: "TheePhotoBerry",
    phone: "024 297 3264",
  },
  {
    id: "dakope",
    name: "Dakope",
    logoSrc: "/acknowledgement/dakope.jpg",
    phone: "024 984 7828",
    emails: ["mensahmatilda89@gmail.com"],
  },
  {
    id: "versatile-agency",
    name: "Versatile Agency",
    logoSrc: "/acknowledgement/VersatileAgency.jpeg",
  },
  {
    id: "jaywillz-studios",
    name: "Jaywillz Studios",
    logoSrc: "/acknowledgement/jaywillz.jpg",
    phone: "026 128 2207",
    emails: ["godsonsajay@gmail.com"],
  },
  {
    id: "nueva-comms",
    name: "Nueva Comms",
    logoSrc: "/acknowledgement/nueva.png",
    phone: "055 575 7881",
    emails: ["info@nuevacomms.com"],
  },
];
