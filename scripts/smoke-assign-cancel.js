'use strict';

require('dotenv').config();
const http = require('http');
const { pool } = require('../src/config/database');

function req(method, path, { body, cookie } = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? new URLSearchParams(body).toString() : null;
    const headers = {};
    if (data) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['Content-Length'] = Buffer.byteLength(data);
    }
    if (cookie) headers.Cookie = cookie;

    const r = http.request({ hostname: 'localhost', port: 3000, path, method, headers }, (res) => {
      let chunks = '';
      res.on('data', (d) => { chunks += d; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: chunks }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

function pickCookie(setCookie) {
  if (!setCookie) return '';
  return setCookie.map((c) => c.split(';')[0]).join('; ');
}

function extractCsrf(html) {
  const m = html.match(/name="_csrf" value="([^"]+)"/);
  return m ? m[1] : null;
}

function extractFlash(html) {
  const flashes = [];
  const re = /class="flash (?:flash-success|flash-error|flash-info)"[^>]*>([^<]*)/g;
  let m;
  while ((m = re.exec(html))) {
    const text = m[1].trim();
    if (text) flashes.push(text);
  }
  return flashes;
}

(async () => {
  await pool.execute("UPDATE de_thi SET trang_thai = 'NHAP' WHERE id = 3");
  await pool.execute('DELETE FROM phan_cong_de WHERE de_thi_id = 3');

  const loginPage = await req('GET', '/auth/login');
  let cookie = pickCookie(loginPage.headers['set-cookie']);
  const csrf = extractCsrf(loginPage.body);

  const login = await req('POST', '/auth/login', {
    cookie,
    body: { _csrf: csrf, email: 'teacher@example.com', password: '123456' },
  });
  const nextCookie = pickCookie(login.headers['set-cookie']);
  if (nextCookie) cookie = nextCookie;

  let detail = await req('GET', '/teacher/exams/3', { cookie });
  let csrfTok = extractCsrf(detail.body);
  const lop = (detail.body.match(/name="lopHocId"[\s\S]*?<option value="(\d+)"/) || [])[1];
  console.log('lop', lop, 'hasAssign', detail.body.includes('/assign'));

  const assign = await req('POST', '/teacher/exams/3/assign', {
    cookie,
    body: { _csrf: csrfTok, lopHocId: lop },
  });
  detail = await req('GET', assign.headers.location || '/teacher/exams/3', { cookie });
  console.log('after assign:', extractFlash(detail.body), 'hasUnassign', detail.body.includes('/unassign'));

  csrfTok = extractCsrf(detail.body);
  const unassign = await req('POST', '/teacher/exams/3/unassign', {
    cookie,
    body: { _csrf: csrfTok, lopHocId: lop },
  });
  detail = await req('GET', unassign.headers.location || '/teacher/exams/3', { cookie });
  console.log('after unassign:', extractFlash(detail.body), 'hasAssignAgain', detail.body.includes('name="lopHocId"'));

  csrfTok = extractCsrf(detail.body);
  await req('POST', '/teacher/exams/3/assign', {
    cookie,
    body: { _csrf: csrfTok, lopHocId: lop },
  });

  detail = await req('GET', '/teacher/exams/3', { cookie });
  csrfTok = extractCsrf(detail.body);
  const cancel = await req('POST', '/teacher/exams/3/cancel', {
    cookie,
    body: { _csrf: csrfTok },
  });
  detail = await req('GET', cancel.headers.location || '/teacher/exams/3', { cookie });
  console.log('after cancel:', extractFlash(detail.body), 'badge', (detail.body.match(/>(Nháp|Đã công bố|Đã hủy)</) || [])[1]);

  await pool.execute("UPDATE de_thi SET trang_thai = 'NHAP' WHERE id = 3");
  await pool.execute(
    'INSERT IGNORE INTO phan_cong_de (de_thi_id, lop_hoc_id) VALUES (3, ?)',
    [Number(lop)],
  );

  await pool.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
