# Project Prometheus Frontend

차량 자산/대여 비즈니스 운영을 위한 React + Vite 기반 단일 페이지 애플리케이션(SPA)입니다. 대시보드, 자산·대여 관리, 문제 차량 모니터링, 지오펜스(출입 제한 구역) 설정 기능을 제공합니다.

## 개요

- 기본값으로 로컬 브라우저 `localStorage`와 시드 데이터로 동작합니다.
- 실제 백엔드 API(Real API)만 사용하도록 구성되었습니다. `.env.local`에 Real API 주소를 설정하세요.

## 주요 기능

- 대시보드: 등록/운영 현황 도넛 차트, 핵심 지표
- 자산 관리: 차량/자산 목록·상세, 편집, 관리단계(대여중/준비중/예약/정비 등)
- 대여 계약: 테이블 보기, 상태 필터, 요약 정보
- 문제 차량: 연체·도난 등 이슈 차량 집중 모니터링
- 설정: 회사 정보, 로고/증빙, 지오펜스(카카오 지도 기반) 관리
- 지도: Kakao Maps 기반 위치/경로 시각화

## 기술 스택

- React 18, React Router v6(HashRouter)
- Vite 7 (개발/빌드)
- Recharts(차트), React Icons(아이콘)
- Kakao Maps SDK(동적 로드)
 

## 빠른 시작

필수 요구 사항

- Node.js LTS(권장: 18+) 및 npm

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

- 프론트엔드: http://localhost:5173
 

프로덕션 빌드/미리보기

```bash
npm run build
npm run preview
```

배포

- `dist/`를 정적 호스팅에 업로드하면 됩니다. HashRouter를 사용하므로 서브 경로에서도 동작하도록 서버 설정을 권장합니다.

## 환경 변수(.env*)

환경 변수(.env.local)

`src/api/index.js`는 Real API만 사용합니다. 다음 변수만 설정하면 됩니다.

- `VITE_API_BASE_URL`: 실제 API Base URL(끝의 `/` 생략 권장). 예: `http://localhost:5000` 또는 `http://localhost:5000/api`
- `VITE_KAKAO_MAP_API_KEY`: 카카오 지도 API Key(미설정 시 내장 개발 키로 로드 시도)

예시(.env.local)

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_KAKAO_MAP_API_KEY=your_kakao_key
```
 

## 라우팅

- 공개: `/`, `/terms`, `/signup`, `/forgot-password`
- 보호(로그인 필요):
  - `/dashboard`, `/assets`, `/settings`
  - `/rentals` 는 `/rentals/table`로 리다이렉트
  - `/rentals/table`
  - `/detail/:type/:id`

인증 가드 `src/components/RequireAuth.jsx`는 `localStorage.isLoggedIn` 값을 확인합니다. 라우팅은 HashRouter를 사용합니다.

## 프로젝트 구조(요약)

```
src/
  App.jsx, main.jsx, App.css
  api/            # index.js(Real 전용), api.js, apiClient.js, apiTypes.js
  components/
    AppLayout.jsx, NavigationBar.jsx, KakaoMap.jsx, ErrorBoundary.jsx, ...
    forms/        # AssetForm.jsx, RentalForm.jsx, IssueForm.jsx, KakaoGeofenceInput.jsx 등
  pages/
    Dashboard.jsx, AssetStatus.jsx, RentalContracts.jsx,
    ProblemVehicles.jsx, Detail.jsx,
    Login.jsx, SignUp.jsx, ForgotPassword.jsx, Settings.jsx, TermsAgreement.jsx
  server/              # (deprecated) 과거 Fake API용 코드
  data/
    db.js, seed.json, geofences.json, company-info.json, assets.js, rentals.js, company.js
  utils/
    storage.js, date.js, map.js
  constants/
    app.js, forms.js, theme.js, index.js
  assets/
    *.svg 등 정적 리소스
