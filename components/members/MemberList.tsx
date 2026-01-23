/**
 * 멤버 목록 컴포넌트
 *
 * - 멤버 목록 (이름, 이메일, 역할)
 * - 역할 변경 (owner만)
 * - 멤버 삭제 (owner만)
 */

"use client";

import { useState } from "react";
import {
  Crown,
  Shield,
  User,
  Eye,
  MoreVertical,
  UserMinus,
  ChevronDown,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { HouseholdMember, UserRole } from "@/types";

interface MemberListProps {
  members: HouseholdMember[];
  currentUserId: string;
  currentUserRole?: UserRole;
  isOwner: boolean;
  isLoading?: boolean;
  onRemove: (userId: string) => void;
  onRoleChange: (userId: string, role: UserRole) => void;
  isRemoving?: boolean;
  isChangingRole?: boolean;
}

// 역할 레이블 및 아이콘
const ROLE_INFO: Record<
  UserRole,
  { label: string; icon: React.ReactNode; color: string }
> = {
  owner: {
    label: "소유자",
    icon: <Crown className="h-4 w-4" />,
    color: "text-yellow-600 bg-yellow-100",
  },
  admin: {
    label: "관리자",
    icon: <Shield className="h-4 w-4" />,
    color: "text-blue-600 bg-blue-100",
  },
  member: {
    label: "멤버",
    icon: <User className="h-4 w-4" />,
    color: "text-green-600 bg-green-100",
  },
  viewer: {
    label: "조회자",
    icon: <Eye className="h-4 w-4" />,
    color: "text-gray-600 bg-gray-100",
  },
};

// 날짜 포맷팅
function formatJoinDate(timestamp: any): string {
  const date =
    timestamp?.toDate?.() ||
    (typeof timestamp === "number" ? new Date(timestamp) : new Date(timestamp));
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function MemberList({
  members,
  currentUserId,
  currentUserRole: _currentUserRole,
  isOwner,
  isLoading = false,
  onRemove,
  onRoleChange,
  isRemoving = false,
  isChangingRole = false,
}: MemberListProps) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [roleMenuOpen, setRoleMenuOpen] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-3 w-32 rounded bg-muted" />
              </div>
              <div className="h-6 w-16 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground opacity-30" />
        <p className="mt-4 text-muted-foreground">멤버가 없습니다</p>
      </div>
    );
  }

  // owner가 먼저 오도록 정렬
  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder: Record<UserRole, number> = {
      owner: 0,
      admin: 1,
      member: 2,
      viewer: 3,
    };
    return roleOrder[a.role] - roleOrder[b.role];
  });

  return (
    <div className="space-y-3">
      {sortedMembers.map((member) => {
        const roleInfo = ROLE_INFO[member.role];
        const isCurrentUser = member.uid === currentUserId;
        const canManage = isOwner && !isCurrentUser && member.role !== "owner";

        return (
          <div
            key={member.uid}
            className="group rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/30"
          >
            <div className="flex items-center gap-4">
              {/* 아바타 */}
              <div className="relative">
                {member.avatar ? (
                  <img
                    src={member.avatar}
                    alt={member.displayName}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-medium text-primary">
                    {member.displayName.charAt(0)}
                  </div>
                )}
                {member.role === "owner" && (
                  <div className="absolute -bottom-1 -right-1 rounded-full bg-yellow-400 p-1">
                    <Crown className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>

              {/* 정보 */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-medium">
                    {member.displayName}
                    {isCurrentUser && (
                      <span className="ml-1 text-xs text-muted-foreground">(나)</span>
                    )}
                  </h3>
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {member.email}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatJoinDate(member.joinedAt)} 참여
                </p>
              </div>

              {/* 역할 뱃지 / 역할 변경 */}
              <div className="relative flex-shrink-0">
                {canManage ? (
                  <button
                    onClick={() =>
                      setRoleMenuOpen(
                        roleMenuOpen === member.uid ? null : member.uid
                      )
                    }
                    className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${roleInfo.color}`}
                    disabled={isChangingRole}
                  >
                    {roleInfo.icon}
                    {roleInfo.label}
                    <ChevronDown className="h-3 w-3" />
                  </button>
                ) : (
                  <span
                    className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${roleInfo.color}`}
                  >
                    {roleInfo.icon}
                    {roleInfo.label}
                  </span>
                )}

                {/* 역할 변경 드롭다운 */}
                {roleMenuOpen === member.uid && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setRoleMenuOpen(null)}
                    />
                    <div className="absolute right-0 top-full z-20 mt-1 w-32 rounded-lg border border-border bg-card py-1 shadow-lg">
                      {(["admin", "member", "viewer"] as UserRole[]).map(
                        (role) => (
                          <button
                            key={role}
                            onClick={() => {
                              onRoleChange(member.uid, role);
                              setRoleMenuOpen(null);
                            }}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-accent ${
                              member.role === role
                                ? "bg-accent font-medium"
                                : ""
                            }`}
                          >
                            {ROLE_INFO[role].icon}
                            {ROLE_INFO[role].label}
                          </button>
                        )
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* 액션 메뉴 */}
              {canManage && (
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() =>
                      setMenuOpen(menuOpen === member.uid ? null : member.uid)
                    }
                    className="rounded-lg p-2 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
                    aria-label="메뉴"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {menuOpen === member.uid && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setMenuOpen(null)}
                      />
                      <div className="absolute right-0 top-full z-20 mt-1 w-32 rounded-lg border border-border bg-card py-1 shadow-lg">
                        <button
                          onClick={() => {
                            setMenuOpen(null);
                            setConfirmRemove(member.uid);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
                        >
                          <UserMinus className="h-4 w-4" />
                          내보내기
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 삭제 확인 */}
            {confirmRemove === member.uid && (
              <div className="mt-4 rounded-lg bg-destructive/10 p-3">
                <p className="text-sm text-destructive">
                  {member.displayName}님을 가계부에서 내보내시겠습니까?
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setConfirmRemove(null)}
                    className="flex-1 rounded-lg border border-input bg-background py-2 text-sm hover:bg-accent"
                    disabled={isRemoving}
                  >
                    취소
                  </button>
                  <button
                    onClick={() => {
                      onRemove(member.uid);
                      setConfirmRemove(null);
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-destructive py-2 text-sm text-destructive-foreground hover:bg-destructive/90"
                    disabled={isRemoving}
                  >
                    {isRemoving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        처리 중...
                      </>
                    ) : (
                      "내보내기"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default MemberList;
