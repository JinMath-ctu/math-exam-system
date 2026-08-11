'use strict';

(function initExamQuestionPicker() {
  function visibleChecks(root) {
    return Array.from(root.querySelectorAll('.picker-check')).filter(function (checkbox) {
      const row = checkbox.closest('tr');
      return row && row.style.display !== 'none';
    });
  }

  function syncRow(checkbox) {
    const row = checkbox.closest('tr');
    if (!row) return;
    row.classList.toggle('is-selected', checkbox.checked);
    const score = row.querySelector('.picker-score');
    if (!score) return;
    // Không dùng disabled: trình duyệt sẽ bỏ ô điểm khỏi POST → lỗi thiếu điểm.
    score.readOnly = !checkbox.checked;
  }

  function updateCount(root) {
    const checks = visibleChecks(root);
    const selected = checks.filter(function (checkbox) {
      return checkbox.checked;
    }).length;
    const label = root.querySelector('#picker-count');
    if (label) {
      label.textContent = 'Đã chọn ' + selected;
    }
    const visibleCount = root.querySelector('[data-picker-visible-count]');
    if (visibleCount) {
      visibleCount.textContent = String(checks.length);
    }
    const selectAll = root.querySelector('#picker-select-all');
    if (selectAll && checks.length) {
      selectAll.checked = selected === checks.length;
      selectAll.indeterminate = selected > 0 && selected < checks.length;
    } else if (selectAll) {
      selectAll.checked = false;
      selectAll.indeterminate = false;
    }
  }

  function applyKhoiFilter(root) {
    const filter = root.querySelector('#picker-khoi-lop');
    const value = filter ? String(filter.value || '') : '';
    root.querySelectorAll('tbody tr[data-khoi-lop]').forEach(function (row) {
      const match = !value || String(row.getAttribute('data-khoi-lop') || '') === value;
      row.style.display = match ? '' : 'none';
      if (!match) {
        const checkbox = row.querySelector('.picker-check');
        if (checkbox && checkbox.checked) {
          checkbox.checked = false;
          syncRow(checkbox);
        }
      }
    });
    updateCount(root);
  }

  function bind(root) {
    if (!root || root.dataset.pickerBound === '1') return;
    root.dataset.pickerBound = '1';

    root.querySelectorAll('.picker-check').forEach(function (checkbox) {
      syncRow(checkbox);
      checkbox.addEventListener('change', function () {
        syncRow(checkbox);
        updateCount(root);
      });
    });

    const selectAll = root.querySelector('#picker-select-all');
    if (selectAll) {
      selectAll.addEventListener('change', function () {
        visibleChecks(root).forEach(function (checkbox) {
          checkbox.checked = selectAll.checked;
          syncRow(checkbox);
        });
        updateCount(root);
      });
    }

    const filter = root.querySelector('#picker-khoi-lop');
    if (filter) {
      filter.addEventListener('change', function () {
        applyKhoiFilter(root);
      });
    }

    updateCount(root);
  }

  document.querySelectorAll('#exam-create-form, #exam-add-questions-form').forEach(bind);
})();
