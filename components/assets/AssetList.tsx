/**
 * 자산 목록 컴포넌트
 *
 * - 카테고리별 탭으로 자산 필터링
 * - 자산 카드 형태로 표시
 * - 편집/삭제 기능
 * - 동기화 상태 표시
 */

"use client";

import { useState } from "react";
import {
  Pencil,
  Trash2,
  MoreVertical,
  AlertCircle,
  Cloud,
  CloudOff,
  Banknote,
  Landmark,
  TrendingUp,
  FileText,
  Home,
  Bitcoin,
  Shield,
  PiggyBank,
  CreditCard,
  MoreHorizontal,
  Building2,
  Percent,
  Calendar,
} from "lucide-react";
import {
  ASSET_CATEGORIES,
  CURRENCY_LABELS,
  formatAssetAmount,
  type AssetCategoryType,
} from "@/lib/validations/asset";

// 카테고리별 아이콘 매핑
const CATEGORY_ICONS: Record<AssetCategoryType, React.ReactNode> = {
  cash: <Banknote className="h-5 w-5" />,
  bank: <Landmark className="h-5 w-5" />,
  stock: <TrendingUp className="h-5 w-5" />,
  bond: <FileText className="h-5 w-5" />,
  real_estate: <Home className="h-5 w-5" />,
  crypto: <Bitcoin className="h-5 w-5" />,
  insurance: <Shield className="h-5 w-5" />,
  pension: <PiggyBank className="h-5 w-5" />,
  loan: <CreditCard className="h-5 w-5" />,
  etc: <MoreHorizontal className="h-5 w-5" />,
};

interface Asset {
  id: string;
  assetName: string;
  category: AssetCategoryType;
  amount: number;
  currency: string;
  description?: string;
  institution?: string;
  accountNumberLast4?: string;
  interestRate?: number;
  maturityDate?: number;
  syncStatus: "synced" | "pending" | "conflict";
  version: number;
}

interface AssetListProps {
  assets: Asset[];
  isLoading?: boolean;
  selectedCategory?: string;
  onCategoryChange: (category: string | undefined) => void;
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
}

export function AssetList({
  assets,
  isLoading = false,
  selectedCategory,
  onCategoryChange,
  onEdit,
  onDelete,
}: AssetListProps) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // 카테고리 탭 목록
  const categories = [
    { id: undefined, label: "전체" },
    ...Object.entries(ASSET_CATEGORIES).map(([id, info]) => ({
      id,
      label: info.label,
    })),
  ];

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* 카테고리 탭 스켈레톤 */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-9 w-16 animate-pulse rounded-full bg-muted"
            />
          ))}
        </div>

        {/* 카드 스켈레톤 */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded bg-muted" />
                <div className="h-3 w-1/4 rounded bg-muted" />
              </div>
              <div className="h-6 w-24 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 빈 상태
  if (assets.length === 0) {
    return (
      <div className="space-y-4">
        {/* 카테고리 탭 */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id ?? "all"}
              onClick={() => onCategoryChange(cat.id)}
              className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 빈 상태 메시지 */}
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-medium">
            {selectedCategory ? "해당 분류의 자산이 없습니다" : "등록된 자산이 없습니다"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            새 자산을 추가해보세요
          </p>
        </div>
      </div>
    );
  }

  // 카테고리별 자산 그룹화
  const groupedAssets = assets.reduce(
    (acc, asset) => {
      const cat = asset.category;
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(asset);
      return acc;
    },
    {} as Record<string, Asset[]>
  );

  return (
    <div className="space-y-4">
      {/* 카테고리 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id ?? "all"}
            onClick={() => onCategoryChange(cat.id)}
            className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              selectedCategory === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 자산 목록 */}
      <div className="space-y-3">
        {assets.map((asset) => {
          const categoryInfo = ASSET_CATEGORIES[asset.category];
          const isLoan = asset.category === "loan";

          return (
            <div
              key={asset.id}
              className="group rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/30"
            >
              <div className="flex items-center gap-4">
                {/* 카테고리 아이콘 */}
                <div
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${categoryInfo.color}20` }}
                >
                  <span style={{ color: categoryInfo.color }}>
                    {CATEGORY_ICONS[asset.category]}
                  </span>
                </div>

                {/* 자산 정보 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-medium">{asset.assetName}</h3>
                    {/* 동기화 상태 */}
                    {asset.syncStatus === "pending" && (
                      <CloudOff
                        className="h-3 w-3 flex-shrink-0 text-yellow-500"
                        title="동기화 대기 중"
                      />
                    )}
                    {asset.syncStatus === "conflict" && (
                      <AlertCircle
                        className="h-3 w-3 flex-shrink-0 text-red-500"
                        title="동기화 충돌"
                      />
                    )}
                    {asset.syncStatus === "synced" && (
                      <Cloud
                        className="h-3 w-3 flex-shrink-0 text-green-500 opacity-0 group-hover:opacity-100"
                        title="동기화 완료"
                      />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5"
                      style={{
                        backgroundColor: `${categoryInfo.color}20`,
                        color: categoryInfo.color,
                      }}
                    >
                      {categoryInfo.label}
                    </span>
                    {asset.institution && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {asset.institution}
                        </span>
                      </>
                    )}
                    {asset.accountNumberLast4 && (
                      <span>****{asset.accountNumberLast4}</span>
                    )}
                    {asset.interestRate !== undefined && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          {asset.interestRate}%
                        </span>
                      </>
                    )}
                  </div>
                  {asset.description && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {asset.description}
                    </p>
                  )}
                </div>

                {/* 금액 */}
                <div className="flex-shrink-0 text-right">
                  <p
                    className={`text-lg font-bold ${
                      isLoan ? "text-red-600" : "text-foreground"
                    }`}
                  >
                    {isLoan ? "-" : ""}
                    {formatAssetAmount(asset.amount, asset.currency)}
                  </p>
                  {asset.currency !== "KRW" && (
                    <p className="text-xs text-muted-foreground">
                      {CURRENCY_LABELS[asset.currency]?.name}
                    </p>
                  )}
                </div>

                {/* 액션 메뉴 */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() =>
                      setMenuOpen(menuOpen === asset.id ? null : asset.id)
                    }
                    className="rounded-lg p-2 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
                    aria-label="메뉴"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {menuOpen === asset.id && (
                    <>
                      {/* 백드롭 */}
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setMenuOpen(null)}
                      />
                      {/* 메뉴 */}
                      <div className="absolute right-0 top-full z-20 mt-1 w-32 rounded-lg border border-border bg-card py-1 shadow-lg">
                        <button
                          onClick={() => {
                            setMenuOpen(null);
                            onEdit(asset);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                        >
                          <Pencil className="h-4 w-4" />
                          수정
                        </button>
                        <button
                          onClick={() => {
                            setMenuOpen(null);
                            onDelete(asset);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
                        >
                          <Trash2 className="h-4 w-4" />
                          삭제
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AssetList;
