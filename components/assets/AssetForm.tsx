/**
 * 자산 추가/수정 폼
 *
 * - 자산 분류 선택
 * - 자산명, 금액, 통화, 설명 등 입력
 * - 폼 검증 (react-hook-form + zod)
 */

"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  X,
  Loader2,
  Banknote,
  Landmark,
  TrendingUp,
  FileText,
  Home,
  Bitcoin,
  Shield,
  PiggyBank,
  CreditCard,
  MoreHorizontal,
  Building2,
  Percent,
  Calendar,
  Hash,
} from "lucide-react";
import {
  createAssetSchema,
  type CreateAssetFormData,
  ASSET_CATEGORIES,
  CURRENCY_LABELS,
  type AssetCategoryType,
  formatAssetAmount,
} from "@/lib/validations/asset";

// 카테고리별 아이콘 매핑
const CATEGORY_ICONS: Record<AssetCategoryType, React.ReactNode> = {
  cash: <Banknote className="h-5 w-5" />,
  bank: <Landmark className="h-5 w-5" />,
  stock: <TrendingUp className="h-5 w-5" />,
  bond: <FileText className="h-5 w-5" />,
  real_estate: <Home className="h-5 w-5" />,
  crypto: <Bitcoin className="h-5 w-5" />,
  insurance: <Shield className="h-5 w-5" />,
  pension: <PiggyBank className="h-5 w-5" />,
  loan: <CreditCard className="h-5 w-5" />,
  etc: <MoreHorizontal className="h-5 w-5" />,
};

interface AssetFormProps {
  /** 수정할 자산 (없으면 새로 생성) */
  asset?: {
    id: string;
    assetName: string;
    category: AssetCategoryType;
    amount: number;
    currency: string;
    description?: string;
    institution?: string;
    accountNumberLast4?: string;
    interestRate?: number;
    maturityDate?: string;
    version: number;
  };
  /** 폼 제출 핸들러 */
  onSubmit: (data: CreateAssetFormData & { version?: number }) => Promise<void>;
  /** 닫기 핸들러 */
  onClose: () => void;
  /** 제출 중 상태 */
  isSubmitting?: boolean;
}

