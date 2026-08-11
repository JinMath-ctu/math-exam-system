'use strict';

const { validationResult } = require('express-validator');
const examService = require('../services/exam-service');
const { AppError, ERROR_CODES } = require('../utils/errors');
const { toDatetimeVnInputValue, formatDateTimeVN } = require('../utils/datetime');

function handleValidation(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, ERROR_CODES.VALIDATION_ERROR);
  }
}

function mapExamToFormData(exam) {
  return {
    tenDe: exam.ten_de,
    moTa: exam.mo_ta || '',
    thoiLuongPhut: exam.thoi_luong_phut,
    thoiGianBatDau: toDatetimeVnInputValue(exam.thoi_gian_bat_dau),
    thoiGianKetThuc: toDatetimeVnInputValue(exam.thoi_gian_ket_thuc),
    soLanDuocLam: exam.so_lan_duoc_lam,
    tronCauHoi: Boolean(exam.tron_cau_hoi),
    choXemDapAn: Boolean(exam.cho_xem_dap_an),
  };
}

async function list(req, res, next) {
  try {
    const result = await examService.listExams(req.session.user.id, req.query);

    res.render('teacher/exams/list', {
      title: 'Đề thi',
      user: req.session.user,
      exams: result.rows,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
      filters: req.query,
      formatDateTimeVN,
    });
  } catch (error) {
    next(error);
  }
}

async function showCreate(req, res, next) {
  try {
    const availableQuestions = await examService.listActiveQuestions(req.session.user.id);
    res.render('teacher/exams/create', {
      title: 'Tạo đề thi',
      user: req.session.user,
      formData: { soLanDuocLam: 1 },
      availableQuestions,
      selectedQuestionIds: [],
    });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    handleValidation(req);

    const { examId, questionCount } = await examService.createExam(req.session.user.id, req.body);
    if (questionCount > 0) {
      req.flash(
        'success',
        `Đã tạo đề thi nháp với ${questionCount} câu hỏi. Hãy giao lớp trước khi công bố.`,
      );
    } else {
      req.flash('success', 'Đã tạo đề thi nháp. Hãy chọn câu hỏi và giao lớp trước khi công bố.');
    }
    return res.redirect(`/teacher/exams/${examId}`);
  } catch (error) {
    if (error instanceof AppError && error.code === ERROR_CODES.VALIDATION_ERROR) {
      const availableQuestions = await examService.listActiveQuestions(req.session.user.id);
      let selectedQuestionIds = req.body.cauHoiIds || [];
      if (!Array.isArray(selectedQuestionIds)) {
        selectedQuestionIds = [selectedQuestionIds];
      }
      return res.status(400).render('teacher/exams/create', {
        title: 'Tạo đề thi',
        user: req.session.user,
        formData: req.body,
        availableQuestions,
        selectedQuestionIds: selectedQuestionIds.map(Number),
        errorMessage: error.message,
      });
    }

    return next(error);
  }
}

async function showDetail(req, res, next) {
  try {
    const detail = await examService.getExamDetail(req.params.id, req.session.user.id);

    res.render('teacher/exams/detail', {
      title: 'Chi tiết đề thi',
      user: req.session.user,
      ...detail,
      formatDateTimeVN,
    });
  } catch (error) {
    next(error);
  }
}

async function showEdit(req, res, next) {
  try {
    const detail = await examService.getExamDetail(req.params.id, req.session.user.id);

    if (!detail.isEditable) {
      req.flash('error', 'Chỉ có thể sửa đề thi khi đang ở trạng thái Nháp.');
      return res.redirect(`/teacher/exams/${detail.exam.id}`);
    }

    return res.render('teacher/exams/edit', {
      title: 'Sửa đề thi',
      user: req.session.user,
      exam: detail.exam,
      formData: mapExamToFormData(detail.exam),
    });
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    handleValidation(req);

    const examId = await examService.updateExam(req.params.id, req.session.user.id, req.body);
    req.flash('success', 'Đã lưu thay đổi đề thi.');
    return res.redirect(`/teacher/exams/${examId}`);
  } catch (error) {
    if (error instanceof AppError
      && (error.code === ERROR_CODES.VALIDATION_ERROR || error.code === ERROR_CODES.EXAM_NOT_EDITABLE)) {
      if (error.code === ERROR_CODES.EXAM_NOT_EDITABLE) {
        req.flash('error', error.message);
        return res.redirect(`/teacher/exams/${req.params.id}`);
      }

      return res.status(400).render('teacher/exams/edit', {
        title: 'Sửa đề thi',
        user: req.session.user,
        exam: { id: req.params.id },
        formData: req.body,
        errorMessage: error.message,
      });
    }

    return next(error);
  }
}

