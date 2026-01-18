/**
 * Dexie.js를 이용한 IndexedDB 로컬 저장소
 *
 * 오프라인 지원을 위해 로컬에 데이터를 캐싱하고,
 * 온라인 복귀 시 Firebase와 동기화합니다.
 *
 * @description
 * - transactions: 거래 내역 캐시
 * - assets: 자산 정보 캐시
 * - categories: 카테고리 정보 캐시
 * - users: 사용자 정보 캐시
 * - pendingOperations: 오프라인 작업 큐
 *
 * @see https://dexie.org/
 */

import Dexie, { type Table } from "dexie";
import type {
  Transaction,
  Asset,
  Category,
  User,
  PendingOperation,
  SyncStatus,
} from "@/types";

// =====================================================
// 로컬 저장용 타입 정의
// Firestore Timestamp → number (Unix timestamp)로 변환
// =====================================================

/**
 * IndexedDB용 거래 내역 (Timestamp → number)
 */
export interface LocalTransaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  categoryId: string;
  categoryName: string;
  description: string;
  /** Unix timestamp (ms) */
  date: number;
  paymentMethod: string;
  tags?: string[];
  receiptUrl?: string;
  merchant?: string;
  location?: string;
  recurringId?: string;
  createdBy: string;
  createdByName: string;
  /** Unix timestamp (ms) */
  createdAt: number;
  /** Unix timestamp (ms) */
  updatedAt: number;
  version: number;
  syncStatus: SyncStatus;
  /** 소속 가계부 ID (인덱싱용) */
  householdId: string;
}

/**
 * IndexedDB용 자산 (Timestamp → number)
 */
export interface LocalAsset {
  id: string;
  assetName: string;
  category: string;
  amount: number;
  currency: string;
  description?: string;
  institution?: string;
  accountNumberLast4?: string;
  interestRate?: number;
  maturityDate?: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  version: number;
  syncStatus: SyncStatus;
  householdId: string;
}

/**
 * IndexedDB용 카테고리
 */
export interface LocalCategory {
  id: string;
  name: string;
  type: "income" | "expense";
  icon: string;
  color: string;
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  version: number;
  householdId: string;
}

/**
 * IndexedDB용 사용자
 */
export interface LocalUser {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  role: string;
  avatar?: string;
  currency: string;
  householdIds?: string[];
  lastLoginAt?: number;
  createdAt: number;
  updatedAt: number;
  version: number;
}

// =====================================================
// Dexie 데이터베이스 클래스
// =====================================================

/**
 * Family Budget Manager 로컬 데이터베이스
 *
 * @extends Dexie
 */
export class FamilyBudgetDB extends Dexie {
  /** 거래 내역 테이블 */
  transactions!: Table<LocalTransaction, string>;

  /** 자산 테이블 */
  assets!: Table<LocalAsset, string>;

  /** 카테고리 테이블 */
  categories!: Table<LocalCategory, string>;

  /** 사용자 테이블 */
  users!: Table<LocalUser, string>;

  /** 오프라인 작업 큐 테이블 */
  pendingOperations!: Table<PendingOperation, number>;

  constructor() {
    super("FamilyBudgetDB");

    // =====================================================
    // 스키마 버전 관리 (마이그레이션)
    // =====================================================

    /**
     * Version 1: 초기 스키마
     *
     * 인덱스 설명:
     * - &id: 기본 키 (unique)
     * - householdId: 가계부별 필터링
     * - date: 날짜별 정렬/필터링
     * - [householdId+date]: 복합 인덱스 (가계부 + 날짜)
     * - syncStatus: 동기화 상태별 필터링
     */
    this.version(1).stores({
      // 거래 내역: id(PK), householdId, date, type, categoryId, syncStatus 인덱스
      transactions: "&id, householdId, date, type, categoryId, syncStatus, [householdId+date], [householdId+type]",

      // 자산: id(PK), householdId, category, isActive, syncStatus 인덱스
      assets: "&id, householdId, category, isActive, syncStatus, sortOrder",

      // 카테고리: id(PK), householdId, type, isActive 인덱스
      categories: "&id, householdId, type, isActive, sortOrder",

      // 사용자: id(PK), uid, email 인덱스
      users: "&id, &uid, email",

      // 오프라인 작업 큐: id(PK, auto-increment), collection, timestamp 인덱스
      pendingOperations: "++id, collection, timestamp, type",
    });

    /**
     * Version 2: 향후 마이그레이션 예시
     *
     * 새 필드 추가 시:
     * this.version(2).stores({
     *   transactions: "&id, householdId, date, type, categoryId, syncStatus, newField",
     * }).upgrade(tx => {
     *   return tx.table("transactions").toCollection().modify(item => {
     *     item.newField = "default value";
     *   });
     * });
     */
  }
}

