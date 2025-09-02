# Project Prometheus Frontend

프로메테우스 프로젝트 프론트엔드 - 차량 관리 및 렌탈 시스템

## 프로젝트 개요

Project Prometheus는 차량 자산 관리와 렌탈 서비스를 위한 웹 애플리케이션입니다. 차량 등록, 렌탈 계약 관리, 문제 차량 추적, 실시간 위치 모니터링 등의 기능을 제공합니다.

## 주요 기능

### 🚗 자산 관리 (Asset Management)

-   차량 등록 및 정보 관리
-   차량 상태 모니터링 (Available, Rented, Maintenance)
-   보험 정보 및 디바이스 ID 관리
-   주행거리 및 연료 타입 추적

### 📋 렌탈 계약 관리 (Rental Contracts)

-   렌탈 계약 등록 및 조회
-   고객 정보 관리 (이름, 연락처, 주소)
-   렌탈 기간 및 위치 정보 관리
-   보험 정보 연동

### 🗺️ 실시간 위치 추적

-   차량의 현재 위치 실시간 모니터링
-   렌탈 시작 위치 및 반납 예정 위치 표시
-   지도 기반 시각화

### ⚠️ 문제 차량 관리 (Problem Vehicles)

-   도난 신고 차량 추적
-   연체 차량 관리
-   기타 문제 상황 보고 및 처리

### 📱 반응형 UI

-   모바일 친화적 인터페이스
-   하단 네비게이션
-   직관적인 폼 입력 시스템

## 기술 스택

-   **Frontend Framework**: React 18.2.0
-   **Build Tool**: Vite 5.4.0
-   **Routing**: React Router DOM 6.23.0
-   **Styling**: CSS (custom styles)
-   **Development**: Node.js, npm

## 프로젝트 구조

```
src/
├── App.jsx              # 메인 애플리케이션 컴포넌트
├── main.jsx             # 애플리케이션 진입점
├── App.css              # 글로벌 스타일
├── components/          # 재사용 가능한 컴포넌트
│   ├── AppLayout.jsx    # 레이아웃 컴포넌트
│   ├── BottomNav.jsx    # 하단 네비게이션
│   ├── RentalsMap.jsx   # 렌탈 지도 컴포넌트
│   ├── TopRightControls.jsx # 상단 우측 컨트롤
│   └── forms/           # 폼 컴포넌트
│       ├── AssetForm.jsx    # 자산 등록/수정 폼
│       ├── RentalForm.jsx   # 렌탈 등록/수정 폼
│       └── IssueForm.jsx    # 문제 신고 폼
├── pages/               # 페이지 컴포넌트
│   ├── Login.jsx        # 로그인 페이지
│   ├── AssetStatus.jsx  # 자산 현황 페이지
│   ├── RentalContracts.jsx # 렌탈 계약 페이지
│   ├── ProblemVehicles.jsx # 문제 차량 페이지
│   ├── Registration.jsx     # 등록 페이지
│   ├── Detail.jsx       # 상세 정보 페이지
│   └── Settings.jsx     # 설정 페이지
└── data/                # 샘플 데이터
    ├── assets.js        # 자산 데이터
    └── rentals.js       # 렌탈 데이터
```

## 설치 및 실행

### 필수 요구사항

-   Node.js (최신 LTS 버전 권장)
-   npm 또는 yarn

### 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
# 또는
npm start
```

개발 서버는 기본적으로 `http://localhost:5173`에서 실행됩니다.

### 빌드

```bash
npm run build
```

### 프리뷰

```bash
npm run preview
```

## 주요 페이지 및 라우팅

-   `/` - 로그인 페이지
-   `/assets` - 자산 현황 (차량 목록 및 상태)
-   `/rentals` - 렌탈 계약 관리
-   `/returns` - 문제 차량 관리
-   `/register` - 신규 등록 (자산/렌탈/문제)
-   `/detail/:type/:id` - 상세 정보 및 수정
-   `/settings` - 설정

## 데이터 관리

현재 애플리케이션은 로컬 스토리지와 정적 데이터를 사용합니다:

-   **로그인 상태**: `localStorage.isLoggedIn`
-   **기본 랜딩 페이지**: `localStorage.defaultLanding`
-   **임시 저장**: `localStorage.assetDrafts`, `localStorage.rentalDrafts`, `localStorage.issueDrafts`
-   **수정 내용**: `localStorage.assetEdits`, `localStorage.rentalEdits`, `localStorage.issueEdits`

## 개발 환경

-   **포트**: 5173 (기본값)
-   **자동 브라우저 열기**: 활성화
-   **핫 리로드**: 지원

## 향후 개선사항

-   백엔드 API 연동
-   실제 인증 시스템 구현
-   데이터베이스 연동
-   실시간 GPS 추적 시스템
-   푸시 알림 기능
-   다국어 지원 확장
