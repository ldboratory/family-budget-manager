/**
 * 개별 멤버 API
 *
 * DELETE /api/households/[householdId]/members/[userId] - 멤버 제거
 * PATCH  /api/households/[householdId]/members/[userId] - 멤버 역할 변경
 */

import { NextRequest, NextResponse } from "next/server";
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  arrayRemove,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { z } from "zod";
import type { Household, UserRole } from "@/types";

interface RouteParams {
  params: {
    householdId: string;
    userId: string;
  };
}

// 역할 변경 스키마
const updateRoleSchema = z.object({
  role: z.enum(["admin", "member", "viewer"]),
});

/**
 * DELETE: 멤버 제거
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { householdId, userId: targetUserId } = params;
    const currentUserId = request.headers.get("x-user-id");

    if (!currentUserId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" },
        },
        { status: 401 }
      );
    }

    // 가계부 조회
    const docRef = doc(db, "households", householdId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "가계부를 찾을 수 없습니다" },
        },
        { status: 404 }
      );
    }

    const household = docSnap.data() as Household;

    // 현재 사용자 권한 확인
    const currentMember = household.members.find((m) => m.uid === currentUserId);
    if (!currentMember) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "접근 권한이 없습니다" },
        },
        { status: 403 }
      );
    }

    // 제거할 멤버 찾기
    const targetMember = household.members.find((m) => m.uid === targetUserId);
    if (!targetMember) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "멤버를 찾을 수 없습니다" },
        },
        { status: 404 }
      );
    }

    // 본인 탈퇴 또는 owner/admin의 멤버 제거만 허용
    const isSelfLeave = currentUserId === targetUserId;
    const isOwnerOrAdmin =
      currentMember.role === "owner" || currentMember.role === "admin";

    if (!isSelfLeave && !isOwnerOrAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "멤버 제거 권한이 없습니다" },
        },
        { status: 403 }
      );
    }

    // owner는 제거 불가 (다른 사람에게 양도 필요)
    if (targetMember.role === "owner") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "가계부 소유자는 제거할 수 없습니다. 먼저 소유권을 이전해주세요.",
          },
        },
        { status: 403 }
      );
    }

    // 멤버 제거
    const updatedMembers = household.members.filter((m) => m.uid !== targetUserId);

    // 최소 1명은 남아야 함
    if (updatedMembers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "가계부에는 최소 1명의 멤버가 필요합니다" },
        },
        { status: 403 }
      );
    }

    const now = Timestamp.now();
    await updateDoc(docRef, {
      members: updatedMembers,
      updatedAt: now,
      version: household.version + 1,
    });

    // 사용자 문서에서 householdId 제거
    const userRef = doc(db, "users", targetUserId);
    await updateDoc(userRef, {
      householdIds: arrayRemove(householdId),
      updatedAt: now,
    }).catch(() => {
      // 사용자 문서가 없어도 무시
    });

    return NextResponse.json({
      success: true,
      data: { removed: true, userId: targetUserId },
    });
  } catch (error) {
    console.error("[API] DELETE member 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "멤버 제거에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH: 멤버 역할 변경
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { householdId, userId: targetUserId } = params;
    const currentUserId = request.headers.get("x-user-id");
    const body = await request.json();

    if (!currentUserId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" },
        },
        { status: 401 }
      );
    }

    // 입력 검증
    const parseResult = updateRoleSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "올바른 역할을 선택해주세요",
          },
        },
        { status: 400 }
      );
    }

    const { role: newRole } = parseResult.data;

    // 가계부 조회
    const docRef = doc(db, "households", householdId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "가계부를 찾을 수 없습니다" },
        },
        { status: 404 }
      );
    }

    const household = docSnap.data() as Household;

    // 현재 사용자가 owner인지 확인
    const currentMember = household.members.find((m) => m.uid === currentUserId);
    if (!currentMember || currentMember.role !== "owner") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "역할 변경 권한이 없습니다 (owner만 가능)" },
        },
        { status: 403 }
      );
    }

    // 대상 멤버 찾기
    const targetMemberIndex = household.members.findIndex(
      (m) => m.uid === targetUserId
    );
    if (targetMemberIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "멤버를 찾을 수 없습니다" },
        },
        { status: 404 }
      );
    }

    // owner의 역할은 변경 불가
    const targetMember = household.members[targetMemberIndex];
    if (!targetMember || targetMember.role === "owner") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "owner 역할은 변경할 수 없습니다. 소유권 이전을 사용하세요.",
          },
        },
        { status: 403 }
      );
    }

    // 역할 업데이트
    const updatedMembers = [...household.members];
    updatedMembers[targetMemberIndex] = {
      ...targetMember,
      role: newRole as UserRole,
    };

    const now = Timestamp.now();
    await updateDoc(docRef, {
      members: updatedMembers,
      updatedAt: now,
      version: household.version + 1,
    });

    return NextResponse.json({
      success: true,
      data: {
        userId: targetUserId,
        newRole,
      },
    });
  } catch (error) {
    console.error("[API] PATCH member 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "역할 변경에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}
