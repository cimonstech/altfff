import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Advertisement | Alt.FFF",
  description: "Brand listings with a name and phone number.",
  path: "/advertisement",
});

const BRANDS = [
  { name: "IamAdinkra", phone: "026 234 6572", tel: "+233262346572" },
  { name: "Motivo Limited", phone: "055 301 8172", tel: "+233553018172" },
  { name: "Mhaxillian Concepts", phone: "024 443 7799", tel: "+233244437799" },
];

export default function AdvertisementPage() {
  return (
    <>
      <Nav />
      <main className="bg-paper px-6 pb-20 pt-32 md:px-16 md:pb-28 md:pt-40">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-display text-[clamp(2.2rem,6vw,4rem)] font-extrabold uppercase leading-[1.02] tracking-tight text-ink">
            Advertisement
          </h1>
          <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-ink/80 md:text-lg">
            Brands listed with a name and a phone number.
          </p>
          <ul className="mt-12 grid list-none grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {BRANDS.map((brand) => (
              <li key={brand.name} className="min-w-0">
                <article className="flex h-full flex-col rounded-xl border border-hairline bg-surface p-5">
                  <h2 className="font-display text-xl font-extrabold uppercase leading-tight tracking-tight text-ink">
                    {brand.name}
                  </h2>
                  <a
                    href={`tel:${brand.tel}`}
                    className="mt-4 inline-flex min-h-11 items-center text-base font-semibold text-gold-deep hover:opacity-75"
                  >
                    {brand.phone}
                  </a>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Footer />
    </>
  );
}
