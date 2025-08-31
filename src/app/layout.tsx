
import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster"
import { LanguageProvider } from "@/context/language-context";
import { GlobalTranslationProvider } from "@/components/global-translation-provider";
import { AuthProvider } from "@/context/auth-context";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import "./globals.css";


export const metadata: Metadata = {
  title: "KalaMitra - Your Artisan Digital Twin",
  description: "AI-Powered Marketplace-as-a-Service to empower artisans.",
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