```

루트 파일

- `index.html`: 지도 CDN을 사용하지 않습니다. Kakao Maps SDK는 컴포넌트에서 동적 로드합니다.
- `vite.config.js`: 개발 서버 포트(5173), React 플러그인 설정.

## 로컬 스토리지 키(요약)

- 인증/사용자: `isLoggedIn`, `registeredUsers`, `defaultLanding`
- 자산/대여/이슈 초안: `assetDrafts`, `rentalDrafts`, `issueDrafts`
- 자산/대여/이슈 편집본: `assetEdits`, `rentalEdits`, `issueEdits`
- 회사/지오펜스: `companyInfo`, `geofenceSets`
- 디바이스/차량 제어: `deviceInfoByAsset`, `deviceEventsByAsset`, `noRestartMap`, `engineStatusMap`

자세한 사용법은 `src/utils/storage.js` 참고.

## API 동작(Real 전용)

- `src/api/index.js`는 Real API만 사용합니다.
- `src/api/apiClient.js`, `src/api/apiTypes.js`를 통해 일관된 응답 포맷(`data/status/error/timestamp`)을 처리합니다.
- 엔드포인트 경로는 `API_SPECIFICATION.md`의 Real API 섹션을 따르며, 기본 베이스는 `VITE_API_BASE_URL`입니다.
 - Rentals 필드 케이스: 프론트/백엔드 모두 camelCase를 사용합니다.

### 회원가입/등록 정책 업데이트

- 엔드포인트: `POST /auth/register`(기본). 레거시 `/auth/signup`은 폴백으로만 사용됩니다.
- 요청 필드: `{ userId, password, name, phone, email, position, company, bizRegNo }`
  - `bizRegNo`(사업자등록번호): 하이픈 입력 허용. 서버가 숫자만 추출하여 10자리·체크디지트 검증.
  - 회사 식별: 신규 가입부터 `companyId = bizRegNo` 정책 적용(표시명은 `company`).
- 에러 메시지(예):
  - 자리수 오류: `사업자등록번호는 10자리 숫자여야 합니다.`
  - 체크디지트 오류: `유효하지 않은 사업자등록번호입니다.`

자세한 내용은 `API_SPECIFICATION.md`의 Authentication 섹션을 참고하세요.

## 지도/지오펜스

- Kakao Maps SDK를 컴포넌트에서 동적으로 로드합니다(네트워크 필요).
- `src/components/KakaoMap.jsx`: 차량 위치 및 이동 경로(속도에 따라 색상 구간) 시각화.
- `src/components/forms/KakaoGeofenceInput.jsx`: services, drawing 라이브러리를 사용해 지오펜스 생성/편집. `VITE_KAKAO_MAP_API_KEY` 필요(미설정 시 내장 개발 키 시도).
- 지오펜스 데이터는 Real API에서 별도 리소스로 관리합니다. 조회: `GET /geofences`, 생성: `POST /geofences`, 수정: `PUT /geofences/{id}`, 삭제: `DELETE /geofences/{id}`. 상세는 `API_SPECIFICATION.md` 참고.

## 스크립트

`package.json`의 주요 스크립트:

- `npm run dev` / `npm start`: Vite 개발 서버(5173)
- `npm run build`: 프로덕션 빌드
- `npm run preview`: 빌드 미리보기
- `npm test`: 현재 테스트 없음(placeholder)

## 개발 메모

- 라우팅은 HashRouter를 사용하여 정적 호스팅에서도 안정적으로 동작합니다.
- 테스트는 아직 구성되지 않았습니다(`npm test`는 placeholder).
- 지도 SDK는 컴포넌트에서 동적으로 로드되므로 오프라인 환경에서는 별도 프록시/캐시가 필요할 수 있습니다.

## 추후 개선

- 실제 백엔드 연동 시 인증/권한(JWT 등) 적용
- 지오펜스/회사 정보 DB 연동, 파일 업로드 처리
- GPS/실시간 추적(WebSocket) 스트리밍
- i18n(국문/영문), 접근성 보완, 에러/로딩 상태 고도화

## Swagger/OpenAPI 명세

- 위치: `openapi/project-prometheus-openapi.yaml`
명세는 실제 백엔드의 표준 래퍼(`status/data/error/timestamp`)와 Plain JSON을 모두 허용(`oneOf`)하도록 구성되어 있습니다.

활용 방법 예시

1. [Swagger Editor](https://editor.swagger.io/) → **File > Import file**로 로컬 YAML을 불러와 엔드포인트/모델을 탐색합니다.
2. 로컬 미리보기: `npx @redocly/cli preview-docs openapi/project-prometheus-openapi.yaml` 실행 후 브라우저에서 `http://127.0.0.1:8080` 접속.
3. 백엔드에 Swagger UI를 붙이고 싶다면 YAML을 서버의 정적 자원으로 제공하고, Swagger UI 초기화 시 `url: '/path/project-prometheus-openapi.yaml'`로 지정하면 됩니다.

## 참고 문서

- `API_SPECIFICATION.md`: 프론트엔드가 기대하는 API 명세
