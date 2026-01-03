# QA 테스트 인덱스 - 2026-01-02

## 테스트 요약
- **테스트 일자**: 2026-01-02
- **테스트 유형**: 회귀 테스트, 미수행 테스트 케이스 수행, Open 이슈 재확인, 고객센터 테스트
- **발견된 이슈 수**: 6건 (기존 이슈 재확인 + 신규 발견)
- **새로 발견된 이슈**: 2건 (#95, #96)

## 생성된 이슈 목록

| 이슈 번호 | 카테고리 | 제목 | 상태 |
|---------|---------|------|------|
| [#90](https://github.com/ProjectPrometheusFindrive/Project_Prometheus_FE/issues/90) | 기능 | 회사정보설정 - 지도 타일 일부 로딩 실패 | Open (해결 확인) |
| [#91](https://github.com/ProjectPrometheusFindrive/Project_Prometheus_FE/issues/91) | 데이터 | 자산등록관리 - 차량등록일이 모두 '70.01.01로 표시됨 | Closed (해결 확인) |
| [#92](https://github.com/ProjectPrometheusFindrive/Project_Prometheus_FE/issues/92) | UI/UX | 고객센터 - FAQ 질문 중복 표시 | Open (여전히 문제) |
| [#93](https://github.com/ProjectPrometheusFindrive/Project_Prometheus_FE/issues/93) | UI/UX | 다크모드 - 일부 모달에 다크모드 미적용 | Open (여전히 문제) |
| [#95](https://github.com/ProjectPrometheusFindrive/Project_Prometheus_FE/issues/95) | 기능 | 고객센터 - 내용 입력 필드 없음 | Open (신규) |
| [#96](https://github.com/ProjectPrometheusFindrive/Project_Prometheus_FE/issues/96) | UI/UX | 고객센터 - 화면 하단 잘림 | Open (신규) |

## 테스트된 페이지

- ✅ Dashboard (`/dashboard`)
- ✅ 자산등록관리 (`/assets`)
- ✅ 계약등록관리 (`/rentals/table`)
- ✅ 매출관리 (`/revenue`)
- ✅ 회사정보설정 (`/settings`)
- ✅ 회원관리 (`/members`)
- ✅ 고객센터 (`/support`)

## 테스트된 모달

- ✅ 로고관리 모달 (CiUploadModal) - 다크모드 미적용 발견
- ✅ 터미널 요청 모달 (TerminalRequestModal) - 다크모드 미적용 발견
- ✅ 계약등록 모달 (RentalCreateModal) - 다크모드 미적용 발견
- ✅ 권한 변경 모달 (RoleChangeModal) - 다크모드 정상 적용

## 파일 구조

```
QA/reports/2026-01-02/
├── INDEX.md (이 파일)
├── images/
│   ├── issue_90_map-tiles.png
│   ├── issue_91_vehicle-date.png
│   ├── issue_92_faq-duplicate.png
│   ├── issue_93_darkmode-logo-modal.png
│   ├── issue_93_darkmode-terminal-modal.png
│   ├── issue_93_darkmode-rental-modal.png
│   ├── functional_signup_invalid-email-short-password.png
│   ├── functional_signup_password-mismatch.png
│   ├── functional_error-handling_offline-mode.png
│   ├── security_signup_xss-email-attempt.png
│   ├── security_signup_sql-injection-email-attempt.png
│   ├── ui-ux_dashboard_darkmode.png
│   ├── ui-ux_assets_darkmode.png
│   ├── ui-ux_rentals_darkmode.png
│   ├── ui-ux_revenue_darkmode.png
│   ├── ui-ux_settings_darkmode.png
│   ├── ui-ux_members_darkmode.png
│   ├── ui-ux_support_darkmode.png
│   ├── ui-ux_modal_logo-management_darkmode.png
│   ├── ui-ux_modal_terminal-request_darkmode.png
│   ├── ui-ux_modal_rental-create_darkmode.png
│   ├── ui-ux_modal_role-change_darkmode.png
│   ├── compatibility_dashboard_mobile-375px.png
│   ├── compatibility_dashboard_tablet-768px.png
│   └── regression_issue-*.png (회귀 테스트)
└── reports/
    ├── issue_90_map-tiles.md
    ├── issue_91_vehicle-date.md
    ├── issue_92_faq-duplicate.md
    ├── issue_93_darkmode-modals.md
    └── qa_report_2026-01-02.md
```

## 상세 보고서

- 전체 테스트 결과: [qa_report_2026-01-02.md](reports/qa_report_2026-01-02.md)
- 회귀 테스트 결과: [regression_test_2026-01-02.md](reports/regression_test_2026-01-02.md)
- 종합 QA 테스트 결과: [qa_comprehensive_test_2026-01-02.md](reports/qa_comprehensive_test_2026-01-02.md)
