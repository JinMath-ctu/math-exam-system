'use strict';

const incidentRepository = require('../repositories/incident-repository');
const attemptRepository = require('../repositories/attempt-repository');
const examRepository = require('../repositories/exam-repository');
const withTransaction = require('../utils/with-transaction');
const { toMysqlDatetime, dateToMysqlDatetime } = require('../utils/datetime');
const { AppError, ERROR_CODES } = require('../utils/errors');

const LOAI_SU_CO_VALUES = ['MAT_DIEN', 'MAT_MANG', 'LOI_TRINH_DUYET', 'LOI_HE_THONG', 'KHAC'];
const MAX_BU_GIO_SECONDS = 7200;

function assertIncidentCanBeCreated(exam, attempt) {
  if (Boolean(exam.da_cong_bo_ket_qua)) {
    throw new AppError(
      'Kết quả đã được công bố, không thể gửi thêm báo cáo sự cố.',
      ERROR_CODES.CONFLICT,
    );
  }

  if (attempt.trang_thai === 'DA_CHAM') {
    throw new AppError(
      'Lượt làm bài đã được chấm hoàn tất, không thể gửi thêm báo cáo sự cố.',
      ERROR_CODES.CONFLICT,
    );
  }
}

function assertIncidentCanBeApproved(exam, attempt) {
  if (Boolean(exam.da_cong_bo_ket_qua)) {
    throw new AppError(
      'Kết quả đã được công bố, không thể bù giờ hoặc mở lại lượt làm.',
      ERROR_CODES.CONFLICT,
    );
  }

  if (attempt.trang_thai === 'DA_CHAM') {
    throw new AppError(
      'Lượt làm bài đã được chấm hoàn tất, không thể bù giờ hoặc mở lại.',
      ERROR_CODES.CONFLICT,
    );
  }
}

// Với lượt đã hết hạn, số giây ghi vào buffer cần gồm cả quãng từ deadline cũ
// tới thời điểm duyệt. Nhờ đó học sinh thực sự còn đủ số giây giáo viên cấp
// sau khi mở lại, thay vì bị auto-submit ngay lập tức.
function computeBufferIncrement(attempt, grantedSeconds, nowMs = Date.now()) {
  const deadlineMs = new Date(attempt.han_nop).getTime()
    + Number(attempt.thoi_gian_bo_sung_giay || 0) * 1000;
  const bridgeSeconds = Number.isFinite(deadlineMs)
    ? Math.max(0, Math.ceil((nowMs - deadlineMs) / 1000))
    : 0;
  return grantedSeconds + bridgeSeconds;
}

async function reportIncident(attemptId, hocSinhId, body) {
  const candidate = await attemptRepository.findByIdForStudentWithExam(attemptId, hocSinhId);
  if (!candidate) {
    throw new AppError('Không tìm thấy lượt làm bài.', ERROR_CODES.NOT_FOUND);
  }

  const loaiSuCo = String(body.loaiSuCo || '').trim();
  if (!LOAI_SU_CO_VALUES.includes(loaiSuCo)) {
    throw new AppError('Loại sự cố không hợp lệ.', ERROR_CODES.VALIDATION_ERROR);
  }

  const batDauLuc = body.batDauLuc ? toMysqlDatetime(body.batDauLuc) : null;
  const ketThucLuc = body.ketThucLuc ? toMysqlDatetime(body.ketThucLuc) : null;
  const moTa = body.moTa ? String(body.moTa).trim().slice(0, 2000) : null;

  return withTransaction(async (connection) => {
    // Mọi luồng tạo/giải quyết/công bố dùng cùng thứ tự khóa:
    // de_thi -> luot_lam_bai -> su_co_bai_thi.
    const exam = await examRepository.findByIdForUpdate(connection, candidate.de_thi_id);
    if (!exam) {
      throw new AppError('Không tìm thấy đề thi liên quan.', ERROR_CODES.NOT_FOUND);
    }

    const attempt = await attemptRepository.findByIdForUpdate(connection, candidate.id);
    if (
      !attempt
      || Number(attempt.hoc_sinh_id) !== Number(hocSinhId)
      || Number(attempt.de_thi_id) !== Number(exam.id)
    ) {
      throw new AppError('Không tìm thấy lượt làm bài.', ERROR_CODES.NOT_FOUND);
    }

    assertIncidentCanBeCreated(exam, attempt);

    const hasPending = await incidentRepository.hasPending(attempt.id, connection);
    if (hasPending) {
      throw new AppError('Bạn đã có báo cáo sự cố đang chờ xử lý cho lượt làm này.', ERROR_CODES.CONFLICT);
    }

    return incidentRepository.createStudentReport({
      luotLamBaiId: attempt.id,
      loaiSuCo,
      batDauLuc,
      ketThucLuc,
      moTa,
    }, connection);
  });
}

async function listForTeacher(giaoVienId, query) {
  return incidentRepository.listForTeacher(giaoVienId, {
    trangThai: query.trangThai || null,
    examId: query.examId ? Number(query.examId) : null,
    page: query.page,
    limit: query.limit,
  });
}

async function listForStudentAttempt(attemptId, hocSinhId) {
  const attempt = await attemptRepository.findByIdForOwner(attemptId, hocSinhId);
  if (!attempt) {
    throw new AppError('Không tìm thấy lượt làm bài.', ERROR_CODES.NOT_FOUND);
  }
  return incidentRepository.listForStudentAttempt(attempt.id, hocSinhId);
}

