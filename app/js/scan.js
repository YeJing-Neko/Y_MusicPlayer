'use strict';

// Library scanning UI and folder selection.

// ---------- scan ----------
  async function scanLibrary(root) {
    if (state.scanning) return;
    if (!root && !state.library.root) { return chooseFolder(); }
    state.scanning = true;
    const wasView = state.route.view;
    showScan(0, '准备扫描本地音乐…');
    $('.scan-chip')?.classList.add('is-busy');
    scanOff = api.onScanProgress(p => { showScan(p.total ? p.done / p.total : 0, p.current || '读取音频标签与歌词…'); });
    try {
      const wasPlaying = state.playing;
      const resumeAt = audio.currentTime;
      const lib = await api.scanLibrary(root || state.library.root);
      state.library = lib;
      syncMaps();
      if (state.current && state.current.source === 'local') {
        const refreshed = localMap.get(state.current.id);
        if (refreshed) {
          state.current = refreshed; audio.src = refreshed.url;
          audio.addEventListener('loadedmetadata', () => { try { audio.currentTime = Math.min(resumeAt, audio.duration || resumeAt); } catch {} }, { once: true });
          if (wasPlaying) audio.play().catch(() => {});
          loadLyrics(refreshed);
        }
        else { state.current = null; state.queue = []; state.qi = -1; audio.removeAttribute('src'); }
      }
      state.queue = state.queue.map(t => t.source === 'local' ? localMap.get(t.id) : t).filter(Boolean);
      const sec = await api.getSections();
      state.sections = sec.sections || [];
      await api.getPlayerState().then(p => { state.favorites = new Set(p.favorites || []); state.recent = p.recent || []; state.plays = (p && p.plays) || {}; });
      renderChrome(); renderNow(); renderMain(); renderQueue(); showToast(`曲库已更新 · ${lib.tracks.length} 首歌曲`);
    } catch (e) {
      showToast(e.message || '扫描失败', true);
    } finally {
      state.scanning = false; hideScan();
      if (scanOff) { scanOff(); scanOff = null; }
      $('.scan-chip')?.classList.remove('is-busy');
      if (wasView === 'local') renderChrome();
    }
  }
  async function chooseFolder() {
    const root = await api.chooseLibrary();
    if (root) await scanLibrary(root);
  }
  function showScan(progress, text) {
    const el = $('#scanToast');
    el.hidden = false;
    $('#scanPercent').textContent = Math.round(Math.max(0, Math.min(1, progress)) * 100) + '%';
    $('#scanBar').style.width = Math.max(2, progress * 100) + '%';
    $('#scanDetail').textContent = text;
    $('.scan-chip')?.classList.add('is-busy');
  }
  function hideScan() { setTimeout(() => { $('#scanToast').hidden = true; }, 700); }

