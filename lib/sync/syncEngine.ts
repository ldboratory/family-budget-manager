/**
 * 오프라인-퍼스트 동기화 엔진
 *
 * - 온/오프라인 감지
 * - 변경사항 로컬 큐잉
 * - Firestore와 실시간 동기화
 * - 버전 기반 충돌 해결
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getLocalDB, toLocalTransaction, toLocalAsset } from "@/lib/db/indexedDB";
import {
  pendingChangesRepository,
  type PendingChange,
  type ChangeCollection,
  type ChangeType,
} from "@/lib/db/pendingChanges";
import {
  resolveConflict,
  hasVersionConflict,
  type ConflictStrategy,
  type ConflictData,
} from "./conflictResolver";

// =====================================================
// 타입 정의
// =====================================================

/**
 * 동기화 상태
 */
export type SyncState = "idle" | "syncing" | "error" | "offline";

/**
 * 동기화 이벤트
 */
export type SyncEventType =
  | "online"
  | "offline"
  | "sync_start"
  | "sync_complete"
  | "sync_error"
  | "conflict_detected"
  | "conflict_resolved"
  | "remote_update";

export interface SyncEvent {
  type: SyncEventType;
  timestamp: number;
  data?: any;
}

/**
 * 동기화 리스너
 */
export type SyncEventListener = (event: SyncEvent) => void;

/**
 * 동기화 설정
 */
export interface SyncEngineConfig {
  /** 충돌 해결 전략 (기본: LWW) */
  conflictStrategy: ConflictStrategy;
  /** 자동 동기화 간격 (ms, 기본: 30000) */
  syncInterval: number;
  /** 최대 재시도 횟수 (기본: 3) */
  maxRetries: number;
  /** 재시도 지연 (ms, 기본: 1000) */
  retryDelay: number;
  /** 실시간 리스너 활성화 (기본: true) */
  enableRealtimeSync: boolean;
}

const DEFAULT_CONFIG: SyncEngineConfig = {
  conflictStrategy: "LWW",
  syncInterval: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  enableRealtimeSync: true,
};

// =====================================================
// SyncEngine 클래스
// =====================================================

class SyncEngine {
  private state: SyncState = "idle";
  private isOnline: boolean = true;
  private config: SyncEngineConfig;
  private listeners: Set<SyncEventListener> = new Set();
  private syncIntervalId: NodeJS.Timeout | null = null;
  private unsubscribers: Unsubscribe[] = [];
  private householdId: string | null = null;
  private userId: string | null = null;
  private lastSyncTime: number | null = null;

  constructor(config: Partial<SyncEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // 브라우저 환경에서만 온라인 상태 감지
    if (typeof window !== "undefined") {
      this.isOnline = navigator.onLine;
      this.setupOnlineListeners();
    }
  }

  // =====================================================
  // 공개 메서드
  // =====================================================

  /**
   * 동기화 시작
   */
  startSync(householdId: string, userId: string): void {
    this.householdId = householdId;
    this.userId = userId;

    console.info("[SyncEngine] 동기화 시작:", { householdId, userId });

    // 초기 동기화
    this.processPendingChanges();

    // 자동 동기화 시작
    if (this.config.syncInterval > 0) {
      this.syncIntervalId = setInterval(() => {
        if (this.isOnline) {
          this.processPendingChanges();
        }
      }, this.config.syncInterval);
    }

    // 실시간 리스너 설정
    if (this.config.enableRealtimeSync) {
      this.setupRealtimeListeners();
    }
  }

  /**
   * 동기화 중지
   */
  stopSync(): void {
    console.info("[SyncEngine] 동기화 중지");

    // 자동 동기화 중지
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }

