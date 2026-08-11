'use strict';

const statisticsService = require('../services/statistics-service');
const { formatDateTimeVN } = require('../utils/datetime');

async function show(req, res, next) {
  try {
    const stats = await statisticsService.getExamStatistics(req.params.id, req.session.user.id);

    res.render('teacher/exams/statistics', {
      title: `Thống kê — ${stats.exam.ten_de}`,
      user: req.session.user,
      formatDateTimeVN,
      ...stats,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { show };
