/**
 * Asset Repository 구현체
 *
 * Firestore와 IndexedDB를 통합하여 자산 정보를 관리합니다.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  runTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  getLocalDB,
  toLocalAsset,
  addPendingOperation,
  type LocalAsset,
} from "./indexedDB";
import type {
  Asset,
  AssetCreateInput,
  AssetUpdateInput,
  AssetCategory,
  SyncStatus,
  CurrencyCode,
} from "@/types";
import type { IAssetRepository, RepositoryResult, ListOptions } from "./repositories";

// =====================================================
// 유틸리티 함수
// =====================================================

function generateId(): string {
  return crypto.randomUUID();
}

function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

function success<T>(data: T): RepositoryResult<T> {
  return { success: true, data };
}

function error<T>(code: string, message: string): RepositoryResult<T> {
  return { success: false, error: { code: code as any, message } };
}

/**
 * LocalAsset → Asset 변환
 */
function localToAsset(local: LocalAsset): Asset {
  return {
    id: local.id,
    assetName: local.assetName,
    category: local.category as AssetCategory,
    amount: local.amount,
    currency: local.currency as CurrencyCode,
    description: local.description,
    institution: local.institution,
    accountNumberLast4: local.accountNumberLast4,
    interestRate: local.interestRate,
    maturityDate: local.maturityDate
      ? Timestamp.fromMillis(local.maturityDate)
      : undefined,
    isActive: local.isActive,
    sortOrder: local.sortOrder,
    createdAt: Timestamp.fromMillis(local.createdAt),
    updatedAt: Timestamp.fromMillis(local.updatedAt),
    version: local.version,
    syncStatus: local.syncStatus,
  };
}

// =====================================================
// AssetRepository 구현
// =====================================================

export class AssetRepository implements IAssetRepository {
  private getCollectionPath(householdId: string): string {
    return `households/${householdId}/assets`;
  }

  private getDocRef(householdId: string, assetId: string) {
    return doc(db, this.getCollectionPath(householdId), assetId);
  }

  // ===== 생성 =====

  async create(
    householdId: string,
    input: AssetCreateInput
  ): Promise<RepositoryResult<Asset>> {
    try {
      const id = generateId();
      const now = Timestamp.now();
      const nowMs = now.toMillis();

      const asset: Asset = {
        id,
        assetName: input.assetName,
        category: input.category,
        amount: input.amount,
        currency: input.currency,
        description: input.description,
        institution: input.institution,
        accountNumberLast4: input.accountNumberLast4,
        interestRate: input.interestRate,
        maturityDate: input.maturityDate,
        isActive: true,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
        version: 1,
        syncStatus: isOnline() ? "synced" : "pending",
      };

      // IndexedDB에 저장
      const localDB = getLocalDB();
      const localAsset: LocalAsset = {
        id,
        assetName: asset.assetName,
        category: asset.category,
        amount: asset.amount,
        currency: asset.currency,
        description: asset.description,
        institution: asset.institution,
        accountNumberLast4: asset.accountNumberLast4,
        interestRate: asset.interestRate,
        maturityDate: asset.maturityDate?.toMillis(),
        isActive: true,
        sortOrder: 0,
        createdAt: nowMs,
        updatedAt: nowMs,
        version: 1,
        syncStatus: isOnline() ? "synced" : "pending",
        householdId,
      };
      await localDB.assets.put(localAsset);

      // 온라인이면 Firestore에도 저장
      if (isOnline()) {
        try {
          const docRef = this.getDocRef(householdId, id);
          await setDoc(docRef, {
            ...asset,
            createdAt: now,
            updatedAt: now,
          });
        } catch (firestoreError) {
          console.error("[AssetRepository] Firestore 저장 실패:", firestoreError);
          await localDB.assets.update(id, { syncStatus: "pending" });
          asset.syncStatus = "pending";

          await addPendingOperation({
            type: "create",
            collection: this.getCollectionPath(householdId),
            documentId: id,
            data: asset as unknown as Record<string, unknown>,
            timestamp: Date.now(),
          });
        }
      } else {
        await addPendingOperation({
          type: "create",
          collection: this.getCollectionPath(householdId),
          documentId: id,
          data: asset as unknown as Record<string, unknown>,
          timestamp: Date.now(),
        });
      }

      return success(asset);
    } catch (err) {
      console.error("[AssetRepository] create 실패:", err);
      return error("INTERNAL_ERROR", "자산 생성에 실패했습니다");
    }
  }

