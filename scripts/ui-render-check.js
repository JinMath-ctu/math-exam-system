'use strict';

const ejs = require('ejs');
const path = require('path');

const locals = {
  csrfToken: 'token',
  title: 'Test',
  user: { id: 1, hoTen: 'GV', email: 't@e.com', vaiTro: 'GIAO_VIEN' },
  flash: null,
  formData: null,
  filters: { q: '', trangThai: '' },
  classes: [],
  members: [],
  students: [],
  total: 0,
  exams: [],
  questions: [],
  topics: [],
  incidents: [],
  loaiSuCoValues: ['MAT_MANG'],
  essayQuestions: [],
  reviewQuestions: [],
  canGrade: true,
  gradingBlockedReason: null,
  attempt: {
    id: 1,
    lan_thu: 1,
    ten_de: 'De',
    diem_tu_dong: 1,
    diem_tu_luan: 0,
    tong_diem: 1,
    de_tong_diem: 5,
    thoi_gian_nop: null,
    thoi_gian_cong_bo_ket_qua: null,
    trang_thai: 'DA_CHAM',
    de_thi_id: 1,
    hoc_sinh_ho_ten: 'HS',
    ten_lop: 'Lớp',
    so_cau_tu_luan: 0,
  },
  exam: { id: 1, ten_de: 'De', tong_diem: 5 },
  choXemDapAn: false,
  formatDateTimeVN: () => 'x',
  cls: {
    id: 1,
    ten_lop: 'Lop',
    ma_lop: 'ABC',
    trang_thai: 'HOAT_DONG',
    created_at: new Date(),
    mo_ta: '',
  },
};

const files = [
  'src/views/auth/login.ejs',
  'src/views/teacher/dashboard.ejs',
  'src/views/student/dashboard.ejs',
  'src/views/teacher/classes/index.ejs',
  'src/views/teacher/accounts/index.ejs',
  'src/views/student/attempts/room.ejs',
  'src/views/home.ejs',
  'src/views/student/results/detail.ejs',
  'src/views/student/attempts/report-incident.ejs',
  'src/views/teacher/attempts/grade.ejs',
];

(async () => {
  for (const f of files) {
    try {
      const html = await ejs.renderFile(path.resolve(f), locals);
      const problems = [];
      if (f.includes('login') && !html.includes('is-auth')) problems.push('no is-auth');
      if (f.includes('dashboard') && !html.includes('app-shell')) problems.push('no shell');
      if (f.includes('room') && !html.includes('id="exam-room-page"')) problems.push('no exam id');
      if (f.includes('room') && !html.includes('id="question-nav"')) problems.push('no nav');
      if (f.includes('room') && !html.includes('id="submit-btn"')) problems.push('no submit');
      if (f.includes('room') && !html.includes('/js/exam-room.js')) problems.push('no exam js');
      if (f.includes('detail') && !html.includes('score-hero')) problems.push('no score-hero');
      console.log(`${f}: ${problems.length ? `FAIL ${problems.join(',')}` : 'OK'}`);
    } catch (error) {
      console.log(`${f}: ERROR ${error.message}`);
    }
  }

  require(path.resolve('src/app.js'));
  console.log('APP_LOAD_OK');
  const { pool } = require(path.resolve('src/config/database.js'));
  await pool.end();
})();
