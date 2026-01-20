/**
 * 오프라인 변경사항 관리
 *
 * IndexedDB에 대기 중인 변경사항을 저장하고,
 * 온라인 복귀 시 Firestore와 동기화합니다.
 */

import { getLocalDB } from "./indexedDB";

// =====================================================
// PendingChange 타입 정의
// =====================================================

/**
 * 변경 작업 유형
 */
export type ChangeType = "CREATE" | "UPDATE" | "DELETE";

/**
 * 대상 컬렉션
 */
export type ChangeCollection = "transactions" | "assets" | "categories" | "preferences";

/**
 * 대기 중인 변경사항
 */
export interface PendingChange {
  /** 로컬 ID (자동 생성) */
  id?: number;
  /** 변경 유형 */
  type: ChangeType;
  /** 대상 컬렉션 */
  collection: ChangeCollection;
  /** 가계부 ID (preferences 제외) */
  householdId?: string;
  /** 문서 ID */
  documentId: string;
  /** 변경 데이터 (DELETE 제외) */
  data?: Record<string, any>;
  /** 생성 시각 (Unix timestamp) */
  timestamp: number;
  /** 동기화 완료 여부 */
  synced: boolean;
  /** 에러 메시지 */
  error?: string;
  /** 재시도 횟수 */
  retryCount: number;
  /** 충돌 상태 */
  hasConflict?: boolean;
  /** 원격 버전 (충돌 시) */
  remoteVersion?: number;
  /** 원격 데이터 (충돌 시) */
  remoteData?: Record<string, any>;
}

/**
 * 동기화 결과
 */
export interface SyncResult {
  success: boolean;
  changeId: number;
  error?: string;
  hasConflict?: boolean;
  remoteData?: Record<string, any>;
}

// =====================================================
// Dexie 테이블 확장
// =====================================================

import Dexie from "dexie";
import type { FamilyBudgetDB } from "./indexedDB";

// 기존 DB에 pending_changes 테이블 추가
declare module "./indexedDB" {
  interface FamilyBudgetDB {
    pendingChanges: Dexie.Table<PendingChange, number>;
  }
}

// DB 버전 업그레이드 (Version 2)
// 실제 마이그레이션은 indexedDB.ts에서 처리

// =====================================================
// PendingChanges Repository
// =====================================================

class PendingChangesRepository {
  /**
   * 변경사항 추가
   */
  async add(change: Omit<PendingChange, "id" | "retryCount" | "synced">): Promise<number> {
    const db = getLocalDB();

    // pendingChanges 테이블이 없으면 pendingOperations 사용
    const table = (db as any).pendingChanges || db.pendingOperations;

    const id = await table.add({
      ...change,
      synced: false,
      retryCount: 0,
    });

    return id;
  }

  /**
   * 대기 중인 변경사항 조회
   */
  async getPending(limit: number = 50): Promise<PendingChange[]> {
    const db = getLocalDB();
    const table = (db as any).pendingChanges || db.pendingOperations;

    return table
      .filter((c: PendingChange) => !c.synced)
      .limit(limit)
      .toArray();
  }

  /**
   * 충돌된 변경사항 조회
   */
  async getConflicts(): Promise<PendingChange[]> {
    const db = getLocalDB();
    const table = (db as any).pendingChanges || db.pendingOperations;

    return table
      .filter((c: PendingChange) => c.hasConflict === true)
      .toArray();
  }

  /**
   * 변경사항 동기화 완료 표시
   */
  async markSynced(id: number): Promise<void> {
    const db = getLocalDB();
    const table = (db as any).pendingChanges || db.pendingOperations;

    await table.update(id, { synced: true });
  }

  /**
   * 변경사항 삭제
   */
  async remove(id: number): Promise<void> {
    const db = getLocalDB();
    const table = (db as any).pendingChanges || db.pendingOperations;

    await table.delete(id);
  }

  /**
   * 동기화된 변경사항 모두 삭제
   */
  async removeSynced(): Promise<number> {
    const db = getLocalDB();
    const table = (db as any).pendingChanges || db.pendingOperations;

    return table.where("synced").equals(true).delete();
  }

  /**
   * 에러 업데이트 및 재시도 횟수 증가
   */
  async updateError(id: number, error: string): Promise<void> {
    const db = getLocalDB();
    const table = (db as any).pendingChanges || db.pendingOperations;

    const change = await table.get(id);
    if (change) {
      await table.update(id, {
        error,
        retryCount: (change.retryCount || 0) + 1,
      });
    }
  }

  /**
   * 충돌 표시
   */
  async markConflict(
    id: number,
    remoteVersion: number,
    remoteData: Record<string, any>
  ): Promise<void> {
    const db = getLocalDB();
    const table = (db as any).pendingChanges || db.pendingOperations;

    await table.update(id, {
      hasConflict: true,
      remoteVersion,
      remoteData,
    });
  }

  /**
   * 충돌 해결
   */
  async resolveConflict(id: number, useRemote: boolean): Promise<void> {
    const db = getLocalDB();
    const table = (db as any).pendingChanges || db.pendingOperations;

    if (useRemote) {
      // 원격 데이터 사용 시 변경사항 삭제
      await table.delete(id);
    } else {
      // 로컬 데이터 사용 시 충돌 해제
      await table.update(id, {
        hasConflict: false,
        remoteVersion: undefined,
        remoteData: undefined,
      });
    }
  }

  /**
   * 대기 중인 변경사항 수 조회
   */
  async getPendingCount(): Promise<number> {
    const db = getLocalDB();
    const table = (db as any).pendingChanges || db.pendingOperations;

    return table.filter((c: PendingChange) => !c.synced).count();
  }

  /**
   * 충돌 수 조회
   */
  async getConflictCount(): Promise<number> {
    const db = getLocalDB();
    const table = (db as any).pendingChanges || db.pendingOperations;

    return table.filter((c: PendingChange) => c.hasConflict === true).count();
  }

  /**
   * 특정 문서의 대기 중인 변경사항 조회
   */
  async getByDocumentId(
    collection: ChangeCollection,
    documentId: string
  ): Promise<PendingChange | undefined> {
    const db = getLocalDB();
    const table = (db as any).pendingChanges || db.pendingOperations;

    return table
      .filter(
        (c: PendingChange) =>
          c.collection === collection &&
          c.documentId === documentId &&
          !c.synced
      )
      .first();
  }

  /**
   * 모든 대기 중인 변경사항 삭제 (초기화)
   */
  async clear(): Promise<void> {
    const db = getLocalDB();
    const table = (db as any).pendingChanges || db.pendingOperations;

    await table.clear();
  }
}

// 싱글톤 인스턴스
export const pendingChangesRepository = new PendingChangesRepository();

export default pendingChangesRepository;
