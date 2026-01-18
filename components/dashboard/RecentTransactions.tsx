/**
 * 최근 거래 프리뷰 컴포넌트
 *
 * - 최근 거래 5개 표시
 * - 전체보기 링크
 */

"use client";

import Link from "next/link";
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Clock,
} from "lucide-react";
import {
  formatCurrency,
  getCategoryById,
} from "@/lib/validations/transaction";
import type { LocalTransaction } from "@/lib/db/indexedDB";

interface RecentTransactionsProps {
  transactions: LocalTransaction[];
  isLoading?: boolean;
}

// 날짜 포맷팅
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "오늘";
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "어제";
  }

  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}

export function RecentTransactions({
  transactions,
  isLoading = false,
}: RecentTransactionsProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-24 rounded bg-muted" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-3 w-16 rounded bg-muted" />
              </div>
              <div className="h-4 w-16 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">최근 거래</h3>
        <Link
          href="/transactions"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          전체보기
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* 거래 목록 */}
      {transactions.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Clock className="h-10 w-10 opacity-30" />
          <p className="mt-2 text-sm">거래 내역이 없습니다</p>
          <Link
            href="/transactions"
            className="mt-3 text-sm text-primary hover:underline"
          >
            거래 추가하기
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {transactions.map((transaction) => {
            const category = getCategoryById(
              transaction.categoryId,
              transaction.type
            );
            const isIncome = transaction.type === "income";

            return (
              <div
                key={transaction.id}
                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent/50"
              >
                {/* 아이콘 */}
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: category
                      ? `${category.color}20`
                      : "#e5e7eb",
                  }}
                >
                  {isIncome ? (
                    <TrendingUp
                      className="h-5 w-5"
                      style={{ color: category?.color ?? "#22c55e" }}
                    />
                  ) : (
                    <TrendingDown
                      className="h-5 w-5"
                      style={{ color: category?.color ?? "#ef4444" }}
                    />
                  )}
                </div>

                {/* 내용 */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {transaction.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span
                      className="rounded-full px-1.5 py-0.5"
                      style={{
                        backgroundColor: category
                          ? `${category.color}20`
                          : "#e5e7eb",
                        color: category?.color ?? "#6b7280",
                      }}
                    >
                      {category?.name ?? transaction.categoryName}
                    </span>
                    <span>{formatDate(transaction.date)}</span>
                  </div>
                </div>

                {/* 금액 */}
                <p
                  className={`flex-shrink-0 font-semibold ${
                    isIncome ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {isIncome ? "+" : "-"}
                  {formatCurrency(transaction.amount)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RecentTransactions;
