'use strict';

const fs = require('fs');

const files = [
  'src/views/auth/login.ejs',
  'src/views/auth/register.ejs',
  'src/views/home.ejs',
  'src/views/teacher/dashboard.ejs',
  'src/views/student/dashboard.ejs',
  'src/views/partials/footer.ejs',
  'src/views/partials/header.ejs',
  'src/views/partials/navbar-teacher.ejs',
];

for (const f of files) {
  const b = fs.readFileSync(f);
  const t = b.toString('utf8');
  const bom = b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf;
  const moji = /ToÃ¡n|ÄÄƒng|GiÃ¡o|Kiá»|Máº|Táº|Há»/.test(t);
  console.log(f, {
    bom,
    moji,
    hasKiemTra: t.includes('Kiểm tra'),
    hasDang: t.includes('Đăng') || t.includes('đăng') || !f.includes('auth'),
  });
}

const header = fs.readFileSync('src/views/partials/header.ejs', 'utf8');
console.log('charset:', header.includes('charset="UTF-8"'));
console.log('lang:', header.includes('lang="vi"'));
