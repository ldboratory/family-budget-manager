/**
 * 자산 관련 TanStack Query Hooks
 *
 * 자산 목록 조회, 생성, 수정, 삭제를 위한 React Query 훅입니다.
 * 오프라인 지원을 위해 로컬 저장소와 연동됩니다.
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Timestamp } from "firebase/firestore";
import { assetRepository } from "@/lib/db/assetRepository";
import { getLocalDB, type LocalAsset } from "@/lib/db/indexedDB";
import type { Asset, AssetCategory } from "@/types";
import type { CreateAssetFormData } from "@/lib/validations/asset";

// =====================================================
// Query Keys
// =====================================================

export const assetKeys = {
  all: ["assets"] as const,
  lists: () => [...assetKeys.all, "list"] as const,
  list: (householdId: string, options?: { category?: string; includeInactive?: boolean }) =>
    [...assetKeys.lists(), householdId, options] as const,
  details: () => [...assetKeys.all, "detail"] as const,
  detail: (householdId: string, id: string) =>
    [...assetKeys.details(), householdId, id] as const,
  summary: (householdId: string) => [...assetKeys.all, "summary", householdId] as const,
};

// =====================================================
// useAssets - 자산 목록 조회
// =====================================================

interface UseAssetsOptions {
  householdId: string;
  category?: string;
  includeInactive?: boolean;
  enabled?: boolean;
}

export function useAssets({
  householdId,
  category,
  includeInactive = false,
  enabled = true,
}: UseAssetsOptions) {
  return useQuery({
    queryKey: assetKeys.list(householdId, { category, includeInactive }),
    queryFn: async () => {
      if (category) {
        const result = await assetRepository.findByCategory(householdId, category);
        if (!result.success) {
          throw new Error(result.error.message);
        }
        return result.data;
      }

      const result = await assetRepository.findAll(householdId, { includeInactive });
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled: enabled && !!householdId,
    staleTime: 1000 * 60, // 1분
    gcTime: 1000 * 60 * 5, // 5분
  });
}

// =====================================================
// useAsset - 자산 상세 조회
// =====================================================

interface UseAssetOptions {
  householdId: string;
  assetId: string;
  enabled?: boolean;
}

export function useAsset({
  householdId,
  assetId,
  enabled = true,
}: UseAssetOptions) {
  return useQuery({
    queryKey: assetKeys.detail(householdId, assetId),
    queryFn: async () => {
      const result = await assetRepository.findById(householdId, assetId);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled: enabled && !!householdId && !!assetId,
  });
}

// =====================================================
// useAssetSummary - 자산 요약
// =====================================================

export function useAssetSummary(householdId: string, enabled = true) {
  return useQuery({
    queryKey: assetKeys.summary(householdId),
    queryFn: async () => {
      const result = await assetRepository.getTotalAmount(householdId);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled: enabled && !!householdId,
  });
}

// =====================================================
// useCreateAsset - 자산 생성
// =====================================================

interface CreateAssetInput extends CreateAssetFormData {
  householdId: string;
}

export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAssetInput) => {
      const { householdId, ...data } = input;

      const localDB = getLocalDB();
      const id = crypto.randomUUID();
      const now = Date.now();
      const isOnline = navigator.onLine;

      const localAsset: LocalAsset = {
        id,
        assetName: data.assetName,
        category: data.category,
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        institution: data.institution,
        accountNumberLast4: data.accountNumberLast4,
        interestRate: data.interestRate,
        maturityDate: data.maturityDate
          ? new Date(data.maturityDate).getTime()
          : undefined,
        isActive: true,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
        version: 1,
        syncStatus: isOnline ? "synced" : "pending",
        householdId,
      };

      await localDB.assets.put(localAsset);

      // 온라인이면 API 호출
      if (isOnline) {
        try {
          const response = await fetch(
            `/api/households/${householdId}/assets`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            }
          );

          if (!response.ok) {
            await localDB.assets.update(id, { syncStatus: "pending" });
          }
        } catch {
          await localDB.assets.update(id, { syncStatus: "pending" });
        }
      }

      return localAsset;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: assetKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: assetKeys.summary(variables.householdId),
      });
    },
  });
}

// =====================================================
// useUpdateAsset - 자산 수정
// =====================================================

interface UpdateAssetInput {
  householdId: string;
  assetId: string;
  data: Partial<CreateAssetFormData> & { version: number };
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      householdId,
      assetId,
      data,
    }: UpdateAssetInput) => {
      const localDB = getLocalDB();
      const existing = await localDB.assets.get(assetId);

      if (!existing) {
        throw new Error("자산을 찾을 수 없습니다");
      }

      // 낙관적 잠금 체크
      if (existing.version !== data.version) {
        throw new Error(
          "다른 기기에서 수정되었습니다. 새로고침 후 다시 시도해주세요."
        );
      }

      const now = Date.now();
      const isOnline = navigator.onLine;

      const updatedAsset: LocalAsset = {
        ...existing,
        ...(data.assetName !== undefined && { assetName: data.assetName }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.institution !== undefined && { institution: data.institution }),
        ...(data.accountNumberLast4 !== undefined && {
          accountNumberLast4: data.accountNumberLast4,
        }),
        ...(data.interestRate !== undefined && { interestRate: data.interestRate }),
        ...(data.maturityDate !== undefined && {
          maturityDate: data.maturityDate
            ? new Date(data.maturityDate).getTime()
            : undefined,
        }),
        updatedAt: now,
        version: existing.version + 1,
        syncStatus: isOnline ? "synced" : "pending",
      };

      await localDB.assets.put(updatedAsset);

      // 온라인이면 API 호출
      if (isOnline) {
        try {
          const response = await fetch(
            `/api/households/${householdId}/assets/${assetId}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 409) {
              // 버전 충돌 - 로컬 변경 롤백
              await localDB.assets.put(existing);
              throw new Error(errorData.error?.message ?? "버전 충돌이 발생했습니다");
            }
            await localDB.assets.update(assetId, { syncStatus: "pending" });
          }
        } catch (error) {
          if (error instanceof Error && error.message.includes("충돌")) {
            throw error;
          }
          await localDB.assets.update(assetId, { syncStatus: "pending" });
        }
      }

      return updatedAsset;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: assetKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: assetKeys.detail(variables.householdId, variables.assetId),
      });
      queryClient.invalidateQueries({
        queryKey: assetKeys.summary(variables.householdId),
      });
    },
  });
}

// =====================================================
// useDeleteAsset - 자산 삭제 (soft delete)
// =====================================================

interface DeleteAssetInput {
  householdId: string;
  assetId: string;
  version: number;
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      householdId,
      assetId,
      version,
    }: DeleteAssetInput) => {
      const localDB = getLocalDB();
      const existing = await localDB.assets.get(assetId);

      if (!existing) {
        throw new Error("자산을 찾을 수 없습니다");
      }

      // 낙관적 잠금 체크
      if (existing.version !== version) {
        throw new Error(
          "다른 기기에서 수정되었습니다. 새로고침 후 다시 시도해주세요."
        );
      }

      const now = Date.now();

      // Soft delete
      await localDB.assets.update(assetId, {
        isActive: false,
        updatedAt: now,
        version: existing.version + 1,
        syncStatus: navigator.onLine ? "synced" : "pending",
      });

      // 온라인이면 API 호출
      if (navigator.onLine) {
        try {
          const response = await fetch(
            `/api/households/${householdId}/assets/${assetId}?version=${version}`,
            { method: "DELETE" }
          );

          if (!response.ok && response.status === 409) {
            // 버전 충돌 - 로컬에 복구
            await localDB.assets.put(existing);
            throw new Error(
              "다른 기기에서 수정되었습니다. 새로고침 후 다시 시도해주세요."
            );
          }
        } catch (error) {
          if (error instanceof Error && error.message.includes("충돌")) {
            throw error;
          }
          await localDB.assets.update(assetId, { syncStatus: "pending" });
        }
      }

      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: assetKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: assetKeys.summary(variables.householdId),
      });
    },
  });
}

// =====================================================
// useUpdateAssetAmount - 자산 금액만 빠르게 업데이트
// =====================================================

interface UpdateAssetAmountInput {
  householdId: string;
  assetId: string;
  amount: number;
  version: number;
}

export function useUpdateAssetAmount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      householdId,
      assetId,
      amount,
      version,
    }: UpdateAssetAmountInput) => {
      const result = await assetRepository.updateAmount(
        householdId,
        assetId,
        amount,
        version
      );

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: assetKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: assetKeys.detail(variables.householdId, variables.assetId),
      });
      queryClient.invalidateQueries({
        queryKey: assetKeys.summary(variables.householdId),
      });
    },
  });
}
