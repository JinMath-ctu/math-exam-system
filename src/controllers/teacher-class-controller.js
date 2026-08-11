'use strict';

const { validationResult } = require('express-validator');
const classService = require('../services/class-service');
const { AppError, ERROR_CODES } = require('../utils/errors');

function handleValidation(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, ERROR_CODES.VALIDATION_ERROR);
  }
}

function parseId(value, message) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(message || 'Mã định danh không hợp lệ.', ERROR_CODES.VALIDATION_ERROR);
  }
  return id;
}

async function index(req, res) {
  const { trangThai, q } = req.query;
  const classes = await classService.listClassesForTeacher(req.session.user.id, {
    trangThai: trangThai || undefined,
    q: q ? String(q).trim() : undefined,
  });

  res.render('teacher/classes/index', {
    title: 'Lớp học',
    user: req.session.user,
    classes,
    filters: { trangThai: trangThai || '', q: q || '' },
  });
}

function showCreate(req, res) {
  res.render('teacher/classes/create', {
    title: 'Tạo lớp học',
    user: req.session.user,
    formData: {},
  });
}

async function create(req, res, next) {
  try {
    handleValidation(req);

    const { tenLop, maLop, moTa } = req.body;
    const cls = await classService.createClass({
      giaoVienId: req.session.user.id,
      tenLop,
      maLop,
      moTa,
    });

    req.flash('success', `Đã tạo lớp "${cls.ten_lop}" với mã lớp ${cls.ma_lop}.`);
    return res.redirect(`/teacher/classes/${cls.id}`);
  } catch (error) {
    if (error instanceof AppError && (error.code === ERROR_CODES.VALIDATION_ERROR || error.code === ERROR_CODES.CONFLICT)) {
      return res.status(error.status).render('teacher/classes/create', {
        title: 'Tạo lớp học',
        user: req.session.user,
        formData: req.body,
        errorMessage: error.message,
      });
    }
    return next(error);
  }
}

async function show(req, res) {
  const classId = parseId(req.params.id, 'Mã lớp không hợp lệ.');
  const { cls, members, attemptCount, canDelete } = await classService.getClassDetail(
    classId,
    req.session.user.id,
  );

  res.render('teacher/classes/show', {
    title: cls.ten_lop,
    user: req.session.user,
    cls,
    members,
    attemptCount,
    canDelete,
  });
}

async function showEdit(req, res) {
  const classId = parseId(req.params.id, 'Mã lớp không hợp lệ.');
  const { cls } = await classService.getClassDetail(classId, req.session.user.id);

  res.render('teacher/classes/edit', {
    title: `Sửa lớp - ${cls.ten_lop}`,
    user: req.session.user,
    cls,
    formData: { tenLop: cls.ten_lop, moTa: cls.mo_ta },
  });
}

async function update(req, res, next) {
  const classId = parseId(req.params.id, 'Mã lớp không hợp lệ.');

  try {
    handleValidation(req);

    const { tenLop, moTa } = req.body;
    await classService.updateClass(classId, req.session.user.id, { tenLop, moTa });

    req.flash('success', 'Đã cập nhật thông tin lớp học.');
    return res.redirect(`/teacher/classes/${classId}`);
  } catch (error) {
    if (error instanceof AppError && error.code === ERROR_CODES.VALIDATION_ERROR) {
      const { cls } = await classService.getClassDetail(classId, req.session.user.id);
      return res.status(error.status).render('teacher/classes/edit', {
        title: `Sửa lớp - ${cls.ten_lop}`,
        user: req.session.user,
        cls,
        formData: req.body,
        errorMessage: error.message,
      });
    }
    return next(error);
  }
}

async function archive(req, res, next) {
  const classId = parseId(req.params.id, 'Mã lớp không hợp lệ.');

  try {
    await classService.archiveClass(classId, req.session.user.id);
    req.flash('success', 'Đã lưu trữ lớp học.');
  } catch (error) {
    if (error instanceof AppError) {
      req.flash('error', error.message);
    } else {
      return next(error);
    }
  }

  return res.redirect(`/teacher/classes/${classId}`);
}

async function remove(req, res, next) {
  const classId = parseId(req.params.id, 'Mã lớp không hợp lệ.');

  try {
    const cls = await classService.deleteClass(classId, req.session.user.id);
    req.flash('success', `Đã xóa lớp "${cls.ten_lop}".`);
    return res.redirect('/teacher/classes');
  } catch (error) {
    if (error instanceof AppError) {
      req.flash('error', error.message);
      if (error.code === ERROR_CODES.NOT_FOUND) {
        return res.redirect('/teacher/classes');
      }
      return res.redirect(`/teacher/classes/${classId}`);
    }
    return next(error);
  }
}

async function removeMember(req, res, next) {
  const classId = parseId(req.params.id, 'Mã lớp không hợp lệ.');
  const studentId = parseId(req.params.studentId, 'Mã học sinh không hợp lệ.');

  try {
    await classService.removeMember(classId, req.session.user.id, studentId);
    req.flash('success', 'Đã đưa học sinh ra khỏi lớp học.');
  } catch (error) {
    if (error instanceof AppError) {
      req.flash('error', error.message);
    } else {
      return next(error);
    }
  }

  return res.redirect(`/teacher/classes/${classId}`);
}

module.exports = {
  index,
  showCreate,
  create,
  show,
  showEdit,
  update,
  archive,
  remove,
  removeMember,
};
