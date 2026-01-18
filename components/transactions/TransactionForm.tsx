/**
 * 거래 추가/수정 폼
 *
 * - 수입/지출 유형 선택
 * - 금액, 카테고리, 날짜, 결제수단, 설명 입력
 * - 폼 검증 (react-hook-form + zod)
 */

"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  X,
  Loader2,
  Calendar,
  Tag,
  CreditCard,
  FileText,
  Store,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  createTransactionSchema,
  type CreateTransactionFormData,
  PAYMENT_METHOD_LABELS,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  formatCurrency,
} from "@/lib/validations/transaction";

interface TransactionFormProps {
  /** 수정할 거래 (없으면 새로 생성) */
  transaction?: {
    id: string;
    type: "income" | "expense";
    amount: number;
    categoryId: string;
    description: string;
    date: string;
    paymentMethod: string;
    merchant?: string;
    tags?: string[];
    version: number;
  };
  /** 폼 제출 핸들러 */
  onSubmit: (data: CreateTransactionFormData & { version?: number }) => Promise<void>;
  /** 닫기 핸들러 */
  onClose: () => void;
  /** 제출 중 상태 */
  isSubmitting?: boolean;
}

export function TransactionForm({
  transaction,
  onSubmit,
  onClose,
  isSubmitting = false,
}: TransactionFormProps) {
  const isEditing = !!transaction;
  const [selectedType, setSelectedType] = useState<"income" | "expense">(
    transaction?.type ?? "expense"
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateTransactionFormData>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      type: transaction?.type ?? "expense",
      amount: transaction?.amount ?? undefined,
      categoryId: transaction?.categoryId ?? "",
      description: transaction?.description ?? "",
      date: transaction?.date ?? new Date().toISOString().split("T")[0],
      paymentMethod: (transaction?.paymentMethod as any) ?? "cash",
      merchant: transaction?.merchant ?? "",
      tags: transaction?.tags ?? [],
    },
  });

  const watchedType = watch("type");
  const watchedAmount = watch("amount");

  // 타입 변경 시 카테고리 초기화
  useEffect(() => {
    if (watchedType !== selectedType) {
      setSelectedType(watchedType);
      setValue("categoryId", "");
    }
  }, [watchedType, selectedType, setValue]);

  const categories =
    selectedType === "income"
      ? DEFAULT_INCOME_CATEGORIES
      : DEFAULT_EXPENSE_CATEGORIES;

  const handleFormSubmit = async (data: CreateTransactionFormData) => {
    await onSubmit({
      ...data,
      ...(isEditing && { version: transaction.version }),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-card shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">
            {isEditing ? "거래 수정" : "새 거래 추가"}
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
            {/* 수입/지출 선택 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">유형</label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => field.onChange("expense")}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-colors ${
                        field.value === "expense"
                          ? "border-red-500 bg-red-500/10 text-red-600"
                          : "border-input hover:bg-accent"
                      }`}
                    >
                      <TrendingDown className="h-4 w-4" />
                      지출
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange("income")}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-colors ${
                        field.value === "income"
                          ? "border-green-500 bg-green-500/10 text-green-600"
                          : "border-input hover:bg-accent"
                      }`}
                    >
                      <TrendingUp className="h-4 w-4" />
                      수입
                    </button>
                  </div>
                )}
              />
            </div>

            {/* 금액 */}
            <div className="space-y-2">
              <label htmlFor="amount" className="text-sm font-medium">
                금액
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ₩
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
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
              {watchedAmount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(watchedAmount)}
                </p>
              )}
            </div>

            {/* 카테고리 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">카테고리</label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-5 gap-2">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => field.onChange(category.id)}
                        className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors ${
                          field.value === category.id
                            ? "border-primary bg-primary/10"
                            : "border-input hover:bg-accent"
                        }`}
                      >
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${category.color}20` }}
                        >
                          <span style={{ color: category.color }}>
                            {category.name.charAt(0)}
                          </span>
                        </div>
                        <span className="truncate">{category.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              />
              {errors.categoryId && (
                <p className="text-xs text-destructive">
                  {errors.categoryId.message}
                </p>
              )}
            </div>

            {/* 날짜 */}
            <div className="space-y-2">
              <label htmlFor="date" className="text-sm font-medium">
                날짜
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="date"
                  type="date"
                  className={`w-full rounded-lg border bg-background py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary ${
                    errors.date ? "border-destructive" : "border-input"
                  }`}
                  {...register("date")}
                />
              </div>
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date.message}</p>
              )}
            </div>

            {/* 결제수단 */}
            <div className="space-y-2">
              <label htmlFor="paymentMethod" className="text-sm font-medium">
                결제수단
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  id="paymentMethod"
                  className={`w-full appearance-none rounded-lg border bg-background py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary ${
                    errors.paymentMethod ? "border-destructive" : "border-input"
                  }`}
                  {...register("paymentMethod")}
                >
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 내용/설명 */}
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                내용
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  id="description"
                  type="text"
                  placeholder="거래 내용을 입력하세요"
                  className={`w-full rounded-lg border bg-background py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary ${
                    errors.description ? "border-destructive" : "border-input"
                  }`}
                  {...register("description")}
                />
              </div>
              {errors.description && (
                <p className="text-xs text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* 거래처 (선택) */}
            <div className="space-y-2">
              <label htmlFor="merchant" className="text-sm font-medium">
                거래처 <span className="text-muted-foreground">(선택)</span>
              </label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="merchant"
                  type="text"
                  placeholder="상호명"
                  className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                  {...register("merchant")}
                />
              </div>
            </div>
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

export default TransactionForm;
