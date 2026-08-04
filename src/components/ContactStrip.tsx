import { Mail, Phone, AtSign } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Tile = {
  icon: LucideIcon;
  circleClass: string;
  iconClass: string;
  label: string;
  links: { text: string; href: string }[];
};

const TILES: Tile[] = [
  {
    icon: Mail,
    circleClass: "bg-gold",
    iconClass: "text-ink",
    label: "Direct Enquiries Email",
    links: [{ text: "enquiries@altfff.com", href: "mailto:enquiries@altfff.com" }],
  },
  {
    icon: Phone,
    circleClass: "bg-forest",
    iconClass: "text-paper",
    label: "Customer Support Line",
    links: [{ text: "+233 54 117 7573", href: "tel:+233541177573" }],
  },
  {
    icon: AtSign,
    circleClass: "bg-ink",
    iconClass: "text-paper",
    label: "Follow Us On",
    links: [
      { text: "Instagram @fashionforumafrica", href: "https://www.instagram.com/fashionforumafrica" },
      { text: "Facebook · Alt.FFF", href: "https://www.facebook.com/share/1D3VYeEFrR/" },
      { text: "LinkedIn · Fashion Forum Africa", href: "https://www.linkedin.com/company/fashionforumafrica" },
    ],
  },
];

export default function ContactStrip() {
  return (
    <section aria-label="Direct contact" className="bg-paper px-6 py-16 md:px-16">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
        {TILES.map((t) => (
          <div key={t.label} className="flex flex-col items-start gap-3 rounded-xl border border-hairline bg-surface p-5">
            <span className={`flex h-10 w-10 items-center justify-center rounded-full ${t.circleClass}`}>
              <t.icon className={t.iconClass} size={18} aria-hidden="true" />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-forest">{t.label}</p>
            <div className="flex flex-col gap-1">
              {t.links.map((l) => (
                <a key={l.text} href={l.href} className="text-sm font-semibold text-gold-deep hover:opacity-75">
                  {l.text}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}