  // ===== 조회 =====

  async findById(
    householdId: string,
    assetId: string
  ): Promise<RepositoryResult<Asset | null>> {
    try {
      const localDB = getLocalDB();
      const localAsset = await localDB.assets.get(assetId);

      if (localAsset) {
        return success(localToAsset(localAsset));
      }

      if (isOnline()) {
        const docRef = this.getDocRef(householdId, assetId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const asset = { id: docSnap.id, ...docSnap.data() } as Asset;
          await localDB.assets.put(toLocalAsset(asset, householdId));
          return success(asset);
        }
      }

      return success(null);
    } catch (err) {
      console.error("[AssetRepository] findById 실패:", err);
      return error("INTERNAL_ERROR", "자산 조회에 실패했습니다");
    }
  }

  async findAll(
    householdId: string,
    options?: ListOptions & { includeInactive?: boolean }
  ): Promise<RepositoryResult<Asset[]>> {
    try {
      const localDB = getLocalDB();
      let items = await localDB.assets
        .where("householdId")
        .equals(householdId)
        .toArray();

      // 비활성 자산 필터링
      if (!options?.includeInactive) {
        items = items.filter((a) => a.isActive);
      }

      // 정렬
      items.sort((a, b) => a.sortOrder - b.sortOrder);

      return success(items.map(localToAsset));
    } catch (err) {
      console.error("[AssetRepository] findAll 실패:", err);
      return error("INTERNAL_ERROR", "자산 목록 조회에 실패했습니다");
    }
  }

  async findByCategory(
    householdId: string,
    category: string
  ): Promise<RepositoryResult<Asset[]>> {
    try {
      const localDB = getLocalDB();
      const items = await localDB.assets
        .where("householdId")
        .equals(householdId)
        .and((a) => a.category === category && a.isActive)
        .toArray();

      items.sort((a, b) => a.sortOrder - b.sortOrder);

      return success(items.map(localToAsset));
    } catch (err) {
      console.error("[AssetRepository] findByCategory 실패:", err);
      return error("INTERNAL_ERROR", "카테고리별 자산 조회에 실패했습니다");
    }
  }

  async getTotalAmount(
    householdId: string
  ): Promise<RepositoryResult<{ total: number; assets: number; liabilities: number }>> {
    try {
      const localDB = getLocalDB();
      const items = await localDB.assets
        .where("householdId")
        .equals(householdId)
        .and((a) => a.isActive)
        .toArray();

      let assets = 0;
      let liabilities = 0;

      for (const item of items) {
        if (item.category === "loan") {
          liabilities += Math.abs(item.amount);
        } else {
          assets += item.amount;
        }
      }

      return success({
        total: assets - liabilities,
        assets,
        liabilities,
      });
    } catch (err) {
      console.error("[AssetRepository] getTotalAmount 실패:", err);
      return error("INTERNAL_ERROR", "총 자산 계산에 실패했습니다");
    }
  }

  // ===== 수정 =====

