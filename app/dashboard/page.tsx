/**
 * 대시보드 페이지
 *
 * 로그인한 사용자의 메인 페이지입니다.
 * 인증되지 않은 사용자는 로그인 페이지로 리다이렉트됩니다.
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  LogOut,
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
} from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthProvider";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, signOut } = useAuthContext();

  // 비인증 사용자 리다이렉트
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/auth/login?redirect=/dashboard");
    }
  }, [isAuthenticated, loading, router]);

  // 로그아웃 핸들러
  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">가족 가계부</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user.displayName}님
            </span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* 환영 메시지 */}
        <section className="mb-8">
          <h1 className="text-2xl font-bold">
            안녕하세요, {user.displayName}님!
          </h1>
          <p className="mt-1 text-muted-foreground">
            오늘도 현명한 소비 습관을 만들어가세요.
          </p>
        </section>

        {/* 요약 카드 */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* 이번 달 수입 */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                이번 달 수입
              </span>
            </div>
            <p className="mt-4 text-2xl font-bold">
              ₩0
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              아직 수입 내역이 없습니다
            </p>
          </div>

          {/* 이번 달 지출 */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                이번 달 지출
              </span>
            </div>
            <p className="mt-4 text-2xl font-bold">
              ₩0
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              아직 지출 내역이 없습니다
            </p>
          </div>

          {/* 잔액 */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Wallet className="h-5 w-5 text-blue-500" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                이번 달 잔액
              </span>
            </div>
            <p className="mt-4 text-2xl font-bold">
              ₩0
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              수입 - 지출
            </p>
          </div>

          {/* 예산 사용률 */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <PiggyBank className="h-5 w-5 text-purple-500" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                예산 사용률
              </span>
            </div>
            <p className="mt-4 text-2xl font-bold">
              0%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              예산을 설정해주세요
            </p>
          </div>
        </section>

        {/* 안내 메시지 */}
        <section className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">시작하기</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            가계부를 시작하려면 먼저 가족(가계부)을 생성하거나 초대 코드로
            참여하세요. 거래 내역, 예산, 자산 관리 기능이 곧 추가될 예정입니다.
          </p>
          <div className="mt-4 flex gap-3">
            <button
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              disabled
            >
              가계부 만들기 (준비 중)
            </button>
            <button
              className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
              disabled
            >
              초대 코드로 참여 (준비 중)
            </button>
          </div>
        </section>

        {/* 사용자 정보 (디버깅용) */}
        <section className="mt-8 rounded-xl border border-border bg-muted/30 p-6">
          <h2 className="text-sm font-semibold text-muted-foreground">
            계정 정보
          </h2>
          <dl className="mt-4 grid gap-2 text-sm">
            <div className="flex gap-2">
              <dt className="text-muted-foreground">UID:</dt>
              <dd className="font-mono text-xs">{user.uid}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground">이메일:</dt>
              <dd>{user.email}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground">이름:</dt>
              <dd>{user.displayName}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground">역할:</dt>
              <dd>{user.role}</dd>
            </div>
          </dl>
        </section>
      </main>
    </div>
  );
}
