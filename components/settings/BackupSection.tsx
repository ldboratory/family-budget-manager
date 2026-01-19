/**
 * 데이터 백업 섹션
 *
 * - 가계부 데이터 JSON 다운로드
 * - 백업 파일 정보 표시
 */

"use client";

import { useState } from "react";
import {
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  Database,
  FileJson,
  Calendar,
} from "lucide-react";
import { useBackup } from "@/hooks/usePreferences";

interface BackupSectionProps {
  householdId?: string;
  householdName?: string;
}

export function BackupSection({ householdId, householdName }: BackupSectionProps) {
  const backup = useBackup();
  const [lastBackup, setLastBackup] = useState<{
    fileName: string;
    date: Date;
  } | null>(null);

  // 백업 실행
  const handleBackup = async () => {
    if (!householdId) {
      alert("가계부를 선택해주세요");
      return;
    }

    try {
      const result = await backup.mutateAsync(householdId);
      setLastBackup({
        fileName: result.fileName,
        date: new Date(),
      });
    } catch (error) {
      // 에러는 mutation에서 처리
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-6 text-lg font-semibold">데이터 백업</h3>

      <div className="space-y-6">
        {/* 백업 설명 */}
        <div className="flex items-start gap-4 rounded-lg bg-muted/50 p-4">
          <Database className="h-10 w-10 flex-shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="font-medium">가계부 데이터 백업</p>
            <p className="text-sm text-muted-foreground">
              거래 내역, 자산 정보, 카테고리 등 모든 데이터를 JSON 파일로
              다운로드할 수 있습니다. 백업 파일은 데이터 복구나 다른 서비스로의
              이전에 사용할 수 있습니다.
            </p>
          </div>
        </div>

        {/* 백업 대상 */}
        {householdId && (
          <div className="space-y-2">
            <label className="text-sm font-medium">백업 대상</label>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-4">
              <FileJson className="h-8 w-8 text-blue-500" />
              <div>
                <p className="font-medium">{householdName || "가계부"}</p>
                <p className="text-xs text-muted-foreground">
                  모든 거래 내역, 자산, 카테고리 포함
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 백업 버튼 */}
        <button
          onClick={handleBackup}
          disabled={backup.isPending || !householdId}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {backup.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              백업 생성 중...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              지금 백업
            </>
          )}
        </button>

        {/* 가계부 미선택 안내 */}
        {!householdId && (
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <AlertCircle className="h-4 w-4" />
            백업하려면 가계부를 먼저 선택해주세요
          </div>
        )}

        {/* 백업 성공 */}
        {backup.isSuccess && lastBackup && (
          <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4 text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">백업 완료</p>
              <p className="text-sm opacity-80">
                {lastBackup.fileName} 파일이 다운로드되었습니다
              </p>
            </div>
          </div>
        )}

        {/* 백업 에러 */}
        {backup.isError && (
          <div className="flex items-center gap-3 rounded-lg bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">백업 실패</p>
              <p className="text-sm opacity-80">
                {backup.error instanceof Error
                  ? backup.error.message
                  : "백업 중 오류가 발생했습니다"}
              </p>
            </div>
          </div>
        )}

        {/* 백업 포함 항목 */}
        <div className="space-y-3">
          <p className="text-sm font-medium">백업 포함 항목</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              가계부 기본 정보 (이름, 통화, 멤버)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              모든 거래 내역 (수입/지출)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              자산 정보
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              카테고리 설정
            </li>
          </ul>
        </div>

        {/* 마지막 백업 정보 */}
        {lastBackup && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            마지막 백업:{" "}
            {lastBackup.date.toLocaleString("ko-KR", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default BackupSection;
