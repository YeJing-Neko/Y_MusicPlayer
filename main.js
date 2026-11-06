const { app, BrowserWindow, ipcMain, dialog, shell, Menu, screen } = require('electron');
const path = require('node:path');
const fsSync = require('node:fs');
const fsp = require('node:fs/promises');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const iconv = require('iconv-lite');

const ROOT = __dirname;
const DATA = process.env.YMUSIC_DATA_DIR ? path.resolve(process.env.YMUSIC_DATA_DIR) : path.join(ROOT, 'data');
const DEMO = path.join(ROOT, 'demo_music');
const ANNOUNCE_JSON = path.join(DATA, 'announcement.json');
const ANNOUNCE_MD = path.join(DATA, 'announcement.md');
const AUDIO_EXT = new Set(['.mp3', '.flac', '.wav', '.m4a', '.aac', '.ogg', '.opus']);
const MIME_COVER = { 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/bmp': '.bmp' };
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

let win = null;
let library = { root: '', scannedAt: null, tracks: [] };
const DEFAULT_APPEARANCE = { theme: 'salt', motion: 'silky', bgOpacity: 1, lyricScale: 1 };
let settings = { volume: 0.8, playerHeight: 94, appearance: { ...DEFAULT_APPEARANCE }, lyricSize: 'large', reduceMotion: false, lastView: 'home' };
const THEME_KEYS = ['salt', 'moss', 'peach', 'rose', 'lavender', 'graphite'];
const MOTION_KEYS = ['silky', 'light', 'off'];
let sections = { sections: [] };
let playerState = { favorites: [], recent: [], queue: [], currentId: null, position: 0, plays: {}, shuffle: false, repeat: 'all' };

const clean = (v) => String(v == null ? '' : v).replace(/\0/g, '').trim();
function stableTrackId(t) {
  const key = [clean(t.title).toLowerCase(), clean(t.artist).toLowerCase(), clean(t.album).toLowerCase(), Math.round(Number(t.duration) || 0)].join('|');
  return crypto.createHash('sha1').update(key).digest('hex').slice(0, 16);
}
const jsonRead = async (file, fallback) => { try { return JSON.parse(await fsp.readFile(file, 'utf8')); } catch { return fallback; } };
async function readTextFile(file) {
  const buf = await fsp.readFile(file);
  if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) return buf.slice(3).toString('utf8');
  if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xFE) return buf.slice(2).toString('utf16le');
  if (buf.length >= 2 && buf[0] === 0xFE && buf[1] === 0xFF) return iconv.decode(buf.slice(2), 'utf16be');
  const utf8 = buf.toString('utf8');
  if (!utf8.includes('\uFFFD')) return utf8;
  return iconv.decode(buf, 'gb18030');
}
async function jsonWrite(file, value) {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  await fsp.writeFile(tmp, JSON.stringify(value, null, 2), 'utf8');
  await fsp.rename(tmp, file);
}
function safeId(id) { return /^[a-zA-Z0-9_-]{4,48}$/.test(String(id)); }
function hydrate(t) {
  return {
    ...t,
    url: pathToFileURL(t.absPath).href,
    coverUrl: t.cover ? pathToFileURL(t.cover).href : null
  };
}

async function walk(dir, out, depth = 0) {
  if (depth > 14) return;
  let entries;
  try { entries = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === '$RECYCLE.BIN') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, out, depth + 1);
    else if (AUDIO_EXT.has(path.extname(e.name).toLowerCase())) out.push(full);
  }
}

