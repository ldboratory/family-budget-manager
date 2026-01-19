/**
 * 환경설정 폼
 *
 * - 테마 선택 (라이트/다크/시스템)
 * - 기본 통화 설정
 * - 기본 결제수단 설정
 */

"use client";

import { useEffect } from "react";
import { Sun, Moon, Monitor, Loader2 } from "lucide-react";
import {
  usePreferences,
  useUpdatePreferences,
  applyTheme,
} from "@/hooks/usePreferences";
import type { ThemeMode, CurrencyCode, PaymentMethod } from "@/types";

// 테마 옵션
const THEME_OPTIONS: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { value: "light", label: "라이트", icon: <Sun className="h-5 w-5" /> },
  { value: "dark", label: "다크", icon: <Moon className="h-5 w-5" /> },
  { value: "system", label: "시스템", icon: <Monitor className="h-5 w-5" /> },
];

// 통화 옵션
const CURRENCY_OPTIONS: { value: CurrencyCode; label: string; symbol: string }[] = [
  { value: "KRW", label: "한국 원", symbol: "₩" },
  { value: "USD", label: "미국 달러", symbol: "$" },
  { value: "EUR", label: "유로", symbol: "€" },
  { value: "JPY", label: "일본 엔", symbol: "¥" },
  { value: "CNY", label: "중국 위안", symbol: "¥" },
];

// 결제수단 옵션
const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "card", label: "카드" },
  { value: "cash", label: "현금" },
  { value: "bank_transfer", label: "계좌이체" },
  { value: "other", label: "기타" },
];

export function PreferencesForm() {
  const { data: preferences, isLoading } = usePreferences();
  const updatePreferences = useUpdatePreferences();

  // 테마 변경 시 즉시 적용
  useEffect(() => {
    if (preferences?.theme) {
      applyTheme(preferences.theme);
    }
  }, [preferences?.theme]);

  // 테마 변경
  const handleThemeChange = async (theme: ThemeMode) => {
    try {
      await updatePreferences.mutateAsync({ theme });
      applyTheme(theme);
    } catch (error) {
      // 에러는 mutation에서 처리
    }
  };

  // 통화 변경
  const handleCurrencyChange = async (currency: CurrencyCode) => {
    try {
      await updatePreferences.mutateAsync({ defaultCurrency: currency });
    } catch (error) {
      // 에러는 mutation에서 처리
    }
  };

  // 결제수단 변경
  const handlePaymentMethodChange = async (method: PaymentMethod) => {
    try {
      await updatePreferences.mutateAsync({ defaultPaymentMethod: method });
    } catch (error) {
      // 에러는 mutation에서 처리
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-5 w-24 rounded bg-muted" />
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 w-24 rounded-lg bg-muted" />
            ))}
          </div>
          <div className="h-5 w-24 rounded bg-muted" />
          <div className="h-12 w-full rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-6 text-lg font-semibold">환경설정</h3>

      <div className="space-y-8">
        {/* 테마 설정 */}
        <div className="space-y-3">
          <label className="text-sm font-medium">테마</label>
          <div className="flex flex-wrap gap-3">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleThemeChange(option.value)}
                disabled={updatePreferences.isPending}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 px-6 py-4 transition-all ${
                  preferences?.theme === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-accent"
                }`}
              >
                <span
                  className={
                    preferences?.theme === option.value
                      ? "text-primary"
                      : "text-muted-foreground"
                  }
                >
                  {option.icon}
                </span>
                <span
                  className={`text-sm font-medium ${
                    preferences?.theme === option.value
                      ? "text-primary"
                      : "text-foreground"
                  }`}
                >
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 기본 통화 설정 */}
        <div className="space-y-3">
          <label htmlFor="currency" className="text-sm font-medium">
            기본 통화
          </label>
          <select
            id="currency"
            value={preferences?.defaultCurrency ?? "KRW"}
            onChange={(e) =>
              handleCurrencyChange(e.target.value as CurrencyCode)
            }
            disabled={updatePreferences.isPending}
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
          >
            {CURRENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.symbol} {option.label} ({option.value})
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            새로운 거래 입력 시 기본으로 사용될 통화입니다
          </p>
        </div>

        {/* 기본 결제수단 설정 */}
        <div className="space-y-3">
          <label htmlFor="paymentMethod" className="text-sm font-medium">
            기본 결제수단
          </label>
          <select
            id="paymentMethod"
            value={preferences?.defaultPaymentMethod ?? "card"}
            onChange={(e) =>
              handlePaymentMethodChange(e.target.value as PaymentMethod)
            }
            disabled={updatePreferences.isPending}
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
          >
            {PAYMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            새로운 거래 입력 시 기본으로 선택될 결제수단입니다
          </p>
        </div>

        {/* 저장 상태 표시 */}
        {updatePreferences.isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            저장 중...
          </div>
        )}
      </div>
    </div>
  );
}

export default PreferencesForm;
