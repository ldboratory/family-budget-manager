/**
 * 멤버 API
 *
 * GET  /api/households/[householdId]/members - 멤버 목록
 * POST /api/households/[householdId]/members - 멤버 초대 (이메일)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  Timestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { z } from "zod";
import type { Household, Invite, UserRole } from "@/types";

interface RouteParams {
  params: {
    householdId: string;
  };
}

// 초대 이메일 스키마
const inviteSchema = z.object({
  email: z.string().email("올바른 이메일 주소를 입력해주세요"),
  role: z.enum(["member", "admin"]).default("member"),
});

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
 * GET: 멤버 목록 조회
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
    const isMember = household.members.some((m) => m.uid === userId);
    if (!isMember) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "접근 권한이 없습니다" },
        },
        { status: 403 }
      );
    }

    // 현재 사용자 역할 확인
    const currentMember = household.members.find((m) => m.uid === userId);

    return NextResponse.json({
      success: true,
      data: {
        members: household.members,
        currentUserRole: currentMember?.role,
        isOwner: currentMember?.role === "owner",
      },
    });
  } catch (error) {
    console.error("[API] GET members 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "멤버 목록 조회에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}

/**
 * POST: 멤버 초대 (이메일)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { householdId } = params;
    const userId = request.headers.get("x-user-id");
    const userName = request.headers.get("x-user-name") || "사용자";
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
    const parseResult = inviteSchema.safeParse(body);
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

    // owner/admin 권한 확인
    const currentMember = household.members.find((m) => m.uid === userId);
    if (!currentMember || (currentMember.role !== "owner" && currentMember.role !== "admin")) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "멤버 초대 권한이 없습니다" },
        },
        { status: 403 }
      );
    }

    // 이미 멤버인지 확인
    const existingMember = household.members.find(
      (m) => m.email.toLowerCase() === input.email.toLowerCase()
    );
    if (existingMember) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "CONFLICT", message: "이미 가계부에 참여 중인 멤버입니다" },
        },
        { status: 409 }
      );
    }

    // 이미 대기 중인 초대가 있는지 확인
    const invitesRef = collection(db, `households/${householdId}/invites`);
    const existingInviteQuery = query(
      invitesRef,
      where("email", "==", input.email.toLowerCase()),
      where("status", "==", "pending")
    );
    const existingInvites = await getDocs(existingInviteQuery);

    if (!existingInvites.empty) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "CONFLICT", message: "이미 대기 중인 초대가 있습니다" },
        },
        { status: 409 }
      );
    }

    // 초대 생성
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromDate(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7일 후 만료
    );
    const inviteCode = generateInviteCode();

    const invite: Omit<Invite, "id"> = {
      householdId,
      householdName: household.name,
      email: input.email.toLowerCase(),
      role: input.role as UserRole,
      status: "pending",
      inviteCode,
      invitedBy: userId,
      invitedByName: userName,
      expiresAt,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    const inviteRef = await addDoc(invitesRef, invite);

    // 초대 링크 생성
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${inviteCode}`;

    return NextResponse.json(
      {
        success: true,
        data: {
          inviteId: inviteRef.id,
          inviteCode,
          inviteLink,
          email: input.email,
          expiresAt: expiresAt.toDate().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] POST invite 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "멤버 초대에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}
