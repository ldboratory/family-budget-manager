/**
 * 동기화 충돌 해결 로직
 *
 * 로컬과 원격 데이터 간의 충돌을 감지하고 해결합니다.
 *
 * 전략:
 * - LWW (Last-Write-Wins): 최신 타임스탬프 기준
 * - manual: 사용자에게 선택권 제공
 * - local: 항상 로컬 우선
 * - remote: 항상 원격 우선
 */

// =====================================================
// 타입 정의
// =====================================================

/**
 * 충돌 해결 전략
 */
export type ConflictStrategy = "LWW" | "manual" | "local" | "remote";

/**
 * 충돌 데이터
 */
export interface ConflictData<T = Record<string, any>> {
  /** 로컬 데이터 */
  local: T;
  /** 로컬 타임스탬프 */
  localTimestamp: number;
  /** 로컬 버전 */
  localVersion: number;
  /** 원격 데이터 */
  remote: T;
  /** 원격 타임스탬프 */
  remoteTimestamp: number;
  /** 원격 버전 */
  remoteVersion: number;
}

/**
 * 충돌 해결 결과
 */
export interface ConflictResult<T = Record<string, any>> {
  /** 해결 여부 */
  resolved: boolean;
  /** 채택된 데이터 */
  data?: T;
  /** 채택된 버전 */
  version?: number;
  /** 사용자 결정 필요 여부 */
  requiresManualResolution?: boolean;
  /** 충돌 상세 정보 (사용자에게 표시) */
  conflictDetails?: ConflictDetails;
}

/**
 * 충돌 상세 정보
 */
export interface ConflictDetails {
  /** 충돌된 필드 목록 */
  conflictingFields: string[];
  /** 로컬 변경 시각 */
  localChangedAt: Date;
  /** 원격 변경 시각 */
  remoteChangedAt: Date;
  /** 로컬 버전 */
  localVersion: number;
  /** 원격 버전 */
  remoteVersion: number;
}

/**
 * 사용자 충돌 해결 선택
 */
export type UserResolution = "keep_local" | "keep_remote" | "merge" | "skip";

// =====================================================
// 충돌 감지
// =====================================================

/**
 * 버전 기반 충돌 감지
 *
 * @param localVersion 로컬 버전
 * @param remoteVersion 원격 버전
 * @returns 충돌 여부
 */
export function hasVersionConflict(
  localVersion: number,
  remoteVersion: number
): boolean {
  // 로컬 버전이 원격 버전보다 같거나 작으면 충돌
  // (로컬에서 업데이트했는데 원격에서도 업데이트된 경우)
  return localVersion <= remoteVersion;
}

/**
 * 필드별 충돌 감지
 *
 * @param local 로컬 데이터
 * @param remote 원격 데이터
 * @param fieldsToCompare 비교할 필드 목록
 * @returns 충돌된 필드 목록
 */
export function findConflictingFields(
  local: Record<string, any>,
  remote: Record<string, any>,
  fieldsToCompare?: string[]
): string[] {
  const fields = fieldsToCompare || Object.keys({ ...local, ...remote });
  const conflicting: string[] = [];

  for (const field of fields) {
    // 메타데이터 필드는 제외
    if (["id", "version", "updatedAt", "createdAt", "syncStatus"].includes(field)) {
      continue;
    }

    const localValue = local[field];
    const remoteValue = remote[field];

    // 둘 다 undefined이면 충돌 아님
    if (localValue === undefined && remoteValue === undefined) {
      continue;
    }

    // 깊은 비교
    if (!deepEqual(localValue, remoteValue)) {
      conflicting.push(field);
    }
  }

  return conflicting;
}

/**
 * 깊은 동등성 비교
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => deepEqual(val, b[i]));
  }

  if (typeof a === "object") {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => deepEqual(a[key], b[key]));
  }

  return false;
}

// =====================================================
// 충돌 해결
// =====================================================

/**
 * 충돌 해결
 *
 * @param conflict 충돌 데이터
 * @param strategy 해결 전략
 * @returns 해결 결과
 */
