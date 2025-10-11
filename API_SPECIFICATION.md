# Project Prometheus Frontend API Specification

## Overview

프론트엔드가 사용하는 API 설계와 기대 응답 형식을 정리합니다. 현재 두 가지 API 모드를 지원합니다.

-   Fake API: 개발 환경에서 사용하는 로컬 Express 서버 기반 API(기본)
-   Real API: 실제 백엔드 서버와 통신하는 API (`VITE_USE_REAL_API=true` 설정 시)

Base URLs

-   Fake API: `http://localhost:3001/api`
-   Real API: 환경변수 `VITE_API_BASE_URL`

## Response Format

Real API는 다음과 같은 표준 래퍼를 권장합니다. 프론트엔드의 `apiClient`가 이 래퍼를 기대하고 파싱합니다. Fake API는 리소스(JSON 객체/배열) 자체를 반환합니다.

성공 응답

```json
{
  "data": <response_data>,
  "status": "success",
  "error": null,
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

에러 응답

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

-   `NETWORK_ERROR`: 네트워크 연결 오류
-   `NOT_FOUND`: 리소스를 찾을 수 없음
-   `UNAUTHORIZED`: 인증 필요
-   `VALIDATION_ERROR`: 요청 검증 실패
-   `SERVER_ERROR`: 서버 내부 오류

호환성 메모

-   Real API는 위 래퍼 형식을 지키는 것을 권장합니다.
-   Fake API는 리소스를 직접 반환하며, 프론트엔드는 모드에 맞춰 데이터를 통일해 사용합니다.

## API Endpoints

### Assets (자산 관리)

GET /assets

-   설명: 차량 자산 목록 조회
-   응답: Asset[]

예시

```json
[
    {
        "id": "VH001",
        "vin": "1HGCM82633A123456",
        "plate": "123가4567",
        "brand": "현대",
        "model": "쏘나타",
        "year": 2023,
        "color": "흰색",
        "fuelType": "gasoline",
        "registrationDate": "2023-01-15T00:00:00.000Z",
        "registrationStatus": "registered",
        "location": { "lat": 37.5665, "lng": 126.978 },
        "deviceStatus": "normal",
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

-   설명: 신규 자산 생성
-   요청 본문: Asset 생성 필드(예시 이하)

```json
{
    "vin": "1HGCM82633A123456",
    "plate": "123가4567",
    "brand": "현대",
    "model": "쏘나타",
    "year": 2023,
    "color": "흰색",
    "fuelType": "gasoline"
}
```

-   응답: 생성된 Asset(서버에서 `id` 부여)

PUT /assets/{id}

-   설명: 자산 정보 수정
-   파라미터: `id`(string)
-   요청 본문: 변경 필드
-   응답: 수정된 Asset

DELETE /assets/{id}

-   설명: 자산 삭제
-   파라미터: `id`(string)
-   응답: 204 No Content

#### Asset Fields (추가)

-   `diagnosticStatus` (string): 차량 상태 값. 백엔드에서 제공하며 프론트는 그대로 표시.
    -   값: "-", "정상", "관심필요", "심각"
    -   기준: 모든 `diagnosticCodes.severity`의 최댓값을 사용하여 분류(정상 ≤ 3.0, 관심필요 ≤ 7.0, 심각 > 7.0).
    -   배지를 클릭하면 진단 코드/내용 상세 모달을 노출.
-   `diagnosticCodes` (array): 차량 진단 코드 목록. 각 항목은 아래 필드를 가진다.
    -   `code` (string): 진단 코드
    -   `description` (string): 코드 설명(내용)
    -   `severity` (number): 0.0 ~ 10.0 범위의 소수점 1자리
    -   `detectedDate` (string, YYYY-MM-DD): 발생일
-   `managementStage` (string): 관리 단계. 프론트의 드롭다운에서 선택하며 `saveAsset(id, { managementStage })` 형태로 즉시 저장된다.
    -   허용값: "대여중", "대여가능", "예약중", "입고 대상", "수리/점검 중", "수리/점검 완료"
    -   페이크/실제 API 모두 해당 필드를 응답 및 저장 동작에 포함한다.

### Rentals (렌탈 계약)

GET /rentals

-   설명: 모든 렌탈 계약 목록 조회
-   응답: Rental[]

GET /rentals/latest

-   설명: VIN별 최신 렌탈 1건 조회(데모 Fake API는 전체 목록 반환)
-   응답: Rental[]

GET /rentals/{id}

-   설명: 특정 렌탈 상세 조회
-   파라미터: `id`(string)
-   응답: Rental

GET /rentals/byVin/{vin}

-   설명: 특정 VIN의 렌탈 상태 집계
-   파라미터: `vin`(string, 17자리)
-   응답

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

POST /rentals

-   설명: 신규 렌탈 생성
-   요청 본문(예시)

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
        "start": "2024-01-01T09:00:00.000Z",
        "end": "2024-12-31T18:00:00.000Z"
    },
    "price": 1200000
}
```

-   응답: 생성된 Rental

### Vehicles (통합 차량 정보)

GET /vehicles

-   설명: 자산·렌탈 정보가 합쳐진 차량 스냅샷 목록(Real API 권장)
-   응답 예시

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

-   설명: 대시보드에 필요한 집계 데이터 조회
-   응답 예시(Fake API 기준)

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

-   설명: 도난, 연체, 기기 문제 등 이슈 차량 목록 조회
-   응답 예시

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
        "price": 1200000
    }
]
```

### Geofences (지오펜스)

GET /geofences

-   설명: 등록된 지오펜스 목록 조회
-   응답 예시

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

### Company Information (회사 정보)

