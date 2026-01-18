/**
 * Family Budget Manager - 전역 타입 정의
 *
 * 이 파일은 앱 전체에서 사용되는 모든 타입을 정의합니다.
 * Firestore 문서 구조와 1:1 대응되도록 설계되었습니다.
 */

import type { Timestamp } from "firebase/firestore";

// =====================================================
// 사용자 관련 타입
// =====================================================

/**
 * Firebase Auth 사용자 정보
 */
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

/**
 * 가족 구성원 역할
 */
export type FamilyRole = "admin" | "member";

/**
 * 가족 그룹 멤버
 */
export interface FamilyMember {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  role: FamilyRole;
  joinedAt: Timestamp;
}

/**
 * 가족 그룹 (Firestore: /families/{familyId})
 */
export interface Family {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  members: FamilyMember[];
  inviteCode: string;
}

// =====================================================
// 거래 관련 타입
// =====================================================

/**
 * 거래 유형: 수입 또는 지출
 */
export type TransactionType = "income" | "expense";

/**
 * 지출 카테고리
 */
export type ExpenseCategory =
  | "food" // 식비
  | "transport" // 교통
  | "housing" // 주거
  | "utilities" // 공과금
  | "healthcare" // 의료
  | "education" // 교육
  | "entertainment" // 여가/오락
  | "shopping" // 쇼핑
  | "savings" // 저축
  | "other"; // 기타

/**
 * 수입 카테고리
 */
export type IncomeCategory =
  | "salary" // 급여
  | "bonus" // 상여금
  | "investment" // 투자수익
  | "allowance" // 용돈
  | "other"; // 기타

/**
 * 거래 카테고리 통합
 */
export type Category = ExpenseCategory | IncomeCategory;

/**
 * 개별 거래 내역 (Firestore: /families/{familyId}/transactions/{transactionId})
 */
export interface Transaction {
  id: string;
  type: TransactionType;
  category: Category;
  amount: number;
  description: string;
  date: Timestamp;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** 첨부 영수증 이미지 URL (선택) */
  receiptUrl?: string;
  /** 메모 (선택) */
  memo?: string;
}

/**
 * 거래 생성 시 입력 데이터 (id, createdAt 등 자동 생성 필드 제외)
 */
export type TransactionInput = Omit<
  Transaction,
  "id" | "createdAt" | "updatedAt"
>;

// =====================================================
// 예산 관련 타입
// =====================================================

/**
 * 월별 카테고리 예산 설정
 */
export interface CategoryBudget {
  category: ExpenseCategory;
  limit: number;
  spent: number;
}

/**
 * 월별 예산 (Firestore: /families/{familyId}/budgets/{YYYY-MM})
 */
export interface MonthlyBudget {
  id: string; // YYYY-MM 형식
  familyId: string;
  year: number;
  month: number;
  totalLimit: number;
  totalSpent: number;
  categories: CategoryBudget[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// =====================================================
// 통계 관련 타입
// =====================================================

/**
 * 일별 합계 데이터 (차트용)
 */
export interface DailySummary {
  date: string; // YYYY-MM-DD
  income: number;
  expense: number;
}

/**
 * 월별 합계 데이터
 */
export interface MonthlySummary {
  month: string; // YYYY-MM
  income: number;
  expense: number;
  balance: number;
}

/**
 * 카테고리별 지출 현황
 */
export interface CategorySummary {
  category: Category;
  amount: number;
  percentage: number;
  count: number;
}

// =====================================================
// UI 상태 관련 타입
// =====================================================

/**
 * 날짜 필터 범위
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * 거래 필터 옵션
 */
export interface TransactionFilter {
  type?: TransactionType;
  category?: Category;
  dateRange?: DateRange;
  searchQuery?: string;
  sortBy?: "date" | "amount";
  sortOrder?: "asc" | "desc";
}

/**
 * 페이지네이션 정보
 */
export interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

// =====================================================
// API 응답 타입
// =====================================================

/**
 * API 응답 래퍼 (성공)
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * API 응답 래퍼 (실패)
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

/**
 * API 응답 통합 타입
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// =====================================================
// 오프라인 지원 (Dexie.js) 타입
// =====================================================

/**
 * 오프라인 큐에 저장될 작업
 */
export interface PendingOperation {
  id?: number;
  type: "create" | "update" | "delete";
  collection: string;
  documentId: string;
  data?: Record<string, unknown>;
  timestamp: number;
}
