'use strict';

const teacherAccountService = require('../services/teacher-account-service');
const { formatDateTimeVN } = require('../utils/datetime');

async function index(req, res) {
  const { students, filters } = await teacherAccountService.listStudentAccounts({
    q: req.query.q,
    trangThai: req.query.trangThai,
  });

  res.render('teacher/accounts/index', {
    title: 'Tài khoản học sinh',
    user: req.session.user,
    students,
    filters: {
      q: filters.q || '',
      trangThai: filters.trangThai || '',
    },
    total: students.length,
    formatDateTimeVN,
  });
}

module.exports = {
  index,
};
