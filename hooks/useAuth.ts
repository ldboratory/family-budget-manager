/**
 * Firebase Authentication Hook
 *
 * 인증 상태 관리 및 인증 관련 기능을 제공합니다.
 *
 * @example
 * ```tsx
 * const { user, loading, signUp, signIn, signOut } = useAuth();
 *
 * if (loading) return <Spinner />;
 * if (!user) return <LoginPage />;
 * return <Dashboard user={user} />;
 * ```
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  type User as FirebaseUser,
  type UserCredential,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { User, CurrencyCode } from "@/types";

// =====================================================
// 타입 정의
// =====================================================

/**
 * 인증 상태
 */
export interface AuthState {
  /** Firebase User 객체 */
  firebaseUser: FirebaseUser | null;
  /** Firestore User 문서 */
  user: User | null;
  /** 로딩 상태 */
  loading: boolean;
  /** 에러 */
  error: Error | null;
}

/**
 * 회원가입 입력
 */
export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
}

/**
 * 로그인 입력
 */
export interface SignInInput {
  email: string;
  password: string;
}

/**
 * 인증 에러 코드 → 메시지 매핑
 */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "이미 사용 중인 이메일입니다",
  "auth/invalid-email": "올바른 이메일 형식이 아닙니다",
  "auth/operation-not-allowed": "이메일/비밀번호 로그인이 비활성화되어 있습니다",
  "auth/weak-password": "비밀번호가 너무 약합니다",
  "auth/user-disabled": "비활성화된 계정입니다",
  "auth/user-not-found": "등록되지 않은 이메일입니다",
  "auth/wrong-password": "비밀번호가 올바르지 않습니다",
  "auth/invalid-credential": "이메일 또는 비밀번호가 올바르지 않습니다",
  "auth/too-many-requests": "너무 많은 요청이 있었습니다. 잠시 후 다시 시도해주세요",
  "auth/popup-closed-by-user": "로그인 창이 닫혔습니다",
  "auth/cancelled-popup-request": "로그인이 취소되었습니다",
  "auth/popup-blocked": "팝업이 차단되었습니다. 팝업을 허용해주세요",
};

/**
 * Firebase 에러 메시지 변환
 */
function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as { code?: string }).code;
    if (code && AUTH_ERROR_MESSAGES[code]) {
      return AUTH_ERROR_MESSAGES[code];
    }
    return error.message;
  }
  return "알 수 없는 오류가 발생했습니다";
}

// =====================================================
// Firestore User 문서 관리
// =====================================================

/**
 * Firestore에 사용자 문서 생성
 */
async function createUserDocument(
  firebaseUser: FirebaseUser,
  displayName?: string
): Promise<User> {
  const userRef = doc(db, "users", firebaseUser.uid);
  const now = Timestamp.now();

  const userData: User = {
    id: firebaseUser.uid,
    uid: firebaseUser.uid,
    email: firebaseUser.email ?? "",
    displayName: displayName ?? firebaseUser.displayName ?? "사용자",
    role: "member",
    avatar: firebaseUser.photoURL ?? undefined,
    currency: "KRW" as CurrencyCode,
    householdIds: [],
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  await setDoc(userRef, {
    ...userData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return userData;
}

/**
 * Firestore에서 사용자 문서 조회
 */
async function getUserDocument(uid: string): Promise<User | null> {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  return { id: userSnap.id, ...userSnap.data() } as User;
}

/**
 * 사용자 문서 업데이트 (마지막 로그인 시간)
 */
async function updateLastLogin(uid: string): Promise<void> {
  const userRef = doc(db, "users", uid);
  await setDoc(
    userRef,
    {
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// =====================================================
// useAuth Hook
// =====================================================

/**
 * 인증 Hook
 *
 * @returns 인증 상태 및 메서드
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    user: null,
    loading: true,
    error: null,
  });

  // ===== Auth State Listener =====
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Firestore에서 사용자 문서 조회
          let user = await getUserDocument(firebaseUser.uid);

          // 문서가 없으면 생성 (Google 로그인 등)
          if (!user) {
            user = await createUserDocument(firebaseUser);
          }

          setState({
            firebaseUser,
            user,
            loading: false,
            error: null,
          });
        } catch (error) {
          console.error("[useAuth] 사용자 문서 조회 실패:", error);
          setState({
            firebaseUser,
            user: null,
            loading: false,
            error: error as Error,
          });
        }
      } else {
        setState({
          firebaseUser: null,
          user: null,
          loading: false,
          error: null,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // ===== 회원가입 =====
  const signUp = useCallback(
    async (input: SignUpInput): Promise<UserCredential> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        // Firebase Auth 계정 생성
        const credential = await createUserWithEmailAndPassword(
          auth,
          input.email,
          input.password
        );

        // 프로필 업데이트 (displayName)
        await updateProfile(credential.user, {
          displayName: input.displayName,
        });

        // Firestore 사용자 문서 생성
        await createUserDocument(credential.user, input.displayName);

        return credential;
      } catch (error) {
        const message = getAuthErrorMessage(error);
        const authError = new Error(message);
        setState((prev) => ({ ...prev, loading: false, error: authError }));
        throw authError;
      }
    },
    []
  );

  // ===== 이메일/비밀번호 로그인 =====
  const signIn = useCallback(
    async (input: SignInInput): Promise<UserCredential> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const credential = await signInWithEmailAndPassword(
          auth,
          input.email,
          input.password
        );

        // 마지막 로그인 시간 업데이트
        await updateLastLogin(credential.user.uid);

        return credential;
      } catch (error) {
        const message = getAuthErrorMessage(error);
        const authError = new Error(message);
        setState((prev) => ({ ...prev, loading: false, error: authError }));
        throw authError;
      }
    },
    []
  );

  // ===== Google 로그인 =====
  const signInWithGoogle = useCallback(async (): Promise<UserCredential> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account",
      });

      const credential = await signInWithPopup(auth, provider);

      // Firestore 사용자 문서 확인/생성
      let user = await getUserDocument(credential.user.uid);
      if (!user) {
        user = await createUserDocument(credential.user);
      } else {
        await updateLastLogin(credential.user.uid);
      }

      return credential;
    } catch (error) {
      const message = getAuthErrorMessage(error);
      const authError = new Error(message);
      setState((prev) => ({ ...prev, loading: false, error: authError }));
      throw authError;
    }
  }, []);

  // ===== 로그아웃 =====
  const signOut = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      await firebaseSignOut(auth);
      setState({
        firebaseUser: null,
        user: null,
        loading: false,
        error: null,
      });
    } catch (error) {
      const message = getAuthErrorMessage(error);
      const authError = new Error(message);
      setState((prev) => ({ ...prev, loading: false, error: authError }));
      throw authError;
    }
  }, []);

  // ===== 비밀번호 재설정 이메일 전송 =====
  const resetPassword = useCallback(async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      const message = getAuthErrorMessage(error);
      throw new Error(message);
    }
  }, []);

  // ===== 에러 초기화 =====
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    // 상태
    firebaseUser: state.firebaseUser,
    user: state.user,
    loading: state.loading,
    error: state.error,
    isAuthenticated: !!state.firebaseUser,

    // 메서드
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    clearError,
  };
}

export default useAuth;
