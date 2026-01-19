/**
 * 초대 코드로 가입 API
 *
 * GET  /api/invites/[inviteCode] - 초대 정보 조회
 * POST /api/invites/[inviteCode] - 초대 코드로 가계부 참여
 */

import { NextRequest, NextResponse } from "next/server";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  arrayUnion,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Household, HouseholdMember, Invite } from "@/types";

interface RouteParams {
  params: {
    inviteCode: string;
  };
}

/**
 * GET: 초대 코드로 초대 정보 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { inviteCode } = params;

    // 가계부 초대 코드로 검색
    const householdsRef = collection(db, "households");
    const householdQuery = query(
      householdsRef,
      where("inviteCode", "==", inviteCode.toUpperCase())
    );
    const householdSnapshot = await getDocs(householdQuery);

    if (!householdSnapshot.empty) {
      const householdDoc = householdSnapshot.docs[0];
      const household = householdDoc.data() as Household;

      // 만료 확인
      if (
        household.inviteCodeExpiresAt &&
        household.inviteCodeExpiresAt.toMillis() < Date.now()
      ) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "FORBIDDEN", message: "초대 코드가 만료되었습니다" },
          },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          type: "household",
          householdId: householdDoc.id,
          householdName: household.name,
          memberCount: household.members.length,
          createdBy: household.members.find((m) => m.role === "owner")?.displayName,
        },
      });
    }

    // 개별 초대로 검색
    // 모든 가계부의 invites 서브컬렉션을 검색해야 하므로 비효율적
    // 실제로는 별도 컬렉션이나 인덱스 필요
    return NextResponse.json(
      {
        success: false,
        error: { code: "NOT_FOUND", message: "유효하지 않은 초대 코드입니다" },
      },
      { status: 404 }
    );
  } catch (error) {
    console.error("[API] GET invite info 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "초대 정보 조회에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}

/**
 * POST: 초대 코드로 가계부 참여
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { inviteCode } = params;
    const userId = request.headers.get("x-user-id");
    const userEmail = request.headers.get("x-user-email");
    const userName = request.headers.get("x-user-name") || "사용자";
    const userAvatar = request.headers.get("x-user-avatar") || undefined;

    if (!userId || !userEmail) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" },
        },
        { status: 401 }
      );
    }

    // 가계부 초대 코드로 검색
    const householdsRef = collection(db, "households");
    const householdQuery = query(
      householdsRef,
      where("inviteCode", "==", inviteCode.toUpperCase())
    );
    const householdSnapshot = await getDocs(householdQuery);

    if (householdSnapshot.empty) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "유효하지 않은 초대 코드입니다" },
        },
        { status: 404 }
      );
    }

    const householdDoc = householdSnapshot.docs[0];
    const household = householdDoc.data() as Household;
    const householdId = householdDoc.id;

    // 만료 확인
    if (
      household.inviteCodeExpiresAt &&
      household.inviteCodeExpiresAt.toMillis() < Date.now()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "초대 코드가 만료되었습니다" },
        },
        { status: 403 }
      );
    }

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

    // 새 멤버 생성
    const now = Timestamp.now();
    const newMember: HouseholdMember = {
      uid: userId,
      displayName: userName,
      email: userEmail,
      avatar: userAvatar,
      role: "member", // 초대 코드로 가입하면 기본 member 역할
      joinedAt: now,
    };

    // 가계부에 멤버 추가
    const householdRef = doc(db, "households", householdId);
    await updateDoc(householdRef, {
      members: [...household.members, newMember],
      updatedAt: now,
      version: household.version + 1,
    });

    // 사용자 문서에 householdId 추가
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      householdIds: arrayUnion(householdId),
      updatedAt: now,
    }).catch(() => {
      // 사용자 문서가 없으면 무시
    });

    return NextResponse.json({
      success: true,
      data: {
        householdId,
        householdName: household.name,
        role: "member",
        joinedAt: now.toDate().toISOString(),
      },
    });
  } catch (error) {
    console.error("[API] POST join by invite code 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "가계부 참여에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}