function tid(file) { return crypto.createHash('sha1').update(path.resolve(file)).digest('hex').slice(0, 16); }
function titleFromFile(file) {
  return path.basename(file, path.extname(file)).replace(/^\s*\d{1,3}[\s._-]+/, '').replace(/\s{2,}/g, ' ').trim();
}
function splitName(file) {
  const base = titleFromFile(file);
  const m = base.match(/^(.{1,50}?)\s+[-–—]\s+(.{1,80})$/);
  return m ? { artist: m[1].trim(), title: m[2].trim() } : { artist: '', title: base };
}
const normalize = (s) => clean(s).toLowerCase().replace(/^\s*\d{1,3}[\s._-]+/, '').replace(/[（(].*?[)）]/g, '').replace(/\s+/g, '');
async function folderExtras(dir, cache) {
  if (cache.has(dir)) return cache.get(dir);
  let entries = [];
  try { entries = await fsp.readdir(dir, { withFileTypes: true }); } catch {}
  const lrc = entries.filter(e => e.isFile() && /\.lrc$/i.test(e.name)).map(e => path.join(dir, e.name));
  const cover = entries.find(e => e.isFile() && /^(cover|folder|front|album|封面)\.(jpe?g|png|webp)$/i.test(e.name));
  const extras = { lrc, cover: cover ? path.join(dir, cover.name) : null };
  cache.set(dir, extras);
  return extras;
}
function pickLyric(extras, file, title, artist) {
  const stem = normalize(path.basename(file, path.extname(file)));
  const wanted = [normalize(title), normalize(`${artist} - ${title}`), normalize(`${artist}-${title}`)].filter(Boolean);
  for (const p of extras.lrc) {
    const n = normalize(path.basename(p, '.lrc'));
    if (n === stem || wanted.includes(n)) return p;
  }
  return null;
}
async function embeddedLyrics(meta) {
  const arr = meta && meta.common && meta.common.lyrics;
  if (!Array.isArray(arr)) return '';
  for (const item of arr) {
    if (typeof item === 'string' && item.trim()) return item;
    if (item && typeof item.text === 'string' && item.text.trim()) return item.text;
  }
  return '';
}
function pushProgress(done, total, current) {
  if (win && !win.isDestroyed()) win.webContents.send('scan:progress', { done, total, current });
}

