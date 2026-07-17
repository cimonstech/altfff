export type TextileProfile = {
  code: string;
  country: string;
  headline: string; // short, e.g. "Kente & the double-heddle loom"
  materials: string[]; // e.g. ["Kente", "Cotton smock (fugu)"]
  description: string; // 2-3 sentences, factual, no invented statistics
};

export const textileProfiles: TextileProfile[] = [
  {
    code: "GH",
    country: "Ghana",
    headline: "Kente & the cotton smock",
    materials: ["Kente", "Fugu (cotton smock)"],
    description:
      "Ghana's Asante and Ewe weavers produce kente on double-heddle looms, while the Dagomba of the north weave cotton into the traditional fugu smock. The industry is seeing a modern revival, with new investment in recycled-fibre spinning.",
  },
  {
    code: "NG",
    country: "Nigeria",
    headline: "Adire, Aso Oke & wild silk",
    materials: ["Adire (indigo resist-dye)", "Aso Oke", "Wild silk embroidery"],
    description:
      "Nigeria's Yoruba weavers work narrow-strip Aso Oke cloth on single-heddle looms, alongside the indigo-dyed Adire tradition and wild silk embroidery. Nigeria is Africa's largest textile market by consumption and its fastest-growing major producer.",
  },
  {
    code: "ET",
    country: "Ethiopia",
    headline: "Cotton, leather & Amhara embroidery",
    materials: ["Handwoven cotton", "Leather", "Amhara embroidery (tilf)"],
    description:
      "Ethiopia pairs a deep handweaving tradition, including Amhara cotton embroidery, with one of the continent's fastest-growing industrial textile sectors. Hawassa Industrial Park anchors export-driven manufacturing powered by near-zero-cost hydropower.",
  },
  {
    code: "KE",
    country: "Kenya",
    headline: "Leather, beadwork & garment manufacturing",
    materials: ["Leather", "Maasai beadwork", "Cotton garments"],
    description:
      "Kenya's Maasai beading tradition on leather dates back generations, alongside a modern garment-export industry. Kenya is the largest single beneficiary of AGOA's apparel provisions among African nations.",
  },
];


