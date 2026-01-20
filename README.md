# Family Budget Manager (가계부 앱)

가족 단위 재정 관리를 위한 Progressive Web App입니다.

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Firebase (Authentication + Firestore + Storage)
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Charts**: Recharts
- **Offline Support**: Dexie.js (IndexedDB) + Service Worker
- **PWA**: 오프라인 지원, 홈 화면 설치 가능

## 폴더 구조

```
family-budget-manager/
├── app/                    # Next.js App Router 페이지
│   ├── (auth)/            # 인증 관련 페이지 (로그인, 회원가입)
│   ├── (main)/            # 메인 앱 페이지 (대시보드, 거래내역 등)
│   └── layout.tsx         # 루트 레이아웃
├── components/            # React 컴포넌트
│   ├── ui/               # shadcn/ui 기본 컴포넌트
│   └── ...               # 기능별 컴포넌트
├── lib/                   # 유틸리티 및 설정
│   ├── firebase.ts       # Firebase 초기화
│   └── utils.ts          # 공통 유틸리티 함수
├── hooks/                 # 커스텀 React 훅
├── store/                 # Zustand 스토어
├── types/                 # TypeScript 타입 정의
│   └── index.ts          # 전역 타입
├── public/                # 정적 파일
└── styles/                # 전역 스타일
```

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 파일을 열고 Firebase 프로젝트 설정값을 입력하세요.

### 3. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 앱을 확인할 수 있습니다.

## Firebase 설정

1. [Firebase Console](https://console.firebase.google.com)에서 새 프로젝트 생성
2. Authentication 활성화 (Google, Email/Password)
3. Firestore Database 생성
4. 프로젝트 설정에서 웹 앱 추가 후 구성 값 복사
5. `.env.local`에 구성 값 입력

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run lint` | ESLint 검사 |
| `npm run firebase:deploy` | Firebase 전체 배포 |
| `npm run firebase:deploy:rules` | Firestore/Storage 규칙만 배포 |
| `npm run firebase:deploy:indexes` | Firestore 인덱스만 배포 |
| `npm run generate-icons` | PWA 아이콘 생성 |

## 배포

### Vercel 배포

1. [Vercel](https://vercel.com)에서 GitHub 저장소 연결
2. 환경변수 설정 (`.env.example` 참고)
3. 자동 배포 완료

**필수 환경변수:**
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### Firebase 배포 (보안 규칙, 인덱스)

```bash
# Firebase CLI 설치
npm install -g firebase-tools

# 로그인
firebase login

# 보안 규칙 배포
npm run firebase:deploy:rules

# 인덱스 배포
npm run firebase:deploy:indexes
```

## 주요 기능

- 가족 구성원 초대 및 권한 관리
- 수입/지출 거래 기록
- 자산(은행계좌, 카드 등) 관리
- 카테고리별 통계 및 차트
- 오프라인 지원 (PWA)
- 실시간 데이터 동기화

## 라이선스

Private - All rights reserved
