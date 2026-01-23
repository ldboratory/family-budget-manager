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
