'use strict';

/**
 * Smoke end-to-end: auth + teacher exam detail/scores/questions + student routes.
 * Usage: node scripts/smoke-full-check.js
 */
require('dotenv').config();
const http = require('http');
const { URL } = require('url');
const { pool } = require('../src/config/database');

const BASE = process.env.SMOKE_BASE || 'http://127.0.0.1:3000';
const failures = [];

function fail(msg) {
  failures.push(msg);
  console.error('FAIL:', msg);
}

function ok(msg) {
  console.log('OK:', msg);
}

function request(method, urlPath, { headers = {}, body, cookies } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlPath, BASE);
    const opts = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method,
      headers: { ...headers },
    };
    if (cookies) opts.headers.Cookie = cookies;
    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8'),
          cookies: res.headers['set-cookie'] || [],
        });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function mergeCookies(prev, sets) {
  const map = {};
  if (prev) {
    prev.split('; ').forEach((part) => {
      const i = part.indexOf('=');
      if (i > 0) map[part.slice(0, i)] = part.slice(i + 1);
    });
  }
  for (const raw of sets) {
    const kv = raw.split(';')[0];
    const i = kv.indexOf('=');
    if (i > 0) map[kv.slice(0, i)] = kv.slice(i + 1);
  }
  return Object.entries(map).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function login(email, password) {
  let cookies = '';
  let res = await request('GET', '/auth/login');
  cookies = mergeCookies(cookies, res.cookies);
  const csrf = (res.body.match(/name="_csrf" value="([^"]+)"/) || [])[1];
  if (!csrf) throw new Error(`No CSRF on login for ${email}`);
  const body = new URLSearchParams({ _csrf: csrf, email, password }).toString();
  res = await request('POST', '/auth/login', {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
    },
    body,
    cookies,
  });
  cookies = mergeCookies(cookies, res.cookies);
  if (res.status !== 302) {
    throw new Error(`Login failed for ${email}: ${res.status}`);
  }
  return cookies;
}

