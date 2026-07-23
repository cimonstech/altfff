import type { Metadata } from "next";
import { Bricolage_Grotesque, Archivo } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import { SiteModalsProvider } from "@/components/SiteModals";
import BackToTop from "@/components/BackToTop";
import { GlobalStructuredData } from "@/components/structured-data";
import { SITE } from "@/lib/constants";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

const body = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  // Lets relative OG/Twitter image paths (e.g. SITE.ogImage) resolve to
  // absolute URLs - without this Next.js falls back to localhost, which
  // breaks social-share previews in production.
  metadataBase: new URL(SITE.url),
  title: "Alt.FFF: A Fabric Spree of African Descent",
  description:
    "Ghana's first alternative fashion fabric fair. Three days of fibres, dyes, weaves and the people behind them. The Palms Convention Centre, La Palm Royal Beach Hotel, Accra Ghana, September 17 to 19, 2026.",
  icons: {
    icon: "/Afff_icon.png",
    shortcut: "/Afff_icon.png",
    apple: "/Afff_icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} antialiased`}>
      <body className="bg-paper font-body text-ink" suppressHydrationWarning>
        <GlobalStructuredData />
        <SmoothScroll>
          <SiteModalsProvider>{children}</SiteModalsProvider>
        </SmoothScroll>
        <BackToTop />
      </body>
    </html>
  );
}


