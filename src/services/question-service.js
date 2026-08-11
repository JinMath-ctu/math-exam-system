'use strict';

const questionRepository = require('../repositories/question-repository');
const answerRepository = require('../repositories/answer-repository');
const topicRepository = require('../repositories/topic-repository');
const withTransaction = require('../utils/with-transaction');
const { copyUploadedFile, deleteUploadedFile } = require('../middleware/upload');
const { AppError, ERROR_CODES } = require('../utils/errors');
const { DUNG_SAI_STATEMENT_COUNT } = require('../utils/dung-sai-scoring');

const QUESTION_TYPES = ['MOT_DAP_AN', 'DUNG_SAI', 'TRA_LOI_NGAN', 'TU_LUAN'];
const DIFFICULTY_LEVELS = ['NHAN_BIET', 'THONG_HIEU', 'VAN_DUNG'];

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  return value === undefined || value === null || value === '' ? [] : [value];
}

function toIndexedList(value, length) {
  if (Array.isArray(value)) {
    const list = value.slice(0, length);
    while (list.length < length) {
      list.push('');
    }
    return list;
  }

  if (value && typeof value === 'object') {
    return Array.from({ length }, (_, index) => {
      if (Object.prototype.hasOwnProperty.call(value, index)) {
        return value[index];
      }
      if (Object.prototype.hasOwnProperty.call(value, String(index))) {
        return value[String(index)];
      }
      return '';
    });
  }

  if (value === undefined || value === null || value === '') {
    return Array.from({ length }, () => '');
  }

  const list = [value];
  while (list.length < length) {
    list.push('');
  }
  return list.slice(0, length);
}

function parseMenhDeLaDung(raw) {
  if (raw === true || raw === 1 || raw === '1' || raw === 'true' || raw === 'DUNG') {
    return true;
  }
  if (raw === false || raw === 0 || raw === '0' || raw === 'false' || raw === 'SAI') {
    return false;
  }
  return null;
}

// Xây danh sách đáp án theo loại câu hỏi. Chỉ áp dụng cho MOT_DAP_AN/DUNG_SAI;
// TRA_LOI_NGAN/TU_LUAN không có dòng đáp án (theo docs/service-rules.md và scope.md).
// DUNG_SAI: 4 mệnh đề; laDapAnDung = TRUE nghĩa là đáp án chuẩn của mệnh đề là Đúng.
function buildAnswers(loaiCauHoi, body) {
  if (loaiCauHoi === 'DUNG_SAI') {
    const texts = toIndexedList(body.menhDeNoiDung, DUNG_SAI_STATEMENT_COUNT);
    const keys = toIndexedList(body.menhDeLaDung, DUNG_SAI_STATEMENT_COUNT);
    const answers = [];

    for (let index = 0; index < DUNG_SAI_STATEMENT_COUNT; index += 1) {
      const noiDung = String(texts[index] || '').trim();
      const laDapAnDung = parseMenhDeLaDung(keys[index]);
      answers.push({ noiDung, laDapAnDung });
    }

    return answers;
  }

  if (loaiCauHoi === 'MOT_DAP_AN') {
    const rawList = toArray(body.dapAnNoiDung);
    const correctIndex = Number(body.correctIndex);
    const answers = [];

    rawList.forEach((value, index) => {
      const noiDung = String(value || '').trim();
      if (!noiDung) {
        return;
      }
      answers.push({ noiDung, laDapAnDung: index === correctIndex });
    });

    return answers;
  }

  return [];
}

