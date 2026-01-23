/**
 * 사용자 환경설정 Repository
 *
 * IndexedDB와 Firestore를 통합하여 설정을 관리합니다.
 */

import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getLocalDB } from "./indexedDB";
import type { Preferences, ThemeMode, CurrencyCode, PaymentMethod } from "@/types";

// =====================================================
// 로컬 타입 정의
// =====================================================

export interface LocalPreferences {
  userId: string;
  theme: ThemeMode;
  currency: CurrencyCode;
  language: "ko" | "en";
  weekStartsOn: 0 | 1;
  defaultPaymentMethod?: PaymentMethod;
  monthStartDate: number;
  notifications: {
    dailyReminder: boolean;
    budgetAlert: boolean;
    budgetWarningThreshold: number;
    monthlyReport: boolean;
    familyActivity: boolean;
    email: boolean;
    frequency: "daily" | "weekly" | "monthly";
  };
  updatedAt: number;
  syncStatus: "synced" | "pending";
}

export interface PreferencesUpdateInput {
  theme?: ThemeMode;
  currency?: CurrencyCode;
  language?: "ko" | "en";
  weekStartsOn?: 0 | 1;
  defaultPaymentMethod?: PaymentMethod;
  monthStartDate?: number;
  notifications?: Partial<LocalPreferences["notifications"]>;
}

// =====================================================
// 기본값
// =====================================================

export const DEFAULT_PREFERENCES: Omit<LocalPreferences, "userId" | "updatedAt" | "syncStatus"> = {
  theme: "system",
  currency: "KRW",
  language: "ko",
  weekStartsOn: 0,
  monthStartDate: 1,
  notifications: {
    dailyReminder: false,
    budgetAlert: true,
    budgetWarningThreshold: 80,
    monthlyReport: true,
    familyActivity: true,
    email: false,
    frequency: "weekly",
  },
};

// =====================================================
// Repository 클래스
// =====================================================

class PreferencesRepository {
  /**
   * 사용자 설정 조회
   */
  async getPreferences(userId: string): Promise<LocalPreferences> {
    const localDB = getLocalDB();

    // 1. 로컬 DB에서 먼저 조회
    const localPrefs = await localDB.table("preferences").get(userId);

    if (localPrefs) {
      // 온라인이면 Firestore와 동기화 시도
      if (navigator.onLine) {
        this.syncFromFirestore(userId, localPrefs).catch(console.error);
      }
      return localPrefs;
    }

    // 2. 로컬에 없으면 Firestore에서 조회
    if (navigator.onLine) {
      try {
        const docRef = doc(db, `users/${userId}/preferences`, "settings");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const firestorePrefs = docSnap.data() as Preferences;
          const localData = this.toLocalPreferences(firestorePrefs);

          // 로컬 DB에 저장
          await localDB.table("preferences").put(localData);

          return localData;
        }
      } catch (error) {
        console.error("[PreferencesRepo] Firestore 조회 실패:", error);
      }
    }

    // 3. 기본값으로 초기화
    const defaultPrefs: LocalPreferences = {
      ...DEFAULT_PREFERENCES,
      userId,
      updatedAt: Date.now(),
      syncStatus: "pending",
    };

    await localDB.table("preferences").put(defaultPrefs);

    return defaultPrefs;
  }

  /**
   * 사용자 설정 업데이트
   */
  async updatePreferences(
    userId: string,
    input: PreferencesUpdateInput
  ): Promise<LocalPreferences> {
    const localDB = getLocalDB();
    const now = Date.now();
    const isOnline = navigator.onLine;

    // 현재 설정 가져오기
    const current = await this.getPreferences(userId);

    // 업데이트할 데이터 구성
    const updatedPrefs: LocalPreferences = {
      ...current,
      ...input,
      notifications: {
        ...current.notifications,
        ...(input.notifications || {}),
      },
      updatedAt: now,
      syncStatus: isOnline ? "synced" : "pending",
    };

    // 로컬 DB 업데이트
    await localDB.table("preferences").put(updatedPrefs);

    // 온라인이면 Firestore 동기화
    if (isOnline) {
      try {
        const docRef = doc(db, `users/${userId}/preferences`, "settings");
        await setDoc(
          docRef,
          {
            ...updatedPrefs,
            updatedAt: Timestamp.fromMillis(now),
          },
          { merge: true }
        );
      } catch (error) {
        console.error("[PreferencesRepo] Firestore 업데이트 실패:", error);
        // 실패 시 pending으로 변경
        await localDB.table("preferences").update(userId, {
          syncStatus: "pending",
        });
      }
    }

    return updatedPrefs;
  }

  /**
   * Firestore에서 동기화
   */
  private async syncFromFirestore(
    userId: string,
    localPrefs: LocalPreferences
  ): Promise<void> {
    try {
      const docRef = doc(db, `users/${userId}/preferences`, "settings");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const firestorePrefs = docSnap.data() as Preferences;
        const firestoreUpdatedAt = firestorePrefs.updatedAt?.toMillis?.() || 0;

        // Firestore가 더 최신이면 로컬 업데이트
        if (firestoreUpdatedAt > localPrefs.updatedAt) {
          const localData = this.toLocalPreferences(firestorePrefs);
          const localDB = getLocalDB();
          await localDB.table("preferences").put(localData);
        }
        // 로컬이 더 최신이고 pending이면 Firestore 업데이트
        else if (
          localPrefs.updatedAt > firestoreUpdatedAt &&
          localPrefs.syncStatus === "pending"
        ) {
          await setDoc(
            docRef,
            {
              ...localPrefs,
              updatedAt: Timestamp.fromMillis(localPrefs.updatedAt),
            },
            { merge: true }
          );

          const localDB = getLocalDB();
          await localDB.table("preferences").update(userId, {
            syncStatus: "synced",
          });
        }
      } else {
        // Firestore에 없으면 생성
        await setDoc(docRef, {
          ...localPrefs,
          updatedAt: Timestamp.fromMillis(localPrefs.updatedAt),
        });
      }
    } catch (error) {
      console.error("[PreferencesRepo] 동기화 실패:", error);
    }
  }

  /**
   * Firestore 타입을 로컬 타입으로 변환
   */
  private toLocalPreferences(firestorePrefs: Preferences): LocalPreferences {
    return {
      userId: firestorePrefs.userId,
      theme: firestorePrefs.theme,
      currency: firestorePrefs.currency,
      language: firestorePrefs.language,
      weekStartsOn: firestorePrefs.weekStartsOn,
      defaultPaymentMethod: firestorePrefs.defaultPaymentMethod,
      monthStartDate: 1, // 기본값
      notifications: {
        ...DEFAULT_PREFERENCES.notifications,
        ...firestorePrefs.notifications,
        email: false,
        frequency: "weekly",
      },
      updatedAt: firestorePrefs.updatedAt?.toMillis?.() || Date.now(),
      syncStatus: "synced",
    };
  }
}

export const preferencesRepository = new PreferencesRepository();
