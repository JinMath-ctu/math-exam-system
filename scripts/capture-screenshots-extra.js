'use strict';

/**
 * Bổ sung screenshot: thống kê, sự cố, kết quả, phòng thi (nếu có).
 * node scripts/capture-screenshots-extra.js
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

  // Công bố đề demo của teacher@ nếu đang NHAP và đủ điều kiện tối thiểu
  const [[gv]] = await pool.query("SELECT id FROM nguoi_dung WHERE email='teacher@example.com' LIMIT 1");
  if (gv) {
    const [exams] = await pool.query(
      `SELECT id FROM de_thi WHERE giao_vien_id = ? AND trang_thai = 'NHAP' ORDER BY id DESC LIMIT 1`,
      [gv.id],
    );
    if (exams.length) {
      const examId = exams[0].id;
      const [[qc]] = await pool.query('SELECT COUNT(*) AS n FROM cau_hoi_de_thi WHERE de_thi_id = ?', [examId]);
      const [[ac]] = await pool.query('SELECT COUNT(*) AS n FROM phan_cong_de WHERE de_thi_id = ?', [examId]);
      if (Number(qc.n) > 0 && Number(ac.n) > 0) {
        await pool.query(
          `UPDATE de_thi SET trang_thai = 'DA_CONG_BO', thoi_gian_ket_thuc = DATE_ADD(NOW(), INTERVAL 7 DAY)
           WHERE id = ?`,
          [examId],
        );
        console.log('published exam', examId, 'for screenshots');
      }
    }
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    defaultViewport: { width: 1365, height: 900 },
    args: ['--no-sandbox'],
  });

  try {
    const teacherCtx = await browser.createBrowserContext();
    const teacher = await teacherCtx.newPage();
    await login(teacher, 'teacher@example.com', '123456');

    await teacher.goto(`${BASE}/teacher/exams`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const examHref = await teacher.$$eval('a[href^="/teacher/exams/"]', (links) => {
      return links.map((a) => a.getAttribute('href')).find((href) => href && /^\/teacher\/exams\/\d+$/.test(href)) || null;
    }).catch(() => null);

    await teacher.goto(`${BASE}/teacher/incidents`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await shot(teacher, '13-gv-su-co.png');

    if (examHref) {
      await teacher.goto(`${BASE}${examHref}/statistics`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await shot(teacher, '14-gv-thong-ke.png');
      await teacher.goto(`${BASE}${examHref}/attempts`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await shot(teacher, '15-gv-luot-lam.png');
    }

    await teacherCtx.close();

    const studentCtx = await browser.createBrowserContext();
    const student = await studentCtx.newPage();
    await login(student, 'studenta@example.com', '123456');

    await student.goto(`${BASE}/student/results`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await shot(student, '16-hs-ket-qua.png');

    await student.goto(`${BASE}/student/exams`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const detailHref = await student.$$eval('a[href^="/student/exams/"]', (links) => {
      return links.map((a) => a.getAttribute('href')).find((href) => href && /^\/student\/exams\/\d+/.test(href)) || null;
    }).catch(() => null);

    if (detailHref) {
      await student.goto(`${BASE}${detailHref}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await shot(student, '17-hs-chi-tiet-de.png');

      const started = await student.evaluate(async () => {
        const btn = document.querySelector('.start-attempt-btn');
        if (!btn) return { ok: false, reason: 'no-start-btn' };
        const examId = btn.getAttribute('data-exam-id');
        const classId = btn.getAttribute('data-class-id');
        const csrf = document.querySelector('meta[name="csrf-token"]')?.content
          || document.querySelector('input[name="_csrf"]')?.value
          || '';
        const res = await fetch('/api/exams/' + examId + '/classes/' + classId + '/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrf,
          },
          body: JSON.stringify({}),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body?.data?.attemptId) {
          return { ok: false, reason: body?.message || ('http-' + res.status) };
        }
        return { ok: true, attemptId: body.data.attemptId };
      });

      if (started && started.ok) {
        await student.goto(`${BASE}/student/attempts/${started.attemptId}`, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });
        await student.waitForSelector('#exam-room-page, #question-panel, #timer', { timeout: 20000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 2000));
        await shot(student, '18-hs-phong-thi.png');
      } else {
        console.log('skip exam-room:', started && started.reason);
      }
    }

    await studentCtx.close();
    console.log('Extra screenshots done');
  } finally {
    await browser.close();
    await pool.end();
  }
})().catch(async (error) => {
  console.error(error);
  try { await pool.end(); } catch {}
  process.exit(1);
});
