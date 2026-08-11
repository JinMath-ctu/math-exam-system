'use strict';

// Logic phòng thi trực tuyến: đồng bộ đáp án real-time + localStorage dự
// phòng mất mạng, đồng hồ đếm ngược theo serverTime (không tin đồng hồ máy
// học sinh), heartbeat, và nộp bài chống double-click.
// Xem docs/service-rules.md mục 3, 5, 6, 9.
(function () {
  var root = document.getElementById('exam-room-page');
  if (!root) {
    return;
  }

  var ATTEMPT_ID = root.getAttribute('data-attempt-id');
  var EXAM_ID = root.getAttribute('data-exam-id');
  var USER_ID = root.getAttribute('data-user-id');
  var STORAGE_KEY = 'math_exam_user_' + USER_ID + '_attempt_' + ATTEMPT_ID;

  var HEARTBEAT_INTERVAL_MS = 30 * 1000;
  var SHORT_ANSWER_DEBOUNCE_MS = 600;
  var ESSAY_DEBOUNCE_MS = 1500;
  var CLOCK_TICK_MS = 1000;

  var csrfMeta = document.querySelector('meta[name="csrf-token"]');
  var CSRF_TOKEN = csrfMeta ? csrfMeta.getAttribute('content') : '';

  var state = {
    questions: [],
    answers: {},
    status: 'DANG_LAM',
    serverOffsetMs: 0,
    effectiveDeadlineMs: null,
    currentIndex: 0,
    submitted: false,
    heartbeatTimer: null,
    clockTimer: null,
  };

  var debounceTimers = {};
  var saveQueues = {};
  var activeSaveCount = 0;
  var finalStateRefresh = null;

  // ------------------------------------------------------------------
  // localStorage — key: math_exam_user_<userId>_attempt_<attemptId>
  // ------------------------------------------------------------------
  function loadLocal() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  function saveLocal(map) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch (error) {
      /* localStorage không khả dụng (chế độ ẩn danh, hết dung lượng...) — bỏ qua an toàn */
    }
  }

  function clearLocal() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      /* ignore */
    }
  }

  function setLocalAnswer(questionId, answer) {
    var map = loadLocal();
    map[questionId] = answer;
    saveLocal(map);
  }

  function markLocalSynced(questionId, answerVersion) {
    var map = loadLocal();
    if (map[questionId] && Number(map[questionId].answerVersion) === Number(answerVersion)) {
      map[questionId].synced = true;
      saveLocal(map);
    }
  }

  // ------------------------------------------------------------------
  // Gọi API kèm CSRF header
  // ------------------------------------------------------------------
  function apiFetch(url, options) {
    var opts = options || {};
    opts.credentials = 'same-origin';
    opts.headers = Object.assign(
      { 'Content-Type': 'application/json', 'X-CSRF-Token': CSRF_TOKEN },
      opts.headers || {},
    );

    return fetch(url, opts).then(function (res) {
      return res
        .json()
        .catch(function () {
          return {};
        })
        .then(function (body) {
          return { ok: res.ok, status: res.status, body: body };
        });
    });
  }

  // ------------------------------------------------------------------
  // UI trạng thái đồng bộ: Đang lưu / Đã lưu / Chờ đồng bộ / Mất kết nối
  // ------------------------------------------------------------------
  var SYNC_LABELS = {
    saving: 'Đang lưu…',
    saved: 'Đã lưu',
    pending: 'Chờ đồng bộ',
    offline: 'Mất kết nối',
  };

  function setSyncStatus(key) {
    var el = document.getElementById('sync-status');
    if (!el) {
      return;
    }
    el.textContent = SYNC_LABELS[key] || key;
    el.className = 'sync-status sync-status-' + key;
  }

  function hasOutstandingSaves() {
    if (Object.keys(debounceTimers).length > 0 || activeSaveCount > 0) {
      return true;
    }

    var hasQueued = Object.keys(saveQueues).some(function (questionId) {
      return !!saveQueues[questionId].pendingAnswer || !!saveQueues[questionId].inFlight;
    });
    if (hasQueued) {
      return true;
    }

    return Object.keys(state.answers).some(function (questionId) {
      return state.answers[questionId] && !state.answers[questionId].synced;
    });
  }

  function refreshSyncStatus() {
    setSyncStatus(window.ExamSavePolicy.chooseSyncStatus(
      activeSaveCount,
      hasOutstandingSaves(),
      navigator.onLine !== false,
    ));
  }

  // ------------------------------------------------------------------
  // Đồng hồ đếm ngược theo serverTime (bù lệch serverOffsetMs)
  // ------------------------------------------------------------------
  function nowServerMs() {
    return Date.now() + state.serverOffsetMs;
  }

  function formatDuration(ms) {
    var totalSeconds = Math.max(0, Math.floor(ms / 1000));
    var h = Math.floor(totalSeconds / 3600);
    var m = Math.floor((totalSeconds % 3600) / 60);
    var s = totalSeconds % 60;
    function pad(n) {
      return n < 10 ? '0' + n : String(n);
    }
    return pad(h) + ':' + pad(m) + ':' + pad(s);
  }

  function tickClock() {
    var timerEl = document.getElementById('timer');
    if (!timerEl || state.effectiveDeadlineMs == null) {
      return;
    }

    var remainingMs = state.effectiveDeadlineMs - nowServerMs();
    timerEl.classList.remove('exam-timer-warning', 'exam-timer-danger');

    if (remainingMs <= 0) {
      timerEl.textContent = '00:00:00';
      timerEl.classList.add('exam-timer-danger');
      if (state.status === 'DANG_LAM' && !state.submitted) {
        submitAttempt(true);
      }
      return;
    }

    if (remainingMs <= 60 * 1000) {
      timerEl.classList.add('exam-timer-danger');
    } else if (remainingMs <= 5 * 60 * 1000) {
      timerEl.classList.add('exam-timer-warning');
    }

    timerEl.textContent = formatDuration(remainingMs);
  }

  function startClock() {
    tickClock();
    state.clockTimer = window.setInterval(tickClock, CLOCK_TICK_MS);
  }

  // ------------------------------------------------------------------
  // Heartbeat — mỗi 30 giây, chỉ để cập nhật last_seen_at
  // ------------------------------------------------------------------
  function sendHeartbeat() {
    if (state.status !== 'DANG_LAM') {
      return;
    }

    apiFetch('/api/attempts/' + ATTEMPT_ID + '/heartbeat', { method: 'POST', body: JSON.stringify({}) })
      .then(function (result) {
        if (result.ok && result.body.success) {
          var heartbeatData = result.body.data;
          if (heartbeatData.serverTime) {
            state.serverOffsetMs = new Date(heartbeatData.serverTime).getTime() - Date.now();
          }
          if (heartbeatData.effectiveDeadline) {
            state.effectiveDeadlineMs = new Date(heartbeatData.effectiveDeadline).getTime();
            tickClock();
          }
          if (heartbeatData.status && heartbeatData.status !== 'DANG_LAM') {
            transitionToFinalStatus(heartbeatData.status);
          }
        }
      })
      .catch(function () {
        setSyncStatus('offline');
      });
  }

  function startHeartbeat() {
    state.heartbeatTimer = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
  }

  // ------------------------------------------------------------------
  // Render danh sách điều hướng câu hỏi
  // ------------------------------------------------------------------
  function isAnswered(question, answer) {
    if (!answer) {
      return false;
    }

    // Với câu đúng/sai, chỉ đánh dấu "đã làm" khi học sinh đã chọn đủ cả
    // bốn mệnh đề. Việc chọn một phần vẫn được autosave nhưng không làm học
    // sinh hiểu nhầm rằng câu đã hoàn tất.
    if (question && question.type === 'DUNG_SAI') {
      var statements = Array.isArray(question.answers) ? question.answers : [];
      var selections = answer.statementSelections;

      return statements.length === 4
        && selections
        && typeof selections === 'object'
        && statements.every(function (statement) {
          var value = selections[String(statement.id)];
          return value === true || value === false;
        });
    }

    if (answer.selectedAnswerId != null) {
      return true;
    }
    if (answer.answerText != null && String(answer.answerText).trim() !== '') {
      return true;
    }
    if (answer.statementSelections && typeof answer.statementSelections === 'object') {
      return Object.keys(answer.statementSelections).some(function (key) {
        var value = answer.statementSelections[key];
        return value === true || value === false;
      });
    }
    return false;
  }

  function renderQuestionNav() {
    var nav = document.getElementById('question-nav');
    if (!nav) {
      return;
    }
    nav.innerHTML = '';

    state.questions.forEach(function (question, index) {
      var answer = state.answers[question.id];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'question-nav-btn';
      btn.textContent = String(question.order);

      if (isAnswered(question, answer)) {
        btn.classList.add('is-answered');
      }
      if (answer && answer.bookmarked) {
        btn.classList.add('is-bookmarked');
      }
      if (index === state.currentIndex) {
        btn.classList.add('is-current');
      }

      btn.addEventListener('click', function () {
        state.currentIndex = index;
        renderQuestionPanel();
        renderQuestionNav();
      });

      nav.appendChild(btn);
    });
  }

  // ------------------------------------------------------------------
  // Render nội dung câu hỏi hiện tại
  // ------------------------------------------------------------------
  function renderQuestionPanel() {
    var panel = document.getElementById('question-panel');
    if (!panel) {
      return;
    }

    var question = state.questions[state.currentIndex];
    if (!question) {
      panel.innerHTML = '<p>Đề thi không có câu hỏi nào.</p>';
      return;
    }

    var answer = state.answers[question.id] || {
      selectedAnswerId: null,
      answerText: null,
      statementSelections: {},
      bookmarked: false,
      answerVersion: 0,
    };

    var readOnly = state.status !== 'DANG_LAM';

    // Nội dung câu hỏi do giáo viên nhập là văn bản + dấu phân cách LaTeX,
    // không phải HTML tin cậy. Dựng DOM và dùng textContent để KaTeX vẫn đọc
    // được công thức nhưng thẻ/sự kiện HTML không thể chạy (chống stored XSS).
    panel.textContent = '';

    var card = document.createElement('div');
    card.className = 'question-card';

    var header = document.createElement('div');
    header.className = 'question-card-header';

    var indexEl = document.createElement('span');
    indexEl.className = 'question-index';
    indexEl.textContent = 'Câu ' + question.order + ' / ' + state.questions.length;

    var scoreEl = document.createElement('span');
    scoreEl.className = 'question-score';
    scoreEl.textContent = Number(question.score).toFixed(2) + ' điểm';

    var bookmarkBtn = document.createElement('button');
    bookmarkBtn.type = 'button';
    bookmarkBtn.id = 'bookmark-btn';
    bookmarkBtn.className = 'bookmark-toggle' + (answer.bookmarked ? ' is-active' : '');
    bookmarkBtn.disabled = readOnly;
    bookmarkBtn.textContent = answer.bookmarked ? '\u2605 Đã đánh dấu' : '\u2606 Đánh dấu xem lại';

    header.appendChild(indexEl);
    header.appendChild(scoreEl);
    header.appendChild(bookmarkBtn);
    card.appendChild(header);

    var questionContent = document.createElement('div');
    questionContent.className = 'question-content katex-content';
    questionContent.textContent = question.content || '';
    card.appendChild(questionContent);

    if (question.image) {
      var imagePreview = document.createElement('div');
      imagePreview.className = 'image-preview';

      var image = document.createElement('img');
      image.src = String(question.image);
      image.alt = 'Ảnh minh họa câu hỏi';

      imagePreview.appendChild(image);
      card.appendChild(imagePreview);
    }

    var answerArea = document.createElement('div');
    answerArea.className = 'answer-area';
    answerArea.id = 'answer-area';
    card.appendChild(answerArea);
    panel.appendChild(card);

    renderAnswerArea(question, answer, readOnly);

    if (bookmarkBtn) {
      bookmarkBtn.addEventListener('click', function () {
        toggleBookmark(question);
      });
    }

    if (window.renderMathIn) {
      window.renderMathIn(panel);
    }
  }

  function renderAnswerArea(question, answer, readOnly) {
    var area = document.getElementById('answer-area');
    if (!area) {
      return;
    }

    if (question.type === 'MOT_DAP_AN') {
      question.answers.forEach(function (option, index) {
        var label = document.createElement('label');
        label.className = 'answer-option';

        var input = document.createElement('input');
        input.type = 'radio';
        input.name = 'answer-' + question.id;
        input.value = String(option.id);
        input.disabled = readOnly;
        input.checked = answer.selectedAnswerId != null && Number(answer.selectedAnswerId) === Number(option.id);

        var letterSpan = document.createElement('strong');
        letterSpan.className = 'answer-option-letter';
        letterSpan.textContent = String.fromCharCode(65 + index) + '.';

        var contentSpan = document.createElement('span');
        contentSpan.className = 'katex-content';
        contentSpan.textContent = option.content || '';

        label.appendChild(input);
        label.appendChild(letterSpan);
        label.appendChild(contentSpan);
        area.appendChild(label);

        input.addEventListener('change', function () {
          handleAnswerChange(question, { selectedAnswerId: option.id, answerText: null, statementSelections: {} }, 0);
        });
      });
    } else if (question.type === 'DUNG_SAI') {
      var selections = Object.assign({}, answer.statementSelections || {});
      var labels = ['a', 'b', 'c', 'd'];

      question.answers.forEach(function (option, index) {
        var block = document.createElement('div');
        block.className = 'statement-block';

        var header = document.createElement('div');
        header.className = 'statement-block-header';

        var labelSpan = document.createElement('span');
        labelSpan.className = 'statement-block-label';
        labelSpan.textContent = (labels[index] || String(index + 1)) + ')';

        var contentSpan = document.createElement('span');
        contentSpan.className = 'katex-content';
        contentSpan.textContent = option.content || '';

        header.appendChild(labelSpan);
        header.appendChild(contentSpan);
        block.appendChild(header);

        var choices = document.createElement('div');
        choices.className = 'statement-choices';

        ['Đúng', 'Sai'].forEach(function (choiceLabel, choiceIndex) {
          var choiceValue = choiceIndex === 0;
          var choice = document.createElement('label');

          var input = document.createElement('input');
          input.type = 'radio';
          input.name = 'statement-' + question.id + '-' + option.id;
          input.value = choiceValue ? 'true' : 'false';
          input.disabled = readOnly;
          input.checked = selections[String(option.id)] === choiceValue;

          var text = document.createElement('span');
          text.textContent = choiceLabel;

          choice.appendChild(input);
          choice.appendChild(text);
          choices.appendChild(choice);

          input.addEventListener('change', function () {
            var nextSelections = Object.assign({}, selections);
            nextSelections[String(option.id)] = choiceValue;
            selections = nextSelections;
            handleAnswerChange(question, {
              selectedAnswerId: null,
              answerText: null,
              statementSelections: nextSelections,
            }, 0);
          });
        });

        block.appendChild(choices);
        area.appendChild(block);
      });
    } else if (question.type === 'TRA_LOI_NGAN') {
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'short-answer-input';
      input.placeholder = 'Nhập số, thập phân hoặc phân số (ví dụ: 0.5 ; 0,5 ; 1/2)...';
      input.value = answer.answerText || '';
      input.disabled = readOnly;
      area.appendChild(input);

      input.addEventListener('input', function () {
        handleAnswerChange(question, { selectedAnswerId: null, answerText: input.value, statementSelections: {} }, SHORT_ANSWER_DEBOUNCE_MS);
      });
    } else if (question.type === 'TU_LUAN') {
      var textarea = document.createElement('textarea');
      textarea.className = 'essay-answer-textarea';
      textarea.rows = 10;
      textarea.placeholder = 'Trình bày lời giải của bạn...';
      textarea.value = answer.answerText || '';
      textarea.disabled = readOnly;
      area.appendChild(textarea);

      textarea.addEventListener('input', function () {
        handleAnswerChange(question, { selectedAnswerId: null, answerText: textarea.value, statementSelections: {} }, ESSAY_DEBOUNCE_MS);
      });
    }

    if (window.renderMathIn) {
      window.renderMathIn(area);
    }
  }

  // ------------------------------------------------------------------
  // Luồng lưu đáp án: UI -> tăng version -> localStorage (pending) -> API
  // -> đánh dấu synced hoặc giữ pending (xem docs/service-rules.md mục 5)
  // ------------------------------------------------------------------
  function handleAnswerChange(question, partial, debounceMs) {
    if (state.status !== 'DANG_LAM' || state.submitted) {
      return;
    }

    var current = state.answers[question.id] || {
      selectedAnswerId: null,
      answerText: null,
      statementSelections: {},
      bookmarked: false,
      answerVersion: 0,
    };

    var nextVersion = Number(current.answerVersion || 0) + 1;
    var updated = Object.assign({}, current, partial, {
      answerVersion: nextVersion,
      clientRequestId: makeClientRequestId(),
      synced: false,
    });

    state.answers[question.id] = updated;
    setLocalAnswer(question.id, updated);
    renderQuestionNav();
    setSyncStatus('pending');

    var timerKey = String(question.id);
    if (debounceTimers[timerKey]) {
      window.clearTimeout(debounceTimers[timerKey]);
      delete debounceTimers[timerKey];
    }

    if (debounceMs > 0) {
      debounceTimers[timerKey] = window.setTimeout(function () {
        delete debounceTimers[timerKey];
        sendAnswer(question.id, updated);
      }, debounceMs);
    } else {
      sendAnswer(question.id, updated);
    }
  }

  function toggleBookmark(question) {
    var current = state.answers[question.id] || {
      selectedAnswerId: null,
      answerText: null,
      statementSelections: {},
      bookmarked: false,
      answerVersion: 0,
    };
    handleAnswerChange(question, { bookmarked: !current.bookmarked }, 0);
  }

  function makeClientRequestId() {
    return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function getSaveQueue(questionId) {
    var key = String(questionId);
    if (!saveQueues[key]) {
      saveQueues[key] = {
        pendingAnswer: null,
        inFlightAnswer: null,
        inFlight: null,
        lastError: null,
      };
    }
    return saveQueues[key];
  }

  function saveFailure(code, message) {
    return {
      ok: false,
      code: code || 'SAVE_FAILED',
      message: message || 'Không thể lưu đáp án.',
    };
  }

  function drainAnswerQueue(questionId) {
    var queue = getSaveQueue(questionId);
    if (queue.inFlight) {
      return queue.inFlight;
    }
    if (!queue.pendingAnswer) {
      return Promise.resolve(queue.lastError || { ok: true });
    }

    var answer = queue.pendingAnswer;
    queue.pendingAnswer = null;

    if (!answer.clientRequestId) {
      answer = Object.assign({}, answer, { clientRequestId: makeClientRequestId() });
      if (state.answers[questionId]
        && Number(state.answers[questionId].answerVersion) === Number(answer.answerVersion)) {
        state.answers[questionId] = answer;
        setLocalAnswer(questionId, answer);
      }
    }
    activeSaveCount += 1;
    queue.inFlightAnswer = answer;
    refreshSyncStatus();

    var payload = {
      bookmarked: !!answer.bookmarked,
      answerVersion: answer.answerVersion,
      clientRequestId: answer.clientRequestId,
    };

    if (answer.selectedAnswerId != null && answer.selectedAnswerId !== '') {
      payload.selectedAnswerId = answer.selectedAnswerId;
    }
    if (answer.answerText != null && String(answer.answerText).length > 0) {
      payload.answerText = answer.answerText;
    }
    var selections = answer.statementSelections;
    if (
      selections
      && typeof selections === 'object'
      && !Array.isArray(selections)
      && Object.keys(selections).length > 0
    ) {
      payload.statementSelections = selections;
    }

    queue.inFlight = apiFetch('/api/attempts/' + ATTEMPT_ID + '/answers/' + questionId, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
      .then(function (result) {
        if (result.ok && result.body.success) {
          markLocalSynced(questionId, answer.answerVersion);
          if (state.answers[questionId]
            && Number(state.answers[questionId].answerVersion) === Number(answer.answerVersion)) {
            state.answers[questionId].synced = true;
          }
          return { ok: true };
        }

        var error = result.body.error || {};
        var errorCode = error.code;

        if (errorCode === 'OLD_ANSWER_VERSION') {
          var details = error.details || {};
          var retryAnswer = window.ExamSavePolicy
            ? window.ExamSavePolicy.chooseOldVersionRetry(
              answer,
              state.answers[questionId],
              details.currentAnswerVersion,
            )
            : null;

          if (retryAnswer) {
            retryAnswer.clientRequestId = makeClientRequestId();
            state.answers[questionId] = retryAnswer;
            setLocalAnswer(questionId, retryAnswer);
            queue.pendingAnswer = retryAnswer;
            return { ok: true, retryQueued: true };
          }

          return saveFailure(
            errorCode,
            error.message || 'Máy chủ đã có phiên bản đáp án mới hơn. Hãy tải lại bài thi để đối chiếu.',
          );
        }

        if (errorCode === 'ATTEMPT_NOT_IN_PROGRESS' || errorCode === 'ATTEMPT_SUBMITTED') {
          transitionToFinalStatus(null);
        }

        return saveFailure(errorCode, error.message);
      })
      .catch(function () {
        return saveFailure(
          'NETWORK_ERROR',
          'Mất kết nối khi lưu đáp án. Dữ liệu vẫn còn trên thiết bị này.',
        );
      })
      .then(function (outcome) {
        activeSaveCount -= 1;
        queue.inFlight = null;
        queue.inFlightAnswer = null;
        queue.lastError = outcome.ok ? null : outcome;

        if (outcome.retryQueued || (outcome.ok && queue.pendingAnswer)) {
          return drainAnswerQueue(questionId);
        }

        refreshSyncStatus();
        return outcome;
      });

    return queue.inFlight;
  }

  function sendAnswer(questionId, answer) {
    var queue = getSaveQueue(questionId);
    var current = state.answers[questionId];
    var candidate = current
      && Number(current.answerVersion) > Number(answer.answerVersion)
      ? current
      : answer;

    if (queue.inFlightAnswer
      && Number(candidate.answerVersion) <= Number(queue.inFlightAnswer.answerVersion)) {
      return drainAnswerQueue(questionId);
    }

    if (!queue.pendingAnswer
      || Number(candidate.answerVersion) >= Number(queue.pendingAnswer.answerVersion)) {
      queue.pendingAnswer = candidate;
    }

    refreshSyncStatus();
    return drainAnswerQueue(questionId);
  }

  function resyncPendingAnswers() {
    var map = loadLocal();
    var pendingIds = Object.keys(map).filter(function (questionId) {
      return !map[questionId].synced;
    });

    if (pendingIds.length === 0) {
      refreshSyncStatus();
      return;
    }

    pendingIds.forEach(function (questionId) {
      sendAnswer(questionId, map[questionId]);
    });
  }

  // ------------------------------------------------------------------
  // Nộp bài — chặn double-click, xóa localStorage chỉ khi thành công
  // ------------------------------------------------------------------
  function setAnswerInputsDisabled(disabled) {
    var controls = document.querySelectorAll(
      '#question-panel input, #question-panel textarea, #question-panel button',
    );
    Array.prototype.forEach.call(controls, function (control) {
      control.disabled = disabled;
    });
  }

  function flushPendingSaves() {
    Object.keys(debounceTimers).forEach(function (questionId) {
      window.clearTimeout(debounceTimers[questionId]);
      delete debounceTimers[questionId];
    });

    // Gửi lại mọi câu trả lời còn "pending" (kể cả loại lưu ngay như MOT_DAP_AN
    // nếu lần gửi trước đó lỗi mạng), không chỉ những câu vừa bị hủy debounce.
    var waits = [];
    Object.keys(state.answers).forEach(function (questionId) {
      var answer = state.answers[questionId];
      if (answer && !answer.synced) {
        waits.push(sendAnswer(questionId, answer));
      }
    });

    // Bao gồm cả request đã bay đi trước lúc người dùng bấm Nộp bài.
    Object.keys(saveQueues).forEach(function (questionId) {
      if (saveQueues[questionId].inFlight) {
        waits.push(saveQueues[questionId].inFlight);
      }
    });

    return Promise.all(waits).then(function (outcomes) {
      var failed = outcomes.find(function (outcome) {
        return outcome && !outcome.ok;
      });
      var unsynced = Object.keys(state.answers).some(function (questionId) {
        return state.answers[questionId] && !state.answers[questionId].synced;
      });

      refreshSyncStatus();
      if (failed || unsynced || hasOutstandingSaves()) {
        var error = new Error(
          (failed && failed.message)
            || 'Vẫn còn đáp án chưa được máy chủ xác nhận.',
        );
        error.code = (failed && failed.code) || 'UNSAVED_ANSWERS';
        error.isSaveFailure = true;
        throw error;
      }
    });
  }

  function submitAttempt(isAutoSubmit) {
    if (state.submitted || state.status !== 'DANG_LAM') {
      return;
    }

    if (!isAutoSubmit) {
      var ask = typeof window.appConfirm === 'function'
        ? window.appConfirm('Bạn có chắc chắn muốn nộp bài? Sau khi nộp sẽ không thể chỉnh sửa đáp án.', { danger: true })
        : Promise.resolve(window.confirm('Bạn có chắc chắn muốn nộp bài? Sau khi nộp sẽ không thể chỉnh sửa đáp án.'));

      ask.then(function (confirmed) {
        if (!confirmed) return;
        doSubmitAttempt(false);
      });
      return;
    }

    doSubmitAttempt(isAutoSubmit);
  }

  function doSubmitAttempt(isAutoSubmit) {
    if (state.submitted || state.status !== 'DANG_LAM') {
      return;
    }

    state.submitted = true;
    setAnswerInputsDisabled(true);
    var btn = document.getElementById('submit-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Đang lưu đáp án...';
    }

    // Auto-submit vẫn gửi lệnh nộp khi deadline khiến save mới bị từ chối;
    // transaction server sẽ chờ mọi save đã đến máy chủ trước đó.
    window.ExamSavePolicy.submitAfterSaves(flushPendingSaves, function () {
      if (btn) {
        btn.textContent = 'Đang nộp bài...';
      }
      return apiFetch('/api/attempts/' + ATTEMPT_ID + '/submit', {
        method: 'POST',
        body: JSON.stringify({ autoSubmit: !!isAutoSubmit }),
      });
    }, isAutoSubmit)
      .then(function (result) {
        var errorCode = result.body.error && result.body.error.code;
        var submitData = result.body.data || {};

        if (result.ok && result.body.success && submitData.submitted === false) {
          state.submitted = false;
          state.status = 'DANG_LAM';
          if (submitData.serverTime) {
            state.serverOffsetMs = new Date(submitData.serverTime).getTime() - Date.now();
          }
          if (submitData.effectiveDeadline) {
            state.effectiveDeadlineMs = new Date(submitData.effectiveDeadline).getTime();
          }
          setAnswerInputsDisabled(false);
          if (btn) {
            btn.disabled = false;
            btn.textContent = 'Nộp bài';
          }
          tickClock();
          return;
        }

        if ((result.ok && result.body.success) || errorCode === 'ATTEMPT_SUBMITTED') {
          clearLocal();
          window.clearInterval(state.clockTimer);
          window.clearInterval(state.heartbeatTimer);
          window.location.href = '/student/exams/' + EXAM_ID;
          return;
        }

        var error = new Error(
          (result.body.error && result.body.error.message)
            || 'Không thể nộp bài. Vui lòng thử lại.',
        );
        error.code = errorCode || 'SUBMIT_FAILED';
        throw error;
      })
      .catch(function (error) {
        state.submitted = false;
        if (state.status === 'DANG_LAM') {
          setAnswerInputsDisabled(false);
        }
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Nộp bài';
        }

        if (!isAutoSubmit) {
          var prefix = error.isSaveFailure
            ? 'Chưa thể nộp vì còn đáp án chưa lưu. '
            : '';
          var message = prefix
            + (error.message || 'Lỗi kết nối. Vui lòng thử nộp lại khi có mạng.')
            + ' Dữ liệu vẫn được lưu tạm trên thiết bị này.';
          if (typeof window.appConfirm === 'function') {
            window.appConfirm(message, { info: true }).then(function () {});
          } else {
            window.alert(message);
          }
        }
      });
  }

  function showReadOnlyBanner(discardedLocalPending) {
    var banner = document.getElementById('readonly-banner');
    if (banner) {
      banner.hidden = false;
      banner.textContent = discardedLocalPending
        ? 'Bài làm đã được nộp trên máy chủ. Một số thay đổi cục bộ chưa được máy chủ xác nhận nên không thuộc bài đã nộp.'
        : 'Bài làm này đã được nộp, bạn chỉ có thể xem lại — không thể chỉnh sửa đáp án.';
    }
    var submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
      submitBtn.hidden = true;
    }
    window.clearInterval(state.heartbeatTimer);
    window.clearInterval(state.clockTimer);
    renderQuestionPanel();
  }

  function hasUnsyncedLocal(map) {
    return Object.keys(map || {}).some(function (questionId) {
      return map[questionId] && !map[questionId].synced;
    });
  }

  function toSyncedServerAnswers(serverAnswers) {
    var answers = {};
    Object.keys(serverAnswers || {}).forEach(function (questionId) {
      answers[questionId] = Object.assign({ synced: true }, serverAnswers[questionId]);
    });
    return answers;
  }

  // Khi job hoặc tab khác đã nộp bài, snapshot server là nguồn duy nhất được phép hiển
  // thị. Không giữ local pending trên màn hình read-only vì người dùng có thể hiểu nhầm
  // đó là nội dung đã được chấm.
  function transitionToFinalStatus(knownStatus) {
    if (finalStateRefresh) {
      return finalStateRefresh;
    }

    var localBeforeRefresh = loadLocal();
    var discardedLocalPending = hasUnsyncedLocal(localBeforeRefresh);
    state.status = knownStatus || 'FINALIZED';
    state.submitted = true;
    showReadOnlyBanner(discardedLocalPending);

    finalStateRefresh = apiFetch('/api/attempts/' + ATTEMPT_ID + '/state', { method: 'GET' })
      .then(function (result) {
        if (!result.ok || !result.body.success) {
          throw new Error('Không thể tải lại bài đã nộp từ máy chủ.');
        }

        var data = result.body.data;
        state.questions = data.questions;
        state.status = data.status;
        state.serverOffsetMs = new Date(data.serverTime).getTime() - Date.now();
        state.effectiveDeadlineMs = new Date(data.effectiveDeadline).getTime();
        state.answers = toSyncedServerAnswers(data.answers);
        clearLocal();
        refreshSyncStatus();
        renderQuestionNav();
        showReadOnlyBanner(discardedLocalPending);
      })
      .catch(function () {
        var banner = document.getElementById('readonly-banner');
        if (banner) {
          banner.textContent = 'Máy chủ cho biết bài đã được nộp. Chưa thể tải lại snapshot đã nộp; hãy kiểm tra kết nối rồi tải lại trang.';
        }
      });

    return finalStateRefresh;
  }

  // ------------------------------------------------------------------
  // Khởi tạo: tải trạng thái từ server, hòa trộn với localStorage pending
  // ------------------------------------------------------------------
  function mergeWithLocalPending(serverAnswers) {
    var local = loadLocal();
    var merged = {};

    Object.keys(serverAnswers).forEach(function (questionId) {
      merged[questionId] = Object.assign({ synced: true }, serverAnswers[questionId]);
    });

    Object.keys(local).forEach(function (questionId) {
      var pending = local[questionId];
      var serverAnswer = merged[questionId];
      if (!serverAnswer || Number(pending.answerVersion) > Number(serverAnswer.answerVersion)) {
        merged[questionId] = Object.assign({}, pending, { synced: false });
      }
    });

    saveLocal(merged);
    return merged;
  }

  function init() {
    var localBeforeLoad = loadLocal();
    var hasLocalPending = hasUnsyncedLocal(localBeforeLoad);
    if (hasLocalPending) {
      setSyncStatus(navigator.onLine === false ? 'offline' : 'pending');
    }

    apiFetch('/api/attempts/' + ATTEMPT_ID + '/state', { method: 'GET' })
      .then(function (result) {
        if (!result.ok || !result.body.success) {
          throw new Error((result.body.error && result.body.error.message) || 'Không thể tải dữ liệu bài thi.');
        }

        var data = result.body.data;
        state.questions = data.questions;
        state.status = data.status;
        state.serverOffsetMs = new Date(data.serverTime).getTime() - Date.now();
        state.effectiveDeadlineMs = new Date(data.effectiveDeadline).getTime();
        var canMergeLocal = window.ExamSavePolicy.shouldMergeLocalPending(state.status);
        var discardedLocalPending = false;
        if (canMergeLocal) {
          state.answers = mergeWithLocalPending(data.answers);
        } else {
          discardedLocalPending = hasUnsyncedLocal(localBeforeLoad);
          state.answers = toSyncedServerAnswers(data.answers);
          clearLocal();
        }

        refreshSyncStatus();
        renderQuestionNav();
        renderQuestionPanel();

        if (state.status === 'DANG_LAM') {
          startClock();
          startHeartbeat();
          resyncPendingAnswers();
        } else {
          showReadOnlyBanner(discardedLocalPending);
        }
      })
      .catch(function (error) {
        var panel = document.getElementById('question-panel');
        if (panel) {
          var errorBox = document.createElement('div');
          errorBox.className = 'flash flash-error';
          errorBox.setAttribute('role', 'alert');
          errorBox.textContent = error.message || 'Có lỗi xảy ra.';
          panel.textContent = '';
          panel.appendChild(errorBox);
        }
      });
  }

  var submitButton = document.getElementById('submit-btn');
  if (submitButton) {
    submitButton.addEventListener('click', function () {
      submitAttempt(false);
    });
  }

  window.addEventListener('online', function () {
    if (state.status === 'DANG_LAM') {
      resyncPendingAnswers();
    }
  });

  window.addEventListener('offline', function () {
    setSyncStatus('offline');
  });

  window.addEventListener('beforeunload', function (event) {
    if (state.status === 'DANG_LAM' && !state.submitted) {
      event.preventDefault();
      event.returnValue = '';
    }
  });

  init();
})();
