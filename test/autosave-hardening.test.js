'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const savePolicy = require('../public/js/exam-save-policy');

test('OLD_VERSION chỉ retry state mới nhất, không retry payload cũ', () => {
  const sent = { answerVersion: 1, answerText: 'đáp án cũ' };
  const current = { answerVersion: 2, answerText: 'đáp án mới', bookmarked: true };

  const retry = savePolicy.chooseOldVersionRetry(sent, current, 4);

  assert.equal(retry.answerVersion, 5);
  assert.equal(retry.answerText, 'đáp án mới');
  assert.equal(retry.bookmarked, true);
  assert.equal(retry.synced, false);
  assert.equal(savePolicy.chooseOldVersionRetry(sent, sent, 4), null);
});

test('submitAfterSaves chờ save đang chạy hoàn tất rồi mới submit', async () => {
  const events = [];
  let finishSave;
  const pendingSave = new Promise((resolve) => {
    finishSave = () => {
      events.push('save-done');
      resolve();
    };
  });

  const submitting = savePolicy.submitAfterSaves(
    () => pendingSave,
    () => {
      events.push('submit');
      return 'submitted';
    },
    false,
  );

  await Promise.resolve();
  assert.deepEqual(events, []);

  finishSave();
  assert.equal(await submitting, 'submitted');
  assert.deepEqual(events, ['save-done', 'submit']);
});

test('submitAfterSaves không submit thủ công khi còn save lỗi', async () => {
  let submitCalled = false;
  const saveError = new Error('save failed');

  await assert.rejects(
    savePolicy.submitAfterSaves(
      () => Promise.reject(saveError),
      () => {
        submitCalled = true;
      },
      false,
    ),
    saveError,
  );
  assert.equal(submitCalled, false);
});

test('sync status không báo saved khi còn pending hoặc in-flight', () => {
  assert.equal(savePolicy.chooseSyncStatus(1, true, true), 'saving');
  assert.equal(savePolicy.chooseSyncStatus(0, true, true), 'pending');
  assert.equal(savePolicy.chooseSyncStatus(0, true, false), 'offline');
  assert.equal(savePolicy.chooseSyncStatus(0, false, true), 'saved');
});

test('chỉ merge local pending khi lượt vẫn DANG_LAM', () => {
  assert.equal(savePolicy.shouldMergeLocalPending('DANG_LAM'), true);
  assert.equal(savePolicy.shouldMergeLocalPending('DA_NOP'), false);
  assert.equal(savePolicy.shouldMergeLocalPending('TU_DONG_NOP'), false);
  assert.equal(savePolicy.shouldMergeLocalPending('DA_CHAM'), false);
});

function loadAttemptServiceWithMocks(attemptRepository, transactionEvents) {
  const servicePath = require.resolve('../src/services/attempt-service');
  const repositoryPath = require.resolve('../src/repositories/attempt-repository');
  const transactionPath = require.resolve('../src/utils/with-transaction');
  const previousRepository = require.cache[repositoryPath];
  const previousTransaction = require.cache[transactionPath];

  require.cache[repositoryPath] = {
    id: repositoryPath,
    filename: repositoryPath,
    loaded: true,
    exports: attemptRepository,
  };
  require.cache[transactionPath] = {
    id: transactionPath,
    filename: transactionPath,
    loaded: true,
    exports: async (callback) => {
      const connection = { name: 'test-transaction' };
      transactionEvents.push(['transaction', connection]);
      return callback(connection);
    },
  };

  delete require.cache[servicePath];
  const service = require(servicePath);

  if (previousRepository) {
    require.cache[repositoryPath] = previousRepository;
  } else {
    delete require.cache[repositoryPath];
  }
  if (previousTransaction) {
    require.cache[transactionPath] = previousTransaction;
  } else {
    delete require.cache[transactionPath];
  }
  delete require.cache[servicePath];

  return service;
}

