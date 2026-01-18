/**
 * Family Budget Manager - 전역 타입 정의
 *
 * 이 파일은 앱 전체에서 사용되는 모든 타입을 정의합니다.
 * Firestore 문서 구조와 1:1 대응되도록 설계되었습니다.
 *
 * 날짜 형식: ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ) 또는 Firebase Timestamp
 * 낙관적 잠금: version 필드를 통해 동시성 충돌 감지
 */

import type { Timestamp } from "firebase/firestore";

// =====================================================
// 공통 타입
// =====================================================

/**
 * 통화 코드 (ISO 4217)
 */
export type CurrencyCode = "KRW" | "USD" | "EUR" | "JPY";

/**
 * 테마 설정
 */
export type ThemeMode = "light" | "dark" | "system";

/**
 * 동기화 상태
 * - synced: 서버와 동기화 완료
 * - pending: 로컬 변경사항 동기화 대기 중
 * - conflict: 서버와 충돌 발생 (수동 해결 필요)
 */
export type SyncStatus = "synced" | "pending" | "conflict";

/**
 * 낙관적 잠금을 위한 버전 관리 기본 인터페이스
 * Firestore 문서의 동시성 충돌을 감지하기 위해 사용
 */
interface Versioned {
  /** 낙관적 잠금용 버전 (업데이트 시 +1 증가) */
  version: number;
  /** 마지막 수정 시각 */
  updatedAt: Timestamp;
}

/**
 * Firestore 문서 기본 필드
 */
interface FirestoreDocument extends Versioned {
  /** 문서 ID (Firestore 자동 생성 또는 커스텀) */
  id: string;
  /** 생성 시각 */
  createdAt: Timestamp;
}

// =====================================================
// 1. User (사용자)
// Firestore: /users/{uid}
// =====================================================

/**
 * 사용자 역할
 * - owner: 가계부 소유자 (모든 권한)
 * - admin: 관리자 (멤버 초대, 설정 변경 가능)
 * - member: 일반 멤버 (거래 입력, 조회만 가능)
 * - viewer: 조회 전용
 */
export type UserRole = "owner" | "admin" | "member" | "viewer";

/**
 * 사용자 정보
 *
 * @description Firebase Auth 사용자와 연동되는 추가 프로필 정보
 * @firestore /users/{uid}
 */
export interface User extends FirestoreDocument {
  /** Firebase Auth UID (필수) */
  uid: string;
  /** 이메일 주소 (필수, Firebase Auth에서 가져옴) */
  email: string;
  /** 표시 이름 (필수) */
  displayName: string;
  /** 가계부 내 역할 (필수) */
  role: UserRole;
  /** 프로필 이미지 URL (선택, Google/카카오 OAuth에서 가져옴) */
  avatar?: string;
  /** 기본 통화 설정 (필수, 기본값: KRW) */
  currency: CurrencyCode;
  /** 소속 가계부 ID 목록 (선택) */
  householdIds?: string[];
  /** 마지막 로그인 시각 (선택) */
  lastLoginAt?: Timestamp;
}

/**
 * 사용자 생성 입력 타입
 */
export type UserCreateInput = Omit<User, "id" | "createdAt" | "updatedAt" | "version">;

/**
 * 사용자 수정 입력 타입
 */
export type UserUpdateInput = Partial<Omit<User, "id" | "uid" | "createdAt">>;

// =====================================================
// 2. Household (가계부/가족 그룹)
// Firestore: /households/{householdId}
// =====================================================

/**
 * 가계부 멤버 정보 (임베디드)
 */
export interface HouseholdMember {
  /** 사용자 UID (필수) */
  uid: string;
  /** 표시 이름 (필수) */
  displayName: string;
  /** 이메일 (필수) */
  email: string;
  /** 프로필 이미지 URL (선택) */
  avatar?: string;
  /** 멤버 역할 (필수) */
  role: UserRole;
  /** 가입 일시 (필수) */
  joinedAt: Timestamp;
}

/**
 * 가계부 (가족 그룹)
 *
 * @description 여러 사용자가 공유하는 가계부 단위
 * @firestore /households/{householdId}
 */
