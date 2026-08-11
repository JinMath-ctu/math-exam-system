'use strict';

const crypto = require('crypto');
const classRepository = require('../repositories/class-repository');
const withTransaction = require('../utils/with-transaction');
const { AppError, ERROR_CODES } = require('../utils/errors');

const MA_LOP_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_CODE_ATTEMPTS = 8;

function generateCandidateCode() {
  const bytes = crypto.randomBytes(6);
  let suffix = '';
  for (let i = 0; i < bytes.length; i += 1) {
    suffix += MA_LOP_CODE_CHARS[bytes[i] % MA_LOP_CODE_CHARS.length];
  }
  return `LOP${suffix}`;
}

async function resolveMaLop(maLop) {
  if (maLop) {
    const normalized = maLop.trim().toUpperCase();
    const existing = await classRepository.findByMaLop(normalized);
    if (existing) {
      throw new AppError('Mã lớp đã được sử dụng, vui lòng chọn mã khác.', ERROR_CODES.CONFLICT);
    }
    return normalized;
  }

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const candidate = generateCandidateCode();
    const existing = await classRepository.findByMaLop(candidate);
    if (!existing) {
      return candidate;
    }
  }

  throw new AppError('Không thể tạo mã lớp tự động, vui lòng thử lại.', ERROR_CODES.DATABASE_ERROR);
}

async function createClass({ giaoVienId, tenLop, maLop, moTa }) {
  const finalMaLop = await resolveMaLop(maLop);

  try {
    return await classRepository.createClass({
      giaoVienId,
      tenLop: tenLop.trim(),
      maLop: finalMaLop,
      moTa: moTa ? moTa.trim() : null,
    });
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      throw new AppError('Mã lớp đã được sử dụng, vui lòng thử lại.', ERROR_CODES.CONFLICT);
    }
    throw error;
  }
}

async function listClassesForTeacher(giaoVienId, filters) {
  return classRepository.listByTeacher(giaoVienId, filters);
}

async function getOwnedClass(classId, giaoVienId) {
  const cls = await classRepository.findById(classId);
  if (!cls) {
    throw new AppError('Không tìm thấy lớp học.', ERROR_CODES.NOT_FOUND);
  }
  if (Number(cls.giao_vien_id) !== Number(giaoVienId)) {
    throw new AppError('Bạn không có quyền truy cập lớp học này.', ERROR_CODES.FORBIDDEN);
  }
  return cls;
}

async function getClassDetail(classId, giaoVienId) {
  const cls = await getOwnedClass(classId, giaoVienId);
  const [members, attemptCount] = await Promise.all([
    classRepository.listMembers(classId, { trangThai: 'DANG_HOC' }),
    classRepository.countAttemptsInClass(classId),
  ]);
  return {
    cls,
    members,
    attemptCount,
    canDelete: Number(attemptCount) === 0,
  };
}

async function updateClass(classId, giaoVienId, { tenLop, moTa }) {
  await getOwnedClass(classId, giaoVienId);
  await classRepository.updateClass(classId, {
    tenLop: tenLop.trim(),
    moTa: moTa ? moTa.trim() : null,
  });
  return classRepository.findById(classId);
}

async function archiveClass(classId, giaoVienId) {
  const cls = await getOwnedClass(classId, giaoVienId);
  if (cls.trang_thai === 'LUU_TRU') {
    throw new AppError('Lớp học đã được lưu trữ trước đó.', ERROR_CODES.CONFLICT);
  }
  await classRepository.archiveClass(classId);
}

function assertClassHardDeleteAllowed(attemptCount) {
  if (Number(attemptCount) > 0) {
    throw new AppError(
      'Lớp đã có lịch sử làm bài, không thể xóa cứng. Hãy lưu trữ lớp để ngừng nhận học sinh mới.',
      ERROR_CODES.CONFLICT,
    );
  }
}

async function deleteClass(classId, giaoVienId) {
  return withTransaction(async (connection) => {
    const cls = await classRepository.findByIdForTeacherForUpdate(connection, classId, giaoVienId);
    if (!cls) {
      throw new AppError('Không tìm thấy lớp học.', ERROR_CODES.NOT_FOUND);
    }

    const attemptCount = await classRepository.countAttemptsInClass(cls.id, connection);
    assertClassHardDeleteAllowed(attemptCount);

    const deleted = await classRepository.deleteOwned(connection, cls.id, giaoVienId);
    if (!deleted) {
      throw new AppError('Không thể xóa lớp học.', ERROR_CODES.CONFLICT);
    }

    return cls;
  });
}

async function removeMember(classId, giaoVienId, studentId) {
  await getOwnedClass(classId, giaoVienId);

  return withTransaction(async (connection) => {
    const membership = await classRepository.findMembershipForUpdate(classId, studentId, connection);
    if (!membership || membership.trang_thai !== 'DANG_HOC') {
      throw new AppError('Học sinh không thuộc lớp học hoặc đã rời lớp.', ERROR_CODES.NOT_FOUND);
    }

    await classRepository.setMemberStatus(membership.id, 'DA_ROI_LOP', connection);
  });
}

async function joinClass(hocSinhId, maLop) {
  const normalized = String(maLop || '').trim().toUpperCase();

  return withTransaction(async (connection) => {
    const cls = await classRepository.findByMaLopForUpdate(normalized, connection);
    if (!cls) {
      throw new AppError('Mã lớp không tồn tại.', ERROR_CODES.NOT_FOUND);
    }

    if (cls.trang_thai === 'LUU_TRU') {
      throw new AppError('Lớp học đã lưu trữ, không thể tham gia.', ERROR_CODES.CONFLICT);
    }

    const membership = await classRepository.findMembershipForUpdate(cls.id, hocSinhId, connection);

    if (membership && membership.trang_thai === 'DANG_HOC') {
      throw new AppError('Bạn đã là thành viên của lớp học này.', ERROR_CODES.CONFLICT);
    }

    if (membership) {
      await classRepository.setMemberStatus(membership.id, 'DANG_HOC', connection);
    } else {
      await classRepository.addMember(cls.id, hocSinhId, connection);
    }

    return cls;
  });
}

async function leaveClass(hocSinhId, classId) {
  return withTransaction(async (connection) => {
    const membership = await classRepository.findMembershipForUpdate(classId, hocSinhId, connection);
    if (!membership || membership.trang_thai !== 'DANG_HOC') {
      throw new AppError('Bạn không thuộc lớp học này.', ERROR_CODES.NOT_FOUND);
    }

    const hasActiveAttempt = await classRepository.hasActiveAttemptInClass(classId, hocSinhId, connection);
    if (hasActiveAttempt) {
      throw new AppError('Bạn còn bài thi đang làm trong lớp này, không thể rời lớp.', ERROR_CODES.CONFLICT);
    }

    await classRepository.setMemberStatus(membership.id, 'DA_ROI_LOP', connection);
  });
}

async function listMyClasses(hocSinhId) {
  return classRepository.listMyClasses(hocSinhId);
}

module.exports = {
  createClass,
  listClassesForTeacher,
  getClassDetail,
  updateClass,
  archiveClass,
  deleteClass,
  removeMember,
  joinClass,
  leaveClass,
  listMyClasses,
  __testables: {
    assertClassHardDeleteAllowed,
  },
};
