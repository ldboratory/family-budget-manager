/**
 * 멤버 관리 TanStack Query Hooks
 *
 * 멤버 목록 조회, 초대, 제거, 역할 변경을 위한 React Query 훅입니다.
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/components/auth/AuthProvider";
import type { HouseholdMember, Invite, UserRole } from "@/types";

// =====================================================
// Query Keys
// =====================================================

export const memberKeys = {
  all: ["members"] as const,
  list: (householdId: string) => [...memberKeys.all, "list", householdId] as const,
  invites: (householdId: string) => [...memberKeys.all, "invites", householdId] as const,
};

// =====================================================
// API 호출 헬퍼
// =====================================================

async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
  user: { uid: string; email: string | null; displayName: string | null }
) {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  headers.set("x-user-id", user.uid);
  if (user.email) headers.set("x-user-email", user.email);
  if (user.displayName) headers.set("x-user-name", user.displayName);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "요청에 실패했습니다");
  }

  return data;
}

// =====================================================
// useMembers - 멤버 목록 조회
// =====================================================

interface UseMembersResult {
  members: HouseholdMember[];
  currentUserRole: UserRole | undefined;
  isOwner: boolean;
}

export function useMembers(householdId: string, enabled = true) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: memberKeys.list(householdId),
    queryFn: async (): Promise<UseMembersResult> => {
      if (!user) throw new Error("로그인이 필요합니다");

      const data = await fetchWithAuth(
        `/api/households/${householdId}/members`,
        { method: "GET" },
        user
      );

      return data.data;
    },
    enabled: enabled && !!householdId && !!user,
  });
}

// =====================================================
// useInvites - 초대 목록 조회
// =====================================================

interface UseInvitesResult {
  invites: Invite[];
  householdInviteCode: string;
  householdInviteCodeExpiresAt: { toDate: () => Date } | string;
}

export function useInvites(householdId: string, enabled = true) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: memberKeys.invites(householdId),
    queryFn: async (): Promise<UseInvitesResult> => {
      if (!user) throw new Error("로그인이 필요합니다");

      const data = await fetchWithAuth(
        `/api/households/${householdId}/invites`,
        { method: "GET" },
        user
      );

      return data.data;
    },
    enabled: enabled && !!householdId && !!user,
  });
}

// =====================================================
// useInviteMember - 멤버 초대 (이메일)
// =====================================================

interface InviteMemberInput {
  householdId: string;
  email: string;
  role?: "member" | "admin";
}

interface InviteMemberResult {
  inviteId: string;
  inviteCode: string;
  inviteLink: string;
  email: string;
  expiresAt: string;
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({
      householdId,
      email,
      role = "member",
    }: InviteMemberInput): Promise<InviteMemberResult> => {
      if (!user) throw new Error("로그인이 필요합니다");

      const data = await fetchWithAuth(
        `/api/households/${householdId}/members`,
        {
          method: "POST",
          body: JSON.stringify({ email, role }),
        },
        user
      );

      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: memberKeys.invites(variables.householdId),
      });
    },
  });
}

// =====================================================
// useRemoveMember - 멤버 제거
// =====================================================

interface RemoveMemberInput {
  householdId: string;
  userId: string;
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({ householdId, userId }: RemoveMemberInput) => {
      if (!user) throw new Error("로그인이 필요합니다");

      const data = await fetchWithAuth(
        `/api/households/${householdId}/members/${userId}`,
        { method: "DELETE" },
        user
      );

      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: memberKeys.list(variables.householdId),
      });
    },
  });
}

// =====================================================
// useUpdateMemberRole - 멤버 역할 변경
// =====================================================

interface UpdateMemberRoleInput {
  householdId: string;
  userId: string;
  role: "admin" | "member" | "viewer";
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({
      householdId,
      userId,
      role,
    }: UpdateMemberRoleInput) => {
      if (!user) throw new Error("로그인이 필요합니다");

      const data = await fetchWithAuth(
        `/api/households/${householdId}/members/${userId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ role }),
        },
        user
      );

      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: memberKeys.list(variables.householdId),
      });
    },
  });
}

// =====================================================
// useRegenerateInviteCode - 초대 코드 재생성
// =====================================================

interface RegenerateInviteCodeResult {
  inviteCode: string;
  inviteLink: string;
  expiresAt: string;
}

export function useRegenerateInviteCode() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async (householdId: string): Promise<RegenerateInviteCodeResult> => {
      if (!user) throw new Error("로그인이 필요합니다");

      const data = await fetchWithAuth(
        `/api/households/${householdId}/invites`,
        { method: "POST" },
        user
      );

      return data.data;
    },
    onSuccess: (_, householdId) => {
      queryClient.invalidateQueries({
        queryKey: memberKeys.invites(householdId),
      });
    },
  });
}

// =====================================================
// useJoinByInviteCode - 초대 코드로 가입
// =====================================================

interface JoinByInviteCodeResult {
  householdId: string;
  householdName: string;
  role: string;
  joinedAt: string;
}

export function useJoinByInviteCode() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async (inviteCode: string): Promise<JoinByInviteCodeResult> => {
      if (!user) throw new Error("로그인이 필요합니다");

      const data = await fetchWithAuth(
        `/api/invites/${inviteCode}`,
        { method: "POST" },
        user
      );

      return data.data;
    },
    onSuccess: () => {
      // 가계부 목록 새로고침
      queryClient.invalidateQueries({ queryKey: ["households"] });
    },
  });
}

// =====================================================
// useInviteInfo - 초대 코드 정보 조회
// =====================================================

interface InviteInfo {
  type: "household" | "invite";
  householdId: string;
  householdName: string;
  memberCount: number;
  createdBy?: string;
}

export function useInviteInfo(inviteCode: string, enabled = true) {
  return useQuery({
    queryKey: ["inviteInfo", inviteCode],
    queryFn: async (): Promise<InviteInfo> => {
      const response = await fetch(`/api/invites/${inviteCode}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "초대 정보 조회에 실패했습니다");
      }

      return data.data;
    },
    enabled: enabled && !!inviteCode,
    retry: false,
  });
}
