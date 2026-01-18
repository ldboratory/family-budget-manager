/**
 * Next.js Middleware
 *
 * 클라이언트 사이드에서 Firebase Auth를 사용하므로,
 * 서버 사이드 미들웨어에서는 쿠키 기반의 세션 체크가 어렵습니다.
 *
 * 이 미들웨어는 보호된 라우트에 대한 기본적인 리다이렉트만 설정하고,
 * 실제 인증 체크는 클라이언트 컴포넌트에서 처리합니다.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 보호된 경로 (인증 필요)
 */
const PROTECTED_ROUTES = [
  "/dashboard",
  "/transactions",
  "/budget",
  "/assets",
  "/settings",
  "/household",
];

/**
 * 인증 페이지 (로그인 후 접근 불필요)
 */
const AUTH_ROUTES = [
  "/auth/login",
  "/auth/signup",
  "/auth/reset-password",
];

/**
 * 인증 상태를 쿠키에서 확인
 *
 * Firebase Auth는 기본적으로 IndexedDB에 토큰을 저장하므로,
 * 서버 사이드에서 직접 확인하기 어렵습니다.
 *
 * 아래 방법 중 하나를 선택하여 구현할 수 있습니다:
 * 1. Firebase Admin SDK를 사용하여 세션 쿠키 검증
 * 2. 클라이언트에서 인증 후 커스텀 쿠키 설정
 * 3. 클라이언트 사이드에서만 인증 체크 (현재 구현)
 *
 * 이 프로젝트에서는 클라이언트 사이드 인증 체크를 사용합니다.
 * 미들웨어는 기본적인 라우팅 로직만 처리합니다.
 */
function isAuthenticated(request: NextRequest): boolean {
  // 클라이언트가 설정한 인증 쿠키 확인 (옵션)
  // 현재는 구현하지 않음 - 클라이언트 사이드에서 처리
  const authCookie = request.cookies.get("__session");
  return !!authCookie?.value;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 정적 파일 및 API 라우트 스킵
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") // 파일 확장자가 있는 경우
  ) {
    return NextResponse.next();
  }

  // 현재는 서버 사이드 인증 체크를 하지 않으므로
  // 모든 요청을 통과시킵니다.
  // 실제 인증 체크는 AuthGuard 컴포넌트에서 수행됩니다.

  // 보호된 라우트 체크 (서버 사이드 인증이 구현된 경우)
  /*
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname.startsWith(route)
  );

  if (isProtectedRoute && !isAuthenticated(request)) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 인증 페이지 체크 (이미 로그인된 경우)
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname.startsWith(route)
  );

  if (isAuthRoute && isAuthenticated(request)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  */

  return NextResponse.next();
}

/**
 * 미들웨어가 적용될 경로 설정
 */
export const config = {
  matcher: [
    /*
     * 다음 경로를 제외한 모든 요청에 미들웨어 적용:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico (파비콘)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
