'use strict';

// DOM, keyboard, progress and media event wiring.

// ---------- events ----------
  document.addEventListener('click', async (e) => {
    const winBtn = e.target.closest('[data-window]');
    if (winBtn) {
      const act = winBtn.dataset.window;
      if (act === 'min') api.minimize();
      else if (act === 'max') api.toggleMaximize();
      else if (act === 'close') api.close();
      return;
    }
    const actionEl = e.target.closest('[data-action]');
    if (actionEl) {
      if (actionEl.dataset.action === 'favorite' && e.target.closest('.track-row')) e.stopPropagation();
      await handleAction(actionEl.dataset.action, actionEl);
      return;
    }
    const viewBtn = e.target.closest('[data-view]');
    if (viewBtn) {
      state.query = '';
      $('#globalSearch').value = '';
      setRoute({ view: viewBtn.dataset.view });
      return;
    }
    const homeSong = e.target.closest('.home-song');
    if (homeSong) {
      const t = findTrack(homeSong.dataset.trackId);
      if (t) playWithContext(t, state.localList);
      return;
    }
    const row = e.target.closest('.track-row');
    if (row) {
      const t = findTrack(row.dataset.trackId);
      if (t) playWithContext(t, state.localList);
      return;
    }
    if (e.target.id === 'modalLayer') closeModal();
    if (e.target.id === 'queueDrawer') closeQueue();
    if (e.target.id === 'immersive') closeImmersive();
  });

  $('#titlebar').addEventListener('dblclick', e => {
    if (!e.target.closest('button, input, label')) api.toggleMaximize();
  });



  let searchTimer = 0;
  $('#globalSearch').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const q = e.target.value.trim();
      state.query = q; setRoute({ view: 'local' });
      e.target.blur();
    }
    if (e.key === 'Escape') { e.target.value = ''; state.query = ''; if (state.route.view === 'local') renderMain(); e.target.blur(); }
  });
  $('#globalSearch').addEventListener('input', e => {
    const q = e.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.query = q;
      if (state.route.view !== 'local') setRoute({ view: 'local' });
      else { renderMain(); $('#main').scrollTop = 0; }
    }, 120);
  });
  document.addEventListener('submit', e => {
    if (e.target.id === 'sectionForm') e.preventDefault();
  });

  $('#progress').addEventListener('input', e => {
    const d = Number.isFinite(audio.duration) ? audio.duration : (state.current ? state.current.duration : 0);
    if (d) { audio.currentTime = Number(e.target.value) / 1000 * d; e.target.style.setProperty('--fill', `${Number(e.target.value) / 10}%`); }
  });
  $('#immProgress').addEventListener('input', e => {
    const d = Number.isFinite(audio.duration) ? audio.duration : (state.current ? state.current.duration : 0);
    if (d) { audio.currentTime = Number(e.target.value) / 1000 * d; e.target.style.setProperty('--fill', `${Number(e.target.value) / 10}%`); }
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'playerHeightRange') {
      applyPlayerHeight(e.target.value);
      const label = $('#playerHeightValue');
      if (label) label.textContent = state.playerHeight + 'px';
      persistSettingsSoon();
    }
    if (e.target.id === 'bgRange') {
      state.appearance.bgOpacity = Number(e.target.value) / 100;
      applyAppearance();
      const label = $('#bgValue');
      if (label) label.textContent = Math.round(state.appearance.bgOpacity * 100) + '%';
      persistSettingsSoon();
    }
    if (e.target.id === 'lyricScaleRange') {
      state.appearance.lyricScale = Math.max(0.8, Math.min(1.4, Number(e.target.value) / 100));
      applyAppearance();
      const label = $('#lyricScaleValue');
      if (label) label.textContent = Math.round(state.appearance.lyricScale * 100) + '%';
      persistSettingsSoon();
    }
  });
  $('#volume').addEventListener('input', e => {
    state.volume = Number(e.target.value); state.muted = false; audio.muted = false; audio.volume = state.volume;
    e.target.style.setProperty('--fill', `${state.volume * 100}%`); saveVolume(); renderTransport();
  });
  let lastPositionSave = 0;
  audio.addEventListener('timeupdate', () => {
    renderTime();
    if (state.playing && state.current && state.current.source === 'local' && Date.now() - lastPositionSave > 12000) {
      lastPositionSave = Date.now();
      persistPlayer();
    }
  });
  audio.addEventListener('durationchange', renderTime);
  audio.addEventListener('loadedmetadata', renderTime);
  audio.addEventListener('play', () => {
    state.playing = true;
    if (state.current && state.current.source === 'local' && !sessionCounted) {
      sessionCounted = true;
      state.plays[state.current.id] = (state.plays[state.current.id] || 0) + 1;
      persistPlayer();
    }
    renderTransport(); renderNow();
  });
  audio.addEventListener('pause', () => { state.playing = false; renderTransport(); renderNow(); if (state.current && state.current.source === 'local') persistPlayer(); });
  audio.addEventListener('ended', () => nextTrack(true));
  audio.addEventListener('error', () => {
    if (!state.current || !audio.currentSrc) return;
    state.playing = false; renderTransport();
    showToast('无法播放：文件可能已移动，或音频格式不受支持', true);
  });

  document.addEventListener('keydown', e => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '');
    if (e.key === 'Escape') {
      if (state.modal) closeModal();
      else if (!$('#queueDrawer').hidden) closeQueue();
      else if (!$('#immersive').hidden) closeImmersive();
      else if ($('#globalSearchWrap').classList.contains('is-open')) $('#globalSearchWrap').classList.remove('is-open');
      return;
    }
    if (e.key === 'F11') { e.preventDefault(); api.toggleFullscreen(); return; }
    if (typing) return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    if (e.key === 'ArrowRight' && e.shiftKey) nextTrack();
    if (e.key === 'ArrowLeft' && e.shiftKey) prevTrack();
    if (e.key.toLowerCase() === 'l' && !e.ctrlKey) { if ($('#immersive').hidden) openImmersive(); else closeImmersive(); }
    if (e.key.toLowerCase() === 'm' && !e.ctrlKey) { state.muted = !state.muted; audio.muted = state.muted; renderTransport(); }
  });

