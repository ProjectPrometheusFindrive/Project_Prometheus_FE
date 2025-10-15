# Project Prometheus Frontend API Specification

## Overview

이 문서는 프론트엔드가 현재 구현(Real API 전용) 기준으로 기대하는 백엔드 REST API를 정리합니다. 상세 스키마는 `openapi/project-prometheus-openapi.yaml`을 참조하세요. 프론트엔드는 Real API만 사용하며, 베이스 URL은 `VITE_API_BASE_URL`에서 읽습니다(끝의 `/`는 제거).

노트

- 응답은 Plain JSON(리소스 그대로) 또는 표준 래퍼(`status/data/error/timestamp`) 두 형태를 모두 허용합니다. `src/api/apiClient.js`가 두 형태를 자동 처리합니다.
- 과거 로컬 Fake API 관련 내용은 더 이상 사용하지 않습니다(코드에서 Real API만 사용). OpenAPI에는 개발 편의를 위한 보조 엔드포인트가 포함될 수 있으나, 본 문서는 실제 사용 중인 엔드포인트만 기술합니다.

## Response Format

프론트엔드 `apiClient`는 두 형태를 모두 지원하고 동일한 형태로 정규화합니다.

- Plain JSON: 리소스 객체/배열을 그대로 반환
- Standard Wrapper(권장): 아래 형식으로 감싸서 반환

성공 응답(권장)

