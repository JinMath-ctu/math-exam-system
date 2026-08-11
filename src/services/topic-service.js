'use strict';

const topicRepository = require('../repositories/topic-repository');
const withTransaction = require('../utils/with-transaction');
const { AppError, ERROR_CODES } = require('../utils/errors');

async function getOwnedTopic(topicId, giaoVienId) {
  const topic = await topicRepository.findById(topicId);
  if (!topic) {
    throw new AppError('Không tìm thấy chủ đề.', ERROR_CODES.NOT_FOUND);
  }
  if (Number(topic.giao_vien_id) !== Number(giaoVienId)) {
    throw new AppError('Bạn không có quyền truy cập chủ đề này.', ERROR_CODES.FORBIDDEN);
  }
  return topic;
}

async function listTopicsForTeacher(giaoVienId, filters) {
  return topicRepository.listByTeacher(giaoVienId, filters);
}

async function createTopic({ giaoVienId, tenChuDe, khoiLop, moTa }) {
  return topicRepository.createTopic({
    giaoVienId,
    tenChuDe: tenChuDe.trim(),
    khoiLop: khoiLop || null,
    moTa: moTa ? moTa.trim() : null,
  });
}

async function updateTopic(topicId, giaoVienId, { tenChuDe, khoiLop, moTa }) {
  await getOwnedTopic(topicId, giaoVienId);
  await topicRepository.updateTopic(topicId, {
    tenChuDe: tenChuDe.trim(),
    khoiLop: khoiLop || null,
    moTa: moTa ? moTa.trim() : null,
  });
  return topicRepository.findById(topicId);
}

async function deleteTopic(topicId, giaoVienId) {
  await getOwnedTopic(topicId, giaoVienId);

  return withTransaction(async (connection) => {
    const activeQuestionCount = await topicRepository.countActiveQuestions(topicId, connection);
    if (activeQuestionCount > 0) {
      throw new AppError(
        `Chủ đề đang có ${activeQuestionCount} câu hỏi hoạt động, không thể xóa. Hãy chuyển chủ đề khác hoặc xóa các câu hỏi trước.`,
        ERROR_CODES.CONFLICT,
      );
    }

    await topicRepository.deleteTopic(topicId, connection);
  });
}

module.exports = {
  listTopicsForTeacher,
  createTopic,
  updateTopic,
  deleteTopic,
};
