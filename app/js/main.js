'use strict';

// Application boot sequence.

// ---------- boot ----------
  async function init() {
    let info = {};
    try { info = await api.info(); } catch {}
    state.version = info.version || '1.0'; state.dataDir = info.dataDir || ''; state.demoDir = info.demoDir || '';
    try {
      const [lib, sec, player, prefs] = await Promise.all([api.getLibrary(), api.getSections(), api.getPlayerState(), api.getSettings().catch(() => ({}))]);
      state.library = { root: lib.root || '', scannedAt: lib.scannedAt || null, missing: lib.missing || 0, tracks: lib.tracks || [] };
      state.sections = (sec && sec.sections) || [];
      syncMaps();
      state.favorites = new Set((player && player.favorites) || []);
      state.recent = (player && player.recent) || [];
      state.plays = (player && player.plays && typeof player.plays === 'object') ? player.plays : {};
      state.shuffle = !!(player && player.shuffle);
      state.repeat = (player && player.repeat) || 'all';
      state.appearance = { theme: 'salt', motion: 'silky', bgOpacity: 1, lyricScale: 1, ...(prefs && prefs.appearance) };
      state.showWelcome = !(prefs && prefs.showWelcome === false);
      state.playerHeight = Math.max(76, Math.min(150, Number(prefs && prefs.playerHeight) || 94));
      const savedVolume = Number(prefs && prefs.volume);
      state.volume = Number.isFinite(savedVolume) ? Math.max(0, Math.min(1, savedVolume)) : 0.8;
      applyAppearance();
      audio.volume = state.volume;
      if (player && Array.isArray(player.queue) && player.queue.length) {
        state.queue = player.queue.map(q => localMap.get(q.id)).filter(Boolean);
        if (state.queue.length) {
          const ci = Math.max(0, state.queue.findIndex(t => t.id === player.currentId));
          state.qi = ci;
          state.current = state.queue[ci];
          audio.src = state.current.url;
          const pos = Number(player.position) || 0;
          if (pos > 1) audio.addEventListener('loadedmetadata', () => { try { audio.currentTime = Math.min(pos, Math.max(0, (audio.duration || 0) - 1)); } catch {} }, { once: true });
          loadLyrics(state.current).catch(() => {});
        }
      }
    } catch (e) { console.error(e); }
    if (state.library.tracks.length === 0) {
      // sample data may still be initializing; show onboarding without blocking
    }
    if (!state.current && state.library.tracks.length) {
      state.current = state.library.tracks[0];
      state.queue = state.library.tracks.slice(0, 100);
      state.qi = 0;
      audio.src = state.current.url;
      loadLyrics(state.current).catch(() => {});
    }
    renderChrome(); renderMain(); renderNow(); renderQueue();
    $('#volume').value = state.volume; $('#volume').style.setProperty('--fill', `${state.volume * 100}%`);
    $('#app').classList.add('is-ready');
    setTimeout(() => {
      $('#boot').classList.add('is-gone'); $('#app').setAttribute('aria-hidden', 'false');
      if (state.showWelcome) initWelcome(); else initAnnouncement();
    }, 250);
  }

  window.addEventListener('error', e => console.error('UI ERROR', e.message, e.filename, e.lineno));
  window.addEventListener('unhandledrejection', e => console.error('UI REJECTION', e.reason && (e.reason.stack || e.reason.message || e.reason)));

  init();
