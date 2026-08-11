import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Sao Chingcha (self-hosted, declared in globals.css) is the site's face.
// IBM Plex Sans Thai stays as its fallback: non-looped, which is the hard
// requirement for any Thai-facing surface here — looped faces read as
// learner material to a Thai reader. Inter is banned workspace-wide.
const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Coordinates, gazette volumes, block numbers.
const mono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bkk.nonarkara.org"),
  title: {
    default: "BKKx — Bangkok's heritage, monument by monument",
    template: "%s · BKKx",
  },
  description:
    "Every registered ancient monument in Bangkok, mapped from the Fine Arts Department register — and the Minecraft worlds that let you walk them.",
  alternates: { canonical: "/" },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "BKKx",
    title: "BKKx — Bangkok, block by block",
    description:
      "Walk through Bangkok as an open, playable Minecraft city atlas.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BKKx — Bangkok, block by block",
    description:
      "Walk through Bangkok as an open, playable Minecraft city atlas.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#f4f2ec",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The font variables go on <html>, not <body>. globals.css declares
    // --font-body/--font-display on :root, and a custom property is
    // substituted using the element it is declared on — so a --font-* living
    // one level down on <body> is invisible to it, the whole chain computes
    // to nothing, and everything silently falls back to system-ui.
    <html lang="en" className={`${plexThai.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
