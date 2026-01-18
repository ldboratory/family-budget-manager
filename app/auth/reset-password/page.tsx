/**
 * 비밀번호 재설정 요청 페이지
 *
 * 이메일을 입력받아 비밀번호 재설정 링크를 발송합니다.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import {
  resetPasswordSchema,
  type ResetPasswordFormData,
} from "@/lib/validations/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { resetPassword } = useAuthContext();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  // 폼 제출 핸들러
  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      await resetPassword(data.email);
      // 로그인 페이지로 리다이렉트 (성공 메시지 표시)
      router.push("/auth/login?reset=sent");
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "비밀번호 재설정 이메일 발송에 실패했습니다"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* 뒤로가기 */}
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          로그인으로 돌아가기
        </Link>

        {/* 헤더 */}
        <header>
          <h1 className="text-2xl font-bold tracking-tight">비밀번호 재설정</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
          </p>
        </header>

        {/* 에러 메시지 */}
        {serverError && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
          >
            {serverError}
          </div>
        )}

        {/* 폼 */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 이메일 */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              이메일
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="example@email.com"
                className={`w-full rounded-lg border bg-background py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary ${
                  errors.email ? "border-destructive" : "border-input"
                }`}
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                발송 중...
              </span>
            ) : (
              "재설정 링크 보내기"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
