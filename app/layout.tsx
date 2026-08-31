import "@/lib/react-shim";
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
                var isTransientModuleError = function(str) {
                  if (!str || typeof str !== 'string') return false;
                  return (
                    str.indexOf('vite-rsc') !== -1 ||
                    str.indexOf('vinext') !== -1 ||
                    str.indexOf('entry-browser') !== -1 ||
                    str.indexOf('remove-duplicate-server-css') !== -1 ||
                    str.indexOf('virtual:vite-rsc') !== -1 ||
                    str.indexOf('virtual:vinext') !== -1 ||
                    str.indexOf('__x00__virtual') !== -1 ||
                    str.indexOf('error loading dynamically imported module') !== -1 ||
                    str.indexOf('Failed to fetch dynamically imported module') !== -1 ||
                    str.indexOf('dynamically imported module') !== -1 ||
                    str.indexOf('NetworkError when attempting to fetch resource') !== -1
                  );
                };

                var origError = console.error;
                console.error = function() {
                  var msg = Array.prototype.slice.call(arguments).join(' ');
                  if (isTransientModuleError(msg)) {
                    return;
                  }
                  origError.apply(console, arguments);
                };

                var origWarn = console.warn;
                console.warn = function() {
                  var msg = Array.prototype.slice.call(arguments).join(' ');
                  if (isTransientModuleError(msg)) {
                    return;
                  }
                  origWarn.apply(console, arguments);
                };

                var handleChunkLoadFailure = function(msg) {
                  if (typeof window === 'undefined') return;
                  var isChunkError = (
                    msg.indexOf('error loading dynamically imported module') !== -1 ||
                    msg.indexOf('Failed to fetch dynamically imported module') !== -1 ||
                    msg.indexOf('Loading chunk') !== -1 ||
                    msg.indexOf('/assets/') !== -1
                  );
                  if (isChunkError) {
                    var lastReload = Number(sessionStorage.getItem('damii_last_chunk_reload') || 0);
                    var now = Date.now();
                    if (now - lastReload > 8000) {
                      sessionStorage.setItem('damii_last_chunk_reload', String(now));
                      window.location.reload();
                    }
                  }
                };

                window.addEventListener('error', function(e) {
                  var m = (e && e.message) ? e.message : (e && e.error && e.error.message ? e.error.message : '');
                  handleChunkLoadFailure(m);
                  if (isTransientModuleError(m) || isTransientModuleError(String(e && e.filename))) {
                    if (e.preventDefault) e.preventDefault();
                    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                    if (e.stopPropagation) e.stopPropagation();
                    return true;
                  }
                }, true);

                window.addEventListener('unhandledrejection', function(e) {
                  var r = e.reason;
                  var m = typeof r === 'string' ? r : (r && r.message ? r.message : String(r));
                  handleChunkLoadFailure(m);
                  if (isTransientModuleError(m)) {
                    if (e.preventDefault) e.preventDefault();
                    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                    if (e.stopPropagation) e.stopPropagation();
                    return true;
                  }
                }, true);

                var prevOnError = window.onerror;
                window.onerror = function(message, source, lineno, colno, error) {
                  var m = String(message || '') + ' ' + String(source || '') + ' ' + (error ? String(error.message || '') : '');
                  if (isTransientModuleError(m)) {
                    return true;
                  }
                  if (prevOnError) return prevOnError.apply(this, arguments);
                };

                var prevOnUnhandled = window.onunhandledrejection;
                window.onunhandledrejection = function(e) {
                  var r = e ? e.reason : '';
                  var m = typeof r === 'string' ? r : (r && r.message ? r.message : String(r));
                  if (isTransientModuleError(m)) {
                    return true;
                  }
                  if (prevOnUnhandled) return prevOnUnhandled.apply(this, arguments);
                };
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
