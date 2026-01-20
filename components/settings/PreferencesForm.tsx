/**
 * 환경설정 폼
 *
 * - 테마 선택 (라이트/다크/시스템)
 * - 기본 통화 설정
 * - 기본 결제수단 설정
 */

"use client";

import { useState, useEffect } from "react";
import { Sun, Moon, Monitor, Loader2, Check } from "lucide-react";
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

// localStorage 키
const STORAGE_KEYS = {
  theme: "theme",
  currency: "defaultCurrency",
  paymentMethod: "defaultPaymentMethod",
};

// 테마 적용 함수
function applyTheme(theme: ThemeMode): void {
  if (typeof window === "undefined") return;

  const root = document.documentElement;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (theme === "dark" || (theme === "system" && systemDark)) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  localStorage.setItem(STORAGE_KEYS.theme, theme);
}

// localStorage에서 값 가져오기
function getStoredValue<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  const stored = localStorage.getItem(key);
  return stored ? (stored as T) : defaultValue;
}

export function PreferencesForm() {
  const [mounted, setMounted] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // 로컬 상태
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [currency, setCurrency] = useState<CurrencyCode>("KRW");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");

  // 마운트 시 localStorage에서 값 로드
  useEffect(() => {
    setMounted(true);
    setTheme(getStoredValue(STORAGE_KEYS.theme, "system") as ThemeMode);
    setCurrency(getStoredValue(STORAGE_KEYS.currency, "KRW") as CurrencyCode);
    setPaymentMethod(getStoredValue(STORAGE_KEYS.paymentMethod, "card") as PaymentMethod);
  }, []);

  // 시스템 테마 변경 감지
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  // 테마 변경
  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    applyTheme(newTheme);
    showSaveStatus();
  };

  // 통화 변경
  const handleCurrencyChange = (newCurrency: CurrencyCode) => {
    setCurrency(newCurrency);
    localStorage.setItem(STORAGE_KEYS.currency, newCurrency);
    showSaveStatus();
  };

  // 결제수단 변경
  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
    localStorage.setItem(STORAGE_KEYS.paymentMethod, method);
    showSaveStatus();
  };

  // 저장 상태 표시
  const showSaveStatus = () => {
    setSaveStatus("saving");
    setTimeout(() => {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 300);
  };

  if (!mounted) {
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
                className={`relative flex flex-col items-center gap-2 rounded-xl border-2 px-6 py-4 transition-all ${
                  theme === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-accent"
                }`}
              >
                {theme === option.value && (
                  <div className="absolute right-2 top-2">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                )}
                <span
                  className={
                    theme === option.value
                      ? "text-primary"
                      : "text-muted-foreground"
                  }
                >
                  {option.icon}
                </span>
                <span
                  className={`text-sm font-medium ${
                    theme === option.value
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
            value={currency}
            onChange={(e) =>
              handleCurrencyChange(e.target.value as CurrencyCode)
            }
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
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
            value={paymentMethod}
            onChange={(e) =>
              handlePaymentMethodChange(e.target.value as PaymentMethod)
            }
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
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
        {saveStatus === "saving" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            저장 중...
          </div>
        )}
        {saveStatus === "saved" && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Check className="h-4 w-4" />
            저장됨
          </div>
        )}
      </div>
    </div>
  );
}

export default PreferencesForm;
