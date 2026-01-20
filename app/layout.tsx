/**
 * 루트 레이아웃
 *
 * 앱의 최상위 레이아웃으로 다음을 제공합니다:
 * - HTML 메타데이터
 * - 글로벌 스타일
 * - AuthProvider (인증 상태)
 * - 폰트 설정
 */

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import "./globals.css";

// =====================================================
// 폰트 설정
// =====================================================

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// =====================================================
// 메타데이터
// =====================================================

export const metadata: Metadata = {
  title: {
    default: "가족 가계부",
    template: "%s | 가족 가계부",
  },
  description: "가족과 함께 사용하는 스마트한 가계부 앱",
  keywords: ["가계부", "가족", "예산", "지출관리", "수입", "재정"],
  authors: [{ name: "Family Budget Team" }],
  creator: "Family Budget Team",
  publisher: "Family Budget Team",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "가족 가계부",
    title: "가족 가계부",
    description: "가족과 함께 사용하는 스마트한 가계부 앱",
  },
  twitter: {
    card: "summary_large_image",
    title: "가족 가계부",
    description: "가족과 함께 사용하는 스마트한 가계부 앱",
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "가계부",
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
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#207080" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

// =====================================================
// 레이아웃 컴포넌트
// =====================================================

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="가계부" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="가계부" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#207080" />
        <meta name="msapplication-tap-highlight" content="no" />

        {/* Apple Splash Screens */}
        <link
          rel="apple-touch-startup-image"
          href="/icons/apple-splash-2048-2732.png"
          media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/icons/apple-splash-1170-2532.png"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/icons/apple-splash-1125-2436.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)"
        />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>

        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('[PWA] Service Worker registered:', registration.scope);
                    })
                    .catch(function(error) {
                      console.log('[PWA] Service Worker registration failed:', error);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