// =====================================================
// 데이터베이스 싱글톤 인스턴스
// =====================================================

/** 전역 데이터베이스 인스턴스 */
let dbInstance: FamilyBudgetDB | null = null;

/**
 * 데이터베이스 인스턴스 가져오기 (싱글톤)
 *
 * @returns {FamilyBudgetDB} 데이터베이스 인스턴스
 * @throws {Error} 브라우저 환경이 아닌 경우
 */
export function getLocalDB(): FamilyBudgetDB {
  if (typeof window === "undefined") {
    throw new Error("[IndexedDB] 서버 환경에서는 IndexedDB를 사용할 수 없습니다.");
  }

  if (!dbInstance) {
    dbInstance = new FamilyBudgetDB();
  }

  return dbInstance;
}

/**
 * 데이터베이스 연결 확인
 *
 * @returns {Promise<boolean>} 연결 성공 여부
 */
export async function checkDBConnection(): Promise<boolean> {
  try {
    const db = getLocalDB();
    await db.open();
    return db.isOpen();
  } catch (error) {
    console.error("[IndexedDB] 연결 확인 실패:", error);
    return false;
  }
}

/**
 * 데이터베이스 초기화 (모든 데이터 삭제)
 *
 * @description 로그아웃 시 또는 데이터 초기화가 필요할 때 사용
 */
export async function clearLocalDB(): Promise<void> {
  try {
    const db = getLocalDB();
    await Promise.all([
      db.transactions.clear(),
      db.assets.clear(),
      db.categories.clear(),
      db.users.clear(),
      db.pendingOperations.clear(),
    ]);
    console.info("[IndexedDB] 모든 로컬 데이터가 삭제되었습니다.");
  } catch (error) {
    console.error("[IndexedDB] 데이터 삭제 실패:", error);
    throw error;
  }
}

/**
 * 특정 가계부의 데이터만 삭제
 *
 * @param householdId 삭제할 가계부 ID
 */
export async function clearHouseholdData(householdId: string): Promise<void> {
  try {
    const db = getLocalDB();
    await Promise.all([
      db.transactions.where("householdId").equals(householdId).delete(),
      db.assets.where("householdId").equals(householdId).delete(),
      db.categories.where("householdId").equals(householdId).delete(),
    ]);
    console.info(`[IndexedDB] 가계부(${householdId}) 데이터가 삭제되었습니다.`);
  } catch (error) {
    console.error("[IndexedDB] 가계부 데이터 삭제 실패:", error);
    throw error;
  }
}

/**
 * 데이터베이스 삭제 (완전 초기화)
 *
 * @description 앱 재설치와 같은 효과
 */
export async function deleteLocalDB(): Promise<void> {
  try {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }
    await Dexie.delete("FamilyBudgetDB");
    console.info("[IndexedDB] 데이터베이스가 삭제되었습니다.");
  } catch (error) {
    console.error("[IndexedDB] 데이터베이스 삭제 실패:", error);
    throw error;
  }
}

// =====================================================
// 오프라인 작업 큐 헬퍼 함수
// =====================================================

/**
 * 오프라인 작업 추가
 *
 * @param operation 추가할 작업
 * @returns 생성된 작업 ID
 */
export async function addPendingOperation(
  operation: Omit<PendingOperation, "id" | "retryCount">
): Promise<number> {
  const db = getLocalDB();
  const id = await db.pendingOperations.add({
    ...operation,
    retryCount: 0,
  });
  return id;
}

/**
 * 대기 중인 오프라인 작업 조회
 *
 * @param limit 최대 조회 개수 (기본: 50)
 * @returns 대기 중인 작업 목록 (오래된 순)
 */
export async function getPendingOperations(
  limit: number = 50
): Promise<PendingOperation[]> {
  const db = getLocalDB();
  return db.pendingOperations
    .orderBy("timestamp")
    .limit(limit)
    .toArray();
}

