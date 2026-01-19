/**
 * 멤버 관리 페이지
 *
 * - 멤버 목록 표시
 * - 멤버 초대 (owner/admin만)
 * - 멤버 역할 변경 (owner만)
 * - 멤버 제거 (owner만)
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  UserPlus,
  Users,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { MemberList } from "@/components/members/MemberList";
import { InviteModal } from "@/components/members/InviteModal";
import {
  useMembers,
  useInvites,
  useInviteMember,
  useRemoveMember,
  useUpdateMemberRole,
  useRegenerateInviteCode,
} from "@/hooks/useMembers";
import type { UserRole } from "@/types";

// 임시 household ID (실제로는 context나 params에서)
const DEMO_HOUSEHOLD_ID = "demo-household";

export default function MembersPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuthContext();

  // 상태
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 데이터 조회
  const {
    data: membersData,
    isLoading: isLoadingMembers,
    error: membersError,
    refetch: refetchMembers,
  } = useMembers(DEMO_HOUSEHOLD_ID, isAuthenticated);

  const {
    data: invitesData,
    isLoading: isLoadingInvites,
    refetch: refetchInvites,
  } = useInvites(DEMO_HOUSEHOLD_ID, isAuthenticated && membersData?.isOwner);

  // Mutations
  const inviteMutation = useInviteMember();
  const removeMutation = useRemoveMember();
  const updateRoleMutation = useUpdateMemberRole();
  const regenerateCodeMutation = useRegenerateInviteCode();

  // 인증 체크
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login?redirect=/settings/members");
    }
  }, [authLoading, isAuthenticated, router]);

  // 멤버 초대 핸들러
  const handleInvite = async (email: string, role: UserRole) => {
    setError(null);
    try {
      const result = await inviteMutation.mutateAsync({
        householdId: DEMO_HOUSEHOLD_ID,
        email,
        role: role as "member" | "admin",
      });
      refetchInvites();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "초대에 실패했습니다";
      setError(message);
      throw err;
    }
  };

  // 멤버 제거 핸들러
  const handleRemove = async (userId: string) => {
    setError(null);
    try {
      await removeMutation.mutateAsync({
        householdId: DEMO_HOUSEHOLD_ID,
        userId,
      });
      refetchMembers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "멤버 제거에 실패했습니다";
      setError(message);
    }
  };

  // 역할 변경 핸들러
  const handleRoleChange = async (userId: string, role: UserRole) => {
    setError(null);
    try {
      await updateRoleMutation.mutateAsync({
        householdId: DEMO_HOUSEHOLD_ID,
        userId,
        role: role as "admin" | "member" | "viewer",
      });
      refetchMembers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "역할 변경에 실패했습니다";
      setError(message);
    }
  };

  // 초대 코드 재생성 핸들러
  const handleRegenerateCode = async () => {
    setError(null);
    try {
      const result = await regenerateCodeMutation.mutateAsync(DEMO_HOUSEHOLD_ID);
      refetchInvites();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "초대 코드 재생성에 실패했습니다";
      setError(message);
      throw err;
    }
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

  const canInvite =
    membersData?.currentUserRole === "owner" ||
    membersData?.currentUserRole === "admin";

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-lg p-2 hover:bg-accent"
              aria-label="뒤로가기"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-semibold">멤버 관리</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* 새로고침 */}
            <button
              onClick={() => {
                refetchMembers();
                refetchInvites();
              }}
              className="rounded-lg p-2 hover:bg-accent"
              aria-label="새로고침"
            >
              <RefreshCw
                className={`h-5 w-5 ${isLoadingMembers ? "animate-spin" : ""}`}
              />
            </button>
            {/* 초대 버튼 */}
            {canInvite && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
              >
                <UserPlus className="h-4 w-4" />
                초대
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* 에러 메시지 */}
        {(error || membersError) && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">
              {error || (membersError instanceof Error ? membersError.message : "오류가 발생했습니다")}
            </p>
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
          isLoading={isLoadingMembers}
          onRemove={handleRemove}
          onRoleChange={handleRoleChange}
          isRemoving={removeMutation.isPending}
          isChangingRole={updateRoleMutation.isPending}
        />

        {/* 권한 안내 */}
        {!isLoadingMembers && !membersData?.isOwner && (
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
        )}
      </main>

      {/* 초대 모달 */}
      {showInviteModal && (
        <InviteModal
          householdId={DEMO_HOUSEHOLD_ID}
          householdInviteCode={invitesData?.householdInviteCode}
          householdInviteCodeExpiresAt={
            typeof invitesData?.householdInviteCodeExpiresAt === "string"
              ? new Date(invitesData.householdInviteCodeExpiresAt)
              : invitesData?.householdInviteCodeExpiresAt?.toDate?.()
          }
          pendingInvites={invitesData?.invites}
          onClose={() => setShowInviteModal(false)}
          onInviteByEmail={handleInvite}
          onRegenerateCode={handleRegenerateCode}
          isInviting={inviteMutation.isPending}
          isRegenerating={regenerateCodeMutation.isPending}
        />
      )}
    </div>
  );
}