GET /company (Real API 권장)

-   설명: 회사 정보 조회
-   응답 예시

```json
{
    "corpName": "프로메테우스 모터스",
    "ceoName": "홍길동",
    "regNumber": "123-45-67890",
    "incorpDate": "2020-01-01",
    "address": "서울시 강남구 테헤란로 123",
    "logoDataUrl": "data:image/png;base64,...",
    "certDataUrl": "data:application/pdf;base64,...",
    "geofences": [
        /* Geofence */
    ],
    "geofencesUpdatedAt": "2025-01-01T00:00:00.000Z"
}
```

PUT /company (Real API 권장)

-   설명: 회사 정보 수정
-   요청 본문: Company 객체
-   응답: 성공/에러 상태

### Issues (이슈 관리)

POST /issues (Real API)

-   설명: 이슈 생성
-   요청 본문

```json
{
    "vin": "1HGCM82633A123456",
    "type": "stolen",
    "description": "차량 도난 신고",
    "priority": "high",
    "reportedBy": "관리자"
}
```

-   응답

```json
{
    "ok": true,
    "data": {
        /* Issue */
    }
}
```

POST /issue-drafts (Fake API 전용)

-   설명: 이슈 초안 생성(로컬 개발용)
-   응답: 생성된 초안 객체

## Data Models

Asset

```typescript
interface Asset {
    id: string; // 자산 ID
    vin: string; // 차량 식별번호(17자리)
    plate: string; // 차량 번호판
    brand: string; // 브랜드
    model: string; // 모델명
    year: number; // 연식
    color: string; // 색상
    fuelType: string; // 연료 타입
    registrationDate?: Date; // 등록일
    registrationStatus: string; // 등록 상태
    managementStage: string; // 관리 단계 (대여중/대여가능/예약중/입고 대상/수리/점검 중/수리/점검 완료)
    // 보험(단일 필드: 호환성 유지용)
    insuranceInfo?: string; // 현재 유효 보험: "회사명 상품명" 요약
    insuranceCompany?: string; // 현재 유효 보험사
    insuranceProduct?: string; // 현재 유효 상품
    insuranceStartDate?: Date; // 현재 유효 시작일
    insuranceExpiryDate?: Date; // 현재 유효 만료일
    insuranceSpecialTerms?: string; // 현재 유효 특약
    insuranceDocName?: string; // 증권 파일명
    insuranceDocDataUrl?: string; // 증권 파일 데이터 URL
    // 보험 이력(연 단위 갱신/변경 기록)
    insuranceHistory?: Array<{
        type: "등록" | "갱신"; // 이벤트 유형
        date: Date; // 이벤트 일자(보통 시작일)
        company: string; // 보험사
        product?: string; // 상품
        startDate?: Date; // 효력 시작일
        expiryDate?: Date; // 효력 만료일
        specialTerms?: string; // 특약사항
        docName?: string; // 첨부 파일명
        docDataUrl?: string; // 첨부 데이터 URL
    }>;
    // 단말 이력(장착/변경 기록)
    deviceHistory?: Array<{
        type: "install" | "replace" | "update"; // 이벤트 종류
        date: Date; // 이벤트 일자(보통 장착일)
        installDate?: Date; // 장착일(동일 값 중복 보관 가능)
        serial?: string; // 단말 S/N
        installer?: string; // 장착자 이름
    }>;
    location: {
        // 위치 정보
        lat: number;
        lng: number;
    };
    deviceStatus: string; // 장치 상태
    createdAt: Date;
    updatedAt: Date;
}
```

Rental

```typescript
interface Rental {
    rental_id: string; // 렌탈 계약 ID
    vin: string; // 차량 VIN
    customer: {
        // 고객 정보
        name: string;
        phone: string;
        address: string;
        licenseNumber: string;
    };
    rental_period: {
        // 렌탈 기간
        start: Date;
        end: Date;
    };
    price: number; // 렌탈 가격
    status: string; // 계약 상태
    reported_stolen: boolean; // 도난 신고 여부
    createdAt: Date;
    updatedAt: Date;
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
```

## Authentication

데모 환경은 localStorage 기반의 단순 인증을 사용합니다.

-   `localStorage.isLoggedIn`: 로그인 상태 플래그

실제 API 연동 시에는 JWT 토큰 또는 API Key 기반 인증을 권장합니다.

## Error Handling

프론트엔드 레이어에서 공통 처리 기준:

1. Network Errors: 네트워크 실패 시 에러 상태 반환
2. 404 Errors: 리소스 없음 → null/에러 래퍼 반환
3. Validation Errors: 잘못된 입력 → 구체적 메시지
4. Server Errors: 5xx → 일반화된 메시지

## Development Notes

-   Fake API는 `src/server/fake-backend.js`(Express)에서 구동합니다.
-   Real API와의 통신 및 표준 응답 래퍼는 `src/api/apiClient.js`에서 처리합니다.
-   응답의 날짜 문자열은 클라이언트에서 Date 객체로 변환됩니다(`transformAsset`, `transformRental`).
-   VIN은 반드시 17자리여야 합니다.
-   대부분의 Fake API 응답에는 약 100ms의 지연이 추가돼 로딩 상태를 모사합니다.

## Environment Variables

```bash
# Real API 사용 여부 (기본: false)
VITE_USE_REAL_API=true

# Real API 서버 URL
VITE_API_BASE_URL=https://api.example.com

# Fake API 서버 URL (기본: http://localhost:3001/api)
VITE_FAKE_API_BASE_URL=http://localhost:3001/api

# Kakao Map API Key (선택)
VITE_KAKAO_MAP_API_KEY=your_kakao_key
```
