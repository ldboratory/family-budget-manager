/**
 * 카테고리별 파이 차트
 *
 * - Recharts PieChart
 * - 카테고리별 색상
 * - 클릭 시 상세 보기
 * - 반응형 리사이즈
 */

"use client";

import { useState, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Sector,
  Legend,
  Tooltip,
} from "recharts";
import { formatCurrency } from "@/lib/validations/transaction";
import type { CategoryStats } from "@/lib/analytics";

interface CategoryPieChartProps {
  data: CategoryStats[];
  totalAmount: number;
  onCategoryClick?: (categoryId: string) => void;
  height?: number;
}

// 활성 섹터 렌더링 (호버 시)
const renderActiveShape = (props: any) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
  } = props;

  return (
    <g>
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        fill="#111827"
        className="text-sm font-medium"
      >
        {payload.categoryName}
      </text>
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        fill="#6b7280"
        className="text-xs"
      >
        {formatCurrency(payload.amount)}
      </text>
      <text
        x={cx}
        y={cy + 28}
        textAnchor="middle"
        fill="#9ca3af"
        className="text-xs"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 10}
        outerRadius={outerRadius + 14}
        fill={fill}
      />
    </g>
  );
};

// 커스텀 툴팁
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
        <p className="font-medium" style={{ color: data.color }}>
          {data.categoryName}
        </p>
        <p className="text-sm text-muted-foreground">
          {formatCurrency(data.amount)} ({data.percentage}%)
        </p>
        <p className="text-xs text-muted-foreground">
          {data.transactionCount}건
        </p>
      </div>
    );
  }
  return null;
};

// 커스텀 범례
const CustomLegend = ({ payload, onClick }: any) => {
  return (
    <div className="flex flex-wrap justify-center gap-2 pt-2">
      {payload.slice(0, 6).map((entry: any, index: number) => (
        <button
          key={`legend-${index}`}
          onClick={() => onClick?.(entry.payload.categoryId)}
          className="flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-colors hover:bg-accent"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.value}</span>
        </button>
      ))}
      {payload.length > 6 && (
        <span className="px-2 py-1 text-xs text-muted-foreground">
          +{payload.length - 6}
        </span>
      )}
    </div>
  );
};

export function CategoryPieChart({
  data,
  totalAmount,
  onCategoryClick,
  height = 280,
}: CategoryPieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const onPieEnter = useCallback((_: any, index: number) => {
    setActiveIndex(index);
  }, []);

  const onPieLeave = useCallback(() => {
    setActiveIndex(undefined);
  }, []);

  const handleClick = useCallback(
    (data: any) => {
      if (onCategoryClick && data.categoryId) {
        onCategoryClick(data.categoryId);
      }
    },
    [onCategoryClick]
  );

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground"
        style={{ height }}
      >
        데이터가 없습니다
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          activeIndex={activeIndex}
          activeShape={renderActiveShape}
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={50}
          outerRadius={80}
          dataKey="amount"
          nameKey="categoryName"
          onMouseEnter={onPieEnter}
          onMouseLeave={onPieLeave}
          onClick={handleClick}
          style={{ cursor: onCategoryClick ? "pointer" : "default" }}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          content={<CustomLegend onClick={onCategoryClick} />}
          verticalAlign="bottom"
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default CategoryPieChart;
