'use strict';

/**
 * Chụp lại ảnh thống kê sau khi sửa Chart JSON.
 * node scripts/capture-statistics-screenshot.js
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

  const [[exam]] = await pool.query(
    `SELECT dt.id
     FROM de_thi dt
     JOIN nguoi_dung nd ON nd.id = dt.giao_vien_id
     WHERE nd.email = 'teacher@example.com' AND dt.trang_thai = 'DA_CONG_BO'
     ORDER BY dt.id DESC
     LIMIT 1`,
  );

  if (!exam) {
    throw new Error('Không có đề DA_CONG_BO của teacher@example.com để chụp thống kê.');
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    defaultViewport: { width: 1365, height: 900 },
    args: ['--no-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await login(page, 'teacher@example.com', '123456');
    await page.goto(`${BASE}/teacher/exams/${exam.id}/statistics`, {
      waitUntil: 'networkidle0',
      timeout: 60000,
    });
    await page.waitForSelector('#scoreDistributionChart, #exam-stats-data', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1500));

    const parseOk = await page.evaluate(() => {
      const el = document.getElementById('exam-stats-data');
      if (!el) return false;
      try {
        JSON.parse(el.textContent || '{}');
        return true;
      } catch (_e) {
        return false;
      }
    });
    if (!parseOk) {
      throw new Error('exam-stats-data JSON parse failed — kiểm tra statistics.ejs');
    }

    const out = path.join(OUT, '14-gv-thong-ke.png');
    await page.screenshot({ path: out, fullPage: true });
    console.log('saved', out, 'exam', exam.id);
  } finally {
    await browser.close();
    await pool.end();
  }
})().catch(async (error) => {
  console.error(error);
  try { await pool.end(); } catch {}
  process.exit(1);
});
