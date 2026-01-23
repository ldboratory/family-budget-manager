/**
 * Transaction Repository 구현체
 *
 * Firestore와 IndexedDB를 통합하여 거래 내역을 관리합니다.
 * 오프라인 우선 전략: 먼저 IndexedDB에 저장 후 Firestore 동기화
 *
 * @description
 * - 온라인: Firestore에 저장, IndexedDB에 캐시
 * - 오프라인: IndexedDB에만 저장, syncStatus: "pending"
 * - 동기화: pending 상태인 항목을 Firestore로 푸시
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  Timestamp,
  runTransaction,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  getLocalDB,
  toLocalTransaction,
  addPendingOperation,
  type LocalTransaction,
} from "./indexedDB";
import type {
  Transaction,
  TransactionCreateInput,
  TransactionUpdateInput,
  TransactionFilter,
  TransactionType,
  PaymentMethod,
  SyncStatus,
  PaginatedResponse,
} from "@/types";
import type {
  ITransactionRepository,
  RepositoryResult,
  ListOptions,
  DateRangeOptions,
} from "./repositories";

// =====================================================
// 유틸리티 함수
// =====================================================

/**
 * UUID 생성
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * 온라인 상태 확인
 */
function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

/**
 * Firestore 문서 → Transaction 변환
 */
function docToTransaction(docData: DocumentData, id: string): Transaction {
  return {
    id,
    type: docData.type as TransactionType,
    amount: docData.amount,
    categoryId: docData.categoryId,
    categoryName: docData.categoryName,
    description: docData.description,
    date: docData.date,
    paymentMethod: docData.paymentMethod as PaymentMethod,
    tags: docData.tags,
    receiptUrl: docData.receiptUrl,
    merchant: docData.merchant,
    location: docData.location,
    recurringId: docData.recurringId,
    createdBy: docData.createdBy,
    createdByName: docData.createdByName,
    createdAt: docData.createdAt,
    updatedAt: docData.updatedAt,
    version: docData.version,
    syncStatus: docData.syncStatus as SyncStatus,
  };
}

/**
 * LocalTransaction → Transaction 변환
 */
function localToTransaction(local: LocalTransaction): Transaction {
  return {
    id: local.id,
    type: local.type,
    amount: local.amount,
    categoryId: local.categoryId,
    categoryName: local.categoryName,
    description: local.description,
    date: Timestamp.fromMillis(local.date),
    paymentMethod: local.paymentMethod as PaymentMethod,
    tags: local.tags,
    receiptUrl: local.receiptUrl,
    merchant: local.merchant,
    location: local.location,
    recurringId: local.recurringId,
    createdBy: local.createdBy,
    createdByName: local.createdByName,
    createdAt: Timestamp.fromMillis(local.createdAt),
    updatedAt: Timestamp.fromMillis(local.updatedAt),
    version: local.version,
    syncStatus: local.syncStatus,
  };
}

/**
 * 성공 응답 생성
 */
function success<T>(data: T): RepositoryResult<T> {
  return { success: true, data };
}

/**
 * 에러 응답 생성
 */
function error<T>(code: string, message: string): RepositoryResult<T> {
  return {
    success: false,
    error: { code: code as any, message },
  };
}

// =====================================================
// TransactionRepository 구현
// =====================================================

export class TransactionRepository implements ITransactionRepository {
  /**
   * Firestore 컬렉션 경로
   */
  private getCollectionPath(householdId: string): string {
    return `households/${householdId}/transactions`;
  }

  /**
   * Firestore 문서 참조
   */
  private getDocRef(householdId: string, transactionId: string) {
    return doc(db, this.getCollectionPath(householdId), transactionId);
  }

  /**
   * Firestore 컬렉션 참조
   */
  private getCollectionRef(householdId: string) {
    return collection(db, this.getCollectionPath(householdId));
  }

  // ===== 생성 =====

