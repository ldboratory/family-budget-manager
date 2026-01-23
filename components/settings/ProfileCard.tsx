/**
 * 프로필 카드 컴포넌트
 *
 * 현재 로그인한 사용자 정보를 표시합니다.
 * - 프로필 사진
 * - 이름
 * - 이메일
 * - 로그인 방식 (Google, 이메일 등)
 */

"use client";

import { User, Mail, Shield } from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useProfile } from "@/hooks/usePreferences";

interface ProfileCardProps {
  /** 컴팩트 모드 */
  compact?: boolean;
  /** 클릭 이벤트 */
  onClick?: () => void;
}

export function ProfileCard({ compact = false, onClick }: ProfileCardProps) {
  const { user, firebaseUser } = useAuthContext();
  const { data: profile, isLoading } = useProfile();

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 rounded bg-muted" />
            <div className="h-4 w-48 rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // 로그인 제공자 확인
  const getProviderInfo = () => {
    const providerData = firebaseUser?.providerData?.[0];
    if (!providerData) return { name: "이메일", icon: "email" };

    switch (providerData.providerId) {
      case "google.com":
        return { name: "Google", icon: "google" };
      case "password":
        return { name: "이메일", icon: "email" };
      default:
        return { name: providerData.providerId, icon: "email" };
    }
  };

  const provider = getProviderInfo();
  const displayName = profile?.displayName || user.displayName || "사용자";
  const email = profile?.email || user.email || "";
  const avatar = profile?.avatar || firebaseUser?.photoURL;

  // 컴팩트 모드
  if (compact) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent"
      >
        {avatar ? (
          <img
            src={avatar}
            alt={displayName}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-medium">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        {/* 아바타 */}
        <div className="relative">
          {avatar ? (
            <img
              src={avatar}
              alt={displayName}
              className="h-20 w-20 rounded-full object-cover ring-4 ring-background"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-4 ring-background">
              <User className="h-10 w-10 text-primary" />
            </div>
          )}
          {/* 로그인 제공자 뱃지 */}
          {provider.name === "Google" && (
            <div className="absolute -bottom-1 -right-1 rounded-full bg-white p-1.5 shadow-md dark:bg-gray-800">
              <svg className="h-4 w-4" viewBox="0 0 24 24">
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
            </div>
          )}
        </div>

        {/* 정보 */}
        <div className="flex-1 space-y-3 text-center sm:text-left">
          <div>
            <h3 className="text-xl font-semibold">{displayName}</h3>
            <div className="mt-1 flex items-center justify-center gap-2 text-sm text-muted-foreground sm:justify-start">
              <Mail className="h-4 w-4" />
              <span>{email}</span>
            </div>
          </div>

          {/* 추가 정보 */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            {/* 역할 */}
            {profile?.role && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                <Shield className="h-3 w-3" />
                {profile.role === "owner"
                  ? "소유자"
                  : profile.role === "admin"
                  ? "관리자"
                  : "멤버"}
              </span>
            )}

            {/* 로그인 방식 */}
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-400">
              {provider.name}로 로그인
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileCard;
