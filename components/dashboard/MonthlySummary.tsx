/**
 * 월간 요약 컴포넌트
 *
 * - 이번 달 수입, 지출, 저축 표시
 * - KPI 카드
 * - 저축률 표시
 */

"use client";

import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/validations/transaction";
import type { MonthlyStats } from "@/lib/analytics";

interface MonthlySummaryProps {
  stats: MonthlyStats | null;
  previousStats?: MonthlyStats | null;
  isLoading?: boolean;
}

export function MonthlySummary({
  stats,
  previousStats,
  isLoading = false,
}: MonthlySummaryProps) {
  // 전월 대비 변화 계산
  const getChange = (current: number, previous: number | undefined) => {
    if (previous === undefined || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(Math.round(change)),
      isPositive: change > 0,
    };
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-border bg-card p-4"
          >
            <div className="h-4 w-16 rounded bg-muted" />
            <div className="mt-3 h-6 w-24 rounded bg-muted" />
            <div className="mt-2 h-3 w-12 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
        통계 데이터가 없습니다
      </div>
    );
  }

  const incomeChange = getChange(stats.income, previousStats?.income);
  const expenseChange = getChange(stats.expense, previousStats?.expense);
  const savingsChange = getChange(
    Math.max(0, stats.savings),
    previousStats ? Math.max(0, previousStats.savings) : undefined
  );

  const cards = [
    {
      label: "수입",
      value: stats.income,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
      change: incomeChange,
      changeGood: true, // 증가가 좋음
    },
    {
      label: "지출",
      value: stats.expense,
      icon: TrendingDown,
      color: "text-red-600",
      bgColor: "bg-red-50",
      change: expenseChange,
      changeGood: false, // 감소가 좋음
    },
    {
      label: "저축",
      value: Math.max(0, stats.savings),
      icon: PiggyBank,
      color: stats.savings >= 0 ? "text-blue-600" : "text-red-600",
      bgColor: stats.savings >= 0 ? "bg-blue-50" : "bg-red-50",
      change: savingsChange,
      changeGood: true,
    },
    {
      label: "저축률",
      value: stats.savingsRate,
      icon: Percent,
      color:
        stats.savingsRate >= 20
          ? "text-green-600"
          : stats.savingsRate >= 10
            ? "text-yellow-600"
            : "text-red-600",
      bgColor:
        stats.savingsRate >= 20
          ? "bg-green-50"
          : stats.savingsRate >= 10
            ? "bg-yellow-50"
            : "bg-red-50",
      isPercent: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isGoodChange =
          card.change?.isPositive === card.changeGood ||
          (!card.change?.isPositive && !card.changeGood);

        return (
          <div
            key={card.label}
            className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/30"
          >
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-2 ${card.color}`}>
                <div className={`rounded-lg p-1.5 ${card.bgColor}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {card.label}
                </span>
              </div>
            </div>
            <p className={`mt-3 text-xl font-bold ${card.color}`}>
              {card.isPercent
                ? `${card.value}%`
                : formatCurrency(card.value)}
            </p>
            {card.change && (
              <div
                className={`mt-1 flex items-center gap-1 text-xs ${
                  isGoodChange ? "text-green-600" : "text-red-600"
                }`}
              >
                {card.change.isPositive ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                <span>전월 대비 {card.change.value}%</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default MonthlySummary;