test('saveAnswer khóa attempt trước và dùng cùng executor cho upsert/log', async () => {
  const events = [];
  let saveStateReadCount = 0;
  const repository = {
    async findByIdForUpdate(connection, attemptId) {
      events.push(['lock-attempt', connection, attemptId]);
      return {
        id: attemptId,
        hoc_sinh_id: 7,
        trang_thai: 'DANG_LAM',
        han_nop: new Date(Date.now() + 60_000),
        thoi_gian_bo_sung_giay: 0,
      };
    },
    async findFrozenQuestion(attemptId, questionId, connection) {
      events.push(['find-question', connection, attemptId, questionId]);
      return { loai_cau_hoi: 'TRA_LOI_NGAN' };
    },
    async getAnswerSaveState(attemptId, questionId, connection) {
      saveStateReadCount += 1;
      events.push(['read-save-state', connection, attemptId, questionId]);
      return saveStateReadCount === 1
        ? null
        : { answer_version: 3, client_request_id: 'request-3' };
    },
    async upsertAnswer(attemptId, questionId, data, connection) {
      events.push(['upsert-answer', connection, attemptId, questionId, data]);
      return 1;
    },
    async logEvent(connection, attemptId) {
      events.push(['log-event', connection, attemptId]);
    },
  };
  const service = loadAttemptServiceWithMocks(repository, events);

  const result = await service.saveAnswer(11, 7, 13, {
    answerText: '42',
    answerVersion: 3,
    clientRequestId: 'request-3',
  });

  assert.equal(result.saved, true);
  assert.deepEqual(events.map((event) => event[0]), [
    'transaction',
    'lock-attempt',
    'find-question',
    'read-save-state',
    'upsert-answer',
    'read-save-state',
    'log-event',
  ]);
  const connection = events[0][1];
  assert.equal(events[1][1], connection);
  assert.equal(events[2][1], connection);
  assert.equal(events[3][1], connection);
  assert.equal(events[4][1], connection);
  assert.equal(events[5][1], connection);
  assert.equal(events[6][1], connection);
});

test('saveAnswer coi retry cùng clientRequestId là idempotent', async () => {
  const events = [];
  const repository = {
    async findByIdForUpdate(connection, attemptId) {
      return {
        id: attemptId,
        hoc_sinh_id: 7,
        trang_thai: 'DANG_LAM',
        han_nop: new Date(Date.now() + 60_000),
        thoi_gian_bo_sung_giay: 0,
      };
    },
    async findFrozenQuestion() {
      return { loai_cau_hoi: 'TRA_LOI_NGAN' };
    },
    async upsertAnswer() {
      throw new Error('Idempotent retry must not execute upsert');
    },
    async getAnswerSaveState(attemptId, questionId, connection) {
      events.push(['read-current-save', connection, attemptId, questionId]);
      return { answer_version: 3, client_request_id: 'request-3' };
    },
    async logEvent() {
      throw new Error('Idempotent retry must not create a duplicate log');
    },
  };
  const service = loadAttemptServiceWithMocks(repository, events);

  const result = await service.saveAnswer(11, 7, 13, {
    answerText: '42',
    answerVersion: 3,
    clientRequestId: 'request-3',
  });

  assert.equal(result.saved, true);
  assert.equal(result.answerVersion, 3);
  assert.equal(events[1][0], 'read-current-save');
  assert.equal(events[1][1], events[0][1]);
});

test('saveAnswer từ chối version cũ trước upsert dù driver báo FOUND_ROWS', async () => {
  const events = [];
  const repository = {
    async findByIdForUpdate() {
      return {
        id: 11,
        hoc_sinh_id: 7,
        trang_thai: 'DANG_LAM',
        han_nop: new Date(Date.now() + 60_000),
        thoi_gian_bo_sung_giay: 0,
      };
    },
    async findFrozenQuestion() {
      return { loai_cau_hoi: 'TRA_LOI_NGAN' };
    },
    async getAnswerSaveState() {
      events.push('read-current-save');
      return { answer_version: 5, client_request_id: 'request-5' };
    },
    async upsertAnswer() {
      events.push('unexpected-upsert');
      return 1;
    },
  };
  const service = loadAttemptServiceWithMocks(repository, []);

  await assert.rejects(
    service.saveAnswer(11, 7, 13, {
      answerText: 'payload cũ',
      answerVersion: 4,
      clientRequestId: 'request-4',
    }),
    (error) => error.code === 'OLD_ANSWER_VERSION'
      && error.details.currentAnswerVersion === 5,
  );

  assert.deepEqual(events, ['read-current-save']);
});
