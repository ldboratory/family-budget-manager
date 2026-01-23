/**
 * 동기화 상태 인디케이터
 *
 * - 온라인/오프라인 상태 표시
 * - 대기 중인 변경사항 수 표시
 * - 동기화 진행 상태 표시
 * - 충돌 발생 시 알림
 */

"use client";

import { useState } from "react";
import {
  Wifi,
  WifiOff,
  Cloud,
  RefreshCw,
  AlertTriangle,
  Check,
  X,
  ChevronDown,
  Clock,
  Loader2,
} from "lucide-react";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import type { PendingChange } from "@/lib/db/pendingChanges";

// =====================================================
// 타입 정의
// =====================================================

interface SyncIndicatorProps {
  /** 가계부 ID */
  householdId?: string;
  /** 사용자 ID */
  userId?: string;
  /** 컴팩트 모드 (아이콘만) */
  compact?: boolean;
  /** 상세 정보 표시 */
  showDetails?: boolean;
}

// =====================================================
// SyncIndicator 컴포넌트
// =====================================================

export function SyncIndicator({
  householdId,
  userId,
  compact = false,
  showDetails = true,
}: SyncIndicatorProps) {
  const {
    isOnline,
    isSyncing,
    hasError,
    pendingCount,
    conflictCount,
    lastSyncTime,
    conflicts,
    syncNow,
    resolveConflictWithLocal,
    resolveConflictWithRemote,
  } = useSyncStatus(householdId, userId);

  const [isExpanded, setIsExpanded] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);

  // 상태 아이콘 및 색상
  const getStatusIcon = () => {
    if (!isOnline) {
      return <WifiOff className="h-4 w-4 text-muted-foreground" />;
    }
    if (isSyncing) {
      return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
    }
    if (hasError || conflictCount > 0) {
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    }
    if (pendingCount > 0) {
      return <Cloud className="h-4 w-4 text-blue-500" />;
    }
    return <Check className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (!isOnline) return "오프라인";
    if (isSyncing) return "동기화 중...";
    if (conflictCount > 0) return `충돌 ${conflictCount}건`;
    if (hasError) return "동기화 오류";
    if (pendingCount > 0) return `대기 중 ${pendingCount}건`;
    return "동기화됨";
  };

  const getStatusColor = () => {
    if (!isOnline) return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    if (isSyncing) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    if (conflictCount > 0 || hasError) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    if (pendingCount > 0) return "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400";
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  };

  // 마지막 동기화 시간 포맷
  const formatLastSync = (date: Date | null): string => {
    if (!date) return "동기화 기록 없음";

    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "방금 전";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 컴팩트 모드
  if (compact) {
    return (
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`relative flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors ${getStatusColor()}`}
        title={getStatusText()}
      >
        {getStatusIcon()}
        {pendingCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white">
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="relative">
      {/* 메인 버튼 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${getStatusColor()}`}
      >
        {getStatusIcon()}
        <span>{getStatusText()}</span>
        {showDetails && (
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {/* 확장 패널 */}
      {showDetails && isExpanded && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsExpanded(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-card p-4 shadow-lg">
            {/* 상태 요약 */}
            <div className="space-y-3">
              {/* 온라인 상태 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  {isOnline ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>{isOnline ? "온라인" : "오프라인"}</span>
                </div>
                {isOnline && (
                  <button
                    onClick={() => syncNow()}
                    disabled={isSyncing}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-primary hover:bg-accent disabled:opacity-50"
                  >
                    {isSyncing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    지금 동기화
                  </button>
                )}
              </div>

              {/* 마지막 동기화 */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>마지막 동기화: {formatLastSync(lastSyncTime)}</span>
              </div>

              {/* 대기 중인 변경사항 */}
              {pendingCount > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Cloud className="h-4 w-4 text-blue-500" />
                  <span>대기 중인 변경사항: {pendingCount}건</span>
                </div>
              )}

              {/* 충돌 */}
              {conflictCount > 0 && (
                <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span>충돌 {conflictCount}건 발생</span>
                  </div>
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
                    서버와 로컬 데이터가 다릅니다. 해결이 필요합니다.
                  </p>
                  <button
                    onClick={() => setShowConflictModal(true)}
                    className="mt-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
                  >
                    충돌 해결하기
                  </button>
                </div>
              )}

              {/* 에러 */}
              {hasError && (
                <div className="rounded-lg bg-destructive/10 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <span>동기화 오류 발생</span>
                  </div>
                  <p className="mt-1 text-xs text-destructive/80">
                    일부 변경사항을 동기화하지 못했습니다.
                  </p>
                </div>
              )}

              {/* 모두 동기화됨 */}
              {pendingCount === 0 && conflictCount === 0 && !hasError && isOnline && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="h-4 w-4" />
                  <span>모든 데이터가 동기화되었습니다</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* 충돌 해결 모달 */}
      {showConflictModal && (
        <ConflictModal
          conflicts={conflicts}
          onResolveLocal={resolveConflictWithLocal}
          onResolveRemote={resolveConflictWithRemote}
          onClose={() => setShowConflictModal(false)}
        />
      )}
    </div>
  );
}

// =====================================================
// ConflictModal 컴포넌트
// =====================================================

interface ConflictModalProps {
  conflicts: PendingChange[];
  onResolveLocal: (changeId: number) => Promise<void>;
  onResolveRemote: (changeId: number) => Promise<void>;
  onClose: () => void;
}

function ConflictModal({
  conflicts,
  onResolveLocal,
  onResolveRemote,
  onClose,
}: ConflictModalProps) {
  const [resolving, setResolving] = useState<number | null>(null);

  const handleResolve = async (
    changeId: number,
    useRemote: boolean
  ) => {
    setResolving(changeId);
    try {
      if (useRemote) {
        await onResolveRemote(changeId);
      } else {
        await onResolveLocal(changeId);
      }
    } finally {
      setResolving(null);
    }
  };

  const getCollectionLabel = (collection: string): string => {
    switch (collection) {
      case "transactions":
        return "거래";
      case "assets":
        return "자산";
      case "categories":
        return "카테고리";
      default:
        return collection;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-card shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold">충돌 해결</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 충돌 목록 */}
        <div className="max-h-96 overflow-y-auto p-6">
          {conflicts.length === 0 ? (
            <div className="text-center text-muted-foreground">
              해결할 충돌이 없습니다
            </div>
          ) : (
            <div className="space-y-4">
              {conflicts.map((conflict) => (
                <div
                  key={conflict.id}
                  className="rounded-lg border border-border p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {getCollectionLabel(conflict.collection)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(conflict.timestamp).toLocaleString("ko-KR")}
                    </span>
                  </div>

                  {/* 충돌 상세 */}
                  <div className="mb-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                      <p className="mb-1 font-medium text-blue-700 dark:text-blue-400">
                        내 변경사항
                      </p>
                      <p className="text-blue-600 dark:text-blue-500">
                        버전 {conflict.data?.version || "?"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                      <p className="mb-1 font-medium text-green-700 dark:text-green-400">
                        서버 데이터
                      </p>
                      <p className="text-green-600 dark:text-green-500">
                        버전 {conflict.remoteVersion || "?"}
                      </p>
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResolve(conflict.id!, false)}
                      disabled={resolving === conflict.id}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-blue-300 bg-blue-50 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                    >
                      {resolving === conflict.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "내 변경사항 유지"
                      )}
                    </button>
                    <button
                      onClick={() => handleResolve(conflict.id!, true)}
                      disabled={resolving === conflict.id}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-green-300 bg-green-50 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
                    >
                      {resolving === conflict.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "서버 데이터 사용"
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="border-t border-border px-6 py-4">
          <p className="text-xs text-muted-foreground">
            충돌은 같은 데이터를 여러 기기에서 동시에 수정할 때 발생합니다.
            원하는 버전을 선택해주세요.
          </p>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// SyncStatusBadge 컴포넌트 (간단한 뱃지)
// =====================================================

interface SyncStatusBadgeProps {
  householdId?: string;
  userId?: string;
}

export function SyncStatusBadge({ householdId, userId }: SyncStatusBadgeProps) {
  const { isOnline, pendingCount, conflictCount, isSyncing } = useSyncStatus(
    householdId,
    userId
  );

  if (!isOnline) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
        <WifiOff className="h-3 w-3" />
        오프라인
      </span>
    );
  }

  if (isSyncing) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
        <RefreshCw className="h-3 w-3 animate-spin" />
        동기화 중
      </span>
    );
  }

  if (conflictCount > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
        <AlertTriangle className="h-3 w-3" />
        충돌 {conflictCount}
      </span>
    );
  }

  if (pendingCount > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
        <Cloud className="h-3 w-3" />
        대기 {pendingCount}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-600 dark:bg-green-900/30 dark:text-green-400">
      <Check className="h-3 w-3" />
      동기화됨
    </span>
  );
}

export default SyncIndicator;
