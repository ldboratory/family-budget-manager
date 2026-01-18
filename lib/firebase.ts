/**
 * Firebase 초기화 및 서비스 인스턴스 관리
 *
 * 이 파일은 Firebase 앱을 초기화하고
 * Authentication, Firestore, Storage 서비스 인스턴스를 export합니다.
 *
 * 환경변수 설정:
 * - .env.local.example 파일을 .env.local로 복사
 * - Firebase Console에서 프로젝트 설정값을 입력
 *
 * @see https://firebase.google.com/docs/web/setup
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  type Auth,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
  type Firestore,
} from "firebase/firestore";
import {
  getStorage,
  connectStorageEmulator,
  type FirebaseStorage,
} from "firebase/storage";

// =====================================================
// 타입 정의
// =====================================================

/**
 * Firebase 설정 타입
 */
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

/**
 * Firebase 초기화 에러
 */
export class FirebaseInitError extends Error {
  constructor(
    message: string,
    public readonly missingFields: string[]
  ) {
    super(message);
    this.name = "FirebaseInitError";
  }
}

// =====================================================
// 환경변수 설정
// =====================================================

/**
 * 환경변수에서 Firebase 설정 읽기
 * NEXT_PUBLIC_ 접두사가 있어야 클라이언트에서 접근 가능
 */
const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

/**
 * 에뮬레이터 설정 (개발 환경용)
 */
const emulatorConfig = {
  useEmulator: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true",
  authHost: process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ?? "localhost",
  authPort: parseInt(process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT ?? "9099", 10),
  firestoreHost: process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST ?? "localhost",
  firestorePort: parseInt(process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_PORT ?? "8080", 10),
  storageHost: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST ?? "localhost",
  storagePort: parseInt(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_PORT ?? "9199", 10),
};

// =====================================================
// 유효성 검사
// =====================================================

/**
 * Firebase 설정 유효성 검사
 * 필수 환경변수가 설정되지 않은 경우 경고 출력
 *
 * @throws {FirebaseInitError} 필수 필드 누락 시 (프로덕션 환경)
 */
function validateConfig(config: FirebaseConfig): void {
  const requiredFields: (keyof FirebaseConfig)[] = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId",
  ];

  const missingFields = requiredFields.filter((field) => !config[field]);

  if (missingFields.length > 0) {
    const envVarNames = missingFields.map(
      (f) => `NEXT_PUBLIC_FIREBASE_${f.replace(/([A-Z])/g, "_$1").toUpperCase()}`
    );

    const message = `[Firebase] 필수 환경변수가 설정되지 않았습니다: ${envVarNames.join(", ")}`;

    if (process.env.NODE_ENV === "production") {
      throw new FirebaseInitError(message, envVarNames);
    } else {
      console.warn(message);
    }
  }
}

// =====================================================
// Firebase 앱 초기화
// =====================================================

/**
 * Firebase 앱 인스턴스
 * - 이미 초기화된 앱이 있으면 재사용
 * - 싱글톤 패턴으로 중복 초기화 방지
 */
let app: FirebaseApp;

try {
  if (getApps().length === 0) {
    validateConfig(firebaseConfig);
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0]!;
  }
} catch (error) {
  console.error("[Firebase] 앱 초기화 실패:", error);
  throw error;
}

// =====================================================
// Firebase 서비스 인스턴스
// =====================================================

/**
 * Firebase Authentication 인스턴스
 * @description 사용자 인증 (Google, 이메일/비밀번호 등)
 */
export const auth: Auth = getAuth(app);

/**
 * Cloud Firestore 인스턴스
 * @description NoSQL 문서 데이터베이스
 */
export const db: Firestore = getFirestore(app);

/**
 * Firebase Storage 인스턴스
 * @description 파일 저장소 (영수증 이미지 등)
 */
export const storage: FirebaseStorage = getStorage(app);

// =====================================================
// 에뮬레이터 연결 (개발 환경)
// =====================================================

/**
 * Firebase 에뮬레이터 연결
 * 개발 환경에서 로컬 에뮬레이터 사용 시 호출
 */
let emulatorsConnected = false;

export function connectToEmulators(): void {
  if (emulatorsConnected || !emulatorConfig.useEmulator) {
    return;
  }

  try {
    // Auth 에뮬레이터 연결
    connectAuthEmulator(
      auth,
      `http://${emulatorConfig.authHost}:${emulatorConfig.authPort}`,
      { disableWarnings: true }
    );

    // Firestore 에뮬레이터 연결
    connectFirestoreEmulator(
      db,
      emulatorConfig.firestoreHost,
      emulatorConfig.firestorePort
    );

    // Storage 에뮬레이터 연결
    connectStorageEmulator(
      storage,
      emulatorConfig.storageHost,
      emulatorConfig.storagePort
    );

    emulatorsConnected = true;
    console.info("[Firebase] 에뮬레이터에 연결되었습니다.");
  } catch (error) {
    console.error("[Firebase] 에뮬레이터 연결 실패:", error);
  }
}

// 개발 환경에서 자동으로 에뮬레이터 연결
if (typeof window !== "undefined" && emulatorConfig.useEmulator) {
  connectToEmulators();
}

// =====================================================
// Firestore 오프라인 지속성 활성화
// =====================================================

/**
 * Firestore IndexedDB 지속성 활성화
 * 오프라인 상태에서도 데이터 접근 가능
 *
 * @description 브라우저 환경에서만 실행됨
 */
export async function enableOfflinePersistence(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  try {
    await enableIndexedDbPersistence(db);
    console.info("[Firestore] 오프라인 지속성이 활성화되었습니다.");
  } catch (error) {
    if ((error as { code?: string }).code === "failed-precondition") {
      console.warn(
        "[Firestore] 여러 탭이 열려 있어 오프라인 지속성을 활성화할 수 없습니다."
      );
    } else if ((error as { code?: string }).code === "unimplemented") {
      console.warn(
        "[Firestore] 현재 브라우저는 오프라인 지속성을 지원하지 않습니다."
      );
    } else {
      console.error("[Firestore] 오프라인 지속성 활성화 실패:", error);
    }
  }
}

// =====================================================
// 유틸리티 함수
// =====================================================

/**
 * Firebase 앱 인스턴스 반환
 */
export function getFirebaseApp(): FirebaseApp {
  return app;
}

/**
 * Firebase 초기화 상태 확인
 */
export function isFirebaseInitialized(): boolean {
  return getApps().length > 0;
}

/**
 * 현재 환경이 에뮬레이터 사용 중인지 확인
 */
export function isUsingEmulator(): boolean {
  return emulatorConfig.useEmulator && emulatorsConnected;
}

export default app;
