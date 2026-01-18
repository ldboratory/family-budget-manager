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
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
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
      <body
        className={`${inter.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
