/**
 * 카테고리별 통계 API
 *
 * GET /api/households/[householdId]/analytics/categories
 * 쿼리: year, month, type (income | expense)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from "@/lib/validations/transaction";
import type { CategoryStats } from "@/lib/analytics";

interface RouteParams {
  params: {
    householdId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { householdId } = params;
    const { searchParams } = new URL(request.url);

    const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));
    const type = (searchParams.get("type") as "income" | "expense") ?? "expense";

    // 해당 월의 시작/끝
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const collectionRef = collection(db, `households/${householdId}/transactions`);
    const q = query(
      collectionRef,
      where("type", "==", type),
      where("date", ">=", Timestamp.fromDate(startDate)),
      where("date", "<=", Timestamp.fromDate(endDate))
    );

    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // 카테고리별 집계
    const total = transactions.reduce((sum, t: any) => sum + t.amount, 0);
    const categoryData: Record<string, { amount: number; count: number }> = {};

    transactions.forEach((t: any) => {
      const catId = t.categoryId as string;
      if (!categoryData[catId]) {
        categoryData[catId] = { amount: 0, count: 0 };
      }
      const catData = categoryData[catId];
      catData.amount += t.amount;
      catData.count += 1;
    });

    const defaultCategories =
      type === "income" ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;

    const categories: CategoryStats[] = Object.entries(categoryData)
      .map(([categoryId, data]) => {
        const categoryInfo = defaultCategories.find((c) => c.id === categoryId);
        return {
          categoryId,
          categoryName: categoryInfo?.name ?? categoryId,
          color: categoryInfo?.color ?? "#6b7280",
          amount: data.amount,
          percentage: total > 0 ? Math.round((data.amount / total) * 100) : 0,
          transactionCount: data.count,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      success: true,
      data: {
        type,
        total,
        categories,
      },
    });
  } catch (error) {
    console.error("[API] GET category analytics 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "카테고리별 통계 조회에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}
