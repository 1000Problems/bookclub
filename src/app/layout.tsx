import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Newsreader, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const serif = Newsreader({ variable: "--font-serif", subsets: ["latin"], style: ["normal", "italic"] });
const sans = Plus_Jakarta_Sans({ variable: "--font-sans", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = { title: "Soul Crushers" };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}><body>{children}</body></html>;
}
