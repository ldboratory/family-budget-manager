/**
 * 자산 관련 Zod 스키마 및 상수
 */

import { z } from "zod";

/**
 * 자산 분류
 */
export const assetCategorySchema = z.enum([
  "cash",
  "bank",
  "stock",
  "bond",
  "real_estate",
  "crypto",
  "insurance",
  "pension",
  "loan",
  "etc",
]);

export type AssetCategoryType = z.infer<typeof assetCategorySchema>;

/**
 * 통화 코드
 */
export const currencyCodeSchema = z.enum(["KRW", "USD", "EUR", "JPY"]);

/**
 * 자산 생성 스키마
 */
export const createAssetSchema = z.object({
  assetName: z
    .string()
    .min(1, "자산명을 입력해주세요")
    .max(50, "자산명은 50자 이내로 입력해주세요"),
  category: assetCategorySchema,
  amount: z.number({ required_error: "금액을 입력해주세요" }),
  currency: currencyCodeSchema.default("KRW"),
  description: z.string().max(200).optional(),
  institution: z.string().max(50).optional(),
  accountNumberLast4: z
    .string()
    .max(4)
    .regex(/^\d{0,4}$/, "숫자만 입력 가능합니다")
    .optional(),
  interestRate: z.number().min(0).max(100).optional(),
  maturityDate: z.string().optional(),
});

/**
 * 자산 수정 스키마
 */
export const updateAssetSchema = createAssetSchema.partial().extend({
  version: z.number({ required_error: "버전 정보가 필요합니다" }),
});

/**
 * 타입 추출
 */
export type CreateAssetFormData = z.infer<typeof createAssetSchema>;
export type UpdateAssetFormData = z.infer<typeof updateAssetSchema>;

/**
 * 자산 분류 레이블 및 아이콘
 */
export const ASSET_CATEGORIES: Record<
  AssetCategoryType,
  { label: string; icon: string; color: string }
> = {
  cash: { label: "현금", icon: "banknote", color: "#22c55e" },
  bank: { label: "은행예금", icon: "landmark", color: "#3b82f6" },
  stock: { label: "주식", icon: "trending-up", color: "#8b5cf6" },
  bond: { label: "채권", icon: "file-text", color: "#06b6d4" },
  real_estate: { label: "부동산", icon: "home", color: "#f97316" },
  crypto: { label: "암호화폐", icon: "bitcoin", color: "#eab308" },
  insurance: { label: "보험", icon: "shield", color: "#14b8a6" },
  pension: { label: "연금", icon: "piggy-bank", color: "#ec4899" },
  loan: { label: "대출", icon: "credit-card", color: "#ef4444" },
  etc: { label: "기타", icon: "more-horizontal", color: "#6b7280" },
};

/**
 * 통화 레이블
 */
export const CURRENCY_LABELS: Record<string, { symbol: string; name: string }> = {
  KRW: { symbol: "₩", name: "원화" },
  USD: { symbol: "$", name: "달러" },
  EUR: { symbol: "€", name: "유로" },
  JPY: { symbol: "¥", name: "엔화" },
};

/**
 * 금액 포맷팅 (통화별)
 */
export function formatAssetAmount(amount: number, currency: string = "KRW"): string {
  const currencyInfo = CURRENCY_LABELS[currency] ?? CURRENCY_LABELS.KRW;

  if (currency === "KRW" || currency === "JPY") {
    return `${currencyInfo?.symbol}${new Intl.NumberFormat("ko-KR", {
      maximumFractionDigits: 0,
    }).format(amount)}`;
  }

  return `${currencyInfo?.symbol}${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

/**
 * 자산/부채 구분
 */
export function isLiability(category: AssetCategoryType): boolean {
  return category === "loan";
}

/**
 * 카테고리 정렬 순서
 */
export const CATEGORY_ORDER: AssetCategoryType[] = [
  "cash",
  "bank",
  "stock",
  "bond",
  "real_estate",
  "crypto",
  "insurance",
  "pension",
  "loan",
  "etc",
];
