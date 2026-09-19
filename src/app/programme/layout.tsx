import type { Metadata } from "next";
import { Lora, Poppins } from "next/font/google";
import { buildMetadata } from "@/lib/metadata";
import { EVENT } from "@/lib/constants";

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-lora",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Programme - Alt.FFF",
    description: `Event programme, schedule, rooms and directory for ${EVENT.name}, ${EVENT.dates}.`,
    path: "/programme",
  }),
  robots: { index: false, follow: false },
};

export default function ProgrammeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${lora.variable} ${poppins.variable} min-h-dvh bg-[#0D220A] text-[#F3ECE0] [color-scheme:dark]`}
      data-programme-route=""
    >
      {children}
    </div>
  );
}
