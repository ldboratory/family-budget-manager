/**
 * 사용자 환경설정 TanStack Query Hooks
 *
 * 설정 조회, 업데이트, 백업 기능을 제공합니다.
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/components/auth/AuthProvider";
import {
  preferencesRepository,
  type LocalPreferences,
  type PreferencesUpdateInput,
} from "@/lib/db/preferencesRepository";
import type { ThemeMode, CurrencyCode, PaymentMethod } from "@/types";

// =====================================================
// Query Keys
// =====================================================

export const preferencesKeys = {
  all: ["preferences"] as const,
  user: (userId: string) => [...preferencesKeys.all, userId] as const,
  profile: (userId: string) => ["profile", userId] as const,
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
// usePreferences - 설정 조회
// =====================================================

export function usePreferences() {
  const { user, isAuthenticated } = useAuthContext();

  return useQuery({
    queryKey: preferencesKeys.user(user?.uid ?? ""),
    queryFn: async (): Promise<LocalPreferences> => {
      if (!user) throw new Error("로그인이 필요합니다");
      return preferencesRepository.getPreferences(user.uid);
    },
    enabled: isAuthenticated && !!user,
    staleTime: 1000 * 60 * 5, // 5분
  });
}

// =====================================================
// useUpdatePreferences - 설정 업데이트
// =====================================================

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async (input: PreferencesUpdateInput) => {
      if (!user) throw new Error("로그인이 필요합니다");
      return preferencesRepository.updatePreferences(user.uid, input);
    },
    onSuccess: (data) => {
      if (user) {
        queryClient.setQueryData(preferencesKeys.user(user.uid), data);
      }
    },
  });
}

// =====================================================
// useProfile - 프로필 조회
// =====================================================

interface Profile {
  uid: string;
  email: string;
  displayName: string;
  avatar?: string;
  role: string;
  currency: CurrencyCode;
  householdIds?: string[];
}

export function useProfile() {
  const { user, isAuthenticated } = useAuthContext();

  return useQuery({
    queryKey: preferencesKeys.profile(user?.uid ?? ""),
    queryFn: async (): Promise<Profile> => {
      if (!user) throw new Error("로그인이 필요합니다");

      const data = await fetchWithAuth(
        "/api/users/profile",
        { method: "GET" },
        user
      );

      return data.data;
    },
    enabled: isAuthenticated && !!user,
    staleTime: 1000 * 60 * 5,
  });
}

// =====================================================
// useUpdateProfile - 프로필 업데이트
// =====================================================

interface UpdateProfileInput {
  displayName?: string;
  avatar?: string | null;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      if (!user) throw new Error("로그인이 필요합니다");

      const data = await fetchWithAuth(
        "/api/users/profile",
        {
          method: "PUT",
          body: JSON.stringify(input),
        },
        user
      );

      return data.data;
    },
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({
          queryKey: preferencesKeys.profile(user.uid),
        });
      }
    },
  });
}

// =====================================================
// useBackup - 데이터 백업
// =====================================================

export function useBackup() {
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async (householdId: string) => {
      if (!user) throw new Error("로그인이 필요합니다");

      const response = await fetch(
        `/api/backup?householdId=${householdId}`,
        {
          method: "GET",
          headers: {
            "x-user-id": user.uid,
            "x-user-email": user.email || "",
            "x-user-name": user.displayName || "",
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "백업에 실패했습니다");
      }

      // Blob으로 변환하여 다운로드
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // 파일명 추출
      const contentDisposition = response.headers.get("Content-Disposition");
      const fileName =
        contentDisposition?.match(/filename="(.+)"/)?.[1] ||
        `household-backup-${new Date().toISOString().split("T")[0]}.json`;

      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      return { success: true, fileName };
    },
  });
}

// =====================================================
// useTheme - 테마 관리
// =====================================================

export function useTheme() {
  const { data: preferences, isLoading } = usePreferences();
  const updatePreferences = useUpdatePreferences();

  const theme = preferences?.theme ?? "system";

  const setTheme = async (newTheme: ThemeMode) => {
    await updatePreferences.mutateAsync({ theme: newTheme });
    applyTheme(newTheme);
  };

  return {
    theme,
    setTheme,
    isLoading,
    isUpdating: updatePreferences.isPending,
  };
}

// 테마 적용 유틸리티
export function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (theme === "dark" || (theme === "system" && systemDark)) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

// 초기 테마 적용
export function initializeTheme(): void {
  // 로컬 스토리지에서 테마 가져오기 (빠른 초기화용)
  const savedTheme = localStorage.getItem("theme") as ThemeMode | null;
  if (savedTheme) {
    applyTheme(savedTheme);
  }
}