async function main() {
  // DB sanity
  const [teachers] = await pool.query(
    `SELECT id, email FROM nguoi_dung WHERE vai_tro = 'GIAO_VIEN' ORDER BY id`,
  );
  const [students] = await pool.query(
    `SELECT id, email FROM nguoi_dung WHERE vai_tro = 'HOC_SINH' ORDER BY id LIMIT 5`,
  );
  const [draft] = await pool.query(
    `SELECT id, ten_de, giao_vien_id, trang_thai
     FROM de_thi WHERE trang_thai = 'NHAP'
     ORDER BY id DESC LIMIT 1`,
  );
  ok(`DB teachers=${teachers.length} students=${students.length}`);

  // Health
  {
    const res = await request('GET', '/auth/login');
    if (res.status !== 200 || !res.body.includes('Đăng nhập')) fail('GET /auth/login');
    else ok('GET /auth/login');
  }

  // Teacher smoke — prefer owner of draft exam
  let teacherEmail = 'teacher@example.com';
  let examId = draft[0] && draft[0].id;
  if (draft[0]) {
    const owner = teachers.find((t) => Number(t.id) === Number(draft[0].giao_vien_id));
    if (owner) teacherEmail = owner.email;
  }

  let teacherCookies;
  try {
    teacherCookies = await login(teacherEmail, '123456');
    ok(`login teacher ${teacherEmail}`);
  } catch (error) {
    // fallback demo teacher
    teacherCookies = await login('teacher@example.com', '123456');
    teacherEmail = 'teacher@example.com';
    ok(`login teacher fallback ${teacherEmail}`);
  }

  {
    const res = await request('GET', '/teacher/dashboard', { cookies: teacherCookies });
    if (res.status !== 200) fail(`teacher dashboard ${res.status}`);
    else ok('teacher dashboard');
  }

  {
    const res = await request('GET', '/teacher/questions?khoiLop=12', { cookies: teacherCookies });
    if (res.status !== 200) fail(`questions filter ${res.status}`);
    else if (!res.body.includes('name="khoiLop"') && !res.body.includes('id="khoiLop"')) {
      fail('questions page missing khoiLop filter');
    } else ok('questions list + khoiLop filter');
  }

  {
    const res = await request('GET', '/teacher/questions/create', { cookies: teacherCookies });
    if (res.status !== 200) fail(`question create ${res.status}`);
    else if (!res.body.includes('name="khoiLop"')) fail('question create missing khoiLop');
    else ok('question create has lớp field');
  }

  if (examId) {
    const res = await request('GET', `/teacher/exams/${examId}`, { cookies: teacherCookies });
    if (res.status !== 200) {
      fail(`exam detail ${examId} status ${res.status}`);
    } else {
      ok(`exam detail ${examId}`);
      const hasScoresForm = res.body.includes('id="exam-scores-form"');
      const hasFlatScore = /name="diemCauHoi_\d+"/.test(res.body);
      const hasLegacyNested = /name="diemCauHoi\[/.test(res.body);
      const hasRedundantHint = res.body.includes('Sửa điểm các câu rồi bấm lưu một lần');
      const hasExamStack = res.body.includes('exam-stack');
      const hasAssignPanel = res.body.includes('Lớp được giao');

      if (hasScoresForm && !hasFlatScore) fail('scores form missing flat diemCauHoi_ fields');
      if (hasLegacyNested) fail('scores form still uses nested diemCauHoi[id] names');
      if (hasRedundantHint) fail('redundant score hint still present');
      if (!hasExamStack) fail('exam detail missing exam-stack layout');
      if (!hasAssignPanel) fail('exam detail missing Lớp được giao');
      if (hasScoresForm && hasFlatScore && !hasLegacyNested && !hasRedundantHint && hasExamStack) {
        ok('exam detail layout + flat score fields');
      }

      if (hasScoresForm) {
        const formHtml = (res.body.match(/id="exam-scores-form"[\s\S]*?<\/form>/) || [])[0] || '';
        const csrf = (formHtml.match(/name="_csrf" value="([^"]+)"/) || [])[1];
        const names = [...formHtml.matchAll(/name="(diemCauHoi_\d+)"/g)].map((m) => m[1]);
        if (!csrf || names.length === 0) {
          fail('cannot build score save payload');
        } else {
          const params = new URLSearchParams({ _csrf: csrf });
          for (const name of names) {
            const re = new RegExp(`name="${name}"[^>]*value="([^"]+)"`);
            const m = formHtml.match(re);
            params.set(name, m ? m[1] : '0.5');
          }
          const postBody = params.toString();
          const saveRes = await request('POST', `/teacher/exams/${examId}/questions/scores`, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Content-Length': Buffer.byteLength(postBody),
            },
            body: postBody,
            cookies: teacherCookies,
          });
          teacherCookies = mergeCookies(teacherCookies, saveRes.cookies);
          if (saveRes.status !== 302) fail(`save scores status ${saveRes.status}`);
          else {
            const after = await request('GET', `/teacher/exams/${examId}`, { cookies: teacherCookies });
            teacherCookies = mergeCookies(teacherCookies, after.cookies);
            if (after.body.includes('Đã lưu điểm')) ok('save scores success flash');
            else if (after.body.includes('Câu hỏi không hợp lệ') || after.body.includes('Danh sách điểm không hợp lệ')) {
              fail('save scores still shows validation error');
            } else fail('save scores redirect without success flash');
          }
        }
      } else {
        ok('exam detail has no editable scores (ok if not NHAP/empty)');
      }
    }
  } else {
    fail('no NHAP exam found for smoke');
  }

  // Student smoke — ưu tiên tài khoản demo
  const studentCandidates = [
    'studenta@example.com',
    'studentb@example.com',
    ...(students || []).map((s) => s.email),
  ].filter((email, index, all) => email && all.indexOf(email) === index);

  let studentLoggedIn = false;
  for (const studentEmail of studentCandidates) {
    try {
      let studentCookies = await login(studentEmail, '123456');
      ok(`login student ${studentEmail}`);
      const dash = await request('GET', '/student/dashboard', { cookies: studentCookies });
      if (dash.status !== 200) fail(`student dashboard ${dash.status}`);
      else ok('student dashboard');
      const exams = await request('GET', '/student/exams', { cookies: studentCookies });
      if (exams.status !== 200) fail(`student exams ${exams.status}`);
      else ok('student exams');
      studentLoggedIn = true;
      break;
    } catch (error) {
      console.log('skip student', studentEmail, error.message);
    }
  }
  if (!studentLoggedIn) {
    fail('no student account accepted password 123456 (run npm run demo:accounts)');
  }

  // Service-level flat score parse
  const { __testables } = require('../src/services/exam-service');
  const parsed = __testables.parseSelectedQuestions({
    cauHoiIds: ['7', '8'],
    diemCauHoi_7: '0.5',
    diemCauHoi_8: '1',
  });
  if (parsed.length === 2 && Number(parsed[0].diem) === 0.5) ok('parseSelectedQuestions flat fields');
  else fail(`parseSelectedQuestions flat fields unexpected: ${JSON.stringify(parsed)}`);

  console.log('\n---');
  if (failures.length) {
    console.error(`SMOKE FAILED: ${failures.length} issue(s)`);
    failures.forEach((f) => console.error(' -', f));
    process.exitCode = 1;
  } else {
    console.log('SMOKE PASSED');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
