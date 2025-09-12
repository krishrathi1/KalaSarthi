
import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster"
import { LanguageProvider } from "@/context/language-context";
import { GlobalTranslationProvider } from "@/components/global-translation-provider";
import { AuthProvider } from "@/context/auth-context";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import "./globals.css";


export const metadata: Metadata = {
  title: "KalaSarthi - Your Artisan Digital Twin",
  description: "AI-Powered Marketplace-as-a-Service to empower artisans.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KalaSarthi",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "KalaSarthi",
    title: "KalaSarthi - Your Artisan Digital Twin",
    description: "AI-Powered Marketplace-as-a-Service to empower artisans.",
  },
  icons: {
    icon: "/icon-192x192.svg",
    shortcut: "/icon-192x192.svg",
    apple: "/icon-192x192.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#E07A5F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="KalaMitra" />
        <link rel="apple-touch-icon" href="/icon-192x192.svg" />
        <link rel="icon" type="image/svg+xml" sizes="192x192" href="/icon-192x192.svg" />
        <link rel="icon" type="image/svg+xml" sizes="512x512" href="/icon-512x512.svg" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <LanguageProvider>
            <GlobalTranslationProvider />
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </LanguageProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
