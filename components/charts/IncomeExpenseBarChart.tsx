/**
 * 수입 vs 지출 막대 그래프
 *
 * - 월별 수입/지출 비교
 * - 저축 표시
 * - 반응형 리사이즈
 */

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatCurrency } from "@/lib/validations/transaction";
import type { TrendData } from "@/lib/analytics";

interface IncomeExpenseBarChartProps {
  data: TrendData[];
  height?: number;
  showSavings?: boolean;
}

// X축 레이블 포맷
const formatXAxis = (value: string) => {
  const [, month] = value.split("-");
  return `${parseInt(month ?? "0")}월`;
};

// Y축 레이블 포맷
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
    const income = payload.find((p: any) => p.dataKey === "income")?.value ?? 0;
    const expense = payload.find((p: any) => p.dataKey === "expense")?.value ?? 0;
    const savings = income - expense;
    const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;

    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
        <p className="mb-2 font-medium">{`${year ?? ""}년 ${parseInt(month ?? "0")}월`}</p>
        <p className="text-sm text-green-600">수입: {formatCurrency(income)}</p>
        <p className="text-sm text-red-600">지출: {formatCurrency(expense)}</p>
        <hr className="my-2 border-border" />
        <p
          className={`text-sm font-medium ${savings >= 0 ? "text-blue-600" : "text-red-600"}`}
        >
          저축: {formatCurrency(savings)} ({savingsRate}%)
        </p>
      </div>
    );
  }
  return null;
};

export function IncomeExpenseBarChart({
  data,
  height = 300,
  showSavings = true,
}: IncomeExpenseBarChartProps) {
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

  // 저축 데이터 추가
  const chartData = data.map((d) => ({
    ...d,
    savings: d.income - d.expense,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        barGap={2}
        barCategoryGap="20%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={formatXAxis}
          tick={{ fontSize: 12 }}
          stroke="#9ca3af"
          axisLine={{ stroke: "#e5e7eb" }}
        />
        <YAxis
          tickFormatter={formatYAxis}
          tick={{ fontSize: 12 }}
          stroke="#9ca3af"
          width={50}
          axisLine={{ stroke: "#e5e7eb" }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          iconType="rect"
          iconSize={12}
        />
        <ReferenceLine y={0} stroke="#e5e7eb" />
        <Bar
          dataKey="income"
          name="수입"
          fill="#22c55e"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
        <Bar
          dataKey="expense"
          name="지출"
          fill="#ef4444"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
        {showSavings && (
          <Bar
            dataKey="savings"
            name="저축"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

export default IncomeExpenseBarChart;
