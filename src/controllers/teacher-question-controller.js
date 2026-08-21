'use strict';

const { validationResult } = require('express-validator');
const questionService = require('../services/question-service');
const { toRelativeUrl, deleteUploadedFile } = require('../middleware/upload');
const { AppError, ERROR_CODES } = require('../utils/errors');

function handleValidation(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, ERROR_CODES.VALIDATION_ERROR);
  }
}

function getFileInfo(req) {
  return req.file ? { relativeUrl: toRelativeUrl(req.file.filename) } : null;
}

async function cleanupUploadedFile(req) {
  if (req.file) {
    await deleteUploadedFile(toRelativeUrl(req.file.filename));
  }
}

function mapQuestionToFormData(question, answers) {
  const base = {
    chuDeId: question.chu_de_id || '',
    khoiLop: question.khoi_lop || '',
    loaiCauHoi: question.loai_cau_hoi,
    noiDung: question.noi_dung,
    noiDungLatex: question.noi_dung_latex || '',
    mucDo: question.muc_do,
    diemMacDinh: question.diem_mac_dinh,
    dapAnNganChuan: question.dap_an_ngan_chuan || '',
    loiGiai: question.loi_giai || '',
    dapAnNoiDung: answers.map((answer) => answer.noi_dung),
    correctIndex: answers.findIndex((answer) => Boolean(answer.la_dap_an_dung)),
  };

  if (question.loai_cau_hoi === 'DUNG_SAI') {
    base.menhDeNoiDung = [0, 1, 2, 3].map((index) => (answers[index] ? answers[index].noi_dung : ''));
    base.menhDeLaDung = [0, 1, 2, 3].map((index) => {
      if (!answers[index]) {
        return '';
      }
      return answers[index].la_dap_an_dung ? '1' : '0';
    });
  }

  return base;
}

async function list(req, res, next) {
  try {
    const giaoVienId = req.session.user.id;
    const result = await questionService.listQuestions(giaoVienId, req.query);

    res.render('teacher/questions/list', {
      title: 'Ngân hàng câu hỏi',
      user: req.session.user,
      questions: result.rows,
      topics: result.topics,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
      filters: req.query,
      questionTypes: questionService.QUESTION_TYPES,
      difficultyLevels: questionService.DIFFICULTY_LEVELS,
    });
  } catch (error) {
    next(error);
  }
}

async function showCreate(req, res, next) {
  try {
    const options = await questionService.getFormOptions(req.session.user.id);
    res.render('teacher/questions/create', {
      title: 'Tạo câu hỏi',
      user: req.session.user,
      formData: { correctIndex: '' },
      ...options,
    });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    handleValidation(req);

    const questionId = await questionService.createQuestion({
      giaoVienId: req.session.user.id,
      body: req.body,
      file: getFileInfo(req),
    });

    req.flash('success', 'Đã tạo câu hỏi mới.');
    return res.redirect(`/teacher/questions/${questionId}`);
  } catch (error) {
    if (error instanceof AppError && error.code === ERROR_CODES.VALIDATION_ERROR) {
      await cleanupUploadedFile(req);
      const options = await questionService.getFormOptions(req.session.user.id);
      return res.status(400).render('teacher/questions/create', {
        title: 'Tạo câu hỏi',
        user: req.session.user,
        formData: req.body,
        errorMessage: error.message,
        ...options,
      });
    }

    await cleanupUploadedFile(req);
    return next(error);
  }
}

async function showDetail(req, res, next) {
  try {
    const giaoVienId = req.session.user.id;
    const { question, answers, locked } = await questionService.getQuestionDetail(req.params.id, giaoVienId);

    res.render('teacher/questions/detail', {
      title: 'Chi tiết câu hỏi',
      user: req.session.user,
      question,
      answers,
      locked,
    });
  } catch (error) {
    next(error);
  }
}

async function showEdit(req, res, next) {
  try {
    const giaoVienId = req.session.user.id;
    const { question, answers, locked } = await questionService.getQuestionDetail(req.params.id, giaoVienId);

    if (locked) {
      req.flash('error', 'Câu hỏi đã thuộc đề công bố hoặc đã có lịch sử làm bài. Hãy sao chép thành câu mới để sửa.');
      return res.redirect(`/teacher/questions/${question.id}`);
    }

    const options = await questionService.getFormOptions(giaoVienId);

    return res.render('teacher/questions/edit', {
      title: 'Sửa câu hỏi',
      user: req.session.user,
      question,
      formData: mapQuestionToFormData(question, answers),
      ...options,
    });
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    handleValidation(req);

    await questionService.updateQuestion({
      id: req.params.id,
      giaoVienId: req.session.user.id,
      body: req.body,
      file: getFileInfo(req),
    });

    req.flash('success', 'Đã lưu thay đổi câu hỏi.');
    return res.redirect(`/teacher/questions/${req.params.id}`);
  } catch (error) {
    if (error instanceof AppError
      && (error.code === ERROR_CODES.VALIDATION_ERROR || error.code === ERROR_CODES.QUESTION_IMMUTABLE)) {
      await cleanupUploadedFile(req);

      if (error.code === ERROR_CODES.QUESTION_IMMUTABLE) {
        req.flash('error', error.message);
        return res.redirect(`/teacher/questions/${req.params.id}`);
      }

      const giaoVienId = req.session.user.id;
      const { question } = await questionService.getQuestionDetail(req.params.id, giaoVienId);
      const options = await questionService.getFormOptions(giaoVienId);

      return res.status(400).render('teacher/questions/edit', {
        title: 'Sửa câu hỏi',
        user: req.session.user,
        question,
        formData: { ...req.body, loaiCauHoi: question.loai_cau_hoi },
        errorMessage: error.message,
        ...options,
      });
    }

    await cleanupUploadedFile(req);
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    await questionService.deleteQuestion(req.params.id, req.session.user.id);
    req.flash('success', 'Đã xóa câu hỏi.');
    return res.redirect('/teacher/questions');
  } catch (error) {
    if (
      error.code === ERROR_CODES.QUESTION_IMMUTABLE
      || error.code === ERROR_CODES.VALIDATION_ERROR
      || error.code === ERROR_CODES.NOT_FOUND
      || error.code === ERROR_CODES.CONFLICT
    ) {
      req.flash('error', error.message);
      return res.redirect(`/teacher/questions/${req.params.id}`);
    }
    return next(error);
  }
}

async function updateImage(req, res, next) {
  try {
    await questionService.updateQuestionImage({
      id: req.params.id,
      giaoVienId: req.session.user.id,
      body: req.body,
      file: getFileInfo(req),
    });

    req.flash('success', 'Đã cập nhật ảnh minh họa câu hỏi.');
    return res.redirect(`/teacher/questions/${req.params.id}`);
  } catch (error) {
    await cleanupUploadedFile(req);
    if (
      error instanceof AppError
      && (error.code === ERROR_CODES.VALIDATION_ERROR
        || error.code === ERROR_CODES.NOT_FOUND
        || error.code === ERROR_CODES.FORBIDDEN)
    ) {
      req.flash('error', error.message);
      return res.redirect(`/teacher/questions/${req.params.id}`);
    }
    return next(error);
  }
}

async function copy(req, res, next) {
  try {
    const newId = await questionService.copyQuestion(req.params.id, req.session.user.id);
    req.flash('success', 'Đã sao chép câu hỏi thành câu mới.');
    return res.redirect(`/teacher/questions/${newId}/edit`);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  list,
  showCreate,
  create,
  showDetail,
  showEdit,
  update,
  updateImage,
  remove,
  copy,
};
