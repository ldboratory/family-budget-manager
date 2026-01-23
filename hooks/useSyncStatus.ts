/**
 * 동기화 상태 관리 Hook
 *
 * - 온/오프라인 상태 추적
 * - 대기 중인 변경사항 수
 * - 충돌 상태
 * - 동기화 이벤트 핸들링
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getSyncEngine,
  type SyncState,
  type SyncEvent,
} from "@/lib/sync/syncEngine";
import { pendingChangesRepository, type PendingChange } from "@/lib/db/pendingChanges";
import type { ConflictDetails } from "@/lib/sync/conflictResolver";

// =====================================================
// 타입 정의
// =====================================================

export interface SyncStatus {
  /** 현재 동기화 상태 */
  state: SyncState;
  /** 온라인 여부 */
  isOnline: boolean;
  /** 마지막 동기화 시간 */
  lastSyncTime: Date | null;
  /** 대기 중인 변경사항 수 */
  pendingCount: number;
  /** 충돌 수 */
  conflictCount: number;
  /** 동기화 중 여부 */
  isSyncing: boolean;
  /** 에러 발생 여부 */
  hasError: boolean;
}

export interface ConflictInfo {
  /** 충돌 변경사항 ID */
  changeId: number;
  /** 충돌 상세 정보 */
  details: ConflictDetails;
}

export interface UseSyncStatusResult extends SyncStatus {
  /** 대기 중인 변경사항 목록 */
  pendingChanges: PendingChange[];
  /** 충돌 목록 */
  conflicts: PendingChange[];
  /** 수동 동기화 트리거 */
  syncNow: () => Promise<void>;
  /** 충돌 해결 (로컬 선택) */
  resolveConflictWithLocal: (changeId: number) => Promise<void>;
  /** 충돌 해결 (원격 선택) */
  resolveConflictWithRemote: (changeId: number) => Promise<void>;
  /** 마지막 이벤트 */
  lastEvent: SyncEvent | null;
}

// =====================================================
// useSyncStatus Hook
// =====================================================

export function useSyncStatus(
  householdId?: string,
  userId?: string
): UseSyncStatusResult {
  // 상태
  const [state, setState] = useState<SyncState>("idle");
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [conflictCount, setConflictCount] = useState<number>(0);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [conflicts, setConflicts] = useState<PendingChange[]>([]);
  const [lastEvent, setLastEvent] = useState<SyncEvent | null>(null);

  // Refs
  const syncEngineRef = useRef(getSyncEngine());
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 상태 업데이트
  const updateStatus = useCallback(async () => {
    try {
      const engine = syncEngineRef.current;
      setState(engine.getState());
      setIsOnline(engine.getIsOnline());

      const syncTime = engine.getLastSyncTime();
      setLastSyncTime(syncTime ? new Date(syncTime) : null);

      const pending = await pendingChangesRepository.getPendingCount();
      setPendingCount(pending);

      const conflictNum = await pendingChangesRepository.getConflictCount();
      setConflictCount(conflictNum);

      // 상세 목록 업데이트
      const pendingList = await pendingChangesRepository.getPending();
      setPendingChanges(pendingList);

      const conflictList = await pendingChangesRepository.getConflicts();
      setConflicts(conflictList);
    } catch (error) {
      console.error("[useSyncStatus] 상태 업데이트 실패:", error);
    }
  }, []);

  // 이벤트 핸들러
  const handleSyncEvent = useCallback(
    (event: SyncEvent) => {
      setLastEvent(event);

      switch (event.type) {
        case "online":
          setIsOnline(true);
          break;

        case "offline":
          setIsOnline(false);
          setState("offline");
          break;

        case "sync_start":
          setState("syncing");
          break;

        case "sync_complete":
          setState("idle");
          setLastSyncTime(new Date(event.timestamp));
          updateStatus();
          break;

        case "sync_error":
          setState("error");
          updateStatus();
          break;

        case "conflict_detected":
        case "conflict_resolved":
        case "remote_update":
          updateStatus();
          break;
      }
    },
    [updateStatus]
  );

  // SyncEngine 초기화 및 이벤트 구독
  useEffect(() => {
    const engine = syncEngineRef.current;

    // 이벤트 리스너 등록
    const unsubscribe = engine.addEventListener(handleSyncEvent);

    // 동기화 시작 (householdId, userId가 있을 때)
    if (householdId && userId) {
      engine.startSync(householdId, userId);
    }

    // 초기 상태 업데이트
    updateStatus();

    // 주기적 상태 업데이트 (10초)
    updateIntervalRef.current = setInterval(updateStatus, 10000);

    return () => {
      unsubscribe();
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [householdId, userId, handleSyncEvent, updateStatus]);

  // 브라우저 온라인 상태 감지
  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 수동 동기화
  const syncNow = useCallback(async () => {
    const engine = syncEngineRef.current;
    await engine.processPendingChanges();
    await updateStatus();
  }, [updateStatus]);

  // 충돌 해결 - 로컬 선택
  const resolveConflictWithLocal = useCallback(
    async (changeId: number) => {
      const engine = syncEngineRef.current;
      await engine.resolveConflictManually(changeId, false);
      await updateStatus();
    },
    [updateStatus]
  );

  // 충돌 해결 - 원격 선택
  const resolveConflictWithRemote = useCallback(
    async (changeId: number) => {
      const engine = syncEngineRef.current;
      await engine.resolveConflictManually(changeId, true);
      await updateStatus();
    },
    [updateStatus]
  );

  return {
    state,
    isOnline,
    lastSyncTime,
    pendingCount,
    conflictCount,
    isSyncing: state === "syncing",
    hasError: state === "error",
    pendingChanges,
    conflicts,
    syncNow,
    resolveConflictWithLocal,
    resolveConflictWithRemote,
    lastEvent,
  };
}

// =====================================================
// useOnlineStatus Hook (간단한 온라인 상태만)
// =====================================================

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

// =====================================================
// usePendingChanges Hook (대기 중인 변경사항만)
// =====================================================

export function usePendingChanges(): {
  count: number;
  changes: PendingChange[];
  refresh: () => Promise<void>;
} {
  const [count, setCount] = useState<number>(0);
  const [changes, setChanges] = useState<PendingChange[]>([]);

  const refresh = useCallback(async () => {
    try {
      const pending = await pendingChangesRepository.getPendingCount();
      setCount(pending);

      const list = await pendingChangesRepository.getPending();
      setChanges(list);
    } catch (error) {
      console.error("[usePendingChanges] 조회 실패:", error);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { count, changes, refresh };
}

export default useSyncStatus;
