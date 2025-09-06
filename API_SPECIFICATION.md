# Project Prometheus Frontend API Specification

## Overview

프론트엔드에서 사용하는 모든 API 엔드포인트에 대한 명세서입니다. 현재 시스템은 두 가지 API 모드를 지원합니다:

- **Fake API**: 개발 환경에서 사용하는 로컬 Express 서버 기반 API (기본값)
- **Real API**: 실제 백엔드 서버와 통신하는 API (`VITE_USE_REAL_API=true` 설정 시)

**Base URLs:**
- Fake API: `http://localhost:3001/api`
- Real API: 환경변수 `VITE_API_BASE_URL`에서 설정

## Common Response Format

### Success Response
```json
{
  "data": <response_data>,
  "status": "success",
  "error": null,
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### Error Response
```json
{
  "data": null,
  "status": "error",
  "error": {
    "type": "ERROR_TYPE",
    "message": "Error description"
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### Error Types
- `NETWORK_ERROR`: 네트워크 연결 오류
- `NOT_FOUND`: 리소스를 찾을 수 없음
- `UNAUTHORIZED`: 인증 필요
- `VALIDATION_ERROR`: 요청 데이터 검증 오류
- `SERVER_ERROR`: 서버 내부 오류

## API Endpoints

### Assets (차량 자산 관리)

#### GET /assets
차량 자산 목록을 조회합니다.

**Response:**
```json
[
  {
    "id": "VH001",
    "vin": "1HGCM82633A123456",
    "plate": "123가4567",
    "brand": "현대",
    "model": "아반떼",
    "year": 2023,
    "color": "흰색",
    "fuelType": "gasoline",
    "registrationDate": "2023-01-15T00:00:00.000Z",
    "registrationStatus": "registered",
    "location": {
      "lat": 37.5665,
      "lng": 126.9780
    },
    "deviceStatus": "normal",
    "createdAt": "2023-01-15T00:00:00.000Z",
    "updatedAt": "2023-01-15T00:00:00.000Z"
  }
]
```

#### GET /assets/{id}
특정 차량 자산의 상세 정보를 조회합니다.

**Parameters:**
- `id` (string): 차량 자산 ID

**Response:** 단일 Asset 객체

#### POST /assets
새로운 차량 자산을 생성합니다.

**Request Body:**
```json
{
  "vin": "1HGCM82633A123456",
  "plate": "123가4567",
  "brand": "현대",
  "model": "아반떼",
  "year": 2023,
  "color": "흰색",
  "fuelType": "gasoline"
}
```

**Response:** 생성된 Asset 객체 (ID 포함)

#### PUT /assets/{id}
기존 차량 자산 정보를 수정합니다.

**Parameters:**
- `id` (string): 차량 자산 ID

**Request Body:** Asset 업데이트 데이터

**Response:** 수정된 Asset 객체

#### DELETE /assets/{id}
차량 자산을 삭제합니다.

**Parameters:**
- `id` (string): 차량 자산 ID

**Response:** 204 No Content

### Rentals (렌탈 계약 관리)

#### GET /rentals
모든 렌탈 계약 목록을 조회합니다.

**Response:**
```json
[
  {
    "rental_id": "R001",
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
    "price": 1200000,
    "status": "active",
    "reported_stolen": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### GET /rentals/latest
각 VIN별로 가장 최근 렌탈 계약만 조회합니다.

**Response:** Rental 객체 배열 (각 VIN당 하나씩)

#### GET /rentals/{id}
특정 렌탈 계약의 상세 정보를 조회합니다.

**Parameters:**
- `id` (string): 렌탈 계약 ID

**Response:** 단일 Rental 객체

#### GET /rentals/byVin/{vin}
특정 VIN의 렌탈 이력을 조회합니다.

**Parameters:**
- `vin` (string): 차량 VIN (17자리)

**Response:**
```json
{
  "current": <Rental 객체 또는 null>,
  "stolen": [],
  "active": [],
  "overdue": [],
  "reserved": [],
  "conflicts": [],
  "asOf": "2025-01-01T00:00:00.000Z"
}
```

#### POST /rentals
새로운 렌탈 계약을 생성합니다.

**Request Body:**
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

**Response:** 생성된 Rental 객체

### Vehicles (통합 차량 정보)

#### GET /vehicles
자산과 렌탈 정보가 통합된 차량 목록을 조회합니다.

**Response:**
```json
[
  {
    "vin": "1HGCM82633A123456",
    "assetId": "VH001",
    "plate": "123가4567",
    "asset": <Asset 객체>,
    "rentals": [<Rental 객체>],
    "status": {
      "current": <현재 렌탈 정보>,
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

#### GET /dashboard
대시보드에 필요한 통계 데이터를 조회합니다.

**Response:**
```json
{
  "assets": {
    "total": 50,
    "registered": 45,
    "unregistered": 5
  },
  "rentals": {
    "active": 30,
    "overdue": 3,
    "available": 20
  },
  "revenue": {
    "monthly": 36000000,
    "growth": 12.5
  },
  "problems": {
    "stolen": 1,
    "overdue": 3,
    "device_issues": 2
  }
}
```

### Problem Vehicles (문제 차량)

#### GET /problem-vehicles
도난, 연체, 기기 문제 등이 있는 문제 차량 목록을 조회합니다.

**Response:**
```json
[
  {
    "rental_id": "R001",
    "vin": "1HGCM82633A123456",
    "customer": <Customer 객체>,
    "asset": <Asset 객체>,
    "issue": "stolen" | "overdue(5d)" | "device_error",
    "rental_period": <Period 객체>,
    "reported_stolen": true,
    "price": 1200000
  }
]
```

### Geofences (지오펜스)

#### GET /geofences
등록된 지오펜스 목록을 조회합니다.

**Response:**
```json
[
  {
    "name": "서울 강남구 영업소",
    "points": [
      { "lat": 37.5665, "lng": 126.9780 },
      { "lat": 37.5675, "lng": 126.9785 },
      { "lat": 37.5670, "lng": 126.9790 }
    ]
  }
]
```

### Company Information (회사 정보)

#### GET /company
회사 정보를 조회합니다.

**Response:**
```json
{
  "corpName": "프로메테우스 렌터카",
  "ceoName": "홍길동",
  "regNumber": "123-45-67890",
  "incorpDate": "2020-01-01",
  "address": "서울시 강남구 테헤란로 123",
  "logoDataUrl": "data:image/png;base64,...",
  "certDataUrl": "data:application/pdf;base64,...",
  "geofences": [<Geofence 객체>],
  "geofencesUpdatedAt": "2025-01-01T00:00:00.000Z"
}
```

#### PUT /company
회사 정보를 수정합니다.

**Request Body:** Company 객체

**Response:** Success/Error 상태

### Issues (이슈 관리)

#### POST /issues
새로운 이슈를 생성합니다.

**Request Body:**
```json
{
  "vin": "1HGCM82633A123456",
  "type": "stolen" | "overdue" | "device_error",
  "description": "차량 도난 신고",
  "priority": "high" | "medium" | "low",
  "reportedBy": "관리자"
}
```

**Response:**
```json
{
  "ok": true,
  "data": <생성된 이슈 객체>
}
```

## Data Models

### Asset
```typescript
interface Asset {
  id: string;                    // 차량 자산 ID
  vin: string;                   // 차량 식별번호 (17자리)
  plate: string;                 // 차량 번호판
  brand: string;                 // 브랜드
  model: string;                 // 모델명
  year: number;                  // 연식
  color: string;                 // 색상
  fuelType: string;              // 연료 타입
  registrationDate?: Date;       // 등록일
  registrationStatus: string;    // 등록 상태
  location: {                    // 위치 정보
    lat: number;
    lng: number;
  };
  deviceStatus: string;          // 기기 상태
  createdAt: Date;
  updatedAt: Date;
}
```

### Rental
```typescript
interface Rental {
  rental_id: string;             // 렌탈 계약 ID
  vin: string;                   // 차량 VIN
  customer: {                    // 고객 정보
    name: string;
    phone: string;
    address: string;
    licenseNumber: string;
  };
  rental_period: {               // 렌탈 기간
    start: Date;
    end: Date;
  };
  price: number;                 // 렌탈 가격
  status: string;                // 계약 상태
  reported_stolen: boolean;      // 도난 신고 여부
  createdAt: Date;
  updatedAt: Date;
}
```

### Geofence
```typescript
interface Geofence {
  name: string;                  // 지오펜스 명칭
  points: Array<{               // 폴리곤 포인트
    lat: number;
    lng: number;
  }>;
}
```

## Authentication

현재 시스템은 localStorage 기반의 간단한 인증을 사용합니다:
- `localStorage.isLoggedIn`: 로그인 상태 확인

실제 API 연동 시에는 JWT 토큰 또는 API Key를 사용한 인증 방식을 구현해야 합니다.

## Error Handling

모든 API 호출은 다음과 같은 에러 핸들링 패턴을 따릅니다:

1. **Network Errors**: 네트워크 연결 실패 시 localStorage fallback 시도
2. **404 Errors**: 리소스 없음 시 null 반환
3. **Validation Errors**: 잘못된 요청 데이터 시 상세 에러 메시지 제공
4. **Server Errors**: 서버 오류 시 generic error message 제공

## Development Notes

- Fake API는 `src/server/fake-backend.js`에서 구동되는 Express 서버입니다
- Real API 클라이언트는 `src/api/apiClient.js`에 정의되어 있습니다
- API 응답은 자동으로 Date 객체로 변환됩니다 (transformAsset, transformRental)
- VIN은 반드시 17자리여야 합니다
- 모든 API 호출에는 100ms 지연이 추가되어 로딩 상태를 시뮬레이션합니다

## Environment Variables

```bash
# Real API 사용 여부 (기본값: false)
VITE_USE_REAL_API=true

# Real API 서버 URL
VITE_API_BASE_URL=https://api.example.com

# Fake API 서버 URL (기본값: http://localhost:3001/api)
VITE_FAKE_API_BASE_URL=http://localhost:3001/api
```