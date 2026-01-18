/**
 * AuthProvider - 인증 상태를 전역으로 제공하는 Context Provider
 *
 * @description
 * - React Context를 통해 인증 상태를 앱 전체에서 접근 가능하게 합니다.
 * - useAuthContext() 훅으로 어디서든 user 정보에 접근할 수 있습니다.
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * <AuthProvider>
 *   {children}
 * </AuthProvider>
 *
 * // 컴포넌트에서 사용
 * const { user, signOut } = useAuthContext();
 * ```
 */

"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@/types";
import type { User as FirebaseUser, UserCredential } from "firebase/auth";

// =====================================================
// Context 타입 정의
// =====================================================

/**
 * Auth Context 값 타입
 */
interface AuthContextValue {
  /** Firebase User 객체 */
  firebaseUser: FirebaseUser | null;
  /** Firestore User 문서 */
  user: User | null;
  /** 로딩 상태 */
  loading: boolean;
  /** 에러 */
  error: Error | null;
  /** 인증 여부 */
  isAuthenticated: boolean;

  /** 회원가입 */
  signUp: (input: {
    email: string;
    password: string;
    displayName: string;
  }) => Promise<UserCredential>;
  /** 이메일/비밀번호 로그인 */
  signIn: (input: { email: string; password: string }) => Promise<UserCredential>;
  /** Google 로그인 */
  signInWithGoogle: () => Promise<UserCredential>;
  /** 로그아웃 */
  signOut: () => Promise<void>;
  /** 비밀번호 재설정 이메일 전송 */
  resetPassword: (email: string) => Promise<void>;
  /** 에러 초기화 */
  clearError: () => void;
}

// =====================================================
// Context 생성
// =====================================================

const AuthContext = createContext<AuthContextValue | null>(null);

// =====================================================
// Provider 컴포넌트
// =====================================================

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider 컴포넌트
 *
 * 앱의 최상위에서 인증 상태를 관리하고 제공합니다.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

// =====================================================
// Consumer Hook
// =====================================================

/**
 * Auth Context 사용 Hook
 *
 * @throws {Error} AuthProvider 외부에서 사용 시
 * @returns Auth Context 값
 */
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuthContext는 AuthProvider 내부에서만 사용할 수 있습니다"
    );
  }

  return context;
}

// =====================================================
// 유틸리티 컴포넌트
// =====================================================

interface AuthGuardProps {
  children: ReactNode;
  /** 로딩 중 표시할 컴포넌트 */
  fallback?: ReactNode;
  /** 비인증 시 표시할 컴포넌트 */
  unauthenticated?: ReactNode;
}

/**
 * AuthGuard - 인증된 사용자만 접근 가능한 영역 보호
 *
 * @example
 * ```tsx
 * <AuthGuard fallback={<Loading />} unauthenticated={<LoginPrompt />}>
 *   <Dashboard />
 * </AuthGuard>
 * ```
 */
export function AuthGuard({
  children,
  fallback = <DefaultLoadingUI />,
  unauthenticated = null,
}: AuthGuardProps) {
  const { loading, isAuthenticated } = useAuthContext();

  if (loading) {
    return <>{fallback}</>;
  }

  if (!isAuthenticated) {
    return <>{unauthenticated}</>;
  }

  return <>{children}</>;
}

/**
 * 기본 로딩 UI
 */
function DefaultLoadingUI() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">로딩 중...</p>
      </div>
    </div>
  );
}

export default AuthProvider;
