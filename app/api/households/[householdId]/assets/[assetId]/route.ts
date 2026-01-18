/**
 * 개별 자산 API
 *
 * GET    /api/households/[householdId]/assets/[assetId] - 자산 상세 조회
 * PUT    /api/households/[householdId]/assets/[assetId] - 자산 수정
 * DELETE /api/households/[householdId]/assets/[assetId] - 자산 삭제 (soft delete)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  runTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateAssetSchema } from "@/lib/validations/asset";
import type { Asset } from "@/types";

interface RouteParams {
  params: {
    householdId: string;
    assetId: string;
  };
}

/**
 * GET: 자산 상세 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { householdId, assetId } = params;

    const docRef = doc(db, `households/${householdId}/assets`, assetId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "자산을 찾을 수 없습니다" },
        },
        { status: 404 }
      );
    }

    const asset: Asset = {
      id: docSnap.id,
      ...docSnap.data(),
    } as Asset;

    return NextResponse.json({ success: true, data: asset });
  } catch (error) {
    console.error("[API] GET asset 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "자산 조회에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT: 자산 수정 (낙관적 잠금)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { householdId, assetId } = params;
    const body = await request.json();

    // 입력 검증
    const parseResult = updateAssetSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              parseResult.error.errors[0]?.message ?? "입력값이 올바르지 않습니다",
          },
        },
        { status: 400 }
      );
    }

    const input = parseResult.data;
    const docRef = doc(db, `households/${householdId}/assets`, assetId);

    // Firestore 트랜잭션으로 낙관적 잠금 처리
    let updatedAsset: Asset | null = null;

    try {
      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(docRef);

        if (!docSnap.exists()) {
          throw new Error("NOT_FOUND");
        }

        const currentData = docSnap.data();
        const currentVersion = currentData.version as number;

        // 버전 충돌 체크
        if (currentVersion !== input.version) {
          throw new Error("CONFLICT");
        }

        const now = Timestamp.now();
        const updateData: Partial<Asset> = {
          updatedAt: now,
          version: currentVersion + 1,
        };

        // 변경된 필드만 업데이트
        if (input.assetName !== undefined) updateData.assetName = input.assetName;
        if (input.category !== undefined) updateData.category = input.category;
        if (input.amount !== undefined) updateData.amount = input.amount;
        if (input.currency !== undefined) updateData.currency = input.currency;
        if (input.description !== undefined)
          updateData.description = input.description;
        if (input.institution !== undefined)
          updateData.institution = input.institution;
        if (input.accountNumberLast4 !== undefined)
          updateData.accountNumberLast4 = input.accountNumberLast4;
        if (input.interestRate !== undefined)
          updateData.interestRate = input.interestRate;
        if (input.maturityDate !== undefined) {
          updateData.maturityDate = input.maturityDate
            ? Timestamp.fromDate(new Date(input.maturityDate))
            : undefined;
        }

        transaction.update(docRef, updateData);

        updatedAsset = {
          id: assetId,
          ...currentData,
          ...updateData,
        } as Asset;
      });
    } catch (txError: any) {
      if (txError.message === "NOT_FOUND") {
        return NextResponse.json(
          {
            success: false,
            error: { code: "NOT_FOUND", message: "자산을 찾을 수 없습니다" },
          },
          { status: 404 }
        );
      }

      if (txError.message === "CONFLICT") {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "CONFLICT",
              message:
                "다른 기기에서 수정되었습니다. 새로고침 후 다시 시도해주세요.",
            },
          },
          { status: 409 }
        );
      }

      throw txError;
    }

    return NextResponse.json({ success: true, data: updatedAsset });
  } catch (error) {
    console.error("[API] PUT asset 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "자산 수정에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE: 자산 삭제 (soft delete - isActive = false)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { householdId, assetId } = params;
    const { searchParams } = new URL(request.url);
    const version = searchParams.get("version");

    const docRef = doc(db, `households/${householdId}/assets`, assetId);

    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "자산을 찾을 수 없습니다" },
        },
        { status: 404 }
      );
    }

    // 낙관적 잠금 체크
    if (version) {
      const currentVersion = docSnap.data().version as number;
      if (currentVersion !== Number(version)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "CONFLICT",
              message:
                "다른 기기에서 수정되었습니다. 새로고침 후 다시 시도해주세요.",
            },
          },
          { status: 409 }
        );
      }
    }

    // Soft delete
    const now = Timestamp.now();
    await updateDoc(docRef, {
      isActive: false,
      updatedAt: now,
      version: (docSnap.data().version as number) + 1,
    });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("[API] DELETE asset 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "자산 삭제에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}