function validateBusinessRules(loaiCauHoi, { answers, dapAnNganChuan }) {
  if (loaiCauHoi === 'MOT_DAP_AN') {
    if (answers.length < 2) {
      throw new AppError('Câu một đáp án cần ít nhất 2 đáp án.', ERROR_CODES.VALIDATION_ERROR);
    }
    if (answers.filter((answer) => answer.laDapAnDung).length !== 1) {
      throw new AppError('Câu một đáp án cần chọn đúng 1 đáp án đúng.', ERROR_CODES.VALIDATION_ERROR);
    }
  }

  if (loaiCauHoi === 'DUNG_SAI') {
    if (answers.length !== DUNG_SAI_STATEMENT_COUNT) {
      throw new AppError('Câu đúng/sai cần đúng 4 mệnh đề.', ERROR_CODES.VALIDATION_ERROR);
    }
    if (answers.some((answer) => !answer.noiDung)) {
      throw new AppError('Mỗi mệnh đề đúng/sai cần có nội dung.', ERROR_CODES.VALIDATION_ERROR);
    }
    if (answers.some((answer) => answer.laDapAnDung !== true && answer.laDapAnDung !== false)) {
      throw new AppError('Mỗi mệnh đề cần chọn đáp án chuẩn Đúng hoặc Sai.', ERROR_CODES.VALIDATION_ERROR);
    }
  }

  if (loaiCauHoi === 'TRA_LOI_NGAN' && !dapAnNganChuan) {
    throw new AppError('Câu trả lời ngắn cần có đáp án chuẩn.', ERROR_CODES.VALIDATION_ERROR);
  }
}

function normalizeQuestionFields(body) {
  const loaiCauHoi = body.loaiCauHoi;
  const answers = buildAnswers(loaiCauHoi, body);

  // TRA_LOI_NGAN/TU_LUAN không dùng dap_an_ngan_chuan chéo loại; MOT_DAP_AN/
  // DUNG_SAI không lưu dap_an_ngan_chuan (schema cho phép NULL, giữ sạch dữ liệu).
  const dapAnNganChuan = loaiCauHoi === 'TRA_LOI_NGAN'
    ? String(body.dapAnNganChuan || '').trim()
    : null;

  // loi_giai là trường tùy chọn dùng chung cho cả 4 loại câu hỏi (xem seed.sql),
  // không chỉ riêng TU_LUAN.
  const loiGiai = body.loiGiai ? String(body.loiGiai).trim() : null;

  validateBusinessRules(loaiCauHoi, { answers, dapAnNganChuan });

  return {
    chuDeId: body.chuDeId ? Number(body.chuDeId) : null,
    khoiLop: body.khoiLop ? Number(body.khoiLop) : null,
    loaiCauHoi,
    noiDung: String(body.noiDung || '').trim(),
    noiDungLatex: body.noiDungLatex ? String(body.noiDungLatex).trim() : null,
    mucDo: body.mucDo,
    diemMacDinh: Number(body.diemMacDinh),
    dapAnNganChuan,
    loiGiai,
    answers,
  };
}

async function assertTopicOwnedByTeacher(chuDeId, giaoVienId, executor) {
  if (chuDeId === null) {
    return;
  }

  if (!Number.isInteger(chuDeId) || chuDeId < 1) {
    throw new AppError('Chủ đề không hợp lệ.', ERROR_CODES.VALIDATION_ERROR);
  }

  const topic = await topicRepository.findByIdForTeacher(chuDeId, giaoVienId, executor);
  if (!topic) {
    throw new AppError(
      'Chủ đề không tồn tại hoặc không thuộc tài khoản giáo viên này.',
      ERROR_CODES.VALIDATION_ERROR,
    );
  }
}

async function getFormOptions(giaoVienId) {
  const topics = await topicRepository.listByTeacher(giaoVienId);
  return { topics, questionTypes: QUESTION_TYPES, difficultyLevels: DIFFICULTY_LEVELS };
}

async function listQuestions(giaoVienId, query) {
  const result = await questionRepository.list({
    giaoVienId,
    chuDeId: query.chuDeId ? Number(query.chuDeId) : null,
    khoiLop: query.khoiLop ? Number(query.khoiLop) : null,
    loaiCauHoi: query.loaiCauHoi || null,
    mucDo: query.mucDo || null,
    // Ngân hàng chỉ hiện câu đang dùng; bỏ lọc trạng thái trên UI.
    trangThai: 'HOAT_DONG',
    q: query.q ? String(query.q).trim() : null,
    page: query.page,
    limit: query.limit,
  });

  const topics = await topicRepository.listByTeacher(giaoVienId);

  return { ...result, topics };
}

