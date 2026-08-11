'use strict';

/**
 * Cho phép dán (Ctrl+V) hoặc kéo-thả ảnh minh họa câu hỏi
 * (đồ thị, hình học…) vào form tạo/sửa — không cần biết LaTeX.
 */
(function () {
  var ALLOWED = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  };
  var MAX_BYTES = 5 * 1024 * 1024;

  function pickImageFile(fileList) {
    if (!fileList || !fileList.length) return null;
    for (var i = 0; i < fileList.length; i += 1) {
      var file = fileList[i];
      if (file && ALLOWED[file.type]) return file;
    }
    return null;
  }

  function setInputFile(input, file) {
    try {
      var dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    } catch (_err) {
      return false;
    }
  }

  function showPreview(zone, file) {
    var preview = zone.querySelector('[data-image-preview]');
    if (!preview) return;
    preview.innerHTML = '';
    var img = document.createElement('img');
    img.alt = 'Xem trước ảnh minh họa';
    img.src = URL.createObjectURL(file);
    preview.appendChild(img);
    zone.classList.add('has-image');
  }

  function showError(zone, message) {
    var err = zone.querySelector('[data-image-error]');
    if (!err) return;
    err.textContent = message || '';
  }

  function applyFile(zone, input, file) {
    showError(zone, '');
    if (!file) {
      showError(zone, 'Chỉ nhận ảnh JPG, PNG hoặc WEBP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      showError(zone, 'Ảnh vượt quá 5MB. Hãy chụp/nén nhỏ hơn.');
      return;
    }
    if (!setInputFile(input, file)) {
      showError(zone, 'Trình duyệt không hỗ trợ dán ảnh. Hãy bấm “Chọn ảnh”.');
      return;
    }
    showPreview(zone, file);
  }

  function enhance(input) {
    if (!input || input.dataset.pasteReady === '1') return;
    input.dataset.pasteReady = '1';

    var zone = document.createElement('div');
    zone.className = 'image-dropzone';
    zone.tabIndex = 0;
    zone.setAttribute('role', 'button');
    zone.setAttribute(
      'aria-label',
      'Dán ảnh minh họa bằng Ctrl+V, kéo thả ảnh, hoặc bấm để chọn file',
    );
    zone.innerHTML =
      '<div class="image-dropzone-main">' +
        '<strong>Dán ảnh vào đây (Ctrl+V)</strong>' +
        '<span>Hoặc kéo-thả ảnh đồ thị/hình học, hoặc bấm để chọn file</span>' +
      '</div>' +
      '<div class="image-dropzone-preview" data-image-preview></div>' +
      '<p class="field-hint image-dropzone-error" data-image-error></p>';

    input.parentNode.insertBefore(zone, input);
    zone.appendChild(input);
    input.classList.add('image-dropzone-input');

    zone.addEventListener('click', function (event) {
      if (event.target === input) return;
      input.click();
    });

    zone.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        input.click();
      }
    });

    zone.addEventListener('dragover', function (event) {
      event.preventDefault();
      zone.classList.add('is-dragover');
    });
    zone.addEventListener('dragleave', function () {
      zone.classList.remove('is-dragover');
    });
    zone.addEventListener('drop', function (event) {
      event.preventDefault();
      zone.classList.remove('is-dragover');
      applyFile(zone, input, pickImageFile(event.dataTransfer && event.dataTransfer.files));
    });

    zone.addEventListener('paste', function (event) {
      var items = event.clipboardData && event.clipboardData.items;
      if (!items) return;
      for (var i = 0; i < items.length; i += 1) {
        var item = items[i];
        if (item.kind === 'file' && ALLOWED[item.type]) {
          event.preventDefault();
          applyFile(zone, input, item.getAsFile());
          return;
        }
      }
    });

    // Cho phép dán khi focus ở form (không chỉ trong ô)
    document.addEventListener('paste', function (event) {
      if (!document.body.contains(zone)) return;
      var active = document.activeElement;
      if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT') && active !== input) {
        return; // đang gõ chữ trong ô khác
      }
      var items = event.clipboardData && event.clipboardData.items;
      if (!items) return;
      for (var i = 0; i < items.length; i += 1) {
        var item = items[i];
        if (item.kind === 'file' && ALLOWED[item.type]) {
          event.preventDefault();
          applyFile(zone, input, item.getAsFile());
          zone.focus();
          return;
        }
      }
    });

    input.addEventListener('change', function () {
      var file = pickImageFile(input.files);
      if (file) showPreview(zone, file);
    });
  }

  function mount() {
    var input = document.getElementById('anh');
    if (input) enhance(input);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
