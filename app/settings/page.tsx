/**
 * 사용자 설정 페이지
 *
 * - 프로필 수정
 * - 환경설정 (테마, 통화, 결제수단)
 * - 데이터 백업
 * - 멤버 관리 링크
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Settings,
  User,
  Palette,
  Database,
  Users,
  ChevronRight,
  Home,
} from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { ProfileForm, PreferencesForm, BackupSection, ProfileCard, LogoutButton } from "@/components/settings";

// 가계부 선택 훅 (임시 - 실제 구현에서는 useHouseholds 사용)
function useCurrentHousehold() {
  const { user } = useAuthContext();

  // 임시로 사용자 ID 기반 가계부 ID 사용
  const householdId = user?.uid ? `household-${user.uid}` : undefined;

  return {
    householdId,
    householdName: "내 가계부",
  };
}

export default function SettingsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthContext();
  const { householdId, householdName } = useCurrentHousehold();
  const [activeSection, setActiveSection] = useState<string>("profile");

  // 모바일에서 섹션 선택 후 상세 보기
  const [showDetail, setShowDetail] = useState(false);

  // 인증 체크
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Settings className="h-16 w-16 text-muted-foreground" />
        <p className="text-muted-foreground">로그인이 필요합니다</p>
        <Link
          href="/login"
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          로그인
        </Link>
      </div>
    );
  }

  // 메뉴 항목
  const menuItems = [
    {
      id: "profile",
      label: "프로필",
      icon: <User className="h-5 w-5" />,
      description: "이름, 프로필 사진 수정",
    },
    {
      id: "preferences",
      label: "환경설정",
      icon: <Palette className="h-5 w-5" />,
      description: "테마, 통화, 결제수단",
    },
    {
      id: "backup",
      label: "데이터 백업",
      icon: <Database className="h-5 w-5" />,
      description: "가계부 데이터 다운로드",
    },
  ];

  // 섹션 렌더링
  const renderSection = () => {
    switch (activeSection) {
      case "profile":
        return <ProfileForm />;
      case "preferences":
        return <PreferencesForm />;
      case "backup":
        return (
          <BackupSection
            householdId={householdId}
            householdName={householdName}
          />
        );
      default:
        return <ProfileForm />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="대시보드로"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold">설정</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* 사이드바 - 데스크톱 */}
          <aside className="hidden w-64 flex-shrink-0 lg:block">
            <nav className="sticky top-24 space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
                    activeSection === item.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {item.icon}
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-xs opacity-70">{item.description}</p>
                  </div>
                </button>
              ))}

              {/* 멤버 관리 링크 */}
              <Link
                href="/settings/members"
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Users className="h-5 w-5" />
                <div className="flex-1">
                  <p className="font-medium">멤버 관리</p>
                  <p className="text-xs opacity-70">초대, 권한 관리</p>
                </div>
                <ChevronRight className="h-4 w-4" />
              </Link>

              {/* 로그아웃 */}
              <div className="mt-6 pt-6 border-t border-border">
                <LogoutButton variant="outline" fullWidth confirmClearData />
              </div>
            </nav>
          </aside>

          {/* 메인 콘텐츠 - 데스크톱 */}
          <div className="hidden flex-1 lg:block">
            {/* 프로필 카드 */}
            <div className="mb-6">
              <ProfileCard />
            </div>
            {renderSection()}
          </div>

          {/* 모바일 레이아웃 */}
          <div className="lg:hidden">
            {!showDetail ? (
              /* 메뉴 목록 */
              <div className="space-y-2">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id);
                      setShowDetail(true);
                    }}
                    className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent/50"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                ))}

                {/* 멤버 관리 링크 */}
                <Link
                  href="/settings/members"
                  className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent/50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">멤버 관리</p>
                    <p className="text-sm text-muted-foreground">
                      초대, 권한 관리
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>

                {/* 로그아웃 */}
                <div className="mt-6 pt-6 border-t border-border">
                  <LogoutButton variant="destructive" fullWidth confirmClearData />
                </div>
              </div>
            ) : (
              /* 상세 섹션 */
              <div>
                <button
                  onClick={() => setShowDetail(false)}
                  className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  설정으로 돌아가기
                </button>
                {renderSection()}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 모바일 하단 네비게이션 */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background lg:hidden">
        <div className="flex items-center justify-around py-2">
          <Link
            href="/dashboard"
            className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground"
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">홈</span>
          </Link>
          <Link
            href="/transactions"
            className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground"
          >
            <Database className="h-5 w-5" />
            <span className="text-xs">거래</span>
          </Link>
          <Link
            href="/settings"
            className="flex flex-col items-center gap-1 px-4 py-2 text-primary"
          >
            <Settings className="h-5 w-5" />
            <span className="text-xs">설정</span>
          </Link>
        </div>
      </nav>

      {/* 하단 여백 (모바일 네비게이션용) */}
      <div className="h-20 lg:hidden" />
    </div>
  );
}