async function getDetailForTeacher(incidentId, giaoVienId) {
  const incident = await incidentRepository.findByIdForTeacher(incidentId, giaoVienId);
  if (!incident) {
    throw new AppError('Không tìm thấy sự cố.', ERROR_CODES.NOT_FOUND);
  }
  return incident;
}

async function approveIncident(incidentId, giaoVienId, body) {
  const owned = await incidentRepository.findByIdForTeacher(incidentId, giaoVienId);
  if (!owned) {
    throw new AppError('Không tìm thấy sự cố.', ERROR_CODES.NOT_FOUND);
  }

  const soGiayBuGio = Number(body.soGiayBuGio);
  if (!Number.isInteger(soGiayBuGio) || soGiayBuGio <= 0 || soGiayBuGio > MAX_BU_GIO_SECONDS) {
    throw new AppError(
      `Số giây bù giờ phải là số nguyên dương, tối đa ${MAX_BU_GIO_SECONDS} giây.`,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  const lyDoXuLy = body.lyDoXuLy ? String(body.lyDoXuLy).trim().slice(0, 1000) : null;

  // Cùng thứ tự khóa với báo sự cố, từ chối và công bố kết quả:
  // de_thi -> luot_lam_bai -> su_co_bai_thi.
  const result = await withTransaction(async (connection) => {
    const exam = await examRepository.findByIdForTeacherForUpdate(connection, owned.de_thi_id, giaoVienId);
    if (!exam) {
      throw new AppError('Không tìm thấy đề thi liên quan.', ERROR_CODES.NOT_FOUND);
    }

    const attempt = await attemptRepository.findByIdForUpdate(connection, owned.luot_lam_bai_id);
    if (!attempt || Number(attempt.de_thi_id) !== Number(exam.id)) {
      throw new AppError('Không tìm thấy lượt làm bài liên quan.', ERROR_CODES.NOT_FOUND);
    }

    const incident = await incidentRepository.findByIdForUpdate(connection, incidentId);
    if (!incident || Number(incident.luot_lam_bai_id) !== Number(attempt.id)) {
      throw new AppError('Không tìm thấy sự cố.', ERROR_CODES.NOT_FOUND);
    }

    assertIncidentCanBeApproved(exam, attempt);

    const approved = await incidentRepository.approve(connection, incidentId, { soGiayBuGio, lyDoXuLy });
    if (!approved) {
      throw new AppError('Sự cố này đã được xử lý trước đó.', ERROR_CODES.INCIDENT_ALREADY_REVIEWED);
    }

    const now = new Date();
    const bufferIncrementSeconds = computeBufferIncrement(attempt, soGiayBuGio, now.getTime());
    await attemptRepository.addBuGioSeconds(connection, attempt.id, bufferIncrementSeconds);

    let reopened = false;
    if (attempt.trang_thai === 'DA_NOP' || attempt.trang_thai === 'TU_DONG_NOP') {
      reopened = await attemptRepository.reopenIfSubmitted(connection, attempt.id, {
        lastSeenAt: dateToMysqlDatetime(now),
      });
      if (reopened) {
        await attemptRepository.resetGradesForReopen(connection, attempt.id);
        await attemptRepository.logEvent(connection, attempt.id, 'MO_LAI_SAU_SU_CO', 'Mở lại bài làm sau khi duyệt sự cố', {
          incidentId,
          soGiayBuGio,
          bufferIncrementSeconds,
        });
      }
    }

    return { attemptId: attempt.id, reopened, bufferIncrementSeconds };
  });

  return { incidentId, soGiayBuGio, ...result };
}

async function rejectIncident(incidentId, giaoVienId, body) {
  const owned = await incidentRepository.findByIdForTeacher(incidentId, giaoVienId);
  if (!owned) {
    throw new AppError('Không tìm thấy sự cố.', ERROR_CODES.NOT_FOUND);
  }

  const lyDoXuLy = String(body.lyDoXuLy || '').trim();
  if (!lyDoXuLy) {
    throw new AppError('Vui lòng nhập lý do từ chối.', ERROR_CODES.VALIDATION_ERROR);
  }

  return withTransaction(async (connection) => {
    const exam = await examRepository.findByIdForTeacherForUpdate(connection, owned.de_thi_id, giaoVienId);
    if (!exam) {
      throw new AppError('Không tìm thấy đề thi liên quan.', ERROR_CODES.NOT_FOUND);
    }

    const attempt = await attemptRepository.findByIdForUpdate(connection, owned.luot_lam_bai_id);
    if (!attempt || Number(attempt.de_thi_id) !== Number(exam.id)) {
      throw new AppError('Không tìm thấy lượt làm bài liên quan.', ERROR_CODES.NOT_FOUND);
    }

    const incident = await incidentRepository.findByIdForUpdate(connection, incidentId);
    if (!incident || Number(incident.luot_lam_bai_id) !== Number(attempt.id)) {
      throw new AppError('Không tìm thấy sự cố.', ERROR_CODES.NOT_FOUND);
    }

    const rejected = await incidentRepository.reject(connection, incidentId, {
      lyDoXuLy: lyDoXuLy.slice(0, 1000),
    });
    if (!rejected) {
      throw new AppError('Sự cố này đã được xử lý trước đó.', ERROR_CODES.INCIDENT_ALREADY_REVIEWED);
    }

    return incidentId;
  });
}

module.exports = {
  reportIncident,
  listForStudentAttempt,
  listForTeacher,
  getDetailForTeacher,
  approveIncident,
  rejectIncident,
  __testables: {
    assertIncidentCanBeCreated,
    assertIncidentCanBeApproved,
    computeBufferIncrement,
  },
};