/**
 * 오프라인 작업 삭제 (동기화 완료 시)
 *
 * @param id 삭제할 작업 ID
 */
export async function removePendingOperation(id: number): Promise<void> {
  const db = getLocalDB();
  await db.pendingOperations.delete(id);
}

/**
 * 오프라인 작업 재시도 횟수 증가
 *
 * @param id 작업 ID
 * @param error 에러 메시지
 */
export async function incrementRetryCount(
  id: number,
  error?: string
): Promise<void> {
  const db = getLocalDB();
  await db.pendingOperations.update(id, {
    retryCount: (await db.pendingOperations.get(id))?.retryCount ?? 0 + 1,
    lastError: error,
  });
}

/**
 * 대기 중인 작업 수 조회
 *
 * @returns 대기 중인 작업 수
 */
export async function getPendingOperationCount(): Promise<number> {
  const db = getLocalDB();
  return db.pendingOperations.count();
}

// =====================================================
// Firestore Timestamp 변환 유틸리티
// =====================================================

import type { Timestamp } from "firebase/firestore";

/**
 * Firestore Timestamp → Unix timestamp (ms)
 */
export function timestampToNumber(timestamp: Timestamp | null | undefined): number {
  if (!timestamp) return Date.now();
  return timestamp.toMillis();
}

/**
 * Unix timestamp (ms) → Date
 */
export function numberToDate(timestamp: number): Date {
  return new Date(timestamp);
}

/**
 * Firestore Transaction → LocalTransaction 변환
 */
export function toLocalTransaction(
  transaction: Transaction,
  householdId: string
): LocalTransaction {
  return {
    id: transaction.id,
    type: transaction.type,
    amount: transaction.amount,
    categoryId: transaction.categoryId,
    categoryName: transaction.categoryName,
    description: transaction.description,
    date: timestampToNumber(transaction.date),
    paymentMethod: transaction.paymentMethod,
    tags: transaction.tags,
    receiptUrl: transaction.receiptUrl,
    merchant: transaction.merchant,
    location: transaction.location,
    recurringId: transaction.recurringId,
    createdBy: transaction.createdBy,
    createdByName: transaction.createdByName,
    createdAt: timestampToNumber(transaction.createdAt),
    updatedAt: timestampToNumber(transaction.updatedAt),
    version: transaction.version,
    syncStatus: transaction.syncStatus,
    householdId,
  };
}

/**
 * Firestore Asset → LocalAsset 변환
 */
export function toLocalAsset(asset: Asset, householdId: string): LocalAsset {
  return {
    id: asset.id,
    assetName: asset.assetName,
    category: asset.category,
    amount: asset.amount,
    currency: asset.currency,
    description: asset.description,
    institution: asset.institution,
    accountNumberLast4: asset.accountNumberLast4,
    interestRate: asset.interestRate,
    maturityDate: asset.maturityDate ? timestampToNumber(asset.maturityDate) : undefined,
    isActive: asset.isActive,
    sortOrder: asset.sortOrder,
    createdAt: timestampToNumber(asset.createdAt),
    updatedAt: timestampToNumber(asset.updatedAt),
    version: asset.version,
    syncStatus: asset.syncStatus,
    householdId,
  };
}

/**
 * Firestore Category → LocalCategory 변환
 */
export function toLocalCategory(
  category: Category,
  householdId: string
): LocalCategory {
  return {
    id: category.id,
    name: category.name,
    type: category.type,
    icon: category.icon,
    color: category.color,
    sortOrder: category.sortOrder,
    isSystem: category.isSystem,
    isActive: category.isActive,
    createdAt: timestampToNumber(category.createdAt),
    updatedAt: timestampToNumber(category.updatedAt),
    version: category.version,
    householdId,
  };
}

/**
 * Firestore User → LocalUser 변환
 */
export function toLocalUser(user: User): LocalUser {
  return {
    id: user.id,
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    avatar: user.avatar,
    currency: user.currency,
    householdIds: user.householdIds,
    lastLoginAt: user.lastLoginAt ? timestampToNumber(user.lastLoginAt) : undefined,
    createdAt: timestampToNumber(user.createdAt),
    updatedAt: timestampToNumber(user.updatedAt),
    version: user.version,
  };
}

export { Dexie };
export default getLocalDB;