    // 실시간 리스너 해제
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];

    this.householdId = null;
    this.userId = null;
    this.state = "idle";
  }

  /**
   * 변경사항 큐에 추가
   */
  async queueChange(
    type: ChangeType,
    collection: ChangeCollection,
    documentId: string,
    data?: Record<string, any>
  ): Promise<number> {
    const change: Omit<PendingChange, "id" | "retryCount" | "synced"> = {
      type,
      collection,
      householdId: this.householdId || undefined,
      documentId,
      data,
      timestamp: Date.now(),
    };

    const id = await pendingChangesRepository.add(change);

    console.info("[SyncEngine] 변경사항 큐에 추가:", { id, type, collection, documentId });

    // 온라인이면 즉시 동기화 시도
    if (this.isOnline) {
      this.processPendingChanges();
    }

    return id;
  }

  /**
   * 대기 중인 변경사항 처리
   */
  async processPendingChanges(): Promise<void> {
    if (!this.isOnline) {
      console.info("[SyncEngine] 오프라인 상태 - 동기화 건너뜀");
      return;
    }

    if (this.state === "syncing") {
      console.info("[SyncEngine] 이미 동기화 중");
      return;
    }

    this.setState("syncing");
    this.emit({ type: "sync_start", timestamp: Date.now() });

    try {
      const pendingChanges = await pendingChangesRepository.getPending();
      console.info("[SyncEngine] 처리할 변경사항:", pendingChanges.length);

      for (const change of pendingChanges) {
        await this.processChange(change);
      }

      // 동기화된 항목 정리
      await pendingChangesRepository.removeSynced();

      this.lastSyncTime = Date.now();
      this.setState("idle");
      this.emit({ type: "sync_complete", timestamp: Date.now() });
    } catch (error) {
      console.error("[SyncEngine] 동기화 실패:", error);
      this.setState("error");
      this.emit({
        type: "sync_error",
        timestamp: Date.now(),
        data: { error },
      });
    }
  }

  /**
   * 충돌 해결
   */
  async resolveConflictManually(
    changeId: number,
    useRemote: boolean
  ): Promise<void> {
    await pendingChangesRepository.resolveConflict(changeId, useRemote);

    this.emit({
      type: "conflict_resolved",
      timestamp: Date.now(),
      data: { changeId, useRemote },
    });

    // 로컬 선택 시 다시 동기화 시도
    if (!useRemote) {
      this.processPendingChanges();
    }
  }

  // =====================================================
  // 상태 및 이벤트
  // =====================================================

  /**
   * 현재 상태 반환
   */
  getState(): SyncState {
    return this.state;
  }

  /**
   * 온라인 여부 반환
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * 마지막 동기화 시간 반환
   */
  getLastSyncTime(): number | null {
    return this.lastSyncTime;
  }

  /**
   * 이벤트 리스너 등록
   */
  addEventListener(listener: SyncEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 이벤트 리스너 제거
   */
  removeEventListener(listener: SyncEventListener): void {
    this.listeners.delete(listener);
  }

  // =====================================================
  // 내부 메서드
  // =====================================================

  private setState(state: SyncState): void {
    this.state = state;
  }

  private emit(event: SyncEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error("[SyncEngine] 리스너 오류:", error);
      }
    });
  }

  /**
   * 온라인/오프라인 이벤트 설정
   */
  private setupOnlineListeners(): void {
    window.addEventListener("online", () => {
      console.info("[SyncEngine] 온라인 복귀");
      this.isOnline = true;
      this.emit({ type: "online", timestamp: Date.now() });

      // 온라인 복귀 시 대기 중인 변경사항 동기화
      this.processPendingChanges();
    });

    window.addEventListener("offline", () => {
      console.info("[SyncEngine] 오프라인 전환");
      this.isOnline = false;
      this.setState("offline");
      this.emit({ type: "offline", timestamp: Date.now() });
    });
  }

  /**
   * Firestore 실시간 리스너 설정
   */
  private setupRealtimeListeners(): void {
    if (!this.householdId) return;

    // 거래 내역 리스너
    const transactionsRef = collection(
      db,
      `households/${this.householdId}/transactions`
    );
    const unsubTransactions = onSnapshot(transactionsRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "modified" || change.type === "added") {
          this.handleRemoteUpdate("transactions", change.doc.id, change.doc.data());
        }
      });
    });
    this.unsubscribers.push(unsubTransactions);

    // 자산 리스너
    const assetsRef = collection(
      db,
      `households/${this.householdId}/assets`
    );
    const unsubAssets = onSnapshot(assetsRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "modified" || change.type === "added") {
          this.handleRemoteUpdate("assets", change.doc.id, change.doc.data());
        }
      });
    });
    this.unsubscribers.push(unsubAssets);

    console.info("[SyncEngine] 실시간 리스너 설정 완료");
  }

  /**
   * 원격 업데이트 처리
   */
  private async handleRemoteUpdate(
    collectionName: ChangeCollection,
    documentId: string,
    data: Record<string, any>
  ): Promise<void> {
    try {
      const localDB = getLocalDB();

      // 로컬 데이터 조회
      let localData: any;
      if (collectionName === "transactions") {
        localData = await localDB.transactions.get(documentId);
      } else if (collectionName === "assets") {
        localData = await localDB.assets.get(documentId);
      }

      // 대기 중인 변경사항 확인
      const pendingChange = await pendingChangesRepository.getByDocumentId(
        collectionName,
        documentId
      );

      if (pendingChange) {
        // 대기 중인 변경사항이 있으면 충돌 가능성 확인
        if (localData && hasVersionConflict(localData.version, data.version)) {
          console.warn("[SyncEngine] 원격 업데이트 중 충돌 감지:", documentId);
          // 충돌은 processPendingChanges에서 처리
          return;
        }
      }

      // 로컬 DB 업데이트
      await this.updateLocalDB(collectionName, documentId, data);

      this.emit({
        type: "remote_update",
        timestamp: Date.now(),
        data: { collection: collectionName, documentId },
      });
    } catch (error) {
      console.error("[SyncEngine] 원격 업데이트 처리 실패:", error);
    }
  }

  /**
   * 로컬 DB 업데이트
   */
  private async updateLocalDB(
    collectionName: ChangeCollection,
    documentId: string,
    data: Record<string, any>
  ): Promise<void> {
    const localDB = getLocalDB();

    if (collectionName === "transactions") {
      const localData = toLocalTransaction(
        { id: documentId, ...data } as any,
        this.householdId || ""
      );
      await localDB.transactions.put(localData);
    } else if (collectionName === "assets") {
      const localData = toLocalAsset(
        { id: documentId, ...data } as any,
        this.householdId || ""
      );
      await localDB.assets.put(localData);
    }
  }

  /**
   * 개별 변경사항 처리
   */
  private async processChange(change: PendingChange): Promise<void> {
    if (!change.id) return;

    // 재시도 횟수 초과 확인
    if (change.retryCount >= this.config.maxRetries) {
      console.warn("[SyncEngine] 최대 재시도 횟수 초과:", change.id);
      return;
    }

    try {
      const collectionPath = this.getCollectionPath(change);
      if (!collectionPath) {
        throw new Error("컬렉션 경로를 찾을 수 없습니다");
      }

      const docRef = doc(db, collectionPath, change.documentId);

      switch (change.type) {
        case "CREATE":
          await this.processCreate(docRef, change);
          break;

        case "UPDATE":
          await this.processUpdate(docRef, change);
          break;

        case "DELETE":
          await this.processDelete(docRef, change);
          break;
      }

      // 성공 시 동기화 완료 표시
      await pendingChangesRepository.markSynced(change.id);
    } catch (error: any) {
      console.error("[SyncEngine] 변경사항 처리 실패:", change.id, error);

      // 에러 업데이트
      await pendingChangesRepository.updateError(
        change.id,
        error.message || "알 수 없는 오류"
      );

      // 재시도 지연
      await this.delay(this.config.retryDelay);
    }
  }

  /**
   * CREATE 작업 처리
   */
  private async processCreate(
    docRef: ReturnType<typeof doc>,
    change: PendingChange
  ): Promise<void> {
    if (!change.data) throw new Error("데이터가 없습니다");

    const data = {
      ...change.data,
      createdAt: Timestamp.fromMillis(change.timestamp),
      updatedAt: Timestamp.now(),
      version: 1,
    };

    await setDoc(docRef, data);
  }

  /**
   * UPDATE 작업 처리
   */
  private async processUpdate(
    docRef: ReturnType<typeof doc>,
    change: PendingChange
  ): Promise<void> {
    if (!change.data || !change.id) throw new Error("데이터가 없습니다");

    // 현재 원격 데이터 조회
    const remoteSnap = await getDoc(docRef);

    if (!remoteSnap.exists()) {
      // 원격에 없으면 CREATE로 처리
      await this.processCreate(docRef, change);
      return;
    }

    const remoteData = remoteSnap.data();
    const localVersion = change.data.version || 1;
    const remoteVersion = remoteData.version || 1;

    // 버전 충돌 확인
    if (hasVersionConflict(localVersion, remoteVersion)) {
      // 충돌 해결
      const conflictData: ConflictData = {
        local: change.data,
        localTimestamp: change.timestamp,
        localVersion,
        remote: remoteData,
        remoteTimestamp: remoteData.updatedAt?.toMillis() || Date.now(),
        remoteVersion,
      };

      const result = resolveConflict(conflictData, this.config.conflictStrategy);

      if (result.requiresManualResolution) {
        // 수동 해결 필요
        await pendingChangesRepository.markConflict(
          change.id,
          remoteVersion,
          remoteData
        );

        this.emit({
          type: "conflict_detected",
          timestamp: Date.now(),
          data: {
            changeId: change.id,
            conflictDetails: result.conflictDetails,
          },
        });

        throw new Error("충돌 발생 - 수동 해결 필요");
      }

      // 자동 해결된 경우
      if (result.resolved && result.data) {
        await updateDoc(docRef, {
          ...result.data,
          updatedAt: Timestamp.now(),
          version: result.version,
        });
      }
    } else {
      // 충돌 없음 - 정상 업데이트
      await updateDoc(docRef, {
        ...change.data,
        updatedAt: Timestamp.now(),
        version: remoteVersion + 1,
      });
    }
  }

  /**
   * DELETE 작업 처리
   */
  private async processDelete(
    docRef: ReturnType<typeof doc>,
    change: PendingChange
  ): Promise<void> {
    await deleteDoc(docRef);
  }

  /**
   * 컬렉션 경로 생성
   */
  private getCollectionPath(change: PendingChange): string | null {
    const householdId = change.householdId || this.householdId;

    switch (change.collection) {
      case "transactions":
        return `households/${householdId}/transactions`;
      case "assets":
        return `households/${householdId}/assets`;
      case "categories":
        return `households/${householdId}/categories`;
      case "preferences":
        return `users/${this.userId}/preferences`;
      default:
        return null;
    }
  }

  /**
   * 지연
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// =====================================================
// 싱글톤 인스턴스
// =====================================================

let syncEngineInstance: SyncEngine | null = null;

/**
 * SyncEngine 인스턴스 가져오기
 */
export function getSyncEngine(config?: Partial<SyncEngineConfig>): SyncEngine {
  if (!syncEngineInstance) {
    syncEngineInstance = new SyncEngine(config);
  }
  return syncEngineInstance;
}

/**
 * SyncEngine 인스턴스 초기화
 */
export function resetSyncEngine(): void {
  if (syncEngineInstance) {
    syncEngineInstance.stopSync();
    syncEngineInstance = null;
  }
}

export { SyncEngine };
export default getSyncEngine;
