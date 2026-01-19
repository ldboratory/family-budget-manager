/**
 * 초대 수락 API
 *
 * POST /api/households/[householdId]/invites/[inviteId]/accept - 초대 수락
 */

import { NextRequest, NextResponse } from "next/server";
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  arrayUnion,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Household, HouseholdMember, Invite } from "@/types";

interface RouteParams {
  params: {
    householdId: string;
    inviteId: string;
  };
}

/**
 * POST: 초대 수락
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { householdId, inviteId } = params;
    const userId = request.headers.get("x-user-id");
    const userEmail = request.headers.get("x-user-email");
    const userName = request.headers.get("x-user-name") || "사용자";

    if (!userId || !userEmail) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" },
        },
        { status: 401 }
      );
    }

    // 가계부 조회
    const householdRef = doc(db, "households", householdId);
    const householdSnap = await getDoc(householdRef);

    if (!householdSnap.exists()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "가계부를 찾을 수 없습니다" },
        },
        { status: 404 }
      );
    }

    const household = householdSnap.data() as Household;

    // 이미 멤버인지 확인
    const existingMember = household.members.find((m) => m.uid === userId);
    if (existingMember) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "CONFLICT", message: "이미 가계부에 참여 중입니다" },
        },
        { status: 409 }
      );
    }

    // 초대 조회
    const inviteRef = doc(db, `households/${householdId}/invites`, inviteId);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "초대를 찾을 수 없습니다" },
        },
        { status: 404 }
      );
    }

    const invite = inviteSnap.data() as Invite;

    // 초대 상태 확인
    if (invite.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "이미 처리된 초대입니다" },
        },
        { status: 403 }
      );
    }

    // 만료 확인
    const now = Timestamp.now();
    if (invite.expiresAt.toMillis() < now.toMillis()) {
      await updateDoc(inviteRef, {
        status: "expired",
        updatedAt: now,
      });

      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "초대가 만료되었습니다" },
        },
        { status: 403 }
      );
    }

    // 이메일 확인 (초대받은 이메일과 일치해야 함)
    if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "이 초대는 다른 이메일 주소로 발송되었습니다",
          },
        },
        { status: 403 }
      );
    }

    // 새 멤버 생성
    const newMember: HouseholdMember = {
      uid: userId,
      displayName: userName,
      email: userEmail,
      role: invite.role,
      joinedAt: now,
    };

    // 가계부에 멤버 추가
    await updateDoc(householdRef, {
      members: [...household.members, newMember],
      updatedAt: now,
      version: household.version + 1,
    });

    // 초대 상태 업데이트
    await updateDoc(inviteRef, {
      status: "accepted",
      acceptedAt: now,
      acceptedBy: userId,
      updatedAt: now,
    });

    // 사용자 문서에 householdId 추가
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      householdIds: arrayUnion(householdId),
      updatedAt: now,
    }).catch(() => {
      // 사용자 문서가 없으면 무시 (별도 생성 필요)
    });

    return NextResponse.json({
      success: true,
      data: {
        householdId,
        householdName: household.name,
        role: invite.role,
        joinedAt: now.toDate().toISOString(),
      },
    });
  } catch (error) {
    console.error("[API] POST accept invite 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "초대 수락에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}
