/**
 * 월간 통계 API
 *
 * GET /api/households/[householdId]/analytics/monthly
 * 쿼리: year, month
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
} from "@/lib/validations/transaction";
import type { MonthlyStats, CategoryStats } from "@/lib/analytics";

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

    // 해당 월의 시작/끝
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const collectionRef = collection(db, `households/${householdId}/transactions`);
    const q = query(
      collectionRef,
      where("date", ">=", Timestamp.fromDate(startDate)),
      where("date", "<=", Timestamp.fromDate(endDate))
    );

    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // 통계 계산
    let income = 0;
    let expense = 0;
    const categoryExpenses: Record<string, { amount: number; count: number }> = {};

    transactions.forEach((t: any) => {
      if (t.type === "income") {
        income += t.amount;
      } else {
        expense += t.amount;
        if (!categoryExpenses[t.categoryId]) {
          categoryExpenses[t.categoryId] = { amount: 0, count: 0 };
        }
        categoryExpenses[t.categoryId].amount += t.amount;
        categoryExpenses[t.categoryId].count += 1;
      }
    });

    const savings = income - expense;
    const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;

    // 카테고리별 통계
    const categories: CategoryStats[] = Object.entries(categoryExpenses)
      .map(([categoryId, data]) => {
        const categoryInfo = DEFAULT_EXPENSE_CATEGORIES.find(
          (c) => c.id === categoryId
        );
        return {
          categoryId,
          categoryName: categoryInfo?.name ?? categoryId,
          color: categoryInfo?.color ?? "#6b7280",
          amount: data.amount,
          percentage: expense > 0 ? Math.round((data.amount / expense) * 100) : 0,
          transactionCount: data.count,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    const monthStr = `${year}-${String(month).padStart(2, "0")}`;

    const stats: MonthlyStats = {
      month: monthStr,
      income,
      expense,
      savings,
      savingsRate,
      transactionCount: transactions.length,
      categories,
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error("[API] GET monthly analytics 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "월간 통계 조회에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}
