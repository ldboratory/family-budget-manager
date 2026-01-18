/**
 * Repository 패턴 인터페이스 정의
 *
 * 데이터 접근 계층을 추상화하여 Firebase Firestore와 IndexedDB를
 * 동일한 인터페이스로 사용할 수 있게 합니다.
 *
 * @description
 * - ITransactionRepository: 거래 내역 CRUD
 * - IAssetRepository: 자산 CRUD
 * - ICategoryRepository: 카테고리 (읽기 전용)
 * - IUserRepository: 사용자 (읽기 전용)
 * - IHouseholdRepository: 가계부 관리
 *
 * 구현체:
 * - FirestoreXxxRepository: 온라인 (Firebase)
 * - LocalXxxRepository: 오프라인 (IndexedDB)
 * - SyncedXxxRepository: 하이브리드 (온라인 우선, 오프라인 폴백)
 */

import type {
  Transaction,
  TransactionCreateInput,
  TransactionUpdateInput,
  TransactionFilter,
  Asset,
  AssetCreateInput,
  AssetUpdateInput,
  Category,
  CategoryCreateInput,
  User,
  Household,
  HouseholdCreateInput,
  HouseholdUpdateInput,
  HouseholdMember,
  MonthlyBudget,
  PaginatedResponse,
  ApiResponse,
  SyncStatus,
} from "@/types";

// =====================================================
// 공통 타입
// =====================================================

/**
 * Repository 작업 결과
 * @template T 성공 시 반환 데이터 타입
 */
export type RepositoryResult<T> = ApiResponse<T>;

/**
 * 목록 조회 옵션
 */
export interface ListOptions {
  /** 페이지 번호 (1부터 시작) */
  page?: number;
  /** 페이지당 항목 수 */
  pageSize?: number;
  /** 정렬 필드 */
  sortBy?: string;
  /** 정렬 순서 */
  sortOrder?: "asc" | "desc";
}

/**
 * 날짜 범위 조회 옵션
 */
export interface DateRangeOptions {
  /** 시작 일시 */
  startDate: Date;
  /** 종료 일시 */
  endDate: Date;
}

/**
 * 동기화 결과
 */
export interface SyncResult {
  /** 동기화 성공 여부 */
  success: boolean;
  /** 동기화된 항목 수 */
  syncedCount: number;
  /** 실패한 항목 수 */
  failedCount: number;
  /** 충돌 항목 목록 */
  conflicts: Array<{
    id: string;
    localVersion: number;
    remoteVersion: number;
  }>;
  /** 에러 메시지 (실패 시) */
  error?: string;
}

// =====================================================
// 1. ITransactionRepository (거래 내역)
// =====================================================

/**
 * 거래 내역 Repository 인터페이스
 *
 * @description
 * 수입/지출 거래 내역의 CRUD 및 목록 조회를 담당합니다.
 * 낙관적 잠금(version)을 통해 동시성 충돌을 처리합니다.
 */
export interface ITransactionRepository {
  // ===== 생성 =====

  /**
   * 새 거래 내역 생성
   *
   * @param householdId 가계부 ID
   * @param input 거래 내역 입력 데이터
   * @returns 생성된 거래 내역
   */
  create(
    householdId: string,
    input: TransactionCreateInput
  ): Promise<RepositoryResult<Transaction>>;

  // ===== 조회 =====

  /**
   * 거래 내역 단건 조회
   *
   * @param householdId 가계부 ID
   * @param transactionId 거래 ID
   * @returns 거래 내역 (없으면 null)
   */
  findById(
    householdId: string,
    transactionId: string
  ): Promise<RepositoryResult<Transaction | null>>;

  /**
   * 거래 내역 목록 조회 (필터링 + 페이지네이션)
   *
   * @param householdId 가계부 ID
   * @param filter 필터 옵션
   * @param options 페이지네이션 옵션
   * @returns 페이지네이션된 거래 내역 목록
   */
  findAll(
    householdId: string,
    filter?: TransactionFilter,
    options?: ListOptions
  ): Promise<RepositoryResult<PaginatedResponse<Transaction>>>;

