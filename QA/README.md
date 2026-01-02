# QA 테스트 가이드

이 폴더는 프로젝트의 QA 테스트 결과와 히스토리를 관리합니다.

## 폴더 구조

```
QA/
├── README.md (이 파일)
└── reports/
    └── YYYY-MM-DD/          # 테스트 수행 날짜
        ├── images/           # 스크린샷 및 캡처 이미지
        └── reports/          # 테스트 보고서 및 이슈 본문
```

## QA 테스트 수행 가이드

### 1. 테스트 준비

1. 테스트 날짜 폴더 생성:
   ```bash
   mkdir -p QA/reports/YYYY-MM-DD/images QA/reports/YYYY-MM-DD/reports
   ```

2. 테스트 환경 확인:
   - 개발 서버 실행 상태 확인
   - 테스트 계정 정보 확인
   - 브라우저 준비 (Chrome MCP 또는 Playwright MCP)

### 2. 테스트 수행

#### 테스트 범위 분류

QA 테스트는 다음 카테고리로 분류하여 수행합니다:

1. **기능 테스트 (Functional)**
   - 로그인/인증
   - CRUD 작업 (생성, 읽기, 수정, 삭제)
   - 폼 제출 및 유효성 검사
   - 네비게이션 및 라우팅

2. **UI/UX 테스트 (UI/UX)**
   - 레이아웃 및 반응형 디자인
   - 다크모드/라이트모드 적용
   - 접근성 (a11y)
   - 텍스트 오버플로우 및 요소 겹침

3. **성능 테스트 (Performance)**
   - 페이지 로딩 속도
   - API 응답 시간
   - 렌더링 성능

4. **호환성 테스트 (Compatibility)**
   - 브라우저 호환성
   - 반응형 디자인 (모바일/태블릿/데스크톱)

5. **보안 테스트 (Security)**
   - 인증/인가
   - 입력 검증
   - XSS/CSRF 방어

### 3. 이슈 발견 시

1. **스크린샷 저장**
   - 문제가 발생한 화면을 캡처
   - 파일명: `[카테고리]_[페이지명]_[문제요약].png`
   - 예: `ui-ux_dashboard_darkmode-modal.png`
   - 저장 위치: `QA/reports/YYYY-MM-DD/images/`

2. **이슈 본문 작성**
   - 파일명: `issue_[번호]_[간단한설명].md`
   - 저장 위치: `QA/reports/YYYY-MM-DD/reports/`
   - 형식:
     ```markdown
     ## 문제 설명
     [상세 설명
     
     ## 재현 단계
     1. [단계 1]
     2. [단계 2]
     
     ## 예상 동작
     [예상 동작]
     
     ## 실제 동작
     [실제 동작]
     
     ## 화면 캡처
     ![이미지 설명](images/[파일명].png)
     
     ## 환경
     - 브라우저: Chrome
     - URL: http://localhost:5173
     - 계정: [계정 정보]
     ```

3. **GitHub 이슈 생성**
   ```bash
   gh issue create \
     --title "[QA] [카테고리] [페이지명] [문제 설명]" \
     --label "bug,QA" \
     --body-file QA/reports/YYYY-MM-DD/reports/issue_[번호]_[설명].md \
     --repo ProjectPrometheusFindrive/Project_Prometheus_FE
   ```

4. **이미지 커밋 및 푸시**
   ```bash
   git add QA/reports/YYYY-MM-DD/images/
   git commit -m "docs(QA): [날짜] 테스트 스크린샷 추가"
   git push
   ```

5. **이슈 본문 업데이트**
   - 이미지가 저장소에 푸시된 후, 이슈 본문의 이미지 경로를 GitHub URL로 업데이트
   - 예: `![이미지 설명](https://github.com/ProjectPrometheusFindrive/Project_Prometheus_FE/blob/main/QA/reports/2026-01-02/images/...)`

### 4. 테스트 보고서 작성

테스트 완료 후 종합 보고서 작성:

- 파일명: `qa_report_YYYY-MM-DD.md`
- 저장 위치: `QA/reports/YYYY-MM-DD/reports/`
- 포함 내용:
  - 테스트 개요
  - 테스트 범위
  - 발견된 이슈 목록
  - 정상 작동한 기능
  - 성능 관찰
  - 권장 사항

## QA 히스토리 관리

### 날짜별 분류

각 테스트는 수행 날짜별로 폴더를 만들어 관리합니다:
- `QA/reports/2026-01-02/` - 2026년 1월 2일 테스트
- `QA/reports/2026-01-15/` - 2026년 1월 15일 테스트

### 카테고리별 분류

이슈 파일명에 카테고리 태그를 포함:
- `issue_90_functional_map-tiles.md` - 기능 테스트
- `issue_93_ui-ux_darkmode-modals.md` - UI/UX 테스트
- `issue_91_data_vehicle-date.md` - 데이터 문제

### 누적 관리

1. **이슈 목록 추적**
   - 각 날짜 폴더의 `reports/`에 생성된 이슈 목록 유지
   - 이슈 번호와 링크 기록

2. **테스트 커버리지**
   - 각 테스트에서 확인한 페이지/기능 목록 기록
   - 누적하여 전체 커버리지 파악

3. **회귀 테스트**
   - 이전에 발견된 이슈가 해결되었는지 재확인
   - 회귀 테스트 결과도 같은 구조로 저장

## 예시

### 2026-01-02 테스트 예시

```
QA/reports/2026-01-02/
├── images/
│   ├── issue_90_map-tiles.png
│   ├── issue_91_vehicle-date.png
│   ├── issue_92_faq-duplicate.png
│   └── issue_93_darkmode-modals.png
└── reports/
    ├── issue_90_map-tiles.md
    ├── issue_91_vehicle-date.md
    ├── issue_92_faq-duplicate.md
    ├── issue_93_darkmode-modals.md
    └── qa_report_2026-01-02.md
```

## 주의사항

1. **이미지 파일 크기**: 가능하면 최적화하여 저장
2. **민감 정보**: 스크린샷에 민감한 정보가 포함되지 않도록 주의
3. **Git 관리**: 이미지 파일도 Git에 커밋하여 히스토리 관리
4. **이슈 링크**: 생성된 GitHub 이슈 링크를 보고서에 포함

## 참고

- GitHub 이슈 생성: `gh issue create --help`
- 이미지 최적화: 필요시 이미지 압축 도구 사용
- 테스트 자동화: 향후 CI/CD 파이프라인에 통합 고려
