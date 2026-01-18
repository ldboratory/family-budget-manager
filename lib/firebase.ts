/**
 * Firebase 초기화 및 서비스 인스턴스 관리
 *
 * 이 파일은 Firebase 앱을 초기화하고
 * Authentication, Firestore 등의 서비스 인스턴스를 export합니다.
 *
 * 환경변수 설정:
 * - .env.local.example 파일을 .env.local로 복사
 * - Firebase Console에서 프로젝트 설정값을 입력
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

/**
 * Firebase 설정 타입 정의
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
 * Firebase 설정 유효성 검사
 * 필수 환경변수가 설정되지 않은 경우 경고 출력
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
    console.warn(
      `[Firebase] 다음 환경변수가 설정되지 않았습니다: ${missingFields
        .map((f) => `NEXT_PUBLIC_FIREBASE_${f.toUpperCase()}`)
        .join(", ")}`
    );
  }
}

/**
 * Firebase 앱 초기화
 * - 이미 초기화된 앱이 있으면 재사용
 * - 싱글톤 패턴으로 중복 초기화 방지
 */
let app: FirebaseApp;

if (getApps().length === 0) {
  validateConfig(firebaseConfig);
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0]!;
}

/**
 * Firebase 서비스 인스턴스
 */
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

export default app;
