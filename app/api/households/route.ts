/**
 * 가계부(Household) API
 *
 * POST /api/households - 새 가계부 생성
 * GET  /api/households - 현재 사용자의 가계부 목록
 */

import { NextRequest, NextResponse } from "next/server";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  Timestamp,
  arrayUnion,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { z } from "zod";
import type { Household, HouseholdMember, User } from "@/types";

// 유효성 검사 스키마
const createHouseholdSchema = z.object({
  name: z.string().min(1, "가계부 이름을 입력해주세요").max(50),
  description: z.string().max(200).optional(),
  currency: z.enum(["KRW", "USD", "EUR", "JPY"]).default("KRW"),
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
 * POST: 새 가계부 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 사용자 정보 (헤더에서 - 실제로는 인증 미들웨어에서)
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

    // 입력 검증
    const parseResult = createHouseholdSchema.safeParse(body);
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
    const id = crypto.randomUUID();
    const now = Timestamp.now();

    // Owner 멤버 정보
    const ownerMember: HouseholdMember = {
      uid: userId,
      displayName: userName,
      email: userEmail,
      role: "owner",
      joinedAt: now,
    };

    // 초대 코드 생성 (7일 유효)
    const inviteCode = generateInviteCode();
    const inviteCodeExpiresAt = Timestamp.fromDate(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );

    const household: Omit<Household, "id"> & { id: string } = {
      id,
      name: input.name,
      description: input.description,
      members: [ownerMember],
      currency: input.currency,
      createdBy: userId,
      inviteCode,
      inviteCodeExpiresAt,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    // Firestore에 저장
    const docRef = doc(db, "households", id);
    await setDoc(docRef, household);

    // 사용자 문서에 householdId 추가
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      householdIds: arrayUnion(id),
      updatedAt: now,
    }).catch(() => {
      // 사용자 문서가 없으면 생성
      setDoc(userRef, {
        uid: userId,
        email: userEmail,
        displayName: userName,
        role: "owner",
        currency: input.currency,
        householdIds: [id],
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
    });

    return NextResponse.json(
      { success: true, data: household },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] POST household 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "가계부 생성에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}

/**
 * GET: 현재 사용자의 가계부 목록
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

    // 사용자가 멤버인 가계부 조회
    const householdsRef = collection(db, "households");
    const snapshot = await getDocs(householdsRef);

    const households: Household[] = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data() as Household;
      // 멤버 목록에서 현재 사용자 확인
      const isMember = data.members?.some((m) => m.uid === userId);
      if (isMember) {
        households.push({ ...data, id: doc.id });
      }
    });

    return NextResponse.json({ success: true, data: households });
  } catch (error) {
    console.error("[API] GET households 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "가계부 목록 조회에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}
