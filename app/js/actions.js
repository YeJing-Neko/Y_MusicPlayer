'use strict';

// Central UI action dispatcher.

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
      case 'toggle-welcome': setShowWelcome(!state.showWelcome); break;
      case 'dismiss-welcome': dismissWelcome(); break;
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
      case 'go-current-artist': if (state.current && state.current.source === 'local') setRoute({ view: 'artist', artist: state.current.artist }); else showToast('还没有正在播放的本地歌曲'); break;
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
      case 'close-modal': closeModal(); break;
      case 'confirm': { const fn = window.__confirmAction; window.__confirmAction = null; if (typeof fn === 'function') await fn(); break; }
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

