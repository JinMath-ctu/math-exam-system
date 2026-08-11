'use strict';

const examRepository = require('../repositories/exam-repository');
const examQuestionRepository = require('../repositories/exam-question-repository');
const questionRepository = require('../repositories/question-repository');
const attemptRepository = require('../repositories/attempt-repository');
const incidentRepository = require('../repositories/incident-repository');
const withTransaction = require('../utils/with-transaction');
const { toMysqlDatetime, dateToMysqlDatetime } = require('../utils/datetime');
const { AppError, ERROR_CODES } = require('../utils/errors');

// "SAP_MO" (chưa đến giờ mở), "DANG_MO" (trong khung giờ mở), "DA_DONG" (đã
// quá giờ đóng đề) — suy ra từ thời gian, không lưu cứng (xem service-rules.md mục 1).
function computeTimeStatus(thoiGianBatDau, thoiGianKetThuc, nowMs = Date.now()) {
  if (nowMs < new Date(thoiGianBatDau).getTime()) {
    return 'SAP_MO';
  }
  if (nowMs > new Date(thoiGianKetThuc).getTime()) {
    return 'DA_DONG';
  }
  return 'DANG_MO';
}

function summarizeAttemptStatuses(attempts) {
  return attempts.reduce((summary, attempt) => {
    const status = attempt.trang_thai;
    summary.total += 1;
    summary[status] = (summary[status] || 0) + 1;
    return summary;
  }, {
    total: 0,
    DANG_LAM: 0,
    DA_NOP: 0,
    TU_DONG_NOP: 0,
    DA_CHAM: 0,
  });
}

