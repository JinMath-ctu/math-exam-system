'use strict';

/**
 * Thanh chèn công thức Toán cho form soạn câu hỏi (không cần nhớ LaTeX).
 * Bấm nút → chèn mẫu vào ô đang focus (textarea/input).
 */
(function () {
  var SNIPPETS = [
    { label: 'Phân số', tip: 'a/b', insert: '$\\dfrac{a}{b}$', select: [8, 9] },
    { label: 'Căn', tip: '√', insert: '$\\sqrt{a}$', select: [7, 8] },
    { label: 'Lũy thừa', tip: 'x²', insert: '$x^{2}$', select: [3, 4] },
    { label: 'Chỉ số', tip: 'xₙ', insert: '$x_{n}$', select: [3, 4] },
    { label: 'Vô cực', tip: '∞', insert: '$+\\infty$', select: null },
    { label: 'Pi', tip: 'π', insert: '$\\pi$', select: null },
    { label: 'Vector', tip: '→a', insert: '$\\vec{a}$', select: [6, 7] },
    { label: 'Vector AB', tip: '→AB', insert: '$\\overrightarrow{AB}$', select: [16, 18] },
    { label: 'Min', tip: 'min', insert: '$\\min_{(a;b)} f(x)$', select: [8, 11] },
    { label: 'Max', tip: 'max', insert: '$\\max_{(a;b)} f(x)$', select: [8, 11] },
    { label: '±', tip: '±', insert: '$\\pm$', select: null },
    { label: '≠', tip: '≠', insert: '$\\neq$', select: null },
    { label: '≤', tip: '≤', insert: '$\\le$', select: null },
    { label: '≥', tip: '≥', insert: '$\\ge$', select: null },
    { label: 'Góc', tip: '∠', insert: '$\\angle ABC$', select: [8, 11] },
    { label: 'Độ', tip: '°', insert: '$^{\\circ}$', select: null },
  ];

  var lastField = null;

  function isEditableField(el) {
    if (!el || el.disabled || el.readOnly) return false;
    var tag = el.tagName;
    if (tag === 'TEXTAREA') return true;
    if (tag === 'INPUT' && (el.type === 'text' || el.type === 'search' || !el.type)) return true;
    return false;
  }

  function rememberField(el) {
    if (isEditableField(el)) {
      lastField = el;
    }
  }

  function insertAtCursor(field, text, selectRange) {
    field.focus();
    var start = field.selectionStart != null ? field.selectionStart : field.value.length;
    var end = field.selectionEnd != null ? field.selectionEnd : start;
    var value = field.value || '';
    field.value = value.slice(0, start) + text + value.slice(end);

    var cursor = start + text.length;
    if (selectRange && selectRange.length === 2) {
      field.setSelectionRange(start + selectRange[0], start + selectRange[1]);
    } else {
      field.setSelectionRange(cursor, cursor);
    }

    field.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function buildToolbar() {
    var bar = document.createElement('div');
    bar.className = 'math-toolbar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Chèn công thức Toán');

    var title = document.createElement('span');
    title.className = 'math-toolbar-title';
    title.textContent = 'Chèn công thức (bấm nút, không cần nhớ mã):';
    bar.appendChild(title);

    var buttons = document.createElement('div');
    buttons.className = 'math-toolbar-buttons';

    SNIPPETS.forEach(function (item) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'math-toolbar-btn';
      btn.textContent = item.label;
      btn.title = item.tip + ' → ' + item.insert;
      btn.addEventListener('click', function () {
        var target = lastField;
        if (!isEditableField(target)) {
          target = document.getElementById('noiDung');
        }
        if (!isEditableField(target)) {
          window.alert('Hãy bấm vào ô nội dung câu hỏi hoặc ô đáp án trước, rồi chọn công thức.');
          return;
        }
        insertAtCursor(target, item.insert, item.select);
        rememberField(target);
      });
      buttons.appendChild(btn);
    });

    bar.appendChild(buttons);
    return bar;
  }

  function mount() {
    document.addEventListener('focusin', function (event) {
      rememberField(event.target);
    });

    document.querySelectorAll('[data-math-toolbar]').forEach(function (host) {
      if (host.dataset.mathToolbarReady === '1') return;
      host.dataset.mathToolbarReady = '1';
      host.appendChild(buildToolbar());
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