  /**
   * 기간별 거래 내역 조회
   *
   * @param householdId 가계부 ID
   * @param dateRange 날짜 범위
   * @returns 해당 기간의 거래 내역 목록
   */
  findByDateRange(
    householdId: string,
    dateRange: DateRangeOptions
  ): Promise<RepositoryResult<Transaction[]>>;

  /**
   * 카테고리별 거래 내역 조회
   *
   * @param householdId 가계부 ID
   * @param categoryId 카테고리 ID
   * @param options 페이지네이션 옵션
   * @returns 해당 카테고리의 거래 내역
   */
  findByCategory(
    householdId: string,
    categoryId: string,
    options?: ListOptions
  ): Promise<RepositoryResult<PaginatedResponse<Transaction>>>;

  // ===== 수정 =====

  /**
   * 거래 내역 수정
   *
   * @param householdId 가계부 ID
   * @param transactionId 거래 ID
   * @param input 수정할 데이터 (version 필수)
   * @returns 수정된 거래 내역
   * @throws CONFLICT - 버전 충돌 시
   */
  update(
    householdId: string,
    transactionId: string,
    input: TransactionUpdateInput
  ): Promise<RepositoryResult<Transaction>>;

  // ===== 삭제 =====

  /**
   * 거래 내역 삭제
   *
   * @param householdId 가계부 ID
   * @param transactionId 거래 ID
   * @param version 현재 버전 (낙관적 잠금)
   * @returns 삭제 성공 여부
   */
  delete(
    householdId: string,
    transactionId: string,
    version: number
  ): Promise<RepositoryResult<boolean>>;

  /**
   * 여러 거래 내역 일괄 삭제
   *
   * @param householdId 가계부 ID
   * @param transactionIds 삭제할 거래 ID 목록
   * @returns 삭제된 개수
   */
  deleteMany(
    householdId: string,
    transactionIds: string[]
  ): Promise<RepositoryResult<number>>;

  // ===== 동기화 =====

  /**
   * 동기화 대기 중인 거래 내역 조회
   *
   * @param householdId 가계부 ID
   * @returns pending 상태의 거래 내역
   */
  findPending(
    householdId: string
  ): Promise<RepositoryResult<Transaction[]>>;

  /**
   * 동기화 상태 업데이트
   *
   * @param householdId 가계부 ID
   * @param transactionId 거래 ID
   * @param status 새 동기화 상태
   */
  updateSyncStatus(
    householdId: string,
    transactionId: string,
    status: SyncStatus
  ): Promise<RepositoryResult<void>>;
}

// =====================================================
// 2. IAssetRepository (자산)
// =====================================================

/**
 * 자산 Repository 인터페이스
 *
 * @description
 * 자산/부채 항목의 CRUD를 담당합니다.
 */
export interface IAssetRepository {
  // ===== 생성 =====

  /**
   * 새 자산 생성
   *
   * @param householdId 가계부 ID
   * @param input 자산 입력 데이터
   * @returns 생성된 자산
   */
  create(
    householdId: string,
    input: AssetCreateInput
  ): Promise<RepositoryResult<Asset>>;

  // ===== 조회 =====

  /**
   * 자산 단건 조회
   *
   * @param householdId 가계부 ID
   * @param assetId 자산 ID
   * @returns 자산 정보 (없으면 null)
   */
  findById(
    householdId: string,
    assetId: string
  ): Promise<RepositoryResult<Asset | null>>;

  /**
   * 자산 목록 조회
   *
   * @param householdId 가계부 ID
   * @param options 조회 옵션
   * @returns 자산 목록
   */
  findAll(
    householdId: string,
    options?: ListOptions & { includeInactive?: boolean }
  ): Promise<RepositoryResult<Asset[]>>;

  /**
   * 카테고리별 자산 조회
   *
   * @param householdId 가계부 ID
   * @param category 자산 카테고리
   * @returns 해당 카테고리의 자산 목록
   */
  findByCategory(
    householdId: string,
    category: string
  ): Promise<RepositoryResult<Asset[]>>;

