'use strict';

/**
 * Chụp bổ sung ảnh học sinh + chi tiết đề (nếu có).
 * node scripts/capture-screenshots-student.js
 */

require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { pool } = require('../src/config/database');
const BASE = process.env.APP_BASE_URL || 'http://localhost:3000';
const OUT = path.join(__dirname, '..', 'screenshots');
const CHROME = process.env.CHROME_PATH
  || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name), fullPage: true });
  console.log('saved', name, page.url());
}

async function login(page, email, password) {
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#email');
  await page.click('#email', { clickCount: 3 });
  await page.type('#email', email);
  await page.click('#password', { clickCount: 3 });
  await page.type('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.pathname.includes('/auth/login'), { timeout: 60000 });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  // Tạo đề nháp tối thiểu nếu GV chưa có đề
  const [[gv]] = await pool.query("SELECT id FROM nguoi_dung WHERE email='teacher@example.com' LIMIT 1");
  const [exams] = await pool.query('SELECT id FROM de_thi WHERE giao_vien_id = ? LIMIT 1', [gv.id]);
  if (!exams.length) {
    const start = new Date();
    const end = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    const toMysql = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
    const [result] = await pool.execute(
      `INSERT INTO de_thi
         (giao_vien_id, ten_de, mo_ta, thoi_luong_phut, tong_diem,
          thoi_gian_bat_dau, thoi_gian_ket_thuc, so_lan_duoc_lam, tron_cau_hoi, cho_xem_dap_an, trang_thai)
       VALUES (?, ?, ?, 15, 0, ?, ?, 1, 0, 1, 'NHAP')`,
      [gv.id, 'Đề demo screenshot', 'Đề tạo tự động để chụp ảnh', toMysql(start), toMysql(end)],
    );
    console.log('created exam', result.insertId);
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    defaultViewport: { width: 1365, height: 900 },
    args: ['--no-sandbox'],
  });

  try {
    const teacherContext = await browser.createBrowserContext();
    const teacher = await teacherContext.newPage();
    await login(teacher, 'teacher@example.com', '123456');
    await teacher.goto(`${BASE}/teacher/exams`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const examHref = await teacher.$$eval('a[href^="/teacher/exams/"]', (links) => {
      return links.map((a) => a.getAttribute('href')).find((href) => href && /^\/teacher\/exams\/\d+/.test(href)) || null;
    });
    if (examHref) {
      await teacher.goto(`${BASE}${examHref}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await shot(teacher, '09-gv-chi-tiet-de.png');
    }
    await teacherContext.close();

    const studentContext = await browser.createBrowserContext();
    const student = await studentContext.newPage();
    await login(student, 'studenta@example.com', '123456');
    await shot(student, '10-hs-dashboard.png');
    await student.goto(`${BASE}/student/classes`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await shot(student, '11-hs-lop-hoc.png');
    await student.goto(`${BASE}/student/exams`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await shot(student, '12-hs-de-thi.png');
    await studentContext.close();

    console.log('Student/exam screenshots done');
  } finally {
    await browser.close();
    await pool.end();
  }
})().catch(async (error) => {
  console.error(error);
  try { await pool.end(); } catch {}
  process.exit(1);
});
