'use strict';

/**
 * Rút gọn nội dung câu hỏi cho bảng danh sách (không render KaTeX)
 * để chiều cao hàng đồng đều.
 */
function questionListPreview(text, maxLen = 110) {
  let plain = String(text || '')
    .replace(/\$\$[\s\S]*?\$\$/g, ' … ')
    .replace(/\\\[[\s\S]*?\\\]/g, ' … ')
    .replace(/\\\([\s\S]*?\\\)/g, ' … ')
    .replace(/\$[^$]*\$/g, ' … ')
    .replace(/\$+/g, ' ')
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1/$2)')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (plain.length <= maxLen) {
    return plain;
  }

  return `${plain.slice(0, maxLen).trim()}…`;
}

module.exports = {
  questionListPreview,
};
