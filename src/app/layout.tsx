import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: 'Practice Packs — AI Workbook Generator for K-12 Teachers',
    template: '%s | Practice Packs',
  },
  description:
    '90 seconds from topic to printable Student Copy + Teacher Copy with Answer Key and Rubric. Designed for US K-12 teachers. Generate worksheets for math, ELA, science, social studies.',
  keywords: ['worksheet generator', 'printable worksheets', 'teacher tools', 'K-12', 'practice packs', 'AI worksheet', 'workbook generator', 'teaching resources', 'Common Core', 'student copy', 'answer key', 'rubric'],
  authors: [{ name: 'Practice Packs' }],
  creator: 'Practice Packs',
  publisher: 'Practice Packs',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Practice Packs',
    title: 'Practice Packs — AI Workbook Generator for K-12 Teachers',
    description: 'Turn any topic into a printable Student Copy + Teacher Copy with Answer Key and Rubric in 90 seconds.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Practice Packs — AI Workbook Generator',
    description: 'Turn any topic into a printable Student Copy + Teacher Copy in 90 seconds.',
  },
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.ico' },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4f46e5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Practice Packs" />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>
          <TooltipProvider>{children}</TooltipProvider>
        </Providers>
        <Toaster />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