async function scanLibrary(root) {
  const absRoot = path.resolve(root);
  const st = await fsp.stat(absRoot).catch(() => null);
  if (!st || !st.isDirectory()) throw new Error('文件夹不存在或无法访问');
  const mm = await import('music-metadata');
  const files = [];
  await walk(absRoot, files);
  files.sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const total = files.length;
  const extrasCache = new Map();
  const tracks = [];
  await fsp.mkdir(path.join(DATA, 'lyrics'), { recursive: true });
  await fsp.mkdir(path.join(DATA, 'covers'), { recursive: true });
  let done = 0;
  const worker = async () => {
    while (files.length) {
      const file = files.shift();
      if (!file) break;
      let meta = null;
      try { meta = await mm.parseFile(file, { duration: true, skipCovers: false }); } catch {}
      const c = (meta && meta.common) || {};
      const f = (meta && meta.format) || {};
      const guessed = splitName(file);
      const title = clean(c.title) || guessed.title || '未命名曲目';
      let artist = clean(c.artist) || (Array.isArray(c.artists) ? clean(c.artists[0]) : '') || guessed.artist;
      const album = clean(c.album) || path.basename(path.dirname(file)) || '未知专辑';
      const albumArtist = clean(c.albumartist) || artist;
      if (!artist) artist = '未知歌手';
      const relPath = path.relative(absRoot, file);
      const fileStat = await fsp.stat(file).catch(() => ({ mtimeMs: Date.now(), size: 0 }));
      const durationValue = Number(f.duration) || 0;
      const sizeValue = f.size || fileStat.size || 0;
      const id = stableTrackId({ title, artist, album, duration: durationValue });
      const extras = await folderExtras(path.dirname(file), extrasCache);
      let lyricsPath = '';
      let lyricsSource = '';
      const manual = path.join(DATA, 'lyrics', `manual-${id}.lrc`);
      const sidecar = pickLyric(extras, file, title, artist);
      if (await fsp.stat(manual).then(() => true).catch(() => false)) {
        lyricsPath = manual; lyricsSource = '自定义歌词';
      } else if (sidecar) {
        lyricsPath = sidecar; lyricsSource = '同目录 LRC';
      } else {
        const embedded = await embeddedLyrics(meta);
        if (embedded) {
          const cacheFile = path.join(DATA, 'lyrics', `${id}.lrc`);
          await fsp.writeFile(cacheFile, embedded, 'utf8').catch(() => {});
          lyricsPath = cacheFile; lyricsSource = '内嵌歌词';
        }
      }
      let coverPath = '';
      const pic = Array.isArray(c.picture) && c.picture[0];
      if (pic && pic.data && pic.data.length) {
        const ext = MIME_COVER[clean(pic.format).toLowerCase()] || '.jpg';
        const coverFile = path.join(DATA, 'covers', `${id}${ext}`);
        try {
          if (!(await fsp.stat(coverFile).catch(() => false))) await fsp.writeFile(coverFile, pic.data);
          coverPath = coverFile;
        } catch {}
      } else if (extras.cover) coverPath = extras.cover;
      tracks.push({
        id, source: 'local', title, artist, album, albumArtist,
        duration: durationValue, year: c.year || null, genre: (c.genre && c.genre[0]) || '',
        trackNo: c.track && c.track.no || null, discNo: c.disc && c.disc.no || null,
        format: clean(f.container) || path.extname(file).slice(1).toUpperCase(),
        bitrate: f.bitrate || 0, sampleRate: f.sampleRate || 0, size: sizeValue,
        relPath, absPath: file, cover: coverPath || null,
        lyricsPath: lyricsPath || null, lyricsSource,
        addedAt: Math.floor(fileStat.mtimeMs || Date.now())
      });
      done++;
      if (done % 3 === 0 || done === total) pushProgress(done, total, title);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  tracks.sort((a, b) => a.artist.localeCompare(b.artist, 'zh-CN') || a.album.localeCompare(b.album, 'zh-CN') || (a.trackNo || 0) - (b.trackNo || 0) || a.title.localeCompare(b.title, 'zh-CN'));
  library = { root: absRoot, scannedAt: Date.now(), tracks };
  await jsonWrite(path.join(DATA, 'library.json'), library);
  settings.libraryRoot = absRoot;
  await jsonWrite(path.join(DATA, 'settings.json'), settings);
  return { root: absRoot, scannedAt: library.scannedAt, missing: 0, tracks: tracks.map(hydrate) };
}

async function ensureSeed() {
  if (library.root || library.tracks.length || !(await fsp.stat(DEMO).then(s => s.isDirectory()).catch(() => false))) return;
  try {
    await scanLibrary(DEMO);
    if (!sections.sections.length && library.tracks.length) {
      const ids = library.tracks.map(t => t.id);
      const a = library.tracks.filter(t => t.artist === '林间电台' || t.album === '苔原来信').map(t => t.id);
      sections = { sections: [
        { id: 'seed-night', title: '深夜专注', subtitle: '关掉喧闹，留一盏小灯', emoji: '🌙', color: 'moss', trackIds: (a.length ? a : ids).slice(0, 3), createdAt: Date.now(), updatedAt: Date.now(), seeded: true },
        { id: 'seed-morning', title: '清晨慢醒', subtitle: '让今天从一段柔和的旋律开始', emoji: '☀️', color: 'amber', trackIds: library.tracks.filter(t => t.album === '夜航星图').map(t => t.id).slice(0, 3), createdAt: Date.now(), updatedAt: Date.now(), seeded: true }
      ]};
      await jsonWrite(path.join(DATA, 'sections.json'), sections);
    }
  } catch (e) { console.error('seed failed', e); }
}

async function migrateStableIds() {
  const map = new Map();
  const used = new Set();
  const nextTracks = [];
  let changed = false;
  for (const t of library.tracks) {
    const nid = stableTrackId(t);
    if (nid !== t.id) { map.set(t.id, nid); t.legacyId = t.legacyId || t.id; t.id = nid; changed = true; }
    if (!used.has(t.id)) { used.add(t.id); nextTracks.push(t); }
    else changed = true;
  }
  if (nextTracks.length !== library.tracks.length) library.tracks = nextTracks;
  if (!changed) return;
  const remap = (id) => map.get(id) || id;
  for (const sec of sections.sections) {
    if (!Array.isArray(sec.trackIds)) continue;
    sec.trackIds = [...new Set(sec.trackIds.map(remap).filter(id => used.has(id)))];
  }
  playerState.favorites = [...new Set((playerState.favorites || []).map(remap).filter(id => used.has(id)))];
  playerState.recent = (playerState.recent || []).map(remap).filter(id => used.has(id));
  playerState.queue = (playerState.queue || []).map(q => ({ ...q, id: remap(q.id) })).filter(q => used.has(q.id));
  playerState.currentId = playerState.currentId ? remap(playerState.currentId) : null;
  if (playerState.currentId && !used.has(playerState.currentId)) playerState.currentId = null;
  playerState.plays = Object.fromEntries(Object.entries(playerState.plays || {}).map(([id, n]) => [remap(id), n]).filter(([id]) => used.has(id)));
  for (const t of library.tracks) {
    if (!t.lyricsPath) continue;
    const base = path.basename(t.lyricsPath);
    for (const [oldId, newId] of map) {
      if (!base.includes(oldId)) continue;
      const nextName = base.replace(oldId, newId);
      const target = t.lyricsSource === '同目录 LRC' ? path.join(path.dirname(t.lyricsPath), nextName) : path.join(DATA, 'lyrics', nextName);
      try { if (!fsSync.existsSync(target)) fsSync.copyFileSync(t.lyricsPath, target); } catch {}
      if (fsSync.existsSync(target)) t.lyricsPath = target;
    }
  }
  await jsonWrite(path.join(DATA, 'library.json'), library);
  await jsonWrite(path.join(DATA, 'sections.json'), sections);
  await jsonWrite(path.join(DATA, 'player.json'), playerState);
}

const DEFAULT_ANNOUNCEMENT_MD = `# Y_Music 版本提示

欢迎回来，这里是夜静为你准备的本地音乐空间。

## 最近更新
- 全局主题色、动效与封面氛围可自定义
- 播放器高度与歌词字号可调
- 睡眠定时器：到时间自动暂停
- 触摸大屏左右滑动切歌
- 全屏歌词采用 Lyricify 风格动效
- 设置与歌单全部保存在 \`data/\`，可随程序目录迁移

## 小提示
把 \`.lrc\` 放在歌曲旁边即可自动匹配歌词；在设置里可以调整主题和动效。

© 2026 夜静 · [github.com/YeJing-Neko](https://github.com/YeJing-Neko)
`;

async function ensureAnnouncementFiles() {
  await fsp.mkdir(DATA, { recursive: true });
  if (!fsSync.existsSync(ANNOUNCE_MD)) await fsp.writeFile(ANNOUNCE_MD, DEFAULT_ANNOUNCEMENT_MD, 'utf8');
  if (!fsSync.existsSync(ANNOUNCE_JSON)) {
    await fsp.writeFile(ANNOUNCE_JSON, JSON.stringify({
      enabled: true,
      version: 'v' + app.getVersion(),
      title: 'Y_Music 版本提示',
      file: 'announcement.md',
      autoCloseSeconds: 10
    }, null, 2), 'utf8');
  }
}

async function loadState() {
  await fsp.mkdir(DATA, { recursive: true });
  library = await jsonRead(path.join(DATA, 'library.json'), library);
  const savedSettings = await jsonRead(path.join(DATA, 'settings.json'), {});
  settings = Object.assign(settings, savedSettings);
  settings.appearance = { ...DEFAULT_APPEARANCE, ...(savedSettings.appearance || {}) };
  settings.volume = Math.max(0, Math.min(1, Number(settings.volume) || 0.8));
  settings.playerHeight = Math.max(76, Math.min(150, Number(settings.playerHeight) || 94));
  sections = await jsonRead(path.join(DATA, 'sections.json'), sections);
  playerState = Object.assign(playerState, await jsonRead(path.join(DATA, 'player.json'), {}));
  if (!Array.isArray(library.tracks)) library.tracks = [];
  if (!Array.isArray(sections.sections)) sections.sections = [];
  if (!Array.isArray(playerState.favorites)) playerState.favorites = [];
  if (!Array.isArray(playerState.recent)) playerState.recent = [];
  if (!Array.isArray(playerState.queue)) playerState.queue = [];
  if (!playerState.plays || typeof playerState.plays !== 'object') playerState.plays = {};
  await migrateStableIds();
  // Keep the bundled demo library working when the application folder is copied/moved.
  if (library.root && path.basename(library.root).toLowerCase() === 'demo_music') {
    const rootOk = await fsp.stat(library.root).then(s => s.isDirectory()).catch(() => false);
    const demoOk = await fsp.stat(DEMO).then(s => s.isDirectory()).catch(() => false);
    if (!rootOk && demoOk && library.tracks.length && library.tracks.every(t => t.relPath && fsSync.existsSync(path.join(DEMO, t.relPath)))) {
      library.root = DEMO;
      for (const t of library.tracks) {
        t.absPath = path.join(DEMO, t.relPath);
        if (t.cover) t.cover = path.join(DATA, 'covers', path.basename(t.cover));
        if (t.lyricsPath) {
          t.lyricsPath = t.lyricsSource === '同目录 LRC'
            ? path.join(path.dirname(t.absPath), path.basename(t.lyricsPath))
            : path.join(DATA, 'lyrics', path.basename(t.lyricsPath));
        }
      }
      await jsonWrite(path.join(DATA, 'library.json'), library);
    }
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1680, height: 980, minWidth: 1040, minHeight: 680,
    show: false, frame: false, backgroundColor: '#cadbe9', autoHideMenuBar: true,
    title: 'Y_Music · 白板音乐空间',
    icon: path.join(ROOT, 'app', 'icon.png'),
    webPreferences: {
      preload: path.join(ROOT, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false,
      backgroundThrottling: false
    }
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(ROOT, 'app', 'index.html'));
  if (!process.argv.includes('--windowed')) win.maximize();
  win.webContents.on('did-finish-load', () => {
    try {
      const w = screen.getPrimaryDisplay().workAreaSize.width;
      const factor = w >= 3000 ? 1.34 : w >= 2400 ? 1.18 : w >= 2000 ? 1.07 : 1;
      if (factor !== 1) win.webContents.setZoomFactor(factor);
    } catch {}
  });
  win.once('ready-to-show', () => {
    win.show();
    if (process.argv.includes('--devtools')) win.webContents.openDevTools({ mode: 'detach' });
  });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.on('closed', () => { win = null; });
}

ipcMain.handle('app:info', async () => ({
  version: app.getVersion(), dataDir: DATA, demoDir: DEMO,
  isFullscreen: win ? win.isFullScreen() : false, platform: process.platform
}));
ipcMain.handle('announcement:get', async () => {
  await ensureAnnouncementFiles();
  const cfg = await jsonRead(ANNOUNCE_JSON, {});
  if (cfg.enabled === false) return { enabled: false };
  const fileName = path.basename(clean(cfg.file) || 'announcement.md');
  const content = await readTextFile(path.join(DATA, fileName)).catch(() => '');
  return {
    enabled: true,
    version: clean(cfg.version) || ('v' + app.getVersion()),
    title: clean(cfg.title) || '版本提示',
    content,
    autoCloseSeconds: Math.max(3, Math.min(60, Number(cfg.autoCloseSeconds) || 10)),
    file: fileName
  };
});
const publicSettings = () => ({ volume: settings.volume, playerHeight: settings.playerHeight, appearance: { ...DEFAULT_APPEARANCE, ...(settings.appearance || {}) } });
ipcMain.handle('settings:get', async () => publicSettings());
ipcMain.handle('settings:save', async (_e, patch) => {
  if (patch && typeof patch === 'object') {
    if (patch.volume != null) settings.volume = Math.max(0, Math.min(1, Number(patch.volume) || 0));
    if (patch.playerHeight != null) settings.playerHeight = Math.max(76, Math.min(150, Math.round(Number(patch.playerHeight) || 94)));
    if (patch.appearance && typeof patch.appearance === 'object') {
      const a = patch.appearance;
      settings.appearance = {
        theme: THEME_KEYS.includes(a.theme) ? a.theme : (settings.appearance.theme || 'salt'),
        motion: MOTION_KEYS.includes(a.motion) ? a.motion : (settings.appearance.motion || 'silky'),
        bgOpacity: Math.max(0.5, Math.min(1, Number(a.bgOpacity) || 1)),
        lyricScale: Math.max(0.8, Math.min(1.4, Number(a.lyricScale) || 1))
      };
    }
  }
  await jsonWrite(path.join(DATA, 'settings.json'), settings);
  return publicSettings();
});
ipcMain.handle('library:get', async () => {
  const missing = library.tracks.reduce((n, t) => n + (fsSync.existsSync(t.absPath) ? 0 : 1), 0);
  return { root: library.root, scannedAt: library.scannedAt, missing, tracks: library.tracks.map(hydrate) };
});
ipcMain.handle('library:choose', async () => {
  const r = await dialog.showOpenDialog(win, { title: '选择音乐文件夹', properties: ['openDirectory'], defaultPath: settings.libraryRoot || DEMO });
  if (r.canceled || !r.filePaths[0]) return null;
  settings.libraryRoot = r.filePaths[0];
  await jsonWrite(path.join(DATA, 'settings.json'), settings);
  return r.filePaths[0];
});
ipcMain.handle('library:scan', async (_e, root) => {
  const target = typeof root === 'string' && root ? root : settings.libraryRoot;
  if (!target) throw new Error('还没有选择音乐文件夹');
  return scanLibrary(target);
});
ipcMain.handle('library:reveal', async () => { if (library.root) shell.openPath(library.root); });
ipcMain.handle('lyrics:get', async (_e, id) => {
  const t = library.tracks.find(x => x.id === id);
  if (!t || !t.lyricsPath) return { text: '', source: '' };
  try { return { text: await readTextFile(t.lyricsPath), source: t.lyricsSource }; }
  catch { return { text: '', source: '' }; }
});
ipcMain.handle('lyrics:import', async (_e, id) => {
  const t = library.tracks.find(x => x.id === id);
  if (!t) throw new Error('未找到歌曲');
  const r = await dialog.showOpenDialog(win, { title: '选择 LRC 歌词', properties: ['openFile'], filters: [{ name: '歌词', extensions: ['lrc', 'txt'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  const text = await readTextFile(r.filePaths[0]);
  const target = path.join(DATA, 'lyrics', `manual-${id}.lrc`);
  await fsp.writeFile(target, text, 'utf8');
  t.lyricsPath = target; t.lyricsSource = '自定义歌词';
  await jsonWrite(path.join(DATA, 'library.json'), library);
  return { text, source: t.lyricsSource };
});
ipcMain.handle('sections:get', async () => sections);
ipcMain.handle('sections:save', async (_e, incoming) => {
  const list = Array.isArray(incoming) ? incoming.slice(0, 60) : [];
  sections = { sections: list.map(s => ({
    id: safeId(s.id) ? s.id : crypto.randomUUID().slice(0, 16),
    title: clean(s.title).slice(0, 30) || '未命名专区',
    subtitle: clean(s.subtitle).slice(0, 80),
    emoji: Array.from(clean(s.emoji) || '🎵').slice(0, 2).join(''),
    color: ['moss', 'amber', 'ocean', 'rose', 'violet', 'paper'].includes(s.color) ? s.color : 'moss',
    trackIds: (Array.isArray(s.trackIds) ? s.trackIds : []).filter(id => library.tracks.some(t => t.id === id)),
    createdAt: s.createdAt || Date.now(), updatedAt: Date.now()
  })) };
  await jsonWrite(path.join(DATA, 'sections.json'), sections);
  return sections;
});
ipcMain.handle('player:get', async () => playerState);
ipcMain.handle('player:save', async (_e, state) => {
  if (!state || typeof state !== 'object') return;
  const validIds = new Set(library.tracks.map(t => t.id));
  const localQueue = (Array.isArray(state.queue) ? state.queue : []).filter(t => t && t.source === 'local' && validIds.has(t.id)).slice(0, 500);
  playerState = {
    favorites: (Array.isArray(state.favorites) ? state.favorites : []).filter(id => validIds.has(id)).slice(0, 3000),
    recent: (Array.isArray(state.recent) ? state.recent : []).filter(id => validIds.has(id)).slice(0, 40),
    queue: localQueue.map(t => ({ id: t.id, source: 'local' })),
    currentId: validIds.has(state.currentId) ? state.currentId : null,
    position: Math.max(0, Math.min(86400, Number(state.position) || 0)),
    plays: Object.fromEntries(Object.entries(state.plays || {}).filter(([id]) => validIds.has(id)).slice(0, 3000).map(([id, n]) => [id, Math.max(0, Math.min(999999, Number(n) || 0))])),
    shuffle: !!state.shuffle, repeat: ['off', 'all', 'one'].includes(state.repeat) ? state.repeat : 'all'
  };
  await jsonWrite(path.join(DATA, 'player.json'), playerState);
});
ipcMain.handle('app:openData', async () => { await shell.openPath(DATA); });
ipcMain.handle('app:fullscreen', async () => { if (!win) return false; win.setFullScreen(!win.isFullScreen()); return win.isFullScreen(); });
ipcMain.handle('app:minimize', async () => { win && win.minimize(); });
ipcMain.handle('app:toggleMaximize', async () => { if (!win) return false; if (win.isMaximized()) win.unmaximize(); else win.maximize(); return win.isMaximized(); });
ipcMain.handle('app:close', async () => { win && win.close(); });

async function nmJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Referer: 'https://music.163.com/', Cookie: 'os=pc; appver=8.9.70;' } });
  if (!res.ok) throw new Error(`网易云接口 ${res.status}`);
  return res.json();
}
ipcMain.handle('netease:search', async (_e, q) => {
  const keyword = clean(q).slice(0, 60);
  if (!keyword) return { songs: [] };
  const url = `https://music.163.com/api/search/get/web?s=${encodeURIComponent(keyword)}&type=1&limit=36&offset=0`;
  const data = await nmJson(url);
  const rawSongs = (((data.result || {}).songs) || []);
  const details = new Map();
  if (rawSongs.length) {
    try {
      const ids = rawSongs.map(s => s.id);
      const detail = await nmJson(`https://music.163.com/api/song/detail?ids=${encodeURIComponent(JSON.stringify(ids))}`);
      for (const d of (detail.songs || [])) details.set(d.id, d);
    } catch {}
  }
  const songs = rawSongs.map(s => {
    const ar = s.artists || s.ar || [];
    const d = details.get(s.id) || {};
    const da = d.artists || d.ar || [];
    const album = s.album || s.al || d.album || d.al || {};
    return {
      source: 'netease', id: `nm-${s.id}`, nmId: s.id,
      title: clean(s.name) || clean(d.name), artist: ar.map(a => clean(a.name)).filter(Boolean).join(' / ') || da.map(a => clean(a.name)).filter(Boolean).join(' / ') || '未知歌手',
      album: clean(album.name) || '未知专辑',
      cover: album.picUrl || (d.album && d.album.picUrl) || '',
      duration: (s.duration || s.dt || d.duration || 0) / 1000, fee: s.fee, popularity: s.popularity || 0
    };
  });
  return { songs };
});
ipcMain.handle('netease:resolve', async (_e, id) => {
  const nmId = Number(id);
  if (!Number.isFinite(nmId)) throw new Error('无效歌曲');
  for (const br of [320000, 192000]) {
    const data = await nmJson(`https://music.163.com/api/song/enhance/player/url?ids=[${nmId}]&br=${br}`);
    const item = data && data.data && data.data[0];
    if (item && item.url) return { url: item.url, br: item.br || br, fee: item.fee, size: item.size || 0 };
  }
  return { url: null, reason: '版权或会员限制，该歌曲暂不可在线播放' };
});
ipcMain.handle('netease:lyrics', async (_e, id) => {
  const nmId = Number(id);
  if (!Number.isFinite(nmId)) return { text: '', source: '' };
  const data = await nmJson(`https://music.163.com/api/song/lyric?id=${nmId}&lv=1&tv=1`);
  const lrc = clean(data.lrc && data.lrc.lyric);
  const trans = clean(data.tlyric && data.tlyric.lyric);
  if (!lrc) return { text: '', source: '' };
  return { text: lrc, translation: trans, source: '网易云歌词' };
});

app.whenReady().then(async () => {
  app.setAppUserModelId('com.ymusic.touch');
  await loadState();
  await ensureAnnouncementFiles();
  await ensureSeed();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { if (win) win.removeAllListeners('close'); });












