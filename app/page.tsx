/**
 * 홈 페이지 (랜딩 페이지)
 *
 * 비로그인 사용자에게 앱 소개를 보여주고,
 * 로그인 사용자는 대시보드로 리다이렉트합니다.
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Wallet,
  Users,
  PieChart,
  Shield,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthProvider";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuthContext();

  // 로그인된 사용자는 대시보드로 리다이렉트
  useEffect(() => {
    if (isAuthenticated && !loading) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* 헤더 */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">가족 가계부</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              로그인
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              시작하기
            </Link>
          </nav>
        </div>
      </header>

      {/* 히어로 섹션 */}
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            가족과 함께하는
            <br />
            <span className="text-primary">스마트한 가계부</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            수입과 지출을 한눈에 파악하고, 가족 구성원과 함께 재정 목표를
            달성하세요. 오프라인에서도 사용 가능한 편리한 가계부입니다.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/auth/signup"
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              무료로 시작하기
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/auth/login"
              className="rounded-lg border border-input bg-background px-6 py-3 text-sm font-medium transition-colors hover:bg-accent"
            >
              이미 계정이 있으신가요?
            </Link>
          </div>
        </section>

        {/* 기능 소개 */}
        <section className="border-t border-border bg-muted/30 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-2xl font-bold sm:text-3xl">
              주요 기능
            </h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {/* 가족 공유 */}
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">가족 공유</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  가족 구성원과 가계부를 공유하고 함께 관리하세요.
                </p>
              </div>

              {/* 통계 분석 */}
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <PieChart className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">통계 분석</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  카테고리별, 기간별 지출 패턴을 한눈에 파악하세요.
                </p>
              </div>

              {/* 예산 관리 */}
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">예산 관리</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  월별 예산을 설정하고 초과 지출을 방지하세요.
                </p>
              </div>

              {/* 오프라인 지원 */}
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">오프라인 지원</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  인터넷 연결 없이도 기록하고, 온라인 시 자동 동기화됩니다.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 푸터 */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 가족 가계부. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
