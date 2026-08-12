'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeStudentAccountFilters,
} = require('../src/services/teacher-account-service');

describe('teacher-account-service filters', () => {
  it('keeps allowed status values only', () => {
    assert.deepEqual(
      normalizeStudentAccountFilters({ trangThai: 'HOAT_DONG' }),
      { q: undefined, trangThai: 'HOAT_DONG' },
    );
    assert.deepEqual(
      normalizeStudentAccountFilters({ trangThai: 'TAM_KHOA' }),
      { q: undefined, trangThai: 'TAM_KHOA' },
    );
    assert.deepEqual(
      normalizeStudentAccountFilters({ trangThai: 'GIAO_VIEN' }),
      { q: undefined, trangThai: undefined },
    );
  });

  it('trims and caps search query', () => {
    assert.deepEqual(
      normalizeStudentAccountFilters({ q: '  an@example.com  ' }),
      { q: 'an@example.com', trangThai: undefined },
    );
    const long = 'x'.repeat(120);
    assert.equal(normalizeStudentAccountFilters({ q: long }).q.length, 100);
  });
});
