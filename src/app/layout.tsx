import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Press_Start_2P } from "next/font/google";
import { NextAuthProvider } from "@/components/NextAuthProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pressStart2P = Press_Start_2P({
  variable: "--font-press-start",
  subsets: ["latin"],
  weight: "400",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "RetroMan",
  description: "Your personal physical media collection manager",
  // Defining `icons` at all suppresses the App Router's apple-icon file
  // convention, so the home-screen icon has to be named explicitly here.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/icon.png",    sizes: "64x64",  type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    title: "RetroMan",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      suppressHydrationWarning
      data-theme="retro80s"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${pressStart2P.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextAuthProvider>{children}</NextAuthProvider>
      </body>
    </html>
  );
}
