/**
 * 거래 목록 / 생성 API
 *
 * GET  /api/households/[householdId]/transactions - 거래 목록 조회
 * POST /api/households/[householdId]/transactions - 거래 생성
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
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  createTransactionSchema,
  transactionFilterSchema,
} from "@/lib/validations/transaction";
import type { Transaction, PaginatedResponse } from "@/types";

interface RouteParams {
  params: {
    householdId: string;
  };
}

/**
 * GET: 거래 목록 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { householdId } = params;
    const { searchParams } = new URL(request.url);

    // 쿼리 파라미터 파싱
    const filterParams = transactionFilterSchema.safeParse({
      type: searchParams.get("type") || undefined,
      categoryId: searchParams.get("categoryId") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      paymentMethod: searchParams.get("paymentMethod") || undefined,
      searchQuery: searchParams.get("searchQuery") || undefined,
      minAmount: searchParams.get("minAmount")
        ? Number(searchParams.get("minAmount"))
        : undefined,
      maxAmount: searchParams.get("maxAmount")
        ? Number(searchParams.get("maxAmount"))
        : undefined,
      page: searchParams.get("page")
        ? Number(searchParams.get("page"))
        : undefined,
      pageSize: searchParams.get("pageSize")
        ? Number(searchParams.get("pageSize"))
        : undefined,
      sortBy: searchParams.get("sortBy") || undefined,
      sortOrder: searchParams.get("sortOrder") || undefined,
    });

    if (!filterParams.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "잘못된 필터 파라미터입니다" },
        },
        { status: 400 }
      );
    }

    const filter = filterParams.data;
    const collectionRef = collection(db, `households/${householdId}/transactions`);

    // Firestore 쿼리 구성
    const constraints: any[] = [];

    if (filter.type) {
      constraints.push(where("type", "==", filter.type));
    }

    if (filter.categoryId) {
      constraints.push(where("categoryId", "==", filter.categoryId));
    }

    if (filter.startDate) {
      constraints.push(
        where("date", ">=", Timestamp.fromDate(new Date(filter.startDate)))
      );
    }

    if (filter.endDate) {
      constraints.push(
        where("date", "<=", Timestamp.fromDate(new Date(filter.endDate)))
      );
    }

    // 정렬
    const sortField = filter.sortBy === "amount" ? "amount" : "date";
    constraints.push(orderBy(sortField, filter.sortOrder));

    // 페이지네이션
    constraints.push(limit(filter.pageSize));

    const q = query(collectionRef, ...constraints);
    const snapshot = await getDocs(q);

    const transactions: Transaction[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Transaction[];

    // 추가 필터링 (Firestore에서 처리하기 어려운 것들)
    let filteredTransactions = transactions;

    if (filter.searchQuery) {
      const searchLower = filter.searchQuery.toLowerCase();
      filteredTransactions = filteredTransactions.filter(
        (t) =>
          t.description.toLowerCase().includes(searchLower) ||
          t.categoryName.toLowerCase().includes(searchLower)
      );
    }

    if (filter.minAmount !== undefined) {
      filteredTransactions = filteredTransactions.filter(
        (t) => t.amount >= filter.minAmount!
      );
    }

    if (filter.maxAmount !== undefined) {
      filteredTransactions = filteredTransactions.filter(
        (t) => t.amount <= filter.maxAmount!
      );
    }

    const response: PaginatedResponse<Transaction> = {
      items: filteredTransactions,
      totalItems: filteredTransactions.length,
      totalPages: 1, // 간소화된 페이지네이션
      currentPage: filter.page,
      pageSize: filter.pageSize,
      hasNextPage: filteredTransactions.length === filter.pageSize,
      hasPreviousPage: filter.page > 1,
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error("[API] GET transactions 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "거래 목록 조회에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}

/**
 * POST: 거래 생성
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { householdId } = params;
    const body = await request.json();

    // 입력 검증
    const parseResult = createTransactionSchema.safeParse(body);
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

    // 사용자 정보 가져오기 (실제로는 인증 미들웨어에서)
    const createdBy = body.createdBy ?? "unknown";
    const createdByName = body.createdByName ?? "Unknown";

    const transaction: Omit<Transaction, "id"> & { id: string } = {
      id,
      type: input.type,
      amount: input.amount,
      categoryId: input.categoryId,
      categoryName: input.categoryName ?? "",
      description: input.description,
      date: Timestamp.fromDate(new Date(input.date)),
      paymentMethod: input.paymentMethod,
      tags: input.tags ?? [],
      merchant: input.merchant,
      location: input.location,
      createdBy,
      createdByName,
      createdAt: now,
      updatedAt: now,
      version: 1,
      syncStatus: "synced",
    };

    // Firestore에 저장
    const docRef = doc(db, `households/${householdId}/transactions`, id);
    await setDoc(docRef, transaction);

    return NextResponse.json(
      { success: true, data: transaction },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] POST transaction 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "거래 생성에 실패했습니다" },
      },
      { status: 500 }
    );
  }
}
