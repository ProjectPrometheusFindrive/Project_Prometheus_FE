# Codebase Improvement Roadmap

본 문서는 코드베이스 안정화와 개선을 위한 우선순위 로드맵입니다. 각 항목은 범위가 작고 위험이 낮은 것부터(Quick Wins) 점진적으로 적용합니다.

## 빠른 수습(Quick Wins)

- 미사용/중복 import 정리로 번들 크기 및 가독성 개선
  - AssetStatus: 사용 중인 `uploadMany`는 유지, 나머지 미사용 import 제거 권장 (파일: `src/pages/AssetStatus.jsx:1`).
  - RentalContracts: 업로드 관련 불필요 상수/함수 import 제거 상태를 유지하고, 추가 미사용 import 주기적 점검 (파일: `src/pages/RentalContracts.jsx:1`).

- 업로드 유틸 단일화 가이드(개정)
  - 기본 원칙: 컴포넌트에서는 `src/utils/uploadHelpers.js`의 `uploadOne`/`uploadMany`(필요 시 `uploadOneCancelable`) 사용을 우선합니다.
  - 예외 허용: 세밀한 진행률/취소/대용량 제어가 필수인 화면은 직접 `chooseUploadMode`/`uploadViaSignedPut`/`uploadResumable` 호출을 임시 허용하되, 가능하면 헬퍼로 래핑하여 점진적으로 이전합니다.
  - 1차 이전 대상(리스크 낮음):
    - `src/components/TopHeader.jsx` (회사 로고 업로드) → `uploadOne`로 단순화 가능.
    - `src/pages/Settings.jsx`, `src/pages/OnboardingDocs.jsx` (사업자등록증 업로드) → `uploadOne`로 대체 가능.
  - 2차 이전 대상(단계/진행률 UI 결합):
    - `src/components/InsuranceDialog.jsx`, `src/components/AssetDialog.jsx`, `src/components/forms/RentalForm.jsx`
    - 현재 OCR 선업로드/진행률 UI와 결합되어 있어 `uploadOneCancelable` 도입 후 어댑터를 통해 단계/퍼센트 계산을 유지하며 이전합니다.

- 백엔드 정책 정합성 반영(완료)
  - 업로드 폴더 경로에서 ID 인코딩 제거(백엔드 정규식 `[A-Za-z0-9_-]+` 준수).
  - `/uploads/sign`, `/uploads/resumable` 요청 바디에 `fileSize` 포함(서버 측 용량 검사 활용).

## 단기(1–2 스프린트)

- 업로드 컴포넌트 공통화
  - 로고/사업자등록증/계약서/면허증/보험/사고 동영상 업로드를 공통 업로더 컴포넌트로 래핑(accept, folder, 미리보기, 진행률, 취소 일관화).

- 테이블 컬럼 설정 훅/메뉴 재사용 범위 확대
  - 에셋/렌탈 외 추가 목록 화면에 확장 적용.

## 중기(3–5 스프린트)

- 문서 미리보기 파이프라인 정리
  - `getSignedDownloadUrl` 캐시 정책/TTL 조정과 썸네일 전략 문서화.
  - PDF/이미지/비디오 핸들러를 문서 뷰어 컴포넌트 단일화로 단순화.

- API 타입/스키마 정합성 강화
  - `apiTypes.js`와 실제 응답 필드 동기화, 스네이크/카멜 변환 계층 일관화.

## 테스트/품질

- 업로드 유틸 단위 테스트(Vitest)
  - `sanitizeUploadContentType`, 모드 선택, 청크 진행률 계산, 에러/중단 복구 시나리오 커버리지.

- 접근성 회귀 체크리스트
  - 업로드/뷰어/드롭다운의 키보드 포커스 흐름, ARIA 라벨 확인.

