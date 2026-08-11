'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseNumericAnswer,
  matchesShortAnswerKey,
  shortAnswersEqual,
} = require('../src/utils/normalize');

test('parse số thập phân dấu chấm và dấu phẩy', () => {
  assert.equal(parseNumericAnswer('0.5'), 0.5);
  assert.equal(parseNumericAnswer('0,5'), 0.5);
  assert.equal(parseNumericAnswer('-2.25'), -2.25);
});

test('parse phân số và hỗn số', () => {
  assert.equal(parseNumericAnswer('1/2'), 0.5);
  assert.equal(parseNumericAnswer('-3/4'), -0.75);
  assert.equal(parseNumericAnswer('1 1/2'), 1.5);
  assert.equal(parseNumericAnswer('\\frac{1}{2}'), 0.5);
});

test('so khớp thập phân / phân số tương đương', () => {
  assert.equal(shortAnswersEqual('1/2', '0.5'), true);
  assert.equal(shortAnswersEqual('1/2', '0,5'), true);
  assert.equal(shortAnswersEqual('0.5', '0,5'), true);
  assert.equal(shortAnswersEqual('1 1/2', '1.5'), true);
  assert.equal(shortAnswersEqual('1/2', '1/3'), false);
});

test('nhiều đáp án chuẩn cách nhau bằng |', () => {
  assert.equal(matchesShortAnswerKey('0.5', '1/2|0.5|0,5'), true);
  assert.equal(matchesShortAnswerKey('1/2', '1/2|0.5'), true);
  assert.equal(matchesShortAnswerKey('2', '1/2|0.5'), false);
  assert.equal(matchesShortAnswerKey('', '1/2'), false);
});

test('vẫn so khớp văn bản không phải số', () => {
  assert.equal(matchesShortAnswerKey('Hàm số', 'hàm số'), true);
  assert.equal(matchesShortAnswerKey('abc', 'abd'), false);
});