  async create(
    householdId: string,
    input: TransactionCreateInput
  ): Promise<RepositoryResult<Transaction>> {
    try {
      const id = generateId();
      const now = Timestamp.now();

      const transaction: Transaction = {
        id,
        type: input.type,
        amount: input.amount,
        categoryId: input.categoryId,
        categoryName: "", // 카테고리 이름은 클라이언트에서 설정
        description: input.description,
        date: input.date,
        paymentMethod: input.paymentMethod,
        tags: input.tags ?? [],
        receiptUrl: input.receiptUrl,
        merchant: input.merchant,
        location: input.location,
        createdBy: "", // 클라이언트에서 설정
        createdByName: "", // 클라이언트에서 설정
        createdAt: now,
        updatedAt: now,
        version: 1,
        syncStatus: isOnline() ? "synced" : "pending",
      };

      // IndexedDB에 저장
      const localDB = getLocalDB();
      const localTransaction = toLocalTransaction(transaction, householdId);
      await localDB.transactions.put(localTransaction);

      // 온라인이면 Firestore에도 저장
      if (isOnline()) {
        try {
          const docRef = this.getDocRef(householdId, id);
          await setDoc(docRef, {
            ...transaction,
            createdAt: now,
            updatedAt: now,
          });
        } catch (firestoreError) {
          // Firestore 저장 실패 시 pending으로 변경
          console.error("[TransactionRepository] Firestore 저장 실패:", firestoreError);
          await localDB.transactions.update(id, { syncStatus: "pending" });
          transaction.syncStatus = "pending";

          // 오프라인 작업 큐에 추가
          await addPendingOperation({
            type: "create",
            collection: this.getCollectionPath(householdId),
            documentId: id,
            data: transaction as unknown as Record<string, unknown>,
            timestamp: Date.now(),
          });
        }
      } else {
        // 오프라인 작업 큐에 추가
        await addPendingOperation({
          type: "create",
          collection: this.getCollectionPath(householdId),
          documentId: id,
          data: transaction as unknown as Record<string, unknown>,
          timestamp: Date.now(),
        });
      }

      return success(transaction);
    } catch (err) {
      console.error("[TransactionRepository] create 실패:", err);
      return error("INTERNAL_ERROR", "거래 생성에 실패했습니다");
    }
  }

  // ===== 조회 =====

  async findById(
    householdId: string,
    transactionId: string
  ): Promise<RepositoryResult<Transaction | null>> {
    try {
      // 먼저 IndexedDB에서 조회
      const localDB = getLocalDB();
      const localTransaction = await localDB.transactions.get(transactionId);

      if (localTransaction) {
        return success(localToTransaction(localTransaction));
      }

      // IndexedDB에 없으면 Firestore에서 조회
      if (isOnline()) {
        const docRef = this.getDocRef(householdId, transactionId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const transaction = docToTransaction(docSnap.data(), docSnap.id);

          // IndexedDB에 캐시
          await localDB.transactions.put(
            toLocalTransaction(transaction, householdId)
          );

          return success(transaction);
        }
      }

      return success(null);
    } catch (err) {
      console.error("[TransactionRepository] findById 실패:", err);
      return error("INTERNAL_ERROR", "거래 조회에 실패했습니다");
    }
  }

  async findAll(
    householdId: string,
    filter?: TransactionFilter,
    options?: ListOptions
  ): Promise<RepositoryResult<PaginatedResponse<Transaction>>> {
    try {
      const page = options?.page ?? 1;
      const pageSize = options?.pageSize ?? 20;
      const sortBy = filter?.sortBy ?? "date";
      const sortOrder = filter?.sortOrder ?? "desc";

      // IndexedDB에서 조회 (오프라인 또는 캐시된 데이터)
      const localDB = getLocalDB();
      let localQuery = localDB.transactions
        .where("householdId")
        .equals(householdId);

      // 필터링은 결과를 가져온 후 수행 (Dexie 제한)
      let items = await localQuery.toArray();

      // 필터 적용
      if (filter?.type) {
        items = items.filter((t) => t.type === filter.type);
      }
      if (filter?.categoryId) {
        items = items.filter((t) => t.categoryId === filter.categoryId);
      }
      if (filter?.paymentMethod) {
        items = items.filter((t) => t.paymentMethod === filter.paymentMethod);
      }
      if (filter?.dateRange) {
        const startTime = filter.dateRange.startDate.getTime();
        const endTime = filter.dateRange.endDate.getTime();
        items = items.filter((t) => t.date >= startTime && t.date <= endTime);
      }
      if (filter?.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        items = items.filter(
          (t) =>
            t.description.toLowerCase().includes(query) ||
            t.categoryName.toLowerCase().includes(query) ||
            t.merchant?.toLowerCase().includes(query)
        );
      }
      if (filter?.minAmount !== undefined) {
        items = items.filter((t) => t.amount >= filter.minAmount!);
      }
      if (filter?.maxAmount !== undefined) {
        items = items.filter((t) => t.amount <= filter.maxAmount!);
      }

      // 정렬
      items.sort((a, b) => {
        const aValue = sortBy === "date" ? a.date : a.amount;
        const bValue = sortBy === "date" ? b.date : b.amount;
        return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
      });

      // 페이지네이션
      const totalItems = items.length;
      const totalPages = Math.ceil(totalItems / pageSize);
      const startIndex = (page - 1) * pageSize;
      const paginatedItems = items.slice(startIndex, startIndex + pageSize);

      const transactions = paginatedItems.map(localToTransaction);

      return success({
        items: transactions,
        totalItems,
        totalPages,
        currentPage: page,
        pageSize,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      });
    } catch (err) {
      console.error("[TransactionRepository] findAll 실패:", err);
      return error("INTERNAL_ERROR", "거래 목록 조회에 실패했습니다");
    }
  }

