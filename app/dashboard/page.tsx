/**
 * 대시보드 페이지
 *
 * - 월간 요약 (수입, 지출, 저축)
 * - 자산 현황
 * - 카테고리별 지출
 * - 최근 거래
 * - 월 선택
 */

"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  LogOut,
  Wallet,
  BarChart3,
  FileText,
  PiggyBank,
  Settings,
  Plus,
} from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { MonthlySummary } from "@/components/dashboard/MonthlySummary";
import { AssetSummary } from "@/components/dashboard/AssetSummary";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { MonthSelector } from "@/components/dashboard/MonthSelector";
import { CategoryPieChart } from "@/components/charts/CategoryPieChart";
import {
  calculateMonthlyStats,
  calculateAssetCategoryStats,
  getRecentTransactions,
  getAdjacentMonth,
  type MonthlyStats,
  type AssetCategoryStats,
} from "@/lib/analytics";
import { getLocalDB, type LocalTransaction } from "@/lib/db/indexedDB";

// 임시 household ID
const DEMO_HOUSEHOLD_ID = "demo-household";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, signOut } = useAuthContext();

  // 선택된 월
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);

  // 데이터 상태
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [previousStats, setPreviousStats] = useState<MonthlyStats | null>(null);
  const [assetStats, setAssetStats] = useState<{
    total: number;
    assets: number;
    liabilities: number;
    categories: AssetCategoryStats[];
  } | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<LocalTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 비인증 사용자 리다이렉트
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/auth/login?redirect=/dashboard");
    }
  }, [isAuthenticated, loading, router]);

  // 데이터 로드
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        // 현재 월 통계
        const stats = await calculateMonthlyStats(
          DEMO_HOUSEHOLD_ID,
          selectedYear,
          selectedMonth
        );
        setMonthlyStats(stats);

        // 이전 월 통계 (전월 대비용)
        const { year: prevYear, month: prevMonth } = getAdjacentMonth(
          selectedYear,
          selectedMonth,
          "prev"
        );
        const prevStats = await calculateMonthlyStats(
          DEMO_HOUSEHOLD_ID,
          prevYear,
          prevMonth
        );
        setPreviousStats(prevStats);

        // 자산 통계
        const assets = await calculateAssetCategoryStats(DEMO_HOUSEHOLD_ID);
        setAssetStats(assets);

        // 최근 거래
        const recent = await getRecentTransactions(DEMO_HOUSEHOLD_ID, 5);
        setRecentTransactions(recent);
      } catch (error) {
        console.error("대시보드 데이터 로드 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated, selectedYear, selectedMonth]);

  // 로그아웃 핸들러
  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }
  };

  // 월 변경 핸들러
  const handleMonthChange = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
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
    <div className="min-h-screen bg-background pb-20">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">가족 가계부</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:block">
              {user.displayName}님
            </span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* 월 선택 */}
        <section className="mb-6">
          <MonthSelector
            year={selectedYear}
            month={selectedMonth}
            onChange={handleMonthChange}
          />
        </section>

        {/* 월간 요약 */}
        <section className="mb-6">
          <MonthlySummary
            stats={monthlyStats}
            previousStats={previousStats}
            isLoading={isLoading}
          />
        </section>

        {/* 그리드 레이아웃 */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* 왼쪽: 카테고리별 지출 + 최근 거래 */}
          <div className="space-y-6 lg:col-span-2">
            {/* 카테고리별 지출 */}
            <section className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">카테고리별 지출</h3>
                <Link
                  href="/transactions"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  상세보기
                </Link>
              </div>
              <div className="mt-4">
                {isLoading ? (
                  <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : monthlyStats && monthlyStats.categories.length > 0 ? (
                  <CategoryPieChart
                    data={monthlyStats.categories}
                    totalAmount={monthlyStats.expense}
                    height={280}
                  />
                ) : (
                  <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
                    <BarChart3 className="h-12 w-12 opacity-30" />
                    <p className="mt-2 text-sm">이번 달 지출 내역이 없습니다</p>
                  </div>
                )}
              </div>
            </section>

            {/* 최근 거래 */}
            <section>
              <RecentTransactions
                transactions={recentTransactions}
                isLoading={isLoading}
              />
            </section>
          </div>

          {/* 오른쪽: 자산 현황 */}
          <div className="space-y-6">
            <AssetSummary
              total={assetStats?.total ?? 0}
              assets={assetStats?.assets ?? 0}
              liabilities={assetStats?.liabilities ?? 0}
              categories={assetStats?.categories ?? []}
              isLoading={isLoading}
            />

            {/* 빠른 액션 */}
            <section className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold">빠른 메뉴</h3>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link
                  href="/transactions"
                  className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 transition-colors hover:bg-accent"
                >
                  <div className="rounded-full bg-green-100 p-2">
                    <FileText className="h-5 w-5 text-green-600" />
                  </div>
                  <span className="text-sm">거래 내역</span>
                </Link>
                <Link
                  href="/assets"
                  className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 transition-colors hover:bg-accent"
                >
                  <div className="rounded-full bg-blue-100 p-2">
                    <PiggyBank className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="text-sm">자산 관리</span>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* 하단 네비게이션 (모바일) */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card lg:hidden">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
          <Link
            href="/dashboard"
            className="flex flex-col items-center gap-1 text-primary"
          >
            <Wallet className="h-5 w-5" />
            <span className="text-xs">홈</span>
          </Link>
          <Link
            href="/transactions"
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <FileText className="h-5 w-5" />
            <span className="text-xs">거래</span>
          </Link>
          <button
            onClick={() => router.push("/transactions")}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
          >
            <Plus className="h-6 w-6" />
          </button>
          <Link
            href="/assets"
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <PiggyBank className="h-5 w-5" />
            <span className="text-xs">자산</span>
          </Link>
          <Link
            href="/dashboard"
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-5 w-5" />
            <span className="text-xs">설정</span>
          </Link>
        </div>
      </nav>

      {/* 플로팅 버튼 (데스크톱) */}
      <button
        onClick={() => router.push("/transactions")}
        className="fixed bottom-6 right-6 hidden h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 lg:flex"
        aria-label="거래 추가"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
