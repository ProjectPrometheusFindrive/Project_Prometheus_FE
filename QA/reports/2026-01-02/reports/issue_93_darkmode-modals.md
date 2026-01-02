## 문제 설명
다크모드에서 일부 모달이 라이트 모드 스타일로 표시됩니다. 애플리케이션의 메인 UI는 다크모드가 적용되어 있지만, 모달 창은 밝은 배경과 어두운 텍스트로 표시되어 시각적 일관성이 깨집니다.

## 재현 단계
1. 로그인 후 다크모드로 전환 (테마 토글 버튼 클릭)
2. 다음 모달들을 열어서 확인:
   - 로고관리 모달 (프로필 메뉴 > 로고관리)
   - 터미널 요청 모달 (Dashboard > 단말기 설치 요청하기)
   - 계약등록 모달 (계약등록관리 > 계약등록)

## 예상 동작
모든 모달이 다크모드에서 어두운 배경과 밝은 텍스트로 표시되어야 합니다.

## 실제 동작
다음 모달들이 다크모드에서도 라이트 모드 스타일로 표시됩니다:
- 로고관리 모달: 흰색 배경, 어두운 텍스트
- 터미널 요청 모달: 흰색 배경, 어두운 텍스트
- 계약등록 모달: 흰색 배경, 어두운 텍스트

## 화면 캡처

### 로고관리 모달
![로고관리 모달 다크모드 미적용](https://raw.githubusercontent.com/ProjectPrometheusFindrive/Project_Prometheus_FE/main/QA/reports/2026-01-02/images/issue_93_darkmode-logo-modal.png)

### 터미널 요청 모달
![터미널 요청 모달 다크모드 미적용](https://raw.githubusercontent.com/ProjectPrometheusFindrive/Project_Prometheus_FE/main/QA/reports/2026-01-02/images/issue_93_darkmode-terminal-modal.png)

### 계약등록 모달
![계약등록 모달 다크모드 미적용](https://raw.githubusercontent.com/ProjectPrometheusFindrive/Project_Prometheus_FE/main/QA/reports/2026-01-02/images/issue_93_darkmode-rental-modal.png)

## 환경
- 브라우저: Chrome
- URL: http://localhost:5173
- 계정: ppfd@ppfd.com
- 테마: 다크모드

## 추가 정보
- 권한 변경 모달은 다크모드가 정상적으로 적용되어 있음
- 모달 컴포넌트의 다크모드 스타일 적용 로직 확인 필요
- 영향을 받는 모달:
  1. 로고관리 모달 (CiUploadModal)
  2. 터미널 요청 모달 (TerminalRequestModal)
  3. 계약등록 모달 (RentalCreateModal)
