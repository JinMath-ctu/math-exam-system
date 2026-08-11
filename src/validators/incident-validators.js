'use strict';

const { body } = require('express-validator');

const LOAI_SU_CO_VALUES = ['MAT_DIEN', 'MAT_MANG', 'LOI_TRINH_DUYET', 'LOI_HE_THONG', 'KHAC'];

const reportIncidentRules = [
  body('loaiSuCo')
    .notEmpty()
    .withMessage('Vui lòng chọn loại sự cố.')
    .isIn(LOAI_SU_CO_VALUES)
    .withMessage('Loại sự cố không hợp lệ.'),
  body('batDauLuc').optional({ checkFalsy: true }),
  body('ketThucLuc').optional({ checkFalsy: true }),
  body('moTa')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Mô tả tối đa 2000 ký tự.'),
];

const approveIncidentRules = [
  body('soGiayBuGio')
    .notEmpty()
    .withMessage('Vui lòng nhập số giây bù giờ.')
    .isInt({ min: 1, max: 7200 })
    .withMessage('Số giây bù giờ phải là số nguyên từ 1 đến 7200.'),
  body('lyDoXuLy')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Lý do tối đa 1000 ký tự.'),
];

const rejectIncidentRules = [
  body('lyDoXuLy')
    .trim()
    .notEmpty()
    .withMessage('Vui lòng nhập lý do từ chối.')
    .isLength({ max: 1000 })
    .withMessage('Lý do tối đa 1000 ký tự.'),
];

module.exports = {
  LOAI_SU_CO_VALUES,
  reportIncidentRules,
  approveIncidentRules,
  rejectIncidentRules,
};
