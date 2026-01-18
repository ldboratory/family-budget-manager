/**
 * 자산 관리 페이지
 *
 * - 자산 목록 표시 (카테고리별 필터링)
 * - 자산 추가/수정/삭제
 * - 총 자산 요약 (순자산, 자산, 부채)
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Loader2,
  ArrowLeft,
  RefreshCw,
  WifiOff,
  Wallet,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { AssetForm } from "@/components/assets/AssetForm";
import { AssetList } from "@/components/assets/AssetList";
import {
  useAssets,
  useAssetSummary,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
} from "@/hooks/useAssets";
import { getLocalDB, type LocalAsset } from "@/lib/db/indexedDB";
import {
  formatAssetAmount,
  type CreateAssetFormData,
  type AssetCategoryType,
} from "@/lib/validations/asset";

// 임시 household ID (실제로는 context나 params에서)
const DEMO_HOUSEHOLD_ID = "demo-household";

export default function AssetsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuthContext();

  // 상태
  const [assets, setAssets] = useState<LocalAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<LocalAsset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LocalAsset | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    undefined
  );

  // Mutations
  const createMutation = useCreateAsset();
  const updateMutation = useUpdateAsset();
  const deleteMutation = useDeleteAsset();

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
      router.push("/auth/login?redirect=/assets");
    }
  }, [authLoading, isAuthenticated, router]);

  // 자산 데이터 로드 (IndexedDB)
  const loadAssets = async () => {
    setIsLoading(true);
    try {
      const localDB = getLocalDB();
      let items = await localDB.assets
        .where("householdId")
        .equals(DEMO_HOUSEHOLD_ID)
        .and((a) => a.isActive)
        .toArray();

      // 카테고리 필터링
      if (selectedCategory) {
        items = items.filter((a) => a.category === selectedCategory);
      }

      // 정렬 (sortOrder 순)
      items.sort((a, b) => a.sortOrder - b.sortOrder);

      setAssets(items);
    } catch (error) {
      console.error("자산 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAssets();
    }
  }, [isAuthenticated, selectedCategory]);

  // 요약 계산
  const summary = useMemo(() => {
    // 전체 자산으로 계산 (필터 무관)
    const allAssets = assets;
    let totalAssets = 0;
    let totalLiabilities = 0;

    allAssets.forEach((asset) => {
      if (asset.category === "loan") {
        totalLiabilities += Math.abs(asset.amount);
      } else {
        totalAssets += asset.amount;
      }
    });

    return {
      netWorth: totalAssets - totalLiabilities,
      assets: totalAssets,
      liabilities: totalLiabilities,
      count: allAssets.length,
    };
  }, [assets]);

  // 자산 추가 핸들러
  const handleCreate = async (
    data: CreateAssetFormData & { version?: number }
  ) => {
    if (!user) return;

    await createMutation.mutateAsync({
      ...data,
      householdId: DEMO_HOUSEHOLD_ID,
    });

    setShowForm(false);
    loadAssets();
  };

  // 자산 수정 핸들러
  const handleUpdate = async (
    data: CreateAssetFormData & { version?: number }
  ) => {
    if (!editingAsset) return;

    await updateMutation.mutateAsync({
      householdId: DEMO_HOUSEHOLD_ID,
      assetId: editingAsset.id,
      data: {
        ...data,
        version: editingAsset.version,
      },
    });

    setEditingAsset(null);
    loadAssets();
  };

  // 자산 삭제 핸들러
  const handleDelete = async () => {
    if (!deleteTarget) return;

    await deleteMutation.mutateAsync({
      householdId: DEMO_HOUSEHOLD_ID,
      assetId: deleteTarget.id,
      version: deleteTarget.version,
    });

    setDeleteTarget(null);
    loadAssets();
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
            <h1 className="font-semibold">자산 관리</h1>
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
              onClick={loadAssets}
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
            <div className="flex items-center gap-2 text-blue-600">
              <Wallet className="h-4 w-4" />
              <span className="text-xs font-medium">순자산</span>
            </div>
            <p
              className={`mt-2 text-lg font-bold ${
                summary.netWorth >= 0 ? "text-blue-600" : "text-red-600"
              }`}
            >
              {formatAssetAmount(summary.netWorth)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">자산</span>
            </div>
            <p className="mt-2 text-lg font-bold text-green-600">
              {formatAssetAmount(summary.assets)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-red-600">
              <TrendingDown className="h-4 w-4" />
              <span className="text-xs font-medium">부채</span>
            </div>
            <p className="mt-2 text-lg font-bold text-red-600">
              -{formatAssetAmount(summary.liabilities)}
            </p>
          </div>
        </section>

        {/* 자산 목록 */}
        <section>
          <AssetList
            assets={assets.map((a) => ({
              ...a,
              category: a.category as AssetCategoryType,
            }))}
            isLoading={isLoading}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            onEdit={(a) => setEditingAsset(a as unknown as LocalAsset)}
            onDelete={(a) => setDeleteTarget(a as unknown as LocalAsset)}
          />
        </section>
      </main>

      {/* 자산 추가 폼 모달 */}
      {showForm && (
        <AssetForm
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
          isSubmitting={createMutation.isPending}
        />
      )}

      {/* 자산 수정 폼 모달 */}
      {editingAsset && (
        <AssetForm
          asset={{
            id: editingAsset.id,
            assetName: editingAsset.assetName,
            category: editingAsset.category as AssetCategoryType,
            amount: editingAsset.amount,
            currency: editingAsset.currency,
            description: editingAsset.description,
            institution: editingAsset.institution,
            accountNumberLast4: editingAsset.accountNumberLast4,
            interestRate: editingAsset.interestRate,
            maturityDate: editingAsset.maturityDate
              ? new Date(editingAsset.maturityDate).toISOString().split("T")[0]
              : undefined,
            version: editingAsset.version,
          }}
          onSubmit={handleUpdate}
          onClose={() => setEditingAsset(null)}
          isSubmitting={updateMutation.isPending}
        />
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-card p-6">
            <h2 className="text-lg font-semibold">자산 삭제</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              "{deleteTarget.assetName}" 자산을 삭제하시겠습니까?
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
