# Project Prometheus Frontend

차량 자산/렌탈 비즈니스 운영을 위한 React + Vite 기반 단일 페이지 애플리케이션(SPA)입니다. 대시보드 인사이트, 자산·렌탈 관리, 문제 차량 모니터링, 지오펜스(금지구역) 설정 기능을 제공합니다.

## 개요

- 기본값으로 로컬 브라우저 `localStorage`를 사용해 데모 데이터를 저장합니다.
- `.env` 설정으로 로컬 Fake API(Express) 또는 실제 백엔드 API로 전환할 수 있습니다.

## 주요 기능

- 대시보드: 등록/운영 현황 도넛 차트, 핵심 지표
- 자산 관리: 차량/자산 목록과 상세, 편집 저장
- 렌탈 계약: 테이블/지도 보기, 상태 필터와 팝업 정보
- 문제 차량: 연체·도난 등 이슈 차량 집중 모니터링
- 설정: 회사 정보, 로고/증빙, 지오펜스(카카오 지도 드로잉)
- 지도: Leaflet + MarkerCluster 기반 렌탈 지도 시각화

## 기술 스택

- React 18, React Router v6(HashRouter)
- Vite 7 (개발/빌드)
- Recharts (차트), React Icons (아이콘)
- Leaflet + MarkerCluster (CDN 로드)
- Express 기반 Fake API(Server)

## 빠른 시작

필수 요구 사항

- Node.js LTS(권장: 18+) 및 npm

설치

```bash
npm install
```

개발 서버 실행

```bash
# 프론트엔드만 실행
npm run dev
# 또는
npm start

# Fake API 서버 실행(포트 3001)
npm run backend

# 프론트엔드 + Fake API 동시 실행
npm run dev:full
```

- 프론트엔드: http://localhost:5173
- Fake API 기본 Base URL: http://localhost:3001/api

프로덕션 빌드/미리보기

```bash
npm run build
npm run preview
```

배포

- `dist/`를 정적 호스팅에 업로드하면 동작합니다. HashRouter를 사용하므로 서브 경로에서도 추가 서버 설정 없이 라우팅됩니다.

## 환경 변수(.env*)

`src/api/index.js`에서 환경 변수로 실제/가짜 API를 전환합니다.

- `VITE_USE_REAL_API`: `true`면 실제 API(`realApi.js`) 사용, 기본은 `false`로 Fake API(`fakeApi.js`) 사용
- `VITE_API_BASE_URL`: 실제 API의 Base URL(끝의 `/` 생략 권장)
- `VITE_FAKE_API_BASE_URL`: Fake API Base URL(기본 `http://localhost:3001/api`)
- `VITE_KAKAO_MAP_API_KEY`: 카카오 지도 API 키(선택, 미설정 시 기본 개발 키 사용)

예시(.env.development)

```env
VITE_USE_REAL_API=false
VITE_API_BASE_URL=http://localhost:3000
VITE_FAKE_API_BASE_URL=http://localhost:3001/api
VITE_KAKAO_MAP_API_KEY=your_kakao_key
```

Fake API 모드에서는 주요 데이터가 브라우저 `localStorage` 또는 로컬 JSON(seed)로 관리됩니다.

## 라우팅

- 공개: `/`, `/signup`, `/find-id`, `/forgot-password`
- 보호(로그인 필요):
  - `/dashboard`, `/assets`, `/settings`
  - `/rentals` → `/rentals/table`로 리다이렉트
  - `/rentals/table`
  - `/detail/:type/:id`

인증 가드 `src/components/RequireAuth.jsx`가 `localStorage.isLoggedIn` 값을 확인합니다. 라우터는 HashRouter를 사용합니다.

## 프로젝트 구조(요약)

