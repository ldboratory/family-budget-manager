/**
 * 회원가입 페이지
 *
 * - 이메일, 비밀번호, 이름 입력
 * - 비밀번호 강도 표시
 * - 폼 유효성 검사 (zod + react-hook-form)
 * - 회원가입 성공 시 대시보드로 리다이렉트
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Mail, Lock, User } from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import {
  signUpSchema,
  type SignUpFormData,
  calculatePasswordStrength,
} from "@/lib/validations/auth";

export default function SignUpPage() {
  const router = useRouter();
  const { signUp, signInWithGoogle, isAuthenticated, loading: authLoading } = useAuthContext();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    mode: "onChange",
  });

  // 비밀번호 강도 계산
  const password = watch("password", "");
  const passwordStrength = calculatePasswordStrength(password);

  // 이미 로그인된 경우 리다이렉트
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, authLoading, router]);

  // 폼 제출 핸들러
  const onSubmit = async (data: SignUpFormData) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      await signUp({
        email: data.email,
        password: data.password,
        displayName: data.displayName,
      });
      router.push("/dashboard");
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "회원가입에 실패했습니다"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google 로그인 핸들러
  const handleGoogleSignUp = async () => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Google 로그인에 실패했습니다"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* 헤더 */}
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">회원가입</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            가족 가계부를 시작해보세요
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

        {/* 회원가입 폼 */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 이름 */}
          <div className="space-y-2">
            <label htmlFor="displayName" className="text-sm font-medium">
              이름
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="displayName"
                type="text"
                autoComplete="name"
                placeholder="홍길동"
                className={`w-full rounded-lg border bg-background py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary ${
                  errors.displayName ? "border-destructive" : "border-input"
                }`}
                {...register("displayName")}
              />
            </div>
            {errors.displayName && (
              <p className="text-xs text-destructive">{errors.displayName.message}</p>
            )}
          </div>

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

          {/* 비밀번호 */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              비밀번호
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="8자 이상, 대소문자, 숫자 포함"
                className={`w-full rounded-lg border bg-background py-3 pl-10 pr-12 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary ${
                  errors.password ? "border-destructive" : "border-input"
                }`}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}

            {/* 비밀번호 강도 표시 */}
            {password && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((index) => (
                    <div
                      key={index}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        index <= passwordStrength.score
                          ? passwordStrength.color
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  비밀번호 강도: {passwordStrength.label}
                </p>
              </div>
            )}
          </div>

          {/* 비밀번호 확인 */}
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              비밀번호 확인
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="비밀번호를 다시 입력하세요"
                className={`w-full rounded-lg border bg-background py-3 pl-10 pr-12 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary ${
                  errors.confirmPassword ? "border-destructive" : "border-input"
                }`}
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showConfirmPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* 회원가입 버튼 */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                가입 중...
              </span>
            ) : (
              "회원가입"
            )}
          </button>
        </form>

        {/* 구분선 */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">또는</span>
          </div>
        </div>

        {/* Google 로그인 */}
        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-input bg-background py-3 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google로 계속하기
        </button>

        {/* 로그인 링크 */}
        <p className="text-center text-sm text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-primary hover:underline"
          >
            로그인
          </Link>
        </p>
      </div>
    </main>
  );
}