```json
{
  "data": <response_data>,
  "status": "success",
  "error": null,
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

에러 응답(권장)

```json
{
  "data": null,
  "status": "error",
  "error": {
    "type": "ERROR_TYPE",
    "message": "에러 설명"
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

Error Types

- `NETWORK_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, `VALIDATION_ERROR`, `SERVER_ERROR`

참고: `openapi/project-prometheus-openapi.yaml`은 두 형태를 `oneOf`로 정의합니다.

## API Endpoints

### Assets (자산 관리)

GET /assets

- 설명: 차량 자산 목록 조회
- 응답: Asset[]

예시

```json
[
  {
    "id": "VH001",
    "vin": "1HGCM82633A123456",
    "plate": "123가4567",
    "make": "Hyundai",
    "model": "Sonata",
    "vehicleType": "쏘나타 23년형",
    "year": 2023,
    "color": "화이트",
    "fuelType": "gasoline",
    "registrationDate": "2023-01-15",
    "registrationStatus": "장비장착 완료",
    "location": { "lat": 37.5665, "lng": 126.9780 },
    "deviceSerial": "HYU-SONA-23-1001",
    "deviceStatus": "normal",
    "managementStage": "대여가능",
    "createdAt": "2023-01-15T00:00:00.000Z",
    "updatedAt": "2023-01-15T00:00:00.000Z"
  }
]
```

GET /assets/{id}

-   설명: 특정 자산 상세 조회
-   파라미터: `id`(string)
-   응답: Asset

POST /assets

- 설명: 신규 자산 생성
- 요청 본문: `AssetCreateInput`

```json
{
  "vin": "1HGCM82633A123456",
  "plate": "123가4567",
  "make": "Hyundai",
  "model": "Sonata",
  "vehicleType": "쏘나타 23년형",
  "year": 2023,
  "color": "화이트",
  "fuelType": "gasoline"
}
```

- 응답: 생성된 Asset(서버에서 `id` 부여)

PUT /assets/{id}

-   설명: 자산 정보 수정
-   파라미터: `id`(string)
-   요청 본문: 변경 필드
-   응답: 204 No Content (본문 없음)

DELETE /assets/{id}

- 설명: 자산 삭제
- 파라미터: `id`(string)
- 응답: 204 No Content

GET /assets/summary

- 설명: 자산 목록(표)용 요약 데이터 조회 — 테이블에 필요한 필드만 반환해 페이로드를 최소화
- 응답: AssetSummary[]

예시

```json
[
  {
    "id": "VH001",
    "vin": "1HGCM82633A123456",
    "plate": "123가4567",
    "vehicleType": "쏘나타 23년형",
    "registrationDate": "2023-01-15",
    "insuranceExpiryDate": "2025-06-30",
    "deviceSerial": "DEV-2024-0001",
    "diagnosticStatus": "정상",
    "diagnosticMaxSeverity": 1.2,
    "managementStage": "대여가능",
    "memo": ""
  }
]
```

필드 정의

- `id`(string): 자산 ID(행 식별자)
- `vin`(string): 17자리 VIN
- `plate`(string): 차량번호
- `vehicleType`(string): 차종 표시 문자열
- `registrationDate`(string|Date): 차량 등록일(YYYY-MM-DD)
- `insuranceExpiryDate`(string|Date): 보험 만료일(YYYY-MM-DD)
- `deviceSerial`(string|null): 단말 시리얼(유/무로 연결 상태 표시)
- `diagnosticStatus`("-"|"정상"|"관심필요"|"심각"): 차량 상태 배지 텍스트
- `diagnosticMaxSeverity`(number): 0.0~10.0 범위의 최대 심각도(한 자리 소수). 제공 시 상세 코드 배열 전송 불필요
- `managementStage`(string): "대여중" | "대여가능" | "예약중" | "입고 대상" | "수리/점검 중" | "수리/점검 완료"
- `memo`(string): 메모

비고

- 목록 화면은 `/assets/summary` 사용을 권장합니다. 상세/편집, 외부 모달(보험/단말 상세) 등은 필요 시 `/assets/{id}`로 전체 정보를 조회합니다.

#### 클릭 액션용 경량 엔드포인트 (권장)

목록(테이블)에서 특정 버튼/배지를 클릭할 때는 아래 경량 엔드포인트로 필요한 데이터만 조회하는 것을 권장합니다. 응답은 Plain JSON 또는 표준 래퍼 둘 다 허용합니다.

1) 차량번호 클릭 → 프로필(편집) 데이터

- URL: `GET /assets/{id}/profile`
- 설명: 자산 편집/프로필 모달에 필요한 최소 필드만 반환
- 응답 스키마

```typescript
interface AssetProfileResponse {
  id: string;
  vin: string;              // 17자리 VIN
  plate: string;            // 차량번호
  make?: string;            // 제조사
  model?: string;           // 모델
  vehicleType?: string;     // 차종 표시 문자열
  year?: number;
  fuelType?: string;
  vehicleValue?: string | number; // 차량가액(문자열 or 숫자 허용)
  registrationStatus?: string;    // 등록 상태 텍스트
  registrationDate?: string;      // YYYY-MM-DD
  purchaseDate?: string;          // YYYY-MM-DD
  systemRegDate?: string;         // YYYY-MM-DD
  systemDelDate?: string;         // YYYY-MM-DD
  memo?: string;
}
```

- 응답 예시

```json
{
  "id": "VH-0001",
  "vin": "KMHDH41EX6U123456",
  "plate": "28가2345",
  "make": "Hyundai",
  "model": "Sonata",
  "vehicleType": "소나타 25년형",
  "year": 2025,
  "fuelType": "가솔린",
  "vehicleValue": 25000000,
  "registrationStatus": "장비장착 완료",
  "registrationDate": "2024-11-01",
  "purchaseDate": null,
  "systemRegDate": "2024-11-01",
  "systemDelDate": null,
  "memo": "엔진오일 교체 완료"
}
```

2) 보험 만료일 클릭 → 보험 상세 데이터

- URL: `GET /assets/{id}/insurance`
- 설명: 보험 모달(읽기/편집)에 필요한 데이터 조회
- 응답 스키마

```typescript
interface AssetInsuranceResponse {
  id: string;
  plate?: string;
  insuranceCompany?: string;     // 보험사명(표시/편집)
  insuranceProduct?: string;     // 보험 상품명(표시/편집)
  insuranceStartDate?: string;   // YYYY-MM-DD
  insuranceExpiryDate?: string;  // YYYY-MM-DD (만료일 배지에 표시)
  insuranceSpecialTerms?: string;// 특약사항
  insuranceDocName?: string;     // 첨부 파일명(옵션)
  insuranceDocDataUrl?: string;  // 첨부 파일 Data URL(옵션)
  insuranceHistory?: Array<{
    type: "등록" | "갱신";
    date?: string;               // YYYY-MM-DD
    company?: string;
    product?: string;
    startDate?: string;          // YYYY-MM-DD
    expiryDate?: string;         // YYYY-MM-DD
    specialTerms?: string;
    docName?: string;
    docDataUrl?: string;
  }>;
}
```

- 응답 예시

```json
{
  "id": "VH-0001",
  "plate": "28가2345",
  "insuranceCompany": "렌터카공제",
  "insuranceProduct": "자동차종합보험",
  "insuranceStartDate": "2025-11-01",
  "insuranceExpiryDate": "2026-11-01",
  "insuranceSpecialTerms": "자기부담금 20만원",
  "insuranceDocName": "policy_2025.pdf",
  "insuranceDocDataUrl": "data:application/pdf;base64,....",
  "insuranceHistory": [
    {
      "type": "등록",
      "date": "2024-11-01",
      "company": "렌터카공제",
      "product": "자동차종합보험",
      "startDate": "2024-11-01",
      "expiryDate": "2025-11-01"
    },
    {
      "type": "갱신",
      "date": "2025-11-01",
      "company": "렌터카공제",
      "product": "자동차종합보험",
      "startDate": "2025-11-01",
      "expiryDate": "2026-11-01"
    }
  ]
}
```

3) 단말 상태 클릭 → 단말 정보/이력 데이터

- URL: `GET /assets/{id}/device`
- 설명: 단말 정보 모달(읽기/편집)과 이벤트 이력에 필요한 데이터 조회
- 응답 스키마

```typescript
interface AssetDeviceResponse {
  id: string;
  plate?: string;
  deviceSerial?: string;       // 시리얼
  deviceInstallDate?: string;  // YYYY-MM-DD
  supplier?: string;           // 공급사
  installer?: string;          // 설치자
  deviceHistory?: Array<{
    id?: string;
    type: "install" | "replace" | "update" | string;
    date?: string;             // YYYY-MM-DD
    installDate?: string;      // YYYY-MM-DD
    serial?: string;
    installer?: string;
    supplier?: string;
    label?: string;
    meta?: object;
  }>;
}
```

- 응답 예시

```json
{
  "id": "VH-0001",
  "plate": "28가2345",
  "deviceSerial": "1ABCD-SONATA-26",
  "deviceInstallDate": "2025-02-01",
  "supplier": "ABC 디바이스",
  "installer": "이상훈",
  "deviceHistory": [
    { "type": "install", "date": "2024-11-01", "installDate": "2024-11-01", "serial": "1ABCD-SONATA-25", "installer": "김범기" },
    { "type": "replace", "date": "2025-02-01", "installDate": "2025-02-01", "serial": "1ABCD-SONATA-26", "installer": "이상훈" }
  ]
}
```

4) 차량 상태(건강/진단) 클릭 → 진단 상세 데이터

- URL: `GET /assets/{id}/diagnostics`
- 설명: 차량 상태 배지 클릭 시 표시되는 진단 상세 모달 데이터 조회
- 응답 스키마

```typescript
interface AssetDiagnosticsResponse {
  id: string;
  plate?: string;
  vehicleType?: string;
  diagnosticStatus?: "-" | "정상" | "관심필요" | "심각";
  diagnosticMaxSeverity?: number; // 0.0~10.0
  diagnosticCodes?: Array<{
    id?: string;
    code: string;
    description?: string;
    severity?: number;          // 0.0~10.0
    detectedDate?: string;      // YYYY-MM-DD
  }>;
}
```

- 응답 예시

```json
{
  "id": "VH-0002",
  "plate": "05가0960",
  "vehicleType": "스포티지 19년형",
  "diagnosticStatus": "관심필요",
  "diagnosticMaxSeverity": 8.0,
  "diagnosticCodes": [
    { "code": "1001", "description": "엔진 온도 이상", "severity": 8, "detectedDate": "2025-09-24" },
    { "code": "2001", "description": "브레이크 패드 마모", "severity": 5, "detectedDate": "2025-09-17" }
  ]
}
```

#### Asset Fields (추가 권장)

- `diagnosticStatus` ("-" | "정상" | "관심필요" | "심각"): 진단 배지 상태
- 기준: `diagnosticCodes.severity` 최댓값 기준 분류(정상 ≤ 3.0, 관심필요 ≤ 7.0, 심각 > 7.0)
- `diagnosticCodes` (array): `{ code, description, severity(0.0~10.0, 소수점 첫째자리), detectedDate(YYYY-MM-DD) }`
- `managementStage` (string): "대여중" | "대여가능" | "예약중" | "입고 대상" | "수리/점검 중" | "수리/점검 완료"

위 필드는 Fake/Real 공통으로 응답 및 저장에 포함하는 것을 권장합니다.

### Rentals (렌탈 계약)

Casing

- Backend and frontend use camelCase for all fields.
- Rental fields include: `renterName`, `contactNumber`, `rentalPeriod { start, end }`, `insuranceName`, `rentalAmount`, `contractStatus`, `engineStatus`, `restartBlocked`, `accidentReported`, `returnedAt`, `reportedStolen`, `unpaidAmount`, `rentalDurationDays`, `currentLocation`, `locationUpdatedAt`, `rentalLocation`, `returnLocation`.

GET /rentals

- 설명: 모든 렌탈 계약 목록 조회
- 응답: Rental[]

GET /rentals/summary

- 설명: 렌탈 목록(표)용 요약 데이터 조회 — 테이블에 필요한 필드만 반환해 페이로드를 최소화
- 응답: RentalSummary[]

예시

```json
[
  {
    "rentalId": "string",
    "plate": "string",
    "vehicleType": "string",
    "renterName": "string",
    "rentalPeriod": {
      "start": "ISO 8601 datetime string",
      "end": "ISO 8601 datetime string"
    },
    "rentalAmount": 0,
    "unpaidAmount": 0,
    "rentalDurationDays": 0,
    "contractStatus": "string",
    "engineStatus": "on",
    "restartBlocked": false,
    "accidentReported": false,
    "accidentReport": {
      "blackboxFileName": null
    },
    "memo": "",
    "returnedAt": null,
    "reportedStolen": false
  }
]
```

비고

- 목록 화면은 `/rentals/summary` 사용을 권장합니다. 상세/편집, 지도/사고 정보 등은 필요 시 `/rentals/{id}`로 전체 정보를 조회합니다.

GET /rentals/latest

- 설명: VIN별 최신 렌탈 1건 목록
- 응답: Rental[]

GET /rentals/{id}

-   설명: 특정 렌탈 상세 조회
-   파라미터: `id`(string)
-   응답: Rental

GET /rentals/byVin/{vin}

- 설명: 특정 VIN의 렌탈 상태 집계
- 파라미터: `vin`(string, 17자리)
- 응답 예시

```json
{
  "current": null,
  "stolen": [],
  "active": [],
  "overdue": [],
  "reserved": [],
  "conflicts": [],
  "asOf": "2025-01-01T00:00:00.000Z"
}
```

GET /rentals/indexByVin

- 설명: 자산 목록의 일관성 검토를 위한 VIN별 경량 집계
- 응답: Array<{ vin, hasActive, hasReserved, hasOverdue, hasStolen, openCount, currentPeriod?, recommendedStage?, asOf }>

예시

```json
[
  {
    "vin": "KMHXX...",
    "hasActive": true,
    "hasReserved": false,
    "hasOverdue": false,
    "hasStolen": false,
    "openCount": 1,
    "currentPeriod": { "start": "2025-01-01T00:00:00Z", "end": "2025-01-10T00:00:00Z" },
    "recommendedStage": "대여중",
    "asOf": "2025-01-05T12:00:00Z"
  }
]
```

POST /rentals

- 설명: 신규 렌탈 생성
- 요청 본문: `RentalCreateInput`

```json
{
  "vin": "1HGCM82633A123456",
  "customer": {
    "name": "김철수",
    "phone": "010-1234-5678",
    "address": "서울시 강남구",
    "licenseNumber": "12-34-567890-12"
  },
  "rental_period": {
    "start": "2025-01-01T09:00:00",
    "end": "2025-12-31T18:00:00"
  },
  "rental_amount": 1200000
}
```

메모: 고객 정보는 평문 필드(`renterName/contactNumber/address`) 또는 구조화된 `customer` 객체로 전달할 수 있습니다(둘 중 하나만 사용 권장).

-   응답: 생성된 Rental

PUT /rentals/{id}

- 설명: 렌탈 정보 수정(메모, 사고정보, 재시동 금지 등 부분 업데이트)
- 파라미터: `id`(string|number)
- 요청 본문: 변경 필드(JSON)
- 응답: 204 No Content (본문 없음)

DELETE /rentals/{id}

- 설명: 렌탈 계약 삭제
- 파라미터: `id`(string|number)
- 응답: 204 No Content

### Vehicles (통합 차량 정보)

GET /vehicles

- 설명: 자산·렌탈 정보를 합친 차량 스냅샷 목록
- 응답 예시

```json
[
    {
        "vin": "1HGCM82633A123456",
        "assetId": "VH001",
        "plate": "123가4567",
        "asset": {
            /* Asset */
        },
        "rentals": [
            /* Rental */
        ],
        "status": {
            "current": null,
            "stolen": [],
            "active": [],
            "overdue": [],
            "reserved": [],
            "conflicts": [],
            "asOf": "2025-01-01T00:00:00.000Z"
        }
    }
]
```

### Dashboard (대시보드 데이터)

GET /dashboard

- 설명: 대시보드에 필요한 집계 데이터 조회
- 응답 예시

```json
{
    "totalAssets": 50,
    "availableAssets": 45,
    "activeRentals": 30,
    "problemVehicles": 4,
    "overdueRentals": 3,
    "stolenVehicles": 1,
    "deviceInstalled": 44,
    "insuranceRegistered": 45,
    "vehicleStatus": [
        { "name": "등록완료", "value": 45 },
        { "name": "등록대기", "value": 3 },
        { "name": "장착중", "value": 2 }
    ],
    "bizStatus": [
        { "name": "대여중", "value": 30 },
        { "name": "가용", "value": 20 },
        { "name": "연체", "value": 3 },
        { "name": "도난", "value": 1 },
        { "name": "문제차량", "value": 4 }
    ],
    "recentActivities": [
        { "id": 1, "type": "rental", "message": "신규 렌탈 계약이 등록되었습니다.", "timestamp": "2025-01-01T00:00:00.000Z" },
        { "id": 2, "type": "asset", "message": "차량 장비 설치가 완료되었습니다.", "timestamp": "2025-01-01T00:00:00.000Z" },
        { "id": 3, "type": "problem", "message": "반납 지연 차량이 발견되었습니다.", "timestamp": "2025-01-01T00:00:00.000Z" }
    ]
}
```

### Problem Vehicles (문제 차량)

GET /problem-vehicles

- 설명: 도난, 연체, 기기 문제 등 이슈 차량 목록 조회
- 응답 예시

```json
[
    {
        "rental_id": "R001",
        "vin": "1HGCM82633A123456",
        "customer": {
            /* Customer */
        },
        "asset": {
            /* Asset */
        },
        "issue": "stolen",
        "rental_period": {
            /* Period */
        },
        "reported_stolen": true,
    "rental_amount": 1200000
    }
]
```

### Geofences (지오펜스)

GET /geofences

- 설명: 등록된 지오펜스 목록 조회(일부 환경에서는 회사 정보의 `geofences`와 통합)
- 응답 예시

```json
[
    {
        "name": "서울 강남구 사업장",
        "points": [
            { "lat": 37.5665, "lng": 126.978 },
            { "lat": 37.5675, "lng": 126.9785 },
            { "lat": 37.567, "lng": 126.979 }
        ]
    }
]
```

POST /geofences

- 설명: 지오펜스 생성
- 요청 본문 예시

```json
{ 
  "name": "서울 강남구 사업장",
  "points": [
    { "lat": 37.5665, "lng": 126.978 },
    { "lat": 37.5675, "lng": 126.9785 },
    { "lat": 37.567, "lng": 126.979 }
  ]
}
```

- 응답: 생성된 Geofence 객체(201)

PUT /geofences/{id}

- 설명: 지오펜스 수정(이름/좌표)
- 파라미터: `id`(string) — 백엔드 구현에 따라 name이 식별자일 수 있습니다.
- 요청 본문 예시: POST와 동일 스키마
- 응답: 200 OK(업데이트된 Geofence 또는 성공 상태)

DELETE /geofences/{id}

- 설명: 지오펜스 삭제
- 파라미터: `id`(string)
- 응답: 204 No Content 또는 200 OK

### Company Information (회사 정보)

GET /company

- 설명: 회사 정보 조회
- 응답 예시

```json
{
  "corpName": "프로메테우스 모터스",
  "ceoName": "홍길동",
  "regNumber": "123-45-67890",
  "incorpDate": "2020-01-01",
  "address": "서울시 강남구 테헤란로 123",
  "contactNumber": "02-0000-0000",
  "contactEmail": "info@example.com",
  "logoDataUrl": "data:image/png;base64,...",
  "certDataUrl": "data:application/pdf;base64,...",
  "geofences": [
    { "name": "서울 강남구 사업장", "points": [ { "lat": 37.56, "lng": 126.97 } ] }
  ],
  "geofencesUpdatedAt": "2025-01-01T00:00:00.000Z"
}
```

PUT /company

- 설명: 회사 정보 저장/수정
- 요청 본문: Company 객체 전체 또는 변경 필드
- 응답: 저장된 Company 또는 성공 상태

### Issues (이슈 관리)

POST /issues

- 설명: 이슈 생성(Real API)
- 요청 본문(`IssueCreateInput`)

```json
{
    "vin": "1HGCM82633A123456",
    "type": "stolen",
    "severity": "high",
    "description": "차량 도난 신고",
    "priority": "high",
    "reportedBy": "관리자"
}
```

- 응답: Issue(201) — 표준 래퍼 또는 Plain JSON

## Data Models

Asset

```typescript
interface Asset {
  id: string; // 자산 ID
  vin: string; // 차량 식별번호(17자리)
  plate: string; // 차량 번호판
  make?: string; // 제조사
  model?: string; // 모델명
  vehicleType?: string; // UI에 표시되는 차종(제조사/모델/연식 조합)
  year?: number; // 연식
  color?: string; // 색상
  fuelType?: string; // 연료 타입
  registrationDate?: Date; // 등록일
  registrationStatus?: string; // 등록 상태
  vehicleStatus?: string; // 원본 데이터상의 상태
  managementStage?: string; // 관리 단계
  // 보험(단일/요약)
  insuranceInfo?: string;
  insuranceCompany?: string;
  insuranceProduct?: string;
  insuranceStartDate?: Date;
  insuranceExpiryDate?: Date;
  insuranceSpecialTerms?: string;
  insuranceDocName?: string;
  insuranceDocDataUrl?: string;
  // 보험 이력
  insuranceHistory?: Array<{
    type: "등록" | "갱신";
    date?: Date;
    company?: string;
    product?: string;
    startDate?: Date;
    expiryDate?: Date;
    specialTerms?: string;
    docName?: string;
    docDataUrl?: string;
  }>;
  // 단말 이력
  deviceSerial?: string;
  deviceInstallDate?: Date;
  installer?: string;
  deviceHistory?: Array<{
    type: "install" | "replace" | "update";
    date?: Date;
    installDate?: Date;
    serial?: string;
    installer?: string;
  }>;
  // 위치
  location?: { lat: number; lng: number };
  deviceStatus?: string; // 장치 상태
  diagnosticStatus?: "-" | "정상" | "관심필요" | "심각";
  diagnosticCodes?: Array<{ code: string; description?: string; severity?: number; detectedDate?: string }>;
  memo?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
```

Rental

```typescript
interface Rental {
  rentalId: string | number;
  vin: string;
  vehicleType?: string;
  plate?: string;
  renterName?: string;
  contactNumber?: string;
  address?: string;
  customer?: { name: string; phone: string; address: string; licenseNumber: string };
  rentalPeriod: { start: Date; end: Date };
  insuranceName?: string;
  rentalAmount?: number;
  contractStatus?: string;
  status?: string; // UI status
  reportedStolen?: boolean;
  returnConfirmed?: boolean;
  accidentReported?: boolean;
  accidentReport?: object;
  returnedAt?: string;
  rentalLocation?: { lat: number; lng: number };
  returnLocation?: { lat: number; lng: number };
  currentLocation?: { lat: number; lng: number };
  locationUpdatedAt?: string;
  engineStatus?: "on" | "off";
  restartBlocked?: boolean;
  memo?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
```

Geofence

```typescript
interface Geofence {
    name: string; // 지오펜스 명칭
    points: Array<{
        // 경계 좌표들
        lat: number;
        lng: number;
    }>;
}

VehicleSnapshot(응답 요약)

```typescript
interface VehicleSnapshot {
  vin: string;
  assetId?: string;
  plate?: string;
  asset: Asset;
  rentals: Rental[];
  status: {
    current: Rental | null;
    stolen: Rental[];
    active: Rental[];
    overdue: Rental[];
    reserved: Rental[];
    conflicts: Array<[Rental, Rental]>;
    asOf: string; // ISO
  };
}
```
```

### Uploads (GCS Direct Upload)

POST /uploads/sign

- 설명: 소형 파일 업로드용 서명된 PUT URL 발급
- 요청 본문: `{ fileName: string, contentType?: string, folder?: string }`
- 응답 본문: `{ uploadUrl: string, objectName: string, publicUrl?: string, contentType: string }`

POST /uploads/resumable

- 설명: 대용량 업로드용 Resumable 세션 URL 발급
- 요청 본문: `{ fileName: string, contentType?: string, folder?: string }`
- 응답 본문: `{ sessionUrl: string, objectName: string, publicUrl?: string, contentType: string }`

권장 클라이언트 흐름

- 문서/이미지(≤10MB):
  1) `POST /uploads/sign`으로 `uploadUrl` 발급
  2) `PUT uploadUrl`에 파일 전체 바디 업로드 (`Content-Type` 지정)
  3) 성공 시 `objectName`을 도메인 엔티티에 저장 (민감 문서는 `publicUrl` 저장 지양)

- 동영상/대용량(>10MB):
  1) `POST /uploads/resumable`로 `sessionUrl` 발급
  2) `PUT sessionUrl`로 전체 또는 청크 업로드 (`Content-Range` 사용) — 최종 `2xx` 응답이면 완료
  3) 완료 후 `objectName` 또는 `publicUrl`을 도메인 엔티티에 저장

POST /uploads/download-url

- 설명: private GCS 객체를 다운로드하기 위한 일회성 서명된 GET URL 발급
- 요청 본문: `{ objectName: string, ttlSeconds?: number }`
- 응답 본문: `{ downloadUrl: string }`
- 비고: 프론트엔드에서는 GCS에 저장된 `objectName`만 DB에 저장하고, 이미지를 표시할 때마다 이 API를 호출하여 403을 방지합니다.

폴더 규칙(예)

- 자산 보험서류: `assets/<assetId>/insurance`
- 렌탈 블랙박스: `rentals/<rentalId>/blackbox`
- 이슈 첨부: `issues/<issueId>/attachments`

허용 타입

- 문서/이미지: `application/pdf`, `image/png`, `image/jpeg`, `image/x-icon`, `image/webp`
- 동영상: `video/mp4`, `video/x-msvideo`, `video/quicktime`, `video/mpeg`

보안

- 민감 문서는 `publicUrl`을 저장하지 말고 `objectName`만 저장. 다운로드 시 백엔드의 서명 GET URL 발급 API를 호출

## Authentication

데모 환경은 localStorage 기반의 단순 인증 플래그만 사용합니다(`localStorage.isLoggedIn`). 실제 API 연동 시에는 Bearer 토큰(JWT) 또는 API Key 기반 인증을 권장합니다. 필요 시 `src/api/apiClient.js`에 `Authorization` 헤더를 추가하도록 확장하세요.

엔드포인트

- POST /auth/login — 로그인
  - 요청: `{ userId, password }`
  - 응답: `{ token: string, user: object }` (표준 래퍼 또는 Plain JSON)

- POST /auth/register — 회원가입(권장 경로)
  - 요청: `{ userId, password, name, phone, email, position, company, bizCertUrl? }`
  - 응답: 가입 결과(성공 시 사용자/토큰 또는 상태)
  - 비고: 구(舊) 경로 `/auth/signup`은 한시적(레거시)으로 허용됩니다. 프론트엔드는 `/auth/register` 호출 후 404(Not Found)일 경우 `/auth/signup`으로 자동 폴백합니다.

- GET /auth/check-userid?userId=... — 아이디(이메일) 중복 확인
  - 응답: 사용 가능 여부(Boolean) 또는 `{ available: boolean }`

- GET /auth/me — 현재 로그인 사용자 정보 조회
  - 요청 헤더: `Authorization: Bearer <token>`
  - 응답: 사용자 정보 객체

## Error Handling

프론트엔드 레이어에서 공통 처리 기준:

1. Network Errors: 네트워크 실패 시 에러 상태 반환
2. 404 Errors: 리소스 없음 → null/에러 래퍼 반환
3. Validation Errors: 잘못된 입력 → 구체적 메시지
4. Server Errors: 5xx → 일반화된 메시지

## Development Notes

- Real API와의 통신 및 표준 응답 래퍼는 `src/api/apiClient.js`에서 처리합니다.
- 응답의 날짜 문자열은 클라이언트에서 Date 객체로 변환됩니다(`transformAsset`, `transformRental`).
- VIN은 반드시 17자리여야 합니다.

## Environment Variables

```bash
# Real API 서버 URL(끝의 / 생략 권장)
VITE_API_BASE_URL=https://api.example.com

# Kakao Map API Key (선택)
VITE_KAKAO_MAP_API_KEY=your_kakao_key
```
