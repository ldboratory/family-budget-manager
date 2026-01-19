/**
 * 프로필 수정 폼
 *
 * - 프로필 사진 업로드
 * - 이름 변경
 */

"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, User, Loader2, Check, X } from "lucide-react";
import { useProfile, useUpdateProfile } from "@/hooks/usePreferences";

// 프로필 수정 스키마
const profileSchema = z.object({
  displayName: z
    .string()
    .min(1, "이름을 입력해주세요")
    .max(30, "이름은 30자 이내로 입력해주세요"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileForm() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      displayName: profile?.displayName ?? "",
    },
  });

  // 아바타 파일 선택
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 파일 크기 체크 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("파일 크기는 5MB 이하여야 합니다");
        return;
      }

      // 이미지 타입 체크
      if (!file.type.startsWith("image/")) {
        alert("이미지 파일만 업로드 가능합니다");
        return;
      }

      // 미리보기 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 폼 제출
  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfile.mutateAsync({
        displayName: data.displayName,
        // TODO: 실제 구현에서는 Firebase Storage에 업로드 후 URL 사용
        ...(avatarPreview && { avatar: avatarPreview }),
      });
      setIsEditing(false);
      setAvatarPreview(null);
    } catch (error) {
      // 에러는 mutation에서 처리
    }
  };

  // 편집 취소
  const handleCancel = () => {
    setIsEditing(false);
    setAvatarPreview(null);
    reset();
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="animate-pulse">
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-full bg-muted" />
            <div className="flex-1 space-y-3">
              <div className="h-5 w-32 rounded bg-muted" />
              <div className="h-4 w-48 rounded bg-muted" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-6 text-lg font-semibold">프로필</h3>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {/* 아바타 */}
          <div className="relative flex-shrink-0">
            <div className="relative">
              {avatarPreview || profile?.avatar ? (
                <img
                  src={avatarPreview || profile?.avatar}
                  alt="프로필 사진"
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-10 w-10 text-primary" />
                </div>
              )}

              {isEditing && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 rounded-full bg-primary p-2 text-primary-foreground shadow-lg hover:bg-primary/90"
                  aria-label="사진 변경"
                >
                  <Camera className="h-4 w-4" />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          {/* 정보 */}
          <div className="flex-1 space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <label htmlFor="displayName" className="text-sm font-medium">
                    이름
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    className={`w-full rounded-lg border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary ${
                      errors.displayName ? "border-destructive" : "border-input"
                    }`}
                    placeholder="이름을 입력해주세요"
                    {...register("displayName")}
                  />
                  {errors.displayName && (
                    <p className="text-xs text-destructive">
                      {errors.displayName.message}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
                    disabled={updateProfile.isPending}
                  >
                    <X className="h-4 w-4" />
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    disabled={
                      updateProfile.isPending || (!isDirty && !avatarPreview)
                    }
                  >
                    {updateProfile.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        저장
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-lg font-medium">{profile?.displayName}</p>
                  <p className="text-sm text-muted-foreground">
                    {profile?.email}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
                >
                  프로필 수정
                </button>
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

export default ProfileForm;
