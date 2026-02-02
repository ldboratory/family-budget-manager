/**
 * 초대 코드 가입 페이지
 *
 * - 초대 정보 표시
 * - 로그인 후 가계부 참여
 * - URL: /invite?code=XXXXX
 */

"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Wallet,
  Users,
  Loader2,
  AlertCircle,
  Check,
  LogIn,
} from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useInviteInfo, useJoinByInviteCode } from "@/hooks/useMembers";

function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("code") ?? "";
  const { user, isAuthenticated, loading: authLoading } = useAuthContext();

  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 초대 정보 조회
  const {
    data: inviteInfo,
    isLoading: isLoadingInfo,
    error: infoError,
  } = useInviteInfo(inviteCode);

  // 가입 mutation
  const joinMutation = useJoinByInviteCode();

  // 가입 핸들러
  const handleJoin = async () => {
    setError(null);
    try {
      await joinMutation.mutateAsync(inviteCode);
      setJoined(true);
      // 3초 후 대시보드로 이동
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "가입에 실패했습니다";
      setError(message);
    }
  };

  // 초대 코드가 없는 경우
  if (!inviteCode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="mt-6 text-2xl font-bold">초대 코드가 없습니다</h1>
          <p className="mt-2 text-muted-foreground">
            유효한 초대 링크를 사용해주세요
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // 성공 화면
  if (joined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="mt-6 text-2xl font-bold">가입 완료!</h1>
          <p className="mt-2 text-muted-foreground">
            {inviteInfo?.householdName} 가계부에 참여했습니다
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            잠시 후 대시보드로 이동합니다...
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            대시보드로 이동
          </Link>
        </div>
      </div>
    );
  }

  // 로딩 중
  if (authLoading || isLoadingInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 에러 (잘못된 초대 코드)
  if (infoError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="mt-6 text-2xl font-bold">유효하지 않은 초대</h1>
          <p className="mt-2 text-muted-foreground">
            {infoError instanceof Error
              ? infoError.message
              : "초대 코드가 만료되었거나 잘못되었습니다"}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* 헤더 */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Wallet className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mt-6 text-2xl font-bold">가계부 초대</h1>
        </div>

        {/* 초대 정보 카드 */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold">{inviteInfo?.householdName}</h2>
            <div className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{inviteInfo?.memberCount}명의 멤버</span>
            </div>
            {inviteInfo?.createdBy && (
              <p className="mt-2 text-sm text-muted-foreground">
                {inviteInfo.createdBy}님이 초대했습니다
              </p>
            )}
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="mt-6">
            {isAuthenticated ? (
              <button
                onClick={handleJoin}
                disabled={joinMutation.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {joinMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    가입 중...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    가계부 참여하기
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-center text-sm text-muted-foreground">
                  가계부에 참여하려면 로그인이 필요합니다
                </p>
                <Link
                  href={`/auth/login?redirect=/invite?code=${inviteCode}`}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <LogIn className="h-4 w-4" />
                  로그인하고 참여하기
                </Link>
                <Link
                  href={`/auth/signup?redirect=/invite?code=${inviteCode}`}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-input bg-background py-3 text-sm font-medium hover:bg-accent"
                >
                  계정이 없으신가요? 회원가입
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* 현재 로그인 정보 */}
        {isAuthenticated && user && (
          <div className="mt-4 rounded-lg bg-muted/50 p-4 text-center text-sm text-muted-foreground">
            <span>{user.email}</span>로 가입합니다
          </div>
        )}
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <InviteContent />
    </Suspense>
  );
}
