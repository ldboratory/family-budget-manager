/**
 * 멤버 관리 페이지
 *
 * - 멤버 목록 표시
 * - 멤버 초대 (owner/admin만)
 * - 멤버 역할 변경 (owner만)
 * - 멤버 제거 (owner만)
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  UserPlus,
  Users,
  Loader2,
  AlertCircle,
  Info,
} from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { MemberList } from "@/components/members/MemberList";
import type { UserRole, HouseholdMember } from "@/types";

export default function MembersPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuthContext();

  // 상태
  const [error, setError] = useState<string | null>(null);

  // 인증 체크
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login?redirect=/settings/members");
    }
  }, [authLoading, isAuthenticated, router]);

  // 현재 사용자를 기본 멤버(owner)로 표시
  const membersData = useMemo(() => {
    if (!user) return null;

    const currentUserMember: HouseholdMember = {
      uid: user.uid,
      role: "owner" as UserRole,
      joinedAt: Timestamp.now(),
      displayName: user.displayName || "사용자",
      email: user.email || "",
      avatar: undefined,
    };

    return {
      members: [currentUserMember],
      currentUserRole: "owner" as UserRole,
      isOwner: true,
    };
  }, [user]);

  // 멤버 제거 핸들러 (임시)
  const handleRemove = async (_userId: string) => {
    setError(null);
    alert("멤버 제거 기능은 아직 준비 중입니다.");
  };

  // 역할 변경 핸들러 (임시)
  const handleRoleChange = async (_userId: string, role: UserRole) => {
    setError(null);
    alert(`역할 변경 기능은 아직 준비 중입니다.\n변경하려는 역할: ${role}`);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/settings")}
              className="rounded-lg p-2 hover:bg-accent"
              aria-label="뒤로가기"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-semibold">멤버 관리</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* 초대 버튼 */}
            <button
              onClick={() => alert("멤버 초대 기능은 아직 준비 중입니다.")}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              <UserPlus className="h-4 w-4" />
              초대
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* 안내 메시지 */}
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-blue-50 p-4 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
          <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">멤버 관리 기능 준비 중</p>
            <p className="text-sm opacity-80">
              현재는 본인만 표시됩니다. 추후 가족 구성원을 초대하고 관리할 수 있습니다.
            </p>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* 멤버 수 */}
        <div className="mb-6 flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {membersData?.members.length ?? 0}명의 멤버
          </span>
        </div>

        {/* 멤버 목록 */}
        <MemberList
          members={membersData?.members ?? []}
          currentUserId={user.uid}
          currentUserRole={membersData?.currentUserRole}
          isOwner={membersData?.isOwner ?? false}
          isLoading={false}
          onRemove={handleRemove}
          onRoleChange={handleRoleChange}
          isRemoving={false}
          isChangingRole={false}
        />

        {/* 권한 안내 */}
        <div className="mt-8 rounded-lg bg-muted/50 p-4">
          <h3 className="text-sm font-medium">권한 안내</h3>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            <li>
              <strong>소유자 (Owner):</strong> 모든 권한 (멤버 관리, 설정 변경, 가계부 삭제)
            </li>
            <li>
              <strong>관리자 (Admin):</strong> 멤버 초대, 거래/자산 관리
            </li>
            <li>
              <strong>멤버 (Member):</strong> 거래/자산 조회 및 입력
            </li>
            <li>
              <strong>조회자 (Viewer):</strong> 조회만 가능
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
