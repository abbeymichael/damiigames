import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GlobalNavigationHandler } from "@/components/GlobalNavigationHandler";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "DAMII — 10×10 Strategy Platform",
  description:
    "Traditional strategy game played on an authentic 10x10 board with local and online multiplayer.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var origError = console.error;
                console.error = function() {
                  var msg = Array.prototype.slice.call(arguments).join(' ');
                  if (
                    msg.indexOf('vite-rsc') !== -1 ||
                    msg.indexOf('vinext') !== -1 ||
                    msg.indexOf('error loading dynamically imported module') !== -1 ||
                    msg.indexOf('Failed to fetch dynamically imported module') !== -1 ||
                    msg.indexOf('remove-duplicate-server-css') !== -1 ||
                    msg.indexOf('entry-browser') !== -1
                  ) {
                    return;
                  }
                  origError.apply(console, arguments);
                };
                window.addEventListener('error', function(e) {
                  var m = (e && e.message) ? e.message : '';
                  if (
                    m.indexOf('vite-rsc') !== -1 ||
                    m.indexOf('vinext') !== -1 ||
                    m.indexOf('error loading dynamically imported module') !== -1 ||
                    m.indexOf('Failed to fetch dynamically imported module') !== -1 ||
                    m.indexOf('remove-duplicate-server-css') !== -1 ||
                    m.indexOf('entry-browser') !== -1
                  ) {
                    e.preventDefault();
                  }
                });
                window.addEventListener('unhandledrejection', function(e) {
                  var r = e.reason;
                  var m = typeof r === 'string' ? r : (r && r.message ? r.message : '');
                  if (
                    m.indexOf('vite-rsc') !== -1 ||
                    m.indexOf('vinext') !== -1 ||
                    m.indexOf('error loading dynamically imported module') !== -1 ||
                    m.indexOf('Failed to fetch dynamically imported module') !== -1 ||
                    m.indexOf('remove-duplicate-server-css') !== -1 ||
                    m.indexOf('entry-browser') !== -1
                  ) {
                    e.preventDefault();
                  }
                });
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GlobalNavigationHandler />
        {children}
      </body>
    </html>
  );
}
