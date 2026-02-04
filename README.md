# Project Prometheus Frontend

차량 자산/대여 운영을 위한 프런트엔드 웹 애플리케이션입니다.

## 개요
- React + Vite 기반 SPA
- 해시 기반 라우팅(HashRouter)으로 정적 호스팅에 적합

## 빠른 시작
- 요구 사항: Node.js LTS(권장 18+) 및 npm

설치/실행

```bash
npm install
npm run dev      # 개발 서버 (기본 5173)
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 미리보기
```

## 환경 변수
- `.env.local`에 필요한 `VITE_` 접두 변수만 정의하세요.
  - 예: `VITE_API_BASE_URL`, `VITE_KAKAO_MAP_API_KEY`

## OCR 연동(요약)
- 업로드한 파일로부터 필드 제안을 받기 위해 백엔드 OCR 엔드포인트를 호출합니다.
- 엔드포인트: `POST /ocr/extract` (`VITE_API_BASE_URL` 기준)
  - 요청: `{ docType, objectName? | text?, sourceName?, saveOutput? }`
  - 응답: `{ status, docType, ocrSuggestions: { <docType>: { fields:[{name,value,confidence}], source } }, savedObjectName? }`
- 자산 등록(등록증)·계약 등록(계약서/면허)에서 업로드 후 OCR → 폼 자동 채움 → 사용자 확인 저장의 2단계 흐름을 지원합니다.

## 단말 장착 신청 연동
- 엔드포인트: `POST /terminal-requests` (`VITE_API_BASE_URL` 기준, 공개 엔드포인트)
- 요청 필드: `companyName`, `managerName`, `managerPhone`, `expectedVehicleCount`(number), `targetVehicle`, `preferredRegion`, `expectedStartDate`, `needsRestartBlock`(boolean) — snake_case도 허용
- 성공 응답: `{ status: "success", data: { recipients: [...], submitted: {...} } }`
- 오류: `400 VALIDATION_ERROR` 시 `details` 배열 제공, `503 EMAIL_NOT_CONFIGURED`, `502/503 EMAIL_FAILED`(메일 재시도/문의 필요)

## 계약 상태 전환 연동
- 상태는 서버 상태머신(`contractStatus`) 기준으로 사용합니다.
- 전환 API:
  - `POST /rentals/:id/transition` 요청: `{ action, payload? }`
  - `GET /rentals/:id/transitions` 응답: `{ currentState, allowedActions, stateHistory }`
- 렌탈 상세 API `GET /rentals/:id` 응답에도 `allowedActions`, `stateHistory`가 포함될 수 있습니다.
- 대표 오류:
  - `409 CONFLICT`: 동시 전환 충돌(최신 상태 재조회 후 재시도)
  - `422 INVALID_TRANSITION`: 현재 상태에서 허용되지 않는 액션

## 폴더 구조(요약)
```
src/
  api/         components/    pages/      utils/      constants/   assets/
```

## 라이선스
본 저장소의 코드는 서비스 운영 목적에 한해 사용됩니다.
