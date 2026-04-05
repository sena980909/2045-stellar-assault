import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "2045 - STELLAR ASSAULT",
  description: "A futuristic top-down shooting game set in 2045. Defend humanity against the Nexus threat.",
  keywords: ["game", "shooting", "2045", "arcade", "space"],
  openGraph: {
    title: "2045 - STELLAR ASSAULT",
    description: "A futuristic top-down shooting game. Defend humanity against the Nexus threat.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-black text-white font-mono overflow-hidden">
        {children}
      </body>
    </html>
  );
}
