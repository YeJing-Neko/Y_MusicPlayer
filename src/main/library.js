'use strict';

const path = require('node:path');
const fsSync = require('node:fs');
const fsp = require('node:fs/promises');
const crypto = require('node:crypto');
const { state } = require('./state');
const {
  DATA,
  DEMO
} = require('./paths');
const {
  AUDIO_EXT,
  MIME_COVER
} = require('./constants');
const {
  clean,
  stableTrackId,
  jsonWrite,
  hydrate
} = require('./utils');
const { saveSettings } = require('./settings');
const { saveSections } = require('./sections');
const { sendToWindow } = require('./window');

const LIBRARY_FILE = path.join(DATA, 'library.json');

async function loadLibrary() {
  const saved = await require('./utils').jsonRead(LIBRARY_FILE, null);
  if (saved && typeof saved === 'object') {
    state.library = {
      root: typeof saved.root === 'string' ? saved.root : '',
      scannedAt: saved.scannedAt || null,
      tracks: Array.isArray(saved.tracks) ? saved.tracks : []
    };
  }
  return state.library;
}

async function walk(dir, out, depth = 0) {
  if (depth > 14) return;
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '$RECYCLE.BIN') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, out, depth + 1);
    } else if (AUDIO_EXT.has(path.extname(entry.name).toLowerCase())) {
      out.push(full);
    }
  }
}

function titleFromFile(file) {
  return path.basename(file, path.extname(file))
    .replace(/^\s*\d{1,3}[\s._-]+/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function splitName(file) {
  const base = titleFromFile(file);
  const match = base.match(/^(.{1,50}?)\s+[-–—]\s+(.{1,80})$/);
  return match
    ? { artist: match[1].trim(), title: match[2].trim() }
    : { artist: '', title: base };
}

const normalize = (value) => clean(value)
  .toLowerCase()
  .replace(/^\s*\d{1,3}[\s._-]+/, '')
  .replace(/[（(].*?[)）]/g, '')
  .replace(/\s+/g, '');

async function folderExtras(dir, cache) {
  if (cache.has(dir)) return cache.get(dir);
  let entries = [];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {}
  const lrc = entries
    .filter(entry => entry.isFile() && /\.lrc$/i.test(entry.name))
    .map(entry => path.join(dir, entry.name));
  const cover = entries.find(entry => entry.isFile() && /^(cover|folder|front|album|封面)\.(jpe?g|png|webp)$/i.test(entry.name));
  const extras = { lrc, cover: cover ? path.join(dir, cover.name) : null };
  cache.set(dir, extras);
  return extras;
}

function pickLyric(extras, file, title, artist) {
  const stem = normalize(path.basename(file, path.extname(file)));
  const wanted = [
    normalize(title),
    normalize(`${artist} - ${title}`),
    normalize(`${artist}-${title}`)
  ].filter(Boolean);
  for (const lyricPath of extras.lrc) {
    const name = normalize(path.basename(lyricPath, '.lrc'));
    if (name === stem || wanted.includes(name)) return lyricPath;
  }
  return null;
}

async function embeddedLyrics(meta) {
  const items = meta && meta.common && meta.common.lyrics;
  if (!Array.isArray(items)) return '';
  for (const item of items) {
    if (typeof item === 'string' && item.trim()) return item;
    if (item && typeof item.text === 'string' && item.text.trim()) return item.text;
  }
  return '';
}

function pushProgress(done, total, current) {
  sendToWindow('scan:progress', { done, total, current });
}

async function scanLibrary(root) {
  const absRoot = path.resolve(root);
  const stat = await fsp.stat(absRoot).catch(() => null);
  if (!stat || !stat.isDirectory()) throw new Error('文件夹不存在或无法访问');

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
      try {
        meta = await mm.parseFile(file, { duration: true, skipCovers: false });
      } catch {}

      const common = (meta && meta.common) || {};
      const format = (meta && meta.format) || {};
      const guessed = splitName(file);
      const title = clean(common.title) || guessed.title || '未命名曲目';
      let artist = clean(common.artist)
        || (Array.isArray(common.artists) ? clean(common.artists[0]) : '')
        || guessed.artist;
      const album = clean(common.album) || path.basename(path.dirname(file)) || '未知专辑';
      const albumArtist = clean(common.albumartist) || artist;
      if (!artist) artist = '未知歌手';

      const relPath = path.relative(absRoot, file);
      const fileStat = await fsp.stat(file).catch(() => ({ mtimeMs: Date.now(), size: 0 }));
      const durationValue = Number(format.duration) || 0;
      const sizeValue = format.size || fileStat.size || 0;
      const id = stableTrackId({ title, artist, album, duration: durationValue });
      const extras = await folderExtras(path.dirname(file), extrasCache);

      let lyricsPath = '';
      let lyricsSource = '';
      const manual = path.join(DATA, 'lyrics', `manual-${id}.lrc`);
      const sidecar = pickLyric(extras, file, title, artist);
      if (await fsp.stat(manual).then(() => true).catch(() => false)) {
        lyricsPath = manual;
        lyricsSource = '自定义歌词';
      } else if (sidecar) {
        lyricsPath = sidecar;
        lyricsSource = '同目录 LRC';
      } else {
        const embedded = await embeddedLyrics(meta);
        if (embedded) {
          const cacheFile = path.join(DATA, 'lyrics', `${id}.lrc`);
          await fsp.writeFile(cacheFile, embedded, 'utf8').catch(() => {});
          lyricsPath = cacheFile;
          lyricsSource = '内嵌歌词';
        }
      }

      let coverPath = '';
      const picture = Array.isArray(common.picture) && common.picture[0];
      if (picture && picture.data && picture.data.length) {
        const extension = MIME_COVER[clean(picture.format).toLowerCase()] || '.jpg';
        const coverFile = path.join(DATA, 'covers', `${id}${extension}`);
        try {
          if (!(await fsp.stat(coverFile).catch(() => false))) {
            await fsp.writeFile(coverFile, picture.data);
          }
          coverPath = coverFile;
        } catch {}
      } else if (extras.cover) {
        coverPath = extras.cover;
      }

      tracks.push({
        id,
        source: 'local',
        title,
        artist,
        album,
        albumArtist,
        duration: durationValue,
        year: common.year || null,
        genre: (common.genre && common.genre[0]) || '',
        trackNo: (common.track && common.track.no) || null,
        discNo: (common.disc && common.disc.no) || null,
        format: clean(format.container) || path.extname(file).slice(1).toUpperCase(),
        bitrate: format.bitrate || 0,
        sampleRate: format.sampleRate || 0,
        size: sizeValue,
        relPath,
        absPath: file,
        cover: coverPath || null,
        lyricsPath: lyricsPath || null,
        lyricsSource,
        addedAt: Math.floor(fileStat.mtimeMs || Date.now())
      });

      done += 1;
      if (done % 3 === 0 || done === total) pushProgress(done, total, title);
    }
  };

  await Promise.all([worker(), worker(), worker(), worker()]);
  tracks.sort((a, b) => a.artist.localeCompare(b.artist, 'zh-CN')
    || a.album.localeCompare(b.album, 'zh-CN')
    || (a.trackNo || 0) - (b.trackNo || 0)
    || a.title.localeCompare(b.title, 'zh-CN'));

  state.library = { root: absRoot, scannedAt: Date.now(), tracks };
  await jsonWrite(LIBRARY_FILE, state.library);
  state.settings.libraryRoot = absRoot;
  await saveSettings();

  return {
    root: absRoot,
    scannedAt: state.library.scannedAt,
    missing: 0,
    tracks: tracks.map(hydrate)
  };
}

