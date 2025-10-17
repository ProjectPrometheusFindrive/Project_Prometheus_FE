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

## 폴더 구조(요약)
```
src/
  api/         components/    pages/      utils/      constants/   assets/
```

## 라이선스
본 저장소의 코드는 서비스 운영 목적에 한해 사용됩니다.

