'use strict';

const attemptRepository = require('../repositories/attempt-repository');
const examRepository = require('../repositories/exam-repository');
const examQuestionRepository = require('../repositories/exam-question-repository');
const classRepository = require('../repositories/class-repository');
const userRepository = require('../repositories/user-repository');
const answerRepository = require('../repositories/answer-repository');
const incidentRepository = require('../repositories/incident-repository');
const withTransaction = require('../utils/with-transaction');
const shuffle = require('../utils/shuffle');
const { matchesShortAnswerKey } = require('../utils/normalize');
const { dateToMysqlDatetime, toIso8601VN } = require('../utils/datetime');
const { AppError, ERROR_CODES } = require('../utils/errors');
const {
  DUNG_SAI_STATEMENT_COUNT,
  parseStatementSelections,
  serializeStatementSelections,
  gradeDungSaiStatements,
} = require('../utils/dung-sai-scoring');

// Ngưỡng gián đoạn heartbeat coi là "mất kết nối" (giây) — xem service-rules.md mục 9.
const HEARTBEAT_GAP_THRESHOLD_MS = 90 * 1000;

function toBool(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

/** Object rỗng {} không tính là đã gửi lựa chọn mệnh đề (client luôn có default). */
function hasMeaningfulStatementSelections(value) {
  return value != null
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.keys(value).length > 0;
}

function computeEffectiveDeadline(attempt) {
  return new Date(attempt.han_nop.getTime() + Number(attempt.thoi_gian_bo_sung_giay) * 1000);
}

function classifySubmission(attempt, requestedAuto, nowMs = Date.now()) {
  const effectiveDeadline = computeEffectiveDeadline(attempt);
  const deadlinePassed = nowMs >= effectiveDeadline.getTime();
  return {
    effectiveDeadline,
    deadlinePassed,
    shouldSubmit: !requestedAuto || deadlinePassed,
    isAutoSubmit: deadlinePassed,
  };
}

function groupAnswerOptionsByQuestion(answerRows) {
  const map = {};
  answerRows.forEach((row) => {
    const key = Number(row.cau_hoi_id);
    if (!map[key]) {
      map[key] = [];
    }
    map[key].push(row);
  });
  return map;
}

// ---------------------------------------------------------------------------
// Bắt đầu lượt làm bài (UC-HS-05)
// ---------------------------------------------------------------------------
async function startAttempt(examId, classId, hocSinhId) {
  return withTransaction(async (connection) => {
    // Khóa đề trước khi kiểm tra/tạo lượt làm để serialize với thao tác công bố
    // kết quả. Sau khi kết quả đã công bố tuyệt đối không được tạo lượt mới.
    const exam = await examRepository.findByIdForUpdate(connection, examId);
    if (!exam) {
      throw new AppError('Không tìm thấy đề thi.', ERROR_CODES.NOT_FOUND);
    }

    const user = await userRepository.findById(hocSinhId);
    if (!user || user.trang_thai !== 'HOAT_DONG') {
      throw new AppError('Tài khoản của bạn đã bị khóa, không thể làm bài.', ERROR_CODES.FORBIDDEN);
    }

    const membership = await classRepository.findMembershipForUpdate(classId, hocSinhId, connection);
    if (!membership || membership.trang_thai !== 'DANG_HOC') {
      throw new AppError('Bạn không phải là thành viên đang học của lớp này.', ERROR_CODES.NOT_CLASS_MEMBER);
    }

    const assignment = await examRepository.findAssignment(examId, classId, connection);
    if (!assignment) {
      throw new AppError('Đề thi chưa được giao cho lớp này.', ERROR_CODES.NOT_FOUND);
    }

    if (exam.trang_thai !== 'DA_CONG_BO') {
      throw new AppError('Đề thi chưa được công bố.', ERROR_CODES.EXAM_NOT_PUBLISHED);
    }

    if (Boolean(exam.da_cong_bo_ket_qua)) {
      throw new AppError('Kết quả đã được công bố, không thể bắt đầu lượt làm mới.', ERROR_CODES.EXAM_CLOSED);
    }

    const now = new Date();
    if (now.getTime() < exam.thoi_gian_bat_dau.getTime()) {
      throw new AppError('Chưa đến giờ mở đề thi.', ERROR_CODES.EXAM_TIME_NOT_OPEN);
    }
    if (now.getTime() > exam.thoi_gian_ket_thuc.getTime()) {
      throw new AppError('Đã quá giờ đóng đề thi.', ERROR_CODES.EXAM_CLOSED);
    }

    // Khóa toàn bộ lượt làm hiện có của học sinh cho đề này để tính lan_thu
    // chính xác và xử lý double-click một cách an toàn (idempotent).
    const existingAttempts = await attemptRepository.lockAttemptsForStart(connection, examId, hocSinhId);
    const activeAttempt = existingAttempts.find((attempt) => attempt.trang_thai === 'DANG_LAM');
    if (activeAttempt) {
      return { attempt: activeAttempt, isNew: false };
    }

    if (existingAttempts.length >= exam.so_lan_duoc_lam) {
      throw new AppError('Bạn đã hết số lần được làm đề thi này.', ERROR_CODES.ATTEMPT_LIMIT_REACHED);
    }

    const lanThu = existingAttempts.length + 1;
    const hanNopDate = new Date(Math.min(
      now.getTime() + exam.thoi_luong_phut * 60 * 1000,
      exam.thoi_gian_ket_thuc.getTime(),
    ));

    const attemptId = await attemptRepository.createAttempt(connection, {
      deThiId: examId,
      hocSinhId,
      lopHocId: classId,
      lanThu,
      thoiGianBatDau: dateToMysqlDatetime(now),
      hanNop: dateToMysqlDatetime(hanNopDate),
    });

    const examQuestions = await examQuestionRepository.listByExam(examId);
    if (examQuestions.length === 0) {
      throw new AppError('Đề thi chưa có câu hỏi, không thể bắt đầu làm bài.', ERROR_CODES.VALIDATION_ERROR);
    }

    const orderedQuestions = exam.tron_cau_hoi ? shuffle(examQuestions) : examQuestions;
    await attemptRepository.insertFrozenQuestions(connection, attemptId, orderedQuestions);

    await attemptRepository.logEvent(connection, attemptId, 'BAT_DAU', 'Học sinh bắt đầu làm bài.', {
      lanThu,
      lopHocId: classId,
    });

    const attempt = await attemptRepository.findById(attemptId, connection);
    return { attempt, isNew: true };
  });
}

// ---------------------------------------------------------------------------
// Trạng thái phòng thi (UC-HS-06..08) — KHÔNG lộ la_dap_an_dung.
// ---------------------------------------------------------------------------
async function getState(attemptId, hocSinhId) {
  const attempt = await attemptRepository.findByIdForOwner(attemptId, hocSinhId);
  if (!attempt) {
    throw new AppError('Không tìm thấy lượt làm bài.', ERROR_CODES.NOT_FOUND);
  }

  const [frozenQuestions, answerRows] = await Promise.all([
    attemptRepository.listFrozenQuestions(attempt.id),
    attemptRepository.listAnswersForAttempt(attempt.id),
  ]);

  const questionIds = frozenQuestions.map((row) => Number(row.cau_hoi_id));
  const answerOptions = questionIds.length ? await answerRepository.findByQuestionIds(questionIds) : [];
  const optionsByQuestion = groupAnswerOptionsByQuestion(answerOptions);

  const questions = frozenQuestions.map((row) => ({
    id: Number(row.cau_hoi_id),
    order: row.thu_tu_hien_thi,
    type: row.loai_cau_hoi,
    content: row.noi_dung,
    contentLatex: row.noi_dung_latex,
    image: row.anh_url,
    score: Number(row.diem),
    answers: (optionsByQuestion[row.cau_hoi_id] || []).map((option) => ({
      id: option.id,
      content: option.noi_dung,
      contentLatex: option.noi_dung_latex,
      order: option.thu_tu,
    })),
  }));

  const answers = {};
  frozenQuestions.forEach((row) => {
    answers[row.cau_hoi_id] = {
      selectedAnswerId: null,
      answerText: null,
      statementSelections: {},
      bookmarked: false,
      answerVersion: 0,
    };
  });

  const questionTypeById = {};
  frozenQuestions.forEach((row) => {
    questionTypeById[row.cau_hoi_id] = row.loai_cau_hoi;
  });

  answerRows.forEach((row) => {
    const isDungSai = questionTypeById[row.cau_hoi_id] === 'DUNG_SAI';
    const statementSelections = isDungSai
      ? parseStatementSelections(row.noi_dung_tra_loi)
      : {};

    answers[row.cau_hoi_id] = {
      selectedAnswerId: isDungSai ? null : row.dap_an_da_chon_id,
      answerText: isDungSai ? null : row.noi_dung_tra_loi,
      statementSelections,
      bookmarked: Boolean(row.da_danh_dau),
      answerVersion: row.answer_version,
    };
  });

  const now = new Date();
  const effectiveDeadline = computeEffectiveDeadline(attempt);

  return {
    attemptId: attempt.id,
    examId: attempt.de_thi_id,
    status: attempt.trang_thai,
    serverTime: toIso8601VN(now),
    effectiveDeadline: toIso8601VN(effectiveDeadline),
    questions,
    answers,
  };
}

// Dùng cho GET /api/attempts/:attemptId (kiểm tra quyền sở hữu cho các trang khác).
async function getOwnedAttemptSummary(attemptId, hocSinhId) {
  const attempt = await attemptRepository.findByIdForOwner(attemptId, hocSinhId);
  if (!attempt) {
    throw new AppError('Không tìm thấy lượt làm bài.', ERROR_CODES.NOT_FOUND);
  }

  return {
    attemptId: attempt.id,
    examId: attempt.de_thi_id,
    classId: attempt.lop_hoc_id,
    status: attempt.trang_thai,
    lanThu: attempt.lan_thu,
    startedAt: toIso8601VN(attempt.thoi_gian_bat_dau),
    effectiveDeadline: toIso8601VN(computeEffectiveDeadline(attempt)),
    serverTime: toIso8601VN(new Date()),
  };
}

// Dùng để dựng khung trang phòng thi (room.ejs) — dữ liệu câu hỏi/đáp án chi
// tiết vẫn do client gọi GET /api/attempts/:id/state để lấy (nguồn dữ liệu duy nhất).
async function getRoomBootstrap(attemptId, hocSinhId) {
  const attempt = await attemptRepository.findByIdForOwner(attemptId, hocSinhId);
  if (!attempt) {
    throw new AppError('Không tìm thấy lượt làm bài.', ERROR_CODES.NOT_FOUND);
  }

  const exam = await examRepository.findById(attempt.de_thi_id);
  return { attempt, exam };
}

// ---------------------------------------------------------------------------
// Lưu đáp án (UC-HS-06..08) — chống ghi đè bằng answer_version.
// ---------------------------------------------------------------------------
async function saveAnswerInTransaction(connection, attemptId, hocSinhId, questionId, body) {
  // Save và submit luôn khóa dòng lượt làm trước, rồi mới đọc/ghi chi tiết đáp án.
  // Nhờ cùng thứ tự khóa này, submit không thể chấm một snapshot nằm giữa lần save.
  const attempt = await attemptRepository.findByIdForUpdate(connection, attemptId);
  if (!attempt || Number(attempt.hoc_sinh_id) !== Number(hocSinhId)) {
    throw new AppError('Không tìm thấy lượt làm bài.', ERROR_CODES.NOT_FOUND);
  }

  if (attempt.trang_thai !== 'DANG_LAM') {
    throw new AppError('Lượt làm bài không còn ở trạng thái đang làm.', ERROR_CODES.ATTEMPT_NOT_IN_PROGRESS);
  }

  const effectiveDeadline = computeEffectiveDeadline(attempt);
  if (Date.now() > effectiveDeadline.getTime()) {
    throw new AppError('Đã quá hạn nộp bài, không thể lưu đáp án.', ERROR_CODES.DEADLINE_PASSED);
  }

  const cauHoiId = Number(questionId);
  const question = await attemptRepository.findFrozenQuestion(attempt.id, cauHoiId, connection);
  if (!question) {
    throw new AppError('Câu hỏi không thuộc lượt làm bài này.', ERROR_CODES.NOT_FOUND);
  }

  const answerVersion = Number(body.answerVersion);
  if (!Number.isInteger(answerVersion) || answerVersion <= 0) {
    throw new AppError('Phiên bản đáp án (answerVersion) không hợp lệ.', ERROR_CODES.VALIDATION_ERROR);
  }

  const isChoiceType = question.loai_cau_hoi === 'MOT_DAP_AN';
  const isDungSaiType = question.loai_cau_hoi === 'DUNG_SAI';
  const isTextType = question.loai_cau_hoi === 'TRA_LOI_NGAN' || question.loai_cau_hoi === 'TU_LUAN';

  const hasSelectedAnswer = body.selectedAnswerId !== undefined
    && body.selectedAnswerId !== null
    && body.selectedAnswerId !== '';
  const hasAnswerText = body.answerText !== undefined
    && body.answerText !== null
    && String(body.answerText).length > 0;
  const hasStatementSelections = hasMeaningfulStatementSelections(body.statementSelections);

  let dapAnDaChonId = null;
  let noiDungTraLoi = null;

  if (isDungSaiType) {
    if (hasSelectedAnswer) {
      throw new AppError('Câu đúng/sai không nhận một đáp án đơn.', ERROR_CODES.VALIDATION_ERROR);
    }

    const statements = await answerRepository.findByQuestionId(cauHoiId, connection);
    if (statements.length !== DUNG_SAI_STATEMENT_COUNT) {
      throw new AppError('Câu đúng/sai chưa được cấu hình đủ 4 mệnh đề.', ERROR_CODES.VALIDATION_ERROR);
    }

    const allowedIds = new Set(statements.map((row) => String(row.id)));
    const incoming = hasStatementSelections ? body.statementSelections : {};
    const normalized = {};

    Object.keys(incoming).forEach((key) => {
      if (!allowedIds.has(String(key))) {
        throw new AppError('Mệnh đề không thuộc câu hỏi này.', ERROR_CODES.VALIDATION_ERROR);
      }
      const value = incoming[key];
      if (value === true || value === 'true' || value === 1 || value === '1') {
        normalized[String(key)] = true;
      } else if (value === false || value === 'false' || value === 0 || value === '0') {
        normalized[String(key)] = false;
      } else if (value === null || value === undefined || value === '') {
        return;
      } else {
        throw new AppError('Đáp án mệnh đề phải là Đúng hoặc Sai.', ERROR_CODES.VALIDATION_ERROR);
      }
    });

    noiDungTraLoi = serializeStatementSelections(normalized);
  } else if (isChoiceType) {
    if (hasAnswerText || hasStatementSelections) {
      throw new AppError('Câu hỏi này chỉ nhận đáp án lựa chọn.', ERROR_CODES.VALIDATION_ERROR);
    }
    if (hasSelectedAnswer) {
      dapAnDaChonId = Number(body.selectedAnswerId);
      if (!Number.isInteger(dapAnDaChonId) || dapAnDaChonId <= 0) {
        throw new AppError('Đáp án đã chọn không hợp lệ.', ERROR_CODES.VALIDATION_ERROR);
      }
      const validAnswer = await answerRepository.belongsToQuestion(dapAnDaChonId, cauHoiId, connection);
      if (!validAnswer) {
        throw new AppError('Đáp án không thuộc câu hỏi này.', ERROR_CODES.VALIDATION_ERROR);
      }
    }
  } else if (isTextType) {
    if (hasSelectedAnswer || hasStatementSelections) {
      throw new AppError('Câu hỏi này không nhận đáp án lựa chọn.', ERROR_CODES.VALIDATION_ERROR);
    }
    if (hasAnswerText) {
      noiDungTraLoi = String(body.answerText).slice(0, 10000);
    }
  }

  const daDanhDau = toBool(body.bookmarked);
  const clientRequestId = body.clientRequestId ? String(body.clientRequestId).slice(0, 64) : null;
  const now = new Date();
  const savedAtServer = dateToMysqlDatetime(now);

  // Không dùng affectedRows của INSERT ... ON DUPLICATE KEY để nhận biết version cũ:
  // khi CLIENT_FOUND_ROWS được bật, MySQL có thể trả affectedRows = 1 cho cả UPDATE no-op.
  // Dòng attempt đã bị FOR UPDATE ở đầu transaction nên đọc version rồi ghi ở đây được
  // serialize với mọi save/submit hợp lệ khác của cùng lượt làm.
  const currentSaveState = await attemptRepository.getAnswerSaveState(
    attempt.id,
    cauHoiId,
    connection,
  );
  const currentVersion = currentSaveState ? Number(currentSaveState.answer_version) : null;

  // Retry sau lỗi mạng dùng lại clientRequestId. Nếu request đầu đã commit nhưng
  // response bị mất, coi lần gọi lại là idempotent và không tạo log trùng.
  if (currentSaveState
    && clientRequestId
    && currentSaveState.client_request_id === clientRequestId
    && currentVersion === answerVersion) {
    return {
      saved: true,
      answerVersion,
      savedAtServer: toIso8601VN(currentSaveState.saved_at_server || now),
    };
  }

  if (currentSaveState && answerVersion <= currentVersion) {
    throw new AppError(
      `Phiên bản đáp án đã cũ (máy chủ hiện có phiên bản ${currentVersion}).`,
      ERROR_CODES.OLD_ANSWER_VERSION,
      undefined,
      { currentAnswerVersion: currentVersion },
    );
  }

  await attemptRepository.upsertAnswer(attempt.id, cauHoiId, {
    dapAnDaChonId,
    noiDungTraLoi,
    daDanhDau,
    answerVersion,
    clientRequestId,
    savedAtServer,
  }, connection);

  // Xác minh state thực tế sau ghi thay vì suy luận từ affectedRows. Đây cũng là hàng
  // rào phòng thủ nếu sau này xuất hiện writer không tuân theo thứ tự khóa attempt.
  const savedState = await attemptRepository.getAnswerSaveState(attempt.id, cauHoiId, connection);
  const storedVersion = savedState ? Number(savedState.answer_version) : null;
  const requestMatches = !clientRequestId || savedState?.client_request_id === clientRequestId;
  if (!savedState || storedVersion !== answerVersion || !requestMatches) {
    throw new AppError(
      `Phiên bản đáp án đã cũ (máy chủ hiện có phiên bản ${storedVersion}).`,
      ERROR_CODES.OLD_ANSWER_VERSION,
      undefined,
      { currentAnswerVersion: storedVersion },
    );
  }

  await attemptRepository.logEvent(connection, attempt.id, 'LUU_DAP_AN', null, {
    cauHoiId,
    answerVersion,
    clientRequestId,
  });

  return {
    saved: true,
    answerVersion,
    savedAtServer: toIso8601VN(now),
  };
}

async function saveAnswer(attemptId, hocSinhId, questionId, body) {
  return withTransaction((connection) => (
    saveAnswerInTransaction(connection, attemptId, hocSinhId, questionId, body)
  ));
}

// ---------------------------------------------------------------------------
// Heartbeat — chỉ cập nhật last_seen_at, không log mỗi lần (service-rules.md mục 9).
// ---------------------------------------------------------------------------
async function heartbeat(attemptId, hocSinhId) {
  const candidate = await attemptRepository.findByIdForOwner(attemptId, hocSinhId);
  if (!candidate) {
    throw new AppError('Không tìm thấy lượt làm bài.', ERROR_CODES.NOT_FOUND);
  }

  const now = new Date();
  const effectiveDeadline = computeEffectiveDeadline(candidate);

  if (candidate.trang_thai !== 'DANG_LAM') {
    return {
      attemptId: candidate.id,
      status: candidate.trang_thai,
      serverTime: toIso8601VN(now),
      effectiveDeadline: toIso8601VN(effectiveDeadline),
    };
  }

  const candidateGapMs = candidate.last_seen_at
    ? now.getTime() - new Date(candidate.last_seen_at).getTime()
    : 0;

  if (candidateGapMs <= HEARTBEAT_GAP_THRESHOLD_MS) {
    await attemptRepository.updateLastSeenAt(candidate.id, dateToMysqlDatetime(now));
    return {
      attemptId: candidate.id,
      status: candidate.trang_thai,
      serverTime: toIso8601VN(now),
      effectiveDeadline: toIso8601VN(effectiveDeadline),
      lastSeenAt: toIso8601VN(now),
    };
  }

  // Chỉ đường dẫn phát hiện gap mới cần transaction. Hai tab heartbeat và luồng
  // công bố cùng khóa de_thi -> luot_lam_bai, nên không thể tạo trùng sự cố
  // hoặc chen một sự cố CHO_XAC_NHAN sau bước kiểm tra công bố.
  return withTransaction(async (connection) => {
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

    const lockedNow = new Date();
    const lockedDeadline = computeEffectiveDeadline(attempt);

    if (attempt.trang_thai !== 'DANG_LAM') {
      return {
        attemptId: attempt.id,
        status: attempt.trang_thai,
        serverTime: toIso8601VN(lockedNow),
        effectiveDeadline: toIso8601VN(lockedDeadline),
      };
    }

    const gapMs = attempt.last_seen_at
      ? lockedNow.getTime() - new Date(attempt.last_seen_at).getTime()
      : 0;

    if (gapMs > HEARTBEAT_GAP_THRESHOLD_MS) {
      const gapSeconds = Math.round(gapMs / 1000);

      await attemptRepository.logEvent(
        connection,
        attempt.id,
        'MAT_KET_NOI',
        `Không nhận được heartbeat trong khoảng ${gapSeconds} giây.`,
        { gapSeconds },
      );
      await attemptRepository.logEvent(
        connection,
        attempt.id,
        'KHOI_PHUC',
        'Đã nhận lại heartbeat từ học sinh.',
        { gapSeconds },
      );

      const hasPending = await incidentRepository.hasPending(attempt.id, connection);
      if (!hasPending && !Boolean(exam.da_cong_bo_ket_qua)) {
        await attemptRepository.createAutoIncident(attempt.id, {
          loaiSuCo: 'MAT_MANG',
          batDauLuc: dateToMysqlDatetime(attempt.last_seen_at),
          ketThucLuc: dateToMysqlDatetime(lockedNow),
          moTa: `Tự động phát hiện gián đoạn kết nối (khoảng ${gapSeconds} giây không có heartbeat).`,
        }, connection);
      }
    }

    await attemptRepository.updateLastSeenAt(attempt.id, dateToMysqlDatetime(lockedNow), connection);

    return {
      attemptId: attempt.id,
      status: attempt.trang_thai,
      serverTime: toIso8601VN(lockedNow),
      effectiveDeadline: toIso8601VN(lockedDeadline),
      lastSeenAt: toIso8601VN(lockedNow),
    };
  });
}

// ---------------------------------------------------------------------------
// Nộp bài (UC-HS-09) — chấm tự động, tính lại điểm từ chi tiết.
// hocSinhId = null khi được gọi từ job tự động nộp bài (server-side, bỏ qua
// kiểm tra chủ sở hữu vì job không có ngữ cảnh phiên đăng nhập).
// ---------------------------------------------------------------------------
async function submitAttempt(attemptId, hocSinhId, { auto = false, clientAutoRequested = false } = {}) {
  return withTransaction(async (connection) => {
    const attempt = await attemptRepository.findByIdForUpdate(connection, attemptId);
    if (!attempt) {
      throw new AppError('Không tìm thấy lượt làm bài.', ERROR_CODES.NOT_FOUND);
    }

    if (hocSinhId != null && Number(attempt.hoc_sinh_id) !== Number(hocSinhId)) {
      throw new AppError('Bạn không có quyền nộp lượt làm bài này.', ERROR_CODES.FORBIDDEN);
    }

    if (attempt.trang_thai !== 'DANG_LAM') {
      throw new AppError('Lượt làm bài đã được nộp trước đó.', ERROR_CODES.ATTEMPT_SUBMITTED);
    }

    const submittedAt = new Date();
    // Timer client có thể còn giữ deadline cũ ngay sau khi GV bù giờ. Mọi yêu cầu tự nộp
    // phải được server kiểm tra lại; nếu deadline hiệu lực vẫn ở tương lai thì chưa nộp.
    const requestedAuto = Boolean(auto || clientAutoRequested);
    const submission = classifySubmission(attempt, requestedAuto, submittedAt.getTime());
    if (!submission.shouldSubmit) {
      return {
        attemptId: attempt.id,
        status: 'DANG_LAM',
        submitted: false,
        effectiveDeadline: toIso8601VN(submission.effectiveDeadline),
        serverTime: toIso8601VN(submittedAt),
      };
    }

    // Không tin cờ client để phân loại: request chỉ được coi là tự nộp khi deadline
    // phía server thực sự đã qua.
    const isAutoSubmit = submission.isAutoSubmit;
    const snapshot = await attemptRepository.getGradingSnapshot(connection, attempt.id);

    const dungSaiQuestionIds = snapshot
      .filter((row) => row.loai_cau_hoi === 'DUNG_SAI')
      .map((row) => row.cau_hoi_id);
    const dungSaiOptions = dungSaiQuestionIds.length
      ? await answerRepository.findByQuestionIds(dungSaiQuestionIds, connection)
      : [];
    const dungSaiByQuestion = groupAnswerOptionsByQuestion(dungSaiOptions);

    let diemTuDong = 0;
    let diemTuLuan = 0;
    let hasEssay = false;

    for (const row of snapshot) {
      if (row.loai_cau_hoi === 'TU_LUAN') {
        hasEssay = true;
        diemTuLuan += Number(row.diem_hien_tai) || 0;
        continue;
      }

      let laDung = false;
      let diem = 0;

      if (row.loai_cau_hoi === 'MOT_DAP_AN') {
        laDung = row.dap_an_da_chon_id != null && Boolean(row.la_dap_an_dung);
        diem = laDung ? Number(row.diem_dong_bang) : 0;
      } else if (row.loai_cau_hoi === 'DUNG_SAI') {
        const statements = dungSaiByQuestion[row.cau_hoi_id] || [];
        const selections = parseStatementSelections(row.noi_dung_tra_loi);
        const graded = gradeDungSaiStatements(statements, selections, Number(row.diem_dong_bang));
        laDung = graded.laDung;
        diem = graded.diem;
      } else if (row.loai_cau_hoi === 'TRA_LOI_NGAN') {
        laDung = matchesShortAnswerKey(row.noi_dung_tra_loi, row.dap_an_ngan_chuan);
        diem = laDung ? Number(row.diem_dong_bang) : 0;
      }

      diemTuDong += diem;

      if (row.chi_tiet_id) {
        await attemptRepository.updateGrade(connection, row.chi_tiet_id, laDung, diem);
      }
    }

    const tongDiem = diemTuDong + diemTuLuan;
    const trangThaiCuoi = hasEssay ? (isAutoSubmit ? 'TU_DONG_NOP' : 'DA_NOP') : 'DA_CHAM';
    const thoiGianNop = dateToMysqlDatetime(submittedAt);

    const affected = await attemptRepository.finalizeSubmit(connection, attempt.id, {
      trangThai: trangThaiCuoi,
      thoiGianNop,
      diemTuDong,
      diemTuLuan,
      tongDiem,
    });

    if (!affected) {
      throw new AppError('Lượt làm bài đã được nộp trước đó.', ERROR_CODES.ATTEMPT_SUBMITTED);
    }

    await attemptRepository.logEvent(
      connection,
      attempt.id,
      isAutoSubmit ? 'TU_DONG_NOP' : 'NOP_BAI',
      isAutoSubmit ? 'Hệ thống tự động nộp bài do quá hạn.' : 'Học sinh nộp bài.',
      { diemTuDong, diemTuLuan, tongDiem },
    );

    return {
      attemptId: attempt.id,
      status: trangThaiCuoi,
      submitted: true,
      submittedAt: toIso8601VN(submittedAt),
      autoScore: diemTuDong,
      essayScore: diemTuLuan,
      totalScore: tongDiem,
      needsEssayGrading: hasEssay,
      autoSubmitted: isAutoSubmit,
    };
  });
}

module.exports = {
  startAttempt,
  getState,
  getOwnedAttemptSummary,
  getRoomBootstrap,
  saveAnswer,
  heartbeat,
  submitAttempt,
  computeEffectiveDeadline,
  __testables: {
    classifySubmission,
    hasMeaningfulStatementSelections,
  },
};
