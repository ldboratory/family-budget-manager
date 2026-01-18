/**
 * 자산 요약 컴포넌트
 *
 * - 자산 분류별 도넛 차트
 * - 총 자산액
 * - 자산/부채 비율
 */

"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import { formatAssetAmount, ASSET_CATEGORIES, type AssetCategoryType } from "@/lib/validations/asset";
import type { AssetCategoryStats } from "@/lib/analytics";
import Link from "next/link";

interface AssetSummaryProps {
  total: number;
  assets: number;
  liabilities: number;
  categories: AssetCategoryStats[];
  isLoading?: boolean;
}

// 커스텀 툴팁
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
        <p className="font-medium" style={{ color: data.color }}>
          {data.label}
        </p>
        <p className="text-sm text-muted-foreground">
          {formatAssetAmount(data.amount)} ({data.percentage}%)
        </p>
      </div>
    );
  }
  return null;
};

export function AssetSummary({
  total,
  assets,
  liabilities,
  categories,
  isLoading = false,
}: AssetSummaryProps) {
  // 부채 제외한 자산만 차트에 표시
  const chartData = useMemo(() => {
    return categories.filter((c) => c.category !== "loan" && c.amount > 0);
  }, [categories]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-24 rounded bg-muted" />
          <div className="h-40 rounded bg-muted" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-4 w-28 rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">자산 현황</h3>
        <Link
          href="/assets"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          상세보기
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* 도넛 차트 */}
      <div className="relative mt-4">
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
              dataKey="amount"
              nameKey="label"
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* 중앙 총액 표시 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xs text-muted-foreground">순자산</p>
          <p
            className={`text-lg font-bold ${
              total >= 0 ? "text-blue-600" : "text-red-600"
            }`}
          >
            {formatAssetAmount(total)}
          </p>
        </div>
      </div>

      {/* 자산/부채 요약 */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3">
          <div className="rounded-full bg-green-100 p-1.5">
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">자산</p>
            <p className="font-semibold text-green-600">
              {formatAssetAmount(assets)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3">
          <div className="rounded-full bg-red-100 p-1.5">
            <TrendingDown className="h-4 w-4 text-red-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">부채</p>
            <p className="font-semibold text-red-600">
              {formatAssetAmount(liabilities)}
            </p>
          </div>
        </div>
      </div>

      {/* 카테고리 목록 */}
      {chartData.length > 0 && (
        <div className="mt-4 space-y-2">
          {chartData.slice(0, 4).map((cat) => (
            <div key={cat.category} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-sm">{cat.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {formatAssetAmount(cat.amount)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {cat.percentage}%
                </span>
              </div>
            </div>
          ))}
          {chartData.length > 4 && (
            <p className="text-xs text-muted-foreground">
              외 {chartData.length - 4}개 항목
            </p>
          )}
        </div>
      )}

      {chartData.length === 0 && categories.length === 0 && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          등록된 자산이 없습니다
        </div>
      )}
    </div>
  );
}

export default AssetSummary;
