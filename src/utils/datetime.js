'use strict';

// Toàn bộ hệ thống thống nhất múi giờ +07:00 (xem service-rules.md mục 14).
// Cột DATETIME trả về từ mysql2 là đối tượng Date với mốc thời gian tuyệt đối
// (epoch) đã đúng, nhờ cấu hình `timezone: '+07:00'` ở config/database.js.
// Khi cần HIỂN THỊ lại giờ theo +07:00 (không phụ thuộc múi giờ máy chủ Node
// đang chạy), ta "dịch" thêm 7 giờ rồi đọc lại bằng các hàm getUTC*, thay vì
// dùng getHours()/getMonth() (vốn phụ thuộc múi giờ hệ điều hành).
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

function pad(value) {
  return String(value).padStart(2, '0');
}

function toVnParts(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const shifted = new Date(date.getTime() + VN_OFFSET_MS);

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
  };
}

function isValidWallTime(year, month, day, hour, minute, second = 0) {
  if (
    month < 1 || month > 12
    || day < 1 || day > 31
    || hour < 0 || hour > 23
    || minute < 0 || minute > 59
    || second < 0 || second > 59
  ) {
    return false;
  }

  const probe = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return (
    probe.getUTCFullYear() === year
    && probe.getUTCMonth() === month - 1
    && probe.getUTCDate() === day
    && probe.getUTCHours() === hour
    && probe.getUTCMinutes() === minute
    && probe.getUTCSeconds() === second
  );
}

// Dùng cho value của <input type="datetime-local">: "YYYY-MM-DDTHH:mm"
function toDatetimeInputValue(value) {
  if (!value) {
    return '';
  }

  const parts = toVnParts(value);
  if (!parts) {
    return '';
  }

  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

// Ô nhập form tiếng Việt: "dd/mm/yyyy HH:mm"
function toDatetimeVnInputValue(value) {
  if (!value) {
    return '';
  }

  if (value instanceof Date) {
    const parts = toVnParts(value);
    if (!parts) {
      return '';
    }
    return `${pad(parts.day)}/${pad(parts.month)}/${parts.year} ${pad(parts.hour)}:${pad(parts.minute)}`;
  }

  const raw = String(value).trim();

  const vnMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})/);
  if (vnMatch) {
    return `${pad(Number(vnMatch[1]))}/${pad(Number(vnMatch[2]))}/${vnMatch[3]} ${pad(Number(vnMatch[4]))}:${pad(Number(vnMatch[5]))}`;
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (isoMatch) {
    // Chuỗi tường đã là giờ tường VN (từ form/DB format), không cộng thêm offset.
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]} ${isoMatch[4]}:${isoMatch[5]}`;
  }

  const parts = toVnParts(raw);
  if (!parts) {
    return '';
  }
  return `${pad(parts.day)}/${pad(parts.month)}/${parts.year} ${pad(parts.hour)}:${pad(parts.minute)}`;
}

// Hiển thị cho người dùng: "HH:mm dd/mm/yyyy"
function formatDateTimeVN(value) {
  if (!value) {
    return '';
  }

  const parts = toVnParts(value);
  if (!parts) {
    return '';
  }

  return `${pad(parts.hour)}:${pad(parts.minute)} ${pad(parts.day)}/${pad(parts.month)}/${parts.year}`;
}

// Chuyển giá trị form ("dd/mm/yyyy HH:mm" hoặc "YYYY-MM-DDTHH:mm") sang
// "YYYY-MM-DD HH:mm:ss" để ghi thẳng vào cột DATETIME.
function toMysqlDatetime(inputValue) {
  if (!inputValue) {
    return null;
  }

  const raw = String(inputValue).trim();

  const vnMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (vnMatch) {
    const day = Number(vnMatch[1]);
    const month = Number(vnMatch[2]);
    const year = Number(vnMatch[3]);
    const hour = Number(vnMatch[4]);
    const minute = Number(vnMatch[5]);
    const second = Number(vnMatch[6] || 0);
    if (!isValidWallTime(year, month, day, hour, minute, second)) {
      return null;
    }
    return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
  }

  const normalized = raw.replace('T', ' ');

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00`;
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return normalized;
  }

  return null;
}

// Chuyển một đối tượng Date/giá trị bất kỳ (epoch đúng) sang chuỗi
// "YYYY-MM-DD HH:mm:ss" theo +07:00 — dùng để ghi tham số DATETIME thay cho
// SQL NOW() ở những câu lệnh chạy ngoài withTransaction (nơi mới có
// SET time_zone), để không phụ thuộc múi giờ mặc định của phiên MySQL.
function dateToMysqlDatetime(value) {
  const parts = toVnParts(value);
  if (!parts) {
    return null;
  }
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)} ${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`;
}

// Thời điểm hiện tại, dạng "YYYY-MM-DD HH:mm:ss" theo +07:00.
function nowMysqlDatetime() {
  return dateToMysqlDatetime(new Date());
}

// Chuỗi ISO-8601 có hậu tố "+07:00" tường minh (không dùng "Z"), dùng cho các
// trường serverTime/effectiveDeadline trả về API phòng thi — client tính lệch
// đồng hồ (offset) dựa trên chuỗi này thay vì tin tuyệt đối đồng hồ máy học sinh
// (xem docs/service-rules.md mục 3).
function toIso8601VN(value) {
  const parts = toVnParts(value);
  if (!parts) {
    return null;
  }
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}+07:00`;
}

module.exports = {
  toDatetimeInputValue,
  toDatetimeVnInputValue,
  formatDateTimeVN,
  toMysqlDatetime,
  dateToMysqlDatetime,
  nowMysqlDatetime,
  toIso8601VN,
};
