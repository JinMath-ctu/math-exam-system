'use strict';

const express = require('express');
const { requireTeacher } = require('../../middleware/auth');
const asyncHandler = require('../../utils/async-handler');
const teacherClassController = require('../../controllers/teacher-class-controller');
const teacherTopicController = require('../../controllers/teacher-topic-controller');
const teacherAccountController = require('../../controllers/teacher-account-controller');
const { createClassRules, updateClassRules } = require('../../validators/class-validators');
const { createTopicRules, updateTopicRules } = require('../../validators/topic-validators');
const questionRoutes = require('./questions');
const examRoutes = require('./exams');
const attemptRoutes = require('./attempts');
const incidentRoutes = require('./incidents');

const router = express.Router();

router.get('/dashboard', requireTeacher, (req, res) => {
  res.render('teacher/dashboard', {
    title: 'Bảng điều khiển giáo viên',
    user: req.session.user,
  });
});

// Tài khoản học sinh (chỉ xem — giáo viên chủ hệ thống V1)
router.get('/accounts', requireTeacher, asyncHandler(teacherAccountController.index));

// Lớp học
router.get('/classes', requireTeacher, asyncHandler(teacherClassController.index));
router.get('/classes/create', requireTeacher, teacherClassController.showCreate);
router.post('/classes/create', requireTeacher, createClassRules, asyncHandler(teacherClassController.create));
router.get('/classes/:id/edit', requireTeacher, asyncHandler(teacherClassController.showEdit));
router.get('/classes/:id', requireTeacher, asyncHandler(teacherClassController.show));
router.put('/classes/:id', requireTeacher, updateClassRules, asyncHandler(teacherClassController.update));
router.patch('/classes/:id/archive', requireTeacher, asyncHandler(teacherClassController.archive));
router.post('/classes/:id/delete', requireTeacher, asyncHandler(teacherClassController.remove));
router.patch('/classes/:id/members/:studentId/remove', requireTeacher, asyncHandler(teacherClassController.removeMember));

// Chủ đề
router.get('/topics', requireTeacher, asyncHandler(teacherTopicController.index));
router.post('/topics', requireTeacher, createTopicRules, asyncHandler(teacherTopicController.create));
router.put('/topics/:id', requireTeacher, updateTopicRules, asyncHandler(teacherTopicController.update));
router.delete('/topics/:id', requireTeacher, asyncHandler(teacherTopicController.remove));

// Ngân hàng câu hỏi
router.use('/questions', requireTeacher, questionRoutes);

// Đề thi
router.use('/exams', requireTeacher, examRoutes);

// Chấm bài (lượt làm)
router.use('/attempts', requireTeacher, attemptRoutes);

// Sự cố bài thi
router.use('/incidents', requireTeacher, incidentRoutes);

module.exports = router;
