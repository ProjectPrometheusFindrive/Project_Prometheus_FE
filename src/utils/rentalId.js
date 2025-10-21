// Utilities to generate rental contract IDs
// Format: 10-digit biz + '-' + plate (2 digits + qwerty-keys of Hangul + 4 digits) + '-' + YYMMDD-HHMMSS

import { digitsOnly } from "./formatters";

const CHOSEONG_KEYS = [
  "r","R","s","e","E","f","a","q","Q","t","T","d","w","W","c","z","x","v","g"
];
const JUNGSEONG_KEYS = [
  "k","o","i","O","j","p","u","P","h","hk","ho","hl","y","n","nj","np","nl","b","m","ml","l"
];
const JONGSEONG_KEYS = [
  "",
  "r","R","rt","s","sw","sg","e","f","fr","fa","fq","ft","fx","fv","fg","a","q","qt","t","T","d","w","c","z","x","v","g"
];

function hangulSyllableToKeys(ch) {
  const code = ch.codePointAt(0);
  if (code < 0xac00 || code > 0xd7a3) return ch.replace(/[^\x00-\x7F]/g, "");
  const n = code - 0xac00;
  const ci = Math.floor(n / (21 * 28));
  const vi = Math.floor((n % (21 * 28)) / 28);
  const ti = n % 28;
  const c = CHOSEONG_KEYS[ci] || "";
  const v = JUNGSEONG_KEYS[vi] || "";
  const t = JONGSEONG_KEYS[ti] || "";
  return c + v + t;
}

export function hangulToQwertyKeys(str) {
  return String(str || "")
    .split("")
    .map(hangulSyllableToKeys)
    .join("");
}

export function extractPlateCore(plate) {
  const s = String(plate || "").replace(/[\s-]+/g, "");
  const m = s.match(/(\d{2,3})([가-힣])(\d{4})/);
  if (!m) return { two: "00", roman: "xx", four: "0000" };
  const leading = (m[1] || "00");
  const two = leading.length == 3 ? leading : leading.slice(-2);
  const roman = hangulToQwertyKeys(m[2] || "가") || "xx";
  const four = (m[3] || "0000").padStart(4, "0").slice(-4);
  return { two, roman, four };
}

export function formatTimestampForContract(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const HH = String(d.getHours()).padStart(2, "0");
  const MM = String(d.getMinutes()).padStart(2, "0");
  const SS = String(d.getSeconds()).padStart(2, "0");
  return `${yy}${mm}${dd}-${HH}${MM}${SS}`;
}

export function generateContractNumber({ bizRegNo = "", plate = "", date = new Date() } = {}) {
  const biz = digitsOnly(bizRegNo).padEnd(10, "0").slice(0, 10);
  const { two, roman, four } = extractPlateCore(plate);
  const ts = formatTimestampForContract(date);
  return `${biz}-${two}${roman}${four}-${ts}`;
}

export default generateContractNumber;
