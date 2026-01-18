/**
 * OAuth 콜백 페이지
 *
 * Google 등 OAuth 로그인 후 리다이렉트되는 페이지입니다.
 * 인증 완료 후 적절한 페이지로 리다이렉트합니다.
 */

"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthProvider";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading, error } = useAuthContext();

  // URL 파라미터에서 리다이렉트 경로 가져오기
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";

  useEffect(() => {
    if (loading) return;

    if (error) {
      // 에러 발생 시 로그인 페이지로 리다이렉트
      router.push(`/auth/login?error=${encodeURIComponent(error.message)}`);
      return;
    }

    if (isAuthenticated) {
      // 인증 성공 시 대상 페이지로 리다이렉트
      router.push(redirectTo);
    } else {
      // 인증되지 않은 경우 로그인 페이지로
      router.push("/auth/login");
    }
  }, [isAuthenticated, loading, error, router, redirectTo]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">로그인 처리 중...</p>
      </div>
    </main>
  );
}
