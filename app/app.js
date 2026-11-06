(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const api = window.musicAPI;
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cssUrl = (u) => `url("${String(u).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\n\r]/g, '')}")`;
  const safeUrl = (u) => /^(https?:|file:|data:image\/)/i.test(String(u || '')) ? String(u) : '';
  const coverUrl = (t) => {
    if (!t) return '';
    if (t.coverUrl) return safeUrl(t.coverUrl);
    let u = safeUrl(t.cover);
    if (u && t.source === 'netease') {
      u = u.replace(/^http:/i, 'https:');
      u += (u.includes('?') ? '&' : '?') + 'param=500y500';
    }
    return u;
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
    return `<div class="art ${extra}"><div class="art-fallback ${img ? 'has-cover' : ''}" style="--a:${pal.a};--b:${pal.b};${img ? `background-image:${esc(cssUrl(img))};` : ''}">${img ? '' : `<span class="art-letter">${esc(initial)}</span>`}${t && t.source === 'netease' ? '<span class="art-badge">CLOUD</span>' : ''}</div></div>`;
  }
  function artistArtHTML(tracks, extra = '') {
    return artHTML(tracks && tracks[0] ? tracks[0] : { title: 'Y' }, extra);
  }

  const ICONS = {
    leaf: '<path d="M20 4c-6.4.4-12.2 3.8-13.3 9.7-.4 2.3.3 4.2 1.6 5.4.7-4.6 3.3-8.4 8.1-10.9-4.4 3-6.9 7.2-7.3 12.1 1.4.6 3.2.6 4.9-.1 5.8-2.4 6-10.6 6-16.2Z"/><path d="M4 21c.8-4.2 2.8-7.6 6-9.9"/>',
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
    cloud: '<path d="M17.5 19H6a4 4 0 0 1-.8-7.92A6 6 0 0 1 17 9.3 5 5 0 0 1 17.5 19Z"/>',
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
    graphite: { name: '石墨', accent: '#606d76', nav: 'rgba(228,233,236,.62)', washA: 'rgba(242,246,248,.85)', washB: 'rgba(204,217,225,.8)', karaoke: '#dfedf5' }
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
    cloudResults: [], cloudQuery: '', cloudLoading: false, cloudError: '', cloudSearched: false,
    scanning: false, modal: null, sectionDraft: null, pendingSectionTrack: null,
    localList: [], playlistName: '', warningDismissed: false,
    lastView: 'local'
  };
  const localMap = new Map();
  const cloudMap = new Map();
  let lyricSeq = 0, playSeq = 0, lastLyricIndex = -2, seekLock = 0, toastTimer = null;
  let scanOff = null, sessionCounted = false;
  let announcementData = null;
  let announcementTicker = 0;
  let announcementHideTimer = 0;

  function syncMaps() {
    localMap.clear();
    state.library.tracks.forEach(t => localMap.set(t.id, t));
    cloudMap.clear();
    state.cloudResults.forEach(t => cloudMap.set(t.id, t));
  }
  function findTrack(id) { return localMap.get(id) || cloudMap.get(id) || (state.current && state.current.id === id ? state.current : null) || state.queue.find(t => t.id === id) || null; }
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
      api.saveSettings({ volume: state.volume, playerHeight: state.playerHeight, appearance: state.appearance }).catch(() => {});
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
    applyPlayerHeight(state.playerHeight);
  }
  function setAppearance(patch) {
    state.appearance = { ...state.appearance, ...patch };
    applyAppearance();
    persistSettingsSoon();
    if (state.route.view === 'settings') renderMain();
  }

  // ---------- library views ----------
  function groupArtists() {
    const map = new Map();
    for (const t of state.library.tracks) {
      const key = t.artist || '未知歌手';
      if (!map.has(key)) map.set(key, { name: key, tracks: [], albums: new Set(), cover: t });
      const a = map.get(key);
      a.tracks.push(t); a.albums.add(t.album || '未知专辑');
    }
    return [...map.values()].sort((a, b) => b.tracks.length - a.tracks.length || a.name.localeCompare(b.name, 'zh-CN'));
  }
  function groupAlbums(tracks = state.library.tracks) {
    const map = new Map();
    for (const t of tracks) {
      const key = `${t.albumArtist || t.artist}|||${t.album || '未知专辑'}`;
      if (!map.has(key)) map.set(key, { name: t.album || '未知专辑', artist: t.albumArtist || t.artist, tracks: [], cover: t, year: t.year });
      map.get(key).tracks.push(t);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  }
  function filteredLocal() {
    let arr = state.library.tracks.slice();
    const q = norm(state.query);
    if (q) arr = arr.filter(t => norm(`${t.title} ${t.artist} ${t.album} ${t.genre}`).includes(q));
    if (state.sort === 'recent') arr.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    else if (state.sort === 'title') arr.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
    else arr.sort((a, b) => a.artist.localeCompare(b.artist, 'zh-CN') || a.album.localeCompare(b.album, 'zh-CN') || (a.trackNo || 0) - (b.trackNo || 0));
    return arr;
  }
  function recentTracks() { return state.recent.map(id => localMap.get(id)).filter(Boolean); }
  function sectionTracks(s) { return (s.trackIds || []).map(id => localMap.get(id)).filter(Boolean); }
  function allSectionsWithFavorites() { return state.sections; }

  function setRoute(route) {
    state.route = route;
    renderChrome();
    renderMain();
    $('#main').scrollTop = 0;
    animatePageEnter();
  }
  function animatePageEnter() {
    if (state.appearance.motion === 'off') return;
    const el = $('#main');
    if (!el || !el.animate) return;
    const duration = state.appearance.motion === 'silky' ? 480 : 260;
    el.animate(
      [{ opacity: .18, transform: 'translateY(9px) scale(.997)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }],
      { duration, easing: 'cubic-bezier(.22,1,.36,1)' }
    );
  }
  function goBack() {
    const map = { artist: 'artists', album: 'albums', folder: 'folders', section: 'sections', favorites: 'sections' };
    setRoute({ view: map[state.route.view] || 'local' });
  }

  const ZONE_COLORS = {
    moss: ['#7da18e', '#426957'], amber: ['#c8a06d', '#7b5733'], ocean: ['#7da3b8', '#43677d'],
    rose: ['#b8868c', '#70464c'], violet: ['#918ab4', '#574f77'], paper: ['#b8b098', '#746c55']
  };
  function sectionPalette(s) { return ZONE_COLORS[s && s.color] || ZONE_COLORS.moss; }
  function favoriteTracks() { return [...state.favorites].map(id => localMap.get(id)).filter(Boolean); }
  function sectionCoverInner(s) {
    const tracks = sectionTracks(s);
    const emoji = s.emoji || '♫';
    if (tracks.length) return `${artHTML(tracks[0])}<span class="playlist-emoji">${esc(emoji)}</span>`;
    const p = sectionPalette(s);
    return `<div class="playlist-blank" style="--z1:${p[0]};--z2:${p[1]}"><span>${esc(emoji)}</span></div>`;
  }
  function sideThumbHTML(track, emoji = '♪') {
    if (track) return `<div class="side-thumb">${artHTML(track)}<span class="side-emoji">${esc(emoji)}</span></div>`;
    return `<div class="side-thumb"><div class="art"><div class="art-fallback" style="--a:#9fb8c9;--b:#5e8298"><span class="art-letter" style="font-size:15px">${esc(emoji)}</span></div></div></div>`;
  }
  function renderSidebarPlaylists() {
    const favs = favoriteTracks();
    const favActive = state.route.view === 'favorites';
    let html = `<button class="side-playlist ${favActive ? 'is-active' : ''}" data-action="open-favorites">
      ${sideThumbHTML(favs[0], '♥')}<span>我喜欢的</span>
    </button>`;
    html += state.sections.map(s => {
      const tracks = sectionTracks(s);
      const active = state.route.view === 'section' && state.route.sectionId === s.id;
      return `<button class="side-playlist ${active ? 'is-active' : ''}" data-action="open-section" data-section-id="${esc(s.id)}">
        ${sideThumbHTML(tracks[0], s.emoji)}<span>${esc(s.title)}</span>
      </button>`;
    }).join('');
    const holder = $('#sidebarPlaylists');
    if (holder) holder.innerHTML = html;
  }
  function renderChrome() {
    const navMap = { artist: 'artists', album: 'albums', section: 'sections', favorites: 'sections', folder: 'folders' };
    const active = navMap[state.route.view] || state.route.view;
    $$('.nav-item').forEach(b => b.classList.toggle('is-active', b.dataset.view === active));
    $$('.side-heading-label').forEach(b => b.classList.toggle('is-active', active === 'sections'));
    $('#backBtn').hidden = !['artist', 'section', 'favorites', 'album', 'folder'].includes(state.route.view);
    $('#globalSearch').placeholder = state.route.view === 'cloud' ? '搜索网易云音乐' : '搜索歌曲';
    $('#localCount').textContent = String(state.library.tracks.length);
    renderSidebarPlaylists();
  }

  function pageHead(title, subtitle, actions = '') {
    return `<div class="page-head"><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div><div class="head-actions">${actions}</div></div>`;
  }
  function collectionHero({ kicker = 'LOCAL LIBRARY', title, meta, cover, actions = '', footer = '' }) {
    return `<section class="collection-hero">
      <div class="collection-cover">${cover}</div>
      <div class="collection-info">
        <div class="collection-kicker"><span class="dot"></span>${esc(kicker)}</div>
        <h1 title="${esc(title)}">${esc(title)}</h1>
        <p>${meta}</p>
        <div class="collection-actions">${actions}</div>
        ${footer ? `<div class="collection-meta">${footer}</div>` : ''}
      </div>
    </section>`;
  }
  function artistCard(a) {
    return `<button class="artist-card" data-action="open-artist" data-artist="${esc(a.name)}">
      <div class="artist-avatar">${artistArtHTML(a.tracks)}</div>
      <h4>${esc(a.name)}</h4><p>${a.tracks.length} 首歌曲 · ${a.albums.size} 张专辑</p>
    </button>`;
  }
  function trackRow(t, i, opts = {}) {
    const cur = sameTrack(state.current, t);
    const fav = isFav(t);
    const sub = typeof opts.sub === 'function' ? opts.sub(t) : esc(t.artist || '未知歌手');
    return `<div class="track-row ${cur ? 'is-current' : ''}" data-track-id="${esc(t.id)}" data-source="${esc(t.source)}" data-index="${i}">
      <div class="track-index">
        <span class="row-num">${cur && state.playing ? '<span class="eq"><i></i><i></i><i></i></span>' : String(i + 1).padStart(2, '0')}</span>
        <div class="row-cover">${artHTML(t)}</div>
        <span class="play-overlay">${icon(cur && state.playing ? 'pause' : 'play')}</span>
      </div>
      <div class="track-main"><div class="track-thumb">${artHTML(t)}</div><div class="track-text">
        <div class="track-title" title="${esc(t.title)}">${esc(t.title)}${t.lyricsSource ? '<span class="lyric-dot" title="已有歌词">词</span>' : ''}</div>
        <div class="track-sub">${sub}</div>
      </div></div>
      <div class="track-album" title="${esc(t.album || '未知专辑')}">${esc(t.album || '未知专辑')}</div>
      <div class="track-duration">${fmtTime(t.duration)}</div>
      <div class="track-actions">
        <button class="row-btn ${fav ? 'is-fav' : ''}" data-action="favorite" data-track-id="${esc(t.id)}" title="${fav ? '取消收藏' : '收藏'}">${icon('star')}</button>
        <button class="row-btn" data-action="add-to-section" data-track-id="${esc(t.id)}" title="添加到歌单">${icon('plus')}</button>
      </div>
    </div>`;
  }
  function trackListHTML(tracks, emptyText = '这里还没有歌曲', opts = {}) {
    state.localList = tracks;
    if (!tracks.length) {
      return `<div class="empty-state"><div class="empty-icon">${icon('note')}</div><h3>${esc(emptyText)}</h3><p>换一个关键词，或者从设置中选择你的本地音乐文件夹。</p></div>`;
    }
    const shown = tracks.slice(0, 500);
    return `<div class="track-table">
      <div class="track-head"><span>#</span><span>标题 &amp; 艺术家</span><span>专辑</span><span class="head-star">${icon('star')}</span><span>时长</span></div>
      ${shown.map((t, i) => trackRow(t, i, opts)).join('')}
    </div>${tracks.length > 500 ? '<p class="list-more">仅显示前 500 首，请用搜索快速定位。</p>' : ''}`;
  }
  function renderOnboarding() {
    return `${pageHead('所有歌曲', '你的本地音乐空间')}
      <div class="empty-state" style="min-height:52vh">
        <div class="empty-icon">${icon('folder')}</div>
        <h3>把你的音乐放进来</h3>
        <p>选择一个包含 MP3、FLAC、WAV、M4A、OGG 等格式的文件夹。<br>程序会自动读取标签、封面，并匹配同名 .lrc 歌词，所有数据只保存在本机。</p>
        <div class="empty-actions"><button class="btn primary" data-action="choose-folder">${icon('folder')} 选择音乐文件夹</button><button class="btn ghost" data-action="scan">${icon('refresh')} 重新读取示例曲库</button></div>
      </div>`;
  }
  function renderHome() {
    if (!state.library.tracks.length) return renderOnboarding();
    const tracks = state.library.tracks;
    state.localList = tracks;
    const albums = groupAlbums().slice(0, 12);
    const artists = groupArtists().slice(0, 10);
    const frequent = tracks.filter(t => (state.plays[t.id] || 0) > 0).sort((a, b) => (state.plays[b.id] || 0) - (state.plays[a.id] || 0)).slice(0, 9);
    const recent = recentTracks().slice(0, 9);
    const recentPool = frequent;
    const favorite = favoriteTracks();
    const playlists = [
      { title: '我喜欢的', tracks: favorite, emoji: '♥', action: 'open-favorites' },
      ...state.sections.map(s => ({ title: s.title, tracks: sectionTracks(s), emoji: s.emoji, action: 'open-section', id: s.id }))
    ];
    const songCols = (list) => {
      if (!list.length) return `<div class="empty-mini">还没有播放记录</div>`;
      const cols = [];
      for (let i = 0; i < list.length; i += 3) cols.push(list.slice(i, i + 3));
      return `<div class="home-song-cols">${cols.map(col => `<div class="home-song-col">${col.map(t => `<button class="home-song" data-track-id="${esc(t.id)}"><div class="track-thumb">${artHTML(t)}</div><div class="home-song-copy"><b>${esc(t.title)}</b><span>${esc(t.artist)} - ${esc(t.album || '未知专辑')}</span></div></button>`).join('')}</div>`).join('')}</div>`;
    };
    return `<div class="home-intro"><h1>首页</h1><p>${tracks.length} 首本地歌曲 · ${groupArtists().length} 位艺术家 · ${groupAlbums().length} 张专辑</p><div class="collection-actions"><button class="btn" data-action="play-all">${icon('play')} 播放全部</button><button class="btn ghost" data-action="shuffle-all">${icon('shuffle')} 随机播放</button></div></div>
      <div class="home-row-head"><button data-view="albums">专辑 <span class="arrow">${icon('chevronRight')}</span></button></div>
      <div class="home-strip">${albums.map(a => `<button class="album-card" data-action="open-album" data-album="${esc(a.name)}" data-album-artist="${esc(a.artist)}"><div class="album-art">${artHTML(a.cover)}</div><h4>${esc(a.name)}</h4><p>${esc(a.artist)}</p></button>`).join('')}</div>
      <div class="home-row-head"><button data-view="ranking">听歌排行 <span class="arrow">${icon('chevronRight')}</span></button></div>
      ${songCols(recentPool)}
      <div class="home-row-head"><button data-view="recent">最近播放 <span class="arrow">${icon('chevronRight')}</span></button></div>
      ${songCols(recent)}
      <div class="home-row-head"><button data-view="sections">歌单 <span class="arrow">${icon('chevronRight')}</span></button></div>
      <div class="home-playlist-row">${playlists.map(p => playlistCard({ title: p.title, subtitle: `${p.tracks.length} 首歌曲`, tracks: p.tracks, emoji: p.emoji, action: p.action, id: p.id })).join('')}<button class="playlist-add" style="flex:0 0 150px;min-height:150px" data-action="create-section"><span class="plus-ring">${icon('plus')}</span><span>新建歌单</span></button></div>
      <div class="home-row-head"><button data-view="artists">艺术家 <span class="arrow">${icon('chevronRight')}</span></button></div>
      <div class="home-strip">${artists.map(artistCard).join('')}</div>`;
  }
  function renderLibrary() {
    if (!state.library.tracks.length) return renderOnboarding();
    const tracks = filteredLocal();
    state.localList = tracks;
    const all = state.library.tracks;
    const coverTrack = (state.current && state.current.source === 'local') ? state.current : (tracks[0] || all[0]);
    const artistCount = groupArtists().length;
    const actions = `<button class="btn primary" data-action="play-all">${icon('play')} 播放全部</button><button class="btn" data-action="shuffle-all">${icon('shuffle')} 随机播放</button>${state.query ? `<button class="btn ghost" data-action="clear-search">${icon('close')} 清除搜索</button>` : ''}`;
    const title = state.query ? '搜索结果' : '所有歌曲';
    const meta = state.query
      ? `“${esc(state.query)}” · 找到 ${tracks.length} 首歌曲`
      : `本地音乐库 · ${all.length} 首歌曲 · ${artistCount} 位艺术家`;
    return `${collectionHero({ title, meta, cover: artHTML(coverTrack), actions, kicker: state.query ? 'SEARCH RESULT' : 'LOCAL LIBRARY', footer: `LOCAL <span class="dot"></span> ${groupAlbums(all).length} 张专辑 <span class="dot"></span> ${all.filter(t => t.lyricsSource).length} 首带歌词` })}
      <div class="section-head"><div><h2>${state.query ? '匹配的歌曲' : '全部曲目'}</h2><p>${state.query ? `${tracks.length} 个结果` : '自动按歌手与专辑排序'}</p></div><div class="seg"><button data-action="sort" data-sort="artist" class="${state.sort === 'artist' ? 'is-active' : ''}">歌手</button><button data-action="sort" data-sort="recent" class="${state.sort === 'recent' ? 'is-active' : ''}">最近</button><button data-action="sort" data-sort="title" class="${state.sort === 'title' ? 'is-active' : ''}">曲名</button></div></div>
      ${trackListHTML(tracks, state.query ? '没有匹配的歌曲' : '曲库还是空的')}`;
  }
  function renderArtists() {
    const artists = groupArtists();
    return `${pageHead('艺术家', `${artists.length} 位艺术家 · 根据本地标签自动归类`, `<button class="btn small ghost" data-action="scan">${icon('refresh')} 更新归类</button>`)}
      ${artists.length ? `<div class="artist-grid">${artists.map(artistCard).join('')}</div>` : `<div class="empty-state"><div class="empty-icon">${icon('artist')}</div><h3>还没有可归类的艺术家</h3><p>导入本地音乐后，艺术家会自动出现在这里。</p><div class="empty-actions"><button class="btn primary" data-action="choose-folder">${icon('folder')} 选择文件夹</button></div></div>`}`;
  }
  function renderArtist() {
    const name = state.route.artist;
    const a = groupArtists().find(x => x.name === name);
    if (!a) return `<div class="empty-state"><h3>没有找到这位艺术家</h3><div class="empty-actions"><button class="btn primary" data-action="go-artists">返回艺术家</button></div></div>`;
    state.localList = a.tracks;
    return `${collectionHero({
      kicker: 'ARTIST', title: a.name, cover: artistArtHTML(a.tracks),
      meta: `${a.tracks.length} 首歌曲 · ${a.albums.size} 张专辑`,
      actions: `<button class="btn primary" data-action="play-all">${icon('play')} 播放全部</button><button class="btn" data-action="shuffle-all">${icon('shuffle')} 随机播放</button><button class="btn ghost" data-action="favorite-artist" data-artist="${esc(a.name)}">${icon('star')} 收藏全部</button>`,
      footer: `LOCAL <span class="dot"></span> ${a.tracks.filter(t => t.lyricsSource).length} 首带歌词`
    })}
    <div class="section-head"><div><h2>歌曲</h2><p>按专辑与音轨顺序</p></div></div>
    ${trackListHTML(a.tracks)}`;
  }
  function renderAlbums() {
    const albums = groupAlbums();
    return `${pageHead('专辑', `${albums.length} 张专辑 · 来自本地曲库`)}
      ${albums.length ? `<div class="album-grid">${albums.map(a => `<button class="album-card" data-action="open-album" data-album="${esc(a.name)}" data-album-artist="${esc(a.artist)}"><div class="album-art">${artHTML(a.cover)}</div><h4>${esc(a.name)}</h4><p>${esc(a.artist)} · ${a.tracks.length} 首</p></button>`).join('')}</div>` : `<div class="empty-state"><div class="empty-icon">${icon('album')}</div><h3>还没有专辑</h3><p>导入音乐后，专辑会自动按标签聚合。</p><div class="empty-actions"><button class="btn primary" data-action="choose-folder">${icon('folder')} 选择文件夹</button></div></div>`}`;
  }
  function renderAlbum() {
    const name = state.route.album, artist = state.route.albumArtist;
    const tracks = state.library.tracks.filter(t => (t.album || '未知专辑') === name && (t.albumArtist || t.artist) === artist);
    if (!tracks.length) return `<div class="empty-state"><h3>没有找到这张专辑</h3><div class="empty-actions"><button class="btn primary" data-action="go-albums">返回专辑</button></div></div>`;
    state.localList = tracks;
    return `${collectionHero({
      kicker: 'ALBUM', title: name, cover: artHTML(tracks[0]),
      meta: `${esc(artist)} · ${tracks.length} 首歌曲${tracks[0].year ? ` · ${tracks[0].year}` : ''}`,
      actions: `<button class="btn primary" data-action="play-all">${icon('play')} 播放专辑</button><button class="btn" data-action="shuffle-all">${icon('shuffle')} 随机播放</button>`
    })}
    <div class="section-head"><div><h2>曲目</h2><p>${tracks.length} 首</p></div></div>
    ${trackListHTML(tracks)}`;
  }
  function folderGroups(tracks = state.library.tracks) {
    const map = new Map();
    for (const t of tracks) {
      const parts = String(t.relPath || '').split(/[\\/]/).filter(Boolean);
      const folder = parts.length > 1 ? parts.slice(0, -1).join(' / ') : '音乐库根目录';
      if (!map.has(folder)) map.set(folder, []);
      map.get(folder).push(t);
    }
    return [...map.entries()].map(([name, list]) => ({ name, tracks: list, display: name.split(' / ').pop(), cover: list[0] })).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  }
  function renderFolders() {
    const folders = folderGroups();
    return `${pageHead('文件夹', `${folders.length} 个文件夹 · 按本地目录整理`)}
      ${folders.length ? `<div class="folder-list">${folders.map(f => `<button class="folder-row" data-action="open-folder" data-folder="${esc(f.name)}"><span class="folder-icon">${icon('folder')}</span><div class="folder-copy"><b>${esc(f.display)}</b><span>${esc(f.name)}</span></div><span class="folder-count">${f.tracks.length} 首</span><span class="folder-chevron">${icon('chevronRight')}</span></button>`).join('')}</div>` : `<div class="empty-state"><div class="empty-icon">${icon('folder')}</div><h3>还没有可浏览的文件夹</h3><p>选择本地音乐文件夹后会自动生成目录视图。</p><div class="empty-actions"><button class="btn primary" data-action="choose-folder">${icon('folder')} 选择文件夹</button></div></div>`}`;
  }
  function renderFolder() {
    const folder = state.route.folder;
    const tracks = state.library.tracks.filter(t => {
      const parts = String(t.relPath || '').split(/[\\/]/).filter(Boolean);
      const f = parts.length > 1 ? parts.slice(0, -1).join(' / ') : '音乐库根目录';
      return f === folder;
    });
    if (!tracks.length) return `<div class="empty-state"><h3>文件夹为空</h3><div class="empty-actions"><button class="btn primary" data-action="go-folders">返回文件夹</button></div></div>`;
    state.localList = tracks;
    const pal = paletteFor({ title: folder, artist: '' });
    const cover = `<div class="folder-hero-icon"><div class="art-fallback" style="--a:${pal.a};--b:${pal.b}"><span class="folder-symbol">${icon('folder')}</span></div></div>`;
    return `${collectionHero({
      kicker: 'FOLDER', title: folder.split(' / ').pop(), cover,
      meta: `${tracks.length} 首歌曲 · ${esc(folder)}`,
      actions: `<button class="btn primary" data-action="play-all">${icon('play')} 播放文件夹</button><button class="btn" data-action="shuffle-all">${icon('shuffle')} 随机播放</button>`
    })}
    <div class="section-head"><div><h2>曲目</h2><p>${tracks.length} 首</p></div></div>
    ${trackListHTML(tracks)}`;
  }
  function renderRecent() {
    const tracks = recentTracks();
    state.localList = tracks;
    return `${pageHead('最近播放', tracks.length ? `最近聆听的 ${tracks.length} 首歌曲` : '还没有播放记录')}
      ${tracks.length ? trackListHTML(tracks) : `<div class="empty-state"><div class="empty-icon">${icon('clock')}</div><h3>还没有播放记录</h3><p>播放一首歌，它就会出现在这里。</p><div class="empty-actions"><button class="btn primary" data-action="play-all">${icon('play')} 随机听一首</button></div></div>`}`;
  }
  function renderRanking() {
    const tracks = state.library.tracks.slice().filter(t => (state.plays[t.id] || 0) > 0).sort((a, b) => (state.plays[b.id] || 0) - (state.plays[a.id] || 0)).slice(0, 100);
    state.localList = tracks;
    return `${pageHead('听歌排行', '由本机播放次数统计，只保存在本地')}
      ${tracks.length ? trackListHTML(tracks, '还没有排行', { sub: t => `${esc(t.artist)} · 播放 ${state.plays[t.id] || 0} 次` }) : `<div class="empty-state"><div class="empty-icon">${icon('bars')}</div><h3>排行榜还是空的</h3><p>多听几首歌，这里会记录你的聆听偏好。</p><div class="empty-actions"><button class="btn primary" data-action="play-all">${icon('play')} 开始播放</button></div></div>`}`;
  }
  function playlistCard({ title, subtitle, tracks, emoji, action, id }) {
    const p = sectionPalette({ color: id === 'favorites' ? 'rose' : 'moss' });
    const cover = tracks.length ? `${artHTML(tracks[0])}<span class="playlist-emoji">${esc(emoji)}</span>` : `<div class="playlist-blank" style="--z1:${p[0]};--z2:${p[1]}"><span>${esc(emoji)}</span></div>`;
    return `<button class="playlist-card" data-action="${action}" ${id ? `data-section-id="${esc(id)}"` : ''}>
      <div class="playlist-cover">${cover}</div>
      <h4>${esc(title)}</h4><p>${esc(subtitle)}</p>
    </button>`;
  }
  function renderPlaylists() {
    const favs = favoriteTracks();
    return `${pageHead('歌单', `${state.sections.length + 1} 个本地歌单 · 可随时编辑`, `<button class="btn primary small" data-action="create-section">${icon('plus')} 新建歌单</button>`)}
      <div class="playlist-grid">
        ${playlistCard({ title: '我喜欢的', subtitle: `${favs.length} 首歌曲`, tracks: favs, emoji: '♥', action: 'open-favorites' })}
        ${state.sections.map(s => playlistCard({ title: s.title, subtitle: `${sectionTracks(s).length} 首歌曲 · ${s.subtitle || '本地歌单'}`, tracks: sectionTracks(s), emoji: s.emoji, action: 'open-section', id: s.id })).join('')}
        <button class="playlist-add" data-action="create-section"><span class="plus-ring">${icon('plus')}</span><span>新建一个专属歌单</span></button>
      </div>`;
  }
  function renderSection() {
    const s = state.sections.find(x => x.id === state.route.sectionId);
    if (!s) return `<div class="empty-state"><h3>歌单不存在</h3><div class="empty-actions"><button class="btn primary" data-action="go-sections">返回歌单</button></div></div>`;
    const tracks = sectionTracks(s);
    state.localList = tracks;
    const cover = `<div class="playlist-cover">${sectionCoverInner(s)}</div>`;
    return `${collectionHero({
      kicker: 'PLAYLIST', title: s.title, cover,
      meta: `${esc(s.subtitle || '你的本地歌单')} · ${tracks.length} 首歌曲`,
      actions: `<button class="btn primary" data-action="play-all">${icon('play')} 播放歌单</button><button class="btn" data-action="shuffle-all">${icon('shuffle')} 随机播放</button><button class="btn ghost" data-action="edit-section" data-section-id="${esc(s.id)}">${icon('edit')} 编辑</button><button class="btn ghost" data-action="add-to-section" data-section-id="${esc(s.id)}">${icon('plus')} 添加歌曲</button><button class="btn ghost danger-ghost" data-action="delete-section" data-section-id="${esc(s.id)}">${icon('trash')} 删除</button>`,
      footer: `${tracks.length} TRACKS <span class="dot"></span> 最近编辑 ${fmtDate(s.updatedAt)}`
    })}
    ${trackListHTML(tracks, '这个歌单还没有歌曲')}`;
  }
  function renderFavorites() {
    const tracks = favoriteTracks();
    state.localList = tracks;
    return `${collectionHero({
      kicker: 'FAVORITES', title: '我喜欢的', cover: tracks.length ? artHTML(tracks[0]) : `<div class="playlist-blank" style="--z1:#b8868c;--z2:#70464c"><span>♥</span></div>`,
      meta: `${tracks.length} 首歌曲 · 收藏保存在本机`,
      actions: `<button class="btn primary" data-action="play-all">${icon('play')} 播放全部</button><button class="btn" data-action="shuffle-all">${icon('shuffle')} 随机播放</button>`,
      footer: 'LOCAL FAVORITES'
    })}
    ${trackListHTML(tracks, '还没有收藏歌曲')}`;
  }
  function cloudRowHTML(t, i) {
    return `<div class="cloud-row" data-cloud-id="${esc(t.id)}">
      <span class="cloud-index">${String(i + 1).padStart(2, '0')}</span>
      <div class="cloud-thumb">${artHTML(t)}</div>
      <div><div class="cloud-title">${esc(t.title)}</div><div class="cloud-artist">${esc(t.artist)}</div></div>
      <div class="cloud-album">${esc(t.album)}</div>
      <div class="cloud-time">${fmtTime(t.duration)}</div>
      <button class="cloud-play" data-action="play-cloud" data-track-id="${esc(t.id)}" title="播放">${icon('play')}</button>
    </div>`;
  }
  function renderCloud() {
    const songs = state.cloudResults;
    return `<div class="cloud-intro">
        <div class="cloud-kicker"><span class="dot"></span>NETEASE CLOUD MUSIC</div>
        <h2>偶尔，也去云端听听</h2>
        <p>搜索网易云公开曲库。在线播放受版权与会员状态限制，本地曲库始终优先，并且不受网络影响。</p>
        <form class="cloud-search" id="cloudSearchForm"><label class="top-search">${icon('search')}<input id="cloudSearchInput" type="search" value="${esc(state.cloudQuery)}" placeholder="搜索歌曲、艺术家或专辑" autocomplete="off"></label><button class="btn primary" type="submit">${state.cloudLoading ? '搜索中…' : '搜索'}</button></form>
        <div class="cloud-suggest">${['周杰伦', '钢琴纯音乐', '坂本龙一', '林俊杰', '雨声', 'Canon in D'].map(q => `<button type="button" data-action="cloud-suggest" data-query="${esc(q)}">${esc(q)}</button>`).join('')}</div>
        <div class="cloud-note">${icon('info')} 公开接口结果；在线歌曲不会写入本地曲库。</div>
      </div>
      ${state.cloudLoading ? `<div class="view-loading"><span></span><span></span><span></span></div>` : state.cloudError ? `<div class="empty-state" style="min-height:210px"><div class="empty-icon">${icon('cloud')}</div><h3>云端暂时没有回应</h3><p>${esc(state.cloudError)}<br>本地音乐不受影响，可以稍后再试。</p></div>` : songs.length ? `<div class="section-head"><div><h2>搜索结果</h2><p>${songs.length} 首 · 点击播放</p></div><span class="pill"><span class="dot"></span> 在线资源</span></div><div class="cloud-results">${songs.map(cloudRowHTML).join('')}</div>` : state.cloudSearched ? `<div class="empty-state" style="min-height:210px"><div class="empty-icon">${icon('search')}</div><h3>没有找到匹配的歌曲</h3><p>换一个关键词，或者回到本地曲库。</p></div>` : ''}`;
  }
  function renderSettings() {
    const a = state.appearance;
    return `${pageHead('设置', '本地音乐、数据与播放偏好')}
      <div class="settings-grid">
        <div class="setting-card appearance-card">
          <h3>${icon('sparkles')} 外观与动效 <span class="pill">全局</span></h3>
          <p>主题色、动效、封面氛围和播放器尺寸会实时写入 data/settings.json，复制程序文件夹到其他电脑后仍然生效。</p>
          <div class="appearance-grid">
            <div class="appearance-block"><label>主题色</label><div class="theme-swatches">${Object.entries(THEMES).map(([key, t]) => `<button class="theme-swatch ${a.theme === key ? 'is-active' : ''}" data-action="set-theme" data-theme="${key}" title="${t.name}" style="--c:${t.accent}"><span></span><small>${t.name}</small></button>`).join('')}</div></div>
            <div class="appearance-block"><label>动效</label><div class="seg motion-seg">${MOTION_OPTIONS.map(([key, label]) => `<button data-action="set-motion" data-motion="${key}" class="${a.motion === key ? 'is-active' : ''}">${label}</button>`).join('')}</div></div>
            <div class="appearance-block"><label>封面氛围</label><div class="setting-range"><input type="range" id="bgRange" min="50" max="100" step="1" value="${Math.round(a.bgOpacity * 100)}"><b id="bgValue">${Math.round(a.bgOpacity * 100)}%</b></div></div>
            <div class="appearance-block"><label>播放器高度</label><div class="setting-range"><input type="range" id="playerHeightRange" min="76" max="150" step="1" value="${state.playerHeight}"><b id="playerHeightValue">${state.playerHeight}px</b></div></div>
            <div class="appearance-block"><label>歌词字号</label><div class="setting-range"><input type="range" id="lyricScaleRange" min="80" max="140" step="1" value="${Math.round((a.lyricScale || 1) * 100)}"><b id="lyricScaleValue">${Math.round((a.lyricScale || 1) * 100)}%</b></div></div>
          </div>
        </div>
        <div class="setting-card"><h3>${icon('folder')} 本地音乐库</h3><p>扫描文件夹中的音频与同名 .lrc 歌词，不会复制或修改你的音乐文件。</p><div class="path-box">${esc(state.library.root || '尚未选择文件夹')}</div><div class="setting-actions"><button class="btn primary small" data-action="choose-folder">${icon('folder')} 选择文件夹</button><button class="btn small ghost" data-action="scan">${icon('refresh')} 重新扫描</button><button class="btn small ghost" data-action="reveal-library">${icon('link')} 打开目录</button></div>
          <div class="setting-row" style="margin-top:16px"><div><div class="label">自动歌词匹配</div><div class="desc">同目录 LRC 优先，其次读取内嵌歌词</div></div><span class="pill">已启用</span></div>
          <div class="setting-row"><div><div class="label">当前曲库</div><div class="desc">${state.library.tracks.length} 首歌曲 · 最后扫描 ${state.library.scannedAt ? fmtDate(state.library.scannedAt) : '未扫描'}</div></div><span class="pill">${state.library.tracks.filter(t => t.lyricsSource).length} 首歌词</span></div>
        </div>
        <div class="setting-card"><h3>${icon('shield')} 本地数据</h3><p>曲库索引、歌单、收藏和播放记录都保存在程序目录的 data 文件夹，不经过服务器。</p><div class="local-data-note">${icon('info')}<div>同一台电脑上复制整个程序文件夹即可继续使用；移动自己的音乐目录后，重新选择文件夹并扫描即可。</div></div><div class="setting-actions"><button class="btn small ghost" data-action="open-data">${icon('folder')} 打开数据目录</button><button class="btn small ghost" data-action="fullscreen">${icon('fullscreen')} 全屏模式</button></div>
          <div class="setting-row" style="margin-top:16px"><div><div class="label">播放数据</div><div class="desc">队列、收藏与播放进度</div></div><span class="pill">本机</span></div>
          <div class="setting-row"><div><div class="label">界面</div><div class="desc">触屏大按钮 · 磨砂玻璃 · 自适应布局</div></div><span class="pill">TOUCH</span></div>
          <div class="setting-row"><div><div class="label">本地公告</div><div class="desc">data/announcement.md · 修改后重启播放器显示</div></div><div style="display:flex;gap:10px;align-items:center"><button class="text-btn" data-action="view-announcement">查看</button><button class="text-btn" data-action="open-data">打开目录</button></div></div>
        </div>
        <div class="setting-card"><h3>${icon('lyrics')} 歌词使用说明</h3><p>把歌词文件放在歌曲同一文件夹，并与歌曲同名即可自动匹配。播放页也可以手动导入 LRC。</p><div class="about-list"><div><b>示例：</b>晚风.mp3 + 晚风.lrc</div><div><b>也支持：</b>内嵌 USLT / LYRICS 标签</div><div><b>导入的歌词：</b>保存在 data/lyrics，会优先于自动匹配。</div></div><div class="setting-actions"><button class="btn small ghost" data-action="immersive">${icon('lyrics')} 打开全屏歌词</button></div></div>
        <div class="setting-card"><h3>${icon('info')} 关于 Y_Music</h3><div class="about-mark"><div class="brand-mark">${icon('leaf')}</div><div><h3>Y_Music</h3><p>LOCAL MUSIC SPACE · v${esc(state.version)}</p></div></div><div class="about-list"><div>面向触摸白板与横屏展示的本地音乐空间，视觉与曲库结构参考 Sylvakru 的浅色磨砂风格。</div><div><b>本地优先</b> · 自动歌词 · 艺术家归类 · 可编辑歌单 · 网易云搜索</div></div><div class="about-copyright">© 2026 夜静（YeJing-Neko）. All rights reserved.<br><a href="https://github.com/YeJing-Neko" target="_blank" rel="noreferrer">github.com/YeJing-Neko</a></div><div class="setting-actions"><button class="btn small ghost" data-action="open-data">${icon('folder')} data 目录</button><button class="btn small ghost" data-action="fullscreen">${icon('fullscreen')} 全屏</button></div></div>
      </div>`;
  }
  function missingWarningHTML() {
    const missing = state.library.missing || 0;
    if (!missing || state.warningDismissed) return '';
    return `<div class="library-warning">${icon('info')}<div><b>检测到 ${missing} 首歌曲文件缺失</b>，音乐目录可能被移动或文件已被清理。重新扫描或选择新的音乐文件夹即可更新索引。</div><button class="btn small ghost" data-action="scan">${icon('refresh')} 重新扫描</button><button class="btn small ghost" data-action="choose-folder">${icon('folder')} 选择文件夹</button><button class="close-warning" data-action="dismiss-warning" aria-label="关闭提示">${icon('close')}</button></div>`;
  }
  function renderMain() {
    const scrollTop = $('#main').scrollTop;
    const map = {
      home: renderHome, local: renderLibrary, artists: renderArtists, artist: renderArtist, albums: renderAlbums, album: renderAlbum,
      folders: renderFolders, folder: renderFolder, recent: renderRecent, ranking: renderRanking,
      sections: renderPlaylists, section: renderSection, favorites: renderFavorites, cloud: renderCloud, settings: renderSettings
    };
    $('#main').innerHTML = missingWarningHTML() + (map[state.route.view] || renderLibrary)();
    $('#main').scrollTop = scrollTop;
  }

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
    $('#immSource').textContent = t ? (t.source === 'netease' ? 'NETEASE CLOUD' : 'LOCAL LIBRARY') : 'LOCAL LIBRARY';
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
      container.innerHTML = `<div class="lyric-empty large">${icon('lyrics')}<p>${t.source === 'local' ? '没有找到同名 LRC 或内嵌歌词' : '这首歌暂时没有可用歌词'}<br><span style="font-size:11px;opacity:.65">${t.source === 'local' ? '可以在左下角手动导入 LRC' : '在线歌词受版权限制'}</span></p></div>`;
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
      else res = await api.neteaseLyrics(track.nmId);
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

  // ---------- playback ----------
  async function resolvePlayable(track) {
    if (track.source !== 'netease') return track;
    if (track.playUrl && track.resolvedAt && Date.now() - track.resolvedAt < 10 * 60 * 1000) return track;
    const r = await api.neteaseResolve(track.nmId);
    if (!r || !r.url) throw new Error((r && r.reason) || '该歌曲暂时无法在线播放');
    return { ...track, playUrl: r.url, resolvedAt: Date.now(), br: r.br };
  }
  async function loadTrack(track, autoplay = true, quiet = false) {
    if (!track) return;
    const seq = ++playSeq;
    audio.pause();
    sessionCounted = false;
    state.current = track;
    state.playing = false;
    if (track.source === 'netease') { audio.removeAttribute('src'); try { audio.load(); } catch {} }
    state.lyrics = null; state.lyricSource = ''; state.lyricLoading = true;
    lastLyricIndex = -2;
    renderNow(); renderLyricsView();
    let playable = track;
    if (track.source === 'netease') {
      if (!quiet) showToast('正在获取云端播放地址…');
      try { playable = await resolvePlayable(track); }
      catch (e) {
        if (seq !== playSeq) return;
        state.playing = false;
        renderTransport(); renderNow();
        showToast(e.message || '在线播放失败', true);
        return;
      }
      if (seq !== playSeq) return;
      const idx = state.queue.findIndex(t => sameTrack(t, track));
      if (idx >= 0) state.queue[idx] = { ...playable };
      state.current = playable;
    }
    if (seq !== playSeq) return;
    audio.src = playable.playUrl || playable.url;
    try { audio.load(); } catch {}
    state.current = playable;
    state.playing = autoplay;
    renderNow(); renderLyricsView();
    if (autoplay) {
      try { await audio.play(); } catch (e) {
        state.playing = false; renderTransport();
        if (!quiet) showToast('浏览器阻止了自动播放，请按播放键', true);
      }
    }
    if (playable.source === 'local') {
      state.recent = [playable.id, ...state.recent.filter(id => id !== playable.id)].slice(0, 40);
      persistPlayer();
    }
    if (state.queue[state.qi] == null || !sameTrack(state.queue[state.qi], playable)) {
      const idx = state.queue.findIndex(t => sameTrack(t, playable));
      if (idx >= 0) state.qi = idx;
    }
    loadLyrics(playable);
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
    if (t.source !== 'local') { showToast('在线歌曲暂不支持收藏到本地', true); return; }
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

  // ---------- sections editor ----------
  function openModal(html, cls = '') {
    $('#modalCard').className = 'modal-card ' + cls;
    $('#modalCard').innerHTML = html;
    $('#modalLayer').hidden = false;
    state.modal = true;
  }
  function closeModal() { $('#modalLayer').hidden = true; state.modal = null; state.sectionDraft = null; state.pendingSectionTrack = null; $('#modalCard').innerHTML = ''; }
  function openSectionEditor(section = null, preferredTrackIds = []) {
    const editing = !!section;
    const base = section || { id: crypto.randomUUID().replace(/-/g, '').slice(0, 16), title: '', subtitle: '', emoji: '🎧', color: 'moss', trackIds: [] };
    const selected = new Set([...(base.trackIds || []), ...(preferredTrackIds || [])].filter(id => localMap.has(id)));
    const emojis = ['🎧', '🌙', '☀️', '🌿', '🌊', '☕', '🪐', '📖', '🕯️', '🍃', '🌾', '✨'];
    const colors = [['moss', '#3d5c49'], ['amber', '#8a653c'], ['ocean', '#355e6b'], ['rose', '#74484f'], ['violet', '#544d79'], ['paper', '#5d5947']];
    openModal(`<div class="modal-head"><div><p class="eyebrow">LOCAL PLAYLIST · PRIVATE</p><h2>${editing ? '编辑歌单' : '新建歌单'}</h2><p>把这些歌留在这一块白板上，数据和排序全部保存在本机。</p></div><button class="round-btn" data-action="close-modal">${icon('close')}</button></div>
      <div class="modal-body">
        <form id="sectionForm">
          <div class="form-grid">
            <div class="field"><label>歌单名称</label><input type="text" id="sectionTitle" maxlength="30" value="${esc(base.title)}" placeholder="例如：深夜专注" required></div>
            <div class="field"><label>一句说明</label><input type="text" id="sectionSubtitle" maxlength="80" value="${esc(base.subtitle)}" placeholder="例如：关掉喧闹，留一盏小灯"></div>
            <div class="field full"><label>图标</label><div class="emoji-picker" id="emojiPicker">${emojis.map(e => `<button type="button" data-emoji="${e}" class="${e === base.emoji ? 'is-active' : ''}">${e}</button>`).join('')}</div></div>
            <div class="field full"><label>色彩</label><div class="color-picker" id="colorPicker">${colors.map(([k, c]) => `<button type="button" data-color="${k}" style="--c:${c}" class="${k === base.color ? 'is-active' : ''}" aria-label="${k}"></button>`).join('')}</div></div>
          </div>
          <div class="track-picker"><div class="picker-head"><div><h3>选择歌曲 <span id="pickCount">${selected.size}</span></h3><span>可多选，稍后也能继续添加</span></div><label class="inline-search picker-search">${icon('search')}<input id="pickerSearch" type="search" placeholder="搜索歌曲或歌手"></label></div>
          <div class="pick-list" id="pickList">${state.library.tracks.map(t => `<div class="pick-row ${selected.has(t.id) ? 'is-picked' : ''}" data-pick-id="${esc(t.id)}"><span class="checkbox">${selected.has(t.id) ? icon('check') : ''}</span><div class="pick-cover">${artHTML(t)}</div><div class="pick-info"><b>${esc(t.title)}</b><span>${esc(t.artist)} · ${esc(t.album)}</span></div></div>`).join('') || `<div class="lyric-empty" style="min-height:80px">曲库还没有歌曲，先去导入本地音乐吧。</div>`}</div></div>
        </form>
      </div>
      <div class="modal-foot"><div class="left">${editing ? `<button class="btn small danger" data-action="delete-section" data-section-id="${esc(base.id)}">${icon('trash')} 删除歌单</button>` : ''}</div><button class="btn ghost" data-action="close-modal">取消</button><button class="btn primary" data-action="save-section" data-editing="${editing ? '1' : ''}" data-id="${esc(base.id)}">${icon('check')} 保存歌单</button></div>`, 'section-editor');
    // editor state is read from DOM on save
    const emojiWrap = $('#emojiPicker');
    emojiWrap?.addEventListener('click', e => {
      const btn = e.target.closest('[data-emoji]'); if (!btn) return;
      $$('#emojiPicker button').forEach(b => b.classList.remove('is-active')); btn.classList.add('is-active');
    });
    const colorWrap = $('#colorPicker');
    colorWrap?.addEventListener('click', e => {
      const btn = e.target.closest('[data-color]'); if (!btn) return;
      $$('#colorPicker button').forEach(b => b.classList.remove('is-active')); btn.classList.add('is-active');
    });
    const list = $('#pickList');
    list?.addEventListener('click', e => {
      const row = e.target.closest('[data-pick-id]'); if (!row) return;
      const on = row.classList.toggle('is-picked');
      row.querySelector('.checkbox').innerHTML = on ? icon('check') : '';
      $('#pickCount').textContent = $$('#pickList .is-picked').length;
    });
    $('#pickerSearch')?.addEventListener('input', e => {
      const q = norm(e.target.value);
      $$('#pickList .pick-row').forEach(row => { row.style.display = !q || norm(row.textContent).includes(q) ? '' : 'none'; });
    });
  }
  async function saveSection(id, editing) {
    const title = $('#sectionTitle')?.value.trim();
    if (!title) { $('#sectionTitle')?.focus(); showToast('给歌单取一个名字吧', true); return; }
    const subtitle = $('#sectionSubtitle')?.value.trim() || '';
    const emoji = $('#emojiPicker .is-active')?.dataset.emoji || '🎧';
    const color = $('#colorPicker .is-active')?.dataset.color || 'moss';
    const trackIds = $$('#pickList .is-picked').map(el => el.dataset.pickId);
    const sections = state.sections.slice();
    const existing = sections.find(s => s.id === id);
    if (existing) Object.assign(existing, { title, subtitle, emoji, color, trackIds, updatedAt: Date.now() });
    else sections.push({ id, title, subtitle, emoji, color, trackIds, createdAt: Date.now(), updatedAt: Date.now() });
    try {
      const res = await api.saveSections(sections);
      state.sections = res.sections || sections;
      closeModal();
      showToast(editing ? '歌单已更新' : '歌单已创建');
      renderChrome();
      if (state.route.view === 'section' && state.route.sectionId === id) renderMain();
      else if (state.route.view === 'sections' || state.route.view === 'home') renderMain();
    } catch (e) { showToast('保存失败：' + (e.message || '未知错误'), true); }
  }
  async function deleteSection(id) {
    if (state.modal) closeModal();
    openConfirm('删除这个歌单？', '只会删除歌单和歌曲引用，不会删除任何本地音乐文件。', async () => {
      try {
        const list = state.sections.filter(s => s.id !== id);
        const res = await api.saveSections(list);
        state.sections = res.sections || list;
        closeModal();
        showToast('歌单已删除');
        if (state.route.view === 'section' && state.route.sectionId === id) setRoute({ view: 'sections' }); else { renderChrome(); renderMain(); }
      } catch (e) { showToast('删除失败', true); }
    });
  }
  function openTrackToSection(track) {
    const local = requireLocalTrack(track);
    if (!local) { showToast('只有本地歌曲可以加入歌单', true); return; }
    state.pendingSectionTrack = local.id;
    const exists = state.sections.find(s => (s.trackIds || []).includes(local.id));
    openModal(`<div class="modal-head"><div><p class="eyebrow">ADD TO PLAYLIST</p><h2>添加到歌单</h2><p>${esc(local.title)} · ${esc(local.artist)}</p></div><button class="round-btn" data-action="close-modal">${icon('close')}</button></div>
      <div class="modal-body"><div class="modal-section-picks">${state.sections.map(s => `<button class="section-pick" data-action="pick-section" data-section-id="${esc(s.id)}" data-track-id="${esc(local.id)}"><span class="zone-emoji">${esc(s.emoji)}</span><div style="flex:1"><b>${esc(s.title)}</b><span>${(s.trackIds || []).length} 首歌曲${exists && exists.id === s.id ? ' · 已包含' : ''}</span></div>${exists && exists.id === s.id ? icon('check') : icon('chevronRight')}</button>`).join('') || `<div class="lyric-empty" style="min-height:100px">还没有歌单，先新建一个吧。</div>`}</div></div>
      <div class="modal-foot"><button class="btn ghost" data-action="close-modal">取消</button><button class="btn primary" data-action="create-section">${icon('plus')} 新建歌单</button></div>`);
  }
  async function addToSection(sectionId, trackId) {
    const s = state.sections.find(x => x.id === sectionId);
    if (!s || !localMap.has(trackId)) return;
    if (!s.trackIds.includes(trackId)) s.trackIds.push(trackId);
    s.updatedAt = Date.now();
    try {
      const res = await api.saveSections(state.sections);
      state.sections = res.sections || state.sections;
      closeModal();
      renderChrome();
      showToast(`已添加到「${s.title}」`);
      if (state.route.view === 'section' && state.route.sectionId === sectionId) renderMain();
    } catch (e) { showToast('添加失败', true); }
  }
  function openConfirm(title, text, onConfirm) {
    window.__confirmAction = onConfirm;
    openModal(`<div class="modal-head"><div><p class="eyebrow">PLEASE CONFIRM</p><h2>${esc(title)}</h2><p>${esc(text)}</p></div><button class="round-btn" data-action="close-modal">${icon('close')}</button></div><div class="modal-foot"><button class="btn ghost" data-action="close-modal">取消</button><button class="btn danger" data-action="confirm">${icon('check')} 确认</button></div>`);
  }

  // ---------- queue / drawer ----------
  function openQueue() {
    $('#queueDrawer').hidden = false;
    renderQueue();
  }
  function closeQueue() { $('#queueDrawer').hidden = true; }
  function renderQueue() {
    if ($('#queueDrawer').hidden) return;
    $('#queueCount').textContent = String(state.queue.length);
    $('#queueList').innerHTML = state.queue.length ? state.queue.map((t, i) => `<button class="queue-item ${sameTrack(t, state.current) ? 'is-current' : ''}" data-action="queue-play" data-index="${i}"><span class="queue-num">${sameTrack(t, state.current) ? '▶' : String(i + 1).padStart(2, '0')}</span><div class="queue-thumb">${artHTML(t)}</div><div class="queue-copy"><b>${esc(t.title)}</b><span>${esc(t.artist)}</span></div><span class="queue-time">${t.source === 'netease' ? 'CLOUD' : fmtTime(t.duration)}</span></button>`).join('') : `<div class="lyric-empty" style="margin-top:60px">${icon('queue')}<p>队列还是空的<br>从曲库里选一首歌开始</p></div>`;
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

  // ---------- actions ----------
  async function handleAction(action, el) {
    switch (action) {
      case 'go-home': state.query = ''; $('#globalSearch').value = ''; setRoute({ view: 'home' }); break;
      case 'open-settings': setRoute({ view: 'settings' }); break;
      case 'scroll-top': $('#main').scrollTo({ top: 0, behavior: 'smooth' }); break;
      case 'locate-current': {
        const row = state.current && document.querySelector(`.track-row[data-track-id="${String(state.current.id).replace(/"/g, '')}"]`);
        if (row) row.scrollIntoView({ block: 'center', behavior: 'smooth' });
        else showToast('当前页面没有正在播放的歌曲', true);
        break;
      }
      case 'cycle-mode': cyclePlayMode(); break;
      case 'set-theme': if (THEMES[el.dataset.theme]) setAppearance({ theme: el.dataset.theme }); break;
      case 'set-motion': if (['silky', 'light', 'off'].includes(el.dataset.motion)) setAppearance({ motion: el.dataset.motion }); break;
      case 'view-announcement': viewAnnouncement(); break;
      case 'close-announcement': hideAnnouncement(true); break;
      case 'sleep': openSleepModal(); break;
      case 'set-sleep': setSleepTimer(Number(el.dataset.min) || 0); break;
      case 'back': goBack(); break;
      case 'go-sections': setRoute({ view: 'sections' }); break;
      case 'go-artists': setRoute({ view: 'artists' }); break;
      case 'go-albums': setRoute({ view: 'albums' }); break;
      case 'go-folders': setRoute({ view: 'folders' }); break;
      case 'open-album': setRoute({ view: 'album', album: el.dataset.album, albumArtist: el.dataset.albumArtist }); break;
      case 'open-folder': setRoute({ view: 'folder', folder: el.dataset.folder }); break;
      case 'clear-search': state.query = ''; $('#globalSearch').value = ''; setRoute({ view: 'local' }); break;
      case 'dismiss-warning': state.warningDismissed = true; renderMain(); break;
      case 'play-all': {
        const list = state.localList && state.localList.length ? state.localList : filteredLocal();
        if (list.length) playWithContext(list[0], list); else showToast('当前列表没有歌曲', true);
        break;
      }
      case 'shuffle-all': {
        const list = (state.localList && state.localList.length ? state.localList : filteredLocal()).slice().sort(() => Math.random() - .5);
        if (list.length) playWithContext(list[0], list); else showToast('当前列表没有歌曲', true);
        break;
      }
      case 'scan': await scanLibrary(); break;
      case 'choose-folder': await chooseFolder(); break;
      case 'reveal-library': api.revealLibrary(); break;
      case 'open-data': api.openData(); break;
      case 'fullscreen': await api.toggleFullscreen(); break;
      case 'toggle-play': togglePlay(); break;
      case 'next': nextTrack(); break;
      case 'prev': prevTrack(); break;
      case 'shuffle': toggleShuffle(); break;
      case 'repeat': cycleRepeat(); break;
      case 'favorite': toggleFavorite(el.dataset.trackId ? findTrack(el.dataset.trackId) : null); break;
      case 'mute': state.muted = !state.muted; audio.muted = state.muted; renderTransport(); break;
      case 'queue': openQueue(); break;
      case 'close-queue': closeQueue(); break;
      case 'clear-queue': state.queue = state.current ? [state.current] : []; state.qi = state.current ? 0 : -1; renderQueue(); persistPlayer(); showToast('队列已清空'); break;
      case 'queue-play': playAt(Number(el.dataset.index)); break;
      case 'immersive': openImmersive(); break;
      case 'close-immersive': closeImmersive(); break;
      case 'import-lyrics': {
        if (!state.current || state.current.source !== 'local') return;
        const res = await api.importLyrics(state.current.id);
        if (res) { state.lyrics = parseLrc(res.text).lines; state.lyricSource = res.source; state.lyricLoading = false; renderLyricsView(); renderNow(); renderTime(); showToast('歌词已导入'); }
        break;
      }
      case 'seek-lyric': if (el.dataset.time) { seekTo(Number(el.dataset.time)); if (audio.paused) togglePlay(); } break;
      case 'offset-down': adjustLyricOffset(-0.5); break;
      case 'offset-up': adjustLyricOffset(0.5); break;
      case 'local-tab': state.localTab = el.dataset.tab; renderMain(); break;
      case 'sort': state.sort = el.dataset.sort; renderMain(); break;
      case 'random-play': {
        const arr = state.library.tracks; if (!arr.length) return chooseFolder();
        playWithContext(arr[Math.floor(Math.random() * arr.length)], arr); break;
      }
      case 'play-featured': {
        if (state.current) togglePlay();
        else { const arr = state.library.tracks; if (arr.length) playWithContext(arr[0], arr); }
        break;
      }
      case 'play-album': {
        const tracks = state.library.tracks.filter(t => (t.album || '未知专辑') === el.dataset.album && (t.albumArtist || t.artist) === el.dataset.albumArtist);
        if (tracks.length) playWithContext(tracks[0], tracks);
        break;
      }
      case 'play-artist': {
        const a = groupArtists().find(x => x.name === el.dataset.artist); if (a) playWithContext(a.tracks[0], a.tracks); break;
      }
      case 'shuffle-artist': {
        const a = groupArtists().find(x => x.name === el.dataset.artist);
        if (a) { state.shuffle = true; persistPlayer(); const list = a.tracks.slice().sort(() => Math.random() - .5); playWithContext(list[0], list); }
        break;
      }
      case 'favorite-artist': {
        const a = groupArtists().find(x => x.name === el.dataset.artist);
        if (a) { a.tracks.forEach(t => state.favorites.add(t.id)); persistPlayer(); renderChrome(); renderMain(); renderTransport(); showToast(`已收藏 ${a.tracks.length} 首歌`); }
        break;
      }
      case 'open-artist': setRoute({ view: 'artist', artist: el.dataset.artist }); break;
      case 'go-current-artist': if (state.current && state.current.source === 'local') setRoute({ view: 'artist', artist: state.current.artist }); else if (state.current) showToast('在线歌曲没有本地艺术家页面'); break;
      case 'open-section': setRoute({ view: 'section', sectionId: el.dataset.sectionId }); break;
      case 'open-favorites': setRoute({ view: 'favorites' }); break;
      case 'create-section': {
        const pending = state.pendingSectionTrack;
        state.pendingSectionTrack = null;
        closeModal();
        openSectionEditor(null, pending ? [pending] : []);
        break;
      }
      case 'edit-section': { const s = state.sections.find(x => x.id === el.dataset.sectionId); if (s) openSectionEditor(s); break; }
      case 'delete-section': {
        const id = el.dataset.sectionId;
        await deleteSection(id);
        break;
      }
      case 'save-section': await saveSection(el.dataset.id, !!el.dataset.editing); break;
      case 'add-to-section': {
        if (el.dataset.sectionId) {
          const s = state.sections.find(x => x.id === el.dataset.sectionId);
          if (s) openTrackPickerForSection(s);
        } else {
          const t = findTrack(el.dataset.trackId);
          if (t) openTrackToSection(t);
        }
        break;
      }
      case 'pick-section': await addToSection(el.dataset.sectionId, el.dataset.trackId); break;
      case 'play-section': {
        const s = state.sections.find(x => x.id === el.dataset.sectionId); const tracks = s ? sectionTracks(s) : [];
        if (tracks.length) playWithContext(tracks[0], tracks); else showToast('这个歌单还没有歌曲', true);
        break;
      }
      case 'play-favorites': { const tracks = [...state.favorites].map(id => localMap.get(id)).filter(Boolean); if (tracks.length) playWithContext(tracks[0], tracks); else showToast('还没有收藏歌曲'); break; }
      case 'shuffle-favorites': { const tracks = [...state.favorites].map(id => localMap.get(id)).filter(Boolean).sort(() => Math.random() - .5); if (tracks.length) { state.shuffle = true; playWithContext(tracks[0], tracks); } else showToast('还没有收藏歌曲'); break; }
      case 'play-cloud': {
        const t = findTrack(el.dataset.trackId);
        if (t) playWithContext(t, state.cloudResults.slice());
        break;
      }
      case 'cloud-suggest': { state.cloudQuery = el.dataset.query; setRoute({ view: 'cloud' }); runCloudSearch(el.dataset.query); break; }
      case 'close-modal': closeModal(); break;
      case 'confirm': { const fn = window.__confirmAction; window.__confirmAction = null; if (typeof fn === 'function') await fn(); break; }
      case 'cloud-search':
        break;
      default: break;
    }
  }
  function openTrackPickerForSection(s) {
    const selected = new Set(s.trackIds || []);
    openModal(`<div class="modal-head"><div><p class="eyebrow">ADD TRACKS · ${esc(s.title)}</p><h2>添加歌曲</h2><p>选择要放进这个歌单的本地歌曲。</p></div><button class="round-btn" data-action="close-modal">${icon('close')}</button></div>
      <div class="modal-body"><div class="picker-head"><h3>本地歌曲 <span id="pickCount">${selected.size}</span></h3><label class="inline-search picker-search">${icon('search')}<input id="pickerSearch" type="search" placeholder="搜索"></label></div><div class="pick-list" id="pickList">${state.library.tracks.map(t => `<div class="pick-row ${selected.has(t.id) ? 'is-picked' : ''}" data-pick-id="${esc(t.id)}"><span class="checkbox">${selected.has(t.id) ? icon('check') : ''}</span><div class="pick-cover">${artHTML(t)}</div><div class="pick-info"><b>${esc(t.title)}</b><span>${esc(t.artist)} · ${esc(t.album)}</span></div></div>`).join('')}</div></div>
      <div class="modal-foot"><button class="btn ghost" data-action="close-modal">取消</button><button class="btn primary" data-action="save-section-tracks" data-section-id="${esc(s.id)}">${icon('check')} 保存歌曲</button></div>`);
    $('#pickList')?.addEventListener('click', e => {
      const row = e.target.closest('[data-pick-id]'); if (!row) return;
      const on = row.classList.toggle('is-picked');
      row.querySelector('.checkbox').innerHTML = on ? icon('check') : '';
      $('#pickCount').textContent = $$('#pickList .is-picked').length;
    });
    $('#pickerSearch')?.addEventListener('input', e => {
      const q = norm(e.target.value);
      $$('#pickList .pick-row').forEach(row => { row.style.display = !q || norm(row.textContent).includes(q) ? '' : 'none'; });
    });
    // replace save action handling through delegated case
    const saveBtn = $('[data-action="save-section-tracks"]');
    if (saveBtn) saveBtn.addEventListener('click', async () => {
      const sec = state.sections.find(x => x.id === saveBtn.dataset.sectionId);
      if (!sec) return;
      sec.trackIds = $$('#pickList .is-picked').map(el => el.dataset.pickId);
      sec.updatedAt = Date.now();
      try {
        const res = await api.saveSections(state.sections);
        state.sections = res.sections || state.sections;
        closeModal(); renderChrome(); renderMain(); showToast('歌单歌曲已更新');
      } catch (e) { showToast('保存失败', true); }
    });
  }
  async function runCloudSearch(q) {
    const query = String(q || '').trim();
    if (!query) return;
    state.cloudQuery = query;
    state.cloudLoading = true; state.cloudError = ''; state.cloudSearched = true;
    renderMain();
    try {
      const res = await api.neteaseSearch(query);
      state.cloudResults = res.songs || [];
      syncMaps();
    } catch (e) {
      state.cloudError = e.message || '网络连接失败';
      state.cloudResults = [];
    }
    state.cloudLoading = false;
    renderMain();
  }

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
    const cloudRow = e.target.closest('.cloud-row');
    if (cloudRow) {
      const t = cloudMap.get(cloudRow.dataset.cloudId);
      if (t) playWithContext(t, state.cloudResults);
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
      if (state.route.view === 'cloud') runCloudSearch(q);
      else { state.query = q; setRoute({ view: 'local' }); }
      e.target.blur();
    }
    if (e.key === 'Escape') { e.target.value = ''; state.query = ''; if (state.route.view === 'local') renderMain(); e.target.blur(); }
  });
  $('#globalSearch').addEventListener('input', e => {
    const q = e.target.value;
    if (state.route.view === 'cloud') return;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.query = q;
      if (state.route.view !== 'local') setRoute({ view: 'local' });
      else { renderMain(); $('#main').scrollTop = 0; }
    }, 120);
  });
  document.addEventListener('submit', e => {
    if (e.target.id === 'cloudSearchForm') { e.preventDefault(); runCloudSearch($('#cloudSearchInput')?.value); }
    else if (e.target.id === 'sectionForm') e.preventDefault();
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

  // ---------- local announcement ----------
  function stripMarkdown(md) {
    return String(md || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/^#{1,6}\s*/gm, '')
      .replace(/[*`~>#]/g, '')
      .replace(/^-+\s*/gm, '')
      .replace(/\s+/g, ' ').trim();
  }
  function inlineMarkdown(text) {
    return esc(text)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  }
  function renderMarkdown(md) {
    const lines = String(md || '').replace(/\r/g, '').split('\n');
    let html = '', list = '', code = null;
    const closeList = () => { if (list) { html += '</' + list + '>'; list = ''; } };
    for (const line of lines) {
      const t = line.trim();
      if (code !== null) {
        if (/^```/.test(t)) { html += '<pre><code>' + esc(code.join('\n')) + '</code></pre>'; code = null; }
        else code.push(line);
        continue;
      }
      if (/^```/.test(t)) { closeList(); code = []; continue; }
      if (!t) { closeList(); continue; }
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { closeList(); html += '<hr>'; continue; }
      const h = t.match(/^(#{1,6})\s+(.+)$/);
      if (h) { closeList(); const n = h[1].length; html += '<h' + n + '>' + inlineMarkdown(h[2]) + '</h' + n + '>'; continue; }
      if (/^>\s?/.test(t)) { closeList(); html += '<blockquote>' + inlineMarkdown(t.replace(/^>\s?/, '')) + '</blockquote>'; continue; }
      const ol = t.match(/^\d+\.\s+(.+)$/), ul = t.match(/^[-+*]\s+(.+)$/);
      if (ol || ul) {
        const type = ol ? 'ol' : 'ul';
        if (list !== type) { closeList(); html += '<' + type + '>'; list = type; }
        html += '<li>' + inlineMarkdown((ol || ul)[1]) + '</li>';
        continue;
      }
      closeList();
      html += '<p>' + inlineMarkdown(t) + '</p>';
    }
    if (code !== null) html += '<pre><code>' + esc(code.join('\n')) + '</code></pre>';
    closeList();
    return html || '<p>暂无公告内容。</p>';
  }
  function hideAnnouncement(immediate = false) {
    if (announcementTicker) { clearInterval(announcementTicker); announcementTicker = 0; }
    clearTimeout(announcementHideTimer);
    const el = $('#announcementToast');
    if (!el || el.hidden) return;
    if (immediate) { el.hidden = true; el.classList.remove('is-leaving'); return; }
    el.classList.add('is-leaving');
    announcementHideTimer = setTimeout(() => { el.hidden = true; el.classList.remove('is-leaving'); }, 220);
  }
  function showAnnouncement(ann) {
    announcementData = ann;
    const el = $('#announcementToast');
    if (!el) return;
    $('#announcementVersion').textContent = ann.version || '';
    $('#announcementTitle').textContent = ann.title || '版本提示';
    $('#announcementPreview').textContent = stripMarkdown(String(ann.content || '').replace(/^#.*$/m, '')).slice(0, 160) || '查看本次版本更新内容';
    let left = Math.max(3, Math.min(60, Number(ann.autoCloseSeconds) || 10));
    const countdown = $('#announcementCountdown');
    countdown.textContent = left + 's 后自动关闭';
    el.hidden = false;
    el.classList.remove('is-leaving');
    const progress = $('#announcementProgress');
    progress.style.animation = 'none';
    void progress.offsetWidth;
    progress.style.animation = '';
    progress.style.animationDuration = left + 's';
    if (announcementTicker) clearInterval(announcementTicker);
    announcementTicker = setInterval(() => {
      left--;
      if (left <= 0) { hideAnnouncement(); return; }
      countdown.textContent = left + 's 后自动关闭';
    }, 1000);
  }
  function viewAnnouncement() {
    if (!announcementData) return;
    hideAnnouncement(true);
    const ann = announcementData;
    openModal(`<div class="modal-head"><div><p class="eyebrow">LOCAL ANNOUNCEMENT</p><h2>${esc(ann.title)}</h2><p><span class="announcement-version">${esc(ann.version)}</span> · 来自 data/announcement.md</p></div><button class="round-btn" data-action="close-modal">${icon('close')}</button></div>
      <div class="modal-body announcement-md">${renderMarkdown(ann.content)}</div>
      <div class="modal-foot"><span class="announcement-countdown">本地公告 · 可自由编辑</span><button class="btn primary" data-action="close-modal">知道了</button></div>`, 'announcement-modal');
  }
  async function initAnnouncement() {
    try {
      const ann = await api.getAnnouncement();
      if (!ann || !ann.enabled) return;
      setTimeout(() => showAnnouncement(ann), 900);
    } catch {}
  }

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
    setTimeout(() => { $('#boot').classList.add('is-gone'); $('#app').setAttribute('aria-hidden', 'false'); }, 250);
    initAnnouncement();
  }

  window.addEventListener('error', e => console.error('UI ERROR', e.message, e.filename, e.lineno));
  window.addEventListener('unhandledrejection', e => console.error('UI REJECTION', e.reason && (e.reason.stack || e.reason.message || e.reason)));

  init();
})();