export interface Household extends FirestoreDocument {
  /** 가계부 이름 (필수, 예: "우리 가족 가계부") */
  name: string;
  /** 가계부 설명 (선택) */
  description?: string;
  /** 멤버 목록 (필수, 최소 1명) */
  members: HouseholdMember[];
  /** 기본 통화 (필수) */
  currency: CurrencyCode;
  /** 생성자 UID (필수) */
  createdBy: string;
  /** 초대 코드 (필수, 새 멤버 초대용) */
  inviteCode: string;
  /** 초대 코드 만료 시각 (선택) */
  inviteCodeExpiresAt?: Timestamp;
}

/**
 * 가계부 생성 입력 타입
 */
export type HouseholdCreateInput = Pick<Household, "name" | "currency"> & {
  description?: string;
};

/**
 * 가계부 수정 입력 타입
 */
export type HouseholdUpdateInput = Partial<Pick<Household, "name" | "description" | "currency">>;

// =====================================================
// 3. Category (카테고리)
// Firestore: /households/{householdId}/categories/{categoryId}
// =====================================================

/**
 * 카테고리 유형
 */
export type CategoryType = "income" | "expense";

/**
 * 카테고리 아이콘 (Lucide 아이콘 이름)
 */
export type CategoryIcon =
  | "utensils" // 식비
  | "car" // 교통
  | "home" // 주거
  | "zap" // 공과금
  | "heart-pulse" // 의료
  | "graduation-cap" // 교육
  | "gamepad-2" // 여가
  | "shopping-bag" // 쇼핑
  | "piggy-bank" // 저축
  | "briefcase" // 급여
  | "gift" // 상여금
  | "trending-up" // 투자
  | "wallet" // 용돈
  | "more-horizontal"; // 기타

/**
 * 카테고리
 *
 * @description 수입/지출 분류를 위한 카테고리
 * @firestore /households/{householdId}/categories/{categoryId}
 */
export interface Category extends FirestoreDocument {
  /** 카테고리 이름 (필수, 예: "식비", "급여") */
  name: string;
  /** 카테고리 유형 (필수) */
  type: CategoryType;
  /** 아이콘 이름 (필수, Lucide 아이콘) */
  icon: CategoryIcon;
  /** 색상 코드 (필수, HEX 형식, 예: "#FF5733") */
  color: string;
  /** 정렬 순서 (필수, 낮을수록 먼저 표시) */
  sortOrder: number;
  /** 시스템 기본 카테고리 여부 (필수, 삭제 불가) */
  isSystem: boolean;
  /** 활성화 여부 (필수, false면 선택 목록에서 숨김) */
  isActive: boolean;
}

/**
 * 카테고리 생성 입력 타입
 */
export type CategoryCreateInput = Pick<
  Category,
  "name" | "type" | "icon" | "color"
> & {
  sortOrder?: number;
};

/**
 * 기본 지출 카테고리 ID (시스템 생성)
 */
export type DefaultExpenseCategory =
  | "food"
  | "transport"
  | "housing"
  | "utilities"
  | "healthcare"
  | "education"
  | "entertainment"
  | "shopping"
  | "savings"
  | "other-expense";

/**
 * 기본 수입 카테고리 ID (시스템 생성)
 */
export type DefaultIncomeCategory =
  | "salary"
  | "bonus"
  | "investment"
  | "allowance"
  | "other-income";

// =====================================================
// 4. Transaction (거래 내역)
// Firestore: /households/{householdId}/transactions/{transactionId}
// =====================================================

/**
 * 거래 유형
 */
export type TransactionType = "income" | "expense";

/**
 * 결제 수단
 */
export type PaymentMethod =
  | "cash" // 현금
  | "debit-card" // 체크카드
  | "credit-card" // 신용카드
  | "bank-transfer" // 계좌이체
  | "mobile-pay" // 간편결제 (카카오페이, 네이버페이 등)
  | "other"; // 기타

/**
 * 거래 내역
 *
 * @description 개별 수입/지출 기록
 * @firestore /households/{householdId}/transactions/{transactionId}
 */
