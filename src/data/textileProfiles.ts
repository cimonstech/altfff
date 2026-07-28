export type TextileProfile = {
  code: string;
  country: string;
  headline: string;
  materials: string[];
  description: string;
};

export const textileProfiles: TextileProfile[] = [
  {
    code: "GH",
    country: "Ghana",
    headline: "KENTE & FUGU",
    materials: ["Kente", "Fugu"],
    description:
      "Ghana is renowned for its rich weaving traditions, most notably Kente, handwoven by the Asante and Ewe using narrow-strip looms with cotton, silk or rayon threads. Equally significant is Fugu, a handwoven cotton textile from Northern Ghana, recognised for its durable construction and long-standing association with royalty, ceremonial dress and cultural identity. Together, these textiles reflect Ghana's enduring craftsmanship and growing contribution to Africa's textile and fashion industry.",
  },
  {
    code: "NG",
    country: "Nigeria",
    headline: "ADIRE, ASO OKE & WILD SILK",
    materials: ["Adire", "Aso Oke", "Wild silk"],
    description:
      "Nigeria's textile heritage is defined by iconic fabrics such as Adire, the indigo-dyed resist cloth of the Yoruba, and Aso Oke, a prestigious handwoven fabric worn for ceremonies and special occasions. Historically, locally produced wild silk also played an important role in creating high-value traditional textiles. Today, Nigeria is one of Africa's largest fashion and textile markets, with a growing ecosystem of textile production, garment manufacturing and creative enterprise.",
  },
  {
    code: "ET",
    country: "Ethiopia",
    headline: "SKINS, HIDES & COTTON",
    materials: ["Leather", "Hides", "Cotton"],
    description:
      "Ethiopia has a long tradition of producing high-quality leather and handwoven cotton textiles. Supported by one of Africa's largest livestock populations and a growing manufacturing sector, the country has become an important hub for leather goods, apparel production and textile exports.",
  },
  {
    code: "MG",
    country: "Madagascar",
    headline: "RAFFIA",
    materials: ["Raffia"],
    description:
      "Madagascar is home to some of the world's finest natural raffia, harvested from the raffia palm and traditionally woven into textiles, baskets and accessories. Valued for its strength and versatility, raffia continues to inspire contemporary fashion, interiors and sustainable product design, making it one of Africa's most distinctive natural fibres.",
  },
  {
    code: "KE",
    country: "Kenya",
    headline: "KIKOY & PINEAPPLE LEAF FIBRE",
    materials: ["Kikoy", "Pineapple leaf fibre (PALF)"],
    description:
      "Kenya is known for the vibrant Kikoy, a handwoven cotton fabric originating from the East African coast and widely recognised for its colourful striped patterns and versatility. Alongside this rich textile heritage, Kenya is emerging as a leader in sustainable innovation through Pineapple Leaf Fibre (PALF), transforming agricultural waste into natural fibres for textiles, fashion and product design. Together, they reflect Kenya's blend of traditional craftsmanship and forward-looking material innovation.",
  },
  {
    code: "ZA",
    country: "South Africa",
    headline: "MOHAIR & SHWESHWE",
    materials: ["Mohair", "Shweshwe"],
    description:
      "South Africa is globally recognised as one of the world's leading producers of mohair, a premium natural fibre sourced from Angora goats and prized for its softness, durability and luxurious finish. The country is also home to Shweshwe, an iconic printed cotton fabric celebrated for its intricate geometric patterns and deep cultural significance. Together, these materials showcase South Africa's strength in both world-class fibre production and distinctive textile heritage.",
  },
];
