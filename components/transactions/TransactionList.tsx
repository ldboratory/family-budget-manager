/**
 * 거래 목록 컴포넌트
 *
 * - 테이블/목록 형태로 거래 표시
 * - 금액 포맷팅 (₩), 카테고리 색상 표시
 * - 편집/삭제 버튼
 * - 로딩, 빈 상태 처리
 */

"use client";

import { useState } from "react";
import {
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  AlertCircle,
  Cloud,
  CloudOff,
} from "lucide-react";
import {
  formatCurrency,
  formatShortDate,
  getCategoryById,
  PAYMENT_METHOD_LABELS,
} from "@/lib/validations/transaction";
import type { LocalTransaction } from "@/lib/db/indexedDB";

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  categoryId: string;
  categoryName: string;
  description: string;
  date: number; // Unix timestamp (ms)
  paymentMethod: string;
  merchant?: string;
  syncStatus: "synced" | "pending" | "conflict";
  version: number;
}

interface TransactionListProps {
  transactions: Transaction[];
  isLoading?: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

export function TransactionList({
  transactions,
  isLoading = false,
  onEdit,
  onDelete,
}: TransactionListProps) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex animate-pulse items-center gap-4 rounded-lg border border-border bg-card p-4"
          >
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-muted" />
              <div className="h-3 w-1/4 rounded bg-muted" />
            </div>
            <div className="h-5 w-20 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  // 빈 상태
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-medium">거래 내역이 없습니다</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          새 거래를 추가해보세요
        </p>
      </div>
    );
  }

  // 날짜별로 그룹화
  const groupedByDate = transactions.reduce(
    (acc, transaction) => {
      const dateKey = new Date(transaction.date).toISOString().split("T")[0]!;
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(transaction);
      return acc;
    },
    {} as Record<string, Transaction[]>
  );

  // 날짜 내림차순 정렬
  const sortedDates = Object.keys(groupedByDate).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => {
        const dayTransactions = groupedByDate[date]!;
        const dayIncome = dayTransactions
          .filter((t) => t.type === "income")
          .reduce((sum, t) => sum + t.amount, 0);
        const dayExpense = dayTransactions
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + t.amount, 0);

        return (
          <div key={date}>
            {/* 날짜 헤더 */}
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                {formatDateHeader(date)}
              </h3>
              <div className="flex gap-4 text-xs">
                {dayIncome > 0 && (
                  <span className="text-green-600">
                    +{formatCurrency(dayIncome)}
                  </span>
                )}
                {dayExpense > 0 && (
                  <span className="text-red-600">
                    -{formatCurrency(dayExpense)}
                  </span>
                )}
              </div>
            </div>

            {/* 거래 목록 */}
            <div className="space-y-2">
              {dayTransactions.map((transaction) => {
                const category = getCategoryById(
                  transaction.categoryId,
                  transaction.type
                );

                return (
                  <div
                    key={transaction.id}
                    className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/50"
                  >
                    {/* 카테고리 아이콘 */}
                    <div
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: category
                          ? `${category.color}20`
                          : "#e5e7eb",
                      }}
                    >
                      {transaction.type === "income" ? (
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

                    {/* 거래 정보 */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">
                          {transaction.description}
                        </p>
                        {/* 동기화 상태 */}
                        {transaction.syncStatus === "pending" && (
                          <CloudOff
                            className="h-3 w-3 flex-shrink-0 text-yellow-500"
                            title="동기화 대기 중"
                          />
                        )}
                        {transaction.syncStatus === "conflict" && (
                          <AlertCircle
                            className="h-3 w-3 flex-shrink-0 text-red-500"
                            title="동기화 충돌"
                          />
                        )}
                        {transaction.syncStatus === "synced" && (
                          <Cloud
                            className="h-3 w-3 flex-shrink-0 text-green-500 opacity-0 group-hover:opacity-100"
                            title="동기화 완료"
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5"
                          style={{
                            backgroundColor: category
                              ? `${category.color}20`
                              : "#e5e7eb",
                            color: category?.color ?? "#6b7280",
                          }}
                        >
                          {category?.name ?? transaction.categoryName}
                        </span>
                        <span>
                          {PAYMENT_METHOD_LABELS[transaction.paymentMethod] ??
                            transaction.paymentMethod}
                        </span>
                        {transaction.merchant && (
                          <>
                            <span>·</span>
                            <span>{transaction.merchant}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 금액 */}
                    <div className="flex-shrink-0 text-right">
                      <p
                        className={`font-semibold ${
                          transaction.type === "income"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </p>
                    </div>

                    {/* 액션 메뉴 */}
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={() =>
                          setMenuOpen(
                            menuOpen === transaction.id ? null : transaction.id
                          )
                        }
                        className="rounded-lg p-2 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
                        aria-label="메뉴"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {menuOpen === transaction.id && (
                        <>
                          {/* 백드롭 */}
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setMenuOpen(null)}
                          />
                          {/* 메뉴 */}
                          <div className="absolute right-0 top-full z-20 mt-1 w-32 rounded-lg border border-border bg-card py-1 shadow-lg">
                            <button
                              onClick={() => {
                                setMenuOpen(null);
                                onEdit(transaction);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                            >
                              <Pencil className="h-4 w-4" />
                              수정
                            </button>
                            <button
                              onClick={() => {
                                setMenuOpen(null);
                                onDelete(transaction);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
                            >
                              <Trash2 className="h-4 w-4" />
                              삭제
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 날짜 헤더 포맷팅
 */
function formatDateHeader(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    return "오늘";
  }

  if (isYesterday) {
    return "어제";
  }

  const dayOfWeek = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${dayOfWeek})`;
}

export default TransactionList;
