/**
 * 로그아웃 버튼 컴포넌트
 *
 * - Firebase 로그아웃 처리
 * - 로그인 페이지로 리다이렉트
 * - 로컬 데이터 정리 옵션
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2, AlertTriangle } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { clearLocalDB } from "@/lib/db/indexedDB";
import { resetSyncEngine } from "@/lib/sync/syncEngine";

interface LogoutButtonProps {
  /** 버튼 스타일 변형 */
  variant?: "default" | "destructive" | "outline" | "ghost";
  /** 전체 너비 */
  fullWidth?: boolean;
  /** 로컬 데이터 삭제 여부 확인 */
  confirmClearData?: boolean;
  /** 로그아웃 후 리다이렉트 경로 */
  redirectTo?: string;
}

export function LogoutButton({
  variant = "outline",
  fullWidth = false,
  confirmClearData = false,
  redirectTo = "/login",
}: LogoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [clearData, setClearData] = useState(false);

  const handleLogout = async (shouldClearData: boolean = false) => {
    setIsLoading(true);

    try {
      // 동기화 엔진 중지
      resetSyncEngine();

      // 로컬 데이터 삭제 (선택적)
      if (shouldClearData) {
        await clearLocalDB();
        localStorage.removeItem("theme");
      }

      // Firebase 로그아웃
      await signOut(auth);

      // 리다이렉트
      router.push(redirectTo);
    } catch (error) {
      console.error("[LogoutButton] 로그아웃 실패:", error);
      setIsLoading(false);
    }
  };

  const handleClick = () => {
    if (confirmClearData) {
      setShowConfirm(true);
    } else {
      handleLogout(false);
    }
  };

  // 버튼 스타일
  const getButtonStyles = () => {
    const base = `inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
      fullWidth ? "w-full" : ""
    }`;

    switch (variant) {
      case "destructive":
        return `${base} bg-destructive text-destructive-foreground hover:bg-destructive/90`;
      case "outline":
        return `${base} border border-input bg-background hover:bg-accent hover:text-accent-foreground`;
      case "ghost":
        return `${base} hover:bg-accent hover:text-accent-foreground`;
      default:
        return `${base} bg-primary text-primary-foreground hover:bg-primary/90`;
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={getButtonStyles()}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            로그아웃 중...
          </>
        ) : (
          <>
            <LogOut className="h-4 w-4" />
            로그아웃
          </>
        )}
      </button>

      {/* 확인 모달 */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold">로그아웃</h3>
            </div>

            <p className="mb-4 text-sm text-muted-foreground">
              로그아웃하시겠습니까?
            </p>

            {/* 로컬 데이터 삭제 옵션 */}
            <label className="mb-6 flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
              <input
                type="checkbox"
                checked={clearData}
                onChange={(e) => setClearData(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300"
              />
              <div>
                <p className="text-sm font-medium">로컬 데이터 삭제</p>
                <p className="text-xs text-muted-foreground">
                  이 기기에 저장된 캐시 데이터를 삭제합니다. 서버의 데이터는
                  유지됩니다.
                </p>
              </div>
            </label>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isLoading}
                className="flex-1 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={() => handleLogout(clearData)}
                disabled={isLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  "로그아웃"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * 간단한 로그아웃 링크 (텍스트 스타일)
 */
export function LogoutLink({
  redirectTo = "/login",
}: {
  redirectTo?: string;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      resetSyncEngine();
      await signOut(auth);
      router.push(redirectTo);
    } catch (error) {
      console.error("[LogoutLink] 로그아웃 실패:", error);
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive disabled:opacity-50"
    >
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <LogOut className="h-3 w-3" />
      )}
      로그아웃
    </button>
  );
}

export default LogoutButton;
