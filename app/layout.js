import { Cinzel, Cinzel_Decorative, Cormorant_Garamond } from "next/font/google";
import { siteConfig } from "@/config/site";
import "./globals.css";

const display = Cinzel_Decorative({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-display",
  display: "swap",
});

const heading = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-heading",
  display: "swap",
});

const body = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-body",
  display: "swap",
});

export const metadata = {
  title: siteConfig.metaTitle,
  description: siteConfig.metaDescription,
  // Explicit share-preview tags so WhatsApp / Instagram / others show exactly this text
  openGraph: {
    title: siteConfig.metaTitle,
    description: siteConfig.metaDescription,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: siteConfig.metaTitle,
    description: siteConfig.metaDescription,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#03050c",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${heading.variable} ${body.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
