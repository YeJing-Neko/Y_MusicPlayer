'use strict';

// Library, artist, album, folder, playlist and settings views.

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
  const SECTION_ICON_NAMES = ['headphones', 'moon', 'sun', 'leaf', 'waves', 'coffee', 'planet', 'book', 'candle', 'music', 'heart', 'sparkles'];
  const LEGACY_SECTION_ICONS = {
    '♥': 'heart', '🎧': 'headphones', '🌙': 'moon', '☀️': 'sun', '🌿': 'leaf', '🌊': 'waves',
    '☕': 'coffee', '🪐': 'planet', '📖': 'book', '🕯️': 'candle', '🍃': 'leaf', '🌾': 'leaf',
    '✨': 'sparkles', '♫': 'music', '♪': 'music', '🎵': 'music'
  };
  function sectionIconName(s) {
    const raw = (s && (s.icon || s.emoji)) || 'headphones';
    return LEGACY_SECTION_ICONS[raw] || (SECTION_ICON_NAMES.includes(raw) ? raw : 'headphones');
  }
  function sectionPalette(s) { return ZONE_COLORS[s && s.color] || ZONE_COLORS.moss; }
  function favoriteTracks() { return [...state.favorites].map(id => localMap.get(id)).filter(Boolean); }
  function sectionCoverInner(s) {
    const tracks = sectionTracks(s);
    const iconName = sectionIconName(s);
    if (tracks.length) return `${artHTML(tracks[0])}<span class="playlist-emoji">${icon(iconName)}</span>`;
    const p = sectionPalette(s);
    return `<div class="playlist-blank" style="--z1:${p[0]};--z2:${p[1]}"><span class="playlist-emoji">${icon(iconName)}</span></div>`;
  }
  function sideThumbHTML(track, iconName = 'music') {
    if (track) return `<div class="side-thumb">${artHTML(track)}<span class="side-emoji">${icon(iconName)}</span></div>`;
    return `<div class="side-thumb"><div class="art"><div class="art-fallback" style="--a:#9fb8c9;--b:#5e8298"><span class="art-letter side-icon-fallback">${icon(iconName)}</span></div></div></div>`;
  }
  function renderSidebarPlaylists() {
    const favs = favoriteTracks();
    const favActive = state.route.view === 'favorites';
    let html = `<button class="side-playlist ${favActive ? 'is-active' : ''}" data-action="open-favorites">
      ${sideThumbHTML(favs[0], 'heart')}<span>我喜欢的</span>
    </button>`;
    html += state.sections.map(s => {
      const tracks = sectionTracks(s);
      const active = state.route.view === 'section' && state.route.sectionId === s.id;
      return `<button class="side-playlist ${active ? 'is-active' : ''}" data-action="open-section" data-section-id="${esc(s.id)}">
        ${sideThumbHTML(tracks[0], sectionIconName(s))}<span>${esc(s.title)}</span>
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
    $('#globalSearch').placeholder = '搜索歌曲';
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
      { title: '我喜欢的', tracks: favorite, iconName: 'heart', action: 'open-favorites' },
      ...state.sections.map(s => ({ title: s.title, tracks: sectionTracks(s), iconName: sectionIconName(s), action: 'open-section', id: s.id }))
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
      <div class="home-playlist-row">${playlists.map(p => playlistCard({ title: p.title, subtitle: `${p.tracks.length} 首歌曲`, tracks: p.tracks, iconName: p.iconName, action: p.action, id: p.id })).join('')}<button class="playlist-add" style="flex:0 0 150px;min-height:150px" data-action="create-section"><span class="plus-ring">${icon('plus')}</span><span>新建歌单</span></button></div>
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
  function playlistCard({ title, subtitle, tracks, iconName = 'headphones', action, id }) {
    const p = sectionPalette({ color: id === 'favorites' ? 'rose' : 'moss' });
    const cover = tracks.length ? `${artHTML(tracks[0])}<span class="playlist-emoji">${icon(iconName)}</span>` : `<div class="playlist-blank" style="--z1:${p[0]};--z2:${p[1]}"><span class="playlist-emoji">${icon(iconName)}</span></div>`;
    return `<button class="playlist-card" data-action="${action}" ${id ? `data-section-id="${esc(id)}"` : ''}>
      <div class="playlist-cover">${cover}</div>
      <h4>${esc(title)}</h4><p>${esc(subtitle)}</p>
    </button>`;
  }
  function renderPlaylists() {
    const favs = favoriteTracks();
    return `${pageHead('歌单', `${state.sections.length + 1} 个本地歌单 · 可随时编辑`, `<button class="btn primary small" data-action="create-section">${icon('plus')} 新建歌单</button>`)}
      <div class="playlist-grid">
        ${playlistCard({ title: '我喜欢的', subtitle: `${favs.length} 首歌曲`, tracks: favs, iconName: 'heart', action: 'open-favorites' })}
        ${state.sections.map(s => playlistCard({ title: s.title, subtitle: `${sectionTracks(s).length} 首歌曲 · ${s.subtitle || '本地歌单'}`, tracks: sectionTracks(s), iconName: sectionIconName(s), action: 'open-section', id: s.id })).join('')}
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
      kicker: 'FAVORITES', title: '我喜欢的', cover: tracks.length ? artHTML(tracks[0]) : `<div class="playlist-blank" style="--z1:#b8868c;--z2:#70464c"><span>${icon('heart')}</span></div>`,
      meta: `${tracks.length} 首歌曲 · 收藏保存在本机`,
      actions: `<button class="btn primary" data-action="play-all">${icon('play')} 播放全部</button><button class="btn" data-action="shuffle-all">${icon('shuffle')} 随机播放</button>`,
      footer: 'LOCAL FAVORITES'
    })}
    ${trackListHTML(tracks, '还没有收藏歌曲')}`;
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
            <div class="appearance-block full"><label>启动界面</label><div class="welcome-setting-row"><div><b>每次启动时展示「2.0 全新启航」</b><span>关闭后直接进入首页，仍可随时在设置中重新开启。</span></div><button class="toggle-switch ${state.showWelcome ? 'is-on' : ''}" data-action="toggle-welcome" role="switch" aria-checked="${state.showWelcome}" aria-label="每次启动展示启动界面"><i></i></button></div></div>
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
        <div class="setting-card"><h3>${icon('info')} 关于 Y_Music</h3><div class="about-mark"><div class="brand-mark">${icon('leaf')}</div><div><h3>Y_Music</h3><p>LOCAL MUSIC SPACE · v${esc(state.version)}</p></div></div><div class="about-list"><div>面向触摸白板与横屏展示的本地音乐空间，视觉与曲库结构参考 Sylvakru 的浅色磨砂风格。</div><div><b>本地优先</b> · 流光启动界面 · 自动歌词 · 艺术家归类 · 可编辑歌单</div></div><div class="about-copyright">© 2026 夜静（YeJing-Neko）. All rights reserved.<br><a href="https://github.com/YeJing-Neko" target="_blank" rel="noreferrer">github.com/YeJing-Neko</a></div><div class="setting-actions"><button class="btn small ghost" data-action="open-data">${icon('folder')} data 目录</button><button class="btn small ghost" data-action="fullscreen">${icon('fullscreen')} 全屏</button></div></div>
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
      sections: renderPlaylists, section: renderSection, favorites: renderFavorites, settings: renderSettings
    };
    $('#main').innerHTML = missingWarningHTML() + (map[state.route.view] || renderLibrary)();
    $('#main').scrollTop = scrollTop;
  }