export interface Transaction extends FirestoreDocument {
  /** 거래 유형 (필수) */
  type: TransactionType;
  /** 금액 (필수, 항상 양수, 원 단위) */
  amount: number;
  /** 카테고리 ID (필수, Category 문서 참조) */
  categoryId: string;
  /** 카테고리 이름 (필수, 비정규화 - 조회 성능용) */
  categoryName: string;
  /** 거래 설명/메모 (필수, 예: "점심 식사", "월급") */
  description: string;
  /** 거래 일시 (필수) */
  date: Timestamp;
  /** 결제 수단 (필수) */
  paymentMethod: PaymentMethod;
  /** 태그 목록 (선택, 추가 분류용) */
  tags?: string[];
  /** 영수증 이미지 URL (선택) */
  receiptUrl?: string;
  /** 거래처/상호명 (선택) */
  merchant?: string;
  /** 위치 정보 (선택) */
  location?: string;
  /** 반복 거래 ID (선택, RecurringTransaction 참조) */
  recurringId?: string;
  /** 작성자 UID (필수) */
  createdBy: string;
  /** 작성자 이름 (필수, 비정규화) */
  createdByName: string;
  /** 동기화 상태 (필수) */
  syncStatus: SyncStatus;
}

/**
 * 거래 생성 입력 타입
 */
export type TransactionCreateInput = Pick<
  Transaction,
  | "type"
  | "amount"
  | "categoryId"
  | "description"
  | "date"
  | "paymentMethod"
> & {
  tags?: string[];
  receiptUrl?: string;
  merchant?: string;
  location?: string;
};

/**
 * 거래 수정 입력 타입
 */
export type TransactionUpdateInput = Partial<TransactionCreateInput> & {
  /** 낙관적 잠금용 현재 버전 (필수) */
  version: number;
};

// =====================================================
// 5. Asset (자산)
// Firestore: /households/{householdId}/assets/{assetId}
// =====================================================

/**
 * 자산 카테고리
 */
export type AssetCategory =
  | "cash" // 현금
  | "bank-account" // 은행 계좌
  | "savings" // 적금/예금
  | "investment" // 투자 (주식, 펀드 등)
  | "real-estate" // 부동산
  | "vehicle" // 차량
  | "insurance" // 보험
  | "pension" // 연금
  | "loan" // 대출 (부채, 음수 자산)
  | "other"; // 기타

/**
 * 자산
 *
 * @description 가계부의 자산/부채 항목
 * @firestore /households/{householdId}/assets/{assetId}
 */
export interface Asset extends FirestoreDocument {
  /** 자산명 (필수, 예: "신한은행 급여통장") */
  assetName: string;
  /** 자산 카테고리 (필수) */
  category: AssetCategory;
  /** 현재 금액 (필수, 부채는 음수) */
  amount: number;
  /** 통화 (필수) */
  currency: CurrencyCode;
  /** 설명/메모 (선택) */
  description?: string;
  /** 금융기관명 (선택) */
  institution?: string;
  /** 계좌번호 마지막 4자리 (선택, 마스킹) */
  accountNumberLast4?: string;
  /** 이자율 (선택, 예금/대출용, 퍼센트) */
  interestRate?: number;
  /** 만기일 (선택) */
  maturityDate?: Timestamp;
  /** 활성화 여부 (필수) */
  isActive: boolean;
  /** 정렬 순서 (필수) */
  sortOrder: number;
  /** 동기화 상태 (필수) */
  syncStatus: SyncStatus;
}

/**
 * 자산 생성 입력 타입
 */
export type AssetCreateInput = Pick<
  Asset,
  "assetName" | "category" | "amount" | "currency"
> & {
  description?: string;
  institution?: string;
  accountNumberLast4?: string;
  interestRate?: number;
  maturityDate?: Timestamp;
};

/**
 * 자산 수정 입력 타입
 */
export type AssetUpdateInput = Partial<AssetCreateInput> & {
  /** 낙관적 잠금용 현재 버전 (필수) */
  version: number;
};

// =====================================================
// 6. Preferences (사용자 설정)
// Firestore: /users/{uid}/preferences/settings
// =====================================================

/**
 * 알림 설정
 */
