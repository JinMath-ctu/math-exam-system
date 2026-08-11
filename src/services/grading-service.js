'use strict';

const examRepository = require('../repositories/exam-repository');
const attemptRepository = require('../repositories/attempt-repository');
const answerRepository = require('../repositories/answer-repository');
const incidentRepository = require('../repositories/incident-repository');
const withTransaction = require('../utils/with-transaction');
const { AppError, ERROR_CODES } = require('../utils/errors');
const { parseStatementSelections } = require('../utils/dung-sai-scoring');

function groupOptionsByQuestion(options) {
  const grouped = new Map();
  options.forEach((option) => {
    const key = String(option.cau_hoi_id);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(option);
  });
  return grouped;
}

function getGradingPolicy(exam, attempt, hasPendingIncident = false) {
  if (Boolean(exam.da_cong_bo_ket_qua)) {
    return {
      allowed: false,
      code: ERROR_CODES.CONFLICT,
      reason: 'Kết quả đã được công bố, điểm số hiện chỉ được phép xem và không thể chỉnh sửa.',
    };
  }

  if (attempt.trang_thai === 'DANG_LAM') {
    return {
      allowed: false,
      code: ERROR_CODES.VALIDATION_ERROR,
      reason: 'Học sinh chưa nộp bài, chưa thể chấm.',
    };
  }

  if (hasPendingIncident) {
    return {
      allowed: false,
      code: ERROR_CODES.CONFLICT,
      reason: 'Lượt làm đang có báo cáo sự cố chờ xử lý. Hãy xử lý sự cố trước khi chấm bài.',
    };
  }

  return { allowed: true, code: null, reason: null };
}

function assertCanGrade(exam, attempt, hasPendingIncident = false) {
  const policy = getGradingPolicy(exam, attempt, hasPendingIncident);
  if (!policy.allowed) {
    throw new AppError(policy.reason, policy.code);
  }
}

async function listAttemptsForExam(examId, giaoVienId, query) {
  const exam = await examRepository.findByIdForTeacher(examId, giaoVienId);
  if (!exam) {
    throw new AppError('Không tìm thấy đề thi.', ERROR_CODES.NOT_FOUND);
  }

  const [assignedClasses, result, attemptStatuses, pendingIncidentCount] = await Promise.all([
    examRepository.listAssignedClasses(examId),
    attemptRepository.listByExam(examId, {
      trangThai: query.trangThai || null,
      lopHocId: query.lopHocId ? Number(query.lopHocId) : null,
      page: query.page,
      limit: query.limit,
    }),
    examRepository.listAttemptStatuses(examId),
    incidentRepository.countPendingForExam(examId),
  ]);

  const { summarizeAttemptStatuses, describePublishResultsReadiness } = require('./exam-service').__testables;
  const publishResultsStatus = describePublishResultsReadiness(
    exam,
    summarizeAttemptStatuses(attemptStatuses),
    Date.now(),
    Number(pendingIncidentCount) || 0,
  );

  return { exam, assignedClasses, publishResultsStatus, ...result };
}

async function getGradeView(attemptId, giaoVienId) {
  const attempt = await attemptRepository.findByIdForTeacher(attemptId, giaoVienId);
  if (!attempt) {
    throw new AppError('Không tìm thấy lượt làm bài.', ERROR_CODES.NOT_FOUND);
  }

  const [essayQuestions, reviewRows, hasPendingIncident] = await Promise.all([
    attemptRepository.listEssayQuestionsForGrading(attemptId),
    attemptRepository.listResultQuestions(attemptId),
    incidentRepository.hasPending(attemptId),
  ]);

  const choiceQuestionIds = reviewRows
    .filter((row) => row.loai_cau_hoi === 'MOT_DAP_AN' || row.loai_cau_hoi === 'DUNG_SAI')
    .map((row) => row.cau_hoi_id);
  const optionsByQuestion = groupOptionsByQuestion(
    await answerRepository.findByQuestionIds(choiceQuestionIds),
  );
  const reviewQuestions = reviewRows.map((row) => ({
    ...row,
    options: optionsByQuestion.get(String(row.cau_hoi_id)) || [],
    statementSelections: row.loai_cau_hoi === 'DUNG_SAI'
      ? parseStatementSelections(row.noi_dung_tra_loi)
      : {},
  }));

  const gradingPolicy = getGradingPolicy(
    { da_cong_bo_ket_qua: attempt.da_cong_bo_ket_qua },
    attempt,
    hasPendingIncident,
  );

  return {
    attempt,
    essayQuestions,
    reviewQuestions,
    canGrade: gradingPolicy.allowed,
    gradingBlockedReason: gradingPolicy.reason,
  };
}

