'use strict';

/**
 * Thang điểm câu Đúng/Sai 4 mệnh đề (kiểu THPT):
 * 0 sai → 1.0×điểm | 1 sai → 0.5 | 2 sai → 0.25 | 3 sai → 0.1 | 4 sai → 0
 * Mệnh đề bỏ trống tính là sai.
 */

const DUNG_SAI_STATEMENT_COUNT = 4;
const DUNG_SAI_LABELS = ['a', 'b', 'c', 'd'];

const DUNG_SAI_SCORE_MULTIPLIER = Object.freeze({
  0: 1,
  1: 0.5,
  2: 0.25,
  3: 0.1,
  4: 0,
});

function roundScore(value) {
  return Math.round(Number(value) * 100) / 100;
}

function parseStatementSelections(raw) {
  if (raw == null || raw === '') {
    return {};
  }

  let payload = raw;
  if (typeof raw === 'string') {
    try {
      payload = JSON.parse(raw);
    } catch {
      return {};
    }
  }

  const source = payload && typeof payload === 'object'
    ? (payload.selections && typeof payload.selections === 'object' ? payload.selections : payload)
    : {};

  const selections = {};
  Object.keys(source).forEach((key) => {
    const value = source[key];
    if (value === true || value === false) {
      selections[String(key)] = value;
    } else if (value === 'true' || value === '1' || value === 1) {
      selections[String(key)] = true;
    } else if (value === 'false' || value === '0' || value === 0) {
      selections[String(key)] = false;
    }
  });

  return selections;
}

function serializeStatementSelections(selections) {
  const normalized = {};
  Object.keys(selections || {}).forEach((key) => {
    const value = selections[key];
    if (value === true || value === false) {
      normalized[String(key)] = value;
    }
  });
  return JSON.stringify({ selections: normalized });
}

/**
 * @param {Array<{id:number|string, la_dap_an_dung:boolean}>} statements
 * @param {Record<string, boolean>} selections map dap_an.id → true(Đúng)/false(Sai)
 * @param {number} maxScore
 */
function gradeDungSaiStatements(statements, selections, maxScore) {
  const list = Array.isArray(statements) ? statements : [];
  let wrong = 0;

  list.forEach((statement) => {
    const key = String(statement.id);
    const selected = selections[key];
    const correctIsTrue = Boolean(statement.la_dap_an_dung);
    if (selected !== true && selected !== false) {
      wrong += 1;
      return;
    }
    if (selected !== correctIsTrue) {
      wrong += 1;
    }
  });

  // Nếu thiếu/thừa mệnh đề so với chuẩn 4, vẫn chấm theo số sai đã đếm,
  // nhưng kẹp wrong trong [0,4] để lấy hệ số.
  const wrongClamped = Math.min(DUNG_SAI_STATEMENT_COUNT, Math.max(0, wrong));
  const multiplier = DUNG_SAI_SCORE_MULTIPLIER[wrongClamped];
  const diem = roundScore(Number(maxScore) * multiplier);

  return {
    wrong: wrongClamped,
    multiplier,
    diem,
    laDung: wrongClamped === 0 && list.length === DUNG_SAI_STATEMENT_COUNT,
  };
}

module.exports = {
  DUNG_SAI_STATEMENT_COUNT,
  DUNG_SAI_LABELS,
  DUNG_SAI_SCORE_MULTIPLIER,
  parseStatementSelections,
  serializeStatementSelections,
  gradeDungSaiStatements,
  roundScore,
};
