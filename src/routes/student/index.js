'use strict';

const express = require('express');
const { requireStudent } = require('../../middleware/auth');
const asyncHandler = require('../../utils/async-handler');
const studentClassController = require('../../controllers/student-class-controller');
const studentExamController = require('../../controllers/student-exam-controller');
const studentResultController = require('../../controllers/student-result-controller');
const studentAttemptController = require('../../controllers/student-attempt-controller');
const { joinClassRules } = require('../../validators/class-validators');
const { reportIncidentRules } = require('../../validators/incident-validators');
const { incidentLimiter } = require('../../middleware/rate-limits');

const router = express.Router();

router.get('/dashboard', requireStudent, (req, res) => {
  res.render('student/dashboard', {
    title: 'Bảng điều khiển học sinh',
    user: req.session.user,
  });
});

// Lớp học
router.get('/classes', requireStudent, asyncHandler(studentClassController.index));
router.get('/classes/join', requireStudent, studentClassController.showJoin);
router.post('/classes/join', requireStudent, joinClassRules, asyncHandler(studentClassController.join));
router.post('/classes/:id/leave', requireStudent, asyncHandler(studentClassController.leave));

// Bài thi
router.get('/exams', requireStudent, asyncHandler(studentExamController.listExams));
router.get('/exams/:examId', requireStudent, asyncHandler(studentExamController.examDetail));
router.get('/attempts/:attemptId', requireStudent, asyncHandler(studentExamController.attemptRoom));

// Sự cố bài thi
router.get('/attempts/:attemptId/incidents/new', requireStudent, asyncHandler(studentAttemptController.showReportForm));
router.post(
  '/attempts/:attemptId/incidents',
  requireStudent,
  incidentLimiter,
  reportIncidentRules,
  asyncHandler(studentAttemptController.reportIncident),
);

// Kết quả
router.get('/results', requireStudent, asyncHandler(studentResultController.list));
router.get('/results/:attemptId', requireStudent, asyncHandler(studentResultController.detail));

module.exports = router;