async function getQuestionDetail(id, giaoVienId) {
  const question = await questionRepository.findByIdForTeacher(id, giaoVienId);
  if (!question) {
    throw new AppError('Không tìm thấy câu hỏi.', ERROR_CODES.NOT_FOUND);
  }

  const [answers, locked] = await Promise.all([
    answerRepository.findByQuestionId(id),
    questionRepository.isLocked(id),
  ]);

  return { question, answers, locked };
}

async function createQuestion({ giaoVienId, body, file }) {
  const anhUrl = file ? file.relativeUrl : null;

  try {
    const fields = normalizeQuestionFields(body);

    const questionId = await withTransaction(async (connection) => {
      await assertTopicOwnedByTeacher(fields.chuDeId, giaoVienId, connection);

      const newId = await questionRepository.create(connection, {
        giaoVienId,
        chuDeId: fields.chuDeId,
        khoiLop: fields.khoiLop,
        loaiCauHoi: fields.loaiCauHoi,
        noiDung: fields.noiDung,
        noiDungLatex: fields.noiDungLatex,
        anhUrl,
        mucDo: fields.mucDo,
        diemMacDinh: fields.diemMacDinh,
        dapAnNganChuan: fields.dapAnNganChuan,
        loiGiai: fields.loiGiai,
      });

      if (fields.answers.length) {
        await answerRepository.replaceForQuestion(connection, newId, fields.answers);
      }

      return newId;
    });

    return questionId;
  } catch (error) {
    await deleteUploadedFile(anhUrl);
    throw error;
  }
}

async function updateQuestion({ id, giaoVienId, body, file }) {
  const existing = await questionRepository.findByIdForTeacher(id, giaoVienId);
  if (!existing) {
    throw new AppError('Không tìm thấy câu hỏi.', ERROR_CODES.NOT_FOUND);
  }

  const locked = await questionRepository.isLocked(id);
  if (locked) {
    if (file) {
      await deleteUploadedFile(file.relativeUrl);
    }
    throw new AppError(
      'Câu hỏi đã thuộc đề công bố hoặc đã có lịch sử làm bài, không thể sửa trực tiếp. Hãy sao chép thành câu mới.',
      ERROR_CODES.QUESTION_IMMUTABLE,
    );
  }

  const removeExistingImage = body.xoaAnh === 'on' || body.xoaAnh === 'true';
  let anhUrl = existing.anh_url;

  if (file) {
    anhUrl = file.relativeUrl;
  } else if (removeExistingImage) {
    anhUrl = null;
  }

  try {
    const fields = normalizeQuestionFields({ ...body, loaiCauHoi: existing.loai_cau_hoi });

    await withTransaction(async (connection) => {
      await assertTopicOwnedByTeacher(fields.chuDeId, giaoVienId, connection);

      await questionRepository.update(connection, id, {
        chuDeId: fields.chuDeId,
        khoiLop: fields.khoiLop,
        noiDung: fields.noiDung,
        noiDungLatex: fields.noiDungLatex,
        anhUrl,
        mucDo: fields.mucDo,
        diemMacDinh: fields.diemMacDinh,
        dapAnNganChuan: fields.dapAnNganChuan,
        loiGiai: fields.loiGiai,
      });

      if (existing.loai_cau_hoi === 'MOT_DAP_AN' || existing.loai_cau_hoi === 'DUNG_SAI') {
        await answerRepository.replaceForQuestion(connection, id, fields.answers);
      }
    });

    if (file && existing.anh_url) {
      await deleteUploadedFile(existing.anh_url);
    } else if (removeExistingImage && !file && existing.anh_url) {
      await deleteUploadedFile(existing.anh_url);
    }
  } catch (error) {
    if (file) {
      await deleteUploadedFile(file.relativeUrl);
    }
    throw error;
  }
}