```
src/
  App.jsx, main.jsx, App.css
  api/            # index.js(모드 스위치), fakeApi.js, realApi.js, apiClient.js, apiTypes.js
  components/
    AppLayout.jsx, NavigationBar.jsx, RentalsMap.jsx, KakaoMap.jsx, ErrorBoundary.jsx
    forms/        # AssetForm.jsx, RentalForm.jsx, IssueForm.jsx, Geofence 입력 등
  pages/
    Dashboard.jsx, AssetStatus.jsx, RentalContracts.jsx, RentalsMapPage.jsx
    ProblemVehicles.jsx, Detail.jsx
    Login.jsx, SignUp.jsx, FindId.jsx, ForgotPassword.jsx, Settings.jsx
  data/           # db.js, seed.js, unified-data.json, geofences.js, company.js 등
  utils/          # storage.js, date.js, map.js
  constants/      # 색상/테마/폼 상수
```

루트 파일

- `index.html`: Leaflet/MarkerCluster를 CDN으로 로드합니다.
- `vite.config.js`: 개발 서버 포트(5173), React 플러그인 설정.

## 로컬 스토리지 키(요약)

- 인증/사용자: `isLoggedIn`, `registeredUsers`, `defaultLanding`
- 자산/렌탈/이슈 임시 저장: `assetDrafts`, `rentalDrafts`, `issueDrafts`
- 자산/렌탈/이슈 편집본: `assetEdits`, `rentalEdits`, `issueEdits`
- 회사/지오펜스: `companyInfo`(권장), `geofenceSets`(레거시)
- 디바이스/차량 제어 맵: `deviceInfoByAsset`, `noRestartMap`, `engineStatusMap`

자세한 래퍼와 타입 세이프 헬퍼는 `src/utils/storage.js` 참고.

## Fake API 서버

- 경로: `src/server/fake-backend.js`
- 포트: `3001`
- 데이터 소스: `src/data/unified-data.json`
- 특징: ~100ms 지연, 자산/렌탈/대시보드/지오펜스/문제차량/이슈 초안 엔드포인트 제공
- 실행: `npm run backend` 또는 `npm run dev:full`

엔드포인트 상세는 `API_SPECIFICATION.md`를 참고하세요.

## 지도/지오펜스

- `index.html`에서 Leaflet과 MarkerCluster를 CDN으로 로드합니다(인터넷 연결 필요).
- `src/components/RentalsMap.jsx`: 렌탈 차량을 상태별 클러스터로 표시, 지오펜스(해치 패턴) 오버레이.
- `src/components/forms/KakaoGeofenceInput.jsx`: 카카오 지도(services, drawing) SDK를 동적 로드하여 폴리곤 드로잉·편집을 지원합니다. `VITE_KAKAO_MAP_API_KEY` 설정 가능.

## 스크립트

`package.json`의 주요 스크립트:

- `npm run dev` / `npm start`: Vite 개발 서버(5173)
- `npm run build`: 프로덕션 빌드
- `npm run preview`: 빌드 미리보기
- `npm run backend`: Fake API(Express) 서버 실행(3001)
- `npm run dev:full`: 프론트엔드 + Fake API 동시 실행
- `npm test`: 현재 테스트 없음(placeholder)

## 개발 메모

- 라우팅은 HashRouter를 사용하므로 정적 호스팅에서 서버 설정 없이 동작합니다.
- 테스트는 아직 포함되어 있지 않습니다(`npm test`는 placeholder).
- CDN 의존(Leaflet/MarkerCluster)이 있으므로 오프라인 환경에선 별도 로컬 호스트 설정이 필요합니다.

## 향후 개선

- 실제 백엔드 연동 시 인증/권한(JWT 등) 적용
- 지속 저장소(DB) 연동, 파일 업로드 처리
- GPS/실시간 추적(WebSocket) 스트리밍
- i18n(다국어), 접근성 보완, 에러/로딩 상태 고도화

## 참고 문서

- `API_SPECIFICATION.md`: 프론트엔드가 기대하는 API 명세

