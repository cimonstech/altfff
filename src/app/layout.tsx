import type { Metadata } from "next";
import { Bricolage_Grotesque, Archivo } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import { SiteModalsProvider } from "@/components/SiteModals";
import BackToTop from "@/components/BackToTop";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import LinkedInInsightTag from "@/components/LinkedInInsightTag";
import { GlobalStructuredData } from "@/components/structured-data";
import { SITE, EVENT } from "@/lib/constants";

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
    `Ghana's first alternative fashion fabric fair. A day of fibres, dyes, weaves and the people behind them. ${EVENT.venue}, ${EVENT.dates}.`,
  icons: {
    icon: "/Afff_icon.png",
    shortcut: "/Afff_icon.png",
    apple: "/Afff_icon.png",
  },
  verification: {
    google: "dK-K_XB105dqbA37KAuODw66pE1n1lB6m5OMnC6CzJc",
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
        <GoogleAnalytics />
        <GlobalStructuredData />
        <SmoothScroll>
          <SiteModalsProvider>{children}</SiteModalsProvider>
        </SmoothScroll>
        <BackToTop />
        <LinkedInInsightTag />
      </body>
    </html>
  );
}


