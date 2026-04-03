import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LexMalta — Il-Liġi Maltija Miftuħa għal Kulħadd",
  description: "Free Maltese legal intelligence. 77,000+ judgments, 500+ law chapters, lawyer profiles, document drafting. B'xejn għal dejjem. Powered by Rark Musso.",
  keywords: "Malta law, Maltese law, legal research Malta, avukati Malta, liġi Malta",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mt">
      <body className="antialiased">{children}</body>
    </html>
  );
}
