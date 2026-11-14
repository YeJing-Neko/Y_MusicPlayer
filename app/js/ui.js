'use strict';

// Queue drawer, immersive mode and toast helpers.

// ---------- queue / drawer ----------
  function openQueue() {
    $('#queueDrawer').hidden = false;
    renderQueue();
  }
  function closeQueue() { $('#queueDrawer').hidden = true; }
  function renderQueue() {
    if ($('#queueDrawer').hidden) return;
    $('#queueCount').textContent = String(state.queue.length);
    $('#queueList').innerHTML = state.queue.length ? state.queue.map((t, i) => `<button class="queue-item ${sameTrack(t, state.current) ? 'is-current' : ''}" data-action="queue-play" data-index="${i}"><span class="queue-num">${sameTrack(t, state.current) ? icon('play') : String(i + 1).padStart(2, '0')}</span><div class="queue-thumb">${artHTML(t)}</div><div class="queue-copy"><b>${esc(t.title)}</b><span>${esc(t.artist)}</span></div><span class="queue-time">${fmtTime(t.duration)}</span></button>`).join('') : `<div class="lyric-empty" style="margin-top:60px">${icon('queue')}<p>队列还是空的<br>从曲库里选一首歌开始</p></div>`;
  }

  // ---------- immersive ----------
  function openImmersive() {
    if (!state.current) { showToast('先选一首歌吧'); return; }
    $('#immersive').hidden = false;
    renderNow(); renderLyricsView();
    startKaraokeLoop();
  }
  function closeImmersive() { $('#immersive').hidden = true; stopKaraokeLoop(); }
  function adjustLyricOffset(delta) {
    state.lyricOffset = Math.round((state.lyricOffset + delta) * 10) / 10;
    $('#offsetLabel').textContent = `同步偏移 ${state.lyricOffset > 0 ? '+' : ''}${state.lyricOffset.toFixed(1)}s`;
    lastLyricIndex = -2; renderTime();
  }

  // ---------- toast ----------
  function showToast(msg, error = false) {
    const wrap = $('#toastWrap');
    const el = document.createElement('div');
    el.className = 'toast' + (error ? ' is-error' : '');
    el.innerHTML = `${icon(error ? 'info' : 'check')}<span>${esc(msg)}</span>`;
    wrap.appendChild(el);
    clearTimeout(toastTimer);
    setTimeout(() => { el.classList.add('is-out'); setTimeout(() => el.remove(), 250); }, 2600);
  }