export function AssetForm({
  asset,
  onSubmit,
  onClose,
  isSubmitting = false,
}: AssetFormProps) {
  const isEditing = !!asset;
  const [showAdvanced, setShowAdvanced] = useState(
    !!(asset?.institution || asset?.interestRate || asset?.maturityDate)
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<CreateAssetFormData>({
    resolver: zodResolver(createAssetSchema),
    defaultValues: {
      assetName: asset?.assetName ?? "",
      category: asset?.category ?? "bank",
      amount: asset?.amount ?? undefined,
      currency: (asset?.currency as any) ?? "KRW",
      description: asset?.description ?? "",
      institution: asset?.institution ?? "",
      accountNumberLast4: asset?.accountNumberLast4 ?? "",
      interestRate: asset?.interestRate ?? undefined,
      maturityDate: asset?.maturityDate ?? "",
    },
  });

  const watchedCategory = watch("category");
  const watchedAmount = watch("amount");
  const watchedCurrency = watch("currency");

  const handleFormSubmit = async (data: CreateAssetFormData) => {
    await onSubmit({
      ...data,
      ...(isEditing && { version: asset.version }),
    });
  };

  const isLoan = watchedCategory === "loan";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-card shadow-xl">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h2 className="text-lg font-semibold">
            {isEditing ? "자산 수정" : "새 자산 추가"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6">
          <div className="space-y-5">
            {/* 자산 분류 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">분류</label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-5 gap-2">
                    {(Object.keys(ASSET_CATEGORIES) as AssetCategoryType[]).map(
                      (categoryKey) => {
                        const category = ASSET_CATEGORIES[categoryKey];
                        return (
                          <button
                            key={categoryKey}
                            type="button"
                            onClick={() => field.onChange(categoryKey)}
                            className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors ${
                              field.value === categoryKey
                                ? "border-primary bg-primary/10"
                                : "border-input hover:bg-accent"
                            }`}
                          >
                            <div
                              className="flex h-8 w-8 items-center justify-center rounded-full"
                              style={{ backgroundColor: `${category.color}20` }}
                            >
                              <span style={{ color: category.color }}>
                                {CATEGORY_ICONS[categoryKey]}
                              </span>
                            </div>
                            <span className="truncate">{category.label}</span>
                          </button>
                        );
                      }
                    )}
                  </div>
                )}
              />
              {errors.category && (
                <p className="text-xs text-destructive">
                  {errors.category.message}
                </p>
              )}
            </div>

            {/* 자산명 */}
            <div className="space-y-2">
              <label htmlFor="assetName" className="text-sm font-medium">
                {isLoan ? "대출명" : "자산명"}
              </label>
              <input
                id="assetName"
                type="text"
                placeholder={isLoan ? "예: 주택담보대출" : "예: 국민은행 비상금"}
                className={`w-full rounded-lg border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary ${
                  errors.assetName ? "border-destructive" : "border-input"
                }`}
                {...register("assetName")}
              />
              {errors.assetName && (
                <p className="text-xs text-destructive">
                  {errors.assetName.message}
                </p>
              )}
            </div>

            {/* 금액 및 통화 */}
            <div className="space-y-2">
              <label htmlFor="amount" className="text-sm font-medium">
                {isLoan ? "대출 잔액" : "금액"}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {CURRENCY_LABELS[watchedCurrency]?.symbol ?? "₩"}
                  </span>
                  <input
                    id="amount"
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    className={`w-full rounded-lg border bg-background py-3 pl-8 pr-4 text-lg font-semibold outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary ${
                      errors.amount ? "border-destructive" : "border-input"
                    }`}
                    {...register("amount", { valueAsNumber: true })}
                  />
                </div>
                <select
                  className="w-24 rounded-lg border border-input bg-background px-3 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                  {...register("currency")}
                >
                  {Object.entries(CURRENCY_LABELS).map(([code, info]) => (
                    <option key={code} value={code}>
                      {info.name}
                    </option>
                  ))}
                </select>
              </div>
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
              {watchedAmount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatAssetAmount(watchedAmount, watchedCurrency)}
                </p>
              )}
            </div>

            {/* 설명 */}
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                메모 <span className="text-muted-foreground">(선택)</span>
              </label>
              <input
                id="description"
                type="text"
                placeholder="추가 정보를 입력하세요"
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                {...register("description")}
              />
            </div>

            {/* 고급 옵션 토글 */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between rounded-lg border border-input px-4 py-3 text-sm text-muted-foreground hover:bg-accent"
            >
              <span>상세 정보 입력</span>
              <span>{showAdvanced ? "▲" : "▼"}</span>
            </button>

            {/* 고급 옵션 */}
            {showAdvanced && (
              <div className="space-y-4 rounded-lg border border-input bg-muted/30 p-4">
                {/* 금융기관 */}
                <div className="space-y-2">
                  <label htmlFor="institution" className="text-sm font-medium">
                    금융기관
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="institution"
                      type="text"
                      placeholder="예: 국민은행"
                      className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                      {...register("institution")}
                    />
                  </div>
                </div>

                {/* 계좌번호 끝 4자리 */}
                <div className="space-y-2">
                  <label
                    htmlFor="accountNumberLast4"
                    className="text-sm font-medium"
                  >
                    계좌번호 끝 4자리
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="accountNumberLast4"
                      type="text"
                      maxLength={4}
                      placeholder="1234"
                      className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                      {...register("accountNumberLast4")}
                    />
                  </div>
                  {errors.accountNumberLast4 && (
                    <p className="text-xs text-destructive">
                      {errors.accountNumberLast4.message}
                    </p>
                  )}
                </div>

                {/* 이자율 */}
                <div className="space-y-2">
                  <label htmlFor="interestRate" className="text-sm font-medium">
                    {isLoan ? "대출 금리" : "이자율"}
                  </label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="interestRate"
                      type="number"
                      step="0.01"
                      placeholder="예: 3.5"
                      className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                      {...register("interestRate", { valueAsNumber: true })}
                    />
                  </div>
                </div>

                {/* 만기일 */}
                <div className="space-y-2">
                  <label htmlFor="maturityDate" className="text-sm font-medium">
                    만기일
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="maturityDate"
                      type="date"
                      className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                      {...register("maturityDate")}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 버튼 */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-input bg-background py-3 text-sm font-medium transition-colors hover:bg-accent"
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : isEditing ? (
                "수정하기"
              ) : (
                "추가하기"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AssetForm;