  /**
   * 총 자산 합계 계산
   *
   * @param householdId 가계부 ID
   * @returns 총 자산 (부채 포함)
   */
  getTotalAmount(
    householdId: string
  ): Promise<RepositoryResult<{ total: number; assets: number; liabilities: number }>>;

  // ===== 수정 =====

  /**
   * 자산 수정
   *
   * @param householdId 가계부 ID
   * @param assetId 자산 ID
   * @param input 수정할 데이터 (version 필수)
   * @returns 수정된 자산
   */
  update(
    householdId: string,
    assetId: string,
    input: AssetUpdateInput
  ): Promise<RepositoryResult<Asset>>;

  /**
   * 자산 금액만 업데이트
   *
   * @param householdId 가계부 ID
   * @param assetId 자산 ID
   * @param amount 새 금액
   * @param version 현재 버전
   * @returns 수정된 자산
   */
  updateAmount(
    householdId: string,
    assetId: string,
    amount: number,
    version: number
  ): Promise<RepositoryResult<Asset>>;

  // ===== 삭제 =====

  /**
   * 자산 삭제 (soft delete - isActive: false)
   *
   * @param householdId 가계부 ID
   * @param assetId 자산 ID
   * @param version 현재 버전
   * @returns 삭제 성공 여부
   */
  delete(
    householdId: string,
    assetId: string,
    version: number
  ): Promise<RepositoryResult<boolean>>;

  // ===== 동기화 =====

  /**
   * 동기화 대기 중인 자산 조회
   */
  findPending(
    householdId: string
  ): Promise<RepositoryResult<Asset[]>>;

  /**
   * 동기화 상태 업데이트
   */
  updateSyncStatus(
    householdId: string,
    assetId: string,
    status: SyncStatus
  ): Promise<RepositoryResult<void>>;
}

// =====================================================
// 3. ICategoryRepository (카테고리) - 읽기 전용
// =====================================================

/**
 * 카테고리 Repository 인터페이스
 *
 * @description
 * 카테고리는 주로 읽기 위주이며, 생성은 시스템 초기화 또는 관리자만 가능합니다.
 */
export interface ICategoryRepository {
  // ===== 조회 =====

  /**
   * 카테고리 단건 조회
   *
   * @param householdId 가계부 ID
   * @param categoryId 카테고리 ID
   * @returns 카테고리 정보
   */
  findById(
    householdId: string,
    categoryId: string
  ): Promise<RepositoryResult<Category | null>>;

  /**
   * 모든 카테고리 조회
   *
   * @param householdId 가계부 ID
   * @param options 조회 옵션
   * @returns 카테고리 목록 (정렬순)
   */
  findAll(
    householdId: string,
    options?: { type?: "income" | "expense"; includeInactive?: boolean }
  ): Promise<RepositoryResult<Category[]>>;

  /**
   * 유형별 카테고리 조회
   *
   * @param householdId 가계부 ID
   * @param type 카테고리 유형 (income | expense)
   * @returns 해당 유형의 카테고리 목록
   */
  findByType(
    householdId: string,
    type: "income" | "expense"
  ): Promise<RepositoryResult<Category[]>>;

  // ===== 생성 (관리자 전용) =====

  /**
   * 커스텀 카테고리 생성
   *
   * @param householdId 가계부 ID
   * @param input 카테고리 입력 데이터
   * @returns 생성된 카테고리
   */
  create(
    householdId: string,
    input: CategoryCreateInput
  ): Promise<RepositoryResult<Category>>;

  /**
   * 기본 카테고리 초기화 (가계부 생성 시)
   *
   * @param householdId 가계부 ID
   * @returns 생성된 기본 카테고리 목록
   */
  initializeDefaults(
    householdId: string
  ): Promise<RepositoryResult<Category[]>>;

  // ===== 수정 =====

  /**
   * 카테고리 활성화/비활성화
   *
   * @param householdId 가계부 ID
   * @param categoryId 카테고리 ID
   * @param isActive 활성화 여부
   * @returns 수정된 카테고리
   */
  setActive(
    householdId: string,
    categoryId: string,
    isActive: boolean
  ): Promise<RepositoryResult<Category>>;

