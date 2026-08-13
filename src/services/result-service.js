'use strict';

const attemptRepository = require('../repositories/attempt-repository');
const answerRepository = require('../repositories/answer-repository');
const { AppError, ERROR_CODES } = require('../utils/errors');
const { parseStatementSelections } = require('../utils/dung-sai-scoring');

const CHOICE_TYPES = new Set(['MOT_DAP_AN', 'DUNG_SAI']);

function assertOfficialResultVisible(attempt, { hasInProgressAttempt = false } = {}) {
  if (!Boolean(attempt.da_cong_bo_ket_qua)) {
    throw new AppError('Kết quả chưa được công bố.', ERROR_CODES.RESULTS_NOT_PUBLISHED);
  }

  if (attempt.trang_thai !== 'DA_CHAM' || !attempt.thoi_gian_nop) {
    throw new AppError(
      'Kết quả của lượt làm này chưa được chấm hoàn tất.',
      ERROR_CODES.RESULTS_NOT_PUBLISHED,
    );
  }

  if (hasInProgressAttempt) {
    throw new AppError(
      'Không thể xem kết quả khi bạn vẫn còn lượt làm đang diễn ra cho đề này.',
      ERROR_CODES.RESULTS_NOT_PUBLISHED,
    );
  }
}

function groupOptionsByQuestion(options) {
  const map = new Map();
  options.forEach((option) => {
    const key = String(option.cau_hoi_id);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(option);
  });
  return map;
}

async function listMyResults(hocSinhId, query) {
  return attemptRepository.listMyPublishedResults(hocSinhId, {
    page: query.page,
    limit: query.limit,
  });
}

async function getResultDetail(attemptId, hocSinhId) {
  const attempt = await attemptRepository.findPublishedResultForStudent(attemptId, hocSinhId);
  if (!attempt) {
    // Truy vấn phụ chỉ dùng để trả thông báo đúng cho chủ sở hữu. Dữ liệu câu hỏi,
    // điểm và đáp án vẫn tuyệt đối không được đọc cho tới khi policy hợp lệ.
    const ownedAttempt = await attemptRepository.findByIdForStudentWithExam(attemptId, hocSinhId);
    if (!ownedAttempt) {
      throw new AppError('Không tìm thấy lượt làm bài.', ERROR_CODES.NOT_FOUND);
    }

    assertOfficialResultVisible(ownedAttempt, { hasInProgressAttempt: true });
  }

  assertOfficialResultVisible(attempt);
  const choXemDapAn = Boolean(attempt.cho_xem_dap_an);
  // Luôn tải bài làm của học sinh sau công bố; đáp án đúng / lời giải chỉ khi GV cho phép.
  const rows = await attemptRepository.listResultQuestions(attemptId, {
    includeAnswerKey: choXemDapAn,
  });

  const choiceQuestionIds = rows
    .filter((row) => CHOICE_TYPES.has(row.loai_cau_hoi))
    .map((row) => row.cau_hoi_id);

  const options = await answerRepository.findByQuestionIds(choiceQuestionIds);
  const optionsByQuestion = groupOptionsByQuestion(options);

  const questions = rows.map((row) => {
    const base = {
      cauHoiId: row.cau_hoi_id,
      thuTuHienThi: row.thu_tu_hien_thi,
      loaiCauHoi: row.loai_cau_hoi,
      noiDung: row.noi_dung,
      noiDungLatex: row.noi_dung_latex,
      diemToiDa: Number(row.diem_toi_da),
      diemDatDuoc: row.diem_dat_duoc == null ? 0 : Number(row.diem_dat_duoc),
      laDung: row.la_dung == null ? null : Boolean(row.la_dung),
      nhanXet: row.nhan_xet || null,
    };

    if (row.loai_cau_hoi === 'MOT_DAP_AN') {
      const rawOpts = optionsByQuestion.get(String(row.cau_hoi_id)) || [];
      const opts = rawOpts.map((opt) => ({
        id: opt.id,
        cau_hoi_id: opt.cau_hoi_id,
        noi_dung: opt.noi_dung,
        noi_dung_latex: opt.noi_dung_latex,
        thu_tu: opt.thu_tu,
        la_dap_an_dung: choXemDapAn ? Boolean(opt.la_dap_an_dung) : false,
      }));
      base.tuyChon = opts;
      base.dapAnDaChon = opts.find((o) => Number(o.id) === Number(row.dap_an_da_chon_id)) || null;
      base.dapAnDung = choXemDapAn
        ? (rawOpts.find((o) => Boolean(o.la_dap_an_dung)) || null)
        : null;
    } else if (row.loai_cau_hoi === 'DUNG_SAI') {
      const rawOpts = optionsByQuestion.get(String(row.cau_hoi_id)) || [];
      base.tuyChon = rawOpts.map((opt) => ({
        id: opt.id,
        cau_hoi_id: opt.cau_hoi_id,
        noi_dung: opt.noi_dung,
        noi_dung_latex: opt.noi_dung_latex,
        thu_tu: opt.thu_tu,
        la_dap_an_dung: choXemDapAn ? Boolean(opt.la_dap_an_dung) : false,
      }));
      base.statementSelections = parseStatementSelections(row.noi_dung_tra_loi);
    } else if (row.loai_cau_hoi === 'TRA_LOI_NGAN') {
      base.noiDungTraLoi = row.noi_dung_tra_loi || null;
      base.dapAnNganChuan = choXemDapAn ? (row.dap_an_ngan_chuan || null) : null;
    } else {
      base.noiDungTraLoi = row.noi_dung_tra_loi || null;
    }

    if (choXemDapAn) {
      base.loiGiai = row.loi_giai || null;
    }

    return base;
  });

  return { attempt, choXemDapAn, questions };
}

module.exports = {
  listMyResults,
  getResultDetail,
  __testables: {
    assertOfficialResultVisible,
  },
};
