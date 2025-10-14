// Korean vehicle plate utilities
// - Validation supports common modern formats:
//   - 12가3456, 123가4567
//   - Optional region prefix: 서울12가3456 등
//   - Ignores spaces and hyphens in user input

const REGION_PREFIX = /(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/;

export function normalizeKoreanPlate(input) {
  const s = String(input || "").trim();
  if (!s) return "";
  // Remove spaces and hyphens between segments
  return s.replace(/[\s-]+/g, "");
}

export function isValidKoreanPlate(input) {
  const raw = String(input || "").trim();
  if (!raw) return false;
  const value = normalizeKoreanPlate(raw);

  // New/modern formats: NN가NNNN or NNN가NNNN with optional region prefix
  // Allow any Hangul letter in middle to cover private/rental/taxi series found in data (예: 부, 허 등)
  const core = /^(\d{2,3})[가-힣](\d{4})$/;
  if (core.test(value)) return true;

  // With region prefix directly attached (no space after normalization)
  const withRegion = new RegExp(`^${REGION_PREFIX.source}\\d{2,3}[가-힣]\\d{4}$`);
  return withRegion.test(value);
}

// HTML pattern string for <input pattern="..."> (no slashes/flags)
// Avoid character classes that conflict with the HTML pattern's /v flag by using alternations.
// - Separator: zero or more spaces or hyphens
const SEP = `(?:(?:\\x20|-))*`;
// - Hangul letter: use Unicode property to be compatible with /v
const HANGUL_LETTER = `\\p{Script=Hangul}`;
export const KOREAN_PLATE_PATTERN = `^(?:${REGION_PREFIX.source})?${SEP}\\d{2,3}${SEP}${HANGUL_LETTER}${SEP}\\d{4}$`;
