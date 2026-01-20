/**
 * 동기화 모듈
 */

export {
  SyncEngine,
  getSyncEngine,
  resetSyncEngine,
  type SyncState,
  type SyncEvent,
  type SyncEventType,
  type SyncEventListener,
  type SyncEngineConfig,
} from "./syncEngine";

export {
  resolveConflict,
  mergeConflict,
  resolveWithUserChoice,
  hasVersionConflict,
  findConflictingFields,
  formatConflictDetails,
  getConflictSeverity,
  type ConflictStrategy,
  type ConflictData,
  type ConflictResult,
  type ConflictDetails,
  type UserResolution,
  type ConflictSeverity,
} from "./conflictResolver";
