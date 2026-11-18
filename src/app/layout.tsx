import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { Fraunces, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/Toast";
import { OfflineNotice } from "@/components/pwa/OfflineNotice";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { THEME_INIT_SCRIPT } from "@/components/shell/theme";
import "./globals.css";

// Display face for headings (optical-size axis keeps it crisp at small sizes),
// a legible grotesk for body text, and a mono for code and data.
const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

const body = Instrument_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const code = JetBrains_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AceAP — learn, measure mastery, keep what you know",
    template: "%s · AceAP",
  },
  description:
    "AceAP is a mastery-based AP learning platform: one place to learn, one system to measure mastery, and one knowledge record that grows with you.",
  applicationName: "AceAP",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "AceAP",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  // Must match --canvas in globals.css (light / dark).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#121315" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Per-request CSP nonce from src/proxy.ts. Reading request headers also makes
  // every page render at request time, which a nonce-based CSP requires (a
  // prerendered page's scripts would carry no nonce and be blocked).
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${code.variable} h-full antialiased`}
    >
      <head>
        {/* Applies the saved (or OS) theme before first paint to avoid a flash. */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full bg-canvas text-ink">
        {children}
        <Toaster />
        <OfflineNotice />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
