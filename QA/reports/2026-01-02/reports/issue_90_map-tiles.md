## 문제 설명
회사정보설정 페이지(`/settings`)에서 카카오 지도 타일 일부가 로딩에 실패합니다. 네트워크 요청에서 `ERR_ABORTED` 오류가 발생하여 지도 일부 영역이 제대로 표시되지 않을 수 있습니다.

## 재현 단계
1. 로그인 후 프로필 메뉴에서 "회사정보설정" 클릭
2. 페이지 로드 후 지도 영역 확인
3. 브라우저 개발자 도구의 Network 탭 확인

## 예상 동작
모든 지도 타일이 정상적으로 로드되어 지도가 완전히 표시되어야 합니다.

## 실제 동작
일부 지도 타일 요청이 `ERR_ABORTED` 오류로 실패합니다. 예:
- `http://mts.daumcdn.net/api/v1/tile/PNG02/v16_t7v9r/latest/7/124/55.png` - ERR_ABORTED
- `http://mts.daumcdn.net/api/v1/tile/PNG02/v16_t7v7r/latest/7/126/58.png` - ERR_ABORTED

## 화면 캡처
![지도 타일 로딩 실패](images/issue_90_map-tiles.png)

## 환경
- 브라우저: Chrome
- URL: http://localhost:5173/#/settings
- 계정: ppfd@ppfd.com

## 추가 정보
네트워크 탭에서 확인된 실패한 요청들:
- 일부 타일 이미지 요청이 중단됨
- 재시도 로직이 작동하지 않거나, 타임아웃 설정이 너무 짧을 수 있음
