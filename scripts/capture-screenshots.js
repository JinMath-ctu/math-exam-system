'use strict';

/**
 * Chụp ảnh giao diện chính vào screenshots/
 * node scripts/capture-screenshots.js
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const BASE = process.env.APP_BASE_URL || 'http://localhost:3000';
const OUT = path.join(__dirname, '..', 'screenshots');
const CHROME = process.env.CHROME_PATH
  || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  console.log('saved', name, 'url=', page.url());
}

async function login(page, email, password) {
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle2' });
  await page.$eval('#email', (el) => { el.value = ''; });
  await page.$eval('#password', (el) => { el.value = ''; });
  await page.type('#email', email, { delay: 5 });
  await page.type('#password', password, { delay: 5 });
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
  ]);
  if (page.url().includes('/auth/login')) {
    const flash = await page.$eval('.flash, .alert, [role="alert"]', (el) => el.textContent.trim()).catch(() => '');
    throw new Error(`Login failed for ${email}. Still on login. ${flash}`);
  }
}

async function logout(page) {
  await page.evaluate(() => {
    const token = document.querySelector('input[name="_csrf"]')?.value
      || document.querySelector('meta[name="csrf-token"]')?.content
      || '';
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/auth/logout';
    const csrf = document.createElement('input');
    csrf.type = 'hidden';
    csrf.name = '_csrf';
    csrf.value = token;
    form.appendChild(csrf);
    document.body.appendChild(form);
    form.submit();
  });
  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    defaultViewport: { width: 1365, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  try {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
    await shot(page, '01-trang-chu.png');

    await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle2' });
    await shot(page, '02-dang-nhap.png');

    await page.goto(`${BASE}/auth/register`, { waitUntil: 'networkidle2' });
    await shot(page, '03-dang-ky-hoc-sinh.png');

    await login(page, 'teacher@example.com', '123456');
    await shot(page, '04-gv-dashboard.png');

    await page.goto(`${BASE}/teacher/classes`, { waitUntil: 'networkidle2' });
    await shot(page, '05-gv-lop-hoc.png');

    await page.goto(`${BASE}/teacher/questions`, { waitUntil: 'networkidle2' });
    await shot(page, '06-gv-ngan-hang-cau-hoi.png');

    await page.goto(`${BASE}/teacher/questions/create`, { waitUntil: 'networkidle2' });
    await shot(page, '07-gv-tao-cau-hoi.png');

    await page.goto(`${BASE}/teacher/exams`, { waitUntil: 'networkidle2' });
    await shot(page, '08-gv-danh-sach-de.png');

    const examHref = await page.$$eval('a[href^="/teacher/exams/"]', (links) => {
      const hit = links
        .map((a) => a.getAttribute('href'))
        .find((href) => href && /^\/teacher\/exams\/\d+/.test(href));
      return hit || null;
    }).catch(() => null);
    if (examHref) {
      await page.goto(`${BASE}${examHref}`, { waitUntil: 'networkidle2' });
      await shot(page, '09-gv-chi-tiet-de.png');
    } else {
      console.log('skip 09 — no exam detail link');
    }

    await logout(page);

    await login(page, 'studenta@example.com', '123456');
    await shot(page, '10-hs-dashboard.png');

    await page.goto(`${BASE}/student/classes`, { waitUntil: 'networkidle2' });
    await shot(page, '11-hs-lop-hoc.png');

    await page.goto(`${BASE}/student/exams`, { waitUntil: 'networkidle2' });
    await shot(page, '12-hs-de-thi.png');

    console.log('Done. Files in screenshots/');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
