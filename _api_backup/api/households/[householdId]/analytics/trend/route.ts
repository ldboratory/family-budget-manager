/**
 * 자산/수입/지출 추이 API
 *
 * GET /api/households/[householdId]/analytics/trend
 * 쿼리: startYear, startMonth, endYear, endMonth
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
import type { TrendData } from "@/lib/analytics";

interface RouteParams {
  params: {
    householdId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { householdId } = params;
    const { searchParams } = new URL(request.url);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // 기본값: 최근 6개월
    const endYear = parseInt(searchParams.get("endYear") ?? String(currentYear));
    const endMonth = parseInt(searchParams.get("endMonth") ?? String(currentMonth));

    // 6개월 전 계산
    let defaultStartYear = endYear;
    let defaultStartMonth = endMonth - 5;
    if (defaultStartMonth <= 0) {
      defaultStartMonth += 12;
      defaultStartYear -= 1;
    }

    const startYear = parseInt(searchParams.get("startYear") ?? String(defaultStartYear));
    const startMonth = parseInt(searchParams.get("startMonth") ?? String(defaultStartMonth));

    const result: TrendData[] = [];

    let currentIterYear = startYear;
    let currentIterMonth = startMonth;

    // 자산 조회 (현재 기준 - 간소화)
    const assetsRef = collection(db, `households/${householdId}/assets`);
    const assetsQuery = query(assetsRef, where("isActive", "==", true));
    const assetsSnapshot = await getDocs(assetsQuery);

    let totalAssets = 0;
    let totalLiabilities = 0;

    assetsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.category === "loan") {
        totalLiabilities += Math.abs(data.amount);
      } else {
        totalAssets += data.amount;
      }
    });

    while (
      currentIterYear < endYear ||
      (currentIterYear === endYear && currentIterMonth <= endMonth)
    ) {
      const monthStr = `${currentIterYear}-${String(currentIterMonth).padStart(2, "0")}`;

      // 해당 월의 거래 조회
      const monthStart = new Date(currentIterYear, currentIterMonth - 1, 1);
      const monthEnd = new Date(currentIterYear, currentIterMonth, 0, 23, 59, 59, 999);

      const transactionsRef = collection(db, `households/${householdId}/transactions`);
      const txQuery = query(
        transactionsRef,
        where("date", ">=", Timestamp.fromDate(monthStart)),
        where("date", "<=", Timestamp.fromDate(monthEnd))
      );

      const txSnapshot = await getDocs(txQuery);
      const transactions = txSnapshot.docs.map((doc) => doc.data());

      const income = transactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

      const expense = transactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      result.push({
        month: monthStr,
        totalAssets,
        totalLiabilities,
        netWorth: totalAssets - totalLiabilities,
        income,
        expense,
      });

      // 다음 월로 이동
      currentIterMonth += 1;
      if (currentIterMonth > 12) {
        currentIterMonth = 1;
        currentIterYear += 1;
      }
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[API] GET trend analytics 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "추이 데이터 조회에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}
