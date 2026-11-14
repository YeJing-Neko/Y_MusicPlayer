'use strict';

// Local announcement markdown renderer and toast.

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
