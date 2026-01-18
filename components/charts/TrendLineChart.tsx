/**
 * 추이 선 그래프
 *
 * - 월별 자산/수입/지출 변화
 * - 반응형 리사이즈
 * - 툴팁 및 범례
 */

"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/validations/transaction";
import type { TrendData } from "@/lib/analytics";

interface TrendLineChartProps {
  data: TrendData[];
  showAssets?: boolean;
  showIncomeExpense?: boolean;
  height?: number;
}

// X축 레이블 포맷
const formatXAxis = (value: string) => {
  const [, month] = value.split("-");
  return `${parseInt(month)}월`;
};

// Y축 레이블 포맷 (단위: 만원)
const formatYAxis = (value: number) => {
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(1)}억`;
  }
  if (value >= 10000) {
    return `${Math.round(value / 10000)}만`;
  }
  return value.toString();
};

// 커스텀 툴팁
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const [year, month] = (label as string).split("-");
    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
        <p className="mb-2 font-medium">{`${year}년 ${parseInt(month)}월`}</p>
        {payload.map((entry: any, index: number) => (
          <p
            key={index}
            className="text-sm"
            style={{ color: entry.stroke || entry.color }}
          >
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function TrendLineChart({
  data,
  showAssets = true,
  showIncomeExpense = true,
  height = 300,
}: TrendLineChartProps) {
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
      <LineChart
        data={data}
        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="month"
          tickFormatter={formatXAxis}
          tick={{ fontSize: 12 }}
          stroke="#9ca3af"
        />
        <YAxis
          tickFormatter={formatYAxis}
          tick={{ fontSize: 12 }}
          stroke="#9ca3af"
          width={50}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          iconType="circle"
          iconSize={8}
        />
        {showAssets && (
          <Line
            type="monotone"
            dataKey="netWorth"
            name="순자산"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: "#3b82f6", strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5 }}
          />
        )}
        {showIncomeExpense && (
          <>
            <Line
              type="monotone"
              dataKey="income"
              name="수입"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: "#22c55e", strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="expense"
              name="지출"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: "#ef4444", strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5 }}
            />
          </>
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

export default TrendLineChart;
