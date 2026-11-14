'use strict';

// First-launch "2.0 全新启航" welcome stage.

// ---------- welcome ----------
  let welcomeVisible = false;
  let welcomeLeaveTimer = 0;

  function initWelcome() {
    const el = $('#welcomeScreen');
    if (!el) return;
    if (state.showWelcome === false) { el.hidden = true; return; }
    clearTimeout(welcomeLeaveTimer);
    welcomeVisible = true;
    el.hidden = false;
    el.setAttribute('aria-hidden', 'false');
    el.classList.remove('is-out');
    document.body.classList.add('welcome-open');
    $('#app').classList.add('is-welcome');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.classList.add('is-in');
      el.querySelector('.welcome-start')?.focus({ preventScroll: true });
    }));
  }

  function dismissWelcome() {
    const el = $('#welcomeScreen');
    if (!el || !welcomeVisible) return;
    welcomeVisible = false;
    el.classList.add('is-out');
    el.setAttribute('aria-hidden', 'true');
    clearTimeout(welcomeLeaveTimer);
    welcomeLeaveTimer = setTimeout(() => {
      el.hidden = true;
      el.classList.remove('is-in', 'is-out');
      document.body.classList.remove('welcome-open');
      $('#app').classList.remove('is-welcome');
      initAnnouncement();
    }, 820);
  }

  function setShowWelcome(value) {
    state.showWelcome = !!value;
    persistSettingsSoon();
    if (state.route.view === 'settings') renderMain();
    showToast(state.showWelcome ? '已开启：每次启动展示 2.0 启航界面' : '已关闭：下次启动直接进入首页');
  }

  document.addEventListener('keydown', event => {
    if (!welcomeVisible) return;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
      event.preventDefault();
      dismissWelcome();
    }
  }, { capture: true });
