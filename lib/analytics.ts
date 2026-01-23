/**
 * 통계 및 분석 유틸리티
 *
 * 월간/연간 통계 계산, 카테고리별 분석, 자산 추이 등을 처리합니다.
 */

import { getLocalDB, type LocalTransaction } from "./db/indexedDB";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from "./validations/transaction";
import { ASSET_CATEGORIES, type AssetCategoryType } from "./validations/asset";

// =====================================================
// 타입 정의
// =====================================================

export interface MonthlyStats {
  month: string; // "2024-01" 형식
  income: number;
  expense: number;
  savings: number;
  savingsRate: number; // 저축률 (%)
  transactionCount: number;
  categories: CategoryStats[];
}

export interface CategoryStats {
  categoryId: string;
  categoryName: string;
  color: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface TrendData {
  month: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  income: number;
  expense: number;
}

export interface UserStats {
  userId: string;
  userName: string;
  totalExpense: number;
  percentage: number;
  transactionCount: number;
  topCategory?: {
    categoryId: string;
    categoryName: string;
    amount: number;
  };
}

export interface AssetCategoryStats {
  category: AssetCategoryType;
  label: string;
  color: string;
  amount: number;
  percentage: number;
  count: number;
}

// =====================================================
// 월간 통계 계산
// =====================================================

export async function calculateMonthlyStats(
  householdId: string,
  year: number,
  month: number
): Promise<MonthlyStats> {
  const localDB = getLocalDB();

  // 해당 월의 시작/끝 타임스탬프
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();

  // 거래 조회
  const transactions = await localDB.transactions
    .where("householdId")
    .equals(householdId)
    .and((t) => t.date >= startTime && t.date <= endTime)
    .toArray();

  // 수입/지출 계산
  let income = 0;
  let expense = 0;
  const categoryExpenses: Record<string, { amount: number; count: number }> = {};

  transactions.forEach((t) => {
    if (t.type === "income") {
      income += t.amount;
    } else {
      expense += t.amount;
      // 카테고리별 집계
      const catId = t.categoryId;
      if (!categoryExpenses[catId]) {
        categoryExpenses[catId] = { amount: 0, count: 0 };
      }
      const catData = categoryExpenses[catId];
      catData.amount += t.amount;
      catData.count += 1;
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

  return {
    month: monthStr,
    income,
    expense,
    savings,
    savingsRate,
    transactionCount: transactions.length,
    categories,
  };
}

// =====================================================
// 카테고리별 상세 통계
// =====================================================

export async function calculateCategoryStats(
  householdId: string,
  year: number,
  month: number,
  type: "income" | "expense" = "expense"
): Promise<CategoryStats[]> {
  const localDB = getLocalDB();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();

  const transactions = await localDB.transactions
    .where("householdId")
    .equals(householdId)
    .and((t) => t.date >= startTime && t.date <= endTime && t.type === type)
    .toArray();

  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  const categoryData: Record<string, { amount: number; count: number }> = {};

  transactions.forEach((t) => {
    const catId = t.categoryId;
    if (!categoryData[catId]) {
      categoryData[catId] = { amount: 0, count: 0 };
    }
    const catData = categoryData[catId];
    catData.amount += t.amount;
    catData.count += 1;
  });

  const defaultCategories =
    type === "income" ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;

  return Object.entries(categoryData)
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
}

// =====================================================
// 자산 추이 계산
// =====================================================

export async function calculateAssetsTrend(
  householdId: string,
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number
): Promise<TrendData[]> {
  const localDB = getLocalDB();
  const result: TrendData[] = [];

  let currentYear = startYear;
  let currentMonth = startMonth;

  while (
    currentYear < endYear ||
    (currentYear === endYear && currentMonth <= endMonth)
  ) {
    const monthStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

    // 해당 월 말 기준 자산 조회 (간소화: 현재 자산 사용)
    const assets = await localDB.assets
      .where("householdId")
      .equals(householdId)
      .and((a) => a.isActive)
      .toArray();

    let totalAssets = 0;
    let totalLiabilities = 0;

    assets.forEach((asset) => {
      if (asset.category === "loan") {
        totalLiabilities += Math.abs(asset.amount);
      } else {
        totalAssets += asset.amount;
      }
    });

    // 해당 월 수입/지출
    const monthStart = new Date(currentYear, currentMonth - 1, 1).getTime();
    const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999).getTime();

    const transactions = await localDB.transactions
      .where("householdId")
      .equals(householdId)
      .and((t) => t.date >= monthStart && t.date <= monthEnd)
      .toArray();

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
    currentMonth += 1;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear += 1;
    }
  }

  return result;
}

// =====================================================
// 사용자별 지출 비교
// =====================================================

export async function calculateUserComparison(
  householdId: string,
  year: number,
  month: number
): Promise<UserStats[]> {
  const localDB = getLocalDB();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();

  const transactions = await localDB.transactions
    .where("householdId")
    .equals(householdId)
    .and((t) => t.date >= startTime && t.date <= endTime && t.type === "expense")
    .toArray();

  const totalExpense = transactions.reduce((sum, t) => sum + t.amount, 0);
  const userExpenses: Record<
    string,
    {
      name: string;
      total: number;
      count: number;
      categories: Record<string, number>;
    }
  > = {};

  transactions.forEach((t) => {
    const userId = t.createdBy;
    if (!userExpenses[userId]) {
      userExpenses[userId] = {
        name: t.createdByName ?? "Unknown",
        total: 0,
        count: 0,
        categories: {},
      };
    }
    const userData = userExpenses[userId];
    userData.total += t.amount;
    userData.count += 1;

    // 카테고리별 집계
    const catId = t.categoryId;
    if (!userData.categories[catId]) {
      userData.categories[catId] = 0;
    }
    userData.categories[catId] += t.amount;
  });

  return Object.entries(userExpenses)
    .map(([userId, data]) => {
      // 최다 지출 카테고리 찾기
      let topCategory: UserStats["topCategory"] = undefined;
      let maxAmount = 0;

      Object.entries(data.categories).forEach(([categoryId, amount]) => {
        if (amount > maxAmount) {
          maxAmount = amount;
          const categoryInfo = DEFAULT_EXPENSE_CATEGORIES.find(
            (c) => c.id === categoryId
          );
          topCategory = {
            categoryId,
            categoryName: categoryInfo?.name ?? categoryId,
            amount,
          };
        }
      });

      return {
        userId,
        userName: data.name,
        totalExpense: data.total,
        percentage:
          totalExpense > 0 ? Math.round((data.total / totalExpense) * 100) : 0,
        transactionCount: data.count,
        topCategory,
      };
    })
    .sort((a, b) => b.totalExpense - a.totalExpense);
}

// =====================================================
// 자산 카테고리별 통계
// =====================================================

export async function calculateAssetCategoryStats(
  householdId: string
): Promise<{
  total: number;
  assets: number;
  liabilities: number;
  categories: AssetCategoryStats[];
}> {
  const localDB = getLocalDB();

  const assets = await localDB.assets
    .where("householdId")
    .equals(householdId)
    .and((a) => a.isActive)
    .toArray();

  let totalAssets = 0;
  let totalLiabilities = 0;
  const categoryData: Record<
    string,
    { amount: number; count: number }
  > = {};

  assets.forEach((asset) => {
    const isLoan = asset.category === "loan";
    const amount = Math.abs(asset.amount);

    if (isLoan) {
      totalLiabilities += amount;
    } else {
      totalAssets += amount;
    }

    const catKey = asset.category;
    if (!categoryData[catKey]) {
      categoryData[catKey] = { amount: 0, count: 0 };
    }
    const catData = categoryData[catKey];
    catData.amount += amount;
    catData.count += 1;
  });

  const totalPositive = totalAssets; // 부채 제외한 자산 합계

  const categories: AssetCategoryStats[] = Object.entries(categoryData)
    .map(([category, data]) => {
      const categoryInfo = ASSET_CATEGORIES[category as AssetCategoryType];
      const isLoan = category === "loan";
      return {
        category: category as AssetCategoryType,
        label: categoryInfo?.label ?? category,
        color: categoryInfo?.color ?? "#6b7280",
        amount: data.amount,
        percentage: isLoan
          ? 0
          : totalPositive > 0
            ? Math.round((data.amount / totalPositive) * 100)
            : 0,
        count: data.count,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return {
    total: totalAssets - totalLiabilities,
    assets: totalAssets,
    liabilities: totalLiabilities,
    categories,
  };
}

// =====================================================
// 최근 거래 조회
// =====================================================

export async function getRecentTransactions(
  householdId: string,
  limit: number = 5
): Promise<LocalTransaction[]> {
  const localDB = getLocalDB();

  const transactions = await localDB.transactions
    .where("householdId")
    .equals(householdId)
    .reverse()
    .sortBy("date");

  return transactions.slice(0, limit);
}

// =====================================================
// 연간 통계 계산
// =====================================================

export async function calculateYearlyStats(
  householdId: string,
  year: number
): Promise<{
  totalIncome: number;
  totalExpense: number;
  totalSavings: number;
  avgSavingsRate: number;
  monthlyData: MonthlyStats[];
}> {
  const monthlyData: MonthlyStats[] = [];
  let totalIncome = 0;
  let totalExpense = 0;

  for (let month = 1; month <= 12; month++) {
    const stats = await calculateMonthlyStats(householdId, year, month);
    monthlyData.push(stats);
    totalIncome += stats.income;
    totalExpense += stats.expense;
  }

  const totalSavings = totalIncome - totalExpense;
  const avgSavingsRate =
    totalIncome > 0 ? Math.round((totalSavings / totalIncome) * 100) : 0;

  return {
    totalIncome,
    totalExpense,
    totalSavings,
    avgSavingsRate,
    monthlyData,
  };
}

// =====================================================
// 유틸리티 함수
// =====================================================

/**
 * 월 문자열을 파싱
 */
export function parseMonthString(monthStr: string): { year: number; month: number } {
  const [year, month] = monthStr.split("-").map(Number);
  return { year: year ?? 0, month: month ?? 0 };
}

/**
 * 이전/다음 월 계산
 */
export function getAdjacentMonth(
  year: number,
  month: number,
  direction: "prev" | "next"
): { year: number; month: number } {
  if (direction === "prev") {
    if (month === 1) {
      return { year: year - 1, month: 12 };
    }
    return { year, month: month - 1 };
  } else {
    if (month === 12) {
      return { year: year + 1, month: 1 };
    }
    return { year, month: month + 1 };
  }
}

/**
 * 월 레이블 포맷팅
 */
export function formatMonthLabel(year: number, month: number): string {
  return `${year}년 ${month}월`;
}
