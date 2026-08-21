'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { AppError, ERROR_CODES } = require('../utils/errors');

// Railway: gắn Volume tại /app/uploads và set UPLOAD_DIR=/app/uploads/questions
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '..', '..', 'uploads', 'questions');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, UPLOAD_DIR);
  },
  filename(req, file, callback) {
    const ext = path.extname(file.originalname).toLowerCase();
    const randomName = crypto.randomBytes(16).toString('hex');
    callback(null, `${randomName}${ext}`);
  },
});

function fileFilter(req, file, callback) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(file.mimetype)) {
    callback(new AppError('Chỉ nhận ảnh JPG, JPEG, PNG hoặc WEBP.', ERROR_CODES.VALIDATION_ERROR));
    return;
  }

  callback(null, true);
}

const questionImageUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
});

function uploadQuestionImage(req, res, next) {
  questionImageUpload.single('anh')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        next(new AppError('Ảnh vượt quá dung lượng cho phép (tối đa 5MB).', ERROR_CODES.VALIDATION_ERROR));
        return;
      }
      next(new AppError('Không thể tải ảnh lên. Vui lòng thử lại.', ERROR_CODES.VALIDATION_ERROR));
      return;
    }

    next(error);
  });
}

function toRelativeUrl(filename) {
  return `/uploads/questions/${filename}`;
}

function toAbsolutePath(relativeUrl) {
  const filename = path.basename(relativeUrl);
  return path.join(UPLOAD_DIR, filename);
}

async function copyUploadedFile(relativeUrl) {
  if (!relativeUrl) {
    return null;
  }

  const sourcePath = toAbsolutePath(relativeUrl);
  const extension = path.extname(sourcePath).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new AppError('Đường dẫn ảnh câu hỏi không hợp lệ.', ERROR_CODES.VALIDATION_ERROR);
  }

  const filename = `${crypto.randomBytes(16).toString('hex')}${extension}`;
  const destinationPath = path.join(UPLOAD_DIR, filename);
  await fs.promises.copyFile(sourcePath, destinationPath, fs.constants.COPYFILE_EXCL);

  return toRelativeUrl(filename);
}

async function deleteUploadedFile(relativeUrl) {
  if (!relativeUrl) {
    return;
  }

  try {
    await fs.promises.unlink(toAbsolutePath(relativeUrl));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Không thể xóa file ảnh đã upload:', error.message);
    }
  }
}

module.exports = {
  uploadQuestionImage,
  toRelativeUrl,
  copyUploadedFile,
  deleteUploadedFile,
  UPLOAD_DIR,
};