function assertCanPublishResults(exam, attemptStatusCounts, nowMs = Date.now(), pendingIncidentCount = 0) {
  if (exam.trang_thai !== 'DA_CONG_BO') {
    throw new AppError('Chỉ có thể công bố kết quả cho đề đã công bố.', ERROR_CODES.EXAM_NOT_EDITABLE);
  }

  if (Boolean(exam.da_cong_bo_ket_qua)) {
    throw new AppError('Kết quả của đề thi đã được công bố trước đó.', ERROR_CODES.CONFLICT);
  }

  if (attemptStatusCounts.DANG_LAM > 0) {
    throw new AppError(
      'Còn lượt làm bài đang diễn ra, chưa thể công bố kết quả.',
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  const ungraded = attemptStatusCounts.DA_NOP + attemptStatusCounts.TU_DONG_NOP;
  if (ungraded > 0) {
    throw new AppError(
      'Còn lượt làm bài chưa chấm xong, chưa thể công bố kết quả.',
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  if (pendingIncidentCount > 0) {
    throw new AppError(
      'Còn sự cố đang chờ xử lý, chưa thể công bố kết quả.',
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  const endMs = new Date(exam.thoi_gian_ket_thuc).getTime();
  const examClosed = Number.isFinite(endMs) && nowMs > endMs;
  const gradedCount = Number(attemptStatusCounts.DA_CHAM) || 0;

  // Sau giờ đóng: được công bố kể cả khi chưa ai làm.
  // Trước giờ đóng: cho công bố sớm khi mọi bài đã nộp và đã chấm xong.
  if (!examClosed && gradedCount === 0) {
    throw new AppError(
      'Chưa đến giờ đóng đề. Có thể công bố sớm sau khi đã có bài nộp và mọi bài đã được chấm xong.',
      ERROR_CODES.VALIDATION_ERROR,
    );
  }
}

function describePublishResultsReadiness(exam, attemptStatusCounts, nowMs = Date.now(), pendingIncidentCount = 0) {
  if (exam.trang_thai !== 'DA_CONG_BO') {
    return { canPublish: false, blockers: ['Đề chưa được công bố cho học sinh.'] };
  }
  if (Boolean(exam.da_cong_bo_ket_qua)) {
    return { canPublish: false, blockers: ['Kết quả đã được công bố.'] };
  }

  const blockers = [];
  const endMs = new Date(exam.thoi_gian_ket_thuc).getTime();
  const examClosed = Number.isFinite(endMs) && nowMs > endMs;
  const gradedCount = Number(attemptStatusCounts.DA_CHAM) || 0;
  const ungraded = (Number(attemptStatusCounts.DA_NOP) || 0)
    + (Number(attemptStatusCounts.TU_DONG_NOP) || 0);
  const inProgress = Number(attemptStatusCounts.DANG_LAM) || 0;

  if (inProgress > 0) {
    blockers.push(`Còn ${inProgress} lượt đang làm bài.`);
  }
  if (ungraded > 0) {
    blockers.push(`Còn ${ungraded} bài đã nộp chưa chấm xong (cần chấm tự luận nếu có).`);
  }
  if (pendingIncidentCount > 0) {
    blockers.push(`Còn ${pendingIncidentCount} sự cố chờ xử lý.`);
  }
  if (!examClosed && gradedCount === 0) {
    blockers.push('Chưa đến giờ đóng đề và chưa có bài đã chấm để công bố sớm.');
  }

  return {
    canPublish: blockers.length === 0,
    blockers,
    examClosed,
    gradedCount,
    ungradedCount: ungraded,
    inProgressCount: inProgress,
  };
}

function toBoolean(value) {
  return value === 'on' || value === 'true' || value === true || value === '1' || value === 1;
}

function normalizeExamMeta(body) {
  const thoiGianBatDau = toMysqlDatetime(body.thoiGianBatDau);
  const thoiGianKetThuc = toMysqlDatetime(body.thoiGianKetThuc);

  if (!thoiGianBatDau || !thoiGianKetThuc) {
    throw new AppError('Thời gian mở/đóng đề là bắt buộc.', ERROR_CODES.VALIDATION_ERROR);
  }

  if (new Date(thoiGianKetThuc) <= new Date(thoiGianBatDau)) {
    throw new AppError('Giờ đóng đề phải sau giờ mở đề.', ERROR_CODES.VALIDATION_ERROR);
  }

  const thoiLuongPhut = Number(body.thoiLuongPhut);
  if (!Number.isFinite(thoiLuongPhut) || thoiLuongPhut <= 0) {
    throw new AppError('Thời lượng làm bài phải lớn hơn 0.', ERROR_CODES.VALIDATION_ERROR);
  }

  const soLanDuocLam = body.soLanDuocLam ? Number(body.soLanDuocLam) : 1;
  if (!Number.isInteger(soLanDuocLam) || soLanDuocLam <= 0) {
    throw new AppError('Số lần được làm phải là số nguyên dương.', ERROR_CODES.VALIDATION_ERROR);
  }

  return {
    tenDe: String(body.tenDe || '').trim(),
    moTa: body.moTa ? String(body.moTa).trim() : null,
    thoiLuongPhut,
    thoiGianBatDau,
    thoiGianKetThuc,
    soLanDuocLam,
    tronCauHoi: toBoolean(body.tronCauHoi),
    choXemDapAn: toBoolean(body.choXemDapAn),
  };
}

async function assertOwnedEditableExam(examId, giaoVienId) {
  const exam = await examRepository.findByIdForTeacher(examId, giaoVienId);
  if (!exam) {
    throw new AppError('Không tìm thấy đề thi.', ERROR_CODES.NOT_FOUND);
  }

  if (exam.trang_thai !== 'NHAP') {
    throw new AppError(
      'Chỉ có thể sửa cấu trúc đề khi đề đang ở trạng thái Nháp.',
      ERROR_CODES.EXAM_NOT_EDITABLE,
    );
  }

  return exam;
}

async function syncTongDiem(connection, examId) {
  const total = await examQuestionRepository.sumScore(connection, examId);
  await examRepository.updateTongDiem(connection, examId, total);
  return total;
}

async function listExams(giaoVienId, query) {
  return examRepository.list({
    giaoVienId,
    trangThai: query.trangThai || null,
    q: query.q ? String(query.q).trim() : null,
    page: query.page,
    limit: query.limit,
  });
}

function parseSelectedQuestions(body) {
  let ids = body.cauHoiIds;
  if (ids == null || ids === '') {
    return [];
  }
  if (!Array.isArray(ids)) {
    ids = [ids];
  }

  const diemMap = extractDiemCauHoiFromBody(body);
  const seen = new Set();
  const selected = [];

  for (const rawId of ids) {
    const cauHoiId = Number(rawId);
    if (!Number.isInteger(cauHoiId) || cauHoiId <= 0 || seen.has(cauHoiId)) {
      continue;
    }
    seen.add(cauHoiId);

    const diemRaw = diemMap[cauHoiId] ?? diemMap[String(cauHoiId)];
    const diem = diemRaw === undefined || diemRaw === null || diemRaw === ''
      ? null
      : Number(diemRaw);

    if (diem != null && (!Number.isFinite(diem) || diem <= 0)) {
      throw new AppError(
        `Điểm của câu hỏi #${cauHoiId} phải lớn hơn 0.`,
        ERROR_CODES.VALIDATION_ERROR,
      );
    }

    selected.push({ cauHoiId, diem });
  }

  return selected;
}

async function resolveSelectedQuestions(giaoVienId, body) {
  const selected = parseSelectedQuestions(body);
  const resolved = [];

  for (const item of selected) {
    const question = await questionRepository.findByIdForTeacher(item.cauHoiId, giaoVienId);
    if (!question || question.trang_thai !== 'HOAT_DONG') {
      throw new AppError(
        `Câu hỏi #${item.cauHoiId} không tồn tại hoặc đã ngừng sử dụng.`,
        ERROR_CODES.VALIDATION_ERROR,
      );
    }

    let diem = item.diem;
    if (diem == null) {
      diem = Number(question.diem_mac_dinh);
    }
    if (!Number.isFinite(diem) || diem <= 0) {
      throw new AppError(
        `Điểm của câu hỏi #${item.cauHoiId} phải lớn hơn 0.`,
        ERROR_CODES.VALIDATION_ERROR,
      );
    }

    resolved.push({ cauHoiId: item.cauHoiId, diem });
  }

  return resolved;
}

async function listActiveQuestions(giaoVienId) {
  const result = await questionRepository.list({
    giaoVienId,
    trangThai: 'HOAT_DONG',
    page: 1,
    limit: 200,
  });
  return result.rows;
}

async function createExam(giaoVienId, body) {
  const fields = normalizeExamMeta(body);
  const selected = await resolveSelectedQuestions(giaoVienId, body);

  return withTransaction(async (connection) => {
    const examId = await examRepository.create({ giaoVienId, ...fields }, connection);

    let thuTuGoc = 1;
    for (const item of selected) {
      await examQuestionRepository.add(connection, {
        deThiId: examId,
        cauHoiId: item.cauHoiId,
        diem: item.diem,
        thuTuGoc,
      });
      thuTuGoc += 1;
    }

    if (selected.length > 0) {
      await syncTongDiem(connection, examId);
    }

    return { examId, questionCount: selected.length };
  });
}

async function getExamDetail(examId, giaoVienId) {
  const exam = await examRepository.findByIdForTeacher(examId, giaoVienId);
  if (!exam) {
    throw new AppError('Không tìm thấy đề thi.', ERROR_CODES.NOT_FOUND);
  }

  const [examQuestions, assignedClasses, activeClasses, questionBank, attemptCount, attemptStatuses, pendingIncidentCount] = await Promise.all([
    examQuestionRepository.listByExam(examId),
    examRepository.listAssignedClasses(examId),
    examRepository.listActiveClassesByTeacher(giaoVienId),
    questionRepository.list({ giaoVienId, trangThai: 'HOAT_DONG', page: 1, limit: 200 }),
    examRepository.countAttempts(examId),
    examRepository.listAttemptStatuses(examId),
    incidentRepository.countPendingForExam(examId),
  ]);

  const usedQuestionIds = new Set(examQuestions.map((row) => Number(row.cau_hoi_id)));
  const assignedClassIds = new Set(assignedClasses.map((row) => Number(row.lop_hoc_id)));

  const availableQuestions = questionBank.rows.filter((question) => !usedQuestionIds.has(Number(question.id)));
  const availableClasses = activeClasses.filter((klass) => !assignedClassIds.has(Number(klass.id)));
  const attemptStatusCounts = summarizeAttemptStatuses(attemptStatuses);
  const publishResultsStatus = describePublishResultsReadiness(
    exam,
    attemptStatusCounts,
    Date.now(),
    Number(pendingIncidentCount) || 0,
  );

  return {
    exam,
    examQuestions,
    assignedClasses,
    availableClasses,
    availableQuestions,
    attemptCount,
    isEditable: exam.trang_thai === 'NHAP',
    trangThaiThoiGian: computeTimeStatus(exam.thoi_gian_bat_dau, exam.thoi_gian_ket_thuc),
    publishResultsStatus,
  };
}

async function updateExam(examId, giaoVienId, body) {
  const exam = await assertOwnedEditableExam(examId, giaoVienId);
  const fields = normalizeExamMeta(body);
  await examRepository.updateMeta(exam.id, fields);
  return exam.id;
}

async function addQuestion(examId, giaoVienId, body) {
  const exam = await assertOwnedEditableExam(examId, giaoVienId);

  let selected = await resolveSelectedQuestions(giaoVienId, body);
  if (selected.length === 0 && body.cauHoiId) {
    const cauHoiId = Number(body.cauHoiId);
    const diem = Number(body.diem);
    if (!cauHoiId) {
      throw new AppError('Vui lòng chọn câu hỏi cần thêm.', ERROR_CODES.VALIDATION_ERROR);
    }
    if (!Number.isFinite(diem) || diem <= 0) {
      throw new AppError('Điểm câu hỏi phải lớn hơn 0.', ERROR_CODES.VALIDATION_ERROR);
    }
    selected = await resolveSelectedQuestions(giaoVienId, {
      cauHoiIds: [cauHoiId],
      diemCauHoi: { [cauHoiId]: diem },
    });
  }

  if (selected.length === 0) {
    throw new AppError('Vui lòng chọn ít nhất một câu hỏi cần thêm.', ERROR_CODES.VALIDATION_ERROR);
  }

  for (const item of selected) {
    const existing = await examQuestionRepository.findOne(exam.id, item.cauHoiId);
    if (existing) {
      throw new AppError(`Câu hỏi #${item.cauHoiId} đã có trong đề thi.`, ERROR_CODES.CONFLICT);
    }
  }

  await withTransaction(async (connection) => {
    let thuTuGoc = await examQuestionRepository.nextThuTu(connection, exam.id);
    for (const item of selected) {
      await examQuestionRepository.add(connection, {
        deThiId: exam.id,
        cauHoiId: item.cauHoiId,
        diem: item.diem,
        thuTuGoc,
      });
      thuTuGoc += 1;
    }
    await syncTongDiem(connection, exam.id);
  });

  return { examId: exam.id, questionCount: selected.length };
}

async function updateQuestionScore(examId, giaoVienId, cauHoiId, diem) {
  const exam = await assertOwnedEditableExam(examId, giaoVienId);

  const score = Number(diem);
  if (!Number.isFinite(score) || score <= 0) {
    throw new AppError('Điểm câu hỏi phải lớn hơn 0.', ERROR_CODES.VALIDATION_ERROR);
  }

  await withTransaction(async (connection) => {
    const updated = await examQuestionRepository.updateScore(connection, exam.id, cauHoiId, score);
    if (!updated) {
      throw new AppError('Câu hỏi không thuộc đề thi này.', ERROR_CODES.NOT_FOUND);
    }
    await syncTongDiem(connection, exam.id);
  });

  return exam.id;
}

async function updateQuestionScores(examId, giaoVienId, body) {
  const exam = await assertOwnedEditableExam(examId, giaoVienId);
  const scoreMap = extractDiemCauHoiFromBody(body);
  const entries = Object.entries(scoreMap);

  if (entries.length === 0) {
    throw new AppError('Không có điểm nào để lưu.', ERROR_CODES.VALIDATION_ERROR);
  }

  const scores = [];
  for (const [cauHoiIdRaw, diemRaw] of entries) {
    const cauHoiId = Number(cauHoiIdRaw);
    const score = Number(diemRaw);
    if (!Number.isInteger(cauHoiId) || cauHoiId < 1) {
      throw new AppError('Câu hỏi không hợp lệ.', ERROR_CODES.VALIDATION_ERROR);
    }
    if (!Number.isFinite(score) || score <= 0) {
      throw new AppError('Điểm câu hỏi phải lớn hơn 0.', ERROR_CODES.VALIDATION_ERROR);
    }
    scores.push({ cauHoiId, score });
  }

  await withTransaction(async (connection) => {
    for (const item of scores) {
      const updated = await examQuestionRepository.updateScore(
        connection,
        exam.id,
        item.cauHoiId,
        item.score,
      );
      if (!updated) {
        throw new AppError('Câu hỏi không thuộc đề thi này.', ERROR_CODES.NOT_FOUND);
      }
    }
    await syncTongDiem(connection, exam.id);
  });

  return exam.id;
}

/**
 * Lấy map điểm từ body form.
 * Ưu tiên field phẳng `diemCauHoi_123` (tránh Express 5/qs biến
 * `diemCauHoi[123]` thành mảng và mất id). Vẫn hỗ trợ object lồng.
 */
function extractDiemCauHoiFromBody(body) {
  const map = {};
  if (!body || typeof body !== 'object') {
    return map;
  }

  Object.assign(map, normalizeDiemCauHoiMap(body.diemCauHoi));

  Object.entries(body).forEach(([key, value]) => {
    const matched = String(key).match(/^diemCauHoi_(\d+)$/);
    if (!matched) {
      return;
    }
    if (value === undefined || value === null || value === '') {
      return;
    }
    map[matched[1]] = value;
  });

  return map;
}

/** Chuẩn hóa diemCauHoi lồng (legacy) thành { [cauHoiId]: diem }. */
function normalizeDiemCauHoiMap(raw) {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const map = {};
  const put = (key, value) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    const matched = String(key).match(/^(?:id)?(\d+)$/i);
    if (!matched) {
      return;
    }
    map[matched[1]] = value;
  };

  if (Array.isArray(raw)) {
    // Không tin tưởng chỉ số mảng là id (qs đã gom và mất id thật).
    return map;
  }

  Object.entries(raw).forEach(([key, value]) => {
    put(key, value);
  });
  return map;
}

async function removeQuestion(examId, giaoVienId, cauHoiId) {
  const exam = await assertOwnedEditableExam(examId, giaoVienId);

  await withTransaction(async (connection) => {
    const removed = await examQuestionRepository.remove(connection, exam.id, cauHoiId);
    if (!removed) {
      throw new AppError('Câu hỏi không thuộc đề thi này.', ERROR_CODES.NOT_FOUND);
    }
    await syncTongDiem(connection, exam.id);
  });

  return exam.id;
}

async function assignClass(examId, giaoVienId, lopHocId) {
  const exam = await examRepository.findByIdForTeacher(examId, giaoVienId);
  if (!exam) {
    throw new AppError('Không tìm thấy đề thi.', ERROR_CODES.NOT_FOUND);
  }

  if (exam.trang_thai === 'DA_HUY') {
    throw new AppError('Đề thi đã hủy, không thể giao cho lớp.', ERROR_CODES.EXAM_NOT_EDITABLE);
  }

  const lopId = Number(lopHocId);
  if (!lopId) {
    throw new AppError('Vui lòng chọn lớp cần giao đề.', ERROR_CODES.VALIDATION_ERROR);
  }

  const klass = await examRepository.findClassOwnedByTeacher(lopId, giaoVienId);
  if (!klass) {
    throw new AppError('Không tìm thấy lớp học.', ERROR_CODES.NOT_FOUND);
  }

  if (klass.trang_thai !== 'HOAT_DONG') {
    throw new AppError('Lớp đã lưu trữ, không thể giao đề mới.', ERROR_CODES.VALIDATION_ERROR);
  }

  try {
    await examRepository.assignClass(exam.id, lopId);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new AppError('Lớp này đã được giao đề thi này.', ERROR_CODES.CONFLICT);
    }
    throw error;
  }

  return exam.id;
}

async function unassignClass(examId, giaoVienId, lopHocId) {
  const exam = await examRepository.findByIdForTeacher(examId, giaoVienId);
  if (!exam) {
    throw new AppError('Không tìm thấy đề thi.', ERROR_CODES.NOT_FOUND);
  }

  if (exam.trang_thai === 'DA_HUY') {
    throw new AppError('Đề thi đã hủy, không thể hủy giao lớp.', ERROR_CODES.EXAM_NOT_EDITABLE);
  }

  const lopId = Number(lopHocId);
  if (!lopId) {
    throw new AppError('Vui lòng chọn lớp cần hủy giao.', ERROR_CODES.VALIDATION_ERROR);
  }

  const assignment = await examRepository.findAssignment(exam.id, lopId);
  if (!assignment) {
    throw new AppError('Lớp này chưa được giao đề thi.', ERROR_CODES.NOT_FOUND);
  }

  const attemptCount = await examRepository.countAttemptsForClass(exam.id, lopId);
  if (Number(attemptCount) > 0) {
    throw new AppError(
      'Lớp đã có lượt làm bài với đề này, không thể hủy giao.',
      ERROR_CODES.EXAM_HAS_ATTEMPTS,
    );
  }

  const removed = await examRepository.removeAssignment(exam.id, lopId);
  if (!removed) {
    throw new AppError('Không thể hủy giao lớp.', ERROR_CODES.CONFLICT);
  }

  return exam.id;
}

async function publishExam(examId, giaoVienId) {
  const exam = await examRepository.findByIdForTeacher(examId, giaoVienId);
  if (!exam) {
    throw new AppError('Không tìm thấy đề thi.', ERROR_CODES.NOT_FOUND);
  }

  if (exam.trang_thai !== 'NHAP') {
    throw new AppError('Chỉ có thể công bố đề đang ở trạng thái Nháp.', ERROR_CODES.EXAM_NOT_EDITABLE);
  }

  const questionCount = await examQuestionRepository.count(exam.id);
  if (questionCount === 0) {
    throw new AppError('Đề thi cần có ít nhất 1 câu hỏi trước khi công bố.', ERROR_CODES.VALIDATION_ERROR);
  }

  const assignedCount = await examRepository.countAssignedClasses(exam.id);
  if (assignedCount === 0) {
    throw new AppError('Đề thi cần được giao cho ít nhất 1 lớp trước khi công bố.', ERROR_CODES.VALIDATION_ERROR);
  }

  const sumDiem = await examQuestionRepository.sumScore(null, exam.id);
  if (sumDiem <= 0) {
    throw new AppError('Tổng điểm đề thi không hợp lệ.', ERROR_CODES.VALIDATION_ERROR);
  }

  if (new Date(exam.thoi_gian_ket_thuc).getTime() <= Date.now()) {
    throw new AppError('Giờ đóng đề phải ở tương lai để công bố.', ERROR_CODES.VALIDATION_ERROR);
  }

  if (exam.thoi_luong_phut <= 0) {
    throw new AppError('Thời lượng làm bài không hợp lệ.', ERROR_CODES.VALIDATION_ERROR);
  }

  await withTransaction(async (connection) => {
    await syncTongDiem(connection, exam.id);
  });
  await examRepository.setTrangThai(exam.id, 'DA_CONG_BO');

  return exam.id;
}

async function cancelExam(examId, giaoVienId) {
  const exam = await examRepository.findByIdForTeacher(examId, giaoVienId);
  if (!exam) {
    throw new AppError('Không tìm thấy đề thi.', ERROR_CODES.NOT_FOUND);
  }

  if (exam.trang_thai === 'DA_HUY') {
    throw new AppError('Đề thi đã bị hủy trước đó.', ERROR_CODES.CONFLICT);
  }

  await examRepository.setTrangThai(exam.id, 'DA_HUY');
  return exam.id;
}

async function deleteExam(examId, giaoVienId) {
  return withTransaction(async (connection) => {
    const exam = await examRepository.findByIdForTeacherForUpdate(connection, examId, giaoVienId);
    if (!exam) {
      throw new AppError('Không tìm thấy đề thi.', ERROR_CODES.NOT_FOUND);
    }

    assertExamHardDeleteAllowed({ trangThai: exam.trang_thai });

    // Có lịch sử làm bài: xóa lượt làm trước (CASCADE chi tiết/log/sự cố), rồi mới xóa đề.
    await examRepository.deleteAttemptsByExam(connection, exam.id);

    const deleted = await examRepository.deleteOwned(connection, exam.id, giaoVienId);
    if (!deleted) {
      throw new AppError('Không thể xóa đề thi.', ERROR_CODES.CONFLICT);
    }

    return exam.id;
  });
}

function assertExamHardDeleteAllowed({ trangThai }) {
  if (trangThai === 'DA_CONG_BO') {
    throw new AppError(
      'Đề đang công bố không thể xóa. Hãy hủy công bố trước, rồi mới xóa.',
      ERROR_CODES.EXAM_NOT_EDITABLE,
    );
  }

  if (trangThai !== 'NHAP' && trangThai !== 'DA_HUY') {
    throw new AppError('Chỉ được xóa đề nháp hoặc đề đã hủy.', ERROR_CODES.VALIDATION_ERROR);
  }
}

async function publishResults(examId, giaoVienId, body) {
  return withTransaction(async (connection) => {
    const exam = await examRepository.findByIdForTeacherForUpdate(connection, examId, giaoVienId);
    if (!exam) {
      throw new AppError('Không tìm thấy đề thi.', ERROR_CODES.NOT_FOUND);
    }

    const attempts = await examRepository.listAttemptStatusesForUpdate(connection, exam.id);
    const pendingIncidents = await incidentRepository.listPendingForExamForUpdate(connection, exam.id);
    const statusCounts = summarizeAttemptStatuses(attempts);
    const now = new Date();
    assertCanPublishResults(exam, statusCounts, now.getTime(), pendingIncidents.length);

    const choXemDapAn = body && Object.prototype.hasOwnProperty.call(body, 'choXemDapAn')
      ? toBoolean(body.choXemDapAn)
      : Boolean(exam.cho_xem_dap_an);

    const published = await examRepository.publishResults(connection, exam.id, {
      thoiGianCongBoKetQua: dateToMysqlDatetime(now),
      choXemDapAn,
    });

    if (!published) {
      throw new AppError('Kết quả của đề thi đã được công bố trước đó.', ERROR_CODES.CONFLICT);
    }

    return exam.id;
  });
}

// Danh sách đề đã giao cho lớp mà học sinh đang tham gia — dùng cho
// GET /student/exams (xem docs/service-rules.md mục 2).
async function listAssignedExams(hocSinhId) {
  const rows = await examRepository.listAssignedForStudent(hocSinhId);
  const now = Date.now();

  return rows.map((row) => ({
    ...row,
    trang_thai_thoi_gian: computeTimeStatus(row.thoi_gian_bat_dau, row.thoi_gian_ket_thuc, now),
  }));
}

// Chi tiết một đề đã giao cho học sinh: chỉ trả về nếu học sinh thuộc ít nhất
// một lớp đã được giao đề này (không lộ sự tồn tại của đề nếu không liên quan).
async function getAssignedExamDetail(examId, hocSinhId) {
  const exam = await examRepository.findById(examId);
  if (!exam || exam.trang_thai === 'NHAP') {
    throw new AppError('Không tìm thấy đề thi.', ERROR_CODES.NOT_FOUND);
  }

  const classes = await examRepository.listAssignedClassesForStudent(examId, hocSinhId);
  if (classes.length === 0) {
    throw new AppError('Không tìm thấy đề thi.', ERROR_CODES.NOT_FOUND);
  }

  const attempts = await attemptRepository.listByExamAndStudent(examId, hocSinhId);
  if (exam.trang_thai === 'DA_HUY' && attempts.length === 0) {
    throw new AppError('Không tìm thấy đề thi.', ERROR_CODES.NOT_FOUND);
  }

  const activeAttempt = attempts.find((attempt) => attempt.trang_thai === 'DANG_LAM') || null;

  return {
    exam,
    classes,
    attempts,
    activeAttempt,
    trangThaiThoiGian: computeTimeStatus(exam.thoi_gian_bat_dau, exam.thoi_gian_ket_thuc),
    remainingAttempts: Math.max(0, exam.so_lan_duoc_lam - attempts.length),
  };
}

module.exports = {
  listExams,
  listActiveQuestions,
  createExam,
  getExamDetail,
  updateExam,
  addQuestion,
  updateQuestionScore,
  updateQuestionScores,
  removeQuestion,
  assignClass,
  unassignClass,
  publishExam,
  cancelExam,
  deleteExam,
  publishResults,
  listAssignedExams,
  getAssignedExamDetail,
  __testables: {
    summarizeAttemptStatuses,
    assertCanPublishResults,
    describePublishResultsReadiness,
    assertExamHardDeleteAllowed,
    parseSelectedQuestions,
  },
};
