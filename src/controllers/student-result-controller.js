'use strict';

const resultService = require('../services/result-service');
const { formatDateTimeVN } = require('../utils/datetime');

async function list(req, res, next) {
  try {
    const result = await resultService.listMyResults(req.session.user.id, req.query);

    res.render('student/results/list', {
      title: 'Kết quả của tôi',
      user: req.session.user,
      results: result.rows,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
      formatDateTimeVN,
    });
  } catch (error) {
    next(error);
  }
}

async function detail(req, res, next) {
  try {
    const data = await resultService.getResultDetail(req.params.attemptId, req.session.user.id);

    res.render('student/results/detail', {
      title: 'Chi tiết kết quả',
      user: req.session.user,
      formatDateTimeVN,
      ...data,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  list,
  detail,
};
