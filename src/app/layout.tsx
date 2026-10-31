import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { fr } from "@/content/fr";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: fr.site.title,
  description: fr.site.description,
  applicationName: fr.site.name,
  keywords: ["UNOVA", "ESSECT", "Tunis", "université numérique"],
  authors: [{ name: fr.site.institution }],
  openGraph: {
    title: fr.site.title,
    description: fr.site.description,
    locale: "fr_TN",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