async function deleteQuestion(id, giaoVienId) {
  const existing = await questionRepository.findByIdForTeacher(id, giaoVienId);
  if (!existing) {
    throw new AppError('Không tìm thấy câu hỏi.', ERROR_CODES.NOT_FOUND);
  }

  assertQuestionHardDeleteAllowed({
    hasHistory: await questionRepository.hasAttemptHistory(id),
    inPublishedExam: await questionRepository.isInPublishedExam(id),
  });

  await withTransaction(async (connection) => {
    const affectedExamIds = await questionRepository.detachFromDraftOrCancelledExams(connection, id);
    for (const examId of affectedExamIds) {
      const [sumRows] = await connection.execute(
        'SELECT COALESCE(SUM(diem), 0) AS total FROM cau_hoi_de_thi WHERE de_thi_id = ?',
        [examId],
      );
      await connection.execute(
        'UPDATE de_thi SET tong_diem = ? WHERE id = ?',
        [Number(sumRows[0].total), examId],
      );
    }

    const deleted = await questionRepository.deleteOwned(connection, id, giaoVienId);
    if (!deleted) {
      throw new AppError('Không thể xóa câu hỏi.', ERROR_CODES.CONFLICT);
    }
  });

  if (existing.anh_url) {
    await deleteUploadedFile(existing.anh_url);
  }
}

function assertQuestionHardDeleteAllowed({ hasHistory, inPublishedExam }) {
  if (hasHistory) {
    throw new AppError(
      'Câu hỏi đã có lịch sử làm bài nên không thể xóa (để giữ dữ liệu kết quả). Hãy sao chép thành câu mới nếu cần chỉnh sửa.',
      ERROR_CODES.QUESTION_IMMUTABLE,
    );
  }

  if (inPublishedExam) {
    throw new AppError(
      'Câu hỏi đang thuộc đề đã công bố nên không thể xóa. Hãy hủy đề (nếu chưa có lượt làm) hoặc sao chép thành câu mới.',
      ERROR_CODES.QUESTION_IMMUTABLE,
    );
  }
}

async function copyQuestion(id, giaoVienId) {
  const existing = await questionRepository.findByIdForTeacher(id, giaoVienId);
  if (!existing) {
    throw new AppError('Không tìm thấy câu hỏi.', ERROR_CODES.NOT_FOUND);
  }

  const answers = await answerRepository.findByQuestionId(id);
  let copiedAnhUrl = null;

  try {
    // Mỗi bản sao sở hữu một file ảnh riêng. Nhờ vậy việc thay/xóa ảnh ở bản
    // sao không làm hỏng ảnh của câu gốc (và ngược lại).
    copiedAnhUrl = await copyUploadedFile(existing.anh_url);

    return await withTransaction(async (connection) => {
      await assertTopicOwnedByTeacher(existing.chu_de_id, giaoVienId, connection);

      const newId = await questionRepository.create(connection, {
        giaoVienId,
        chuDeId: existing.chu_de_id,
        khoiLop: existing.khoi_lop,
        loaiCauHoi: existing.loai_cau_hoi,
        noiDung: existing.noi_dung,
        noiDungLatex: existing.noi_dung_latex,
        anhUrl: copiedAnhUrl,
        mucDo: existing.muc_do,
        diemMacDinh: existing.diem_mac_dinh,
        dapAnNganChuan: existing.dap_an_ngan_chuan,
        loiGiai: existing.loi_giai,
      });

      if (answers.length) {
        await answerRepository.replaceForQuestion(
          connection,
          newId,
          answers.map((answer) => ({
            noiDung: answer.noi_dung,
            noiDungLatex: answer.noi_dung_latex,
            laDapAnDung: Boolean(answer.la_dap_an_dung),
          })),
        );
      }

      return newId;
    });
  } catch (error) {
    await deleteUploadedFile(copiedAnhUrl);
    throw error;
  }
}

module.exports = {
  QUESTION_TYPES,
  DIFFICULTY_LEVELS,
  getFormOptions,
  listQuestions,
  getQuestionDetail,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  copyQuestion,
  __testables: {
    assertQuestionHardDeleteAllowed,
  },
};
