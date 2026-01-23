/**
 * 거래 필터 컴포넌트
 *
 * - 기간 선택 (이번 달, 지난 달, 최근 3개월, 커스텀)
 * - 유형 필터 (수입/지출)
 * - 카테고리 필터
 * - 검색어 입력
 */

"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  X,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from "@/lib/validations/transaction";
import type { TransactionFilter as TFilter } from "@/types";

interface TransactionFilterProps {
  filter: Partial<TFilter>;
  onChange: (filter: Partial<TFilter>) => void;
}

type DatePreset = "this-month" | "last-month" | "3-months" | "custom";

export function TransactionFilter({ filter, onChange }: TransactionFilterProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>("this-month");

  // 날짜 프리셋 계산
  const getDateRange = (preset: DatePreset) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    switch (preset) {
      case "this-month":
        return {
          startDate: new Date(year, month, 1),
          endDate: new Date(year, month + 1, 0),
        };
      case "last-month":
        return {
          startDate: new Date(year, month - 1, 1),
          endDate: new Date(year, month, 0),
        };
      case "3-months":
        return {
          startDate: new Date(year, month - 2, 1),
          endDate: new Date(year, month + 1, 0),
        };
      default:
        return filter.dateRange;
    }
  };

  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== "custom") {
      const range = getDateRange(preset);
      onChange({ ...filter, dateRange: range });
    }
  };

  const handleTypeChange = (type: "income" | "expense" | undefined) => {
    onChange({ ...filter, type });
  };

  const handleCategoryChange = (categoryId: string | undefined) => {
    onChange({ ...filter, categoryId });
  };

  const handleSearchChange = (searchQuery: string) => {
    onChange({ ...filter, searchQuery: searchQuery || undefined });
  };

  const clearFilters = () => {
    setDatePreset("this-month");
    onChange({
      sortBy: "date",
      sortOrder: "desc",
      dateRange: getDateRange("this-month"),
    });
  };

  const hasActiveFilters =
    filter.type || filter.categoryId || filter.searchQuery;

  const allCategories = [
    ...DEFAULT_EXPENSE_CATEGORIES,
    ...DEFAULT_INCOME_CATEGORIES,
  ];

  return (
    <div className="space-y-4">
      {/* 상단 바: 검색 + 필터 토글 */}
      <div className="flex gap-3">
        {/* 검색창 */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="거래 내용 검색..."
            value={filter.searchQuery ?? ""}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* 필터 토글 버튼 */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
            showFilters || hasActiveFilters
              ? "border-primary bg-primary/10 text-primary"
              : "border-input hover:bg-accent"
          }`}
        >
          <Filter className="h-4 w-4" />
          필터
          {hasActiveFilters && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {[filter.type, filter.categoryId, filter.searchQuery].filter(
                Boolean
              ).length}
            </span>
          )}
        </button>
      </div>

      {/* 필터 패널 */}
      {showFilters && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">필터</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
                초기화
              </button>
            )}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* 기간 선택 */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                기간
              </label>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { value: "this-month", label: "이번 달" },
                  { value: "last-month", label: "지난 달" },
                  { value: "3-months", label: "3개월" },
                  { value: "custom", label: "직접 선택" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() =>
                      handleDatePresetChange(option.value as DatePreset)
                    }
                    className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                      datePreset === option.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {/* 커스텀 날짜 선택 */}
              {datePreset === "custom" && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="date"
                    value={
                      filter.dateRange?.startDate
                        ?.toISOString()
                        .split("T")[0] ?? ""
                    }
                    onChange={(e) =>
                      onChange({
                        ...filter,
                        dateRange: {
                          startDate: new Date(e.target.value),
                          endDate:
                            filter.dateRange?.endDate ?? new Date(),
                        },
                      })
                    }
                    className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
                  />
                  <span className="text-muted-foreground">~</span>
                  <input
                    type="date"
                    value={
                      filter.dateRange?.endDate?.toISOString().split("T")[0] ??
                      ""
                    }
                    onChange={(e) =>
                      onChange({
                        ...filter,
                        dateRange: {
                          startDate:
                            filter.dateRange?.startDate ?? new Date(),
                          endDate: new Date(e.target.value),
                        },
                      })
                    }
                    className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
                  />
                </div>
              )}
            </div>

            {/* 유형 선택 */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                유형
              </label>
              <div className="flex gap-1">
                <button
                  onClick={() => handleTypeChange(undefined)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs transition-colors ${
                    !filter.type
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  전체
                </button>
                <button
                  onClick={() => handleTypeChange("expense")}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-md px-3 py-1.5 text-xs transition-colors ${
                    filter.type === "expense"
                      ? "bg-red-500 text-white"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  <TrendingDown className="h-3 w-3" />
                  지출
                </button>
                <button
                  onClick={() => handleTypeChange("income")}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-md px-3 py-1.5 text-xs transition-colors ${
                    filter.type === "income"
                      ? "bg-green-500 text-white"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  <TrendingUp className="h-3 w-3" />
                  수입
                </button>
              </div>
            </div>

            {/* 카테고리 선택 */}
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">
                카테고리
              </label>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => handleCategoryChange(undefined)}
                  className={`rounded-full px-3 py-1 text-xs transition-colors ${
                    !filter.categoryId
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  전체
                </button>
                {(filter.type === "income"
                  ? DEFAULT_INCOME_CATEGORIES
                  : filter.type === "expense"
                    ? DEFAULT_EXPENSE_CATEGORIES
                    : allCategories
                ).map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    className={`rounded-full px-3 py-1 text-xs transition-colors ${
                      filter.categoryId === category.id
                        ? "text-white"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                    style={
                      filter.categoryId === category.id
                        ? { backgroundColor: category.color }
                        : undefined
                    }
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TransactionFilter;
