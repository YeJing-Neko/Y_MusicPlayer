'use strict';

// Sleep timer and touch swipe gestures.

// ---------- sleep timer / touch gestures ----------
  let sleepTicker = 0;
  function sleepTimeLabel() {
    if (!state.sleepEnd) return '';
    const left = Math.max(0, state.sleepEnd - Date.now());
    return fmtTime(Math.ceil(left / 1000));
  }
  function updateSleepUi() {
    const label = $('#sleepLabel');
    const active = !!(state.sleepEnd && state.sleepEnd > Date.now());
    if (label) label.textContent = active ? sleepTimeLabel() : '';
    const tool = document.querySelector('.sleep-tool');
    if (tool) tool.classList.toggle('has-timer', active);
    if (!active) {
      if (sleepTicker) { clearInterval(sleepTicker); sleepTicker = 0; }
    }
  }
  function setSleepTimer(minutes) {
    if (sleepTicker) { clearInterval(sleepTicker); sleepTicker = 0; }
    if (!minutes) {
      state.sleepEnd = null;
      updateSleepUi();
      closeModal();
      showToast('已取消睡眠定时');
      return;
    }
    state.sleepEnd = Date.now() + minutes * 60000;
    updateSleepUi();
    closeModal();
    showToast('将在 ' + minutes + ' 分钟后暂停播放');
    sleepTicker = setInterval(() => {
      if (!state.sleepEnd) { updateSleepUi(); return; }
      if (state.sleepEnd <= Date.now()) {
        state.sleepEnd = null;
        audio.pause();
        state.playing = false;
        updateSleepUi();
        renderTransport();
        showToast('睡眠定时结束，已暂停播放');
        return;
      }
      updateSleepUi();
    }, 1000);
  }
  function openSleepModal() {
    const active = !!(state.sleepEnd && state.sleepEnd > Date.now());
    openModal(`<div class="modal-head"><div><p class="eyebrow">SLEEP TIMER · LOCAL</p><h2>睡眠定时器</h2><p>${active ? '当前剩余 ' + sleepTimeLabel() : '到时间后自动暂停播放，适合白板睡前聆听'}</p></div><button class="round-btn" data-action="close-modal">${icon('close')}</button></div>
      <div class="modal-body"><div class="sleep-grid">${[15, 30, 45, 60, 90].map(m => `<button class="sleep-option" data-action="set-sleep" data-min="${m}"><b>${m}</b><span>分钟</span></button>`).join('')}</div><div class="sleep-hint">定时器只在本机运行，不会修改歌曲或歌单。你仍然可以正常切歌、调节音量。</div></div>
      <div class="modal-foot">${active ? '<button class="btn danger" data-action="set-sleep" data-min="0">取消定时</button>' : '<button class="btn ghost" data-action="close-modal">取消</button>'}</div>`, 'sleep-modal');
  }
  function bindSwipe(el) {
    if (!el) return;
    let start = null;
    el.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'touch') return;
      if (e.target.closest('button, input, .progress, .volume')) { start = null; return; }
      start = { x: e.clientX, y: e.clientY };
    }, { passive: true });
    el.addEventListener('pointerup', e => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      start = null;
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
      if (dx < 0) { showToast('下一首'); nextTrack(); }
      else { showToast('上一首'); prevTrack(); }
    }, { passive: true });
    el.addEventListener('pointercancel', () => { start = null; }, { passive: true });
  }
  bindSwipe($('#playerbar'));
  bindSwipe($('#immersive'));
