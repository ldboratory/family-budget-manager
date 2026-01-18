/**
 * 월 선택 컴포넌트
 *
 * - 이전/다음 월 버튼
 * - 현재 월 표시
 */

"use client";

import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { formatMonthLabel, getAdjacentMonth } from "@/lib/analytics";

interface MonthSelectorProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
  minYear?: number;
  maxYear?: number;
}

export function MonthSelector({
  year,
  month,
  onChange,
  minYear = 2020,
  maxYear,
}: MonthSelectorProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const maxYr = maxYear ?? currentYear;

  // 이전 월로 이동 가능 여부
  const canGoPrev = year > minYear || (year === minYear && month > 1);

  // 다음 월로 이동 가능 여부 (현재 월까지만)
  const canGoNext = year < maxYr || (year === maxYr && month < currentMonth);

  const handlePrev = () => {
    if (!canGoPrev) return;
    const { year: newYear, month: newMonth } = getAdjacentMonth(year, month, "prev");
    onChange(newYear, newMonth);
  };

  const handleNext = () => {
    if (!canGoNext) return;
    const { year: newYear, month: newMonth } = getAdjacentMonth(year, month, "next");
    onChange(newYear, newMonth);
  };

  const handleToday = () => {
    onChange(currentYear, currentMonth);
  };

  const isCurrentMonth = year === currentYear && month === currentMonth;

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
      {/* 이전 버튼 */}
      <button
        onClick={handlePrev}
        disabled={!canGoPrev}
        className="rounded-lg p-1.5 transition-colors hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent"
        aria-label="이전 달"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* 현재 월 표시 */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{formatMonthLabel(year, month)}</span>
        {!isCurrentMonth && (
          <button
            onClick={handleToday}
            className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary hover:bg-primary/20"
          >
            오늘
          </button>
        )}
      </div>

      {/* 다음 버튼 */}
      <button
        onClick={handleNext}
        disabled={!canGoNext}
        className="rounded-lg p-1.5 transition-colors hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent"
        aria-label="다음 달"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

export default MonthSelector;