  async findByDateRange(
    householdId: string,
    dateRange: DateRangeOptions
  ): Promise<RepositoryResult<Transaction[]>> {
    try {
      const localDB = getLocalDB();
      const startTime = dateRange.startDate.getTime();
      const endTime = dateRange.endDate.getTime();

      const items = await localDB.transactions
        .where("[householdId+date]")
        .between([householdId, startTime], [householdId, endTime], true, true)
        .toArray();

      const transactions = items.map(localToTransaction);
      return success(transactions);
    } catch (err) {
      console.error("[TransactionRepository] findByDateRange 실패:", err);
      return error("INTERNAL_ERROR", "기간별 거래 조회에 실패했습니다");
    }
  }

  async findByCategory(
    householdId: string,
    categoryId: string,
    options?: ListOptions
  ): Promise<RepositoryResult<PaginatedResponse<Transaction>>> {
    return this.findAll(householdId, { categoryId, sortBy: "date", sortOrder: "desc" }, options);
  }

  // ===== 수정 =====

  async update(
    householdId: string,
    transactionId: string,
    input: TransactionUpdateInput
  ): Promise<RepositoryResult<Transaction>> {
    try {
      const localDB = getLocalDB();
      const existing = await localDB.transactions.get(transactionId);

      if (!existing) {
        return error("NOT_FOUND", "거래를 찾을 수 없습니다");
      }

      // 낙관적 잠금: 버전 확인
      if (existing.version !== input.version) {
        return error(
          "CONFLICT",
          "다른 기기에서 수정되었습니다. 새로고침 후 다시 시도해주세요."
        );
      }

      const now = Date.now();
      const updatedLocal: LocalTransaction = {
        ...existing,
        ...input,
        date: input.date ? (input.date as Timestamp).toMillis() : existing.date,
        updatedAt: now,
        version: existing.version + 1,
        syncStatus: isOnline() ? "synced" : "pending",
      };

      // IndexedDB 업데이트
      await localDB.transactions.put(updatedLocal);

      // 온라인이면 Firestore도 업데이트 (트랜잭션 사용)
      if (isOnline()) {
        try {
          const docRef = this.getDocRef(householdId, transactionId);

          await runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(docRef);

            if (!docSnap.exists()) {
              throw new Error("NOT_FOUND");
            }

            const serverData = docSnap.data();
            if (serverData.version !== input.version) {
              throw new Error("CONFLICT");
            }

            transaction.update(docRef, {
              ...input,
              updatedAt: Timestamp.fromMillis(now),
              version: input.version + 1,
            });
          });
        } catch (firestoreError: any) {
          if (firestoreError.message === "CONFLICT") {
            // 로컬 변경 롤백
            await localDB.transactions.put(existing);
            return error(
              "CONFLICT",
              "다른 기기에서 수정되었습니다. 새로고침 후 다시 시도해주세요."
            );
          }

          // 기타 오류는 pending으로 변경
          console.error("[TransactionRepository] Firestore 업데이트 실패:", firestoreError);
          await localDB.transactions.update(transactionId, { syncStatus: "pending" });
          updatedLocal.syncStatus = "pending";

          await addPendingOperation({
            type: "update",
            collection: this.getCollectionPath(householdId),
            documentId: transactionId,
            data: input as unknown as Record<string, unknown>,
            timestamp: Date.now(),
          });
        }
      } else {
        await addPendingOperation({
          type: "update",
          collection: this.getCollectionPath(householdId),
          documentId: transactionId,
          data: input as unknown as Record<string, unknown>,
          timestamp: Date.now(),
        });
      }