  /**
   * 카테고리 정렬 순서 변경
   *
   * @param householdId 가계부 ID
   * @param orderedIds 정렬된 카테고리 ID 배열
   */
  reorder(
    householdId: string,
    orderedIds: string[]
  ): Promise<RepositoryResult<void>>;
}

// =====================================================
// 4. IUserRepository (사용자) - 읽기 전용
// =====================================================

/**
 * 사용자 Repository 인터페이스
 *
 * @description
 * 사용자 정보 조회를 담당합니다.
 * 사용자 생성/수정은 Firebase Auth 훅에서 처리됩니다.
 */
export interface IUserRepository {
  // ===== 조회 =====

  /**
   * 사용자 단건 조회 (UID)
   *
   * @param uid Firebase Auth UID
   * @returns 사용자 정보
   */
  findByUid(uid: string): Promise<RepositoryResult<User | null>>;

  /**
   * 사용자 단건 조회 (이메일)
   *
   * @param email 이메일 주소
   * @returns 사용자 정보
   */
  findByEmail(email: string): Promise<RepositoryResult<User | null>>;

  /**
   * 여러 사용자 조회
   *
   * @param uids UID 목록
   * @returns 사용자 목록
   */
  findByUids(uids: string[]): Promise<RepositoryResult<User[]>>;

  // ===== 생성/수정 (Auth 훅에서 호출) =====

  /**
   * 사용자 정보 생성 또는 업데이트 (upsert)
   *
   * @param user 사용자 정보
   * @returns 저장된 사용자
   */
  upsert(user: Partial<User> & { uid: string }): Promise<RepositoryResult<User>>;

  /**
   * 마지막 로그인 시간 업데이트
   *
   * @param uid 사용자 UID
   */
  updateLastLogin(uid: string): Promise<RepositoryResult<void>>;
}

// =====================================================
// 5. IHouseholdRepository (가계부)
// =====================================================

/**
 * 가계부 Repository 인터페이스
 *
 * @description
 * 가계부(가족 그룹) 관리를 담당합니다.
 */
export interface IHouseholdRepository {
  // ===== 생성 =====

  /**
   * 새 가계부 생성
   *
   * @param input 가계부 입력 데이터
   * @param creatorUid 생성자 UID
   * @returns 생성된 가계부
   */
  create(
    input: HouseholdCreateInput,
    creatorUid: string
  ): Promise<RepositoryResult<Household>>;

  // ===== 조회 =====

  /**
   * 가계부 단건 조회
   *
   * @param householdId 가계부 ID
   * @returns 가계부 정보
   */
  findById(householdId: string): Promise<RepositoryResult<Household | null>>;

  /**
   * 사용자가 속한 가계부 목록 조회
   *
   * @param uid 사용자 UID
   * @returns 가계부 목록
   */
  findByUser(uid: string): Promise<RepositoryResult<Household[]>>;

  /**
   * 초대 코드로 가계부 조회
   *
   * @param inviteCode 초대 코드
   * @returns 가계부 정보 (만료되지 않은 경우)
   */
  findByInviteCode(inviteCode: string): Promise<RepositoryResult<Household | null>>;

  // ===== 수정 =====

  /**
   * 가계부 정보 수정
   *
   * @param householdId 가계부 ID
   * @param input 수정할 데이터
   * @returns 수정된 가계부
   */
  update(
    householdId: string,
    input: HouseholdUpdateInput
  ): Promise<RepositoryResult<Household>>;

  /**
   * 새 초대 코드 생성
   *
   * @param householdId 가계부 ID
   * @param expiresInHours 만료 시간 (시간 단위, 기본: 24)
   * @returns 새 초대 코드
   */
  regenerateInviteCode(
    householdId: string,
    expiresInHours?: number
  ): Promise<RepositoryResult<string>>;

  // ===== 멤버 관리 =====

