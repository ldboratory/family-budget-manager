/**
 * 개별 거래 API
 *
 * GET    /api/households/[householdId]/transactions/[transactionId] - 거래 상세 조회
 * PUT    /api/households/[householdId]/transactions/[transactionId] - 거래 수정
 * DELETE /api/households/[householdId]/transactions/[transactionId] - 거래 삭제
 */

import { NextRequest, NextResponse } from "next/server";
import {
  doc,
  getDoc,
  deleteDoc,
  Timestamp,
  runTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateTransactionSchema } from "@/lib/validations/transaction";
import type { Transaction } from "@/types";

interface RouteParams {
  params: {
    householdId: string;
    transactionId: string;
  };
}

/**
 * GET: 거래 상세 조회
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { householdId, transactionId } = params;

    const docRef = doc(
      db,
      `households/${householdId}/transactions`,
      transactionId
    );
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "거래를 찾을 수 없습니다" },
        },
        { status: 404 }
      );
    }

    const transaction: Transaction = {
      id: docSnap.id,
      ...docSnap.data(),
    } as Transaction;

    return NextResponse.json({ success: true, data: transaction });
  } catch (error) {
    console.error("[API] GET transaction 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "거래 조회에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT: 거래 수정 (낙관적 잠금)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { householdId, transactionId } = params;
    const body = await request.json();

    // 입력 검증
    const parseResult = updateTransactionSchema.safeParse(body);
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
    const docRef = doc(
      db,
      `households/${householdId}/transactions`,
      transactionId
    );

    // Firestore 트랜잭션으로 낙관적 잠금 처리
    let updatedTransaction: Transaction | null = null;

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
        const updateData: Partial<Transaction> = {
          updatedAt: now,
          version: currentVersion + 1,
        };

        // 변경된 필드만 업데이트
        if (input.type !== undefined) updateData.type = input.type;
        if (input.amount !== undefined) updateData.amount = input.amount;
        if (input.categoryId !== undefined)
          updateData.categoryId = input.categoryId;
        if (input.categoryName !== undefined)
          updateData.categoryName = input.categoryName;
        if (input.description !== undefined)
          updateData.description = input.description;
        if (input.date !== undefined)
          updateData.date = Timestamp.fromDate(new Date(input.date));
        if (input.paymentMethod !== undefined)
          updateData.paymentMethod = input.paymentMethod;
        if (input.tags !== undefined) updateData.tags = input.tags;
        if (input.merchant !== undefined) updateData.merchant = input.merchant;
        if (input.location !== undefined) updateData.location = input.location;

        transaction.update(docRef, updateData);

        updatedTransaction = {
          id: transactionId,
          ...currentData,
          ...updateData,
        } as Transaction;
      });
    } catch (txError: any) {
      if (txError.message === "NOT_FOUND") {
        return NextResponse.json(
          {
            success: false,
            error: { code: "NOT_FOUND", message: "거래를 찾을 수 없습니다" },
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

    return NextResponse.json({ success: true, data: updatedTransaction });
  } catch (error) {
    console.error("[API] PUT transaction 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "거래 수정에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE: 거래 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { householdId, transactionId } = params;
    const { searchParams } = new URL(request.url);
    const version = searchParams.get("version");

    const docRef = doc(
      db,
      `households/${householdId}/transactions`,
      transactionId
    );

    // 낙관적 잠금 체크 (version 파라미터가 있는 경우)
    if (version) {
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "NOT_FOUND", message: "거래를 찾을 수 없습니다" },
          },
          { status: 404 }
        );
      }

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

    await deleteDoc(docRef);

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("[API] DELETE transaction 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "거래 삭제에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}