function parseGrades(gradesInput, essayQuestions) {
  const essayMap = new Map(essayQuestions.map((q) => [String(q.cau_hoi_id), q]));
  const entries = Object.entries(gradesInput || {});
  const parsed = [];

  for (const [cauHoiIdStr, data] of entries) {
    const question = essayMap.get(cauHoiIdStr);
    if (!question || data == null) {
      continue;
    }

    if (data.diemDatDuoc === undefined || data.diemDatDuoc === null || data.diemDatDuoc === '') {
      continue;
    }

    const diem = Number(data.diemDatDuoc);
    const max = Number(question.diem);
    if (!Number.isFinite(diem) || diem < 0 || diem > max) {
      throw new AppError(`Điểm câu hỏi phải trong khoảng 0 đến ${max}.`, ERROR_CODES.VALIDATION_ERROR);
    }

    const nhanXet = data.nhanXet ? String(data.nhanXet).trim().slice(0, 2000) : null;
    parsed.push({ cauHoiId: question.cau_hoi_id, diem, nhanXet, diemToiDa: Number(question.diem) });
  }

  return parsed;
}

async function gradeAttempt(attemptId, giaoVienId, gradesInput) {
  // Chỉ đọc trước để lấy de_thi_id. Mọi quyết định và ghi điểm đều được kiểm tra lại
  // trong transaction với thứ tự khóa thống nhất: de_thi -> luot_lam_bai.
  const ownedAttempt = await attemptRepository.findByIdForTeacher(attemptId, giaoVienId);
  if (!ownedAttempt) {
    throw new AppError('Không tìm thấy lượt làm bài.', ERROR_CODES.NOT_FOUND);
  }

  return withTransaction(async (connection) => {
    // Công bố kết quả cũng khóa đề trước rồi mới khóa các lượt làm. Dùng cùng thứ
    // tự để tránh deadlock và bảo đảm không thể sửa điểm sau khi công bố.
    const exam = await examRepository.findByIdForTeacherForUpdate(
      connection,
      ownedAttempt.de_thi_id,
      giaoVienId,
    );
    if (!exam) {
      throw new AppError('Không tìm thấy đề thi.', ERROR_CODES.NOT_FOUND);
    }

    const attempt = await attemptRepository.findByIdForUpdate(connection, attemptId);
    if (!attempt || Number(attempt.de_thi_id) !== Number(exam.id)) {
      throw new AppError('Không tìm thấy lượt làm bài.', ERROR_CODES.NOT_FOUND);
    }

    const hasPendingIncident = await incidentRepository.hasPending(attempt.id, connection);
    assertCanGrade(exam, attempt, hasPendingIncident);

    const essayQuestions = await attemptRepository.listEssayQuestionsForGrading(
      attempt.id,
      connection,
    );
    if (essayQuestions.length === 0) {
      throw new AppError('Lượt làm này không có câu tự luận cần chấm.', ERROR_CODES.VALIDATION_ERROR);
    }

    const parsed = parseGrades(gradesInput, essayQuestions);
    if (parsed.length === 0) {
      throw new AppError('Vui lòng nhập điểm cho ít nhất một câu.', ERROR_CODES.VALIDATION_ERROR);
    }

    for (const item of parsed) {
      // eslint-disable-next-line no-await-in-loop
      await attemptRepository.upsertEssayGrade(
        connection,
        attemptId,
        item.cauHoiId,
        item.diem,
        item.nhanXet,
        item.diemToiDa,
      );
    }

    await attemptRepository.recalcTuLuanScores(connection, attemptId);

    const total = await attemptRepository.countEssayTotal(connection, attemptId);
    const graded = await attemptRepository.countEssayGraded(connection, attemptId);

    let becameGraded = false;
    if (total > 0 && total === graded) {
      becameGraded = await attemptRepository.markDaChamIfSubmitted(connection, attemptId);
    }

    return { attemptId, becameGraded };
  });
}

module.exports = {
  listAttemptsForExam,
  getGradeView,
  gradeAttempt,
  __testables: {
    getGradingPolicy,
    assertCanGrade,
  },
};
