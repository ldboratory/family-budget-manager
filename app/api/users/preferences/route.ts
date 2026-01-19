/**
 * 사용자 환경설정 API
 *
 * GET /api/users/preferences - 설정 조회
 * PUT /api/users/preferences - 설정 업데이트
 */

import { NextRequest, NextResponse } from "next/server";
import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { z } from "zod";
import type { Preferences } from "@/types";

// 설정 업데이트 스키마
const updatePreferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  currency: z.enum(["KRW", "USD", "EUR", "JPY"]).optional(),
  language: z.enum(["ko", "en"]).optional(),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]).optional(),
  defaultPaymentMethod: z
    .enum(["cash", "debit-card", "credit-card", "bank-transfer", "mobile-pay", "other"])
    .optional(),
  monthStartDate: z.number().min(1).max(31).optional(),
  notifications: z
    .object({
      dailyReminder: z.boolean().optional(),
      budgetAlert: z.boolean().optional(),
      budgetWarningThreshold: z.number().min(0).max(100).optional(),
      monthlyReport: z.boolean().optional(),
      familyActivity: z.boolean().optional(),
      email: z.boolean().optional(),
      frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
    })
    .optional(),
});

// 기본 설정값
const DEFAULT_PREFERENCES = {
  theme: "system" as const,
  currency: "KRW" as const,
  language: "ko" as const,
  weekStartsOn: 0 as const,
  monthStartDate: 1,
  notifications: {
    dailyReminder: false,
    budgetAlert: true,
    budgetWarningThreshold: 80,
    monthlyReport: true,
    familyActivity: true,
  },
};

/**
 * GET: 사용자 설정 조회
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

    const docRef = doc(db, `users/${userId}/preferences`, "settings");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return NextResponse.json({
        success: true,
        data: {
          userId,
          ...docSnap.data(),
        },
      });
    }

    // 없으면 기본값 반환
    return NextResponse.json({
      success: true,
      data: {
        userId,
        ...DEFAULT_PREFERENCES,
      },
    });
  } catch (error) {
    console.error("[API] GET preferences 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "설정 조회에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT: 사용자 설정 업데이트
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
    const parseResult = updatePreferencesSchema.safeParse(body);
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

    const docRef = doc(db, `users/${userId}/preferences`, "settings");
    const docSnap = await getDoc(docRef);

    let currentData = DEFAULT_PREFERENCES;
    if (docSnap.exists()) {
      currentData = { ...DEFAULT_PREFERENCES, ...docSnap.data() };
    }

    // 병합
    const updatedData = {
      ...currentData,
      ...input,
      notifications: {
        ...currentData.notifications,
        ...(input.notifications || {}),
      },
      userId,
      updatedAt: now,
    };

    await setDoc(docRef, updatedData, { merge: true });

    return NextResponse.json({
      success: true,
      data: updatedData,
    });
  } catch (error) {
    console.error("[API] PUT preferences 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "설정 업데이트에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}
