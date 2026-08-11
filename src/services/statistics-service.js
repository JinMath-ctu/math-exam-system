'use strict';

const examRepository = require('../repositories/exam-repository');
const statisticsRepository = require('../repositories/statistics-repository');
const { AppError, ERROR_CODES } = require('../utils/errors');

const BUCKET_COUNT = 5;

function buildScoreDistribution(scores, maxScore) {
  const max = maxScore > 0 ? maxScore : 10;
  const bucketSize = max / BUCKET_COUNT;
  const buckets = Array.from({ length: BUCKET_COUNT }, (_, i) => ({
    khoang: `${(i * bucketSize).toFixed(1)}–${((i + 1) * bucketSize).toFixed(1)}`,
    soLuong: 0,
  }));

  scores.forEach((score) => {
    let index = bucketSize > 0 ? Math.floor(score / bucketSize) : 0;
    if (index >= BUCKET_COUNT) index = BUCKET_COUNT - 1;
    if (index < 0) index = 0;
    buckets[index].soLuong += 1;
  });

  return buckets;
}

async function getExamStatistics(examId, giaoVienId) {
  const exam = await examRepository.findByIdForTeacher(examId, giaoVienId);
  if (!exam) {
    throw new AppError('Không tìm thấy đề thi.', ERROR_CODES.NOT_FOUND);
  }

  const [assignedCount, statusCounts, officialScores, perQuestion] = await Promise.all([
    statisticsRepository.countAssignedStudents(examId),
    statisticsRepository.getStudentStatusCounts(examId),
    statisticsRepository.getOfficialScores(examId),
    statisticsRepository.getPerQuestionAccuracy(examId),
  ]);

  const soLuotDaCham = officialScores.length;
  const diemTrungBinh = soLuotDaCham > 0
    ? officialScores.reduce((sum, score) => sum + score, 0) / soLuotDaCham
    : 0;
  const diemCaoNhat = soLuotDaCham > 0 ? Math.max(...officialScores) : 0;
  const diemThapNhat = soLuotDaCham > 0 ? Math.min(...officialScores) : 0;

  const typeLabels = {
    MOT_DAP_AN: 'Một đáp án',
    DUNG_SAI: 'Đúng/Sai',
    TRA_LOI_NGAN: 'Trả lời ngắn',
    TU_LUAN: 'Tự luận',
  };

  return {
    exam,
    tongHocSinhDuocGiao: assignedCount,
    daLam: statusCounts.daNop,
    soLuotDaCham,
    chuaLam: statusCounts.chuaLam,
    dangLam: statusCounts.dangLam,
    diemTrungBinh: Number(diemTrungBinh.toFixed(2)),
    diemCaoNhat: Number(diemCaoNhat.toFixed(2)),
    diemThapNhat: Number(diemThapNhat.toFixed(2)),
    phanBoDiem: buildScoreDistribution(officialScores, Number(exam.tong_diem)),
    tiLeDungTheoCau: perQuestion.map((row) => ({
      cauHoiId: row.cau_hoi_id,
      thuTuGoc: row.thu_tu_goc,
      noiDung: row.noi_dung,
      loaiCauHoi: row.loai_cau_hoi,
      loaiCauHoiLabel: typeLabels[row.loai_cau_hoi] || row.loai_cau_hoi,
      tiLeDung: row.ti_le_dung == null ? 0 : Number((Number(row.ti_le_dung) * 100).toFixed(1)),
      soLuotDaCham: row.so_luot_da_cham,
    })),
  };
}

module.exports = {
  getExamStatistics,
};
