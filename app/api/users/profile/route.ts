/**
 * 사용자 프로필 API
 *
 * GET /api/users/profile - 프로필 조회
 * PUT /api/users/profile - 프로필 업데이트
 */

import { NextRequest, NextResponse } from "next/server";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  Timestamp,
  collection,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { z } from "zod";
import type { User } from "@/types";

// 프로필 업데이트 스키마
const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(1, "이름을 입력해주세요")
    .max(30, "이름은 30자 이내로 입력해주세요")
    .optional(),
  avatar: z.string().url("올바른 URL을 입력해주세요").optional().nullable(),
});

/**
 * GET: 프로필 조회
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" },
        },
        { status: 401 }
      );
    }

    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "사용자를 찾을 수 없습니다" },
        },
        { status: 404 }
      );
    }

    const user = docSnap.data() as User;

    return NextResponse.json({
      success: true,
      data: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        role: user.role,
        currency: user.currency,
        householdIds: user.householdIds,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("[API] GET profile 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "프로필 조회에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT: 프로필 업데이트
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const body = await request.json();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" },
        },
        { status: 401 }
      );
    }

    // 입력 검증
    const parseResult = updateProfileSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parseResult.error.errors[0]?.message ?? "입력값이 올바르지 않습니다",
          },
        },
        { status: 400 }
      );
    }

    const input = parseResult.data;
    const now = Timestamp.now();

    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "사용자를 찾을 수 없습니다" },
        },
        { status: 404 }
      );
    }

    const currentUser = docSnap.data() as User;

    // 업데이트할 데이터
    const updateData: Record<string, any> = {
      updatedAt: now,
      version: (currentUser.version || 0) + 1,
    };

    if (input.displayName !== undefined) {
      updateData.displayName = input.displayName;
    }

    if (input.avatar !== undefined) {
      updateData.avatar = input.avatar;
    }

    await updateDoc(docRef, updateData);

    // 가계부의 멤버 정보도 업데이트 (비정규화된 데이터)
    if (input.displayName || input.avatar !== undefined) {
      await updateMemberInfoInHouseholds(
        userId,
        input.displayName || currentUser.displayName,
        input.avatar !== undefined ? input.avatar : currentUser.avatar
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        uid: userId,
        displayName: input.displayName ?? currentUser.displayName,
        avatar: input.avatar !== undefined ? input.avatar : currentUser.avatar,
      },
    });
  } catch (error) {
    console.error("[API] PUT profile 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "프로필 업데이트에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}

/**
 * 가계부의 멤버 정보 업데이트 (비정규화)
 */
async function updateMemberInfoInHouseholds(
  userId: string,
  displayName: string,
  avatar?: string | null
): Promise<void> {
  try {
    // 사용자의 가계부 목록 조회
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return;

    const householdIds = userDoc.data().householdIds || [];

    for (const householdId of householdIds) {
      const householdRef = doc(db, "households", householdId);
      const householdSnap = await getDoc(householdRef);

      if (householdSnap.exists()) {
        const household = householdSnap.data();
        const members = household.members || [];

        const memberIndex = members.findIndex((m: any) => m.uid === userId);
        if (memberIndex !== -1) {
          members[memberIndex] = {
            ...members[memberIndex],
            displayName,
            ...(avatar !== undefined && { avatar }),
          };

          await updateDoc(householdRef, {
            members,
            updatedAt: Timestamp.now(),
          });
        }
      }
    }
  } catch (error) {
    console.error("[API] 가계부 멤버 정보 업데이트 실패:", error);
    // 실패해도 메인 업데이트는 성공으로 처리
  }
}
