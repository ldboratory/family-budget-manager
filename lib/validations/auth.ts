/**
 * 인증 관련 Zod 스키마
 *
 * 회원가입, 로그인 폼의 유효성 검사 규칙을 정의합니다.
 */

import { z } from "zod";

/**
 * 비밀번호 유효성 검사 규칙
 * - 최소 8자
 * - 대문자 1개 이상
 * - 소문자 1개 이상
 * - 숫자 1개 이상
 */
export const passwordSchema = z
  .string()
  .min(8, "비밀번호는 최소 8자 이상이어야 합니다")
  .regex(/[A-Z]/, "대문자를 1개 이상 포함해야 합니다")
  .regex(/[a-z]/, "소문자를 1개 이상 포함해야 합니다")
  .regex(/[0-9]/, "숫자를 1개 이상 포함해야 합니다");

/**
 * 이메일 유효성 검사 규칙
 */
export const emailSchema = z
  .string()
  .min(1, "이메일을 입력해주세요")
  .email("올바른 이메일 형식이 아닙니다");

/**
 * 표시 이름 유효성 검사 규칙
 */
export const displayNameSchema = z
  .string()
  .min(2, "이름은 최소 2자 이상이어야 합니다")
  .max(20, "이름은 최대 20자까지 가능합니다")
  .regex(/^[가-힣a-zA-Z\s]+$/, "한글, 영문만 입력 가능합니다");

/**
 * 회원가입 폼 스키마
 */
export const signUpSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "비밀번호 확인을 입력해주세요"),
    displayName: displayNameSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
  });

/**
 * 로그인 폼 스키마
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

/**
 * 비밀번호 재설정 요청 스키마
 */
export const resetPasswordSchema = z.object({
  email: emailSchema,
});

/**
 * 타입 추출
 */
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

/**
 * 비밀번호 강도 계산
 *
 * @param password 비밀번호
 * @returns 강도 (0-4)
 */
export function calculatePasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  // 0-6 점수를 0-4로 변환
  const normalizedScore = Math.min(Math.floor(score / 1.5), 4);

  const labels = ["매우 약함", "약함", "보통", "강함", "매우 강함"];
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-green-500",
  ];

  return {
    score: normalizedScore,
    label: labels[normalizedScore] ?? "매우 약함",
    color: colors[normalizedScore] ?? "bg-red-500",
  };
}
