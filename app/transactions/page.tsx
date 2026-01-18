/**
 * 거래 내역 페이지
 *
 * - 거래 목록 표시 (필터링, 검색)
 * - 거래 추가/수정/삭제
 * - 이번 달 요약 (수입, 지출, 잔액)
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Loader2,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowLeft,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { TransactionList } from "@/components/transactions/TransactionList";
import { TransactionFilter } from "@/components/transactions/TransactionFilter";
import {
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from "@/hooks/useTransactions";
import { getLocalDB, type LocalTransaction } from "@/lib/db/indexedDB";
import {
  formatCurrency,
  getCategoryById,
  type CreateTransactionFormData,
} from "@/lib/validations/transaction";
import type { TransactionFilter as TFilter } from "@/types";

// 임시 household ID (실제로는 context나 params에서)
const DEMO_HOUSEHOLD_ID = "demo-household";

export default function TransactionsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuthContext();

  // 상태
  const [transactions, setTransactions] = useState<LocalTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<LocalTransaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LocalTransaction | null>(
    null
  );

  // 필터 상태
  const [filter, setFilter] = useState<Partial<TFilter>>(() => {
    const now = new Date();
    return {
      sortBy: "date",
      sortOrder: "desc",
      dateRange: {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      },
    };
  });

  // Mutations
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();

  // 온라인/오프라인 상태 감지
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 인증 체크
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login?redirect=/transactions");
    }
  }, [authLoading, isAuthenticated, router]);

  // 거래 데이터 로드 (IndexedDB)
  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const localDB = getLocalDB();
      let query = localDB.transactions
        .where("householdId")
        .equals(DEMO_HOUSEHOLD_ID);

      let items = await query.toArray();

      // 필터 적용
      if (filter.type) {
        items = items.filter((t) => t.type === filter.type);
      }
      if (filter.categoryId) {
        items = items.filter((t) => t.categoryId === filter.categoryId);
      }
      if (filter.dateRange) {
        const startTime = filter.dateRange.startDate.getTime();
        const endTime = filter.dateRange.endDate.getTime();
        items = items.filter((t) => t.date >= startTime && t.date <= endTime);
      }
      if (filter.searchQuery) {
        const q = filter.searchQuery.toLowerCase();
        items = items.filter(
          (t) =>
            t.description.toLowerCase().includes(q) ||
            t.categoryName.toLowerCase().includes(q) ||
            t.merchant?.toLowerCase().includes(q)
        );
      }

      // 정렬
      items.sort((a, b) => {
        const aVal = filter.sortBy === "amount" ? a.amount : a.date;
        const bVal = filter.sortBy === "amount" ? b.amount : b.date;
        return filter.sortOrder === "desc" ? bVal - aVal : aVal - bVal;
      });

      setTransactions(items);
    } catch (error) {
      console.error("거래 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadTransactions();
    }
  }, [isAuthenticated, filter]);

  // 요약 계산
  const summary = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      income,
      expense,
      balance: income - expense,
      count: transactions.length,
    };
  }, [transactions]);

  // 거래 추가 핸들러
  const handleCreate = async (
    data: CreateTransactionFormData & { version?: number }
  ) => {
    if (!user) return;

    const category = getCategoryById(data.categoryId, data.type);

    await createMutation.mutateAsync({
      ...data,
      householdId: DEMO_HOUSEHOLD_ID,
      createdBy: user.uid,
      createdByName: user.displayName,
      categoryName: category?.name ?? "",
    });

    setShowForm(false);
    loadTransactions();
  };

  // 거래 수정 핸들러
  const handleUpdate = async (
    data: CreateTransactionFormData & { version?: number }
  ) => {
    if (!editingTransaction) return;

    const category = getCategoryById(data.categoryId, data.type);

    await updateMutation.mutateAsync({
      householdId: DEMO_HOUSEHOLD_ID,
      transactionId: editingTransaction.id,
      data: {
        ...data,
        version: editingTransaction.version,
      },
      categoryName: category?.name,
    });

    setEditingTransaction(null);
    loadTransactions();
  };

  // 거래 삭제 핸들러
  const handleDelete = async () => {
    if (!deleteTarget) return;

    await deleteMutation.mutateAsync({
      householdId: DEMO_HOUSEHOLD_ID,
      transactionId: deleteTarget.id,
      version: deleteTarget.version,
    });

    setDeleteTarget(null);
    loadTransactions();
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

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
            <h1 className="font-semibold">거래 내역</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* 오프라인 표시 */}
            {!isOnline && (
              <div className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-700">
                <WifiOff className="h-3 w-3" />
                오프라인
              </div>
            )}
            {/* 새로고침 */}
            <button
              onClick={loadTransactions}
              className="rounded-lg p-2 hover:bg-accent"
              aria-label="새로고침"
            >
              <RefreshCw
                className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
            {/* 추가 버튼 */}
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              추가
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* 요약 카드 */}
        <section className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">수입</span>
            </div>
            <p className="mt-2 text-lg font-bold text-green-600">
              +{formatCurrency(summary.income)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-red-600">
              <TrendingDown className="h-4 w-4" />
              <span className="text-xs font-medium">지출</span>
            </div>
            <p className="mt-2 text-lg font-bold text-red-600">
              -{formatCurrency(summary.expense)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-blue-600">
              <Wallet className="h-4 w-4" />
              <span className="text-xs font-medium">잔액</span>
            </div>
            <p
              className={`mt-2 text-lg font-bold ${
                summary.balance >= 0 ? "text-blue-600" : "text-red-600"
              }`}
            >
              {formatCurrency(summary.balance)}
            </p>
          </div>
        </section>

        {/* 필터 */}
        <section className="mb-6">
          <TransactionFilter filter={filter} onChange={setFilter} />
        </section>

        {/* 거래 목록 */}
        <section>
          <TransactionList
            transactions={transactions}
            isLoading={isLoading}
            onEdit={(t) =>
              setEditingTransaction(t as unknown as LocalTransaction)
            }
            onDelete={(t) =>
              setDeleteTarget(t as unknown as LocalTransaction)
            }
          />
        </section>
      </main>

      {/* 거래 추가 폼 모달 */}
      {showForm && (
        <TransactionForm
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
          isSubmitting={createMutation.isPending}
        />
      )}

      {/* 거래 수정 폼 모달 */}
      {editingTransaction && (
        <TransactionForm
          transaction={{
            id: editingTransaction.id,
            type: editingTransaction.type,
            amount: editingTransaction.amount,
            categoryId: editingTransaction.categoryId,
            description: editingTransaction.description,
            date: new Date(editingTransaction.date).toISOString().split("T")[0]!,
            paymentMethod: editingTransaction.paymentMethod,
            merchant: editingTransaction.merchant,
            tags: editingTransaction.tags,
            version: editingTransaction.version,
          }}
          onSubmit={handleUpdate}
          onClose={() => setEditingTransaction(null)}
          isSubmitting={updateMutation.isPending}
        />
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-card p-6">
            <h2 className="text-lg font-semibold">거래 삭제</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              "{deleteTarget.description}" 거래를 삭제하시겠습니까?
              <br />이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-lg border border-input py-2.5 text-sm font-medium hover:bg-accent"
                disabled={deleteMutation.isPending}
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-destructive py-2.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    삭제 중...
                  </>
                ) : (
                  "삭제"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
