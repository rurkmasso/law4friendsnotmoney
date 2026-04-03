import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ligi4Friends — Il-Liġi Maltija Miftuħa għal Kulħadd",
  description: "Free Maltese legal intelligence. 77,000+ judgments, 500+ law chapters, lawyer profiles, document drafting. B'xejn għal dejjem. Powered by Rark Musso.",
  keywords: "Malta law, Maltese law, legal research Malta, avukati Malta, liġi Malta",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mt" className={`${inter.variable} ${playfair.variable}`}>
      <body className="antialiased font-inter">{children}</body>
    </html>
  );
}
