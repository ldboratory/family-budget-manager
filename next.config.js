/**
 * Next.js 설정 파일
 * - 이미지 최적화 및 외부 도메인 설정
 * - 실험적 기능 및 성능 최적화 옵션
 * - Capacitor iOS 앱 빌드를 위한 static export 설정
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* React Strict Mode 활성화 (개발 시 잠재적 문제 감지) */
  reactStrictMode: true,

  /* Static Export 설정 (Capacitor iOS 빌드용) */
  output: "export",

  /* 이미지 최적화 설정 */
  images: {
    /* Static export 시 unoptimized 필수 */
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/**",
      },
    ],
  },

  /* 환경변수 노출 설정 (클라이언트에서 접근 가능) */
  env: {
    NEXT_PUBLIC_APP_NAME: "Family Budget Manager",
  },

  /* Trailing Slash 설정 (Capacitor 호환성) */
  trailingSlash: true,
};

module.exports = nextConfig;
