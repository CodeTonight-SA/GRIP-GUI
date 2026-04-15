/**
 * §13.3 spike call site — workspace ID observable in the renderer.
 *
 * WORKSPACE_ID is resolved from process.argv at module import time in
 * src/lib/workspace-context.ts. That module is Electron-renderer-only
 * (process.argv is populated by additionalArguments, not available in
 * Next.js RSC). The correct import point in the App Router is a Client
 * Component, NOT this Server Component.
 *
 * For the spike, we surface the value as a data attribute on <html> so it
 * is observable in DevTools without runtime overhead. In production the
 * WorkspaceProvider Client Component (introduced in W8a-ui) will import
 * WORKSPACE_ID and pass it through React context.
 *
 * AMENDMENT to §13.3: add a note that workspace-context.ts MUST be
 * imported only from Client Components or Electron preload — never from
 * RSC. See SPIKE-FINDINGS.md §13.3 amendment.
 */
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Syne, Instrument_Sans, Geist_Mono } from "next/font/google";
import ClientLayout from "@/components/ClientLayout";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "GRIP | Knowledge Work Engine",
  description: "Cross-domain knowledge work engine with mechanical safety, recursive self-improvement, and adaptive intelligence",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GRIP",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0891b2",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${syne.variable} ${instrumentSans.variable} ${geistMono.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
