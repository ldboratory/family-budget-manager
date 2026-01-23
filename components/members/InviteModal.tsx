/**
 * 멤버 초대 모달
 *
 * - 이메일로 초대
 * - 초대 링크 생성 및 복사
 * - 대기 중인 초대 목록
 */

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  X,
  Mail,
  Link,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  Clock,
  Send,
} from "lucide-react";
import type { Invite, UserRole } from "@/types";

interface InviteModalProps {
  householdId: string;
  householdInviteCode?: string;
  householdInviteCodeExpiresAt?: Date | string;
  pendingInvites?: Invite[];
  onClose: () => void;
  onInviteByEmail: (email: string, role: UserRole) => Promise<{
    inviteCode: string;
    inviteLink: string;
  }>;
  onRegenerateCode: () => Promise<{
    inviteCode: string;
    inviteLink: string;
  }>;
  isInviting?: boolean;
  isRegenerating?: boolean;
}

// 이메일 유효성 검사 스키마
const inviteSchema = z.object({
  email: z.string().email("올바른 이메일 주소를 입력해주세요"),
  role: z.enum(["member", "admin"]).default("member"),
});

type InviteFormData = z.infer<typeof inviteSchema>;

export function InviteModal({
  householdId: _householdId,
  householdInviteCode,
  householdInviteCodeExpiresAt,
  pendingInvites = [],
  onClose,
  onInviteByEmail,
  onRegenerateCode,
  isInviting = false,
  isRegenerating = false,
}: InviteModalProps) {
  const [copied, setCopied] = useState(false);
  const [inviteResult, setInviteResult] = useState<{
    inviteCode: string;
    inviteLink: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"email" | "link">("email");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: "member",
    },
  });

  // 초대 링크 생성
  const inviteLink = householdInviteCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${householdInviteCode}`
    : "";

  // 만료 시간 포맷팅
  const formatExpiresAt = (date: Date | string | undefined): string => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 클립보드 복사
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("복사 실패:", error);
    }
  };

  // 이메일 초대 제출
  const handleInviteSubmit = async (data: InviteFormData) => {
    try {
      const result = await onInviteByEmail(data.email, data.role as UserRole);
      setInviteResult(result);
      reset();
    } catch (error) {
      // 에러는 상위에서 처리
    }
  };

  // 초대 코드 재생성
  const handleRegenerate = async () => {
    try {
      await onRegenerateCode();
    } catch (error) {
      // 에러는 상위에서 처리
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-card shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">멤버 초대</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("email")}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === "email"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mail className="h-4 w-4" />
            이메일 초대
          </button>
          <button
            onClick={() => setActiveTab("link")}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === "link"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Link className="h-4 w-4" />
            초대 링크
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="p-6">
          {activeTab === "email" ? (
            /* 이메일 초대 */
            <form onSubmit={handleSubmit(handleInviteSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  이메일 주소
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    className={`w-full rounded-lg border bg-background py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary ${
                      errors.email ? "border-destructive" : "border-input"
                    }`}
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="role" className="text-sm font-medium">
                  역할
                </label>
                <select
                  id="role"
                  className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                  {...register("role")}
                >
                  <option value="member">멤버 (거래 입력/조회)</option>
                  <option value="admin">관리자 (멤버 초대 가능)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isInviting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isInviting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    초대 중...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    초대 보내기
                  </>
                )}
              </button>

              {/* 초대 결과 */}
              {inviteResult && (
                <div className="rounded-lg bg-green-50 p-4">
                  <p className="text-sm font-medium text-green-800">
                    초대가 생성되었습니다
                  </p>
                  <p className="mt-1 text-xs text-green-600">
                    초대 링크를 상대방에게 공유해주세요:
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteResult.inviteLink}
                      className="flex-1 truncate rounded-lg border border-green-200 bg-white px-3 py-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(inviteResult.inviteLink)}
                      className="rounded-lg bg-green-600 p-2 text-white hover:bg-green-700"
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          ) : (
            /* 초대 링크 */
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">초대 링크</label>
                <p className="text-xs text-muted-foreground">
                  이 링크를 공유하면 누구나 가계부에 참여할 수 있습니다
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    className="flex-1 truncate rounded-lg border border-input bg-muted px-4 py-3 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(inviteLink)}
                    className="rounded-lg bg-primary p-3 text-primary-foreground hover:bg-primary/90"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* 만료 정보 */}
              {householdInviteCodeExpiresAt && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    {formatExpiresAt(householdInviteCodeExpiresAt)}까지 유효
                  </span>
                </div>
              )}

              {/* 재생성 버튼 */}
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-input bg-background py-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
              >
                {isRegenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    재생성 중...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    새 초대 코드 생성
                  </>
                )}
              </button>

              <p className="text-xs text-muted-foreground">
                새 코드를 생성하면 기존 코드는 무효화됩니다
              </p>
            </div>
          )}

          {/* 대기 중인 초대 목록 */}
          {pendingInvites.length > 0 && (
            <div className="mt-6 border-t border-border pt-4">
              <h3 className="text-sm font-medium">대기 중인 초대</h3>
              <div className="mt-3 space-y-2">
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                  >
                    <div>
                      <p className="text-sm">{invite.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatExpiresAt(
                          invite.expiresAt?.toDate?.() || invite.expiresAt
                        )}{" "}
                        만료
                      </p>
                    </div>
                    <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-700">
                      대기 중
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InviteModal;
