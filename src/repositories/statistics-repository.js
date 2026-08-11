'use strict';

const { pool } = require('../config/database');

const SUBMITTED_STATUSES_SQL = "('DA_NOP', 'TU_DONG_NOP', 'DA_CHAM')";
const OFFICIAL_STATUS_SQL = "'DA_CHAM'";

// Số học sinh khác nhau đang DANG_HOC ở (các) lớp được giao đề này.
async function countAssignedStudents(examId) {
  const [rows] = await pool.execute(
    `SELECT COUNT(DISTINCT tvl.hoc_sinh_id) AS total
     FROM phan_cong_de pcd
     JOIN thanh_vien_lop tvl ON tvl.lop_hoc_id = pcd.lop_hoc_id AND tvl.trang_thai = 'DANG_HOC'
     WHERE pcd.de_thi_id = ?`,
    [examId],
  );
  return rows[0]?.total || 0;
}

// Với mỗi học sinh được giao đề: đã nộp (DA_NOP/TU_DONG_NOP/DA_CHAM) ở bất kỳ
// lượt nào, hay đang làm (DANG_LAM) mà chưa nộp lượt nào, hay chưa từng bắt đầu.
async function getStudentStatusCounts(examId) {
  const [rows] = await pool.execute(
    `SELECT
        hs.hoc_sinh_id,
        MAX(CASE WHEN llb.trang_thai IN ${SUBMITTED_STATUSES_SQL}
                  AND llb.thoi_gian_nop IS NOT NULL THEN 1 ELSE 0 END) AS da_nop,
        MAX(CASE WHEN llb.trang_thai = 'DANG_LAM' THEN 1 ELSE 0 END) AS dang_lam
     FROM (
        SELECT DISTINCT tvl.hoc_sinh_id
        FROM phan_cong_de pcd
        JOIN thanh_vien_lop tvl ON tvl.lop_hoc_id = pcd.lop_hoc_id AND tvl.trang_thai = 'DANG_HOC'
        WHERE pcd.de_thi_id = ?
     ) hs
     LEFT JOIN luot_lam_bai llb ON llb.hoc_sinh_id = hs.hoc_sinh_id AND llb.de_thi_id = ?
     GROUP BY hs.hoc_sinh_id`,
    [examId, examId],
  );

  let daNop = 0;
  let dangLam = 0;
  let chuaLam = 0;

  rows.forEach((row) => {
    if (Number(row.da_nop) === 1) {
      daNop += 1;
    } else if (Number(row.dang_lam) === 1) {
      dangLam += 1;
    } else {
      chuaLam += 1;
    }
  });

  return { daNop, dangLam, chuaLam };
}

// Điểm chính thức chỉ lấy các lượt đã chấm hoàn tất. Mỗi lượt tính riêng (kể cả
// học sinh làm nhiều lần); tên/nhãn ở service và view nói rõ đây là số lượt.
async function getOfficialScores(examId) {
  const [rows] = await pool.execute(
    `SELECT tong_diem FROM luot_lam_bai
     WHERE de_thi_id = ?
       AND trang_thai = ${OFFICIAL_STATUS_SQL}
       AND thoi_gian_nop IS NOT NULL`,
    [examId],
  );
  return rows.map((row) => Number(row.tong_diem));
}

// Tỉ lệ điểm đạt được / điểm tối đa trung bình theo từng câu trong đề (áp dụng
// chung cho cả câu tự động chấm lẫn tự luận), chỉ tính trên các lượt DA_CHAM hợp
// lệ. Câu bỏ trống được tính 0 điểm trong mẫu số thay vì bị AVG bỏ qua.
async function getPerQuestionAccuracy(examId) {
  const [rows] = await pool.execute(
    `SELECT chdt.cau_hoi_id, chdt.thu_tu_goc, chdt.diem AS diem_toi_da,
            ch.noi_dung, ch.loai_cau_hoi,
            COUNT(llb.id) AS so_luot_da_cham,
            AVG(CASE WHEN llb.id IS NOT NULL
                THEN COALESCE(ctbl.diem_dat_duoc, 0) / NULLIF(chdt.diem, 0)
                ELSE NULL END) AS ti_le_dung
     FROM cau_hoi_de_thi chdt
     JOIN cau_hoi ch ON ch.id = chdt.cau_hoi_id
     LEFT JOIN luot_lam_bai llb ON llb.de_thi_id = chdt.de_thi_id
       AND llb.trang_thai = ${OFFICIAL_STATUS_SQL}
       AND llb.thoi_gian_nop IS NOT NULL
     LEFT JOIN chi_tiet_bai_lam ctbl ON ctbl.luot_lam_bai_id = llb.id AND ctbl.cau_hoi_id = chdt.cau_hoi_id
     WHERE chdt.de_thi_id = ?
     GROUP BY chdt.cau_hoi_id, chdt.thu_tu_goc, chdt.diem, ch.noi_dung, ch.loai_cau_hoi
     ORDER BY chdt.thu_tu_goc ASC`,
    [examId],
  );
  return rows;
}

module.exports = {
  countAssignedStudents,
  getStudentStatusCounts,
  getOfficialScores,
  getPerQuestionAccuracy,
};