export interface NotificationSettings {
  /** 일일 지출 알림 (필수) */
  dailyReminder: boolean;
  /** 예산 초과 알림 (필수) */
  budgetAlert: boolean;
  /** 예산 경고 임계값 (필수, 퍼센트, 예: 80) */
  budgetWarningThreshold: number;
  /** 월간 리포트 알림 (필수) */
  monthlyReport: boolean;
  /** 가족 활동 알림 (필수) */
  familyActivity: boolean;
}

/**
 * 사용자 환경 설정
 *
 * @description 사용자별 앱 설정
 * @firestore /users/{uid}/preferences/settings
 */
export interface Preferences {
  /** 사용자 UID (필수) */
  userId: string;
  /** 테마 설정 (필수) */
  theme: ThemeMode;
  /** 기본 통화 (필수) */
  currency: CurrencyCode;
  /** 알림 설정 (필수) */
  notifications: NotificationSettings;
  /** 언어 설정 (필수) */
  language: "ko" | "en";
  /** 주 시작 요일 (필수, 0=일요일, 1=월요일) */
  weekStartsOn: 0 | 1;
  /** 기본 결제 수단 (선택) */
  defaultPaymentMethod?: PaymentMethod;
  /** 마지막 수정 시각 (필수) */
  updatedAt: Timestamp;
}

/**
 * 환경 설정 수정 입력 타입
 */
export type PreferencesUpdateInput = Partial<Omit<Preferences, "userId" | "updatedAt">>;

// =====================================================
// 7. Budget (예산)
// Firestore: /households/{householdId}/budgets/{YYYY-MM}
// =====================================================

/**
 * 카테고리별 예산 설정 (임베디드)
 */
export interface CategoryBudget {
  /** 카테고리 ID (필수) */
  categoryId: string;
  /** 카테고리 이름 (필수, 비정규화) */
  categoryName: string;
  /** 예산 한도 (필수) */
  limit: number;
  /** 현재 지출액 (필수, 계산 필드 - 실시간 집계) */
  spent: number;
  /** @derived 남은 예산 = limit - spent */
  /** @derived 사용률(%) = (spent / limit) * 100 */
}

/**
 * 월별 예산
 *
 * @description 월간 예산 계획 및 실적
 * @firestore /households/{householdId}/budgets/{YYYY-MM}
 */
export interface MonthlyBudget extends FirestoreDocument {
  /** 가계부 ID (필수) */
  householdId: string;
  /** 연도 (필수) */
  year: number;
  /** 월 (필수, 1-12) */
  month: number;
  /** 전체 예산 한도 (필수) */
  totalLimit: number;
  /** 전체 지출액 (필수, 계산 필드) */
  totalSpent: number;
  /** 카테고리별 예산 (필수) */
  categories: CategoryBudget[];
  /** @derived 남은 예산 = totalLimit - totalSpent */
  /** @derived 전체 사용률(%) = (totalSpent / totalLimit) * 100 */
}

// =====================================================
// 8. API Response (API 응답)
// =====================================================

/**
 * API 에러 코드
 */
export type ApiErrorCode =
  | "UNAUTHORIZED" // 인증 필요
  | "FORBIDDEN" // 권한 없음
  | "NOT_FOUND" // 리소스 없음
  | "VALIDATION_ERROR" // 유효성 검사 실패
  | "CONFLICT" // 충돌 (낙관적 잠금 실패)
  | "RATE_LIMIT" // 요청 한도 초과
  | "INTERNAL_ERROR"; // 서버 오류

/**
 * API 성공 응답
 */
export interface ApiSuccessResponse<T> {
  /** 성공 여부 (항상 true) */
  success: true;
  /** 응답 데이터 */
  data: T;
  /** 응답 메시지 (선택) */
  message?: string;
}

/**
 * API 에러 응답
 */
export interface ApiErrorResponse {
  /** 성공 여부 (항상 false) */
  success: false;
  /** 에러 정보 */
  error: {
    /** 에러 코드 */
    code: ApiErrorCode;
    /** 에러 메시지 (사용자 표시용) */
    message: string;
    /** 상세 정보 (선택, 디버깅용) */
    details?: Record<string, unknown>;
  };
}

