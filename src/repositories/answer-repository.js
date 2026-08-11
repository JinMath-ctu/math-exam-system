'use strict';

const { pool } = require('../config/database');

function getExecutor(executor) {
  return executor || pool;
}

async function findByQuestionId(cauHoiId, executor) {
  const db = getExecutor(executor);
  const [rows] = await db.execute(
    `SELECT id, cau_hoi_id, noi_dung, noi_dung_latex, la_dap_an_dung, thu_tu
     FROM dap_an
     WHERE cau_hoi_id = ?
     ORDER BY thu_tu ASC`,
    [cauHoiId],
  );

  return rows;
}

async function findByQuestionIds(cauHoiIds, executor) {
  if (!cauHoiIds.length) {
    return [];
  }

  const placeholders = cauHoiIds.map(() => '?').join(', ');
  const db = getExecutor(executor);
  const [rows] = await db.query(
    `SELECT id, cau_hoi_id, noi_dung, noi_dung_latex, la_dap_an_dung, thu_tu
     FROM dap_an
     WHERE cau_hoi_id IN (${placeholders})
     ORDER BY cau_hoi_id ASC, thu_tu ASC`,
    cauHoiIds,
  );

  return rows;
}

async function belongsToQuestion(dapAnId, cauHoiId, executor) {
  const db = getExecutor(executor);
  const [rows] = await db.execute(
    'SELECT id FROM dap_an WHERE id = ? AND cau_hoi_id = ? LIMIT 1',
    [dapAnId, cauHoiId],
  );

  return rows.length > 0;
}

async function deleteForQuestion(connection, cauHoiId) {
  await connection.execute('DELETE FROM dap_an WHERE cau_hoi_id = ?', [cauHoiId]);
}

async function insertMany(connection, cauHoiId, answers) {
  if (!answers.length) {
    return;
  }

  const values = [];
  const placeholders = answers
    .map((answer, index) => {
      values.push(cauHoiId, answer.noiDung, answer.noiDungLatex || null, Boolean(answer.laDapAnDung), index + 1);
      return '(?, ?, ?, ?, ?)';
    })
    .join(', ');

  await connection.query(
    `INSERT INTO dap_an (cau_hoi_id, noi_dung, noi_dung_latex, la_dap_an_dung, thu_tu)
     VALUES ${placeholders}`,
    values,
  );
}

async function replaceForQuestion(connection, cauHoiId, answers) {
  await deleteForQuestion(connection, cauHoiId);
  await insertMany(connection, cauHoiId, answers);
}

module.exports = {
  findByQuestionId,
  findByQuestionIds,
  belongsToQuestion,
  replaceForQuestion,
};
