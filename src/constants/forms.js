export const STATUS_OPTIONS = [
    { value: "자산등록 완료", label: "자산등록 완료" },
    { value: "보험등록 완료", label: "보험등록 완료" },
    { value: "장비장착 완료", label: "장비장착 완료" },
    { value: "장비장착 대기", label: "장비장착 대기" },
    { value: "미등록", label: "미등록" }
];

export const MANAGEMENT_STAGE_OPTIONS = [
    { value: "대여중", label: "대여중" },
    { value: "대여가능", label: "대여가능" },
    { value: "예약중", label: "예약중" },
    { value: "입고 대상", label: "입고 대상" },
    { value: "수리/점검 중", label: "수리/점검 중" },
    { value: "수리/점검 완료", label: "수리/점검 완료" }
];

export const ISSUE_TYPE_OPTIONS = [
    { value: "overdue", label: "반납 지연" },
    { value: "stolen", label: "도난 의심" },
    { value: "damage", label: "파손" },
    { value: "other", label: "기타" }
];

export const SEVERITY_OPTIONS = [
    { value: "low", label: "낮음" },
    { value: "medium", label: "보통" },
    { value: "high", label: "높음" }
];