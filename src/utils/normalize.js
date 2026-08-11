'use strict';

/**
 * Chuẩn hóa chuỗi trả lời ngắn (so khớp văn bản).
 * Không thay dấu phẩy ở đây — phần số xử lý riêng trong parseNumericAnswer.
 */
function normalizeShortAnswer(value) {
  if (value == null) {
    return '';
  }

  return String(value)
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Phân tích giá trị số từ chuỗi học sinh/giáo viên.
 * Hỗ trợ: 5 ; 0.5 ; 0,5 ; 1/2 ; -3/4 ; 1 1/2 ; \frac{1}{2}
 * @returns {number|null}
 */
function parseNumericAnswer(value) {
  if (value == null) {
    return null;
  }

  let raw = String(value).trim().toLowerCase();
  if (!raw) {
    return null;
  }

  // Hỗ trợ phân số LaTeX đơn giản trước khi bỏ khoảng trắng
  const latex = raw.match(/^\\frac\{\s*(-?\d+(?:[.,]\d+)?)\s*\}\{\s*(-?\d+(?:[.,]\d+)?)\s*\}$/);
  if (latex) {
    const num = Number(String(latex[1]).replace(',', '.'));
    const den = Number(String(latex[2]).replace(',', '.'));
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
      return null;
    }
    return num / den;
  }

  // Hỗn số: "1 1/2" → 1.5
  const mixed = raw.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const whole = Number(mixed[1]);
    const num = Number(mixed[2]);
    const den = Number(mixed[3]);
    if (!Number.isFinite(whole) || !Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
      return null;
    }
    const sign = whole < 0 ? -1 : 1;
    return whole + sign * (num / den);
  }

  // Bỏ khoảng trắng còn lại; chuẩn hóa dấu phẩy thập phân VN → chấm
  raw = raw.replace(/\s+/g, '').replace(/,/g, '.');

  // Phân số a/b
  const frac = raw.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (frac) {
    const num = Number(frac[1]);
    const den = Number(frac[2]);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
      return null;
    }
    return num / den;
  }

  // Số nguyên / thập phân
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

function shortAnswersEqual(left, right) {
  const a = normalizeShortAnswer(left);
  const b = normalizeShortAnswer(right);
  if (a !== '' && a === b) {
    return true;
  }

  const numA = parseNumericAnswer(left);
  const numB = parseNumericAnswer(right);
  if (numA == null || numB == null) {
    return false;
  }

  return Math.abs(numA - numB) < 1e-9;
}

/**
 * So khớp đáp án học sinh với đáp án chuẩn.
 * Giáo viên có thể ghi nhiều dạng chấp nhận, cách nhau bằng | (ví dụ: 1/2|0.5|0,5).
 */
function matchesShortAnswerKey(studentAnswer, canonicalKey) {
  const student = String(studentAnswer == null ? '' : studentAnswer).trim();
  if (!student) {
    return false;
  }

  const keys = String(canonicalKey || '')
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);

  if (keys.length === 0) {
    return false;
  }

  return keys.some((key) => shortAnswersEqual(student, key));
}

module.exports = {
  normalizeShortAnswer,
  parseNumericAnswer,
  shortAnswersEqual,
  matchesShortAnswerKey,
};
