/**
 * 데이터 백업 API
 *
 * GET /api/backup - 전체 데이터 JSON 다운로드
 */

import { NextRequest, NextResponse } from "next/server";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * GET: 전체 데이터 백업 (JSON)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get("householdId");

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" },
        },
        { status: 401 }
      );
    }

    if (!householdId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "householdId가 필요합니다" },
        },
        { status: 400 }
      );
    }

    // 가계부 조회 및 권한 확인
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

    const household = householdSnap.data();

    // 멤버 확인
    const isMember = household.members?.some((m: any) => m.uid === userId);
    if (!isMember) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "접근 권한이 없습니다" },
        },
        { status: 403 }
      );
    }

    // 백업 데이터 수집
    const backupData: Record<string, any> = {
      exportedAt: new Date().toISOString(),
      exportedBy: userId,
      version: "1.0",
      household: {
        id: householdId,
        name: household.name,
        description: household.description,
        currency: household.currency,
        members: household.members,
        createdAt: household.createdAt?.toDate?.()?.toISOString(),
      },
      transactions: [],
      assets: [],
      categories: [],
    };

    // 거래 내역 조회
    const transactionsRef = collection(db, `households/${householdId}/transactions`);
    const transactionsQuery = query(transactionsRef, orderBy("date", "desc"));
    const transactionsSnap = await getDocs(transactionsQuery);

    backupData.transactions = transactionsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type,
        amount: data.amount,
        categoryId: data.categoryId,
        categoryName: data.categoryName,
        description: data.description,
        date: data.date?.toDate?.()?.toISOString(),
        paymentMethod: data.paymentMethod,
        tags: data.tags,
        merchant: data.merchant,
        location: data.location,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        createdAt: data.createdAt?.toDate?.()?.toISOString(),
      };
    });

    // 자산 조회
    const assetsRef = collection(db, `households/${householdId}/assets`);
    const assetsSnap = await getDocs(assetsRef);

    backupData.assets = assetsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        assetName: data.assetName,
        category: data.category,
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        institution: data.institution,
        accountNumberLast4: data.accountNumberLast4,
        interestRate: data.interestRate,
        maturityDate: data.maturityDate?.toDate?.()?.toISOString(),
        isActive: data.isActive,
        createdAt: data.createdAt?.toDate?.()?.toISOString(),
      };
    });

    // 카테고리 조회
    const categoriesRef = collection(db, `households/${householdId}/categories`);
    const categoriesSnap = await getDocs(categoriesRef);

    backupData.categories = categoriesSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        type: data.type,
        icon: data.icon,
        color: data.color,
        sortOrder: data.sortOrder,
        isSystem: data.isSystem,
        isActive: data.isActive,
      };
    });

    // 파일명 생성
    const today = new Date().toISOString().split("T")[0];
    const fileName = `household-backup-${today}.json`;

    // JSON 응답
    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("[API] GET backup 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "백업 생성에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}