/**
 * API 응답 통합 타입
 * @template T 성공 시 반환되는 데이터 타입
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * 페이지네이션된 API 응답
 */
export interface PaginatedResponse<T> {
  /** 데이터 목록 */
  items: T[];
  /** 전체 아이템 수 */
  totalItems: number;
  /** 전체 페이지 수 */
  totalPages: number;
  /** 현재 페이지 (1부터 시작) */
  currentPage: number;
  /** 페이지당 아이템 수 */
  pageSize: number;
  /** 다음 페이지 존재 여부 */
  hasNextPage: boolean;
  /** 이전 페이지 존재 여부 */
  hasPreviousPage: boolean;
}

// =====================================================
// 9. 오프라인 지원 (Dexie.js)
// =====================================================

/**
 * 오프라인 작업 유형
 */
export type OfflineOperationType = "create" | "update" | "delete";

/**
 * 오프라인 큐 작업
 *
 * @description 오프라인 상태에서 발생한 작업을 저장하여 온라인 시 동기화
 */
export interface PendingOperation {
  /** 로컬 ID (Dexie 자동 생성) */
  id?: number;
  /** 작업 유형 (필수) */
  type: OfflineOperationType;
  /** Firestore 컬렉션 경로 (필수) */
  collection: string;
  /** 문서 ID (필수) */
  documentId: string;
  /** 작업 데이터 (create/update 시 필수) */
  data?: Record<string, unknown>;
  /** 작업 생성 시각 (필수, Unix timestamp) */
  timestamp: number;
  /** 재시도 횟수 (필수) */
  retryCount: number;
  /** 마지막 에러 메시지 (선택) */
  lastError?: string;
}

// =====================================================
// 10. 통계 및 리포트
// =====================================================

/**
 * 일별 요약 (차트용)
 */
export interface DailySummary {
  /** 날짜 (YYYY-MM-DD) */
  date: string;
  /** 수입 합계 */
  income: number;
  /** 지출 합계 */
  expense: number;
  /** @derived 잔액 = income - expense */
}

/**
 * 월별 요약
 */
export interface MonthlySummary {
  /** 월 (YYYY-MM) */
  month: string;
  /** 수입 합계 */
  income: number;
  /** 지출 합계 */
  expense: number;
  /** 잔액 */
  balance: number;
  /** 거래 건수 */
  transactionCount: number;
}

/**
 * 카테고리별 요약
 */
export interface CategorySummary {
  /** 카테고리 ID */
  categoryId: string;
  /** 카테고리 이름 */
  categoryName: string;
  /** 카테고리 색상 */
  color: string;
  /** 총 금액 */
  amount: number;
  /** 비율 (%) */
  percentage: number;
  /** 거래 건수 */
  count: number;
}

// =====================================================
// 11. UI 상태 타입
// =====================================================

/**
 * 날짜 범위 필터
 */
export interface DateRange {
  /** 시작일 */
  startDate: Date;
  /** 종료일 */
  endDate: Date;
}

/**
 * 거래 필터 옵션
 */
export interface TransactionFilter {
  /** 거래 유형 필터 (선택) */
  type?: TransactionType;
  /** 카테고리 ID 필터 (선택) */
  categoryId?: string;
  /** 날짜 범위 (선택) */
  dateRange?: DateRange;
  /** 결제 수단 (선택) */
  paymentMethod?: PaymentMethod;
  /** 검색어 (선택, 설명/메모 검색) */
  searchQuery?: string;
  /** 태그 필터 (선택) */
  tags?: string[];
  /** 최소 금액 (선택) */
  minAmount?: number;
  /** 최대 금액 (선택) */
  maxAmount?: number;
  /** 정렬 기준 (필수) */
  sortBy: "date" | "amount" | "category";
  /** 정렬 순서 (필수) */
  sortOrder: "asc" | "desc";
}

/**
 * 기본 거래 필터 값
 */
export const DEFAULT_TRANSACTION_FILTER: TransactionFilter = {
  sortBy: "date",
  sortOrder: "desc",
};