export function resolveConflict<T extends Record<string, any>>(
  conflict: ConflictData<T>,
  strategy: ConflictStrategy
): ConflictResult<T> {
  const conflictingFields = findConflictingFields(conflict.local, conflict.remote);

  // 충돌된 필드가 없으면 로컬 데이터 사용
  if (conflictingFields.length === 0) {
    return {
      resolved: true,
      data: conflict.local,
      version: conflict.remoteVersion + 1,
    };
  }

  switch (strategy) {
    case "LWW":
      return resolveLWW(conflict, conflictingFields);

    case "local":
      return {
        resolved: true,
        data: conflict.local,
        version: conflict.remoteVersion + 1,
      };

    case "remote":
      return {
        resolved: true,
        data: conflict.remote,
        version: conflict.remoteVersion,
      };

    case "manual":
    default:
      return {
        resolved: false,
        requiresManualResolution: true,
        conflictDetails: {
          conflictingFields,
          localChangedAt: new Date(conflict.localTimestamp),
          remoteChangedAt: new Date(conflict.remoteTimestamp),
          localVersion: conflict.localVersion,
          remoteVersion: conflict.remoteVersion,
        },
      };
  }
}

/**
 * Last-Write-Wins 전략으로 충돌 해결
 */
function resolveLWW<T extends Record<string, any>>(
  conflict: ConflictData<T>,
  _conflictingFields: string[]
): ConflictResult<T> {
  // 최신 타임스탬프 기준으로 결정
  if (conflict.localTimestamp > conflict.remoteTimestamp) {
    return {
      resolved: true,
      data: conflict.local,
      version: conflict.remoteVersion + 1,
    };
  } else {
    return {
      resolved: true,
      data: conflict.remote,
      version: conflict.remoteVersion,
    };
  }
}

/**
 * 필드별 병합 (LWW + 병합)
 *
 * 충돌되지 않은 필드는 로컬 값 유지,
 * 충돌된 필드는 최신 타임스탬프 기준으로 선택
 */
export function mergeConflict<T extends Record<string, any>>(
  conflict: ConflictData<T>
): ConflictResult<T> {
  const conflictingFields = findConflictingFields(conflict.local, conflict.remote);

  // 병합된 데이터 생성
  const merged = { ...conflict.local };

  // 충돌된 필드만 LWW 적용
  if (conflict.remoteTimestamp > conflict.localTimestamp) {
    for (const field of conflictingFields) {
      (merged as any)[field] = conflict.remote[field];
    }
  }

  return {
    resolved: true,
    data: merged as T,
    version: conflict.remoteVersion + 1,
  };
}

/**
 * 사용자 선택에 따른 충돌 해결
 */
export function resolveWithUserChoice<T extends Record<string, any>>(
  conflict: ConflictData<T>,
  choice: UserResolution
): ConflictResult<T> {
  switch (choice) {
    case "keep_local":
      return {
        resolved: true,
        data: conflict.local,
        version: conflict.remoteVersion + 1,
      };

    case "keep_remote":
      return {
        resolved: true,
        data: conflict.remote,
        version: conflict.remoteVersion,
      };

    case "merge":
      return mergeConflict(conflict);

    case "skip":
      return {
        resolved: false,
        requiresManualResolution: true,
      };

    default:
      return {
        resolved: false,
        requiresManualResolution: true,
      };
  }
}

// =====================================================
// 유틸리티
// =====================================================

/**
 * 충돌 상세 정보 포맷팅 (사용자 표시용)
 */
export function formatConflictDetails(details: ConflictDetails): string {
  const fields = details.conflictingFields.join(", ");
  const localDate = details.localChangedAt.toLocaleString("ko-KR");
  const remoteDate = details.remoteChangedAt.toLocaleString("ko-KR");

  return `충돌된 항목: ${fields}
로컬 수정: ${localDate} (버전 ${details.localVersion})
서버 수정: ${remoteDate} (버전 ${details.remoteVersion})`;
}

/**
 * 충돌 심각도 계산 (UI 표시용)
 */
export type ConflictSeverity = "low" | "medium" | "high";

export function getConflictSeverity(
  conflictingFields: string[]
): ConflictSeverity {
  // 금액, 날짜 등 중요 필드 충돌 시 high
  const criticalFields = ["amount", "date", "type", "categoryId"];
  const hasCritical = conflictingFields.some((f) => criticalFields.includes(f));

  if (hasCritical) return "high";
  if (conflictingFields.length > 3) return "medium";
  return "low";
}

export default {
  resolveConflict,
  mergeConflict,
  resolveWithUserChoice,
  hasVersionConflict,
  findConflictingFields,
  formatConflictDetails,
  getConflictSeverity,
};
