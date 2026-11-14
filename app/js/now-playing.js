'use strict';

// Now-playing/player chrome rendering.

// ---------- now playing / lyrics ----------
  function renderNow() {
    const t = state.current;
    const fallback = `<div class="art"><div class="art-fallback" style="--a:#8aa7bb;--b:#496b81"><span class="art-letter">Y</span></div></div>`;
    $('#pbArt').innerHTML = t ? artHTML(t) : fallback;
    $('#pbTitle').textContent = t ? t.title : '未在播放';
    $('#pbArtist').textContent = t ? (t.artist || '未知艺术家') : '从本地曲库开始';
    $('#importLyricBtn').style.display = t && t.source === 'local' ? '' : 'none';
    $('#importLyricBtn').innerHTML = `${icon('download')} ${state.lyrics && state.lyrics.length ? '替换歌词' : '导入 LRC'}`;
    $('#lyricSource').textContent = state.lyricSource || '';
    $('#lyricSource').style.display = state.lyricSource ? '' : 'none';
    $('#immTitle').textContent = t ? t.title : '未在播放';
    $('#immArtist').textContent = t ? (t.artist || '未知艺术家') : '从曲库选择一首歌';
    $('#immSource').textContent = 'LOCAL LIBRARY';
    $('#immArt').innerHTML = t ? artHTML(t) : fallback;
    const img = t && coverUrl(t);
    $('#immersiveBg').style.backgroundImage = img ? cssUrl(img) : 'none';
    const backdrop = $('#backdrop');
    if (backdrop) {
      if (img) backdrop.style.backgroundImage = cssUrl(img);
      else backdrop.style.removeProperty('background-image');
    }
    document.title = t ? `${t.title} · ${t.artist || 'Y_Music'}` : 'Y_Music · 白板音乐空间';
    renderTransport();
  }
  function renderTransport() {
    const t = state.current;
    $('#app').classList.toggle('is-playing', state.playing);
    const sleepTool = document.querySelector('.sleep-tool');
    if (sleepTool) sleepTool.classList.toggle('has-timer', !!(state.sleepEnd && state.sleepEnd > Date.now()));
    const playIcon = state.playing ? 'pause' : 'play';
    $$('[data-action="toggle-play"]').forEach(b => { b.innerHTML = icon(playIcon); b.classList.toggle('is-playing', state.playing); });
    $('#playBtn').setAttribute('aria-label', state.playing ? '暂停' : '播放');
    const modeIcon = state.shuffle ? 'shuffle' : state.repeat === 'one' ? 'repeatOne' : 'repeat';
    const modeTitle = state.shuffle ? '随机播放' : state.repeat === 'one' ? '单曲循环' : '列表循环';
    const modeBtn = $('#modeBtn');
    if (modeBtn) { modeBtn.innerHTML = icon(modeIcon); modeBtn.title = modeTitle; }
    $$('.imm-controls [data-action="cycle-mode"]').forEach(b => { b.innerHTML = icon(modeIcon); b.title = modeTitle; });
    $('#muteBtn').innerHTML = icon(state.muted || state.volume === 0 ? 'volumeX' : 'volume');
    $('#volume').value = state.muted ? 0 : state.volume;
    $('#volume').style.setProperty('--fill', `${(state.muted ? 0 : state.volume) * 100}%`);
    $$('.fav-toggle').forEach(b => b.classList.toggle('is-fav', isFav(t)));
    syncRowStates();
  }
  function syncRowStates() {
    document.querySelectorAll('.track-row').forEach(row => {
      const cur = !!state.current && row.dataset.trackId === String(state.current.id) && row.dataset.source === state.current.source;
      row.classList.toggle('is-current', cur);
      const num = row.querySelector('.row-num');
      if (num) {
        num.innerHTML = cur && state.playing
          ? '<span class="eq"><i></i><i></i><i></i></span>'
          : String(Number(row.dataset.index) + 1).padStart(2, '0');
      }
      const overlay = row.querySelector('.play-overlay');
      if (overlay) overlay.innerHTML = icon(cur && state.playing ? 'pause' : 'play');
    });
  }
  function renderTime() {
    updateKaraoke();
    const d = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : (state.current ? state.current.duration : 0);
    const p = d ? Math.min(1, audio.currentTime / d) : 0;
    $('#currentTime').textContent = fmtTime(audio.currentTime);
    $('#totalTime').textContent = fmtTime(d);
    $('#immCurrent').textContent = fmtTime(audio.currentTime);
    $('#immTotal').textContent = fmtTime(d);
    for (const el of [$('#progress'), $('#immProgress')]) {
      if (!el) continue;
      if (document.activeElement !== el) el.value = String(Math.round(p * 1000));
      el.style.setProperty('--fill', `${p * 100}%`);
    }
    updateActiveLyric(audio.currentTime + state.lyricOffset);
  }
