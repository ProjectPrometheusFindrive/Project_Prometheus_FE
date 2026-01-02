## 문제 설명
고객센터 페이지(`/support`)의 "자주 묻는 질문" 섹션에서 "결제 관련 문의는 어떻게 하나요?" 질문이 중복되어 나타납니다.

## 재현 단계
1. 로그인 후 프로필 메뉴에서 "고객센터" 클릭
2. 페이지 오른쪽의 "자주 묻는 질문" 섹션 확인
3. "결제 관련 문의는 어떻게 하나요?" 질문이 두 번 나타나는지 확인

## 예상 동작
각 질문은 한 번만 나타나야 합니다.

## 실제 동작
"결제 관련 문의는 어떻게 하나요?" 질문이 두 번 나타납니다.

## 화면 캡처
![FAQ 중복 질문](https://raw.githubusercontent.com/ProjectPrometheusFindrive/Project_Prometheus_FE/main/QA/reports/2026-01-02/images/issue_92_faq-duplicate.png)

## 환경
- 브라우저: Chrome
- URL: http://localhost:5173/#/support
- 계정: ppfd@ppfd.com

## 추가 정보
- FAQ 데이터 소스에서 중복 제거 필요
- 또는 렌더링 로직에서 중복 체크 필요
