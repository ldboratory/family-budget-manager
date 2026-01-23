/**
 * 거래 관련 TanStack Query Hooks
 *
 * 거래 목록 조회, 생성, 수정, 삭제를 위한 React Query 훅입니다.
 * 오프라인 지원을 위해 로컬 저장소와 연동됩니다.
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Timestamp } from "firebase/firestore";
import { transactionRepository } from "@/lib/db/transactionRepository";
import {
  getLocalDB,
  type LocalTransaction,
} from "@/lib/db/indexedDB";
import type {
  TransactionCreateInput,
  TransactionFilter,
} from "@/types";
import type { CreateTransactionFormData } from "@/lib/validations/transaction";

// =====================================================
// Query Keys
// =====================================================

export const transactionKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionKeys.all, "list"] as const,
  list: (householdId: string, filter?: TransactionFilter) =>
    [...transactionKeys.lists(), householdId, filter] as const,
  details: () => [...transactionKeys.all, "detail"] as const,
  detail: (householdId: string, id: string) =>
    [...transactionKeys.details(), householdId, id] as const,
};

// =====================================================
// useTransactions - 거래 목록 조회
// =====================================================

interface UseTransactionsOptions {
  householdId: string;
  filter?: TransactionFilter;
  enabled?: boolean;
}

export function useTransactions({
  householdId,
  filter,
  enabled = true,
}: UseTransactionsOptions) {
  return useQuery({
    queryKey: transactionKeys.list(householdId, filter),
    queryFn: async () => {
      const result = await transactionRepository.findAll(householdId, filter);

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
// useTransaction - 거래 상세 조회
// =====================================================

interface UseTransactionOptions {
  householdId: string;
  transactionId: string;
  enabled?: boolean;
}

export function useTransaction({
  householdId,
  transactionId,
  enabled = true,
}: UseTransactionOptions) {
  return useQuery({
    queryKey: transactionKeys.detail(householdId, transactionId),
    queryFn: async () => {
      const result = await transactionRepository.findById(
        householdId,
        transactionId
      );

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data;
    },
    enabled: enabled && !!householdId && !!transactionId,
  });
}

// =====================================================
// useCreateTransaction - 거래 생성
// =====================================================

interface CreateTransactionInput extends CreateTransactionFormData {
  householdId: string;
  createdBy: string;
  createdByName: string;
  categoryName: string;
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      const { householdId, createdBy, createdByName, categoryName, ...data } = input;

      const createInput: TransactionCreateInput = {
        type: data.type,
        amount: data.amount,
        categoryId: data.categoryId,
        description: data.description,
        date: Timestamp.fromDate(new Date(data.date)),
        paymentMethod: data.paymentMethod,
        tags: data.tags,
        merchant: data.merchant,
      };

      // 직접 로컬 DB에 저장 (Repository 사용)
      const localDB = getLocalDB();
      const id = crypto.randomUUID();
      const now = Date.now();
      const isOnline = navigator.onLine;

      const localTransaction: LocalTransaction = {
        id,
        type: createInput.type,
        amount: createInput.amount,
        categoryId: createInput.categoryId,
        categoryName,
        description: createInput.description,
        date: new Date(data.date).getTime(),
        paymentMethod: createInput.paymentMethod,
        tags: createInput.tags ?? [],
        merchant: createInput.merchant,
        createdBy,
        createdByName,
        createdAt: now,
        updatedAt: now,
        version: 1,
        syncStatus: isOnline ? "synced" : "pending",
        householdId,
      };

      await localDB.transactions.put(localTransaction);

      // 온라인이면 API 호출
      if (isOnline) {
        try {
          const response = await fetch(
            `/api/households/${householdId}/transactions`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...createInput,
                date: data.date,
                categoryName,
                createdBy,
                createdByName,
              }),
            }
          );

          if (!response.ok) {
            // API 실패 시 pending으로 변경
            await localDB.transactions.update(id, { syncStatus: "pending" });
          }
        } catch {
          await localDB.transactions.update(id, { syncStatus: "pending" });
        }
      }

      return localTransaction;
    },
    onSuccess: () => {
      // 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: transactionKeys.lists(),
      });
    },
  });
}

// =====================================================
// useUpdateTransaction - 거래 수정
// =====================================================

interface UpdateTransactionInput {
  householdId: string;
  transactionId: string;
  data: Partial<CreateTransactionFormData> & { version: number };
  categoryName?: string;
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      householdId,
      transactionId,
      data,
      categoryName,
    }: UpdateTransactionInput) => {
      const localDB = getLocalDB();
      const existing = await localDB.transactions.get(transactionId);

      if (!existing) {
        throw new Error("거래를 찾을 수 없습니다");
      }

      // 낙관적 잠금 체크
      if (existing.version !== data.version) {
        throw new Error(
          "다른 기기에서 수정되었습니다. 새로고침 후 다시 시도해주세요."
        );
      }

      const now = Date.now();
      const isOnline = navigator.onLine;

      const updatedTransaction: LocalTransaction = {
        ...existing,
        ...(data.type !== undefined && { type: data.type }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(categoryName !== undefined && { categoryName }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.date !== undefined && { date: new Date(data.date).getTime() }),
        ...(data.paymentMethod !== undefined && {
          paymentMethod: data.paymentMethod,
        }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.merchant !== undefined && { merchant: data.merchant }),
        updatedAt: now,
        version: existing.version + 1,
        syncStatus: isOnline ? "synced" : "pending",
      };

      await localDB.transactions.put(updatedTransaction);

      // 온라인이면 API 호출
      if (isOnline) {
        try {
          const response = await fetch(
            `/api/households/${householdId}/transactions/${transactionId}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...data,
                categoryName,
              }),
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 409) {
              // 버전 충돌 - 로컬 변경 롤백
              await localDB.transactions.put(existing);
              throw new Error(errorData.error?.message ?? "버전 충돌이 발생했습니다");
            }
            await localDB.transactions.update(transactionId, {
              syncStatus: "pending",
            });
          }
        } catch (error) {
          if (error instanceof Error && error.message.includes("충돌")) {
            throw error;
          }
          await localDB.transactions.update(transactionId, {
            syncStatus: "pending",
          });
        }
      }

      return updatedTransaction;
    },
    onSuccess: (_, variables) => {
      // 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: transactionKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: transactionKeys.detail(
          variables.householdId,
          variables.transactionId
        ),
      });
    },
  });
}

// =====================================================
// useDeleteTransaction - 거래 삭제
// =====================================================

interface DeleteTransactionInput {
  householdId: string;
  transactionId: string;
  version: number;
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      householdId,
      transactionId,
      version,
    }: DeleteTransactionInput) => {
      const localDB = getLocalDB();
      const existing = await localDB.transactions.get(transactionId);

      if (!existing) {
        throw new Error("거래를 찾을 수 없습니다");
      }

      // 낙관적 잠금 체크
      if (existing.version !== version) {
        throw new Error(
          "다른 기기에서 수정되었습니다. 새로고침 후 다시 시도해주세요."
        );
      }

      // 로컬에서 삭제
      await localDB.transactions.delete(transactionId);

      // 온라인이면 API 호출
      if (navigator.onLine) {
        try {
          const response = await fetch(
            `/api/households/${householdId}/transactions/${transactionId}?version=${version}`,
            { method: "DELETE" }
          );

          if (!response.ok && response.status === 409) {
            // 버전 충돌 - 로컬에 복구
            await localDB.transactions.put(existing);
            throw new Error(
              "다른 기기에서 수정되었습니다. 새로고침 후 다시 시도해주세요."
            );
          }
        } catch (error) {
          if (error instanceof Error && error.message.includes("충돌")) {
            throw error;
          }
          // API 실패 시 대기 작업으로 추가 (실제 구현에서는 PendingOperation 사용)
          console.error("삭제 동기화 실패:", error);
        }
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: transactionKeys.lists(),
      });
    },
  });
}

// =====================================================
// useTransactionSummary - 거래 요약 (통계)
// =====================================================

interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionCount: number;
}

export function useTransactionSummary(
  householdId: string,
  startDate: Date,
  endDate: Date
) {
  return useQuery({
    queryKey: ["transactionSummary", householdId, startDate, endDate],
    queryFn: async (): Promise<TransactionSummary> => {
      const localDB = getLocalDB();
      const startTime = startDate.getTime();
      const endTime = endDate.getTime();

      const transactions = await localDB.transactions
        .where("householdId")
        .equals(householdId)
        .and((t) => t.date >= startTime && t.date <= endTime)
        .toArray();

      const totalIncome = transactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpense = transactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        transactionCount: transactions.length,
      };
    },
    enabled: !!householdId,
  });
}
