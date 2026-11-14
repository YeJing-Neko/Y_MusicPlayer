'use strict';

// Utilities, constants, shared state and appearance.

const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const api = window.musicAPI;
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cssUrl = (u) => `url("${String(u).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\n\r]/g, '')}")`;
  const safeUrl = (u) => /^(https?:|file:|data:image\/)/i.test(String(u || '')) ? String(u) : '';
  const coverUrl = (t) => {
    if (!t) return '';
    if (t.coverUrl) return safeUrl(t.coverUrl);
    return safeUrl(t.cover);
  };
  const fmtTime = (s) => {
    s = Math.max(0, Math.floor(Number(s) || 0));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };
  const fmtDate = (ms) => {
    if (!ms) return '刚刚';
    const d = new Date(ms), now = new Date(), diff = (now - d) / 86400000;
    if (diff < 1 && d.getDate() === now.getDate()) return '今天';
    if (diff < 2) return '昨天';
    if (diff < 7) return Math.floor(diff) + ' 天前';
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };
  const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, '').replace(/[（(].*?[)）]/g, '');
  const sameTrack = (a, b) => !!a && !!b && a.source === b.source && String(a.id) === String(b.id);
  const hash = (s) => { let h = 0; for (let i = 0; i < String(s).length; i++) h = (h * 31 + String(s).charCodeAt(i)) | 0; return Math.abs(h); };
  const PALETTES = [
    ['#4d7860', '#1d3228'], ['#a37651', '#35241a'], ['#47707b', '#192a30'],
    ['#866369', '#2d1d21'], ['#67628c', '#242138'], ['#74705a', '#2a2820'],
    ['#8c6a4e', '#33251b'], ['#557161', '#1e2b25']
  ];
  function paletteFor(t) {
    const p = PALETTES[hash((t && (t.title || '') + (t.artist || '')) || 'ymusic') % PALETTES.length];
    return { a: p[0], b: p[1] };
  }
  function artHTML(t, extra = '') {
    const pal = paletteFor(t);
    const img = coverUrl(t);
    const initial = String((t && (t.title || t.artist)) || 'Y').trim().charAt(0).toUpperCase() || 'Y';
    return `<div class="art ${extra}"><div class="art-fallback ${img ? 'has-cover' : ''}" style="--a:${pal.a};--b:${pal.b};${img ? `background-image:${esc(cssUrl(img))};` : ''}">${img ? '' : `<span class="art-letter">${esc(initial)}</span>`}</div></div>`;
  }
  function artistArtHTML(tracks, extra = '') {
    return artHTML(tracks && tracks[0] ? tracks[0] : { title: 'Y' }, extra);
  }

  const ICONS = {
    leaf: '<path d="M20 4c-6.4.4-12.2 3.8-13.3 9.7-.4 2.3.3 4.2 1.6 5.4.7-4.6 3.3-8.4 8.1-10.9-4.4 3-6.9 7.2-7.3 12.1 1.4.6 3.2.6 4.9-.1 5.8-2.4 6-10.6 6-16.2Z"/><path d="M4 21c.8-4.2 2.8-7.6 6-9.9"/>',
    headphones: '<path d="M4 14a8 8 0 0 1 16 0"/><path d="M4 14v4a2 2 0 0 0 2 2h1v-6H6a2 2 0 0 0-2 2Z"/><path d="M20 14v4a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    waves: '<path d="M2 7c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2M2 13c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2M2 19c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2"/>',
    coffee: '<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z"/><path d="M17 10h1a3 3 0 0 1 0 6h-1M7 3v2M11 3v2M15 3v2"/>',
    planet: '<circle cx="12" cy="12" r="6"/><path d="M4.5 15.5c-2-1.4-3-2.8-2.4-3.8.8-1.3 4.6-.8 9 1.2s7 4.3 6.2 5.6c-.5.9-2.3 1-4.6.4"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2V5Z"/><path d="M20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 0 2-2V5Z"/>',
    candle: '<path d="M9 9h6v11H9z"/><path d="M12 9V6"/><path d="M12 6c-2-2-1-5 0-5s2 3 0 5Z"/><path d="M6 20h12"/>',
    artist: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
    album: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.4"/><path d="M12 3.5v3M12 17.5v3"/>',
    note: '<path d="M9 18V5l11-2v12"/><circle cx="6.5" cy="18" r="2.7"/><circle cx="17.5" cy="15" r="2.7"/>',
    bars: '<path d="M4 20v-5M9 20V9M14 20v-8M19 20V4"/>',
    minus: '<path d="M5 12h14"/>',
    window: '<rect x="4" y="4" width="16" height="16" rx="1.8"/>',
    arrowUp: '<path d="M12 20V4M6 10l6-6 6 6"/>',
    target: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    playlist: '<path d="M4 6h12M4 11h12M4 16h8"/><path d="M18 11v8.5a2.5 2.5 0 1 1-2-2.45"/>',
    home: '<path d="M3 10.7 12 3l9 7.7"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
    disc: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.2"/><path d="M12 3.5v3M12 17.5v3"/>',
    users: '<path d="M16 21v-1.8a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V21"/><circle cx="9" cy="7" r="3.5"/><path d="M22 21v-1.8a4 4 0 0 0-3-3.87M16.5 3.6a4 4 0 0 1 0 7.8"/>',
    sparkles: '<path d="m12 3 1.8 4.9L18.5 10l-4.7 2.1L12 17l-1.8-4.9L5.5 10l4.7-2.1L12 3Z"/><path d="m19 16 .9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16Z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.55 15a1.7 1.7 0 0 0-1.56-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.55h.09a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.45 9v.09a1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>',
    fullscreen: '<path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5"/>',
    expand: '<path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5"/>',
    play: '<path d="M7 4.8v14.4L19.2 12 7 4.8Z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6" y="4.5" width="3.8" height="15" rx="1.2" fill="currentColor" stroke="none"/><rect x="14.2" y="4.5" width="3.8" height="15" rx="1.2" fill="currentColor" stroke="none"/>',
    prev: '<path d="M6 5v14" stroke-width="2"/><path d="M19 5.5v13L9 12 19 5.5Z" fill="currentColor" stroke="none"/>',
    next: '<path d="M18 5v14" stroke-width="2"/><path d="M5 5.5v13L15 12 5 5.5Z" fill="currentColor" stroke="none"/>',
    shuffle: '<path d="M3 7h3.5c4.5 0 5.5 10 10 10H21"/><path d="m18 14 3 3-3 3M3 17h3.5c2.2 0 3.5-2.4 4.8-5M14.2 8.2C15.3 7.5 16.2 7 17 7h4"/><path d="m18 4 3 3-3 3"/>',
    repeat: '<path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    repeatOne: '<path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><path d="M11 9.5 13 8v5"/>',
    volume: '<path d="M11 5 6.5 9H3v6h3.5L11 19V5Z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/>',
    volumeX: '<path d="M11 5 6.5 9H3v6h3.5L11 19V5Z"/><path d="m16 9 5 6M21 9l-5 6"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5 12.5 4.2 4.2L19 6.5"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    queue: '<path d="M4 6h11M4 11h11M4 16h7"/><path d="M17 15v6l5-3-5-3Z" fill="currentColor" stroke="none"/>',
    lyrics: '<path d="M4 6h16M4 11h12M4 16h14M4 21h8"/><path d="M19 14v5.5a2.5 2.5 0 1 1-2-2.45" stroke-width="1.6"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    moon: '<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    arrowRight: '<path d="M5 12h14M14 7l5 5-5 5"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2"/>'
  };
  const svgIcon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.music}</svg>`;
  const icon = (name) => `<span class="ic">${svgIcon(name)}</span>`;
  $$('[data-icon]').forEach(el => { el.innerHTML = svgIcon(el.dataset.icon); });

  const THEMES = {
    salt: { name: '海盐', accent: '#588ba6', nav: 'rgba(214,236,249,.62)', washA: 'rgba(229,244,255,.84)', washB: 'rgba(186,217,237,.78)', karaoke: '#d9f3ff' },
    moss: { name: '青苔', accent: '#628e70', nav: 'rgba(219,240,224,.64)', washA: 'rgba(235,247,237,.84)', washB: 'rgba(193,223,202,.78)', karaoke: '#dcffdd' },
    peach: { name: '蜜桃', accent: '#c07c61', nav: 'rgba(251,230,220,.66)', washA: 'rgba(255,241,233,.85)', washB: 'rgba(242,208,192,.78)', karaoke: '#ffe3d3' },
    rose: { name: '樱粉', accent: '#b56e88', nav: 'rgba(250,227,236,.66)', washA: 'rgba(254,240,246,.85)', washB: 'rgba(239,202,219,.78)', karaoke: '#ffdfe9' },
    lavender: { name: '雾紫', accent: '#8177a8', nav: 'rgba(233,228,249,.66)', washA: 'rgba(245,242,255,.85)', washB: 'rgba(213,205,239,.78)', karaoke: '#eadfff' },
    graphite: { name: '石墨', accent: '#606d76', nav: 'rgba(228,233,236,.62)', washA: 'rgba(242,246,248,.85)', washB: 'rgba(204,217,225,.8)', karaoke: '#dfedf5' },
    ios: { name: 'iOS', accent: '#0a84ff', nav: 'rgba(225,241,255,.78)', washA: 'rgba(250,252,255,.94)', washB: 'rgba(212,231,250,.84)', karaoke: '#d9ecff' },
    netease: { name: '网易云', accent: '#ec4141', nav: 'rgba(255,228,226,.68)', washA: 'rgba(255,244,242,.9)', washB: 'rgba(245,204,201,.8)', karaoke: '#ffe0dc' }
  };
  const MOTION_OPTIONS = [['silky', '丝滑'], ['light', '轻盈'], ['off', '关闭']];
  const audio = new Audio();
  audio.preload = 'metadata';
  const state = {
    version: '1.0', dataDir: '', demoDir: '',
    library: { root: '', tracks: [], scannedAt: null },
    sections: [], favorites: new Set(), recent: [], plays: {},
    route: { view: 'home' }, query: '', localTab: 'songs', sort: 'artist',
    queue: [], qi: -1, current: null, playing: false,
    shuffle: false, repeat: 'all', volume: 0.8, muted: false, playerHeight: 94,
    appearance: { theme: 'salt', motion: 'silky', bgOpacity: 1, lyricScale: 1 },
    sleepEnd: null,
    lyrics: null, lyricSource: '', lyricLoading: false, activeLyric: -1, lyricOffset: 0,
    showWelcome: true,
    scanning: false, modal: null, sectionDraft: null, pendingSectionTrack: null,
    localList: [], playlistName: '', warningDismissed: false,
    lastView: 'local'
  };
  const localMap = new Map();
  let lyricSeq = 0, playSeq = 0, lastLyricIndex = -2, seekLock = 0, toastTimer = null;
  let scanOff = null, sessionCounted = false;
  let announcementData = null;
  let announcementTicker = 0;
  let announcementHideTimer = 0;

  function syncMaps() {
    localMap.clear();
    state.library.tracks.forEach(t => localMap.set(t.id, t));
  }
  function findTrack(id) { return localMap.get(id) || (state.current && state.current.id === id ? state.current : null) || state.queue.find(t => t.id === id) || null; }
  function isFav(t) { return !!t && t.source === 'local' && state.favorites.has(t.id); }
  function requireLocalTrack(t) { return t && t.source === 'local' ? t : null; }

  function persistPlayer() {
    clearTimeout(persistPlayer.timer);
    persistPlayer.timer = setTimeout(() => {
      api.savePlayerState({
        favorites: [...state.favorites], recent: state.recent,
        queue: state.queue.filter(t => t.source === 'local').map(t => ({ id: t.id, source: 'local' })),
        currentId: state.current && state.current.source === 'local' ? state.current.id : null,
        position: audio.currentTime || 0,
        plays: state.plays,
        shuffle: state.shuffle, repeat: state.repeat
      }).catch(() => {});
    }, 120);
  }
  let settingsSaveTimer = 0;
  function saveVolume() { persistSettingsSoon(); }
  function persistSettingsSoon() {
    clearTimeout(settingsSaveTimer);
    settingsSaveTimer = setTimeout(() => {
      api.saveSettings({ volume: state.volume, playerHeight: state.playerHeight, showWelcome: state.showWelcome, appearance: state.appearance }).catch(() => {});
    }, 120);
  }
  function applyPlayerHeight(value) {
    const h = Math.min(150, Math.max(76, Math.round(Number(value) || 94)));
    state.playerHeight = h;
    document.documentElement.style.setProperty('--player-h', h + 'px');
  }
  function applyAppearance() {
    const theme = THEMES[state.appearance.theme] || THEMES.salt;
    const root = document.documentElement.style;
    root.setProperty('--theme-accent', theme.accent);
    root.setProperty('--theme-nav', theme.nav);
    root.setProperty('--theme-wash-a', theme.washA);
    root.setProperty('--theme-wash-b', theme.washB);
    root.setProperty('--theme-karaoke', theme.karaoke);
    root.setProperty('--bg-opacity', String(Math.max(0.5, Math.min(1, Number(state.appearance.bgOpacity) || 1))));
    root.setProperty('--lyric-scale', String(Math.max(0.8, Math.min(1.4, Number(state.appearance.lyricScale) || 1))));
    document.documentElement.dataset.motion = state.appearance.motion;
    document.documentElement.dataset.theme = state.appearance.theme;
    applyPlayerHeight(state.playerHeight);
  }
  function setAppearance(patch) {
    state.appearance = { ...state.appearance, ...patch };
    applyAppearance();
    persistSettingsSoon();
    if (state.route.view === 'settings') renderMain();
  }

