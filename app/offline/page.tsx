/**
 * 오프라인 페이지
 *
 * 네트워크 연결이 없을 때 표시되는 페이지입니다.
 */

"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
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

  // 온라인으로 돌아오면 대시보드로 이동
  useEffect(() => {
    if (isOnline) {
      window.location.href = "/dashboard";
    }
  }, [isOnline]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
      {/* 아이콘 */}
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
        <WifiOff className="h-12 w-12 text-muted-foreground" />
      </div>

      {/* 제목 */}
      <h1 className="mb-2 text-2xl font-bold">오프라인 상태입니다</h1>

      {/* 설명 */}
      <p className="mb-8 max-w-sm text-muted-foreground">
        인터넷 연결이 끊어졌습니다. 연결 상태를 확인하고 다시 시도해주세요.
      </p>

      {/* 기능 안내 */}
      <div className="mb-8 max-w-sm rounded-lg bg-muted/50 p-4">
        <h3 className="mb-2 font-medium">오프라인에서도 가능한 기능</h3>
        <ul className="space-y-1 text-left text-sm text-muted-foreground">
          <li>• 저장된 거래 내역 조회</li>
          <li>• 새 거래 추가 (온라인 복귀 시 자동 동기화)</li>
          <li>• 자산 정보 확인</li>
        </ul>
      </div>

      {/* 버튼 */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" />
          다시 시도
        </button>

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-background px-6 py-3 text-sm font-medium hover:bg-accent"
        >
          <Home className="h-4 w-4" />
          대시보드로
        </Link>
      </div>

      {/* 상태 표시 */}
      <div className="mt-8 flex items-center gap-2 text-sm">
        <div
          className={`h-2 w-2 rounded-full ${
            isOnline ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span className="text-muted-foreground">
          {isOnline ? "온라인 - 리다이렉트 중..." : "오프라인"}
        </span>
      </div>
    </div>
  );
}
