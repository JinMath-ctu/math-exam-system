'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.ExamSavePolicy = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  // Chỉ cho phép retry bằng state hiện tại khi nó thực sự mới hơn request vừa bị
  // máy chủ từ chối. Không bao giờ tăng version rồi gửi lại chính payload cũ.
  function chooseOldVersionRetry(sentAnswer, currentAnswer, serverVersion) {
    if (!sentAnswer || !currentAnswer) {
      return null;
    }

    var sentVersion = Number(sentAnswer.answerVersion) || 0;
    var currentVersion = Number(currentAnswer.answerVersion) || 0;
    var knownServerVersion = Number(serverVersion) || 0;

    if (currentVersion <= sentVersion) {
      return null;
    }

    return Object.assign({}, currentAnswer, {
      answerVersion: Math.max(currentVersion, knownServerVersion) + 1,
      synced: false,
    });
  }

  function submitAfterSaves(flushSaves, submitRequest, allowSaveFailure) {
    return Promise.resolve()
      .then(flushSaves)
      .catch(function (error) {
        if (allowSaveFailure) {
          return;
        }
        throw error;
      })
      .then(submitRequest);
  }

  function chooseSyncStatus(activeSaveCount, hasOutstandingSaves, online) {
    if (activeSaveCount > 0) {
      return 'saving';
    }
    if (hasOutstandingSaves) {
      return online === false ? 'offline' : 'pending';
    }
    return 'saved';
  }

  function shouldMergeLocalPending(status) {
    return status === 'DANG_LAM';
  }

  return {
    chooseOldVersionRetry: chooseOldVersionRetry,
    submitAfterSaves: submitAfterSaves,
    chooseSyncStatus: chooseSyncStatus,
    shouldMergeLocalPending: shouldMergeLocalPending,
  };
});