      return success(localToTransaction(updatedLocal));
    } catch (err) {
      console.error("[TransactionRepository] update 실패:", err);
      return error("INTERNAL_ERROR", "거래 수정에 실패했습니다");
    }
  }

  // ===== 삭제 =====

  async delete(
    householdId: string,
    transactionId: string,
    version: number
  ): Promise<RepositoryResult<boolean>> {
    try {
      const localDB = getLocalDB();
      const existing = await localDB.transactions.get(transactionId);

      if (!existing) {
        return error("NOT_FOUND", "거래를 찾을 수 없습니다");
      }

      // 낙관적 잠금: 버전 확인
      if (existing.version !== version) {
        return error(
          "CONFLICT",
          "다른 기기에서 수정되었습니다. 새로고침 후 다시 시도해주세요."
        );
      }

      // IndexedDB에서 삭제
      await localDB.transactions.delete(transactionId);

      // 온라인이면 Firestore에서도 삭제
      if (isOnline()) {
        try {
          const docRef = this.getDocRef(householdId, transactionId);
          await deleteDoc(docRef);
        } catch (firestoreError) {
          console.error("[TransactionRepository] Firestore 삭제 실패:", firestoreError);

          await addPendingOperation({
            type: "delete",
            collection: this.getCollectionPath(householdId),
            documentId: transactionId,
            timestamp: Date.now(),
          });
        }
      } else {
        await addPendingOperation({
          type: "delete",
          collection: this.getCollectionPath(householdId),
          documentId: transactionId,
          timestamp: Date.now(),
        });
      }

      return success(true);
    } catch (err) {
      console.error("[TransactionRepository] delete 실패:", err);
      return error("INTERNAL_ERROR", "거래 삭제에 실패했습니다");
    }
  }

  async deleteMany(
    householdId: string,
    transactionIds: string[]
  ): Promise<RepositoryResult<number>> {
    try {
      let deletedCount = 0;

      for (const id of transactionIds) {
        const localDB = getLocalDB();
        const existing = await localDB.transactions.get(id);

        if (existing) {
          await localDB.transactions.delete(id);
          deletedCount++;

          if (isOnline()) {
            try {
              const docRef = this.getDocRef(householdId, id);
              await deleteDoc(docRef);
            } catch {
              await addPendingOperation({
                type: "delete",
                collection: this.getCollectionPath(householdId),
                documentId: id,
                timestamp: Date.now(),
              });
            }
          } else {
            await addPendingOperation({
              type: "delete",
              collection: this.getCollectionPath(householdId),
              documentId: id,
              timestamp: Date.now(),
            });
          }
        }
      }

      return success(deletedCount);
    } catch (err) {
      console.error("[TransactionRepository] deleteMany 실패:", err);
      return error("INTERNAL_ERROR", "거래 일괄 삭제에 실패했습니다");
    }
  }

  // ===== 동기화 =====

  async findPending(
    householdId: string
  ): Promise<RepositoryResult<Transaction[]>> {
    try {
      const localDB = getLocalDB();
      const items = await localDB.transactions
        .where("syncStatus")
        .equals("pending")
        .and((t) => t.householdId === householdId)
        .toArray();

      return success(items.map(localToTransaction));
    } catch (err) {
      console.error("[TransactionRepository] findPending 실패:", err);
      return error("INTERNAL_ERROR", "대기 중인 거래 조회에 실패했습니다");
    }
  }

  async updateSyncStatus(
    _householdId: string,
    transactionId: string,
    status: SyncStatus
  ): Promise<RepositoryResult<void>> {
    try {
      const localDB = getLocalDB();
      await localDB.transactions.update(transactionId, { syncStatus: status });
      return success(undefined);
    } catch (err) {
      console.error("[TransactionRepository] updateSyncStatus 실패:", err);
      return error("INTERNAL_ERROR", "동기화 상태 업데이트에 실패했습니다");
    }
  }

  // ===== Firestore에서 데이터 가져오기 (초기 로드 / 동기화) =====

  async syncFromFirestore(householdId: string): Promise<RepositoryResult<number>> {
    if (!isOnline()) {
      return error("INTERNAL_ERROR", "오프라인 상태입니다");
    }

    try {
      const collectionRef = this.getCollectionRef(householdId);
      const q = query(collectionRef, orderBy("updatedAt", "desc"), limit(1000));
      const snapshot = await getDocs(q);

      const localDB = getLocalDB();
      let syncedCount = 0;

      for (const docSnap of snapshot.docs) {
        const transaction = docToTransaction(docSnap.data(), docSnap.id);
        const localTransaction = toLocalTransaction(transaction, householdId);

        // 로컬에 있는지 확인
        const existing = await localDB.transactions.get(docSnap.id);

        if (!existing || existing.version < localTransaction.version) {
          // 서버 버전이 더 최신이면 업데이트
          await localDB.transactions.put(localTransaction);
          syncedCount++;
        }
      }

      return success(syncedCount);
    } catch (err) {
      console.error("[TransactionRepository] syncFromFirestore 실패:", err);
      return error("INTERNAL_ERROR", "Firestore 동기화에 실패했습니다");
    }
  }
}

// 싱글톤 인스턴스
export const transactionRepository = new TransactionRepository();
export default transactionRepository;
