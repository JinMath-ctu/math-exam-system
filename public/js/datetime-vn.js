'use strict';

(function initDatetimeVnFields() {
  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function vnToIso(value) {
    const match = String(value || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})$/);
    if (!match) return '';
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
      return '';
    }
    const probe = new Date(year, month - 1, day, hour, minute);
    if (
      probe.getFullYear() !== year
      || probe.getMonth() !== month - 1
      || probe.getDate() !== day
    ) {
      return '';
    }
    return year + '-' + pad(month) + '-' + pad(day) + 'T' + pad(hour) + ':' + pad(minute);
  }

  function isoToVn(value) {
    const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!match) return '';
    return match[3] + '/' + match[2] + '/' + match[1] + ' ' + match[4] + ':' + match[5];
  }

  function bindField(wrap) {
    if (!wrap || wrap.dataset.bound === '1') return;
    wrap.dataset.bound = '1';

    const text = wrap.querySelector('.datetime-vn');
    const picker = wrap.querySelector('.datetime-vn-picker');
    const trigger = wrap.querySelector('.datetime-vn-trigger');
    if (!text || !picker) return;

    function syncPickerFromText() {
      const iso = vnToIso(text.value);
      if (iso) picker.value = iso;
    }

    function syncTextFromPicker() {
      if (!picker.value) return;
      text.value = isoToVn(picker.value);
      text.dispatchEvent(new Event('input', { bubbles: true }));
      text.dispatchEvent(new Event('change', { bubbles: true }));
    }

    syncPickerFromText();

    text.addEventListener('blur', syncPickerFromText);
    text.addEventListener('change', syncPickerFromText);
    picker.addEventListener('change', syncTextFromPicker);
    picker.addEventListener('input', syncTextFromPicker);

    if (trigger) {
      trigger.addEventListener('click', function () {
        syncPickerFromText();
        if (typeof picker.showPicker === 'function') {
          try {
            picker.showPicker();
            return;
          } catch (err) {
            // Fallback: focus/click native control.
          }
        }
        picker.focus();
        picker.click();
      });
    }
  }

  document.querySelectorAll('.datetime-vn-wrap').forEach(bindField);
})();
