/**
 * PWA 설치 프롬프트 컴포넌트
 *
 * - 설치 가능 상태 감지
 * - 설치 배너/버튼 표시
 * - iOS Safari 안내
 */

"use client";

import { useState, useEffect } from "react";
import { Download, X, Share, Plus, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallPromptProps {
  /** 배너 스타일 */
  variant?: "banner" | "button" | "modal";
  /** 표시 위치 (배너용) */
  position?: "top" | "bottom";
  /** 닫기 후 다시 표시하지 않을 기간 (일) */
  dismissDays?: number;
}

export function InstallPrompt({
  variant = "banner",
  position = "bottom",
  dismissDays = 7,
}: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // 이미 설치된 경우 체크
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    if (standalone) return;

    // iOS 체크
    const iOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // 이전에 닫았는지 확인
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const now = new Date();
      const daysDiff = Math.floor(
        (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff < dismissDays) {
        return;
      }
    }

    // beforeinstallprompt 이벤트 리스너
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // iOS에서는 수동으로 안내 표시
    if (iOS) {
      setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, [dismissDays]);

  // 설치 핸들러
  const handleInstall = async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        setShowIOSGuide(true);
      }
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        console.log("[PWA] User accepted install prompt");
      } else {
        console.log("[PWA] User dismissed install prompt");
      }

      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error("[PWA] Install error:", error);
    }
  };

  // 닫기 핸들러
  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", new Date().toISOString());
  };

  // 이미 설치되었거나 표시하지 않음
  if (isStandalone || !showPrompt) {
    return null;
  }

  // 버튼 스타일
  if (variant === "button") {
    return (
      <button
        onClick={handleInstall}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <Download className="h-4 w-4" />
        앱 설치
      </button>
    );
  }

  // 배너 스타일
  return (
    <>
      <div
        className={`fixed left-0 right-0 z-50 border-border bg-card px-4 py-3 shadow-lg ${
          position === "top"
            ? "top-0 border-b"
            : "bottom-0 border-t safe-area-bottom"
        }`}
      >
        <div className="mx-auto flex max-w-lg items-center gap-4">
          {/* 아이콘 */}
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>

          {/* 텍스트 */}
          <div className="min-w-0 flex-1">
            <p className="font-medium">앱으로 설치하기</p>
            <p className="text-sm text-muted-foreground">
              홈 화면에 추가하여 더 빠르게 접근하세요
            </p>
          </div>

          {/* 버튼 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDismiss}
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </button>
            <button
              onClick={handleInstall}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              설치
            </button>
          </div>
        </div>
      </div>

      {/* iOS 가이드 모달 */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">홈 화면에 추가하기</h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                  1
                </div>
                <div>
                  <p className="font-medium">
                    하단의 공유 버튼{" "}
                    <Share className="inline h-4 w-4" /> 을 탭하세요
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                  2
                </div>
                <div>
                  <p className="font-medium">
                    &quot;홈 화면에 추가&quot;{" "}
                    <Plus className="inline h-4 w-4" /> 를 탭하세요
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                  3
                </div>
                <div>
                  <p className="font-medium">
                    우측 상단의 &quot;추가&quot;를 탭하세요
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-6 w-full rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * 설치 버튼 (설정 페이지용)
 */
export function InstallButton() {
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 설치 상태 확인
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(standalone);

    if (standalone) return;

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setCanInstall(false);
  };

  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-green-100 px-4 py-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
        <Smartphone className="h-4 w-4" />
        앱이 설치되어 있습니다
      </div>
    );
  }

  if (!canInstall) {
    return (
      <div className="text-sm text-muted-foreground">
        이 브라우저에서는 앱 설치가 지원되지 않거나, 이미 설치되어 있습니다.
      </div>
    );
  }

  return (
    <button
      onClick={handleInstall}
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
    >
      <Download className="h-4 w-4" />
      홈 화면에 앱 설치
    </button>
  );
}

export default InstallPrompt;
