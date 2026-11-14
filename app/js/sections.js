'use strict';

// Playlist/section editor and delete confirmation.

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
    const base = section || { id: crypto.randomUUID().replace(/-/g, '').slice(0, 16), title: '', subtitle: '', icon: 'headphones', color: 'moss', trackIds: [] };
    const selected = new Set([...(base.trackIds || []), ...(preferredTrackIds || [])].filter(id => localMap.has(id)));
    const chosenIcon = sectionIconName(base);
    const iconNames = SECTION_ICON_NAMES;
    const colors = [['moss', '#3d5c49'], ['amber', '#8a653c'], ['ocean', '#355e6b'], ['rose', '#74484f'], ['violet', '#544d79'], ['paper', '#5d5947']];
    openModal(`<div class="modal-head"><div><p class="eyebrow">LOCAL PLAYLIST · PRIVATE</p><h2>${editing ? '编辑歌单' : '新建歌单'}</h2><p>把这些歌留在这一块白板上，数据和排序全部保存在本机。</p></div><button class="round-btn" data-action="close-modal">${icon('close')}</button></div>
      <div class="modal-body">
        <form id="sectionForm">
          <div class="form-grid">
            <div class="field"><label>歌单名称</label><input type="text" id="sectionTitle" maxlength="30" value="${esc(base.title)}" placeholder="例如：深夜专注" required></div>
            <div class="field"><label>一句说明</label><input type="text" id="sectionSubtitle" maxlength="80" value="${esc(base.subtitle)}" placeholder="例如：关掉喧闹，留一盏小灯"></div>
            <div class="field full"><label>图标</label><div class="emoji-picker" id="emojiPicker">${iconNames.map(name => `<button type="button" data-icon-name="${name}" class="${name === chosenIcon ? 'is-active' : ''}" title="${name}" aria-label="${name}">${icon(name)}</button>`).join('')}</div></div>
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
      const btn = e.target.closest('[data-icon-name]'); if (!btn) return;
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
    const iconName = $('#emojiPicker .is-active')?.dataset.iconName || 'headphones';
    const color = $('#colorPicker .is-active')?.dataset.color || 'moss';
    const trackIds = $$('#pickList .is-picked').map(el => el.dataset.pickId);
    const sections = state.sections.slice();
    const existing = sections.find(s => s.id === id);
    if (existing) Object.assign(existing, { title, subtitle, icon: iconName, color, trackIds, updatedAt: Date.now() });
    else sections.push({ id, title, subtitle, icon: iconName, color, trackIds, createdAt: Date.now(), updatedAt: Date.now() });
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
      <div class="modal-body"><div class="modal-section-picks">${state.sections.map(s => `<button class="section-pick" data-action="pick-section" data-section-id="${esc(s.id)}" data-track-id="${esc(local.id)}"><span class="zone-emoji">${icon(sectionIconName(s))}</span><div style="flex:1"><b>${esc(s.title)}</b><span>${(s.trackIds || []).length} 首歌曲${exists && exists.id === s.id ? ' · 已包含' : ''}</span></div>${exists && exists.id === s.id ? icon('check') : icon('chevronRight')}</button>`).join('') || `<div class="lyric-empty" style="min-height:100px">还没有歌单，先新建一个吧。</div>`}</div></div>
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

