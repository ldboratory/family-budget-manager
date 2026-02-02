/**
 * 자산 목록 / 생성 API
 *
 * GET  /api/households/[householdId]/assets - 자산 목록 조회
 * POST /api/households/[householdId]/assets - 자산 생성
 */

import { NextRequest, NextResponse } from "next/server";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createAssetSchema } from "@/lib/validations/asset";
import type { Asset } from "@/types";

interface RouteParams {
  params: {
    householdId: string;
  };
}

/**
 * GET: 자산 목록 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { householdId } = params;
    const { searchParams } = new URL(request.url);

    const includeInactive = searchParams.get("includeInactive") === "true";
    const category = searchParams.get("category");

    const collectionRef = collection(db, `households/${householdId}/assets`);

    // 쿼리 구성
    const constraints: any[] = [];

    if (!includeInactive) {
      constraints.push(where("isActive", "==", true));
    }

    if (category) {
      constraints.push(where("category", "==", category));
    }

    constraints.push(orderBy("sortOrder", "asc"));

    const q = query(collectionRef, ...constraints);
    const snapshot = await getDocs(q);

    const assets: Asset[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Asset[];

    // 요약 계산
    let totalAssets = 0;
    let totalLiabilities = 0;

    assets.forEach((asset) => {
      if (asset.category === "loan") {
        totalLiabilities += Math.abs(asset.amount);
      } else {
        totalAssets += asset.amount;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        items: assets,
        summary: {
          total: totalAssets - totalLiabilities,
          assets: totalAssets,
          liabilities: totalLiabilities,
          count: assets.length,
        },
      },
    });
  } catch (error) {
    console.error("[API] GET assets 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "자산 목록 조회에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}

/**
 * POST: 자산 생성
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { householdId } = params;
    const body = await request.json();

    // 입력 검증
    const parseResult = createAssetSchema.safeParse(body);
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

    const asset: Omit<Asset, "id"> & { id: string } = {
      id,
      assetName: input.assetName,
      category: input.category,
      amount: input.amount,
      currency: input.currency,
      description: input.description,
      institution: input.institution,
      accountNumberLast4: input.accountNumberLast4,
      interestRate: input.interestRate,
      maturityDate: input.maturityDate
        ? Timestamp.fromDate(new Date(input.maturityDate))
        : undefined,
      isActive: true,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
      version: 1,
      syncStatus: "synced",
    };

    // Firestore에 저장
    const docRef = doc(db, `households/${householdId}/assets`, id);
    await setDoc(docRef, asset);

    return NextResponse.json({ success: true, data: asset }, { status: 201 });
  } catch (error) {
    console.error("[API] POST asset 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "자산 생성에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}