async function runAction(req, res, next, action, successMessage) {
  try {
    await action();
    if (successMessage) {
      req.flash('success', successMessage);
    }
  } catch (error) {
    if (error instanceof AppError) {
      req.flash('error', error.message);
    } else {
      return next(error);
    }
  }

  return res.redirect(`/teacher/exams/${req.params.id}`);
}

async function addQuestion(req, res, next) {
  return runAction(
    req,
    res,
    next,
    async () => {
      handleValidation(req);
      const result = await examService.addQuestion(req.params.id, req.session.user.id, req.body);
      req.flash(
        'success',
        result.questionCount > 1
          ? `Đã thêm ${result.questionCount} câu hỏi vào đề thi.`
          : 'Đã thêm câu hỏi vào đề thi.',
      );
    },
    null,
  );
}

async function updateQuestionScore(req, res, next) {
  return runAction(
    req,
    res,
    next,
    () => {
      handleValidation(req);
      return examService.updateQuestionScore(req.params.id, req.session.user.id, req.params.questionId, req.body.diem);
    },
    'Đã cập nhật điểm câu hỏi.',
  );
}

async function updateQuestionScores(req, res, next) {
  return runAction(
    req,
    res,
    next,
    () => {
      handleValidation(req);
      return examService.updateQuestionScores(req.params.id, req.session.user.id, req.body);
    },
    'Đã lưu điểm các câu hỏi trong đề.',
  );
}

async function removeQuestion(req, res, next) {
  return runAction(
    req,
    res,
    next,
    () => examService.removeQuestion(req.params.id, req.session.user.id, req.params.questionId),
    'Đã xóa câu hỏi khỏi đề thi.',
  );
}

async function assignClass(req, res, next) {
  return runAction(
    req,
    res,
    next,
    () => {
      handleValidation(req);
      return examService.assignClass(req.params.id, req.session.user.id, req.body.lopHocId);
    },
    'Đã giao đề cho lớp.',
  );
}

async function unassignClass(req, res, next) {
  return runAction(
    req,
    res,
    next,
    () => {
      handleValidation(req);
      return examService.unassignClass(req.params.id, req.session.user.id, req.body.lopHocId);
    },
    'Đã hủy giao đề cho lớp.',
  );
}

async function publish(req, res, next) {
  return runAction(
    req,
    res,
    next,
    () => examService.publishExam(req.params.id, req.session.user.id),
    'Đã công bố đề thi. Học sinh trong lớp được giao có thể bắt đầu làm bài.',
  );
}

async function cancel(req, res, next) {
  return runAction(
    req,
    res,
    next,
    () => examService.cancelExam(req.params.id, req.session.user.id),
    'Đã hủy đề thi.',
  );
}

async function remove(req, res, next) {
  try {
    await examService.deleteExam(req.params.id, req.session.user.id);
    req.flash('success', 'Đã xóa đề thi.');
    return res.redirect('/teacher/exams');
  } catch (error) {
    if (error instanceof AppError) {
      req.flash('error', error.message);
      if (error.code === ERROR_CODES.NOT_FOUND) {
        return res.redirect('/teacher/exams');
      }
      return res.redirect(`/teacher/exams/${req.params.id}`);
    }
    return next(error);
  }
}

async function publishResults(req, res, next) {
  return runAction(
    req,
    res,
    next,
    () => examService.publishResults(req.params.id, req.session.user.id, req.body),
    'Đã công bố kết quả cho học sinh.',
  );
}

module.exports = {
  list,
  showCreate,
  create,
  showDetail,
  showEdit,
  update,
  addQuestion,
  updateQuestionScore,
  updateQuestionScores,
  removeQuestion,
  assignClass,
  unassignClass,
  publish,
  cancel,
  remove,
  publishResults,
};
