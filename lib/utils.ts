/**
 * 공통 유틸리티 함수
 * - shadcn/ui 컴포넌트에서 사용하는 cn 함수
 * - 기타 헬퍼 함수
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind CSS 클래스를 조건부로 결합하는 함수
 * clsx로 조건부 클래스를 처리하고 twMerge로 충돌을 해결
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
