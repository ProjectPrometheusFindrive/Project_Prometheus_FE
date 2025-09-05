# Project Prometheus Frontend

차량 자산 관리 및 렌탈 비즈니스 운영을 위한 프론트엔드 애플리케이션입니다. 대시보드, 자산/렌탈 관리, 문제 차량 모니터링, 지도 시각화, 설정(회사·지오펜스) 등을 제공합니다.

## 소개

본 저장소는 React + Vite 기반의 SPA입니다. 기본값으로 로컬 더미 데이터와 `localStorage`를 사용하며, 환경 변수로 실제 백엔드 API를 사용할 수도 있습니다.

## 주요 기능

- 대시보드: 등록/운영 현황 차트와 지표 게이지 제공
- 자산 현황: 차량/자산 목록과 상태 조회
- 렌탈 계약: 테이블/지도 보기, 상태별 필터링 및 팝업 정보
- 문제 차량: 연체·도난 의심 등 이슈 집중 보기
- 설정: 회사 정보, 로고/인증서, 지오펜스(다각형) 관리
- 반응형 UI: 내비게이션 바, 간결한 카드형 레이아웃

## 기술 스택

- React 18, React Router v6
- Vite 5 (개발/빌드)
- Recharts (차트)
- React Icons (아이콘)
- Leaflet + MarkerCluster (지도, CDN 로드)

## 빠른 시작

필수 요구사항

- Node.js LTS 권장, npm

설치

```bash
npm install
```

개발 서버 실행

```bash
npm run dev
# 또는
npm start
```

기본 접속: http://localhost:5173

프로덕션 빌드

```bash
npm run build
```

빌드 미리보기

```bash
npm run preview
```

배포

- `dist/`를 정적 호스팅에 업로드하면 됩니다. HashRouter 사용으로 서브 경로에서도 안정적으로 동작합니다.

## 환경 변수(.env*)

`src/api/index.js`에서 환경 변수로 실제/가짜 API를 전환합니다.

- `VITE_USE_REAL_API`: `true`면 실제 API(`realApi.js`) 사용, 그 외는 가짜 API(`fakeApi.js`)
- `VITE_API_BASE_URL`: 실제 API 기본 URL (끝의 `/`는 생략 권장)

예시(.env.development)

```env
VITE_USE_REAL_API=false
VITE_API_BASE_URL=http://localhost:3000
```

가짜 API 모드에서는 모든 데이터가 브라우저 `localStorage`와 시드 데이터로 관리됩니다.

## 라우팅

- 공개: `/`, `/signup`, `/find-id`, `/forgot-password`
- 보호(로그인 필요):
  - `/dashboard`, `/assets`, `/settings`
  - `/rentals` → `/rentals/table` 리다이렉트
  - `/rentals/table`, `/rentals/map`
  - `/issue`, `/detail/:type/:id`

인증 가드: `src/components/RequireAuth.jsx`가 `localStorage.isLoggedIn` 값을 확인합니다. 라우터는 HashRouter를 사용합니다.

## 프로젝트 구조(요약)

```
src/
  App.jsx, main.jsx, App.css
  api/            # index.js(스위치), fakeApi.js, realApi.js
  components/
    AppLayout.jsx, NavigationBar.jsx, RentalsMap.jsx
    forms/        # AssetForm.jsx, RentalForm.jsx, IssueForm.jsx 등
  pages/
    Dashboard.jsx, AssetStatus.jsx, RentalContracts.jsx, RentalsMapPage.jsx
    ProblemVehicles.jsx, Detail.jsx
    Login.jsx, SignUp.jsx, FindId.jsx, ForgotPassword.jsx, Settings.jsx
  data/           # db.js, seed.js, geofences.js, company.js 등
  utils/          # storage.js, date.js, map.js
  constants/      # 상수 모음
```

## 로컬 스토리지 키(요약)

- 인증/사용자: `isLoggedIn`, `registeredUsers`, `defaultLanding`
- 자산/렌탈/이슈 임시저장: `assetDrafts`, `rentalDrafts`, `issueDrafts`
- 자산/렌탈/이슈 편집본: `assetEdits`, `rentalEdits`, `issueEdits`
- 회사/지오펜스: `companyInfo`(권장), `geofenceSets`(레거시)
- 디바이스/차량 제어 맵: `deviceInfoByAsset`, `noRestartMap`, `engineStatusMap`

## 지도 뷰 참고

- `index.html`에서 Leaflet 및 MarkerCluster를 CDN으로 로드합니다.
- 지오펜스는 `companyInfo.geofences`(없으면 시드)에서 불러오며, 다각형은 해치 패턴으로 채워집니다.
- 렌탈 마커는 상태(진행/연체/의심)에 따라 다른 클러스터와 아이콘을 사용합니다.

## 개발 메모

- 테스트: 현재 별도 테스트 스위트 없음(`npm test`는 placeholder)
- 스타일: 기본 CSS만 사용(프레임워크 미사용)
- 브라우저: 최신 Evergreen 브라우저 권장

## 향후 개선

- 실제 백엔드 API 연동 및 인증/권한 구현
- 영속 저장소(DB) 연동, 파일 업로드 처리
- GPS/실시간 추적(WebSocket) 및 알림
- i18n(다국어), 접근성 보완, 에러/로딩 상태 표준화

