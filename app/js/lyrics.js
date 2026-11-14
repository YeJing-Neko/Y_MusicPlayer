'use strict';

// LRC parsing, lyric rendering, active-line tracking and karaoke.

function parseLrc(raw, translation) {
    if (!raw) return { lines: [], offset: 0 };
    let offset = 0;
    const map = new Map();
    const put = (time, text, trans) => {
      if (!text && !trans) return;
      if (!map.has(time)) map.set(time, { time, text: '', trans: '' });
      const item = map.get(time);
      if (text) item.text = item.text ? item.text + ' / ' + text : text;
      if (trans && !item.trans) item.trans = trans;
    };
    const parse = (text, isTranslation) => {
      String(text || '').split(/\r?\n/).forEach(rawLine => {
        const om = rawLine.match(/\[offset:([+-]?\d+)\]/i);
        if (om) offset = Number(om[1]) / 1000;
        const tags = [...rawLine.matchAll(/\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g)];
        if (!tags.length) return;
        const content = rawLine.replace(/\[[^\]]*\]/g, '').trim();
        tags.forEach(m => {
          const frac = m[3] ? Number('0.' + m[3]) : 0;
          const time = Number(m[1]) * 60 + Number(m[2]) + frac;
          if (isTranslation) {
            if (!map.has(time)) map.set(time, { time, text: '', trans: '' });
            if (content) map.get(time).trans = content;
          } else put(time, content, '');
        });
      });
    };
    parse(raw, false);
    if (translation) parse(translation, true);
    let lines = [...map.values()].filter(l => l.text || l.trans).sort((a, b) => a.time - b.time);
    if (!lines.length) {
      const plain = String(raw).split(/\r?\n/).map(x => x.replace(/\[[^\]]*\]/g, '').trim()).filter(Boolean);
      lines = plain.map((text, i) => ({ time: null, text, trans: '', index: i }));
    }
    return { lines, offset };
  }
  function renderLyricsView() {
    const container = $('#immLyrics');
    if (!container) return;
    const t = state.current;
    if (!t) {
      container.innerHTML = `<div class="lyric-empty large">${icon('lyrics')}<p>选一首歌，歌词会在这里同步</p></div>`;
      return;
    }
    if (state.lyricLoading) {
      container.innerHTML = `<div class="lyric-empty large"><span class="scan-spinner"></span><p>正在读取歌词…</p></div>`;
      return;
    }
    if (!state.lyrics || !state.lyrics.length) {
      container.innerHTML = `<div class="lyric-empty large">${icon('lyrics')}<p>没有找到同名 LRC 或内嵌歌词<br><span style="font-size:11px;opacity:.65">可以在左下角手动导入 LRC</span></p></div>`;
      return;
    }
    const lines = state.lyrics;
    container.innerHTML = `<div class="lyric-lines">${lines.map((l, i) => `<button class="lyric-line" data-action="seek-lyric" data-time="${l.time == null ? '' : l.time}" data-index="${i}"><span class="lrc-text">${esc(l.text || l.trans)}</span>${l.trans && l.text ? `<small class="trans">${esc(l.trans)}</small>` : ''}</button>`).join('')}</div>`;
    lastLyricIndex = -2;
    updateActiveLyric(audio.currentTime + state.lyricOffset, true);
    container.querySelectorAll('.lyric-line[data-time=""]').forEach(el => el.classList.add('no-seek'));
  }
  function updateActiveLyric(time, force = false) {
    const lines = state.lyrics;
    if (!lines || !lines.length) return;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].time == null) { idx = i; continue; }
      if (lines[i].time <= time + 0.001) idx = i; else break;
    }
    if (lines.every(l => l.time == null)) idx = 0;
    if (idx < 0 && lines[0] && lines[0].time != null && time < lines[0].time) idx = 0;
    if (idx === lastLyricIndex && !force) return;
    lastLyricIndex = idx;
    state.activeLyric = idx;
    const root = $('#immLyrics');
    if (root) {
      root.querySelectorAll('.lyric-line').forEach(el => {
        const i = Number(el.dataset.index);
        el.dataset.distance = String(Math.min(4, Math.abs(i - idx)));
        el.classList.toggle('is-active', i === idx);
        el.classList.toggle('is-past', i < idx);
      });
      const active = root.querySelector('.lyric-line.is-active');
      if (active) {
        const holder = active.closest('.lyric-lines');
        if (holder) {
          const top = active.offsetTop - holder.clientHeight / 2 + active.clientHeight / 2;
          holder.scrollTo({ top: Math.max(0, top), behavior: force ? 'auto' : 'smooth' });
        }
      }
    }
    updateKaraoke();
  }
  function updateKaraoke() {
    const lines = state.lyrics;
    if (!lines || !lines.length) return;
    const idx = state.activeLyric;
    if (idx < 0) return;
    const line = lines[idx];
    const next = lines[idx + 1];
    const el = document.querySelector('#immLyrics .lyric-line.is-active .lrc-text');
    if (!el) return;
    const t = audio.currentTime + state.lyricOffset;
    let pct = 100;
    if (line.time != null) {
      const end = next && next.time != null ? next.time : (Number.isFinite(audio.duration) && audio.duration > line.time ? audio.duration : line.time + 5);
      pct = Math.max(0, Math.min(100, ((t - line.time) / Math.max(0.3, end - line.time)) * 100));
    }
    el.style.setProperty('--karaoke', pct + '%');
  }
  let karaokeRaf = 0;
  function startKaraokeLoop() {
    if (karaokeRaf) return;
    const tick = () => {
      if ($('#immersive').hidden) { karaokeRaf = 0; return; }
      updateKaraoke();
      karaokeRaf = requestAnimationFrame(tick);
    };
    karaokeRaf = requestAnimationFrame(tick);
  }
  function stopKaraokeLoop() {
    if (karaokeRaf) cancelAnimationFrame(karaokeRaf);
    karaokeRaf = 0;
  }
  async function loadLyrics(track) {
    const seq = ++lyricSeq;
    state.lyrics = null; state.lyricSource = ''; state.lyricLoading = true; state.activeLyric = -1; lastLyricIndex = -2;
    renderLyricsView(); renderNow();
    try {
      let res;
      if (track.source === 'local') res = await api.getLyrics(track.id);
      else res = { text: '', translation: '' };
      if (seq !== lyricSeq || !sameTrack(state.current, track)) return;
      const parsed = parseLrc(res.text || '', res.translation || '');
      state.lyrics = parsed.lines;
      state.lyricSource = res.source || '';
      state.lyricOffset = parsed.offset || 0;
      const offsetLabel = document.getElementById('offsetLabel');
      if (offsetLabel) offsetLabel.textContent = `同步偏移 ${state.lyricOffset > 0 ? '+' : ''}${state.lyricOffset.toFixed(1)}s`;
    } catch (e) {
      if (seq !== lyricSeq) return;
      state.lyrics = []; state.lyricSource = '';
    }
    state.lyricLoading = false;
    renderLyricsView(); renderNow();
    renderTime();
  }

