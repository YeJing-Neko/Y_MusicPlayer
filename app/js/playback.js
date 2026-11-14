'use strict';

// Audio loading, queue navigation and media session integration.

// ---------- playback ----------
  async function loadTrack(track, autoplay = true, quiet = false) {
    if (!track) return;
    const seq = ++playSeq;
    audio.pause();
    sessionCounted = false;
    state.current = track;
    state.playing = false;
    state.lyrics = null; state.lyricSource = ''; state.lyricLoading = true;
    lastLyricIndex = -2;
    renderNow(); renderLyricsView();
    if (seq !== playSeq) return;
    audio.src = track.playUrl || track.url;
    try { audio.load(); } catch {}
    state.playing = autoplay;
    renderNow(); renderLyricsView();
    if (autoplay) {
      try { await audio.play(); } catch (e) {
        state.playing = false; renderTransport();
        if (!quiet) showToast('浏览器阻止了自动播放，请按播放键', true);
      }
    }
    if (track.source === 'local') {
      state.recent = [track.id, ...state.recent.filter(id => id !== track.id)].slice(0, 40);
      persistPlayer();
    }
    if (state.queue[state.qi] == null || !sameTrack(state.queue[state.qi], track)) {
      const idx = state.queue.findIndex(t => sameTrack(t, track));
      if (idx >= 0) state.qi = idx;
    }
    loadLyrics(track);
    renderQueue();
    updateMediaSession();
  }
  function playWithContext(track, list) {
    if (!track) return;
    const arr = (list && list.length ? list : [track]).slice();
    state.queue = arr;
    state.qi = Math.max(0, arr.findIndex(t => sameTrack(t, track)));
    loadTrack(arr[state.qi], true);
  }
  function playAt(index, auto = false) {
    if (!state.queue.length || index < 0 || index >= state.queue.length) return;
    state.qi = index;
    loadTrack(state.queue[index], true, auto);
  }
  function nextTrack(fromEnded = false) {
    if (!state.queue.length) return;
    if (state.repeat === 'one' && fromEnded) { audio.currentTime = 0; audio.play().catch(() => {}); return; }
    let idx;
    if (state.shuffle) {
      if (state.queue.length === 1) idx = 0;
      else { do { idx = Math.floor(Math.random() * state.queue.length); } while (idx === state.qi); }
    } else idx = state.qi + 1;
    if (idx >= state.queue.length) {
      if (state.repeat === 'all') idx = 0;
      else { state.playing = false; renderTransport(); return; }
    }
    playAt(idx, fromEnded);
  }
  function prevTrack() {
    if (audio.currentTime > 4 && audio.src) { audio.currentTime = 0; renderTime(); return; }
    if (!state.queue.length) return;
    let idx = state.qi - 1;
    if (idx < 0) idx = state.repeat === 'all' ? state.queue.length - 1 : 0;
    playAt(idx);
  }
  function togglePlay() {
    if (!state.current) {
      const first = state.queue[state.qi] || state.library.tracks[0];
      if (first) { if (state.queue.length) playAt(state.qi >= 0 ? state.qi : 0); else playWithContext(first, state.library.tracks.slice(0, 100)); }
      return;
    }
    if (audio.paused) audio.play().then(() => { state.playing = true; renderTransport(); }).catch(() => showToast('无法播放这个音频文件', true));
    else { audio.pause(); state.playing = false; renderTransport(); }
  }
  function seekTo(t) {
    if (!state.current) return;
    const d = Number.isFinite(audio.duration) ? audio.duration : state.current.duration;
    audio.currentTime = Math.max(0, Math.min(d || 0, t));
    renderTime();
  }
  function toggleFavorite(track) {
    const t = track || state.current;
    if (!t) return;
    if (t.source !== 'local') return;
    if (state.favorites.has(t.id)) { state.favorites.delete(t.id); showToast('已取消收藏'); }
    else { state.favorites.add(t.id); showToast('已加入我的收藏'); }
    persistPlayer(); renderTransport(); renderNow(); renderChrome();
    if (['favorites', 'local', 'artist', 'section', 'album'].includes(state.route.view)) renderMain();
  }
  function toggleShuffle() { state.shuffle = !state.shuffle; persistPlayer(); renderTransport(); showToast(state.shuffle ? '随机播放已开启' : '随机播放已关闭'); }
  function cycleRepeat() { state.repeat = state.repeat === 'all' ? 'one' : state.repeat === 'one' ? 'off' : 'all'; persistPlayer(); renderTransport(); showToast(state.repeat === 'one' ? '单曲循环' : state.repeat === 'all' ? '列表循环' : '不循环'); }
  function cyclePlayMode() {
    if (!state.shuffle && state.repeat === 'all') { state.shuffle = true; state.repeat = 'all'; }
    else if (state.shuffle) { state.shuffle = false; state.repeat = 'one'; }
    else { state.shuffle = false; state.repeat = 'all'; }
    persistPlayer(); renderTransport();
    showToast(state.shuffle ? '随机播放' : state.repeat === 'one' ? '单曲循环' : '列表循环');
  }
  function updateMediaSession() {
    if (!('mediaSession' in navigator) || !state.current) return;
    const t = state.current;
    try {
      const art = coverUrl(t);
      navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: t.album || 'Y_Music', artwork: /^https?:/i.test(art) ? [{ src: art, sizes: '512x512' }] : [] });
      navigator.mediaSession.setActionHandler('play', () => audio.play().then(() => { state.playing = true; renderTransport(); }));
      navigator.mediaSession.setActionHandler('pause', () => { audio.pause(); state.playing = false; renderTransport(); });
      navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
      navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
    } catch {}
  }

