# Family Budget Manager (가계부 앱)

가족 단위 재정 관리를 위한 웹 애플리케이션입니다.

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Firebase (Authentication + Firestore)
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Charts**: Recharts
- **Offline Support**: Dexie.js (IndexedDB)

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
cp .env.local.example .env.local
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

## 라이선스

Private - All rights reserved
