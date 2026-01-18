/**
 * 거래 관련 Zod 스키마
 */

import { z } from "zod";

/**
 * 거래 유형
 */
export const transactionTypeSchema = z.enum(["income", "expense"]);

/**
 * 결제 수단
 */
export const paymentMethodSchema = z.enum([
  "cash",
  "debit-card",
  "credit-card",
  "bank-transfer",
  "mobile-pay",
  "other",
]);

/**
 * 거래 생성 스키마
 */
export const createTransactionSchema = z.object({
  type: transactionTypeSchema,
  amount: z
    .number({ required_error: "금액을 입력해주세요" })
    .positive("금액은 0보다 커야 합니다")
    .max(999999999999, "금액이 너무 큽니다"),
  categoryId: z.string().min(1, "카테고리를 선택해주세요"),
  categoryName: z.string().optional(),
  description: z
    .string()
    .min(1, "내용을 입력해주세요")
    .max(200, "내용은 200자 이내로 입력해주세요"),
  date: z.string().min(1, "날짜를 선택해주세요"),
  paymentMethod: paymentMethodSchema,
  tags: z.array(z.string()).optional(),
  merchant: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  memo: z.string().max(500).optional(),
});

/**
 * 거래 수정 스키마
 */
export const updateTransactionSchema = createTransactionSchema.partial().extend({
  version: z.number({ required_error: "버전 정보가 필요합니다" }),
});

/**
 * 거래 필터 스키마
 */
export const transactionFilterSchema = z.object({
  type: transactionTypeSchema.optional(),
  categoryId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  paymentMethod: paymentMethodSchema.optional(),
  searchQuery: z.string().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().positive().max(100).optional().default(20),
  sortBy: z.enum(["date", "amount", "category"]).optional().default("date"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

/**
 * 타입 추출
 */
export type CreateTransactionFormData = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionFormData = z.infer<typeof updateTransactionSchema>;
export type TransactionFilterParams = z.infer<typeof transactionFilterSchema>;

/**
 * 결제 수단 레이블
 */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "현금",
  "debit-card": "체크카드",
  "credit-card": "신용카드",
  "bank-transfer": "계좌이체",
  "mobile-pay": "간편결제",
  other: "기타",
};

/**
 * 기본 카테고리
 */
export const DEFAULT_EXPENSE_CATEGORIES = [
  { id: "food", name: "식비", icon: "utensils", color: "#ef4444" },
  { id: "transport", name: "교통", icon: "car", color: "#f97316" },
  { id: "housing", name: "주거", icon: "home", color: "#eab308" },
  { id: "utilities", name: "공과금", icon: "zap", color: "#84cc16" },
  { id: "healthcare", name: "의료", icon: "heart-pulse", color: "#22c55e" },
  { id: "education", name: "교육", icon: "graduation-cap", color: "#14b8a6" },
  { id: "entertainment", name: "여가", icon: "gamepad-2", color: "#06b6d4" },
  { id: "shopping", name: "쇼핑", icon: "shopping-bag", color: "#3b82f6" },
  { id: "savings", name: "저축", icon: "piggy-bank", color: "#8b5cf6" },
  { id: "other-expense", name: "기타", icon: "more-horizontal", color: "#6b7280" },
];

export const DEFAULT_INCOME_CATEGORIES = [
  { id: "salary", name: "급여", icon: "briefcase", color: "#22c55e" },
  { id: "bonus", name: "상여금", icon: "gift", color: "#10b981" },
  { id: "investment", name: "투자수익", icon: "trending-up", color: "#14b8a6" },
  { id: "allowance", name: "용돈", icon: "wallet", color: "#06b6d4" },
  { id: "other-income", name: "기타", icon: "more-horizontal", color: "#6b7280" },
];

/**
 * 카테고리 ID로 카테고리 정보 찾기
 */
export function getCategoryById(categoryId: string, type: "income" | "expense") {
  const categories =
    type === "income" ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;
  return categories.find((c) => c.id === categoryId);
}

/**
 * 금액 포맷팅 (한국 원화)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * 날짜 포맷팅
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

/**
 * 짧은 날짜 포맷팅
 */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(d);
}