async function ensureSeed() {
  if (state.library.root || state.library.tracks.length) return;
  if (!(await fsp.stat(DEMO).then(s => s.isDirectory()).catch(() => false))) return;

  try {
    await scanLibrary(DEMO);
    if (!state.sections.sections.length && state.library.tracks.length) {
      const allIds = state.library.tracks.map(track => track.id);
      const forestIds = state.library.tracks
        .filter(track => track.artist === '林间电台' || track.album === '苔原来信')
        .map(track => track.id);
      await saveSections([
        {
          id: 'seed-night',
          title: '深夜专注',
          subtitle: '关掉喧闹，留一盏小灯',
          emoji: '🌙',
          color: 'moss',
          trackIds: (forestIds.length ? forestIds : allIds).slice(0, 3)
        },
        {
          id: 'seed-morning',
          title: '清晨慢醒',
          subtitle: '让今天从一段柔和的旋律开始',
          emoji: '☀️',
          color: 'amber',
          trackIds: state.library.tracks
            .filter(track => track.album === '夜航星图')
            .map(track => track.id)
            .slice(0, 3)
        }
      ]);
    }
  } catch (error) {
    console.error('seed failed', error);
  }
}

async function repairDemoPaths() {
  if (!state.library.root) return;
  if (path.basename(state.library.root).toLowerCase() !== 'demo_music') return;

  const rootOk = await fsp.stat(state.library.root).then(s => s.isDirectory()).catch(() => false);
  const demoOk = await fsp.stat(DEMO).then(s => s.isDirectory()).catch(() => false);
  if (rootOk || !demoOk || !state.library.tracks.length) return;
  if (!state.library.tracks.every(track => track.relPath && fsSync.existsSync(path.join(DEMO, track.relPath)))) return;

  state.library.root = DEMO;
  for (const track of state.library.tracks) {
    track.absPath = path.join(DEMO, track.relPath);
    if (track.cover) track.cover = path.join(DATA, 'covers', path.basename(track.cover));
    if (track.lyricsPath) {
      track.lyricsPath = track.lyricsSource === '同目录 LRC'
        ? path.join(path.dirname(track.absPath), path.basename(track.lyricsPath))
        : path.join(DATA, 'lyrics', path.basename(track.lyricsPath));
    }
  }
  await jsonWrite(LIBRARY_FILE, state.library);
}

function missingCount() {
  return state.library.tracks.reduce((count, track) => count + (fsSync.existsSync(track.absPath) ? 0 : 1), 0);
}

function getLibraryPayload() {
  return {
    root: state.library.root,
    scannedAt: state.library.scannedAt,
    missing: missingCount(),
    tracks: state.library.tracks.map(hydrate)
  };
}

function getTrack(id) {
  return state.library.tracks.find(track => track.id === id) || null;
}

module.exports = {
  loadLibrary,
  scanLibrary,
  ensureSeed,
  repairDemoPaths,
  getLibraryPayload,
  missingCount,
  getTrack
};
