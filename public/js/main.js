'use strict';

(function () {
  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function initSidebar() {
    var shell = qs('[data-app-shell]');
    if (!shell) return;

    var toggle = qs('[data-sidebar-toggle]', shell);
    var backdrop = qs('[data-sidebar-close]', shell);
    var sidebar = qs('#app-sidebar', shell);

    function setOpen(open) {
      document.body.classList.toggle('sidebar-open', open);
      if (backdrop) backdrop.hidden = !open;
      if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    if (toggle) {
      toggle.addEventListener('click', function () {
        setOpen(!document.body.classList.contains('sidebar-open'));
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', function () {
        setOpen(false);
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setOpen(false);
    });

    // Active nav by current path
    var path = window.location.pathname;
    qsa('.nav-link[data-nav-prefix]', sidebar || document).forEach(function (link) {
      var prefix = link.getAttribute('data-nav-prefix');
      if (!prefix) return;
      if (path === prefix || path.indexOf(prefix + '/') === 0) {
        link.classList.add('is-active');
      }
    });
  }

  function initPasswordToggle() {
    qsa('[data-password-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetId = btn.getAttribute('data-password-toggle');
        var input = targetId ? document.getElementById(targetId) : null;
        if (!input) return;
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
        btn.setAttribute('aria-pressed', show ? 'true' : 'false');
      });
    });
  }

  // Custom confirm — tránh window.confirm() (bị vỡ/nhấp nháy trên một số webview).
  var confirmState = null;

  function ensureConfirmModal() {
    var existing = qs('[data-app-confirm]');
    if (existing) return existing;

    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.setAttribute('data-app-confirm', '1');
    backdrop.setAttribute('hidden', '');
    backdrop.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="app-confirm-title">' +
        '<h2 id="app-confirm-title">Xác nhận</h2>' +
        '<p data-app-confirm-message></p>' +
        '<div class="modal-actions">' +
          '<button type="button" class="btn btn-secondary" data-app-confirm-cancel>Hủy</button>' +
          '<button type="button" class="btn btn-primary" data-app-confirm-ok>Đồng ý</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(backdrop);

    backdrop.addEventListener('click', function (event) {
      if (event.target === backdrop) closeConfirm(false);
    });
    qs('[data-app-confirm-cancel]', backdrop).addEventListener('click', function () {
      closeConfirm(false);
    });
    qs('[data-app-confirm-ok]', backdrop).addEventListener('click', function () {
      closeConfirm(true);
    });

    return backdrop;
  }

  function closeConfirm(result) {
    var backdrop = qs('[data-app-confirm]');
    if (backdrop) backdrop.setAttribute('hidden', '');
    document.body.classList.remove('modal-open');
    var resolve = confirmState && confirmState.resolve;
    var previousFocus = confirmState && confirmState.previousFocus;
    confirmState = null;
    if (previousFocus && typeof previousFocus.focus === 'function') {
      previousFocus.focus();
    }
    if (resolve) resolve(Boolean(result));
  }

  function appConfirm(message, options) {
    return new Promise(function (resolve) {
      if (confirmState) {
        closeConfirm(false);
      }

      var backdrop = ensureConfirmModal();
      var title = qs('#app-confirm-title', backdrop);
      var text = qs('[data-app-confirm-message]', backdrop);
      var okBtn = qs('[data-app-confirm-ok]', backdrop);
      var cancelBtn = qs('[data-app-confirm-cancel]', backdrop);
      var infoOnly = options && options.info;
      var danger = options && options.danger;

      if (title) title.textContent = infoOnly ? 'Thông báo' : 'Xác nhận';
      if (text) text.textContent = message || 'Bạn có chắc chắn?';
      if (cancelBtn) cancelBtn.hidden = !!infoOnly;
      if (okBtn) {
        okBtn.className = danger ? 'btn btn-danger' : 'btn btn-primary';
        okBtn.textContent = infoOnly ? 'Đã hiểu' : (danger ? 'Xác nhận' : 'Đồng ý');
      }

      confirmState = {
        resolve: resolve,
        previousFocus: document.activeElement,
      };

      backdrop.removeAttribute('hidden');
      document.body.classList.add('modal-open');
      if (okBtn) okBtn.focus();
    });
  }

  window.appConfirm = appConfirm;

  function initConfirmForms() {
    qsa('form[data-confirm]').forEach(function (form) {
      form.addEventListener('submit', function (event) {
        var message = form.getAttribute('data-confirm');
        if (!message) return;
        if (form.getAttribute('data-confirm-accepted') === '1') {
          form.removeAttribute('data-confirm-accepted');
          return;
        }

        event.preventDefault();
        var submitter = event.submitter;
        var danger = Boolean(
          (submitter && submitter.classList && submitter.classList.contains('btn-danger'))
          || form.querySelector('.btn-danger')
        );
        appConfirm(message, { danger: danger }).then(function (ok) {
          if (!ok) return;
          form.setAttribute('data-confirm-accepted', '1');
          if (typeof form.requestSubmit === 'function') {
            // Giữ submitter (nếu có) để không mất formaction/formmethod trên nút ngoài form.
            if (submitter && typeof submitter.click === 'function' && submitter.form === form) {
              form.requestSubmit(submitter);
            } else {
              form.requestSubmit();
            }
          } else {
            form.submit();
          }
        });
      });
    });
  }

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if (!confirmState) return;
    event.preventDefault();
    closeConfirm(false);
  });

  function initCopyButtons() {
    qsa('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var value = btn.getAttribute('data-copy') || '';
        if (!value || !navigator.clipboard) return;
        navigator.clipboard.writeText(value).then(function () {
          var original = btn.textContent;
          btn.textContent = 'Đã chép';
          setTimeout(function () {
            btn.textContent = original;
          }, 1200);
        }).catch(function () {});
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initSidebar();
    initPasswordToggle();
    initConfirmForms();
    initCopyButtons();
  });
})();