  async update(
    householdId: string,
    assetId: string,
    input: AssetUpdateInput
  ): Promise<RepositoryResult<Asset>> {
    try {
      const localDB = getLocalDB();
      const existing = await localDB.assets.get(assetId);

      if (!existing) {
        return error("NOT_FOUND", "자산을 찾을 수 없습니다");
      }

      if (existing.version !== input.version) {
        return error(
          "CONFLICT",
          "다른 기기에서 수정되었습니다. 새로고침 후 다시 시도해주세요."
        );
      }

      const now = Date.now();
      const updatedLocal: LocalAsset = {
        ...existing,
        ...(input.assetName !== undefined && { assetName: input.assetName }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.amount !== undefined && { amount: input.amount }),
        ...(input.currency !== undefined && { currency: input.currency }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.institution !== undefined && { institution: input.institution }),
        ...(input.accountNumberLast4 !== undefined && {
          accountNumberLast4: input.accountNumberLast4,
        }),
        ...(input.interestRate !== undefined && { interestRate: input.interestRate }),
        ...(input.maturityDate !== undefined && {
          maturityDate: input.maturityDate?.toMillis(),
        }),
        updatedAt: now,
        version: existing.version + 1,
        syncStatus: isOnline() ? "synced" : "pending",
      };

      await localDB.assets.put(updatedLocal);

      if (isOnline()) {
        try {
          const docRef = this.getDocRef(householdId, assetId);

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
            await localDB.assets.put(existing);
            return error(
              "CONFLICT",
              "다른 기기에서 수정되었습니다. 새로고침 후 다시 시도해주세요."
            );
          }

          console.error("[AssetRepository] Firestore 업데이트 실패:", firestoreError);
          await localDB.assets.update(assetId, { syncStatus: "pending" });
          updatedLocal.syncStatus = "pending";

          await addPendingOperation({
            type: "update",
            collection: this.getCollectionPath(householdId),
            documentId: assetId,
            data: input as unknown as Record<string, unknown>,
            timestamp: Date.now(),
          });
        }
      } else {
        await addPendingOperation({
          type: "update",
          collection: this.getCollectionPath(householdId),
          documentId: assetId,
          data: input as unknown as Record<string, unknown>,
          timestamp: Date.now(),
        });
      }

      return success(localToAsset(updatedLocal));
    } catch (err) {
      console.error("[AssetRepository] update 실패:", err);
      return error("INTERNAL_ERROR", "자산 수정에 실패했습니다");
    }
  }

  async updateAmount(
    householdId: string,
    assetId: string,
    amount: number,
    version: number
  ): Promise<RepositoryResult<Asset>> {
    return this.update(householdId, assetId, { amount, version });
  }

  // ===== 삭제 =====

  async delete(
    householdId: string,
    assetId: string,
    version: number
  ): Promise<RepositoryResult<boolean>> {
    try {
      const localDB = getLocalDB();
      const existing = await localDB.assets.get(assetId);

      if (!existing) {
        return error("NOT_FOUND", "자산을 찾을 수 없습니다");
      }

      if (existing.version !== version) {
        return error(
          "CONFLICT",
          "다른 기기에서 수정되었습니다. 새로고침 후 다시 시도해주세요."
        );
      }

      // Soft delete: isActive = false
      const now = Date.now();
      await localDB.assets.update(assetId, {
        isActive: false,
        updatedAt: now,
        version: existing.version + 1,
        syncStatus: isOnline() ? "synced" : "pending",
      });

      if (isOnline()) {
        try {
          const docRef = this.getDocRef(householdId, assetId);
          await updateDoc(docRef, {
            isActive: false,
            updatedAt: Timestamp.fromMillis(now),
            version: existing.version + 1,
          });
        } catch (firestoreError) {
          console.error("[AssetRepository] Firestore 삭제 실패:", firestoreError);
          await addPendingOperation({
            type: "update",
            collection: this.getCollectionPath(householdId),
            documentId: assetId,
            data: { isActive: false },
            timestamp: Date.now(),
          });
        }
      } else {
        await addPendingOperation({
          type: "update",
          collection: this.getCollectionPath(householdId),
          documentId: assetId,
          data: { isActive: false },
          timestamp: Date.now(),
        });
      }

      return success(true);
    } catch (err) {
      console.error("[AssetRepository] delete 실패:", err);
      return error("INTERNAL_ERROR", "자산 삭제에 실패했습니다");
    }
  }

  // ===== 동기화 =====

  async findPending(householdId: string): Promise<RepositoryResult<Asset[]>> {
    try {
      const localDB = getLocalDB();
      const items = await localDB.assets
        .where("syncStatus")
        .equals("pending")
        .and((a) => a.householdId === householdId)
        .toArray();

      return success(items.map(localToAsset));
    } catch (err) {
      console.error("[AssetRepository] findPending 실패:", err);
      return error("INTERNAL_ERROR", "대기 중인 자산 조회에 실패했습니다");
    }
  }

  async updateSyncStatus(
    _householdId: string,
    assetId: string,
    status: SyncStatus
  ): Promise<RepositoryResult<void>> {
    try {
      const localDB = getLocalDB();
      await localDB.assets.update(assetId, { syncStatus: status });
      return success(undefined);
    } catch (err) {
      console.error("[AssetRepository] updateSyncStatus 실패:", err);
      return error("INTERNAL_ERROR", "동기화 상태 업데이트에 실패했습니다");
    }
  }
}

// 싱글톤 인스턴스
export const assetRepository = new AssetRepository();
export default assetRepository;
