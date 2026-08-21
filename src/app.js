'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const methodOverride = require('method-override');

const { pool, testDatabase } = require('./config/database');
const { ensureDatabaseReady } = require('./config/ensure-database');
const flashMiddleware = require('./middleware/flash');
const csrfMiddleware = require('./middleware/csrf');
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');
const { startAutoSubmitJob } = require('./jobs/auto-submit-job');
const { startPasswordResetCleanupJob } = require('./jobs/password-reset-cleanup-job');

const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const teacherRoutes = require('./routes/teacher');
const studentRoutes = require('./routes/student');
const apiRoutes = require('./routes/api');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const behindProxy = isProduction || Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PUBLIC_DOMAIN);
const sessionSecret = process.env.SESSION_SECRET || 'math-exam-dev-secret-change-me-2026';

if (isProduction && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) {
  throw new Error('SESSION_SECRET phải được cấu hình tối thiểu 32 ký tự khi chạy production.');
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', behindProxy ? 1 : false);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
    },
  },
}));

app.use(morgan(isProduction ? 'combined' : 'dev'));

app.use(express.static(path.join(__dirname, '..', 'public')));
const { UPLOAD_DIR } = require('./middleware/upload');
app.use('/uploads/questions', express.static(UPLOAD_DIR));

app.use(express.urlencoded({ extended: true, arrayLimit: 0 }));
app.use(express.json());
app.use(methodOverride((req) => {
  if (req.body && typeof req.body === 'object' && req.body._method) {
    const method = req.body._method;
    delete req.body._method;
    return method;
  }
  if (req.query && req.query._method) {
    return req.query._method;
  }
  return undefined;
}));
app.use(cookieParser());

const sessionStore = new MySQLStore({
  clearExpired: true,
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: 8 * 60 * 60 * 1000,
}, pool);

app.use(session({
  name: 'connect.sid',
  secret: sessionSecret,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 8 * 60 * 60 * 1000,
  },
}));

app.use(flashMiddleware);
app.use(csrfMiddleware);

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.csrfToken = res.locals.csrfToken || req.session.csrfToken;
  res.locals.questionListPreview = require('./utils/question-preview').questionListPreview;
  next();
});

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/teacher', teacherRoutes);
app.use('/student', studentRoutes);
app.use('/api', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  await ensureDatabaseReady();
  await testDatabase();

  const port = Number(process.env.PORT) || 3000;

  return new Promise((resolve) => {
    // 0.0.0.0: cần thiết khi deploy container (Railway/Render/Docker)
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`Máy chủ đang chạy tại http://localhost:${port}`);
      console.log(`Thư mục ảnh câu hỏi: ${UPLOAD_DIR}`);
      startAutoSubmitJob();
      startPasswordResetCleanupJob();
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Không thể khởi động máy chủ:', error.message);
    process.exit(1);
  });
}

module.exports = {
  app,
  startServer,
};
