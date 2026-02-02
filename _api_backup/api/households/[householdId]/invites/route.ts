/**
 * 초대 목록 API
 *
 * GET  /api/households/[householdId]/invites - 초대 목록 조회
 * POST /api/households/[householdId]/invites - 초대 코드 재생성
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
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Household, Invite } from "@/types";

interface RouteParams {
  params: {
    householdId: string;
  };
}

// 초대 코드 생성
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * GET: 초대 목록 조회 (대기 중인 초대)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { householdId } = params;
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

    // 멤버 여부 확인
    const currentMember = household.members.find((m) => m.uid === userId);
    if (!currentMember) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "접근 권한이 없습니다" },
        },
        { status: 403 }
      );
    }

    // owner/admin만 초대 목록 조회 가능
    if (currentMember.role !== "owner" && currentMember.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "초대 목록 조회 권한이 없습니다" },
        },
        { status: 403 }
      );
    }

    // 초대 목록 조회
    const invitesRef = collection(db, `households/${householdId}/invites`);
    const q = query(
      invitesRef,
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);

    const invites: Invite[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Invite[];

    // 만료된 초대 필터링
    const now = Timestamp.now();
    const validInvites = invites.filter(
      (invite) => invite.expiresAt.toMillis() > now.toMillis()
    );

    return NextResponse.json({
      success: true,
      data: {
        invites: validInvites,
        householdInviteCode: household.inviteCode,
        householdInviteCodeExpiresAt: household.inviteCodeExpiresAt,
      },
    });
  } catch (error) {
    console.error("[API] GET invites 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "초대 목록 조회에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}

/**
 * POST: 가계부 초대 코드 재생성
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { householdId } = params;
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

    // owner만 초대 코드 재생성 가능
    const currentMember = household.members.find((m) => m.uid === userId);
    if (!currentMember || currentMember.role !== "owner") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "초대 코드 재생성 권한이 없습니다 (owner만 가능)" },
        },
        { status: 403 }
      );
    }

    // 새 초대 코드 생성
    const newInviteCode = generateInviteCode();
    const expiresAt = Timestamp.fromDate(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7일 후 만료
    );
    const now = Timestamp.now();

    await updateDoc(docRef, {
      inviteCode: newInviteCode,
      inviteCodeExpiresAt: expiresAt,
      updatedAt: now,
      version: household.version + 1,
    });

    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${newInviteCode}`;

    return NextResponse.json({
      success: true,
      data: {
        inviteCode: newInviteCode,
        inviteLink,
        expiresAt: expiresAt.toDate().toISOString(),
      },
    });
  } catch (error) {
    console.error("[API] POST regenerate invite code 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "초대 코드 재생성에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}
