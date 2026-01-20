/**
 * 테마 선택 컴포넌트
 *
 * - 라이트 / 다크 / 시스템 테마 선택
 * - 선택 시 즉시 적용
 * - localStorage에 저장
 */

"use client";

import { useState, useEffect } from "react";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import type { ThemeMode } from "@/types";

interface ThemeSelectorProps {
  /** 현재 테마 */
  value?: ThemeMode;
  /** 테마 변경 콜백 */
  onChange?: (theme: ThemeMode) => void;
  /** 비활성화 */
  disabled?: boolean;
  /** 레이아웃: 가로 또는 세로 */
  layout?: "horizontal" | "vertical";
}

// 테마 옵션
const THEME_OPTIONS: {
  value: ThemeMode;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "light",
    label: "라이트",
    description: "밝은 테마",
    icon: <Sun className="h-5 w-5" />,
  },
  {
    value: "dark",
    label: "다크",
    description: "어두운 테마",
    icon: <Moon className="h-5 w-5" />,
  },
  {
    value: "system",
    label: "시스템",
    description: "기기 설정 따름",
    icon: <Monitor className="h-5 w-5" />,
  },
];

/**
 * 테마 적용 함수
 */
export function applyTheme(theme: ThemeMode): void {
  if (typeof window === "undefined") return;

  const root = document.documentElement;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  // 다크 모드 적용
  if (theme === "dark" || (theme === "system" && systemDark)) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  // localStorage에 저장
  localStorage.setItem("theme", theme);
}

/**
 * 저장된 테마 가져오기
 */
export function getSavedTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem("theme") as ThemeMode) || "system";
}

/**
 * 초기 테마 설정
 */
export function initializeTheme(): void {
  const savedTheme = getSavedTheme();
  applyTheme(savedTheme);
}

export function ThemeSelector({
  value,
  onChange,
  disabled = false,
  layout = "horizontal",
}: ThemeSelectorProps) {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>("system");
  const [mounted, setMounted] = useState(false);

  // 마운트 후 localStorage에서 테마 로드
  useEffect(() => {
    setMounted(true);
    const saved = getSavedTheme();
    setCurrentTheme(saved);
  }, []);

  // 외부 value 동기화
  useEffect(() => {
    if (value !== undefined) {
      setCurrentTheme(value);
    }
  }, [value]);

  // 시스템 테마 변경 감지
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      if (currentTheme === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [currentTheme]);

  const handleSelect = (theme: ThemeMode) => {
    if (disabled) return;

    setCurrentTheme(theme);
    applyTheme(theme);

    if (onChange) {
      onChange(theme);
    }
  };

  // SSR 방지
  if (!mounted) {
    return (
      <div className="flex gap-3">
        {THEME_OPTIONS.map((option) => (
          <div
            key={option.value}
            className="h-20 w-24 animate-pulse rounded-xl bg-muted"
          />
        ))}
      </div>
    );
  }

  // 가로 레이아웃
  if (layout === "horizontal") {
    return (
      <div className="flex flex-wrap gap-3">
        {THEME_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSelect(option.value)}
            disabled={disabled}
            className={`relative flex flex-col items-center gap-2 rounded-xl border-2 px-6 py-4 transition-all ${
              currentTheme === option.value
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-accent"
            } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
            aria-pressed={currentTheme === option.value}
          >
            {/* 선택 표시 */}
            {currentTheme === option.value && (
              <div className="absolute right-2 top-2">
                <Check className="h-4 w-4 text-primary" />
              </div>
            )}

            <span
              className={
                currentTheme === option.value
                  ? "text-primary"
                  : "text-muted-foreground"
              }
            >
              {option.icon}
            </span>
            <span
              className={`text-sm font-medium ${
                currentTheme === option.value ? "text-primary" : "text-foreground"
              }`}
            >
              {option.label}
            </span>
          </button>
        ))}
      </div>
    );
  }

  // 세로 레이아웃 (라디오 버튼 스타일)
  return (
    <div className="space-y-2">
      {THEME_OPTIONS.map((option) => (
        <label
          key={option.value}
          className={`flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-colors ${
            currentTheme === option.value
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-accent"
          } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <input
            type="radio"
            name="theme"
            value={option.value}
            checked={currentTheme === option.value}
            onChange={() => handleSelect(option.value)}
            disabled={disabled}
            className="sr-only"
          />

          {/* 라디오 인디케이터 */}
          <div
            className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
              currentTheme === option.value
                ? "border-primary"
                : "border-muted-foreground/50"
            }`}
          >
            {currentTheme === option.value && (
              <div className="h-2.5 w-2.5 rounded-full bg-primary" />
            )}
          </div>

          {/* 아이콘 */}
          <span
            className={
              currentTheme === option.value
                ? "text-primary"
                : "text-muted-foreground"
            }
          >
            {option.icon}
          </span>

          {/* 텍스트 */}
          <div className="flex-1">
            <p
              className={`font-medium ${
                currentTheme === option.value ? "text-primary" : "text-foreground"
              }`}
            >
              {option.label}
            </p>
            <p className="text-sm text-muted-foreground">{option.description}</p>
          </div>
        </label>
      ))}
    </div>
  );
}

export default ThemeSelector;
