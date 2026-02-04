export const CONTRACT_STATUSES = [
  "문의",
  "예약확정",
  "체크아웃대기",
  "대여중",
  "연장요청",
  "반납대기",
  "종결",
  "취소",
  "노쇼",
];

export const CONTRACT_TERMINAL_STATUSES = new Set(["종결", "취소", "노쇼"]);

export const CONTRACT_STATUS_BADGE_TYPE = {
  문의: "contract-inquiry",
  예약확정: "contract-reserved",
  체크아웃대기: "contract-checkout-pending",
  대여중: "contract-active",
  연장요청: "contract-extension",
  반납대기: "contract-return-pending",
  종결: "contract-closed",
  취소: "contract-canceled",
  노쇼: "contract-no-show",
};

export const CONTRACT_ACTION_LABELS = {
  create_inquiry: "문의 등록",
  create_reserved: "예약 등록",
  confirm: "예약 확정",
  start_checkout: "체크아웃 시작",
  cancel: "취소",
  no_show: "노쇼 처리",
  handover: "인수 완료",
  request_extension: "연장 요청",
  initiate_return: "반납 접수",
  approve_extension: "연장 승인",
  reject_extension: "연장 거절",
  complete_inspection: "검수/정산 완료",
  cancel_return: "반납 취소",
};

export function getContractActionLabel(action) {
  return CONTRACT_ACTION_LABELS[action] || action || "-";
}

export function normalizeContractStatus(status) {
  if (!status) return "";
  const s = String(status).trim();
  if (s === "예약" || s === "예약중") return "예약확정";
  if (s === "완료") return "종결";
  return s;
}