  /**
   * 멤버 추가 (초대 수락)
   *
   * @param householdId 가계부 ID
   * @param member 새 멤버 정보
   * @returns 수정된 가계부
   */
  addMember(
    householdId: string,
    member: Omit<HouseholdMember, "joinedAt">
  ): Promise<RepositoryResult<Household>>;

  /**
   * 멤버 제거
   *
   * @param householdId 가계부 ID
   * @param memberUid 제거할 멤버 UID
   * @returns 수정된 가계부
   */
  removeMember(
    householdId: string,
    memberUid: string
  ): Promise<RepositoryResult<Household>>;

  /**
   * 멤버 역할 변경
   *
   * @param householdId 가계부 ID
   * @param memberUid 멤버 UID
   * @param newRole 새 역할
   * @returns 수정된 가계부
   */
  updateMemberRole(
    householdId: string,
    memberUid: string,
    newRole: "admin" | "member" | "viewer"
  ): Promise<RepositoryResult<Household>>;

  // ===== 삭제 =====

  /**
   * 가계부 삭제
   *
   * @param householdId 가계부 ID
   * @returns 삭제 성공 여부
   */
  delete(householdId: string): Promise<RepositoryResult<boolean>>;
}

// =====================================================
// 6. IBudgetRepository (예산)
// =====================================================

/**
 * 예산 Repository 인터페이스
 */
export interface IBudgetRepository {
  /**
   * 월별 예산 조회 또는 생성
   *
   * @param householdId 가계부 ID
   * @param year 연도
   * @param month 월 (1-12)
   * @returns 월별 예산
   */
  getOrCreate(
    householdId: string,
    year: number,
    month: number
  ): Promise<RepositoryResult<MonthlyBudget>>;

  /**
   * 월별 예산 수정
   *
   * @param householdId 가계부 ID
   * @param budgetId 예산 ID (YYYY-MM)
   * @param totalLimit 전체 예산 한도
   * @param categories 카테고리별 예산
   * @returns 수정된 예산
   */
  update(
    householdId: string,
    budgetId: string,
    totalLimit: number,
    categories: Array<{ categoryId: string; limit: number }>
  ): Promise<RepositoryResult<MonthlyBudget>>;

  /**
   * 지출액 업데이트 (거래 추가/수정/삭제 시)
   *
   * @param householdId 가계부 ID
   * @param year 연도
   * @param month 월
   * @param categoryId 카테고리 ID
   * @param amountDelta 변경량 (양수: 증가, 음수: 감소)
   */
  updateSpent(
    householdId: string,
    year: number,
    month: number,
    categoryId: string,
    amountDelta: number
  ): Promise<RepositoryResult<void>>;

  /**
   * 연간 예산 조회
   *
   * @param householdId 가계부 ID
   * @param year 연도
   * @returns 해당 연도의 월별 예산 목록
   */
  findByYear(
    householdId: string,
    year: number
  ): Promise<RepositoryResult<MonthlyBudget[]>>;
}

// =====================================================
// 7. ISyncRepository (동기화)
// =====================================================

/**
 * 동기화 Repository 인터페이스
 *
 * @description
 * 오프라인 작업의 서버 동기화를 담당합니다.
 */
export interface ISyncRepository {
  /**
   * 전체 동기화 실행
   *
   * @param householdId 가계부 ID
   * @returns 동기화 결과
   */
  syncAll(householdId: string): Promise<SyncResult>;

  /**
   * 거래 내역 동기화
   */
  syncTransactions(householdId: string): Promise<SyncResult>;

  /**
   * 자산 동기화
   */
  syncAssets(householdId: string): Promise<SyncResult>;

  /**
   * 충돌 해결
   *
   * @param householdId 가계부 ID
   * @param documentId 문서 ID
   * @param resolution 해결 방법 ('local' | 'remote')
   */
  resolveConflict(
    householdId: string,
    documentId: string,
    resolution: "local" | "remote"
  ): Promise<RepositoryResult<void>>;

  /**
   * 마지막 동기화 시간 조회
   */
  getLastSyncTime(householdId: string): Promise<Date | null>;
}
