'use strict';

const userRepository = require('../repositories/user-repository');

const ALLOWED_STATUS = new Set(['HOAT_DONG', 'TAM_KHOA']);

function normalizeStudentAccountFilters({ q, trangThai } = {}) {
  const query = String(q || '').trim().slice(0, 100);
  const status = ALLOWED_STATUS.has(String(trangThai || ''))
    ? String(trangThai)
    : undefined;

  return {
    q: query || undefined,
    trangThai: status,
  };
}

async function listStudentAccounts(rawFilters = {}) {
  const filters = normalizeStudentAccountFilters(rawFilters);
  const students = await userRepository.listStudents(filters);
  return { students, filters };
}

module.exports = {
  ALLOWED_STATUS,
  normalizeStudentAccountFilters,
  listStudentAccounts,
};
