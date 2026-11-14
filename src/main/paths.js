'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');

// src/main -> project root in development, app.asar root in production.
const ROOT = path.resolve(__dirname, '..', '..');
const APP_DIR = path.join(ROOT, 'app');
const PRELOAD = path.join(ROOT, 'src', 'preload', 'index.js');
const IS_PACKAGED = app.isPackaged;
const DEMO = IS_PACKAGED
  ? path.join(process.resourcesPath, 'demo_music')
  : path.join(ROOT, 'demo_music');

function resolveDataDir() {
  if (process.env.YMUSIC_DATA_DIR) return path.resolve(process.env.YMUSIC_DATA_DIR);

  // Development keeps the historical project-local data/ folder.
  if (!IS_PACKAGED) return path.join(ROOT, 'data');

  // electron-builder's portable target exposes the directory of the .exe.
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    return path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'data');
  }

  // Optional green/portable mode for any packaged build.
  if (process.argv.includes('--portable')) {
    return path.join(path.dirname(process.execPath), 'data');
  }

  // Installed builds use the platform's per-user application data directory.
  return path.join(app.getPath('userData'), 'data');
}

const DATA = resolveDataDir();
const ANNOUNCE_JSON = path.join(DATA, 'announcement.json');
const ANNOUNCE_MD = path.join(DATA, 'announcement.md');

function ensureDataDirs() {
  for (const dir of [DATA, path.join(DATA, 'covers'), path.join(DATA, 'lyrics')]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

module.exports = {
  ROOT,
  APP_DIR,
  PRELOAD,
  IS_PACKAGED,
  DEMO,
  DATA,
  ANNOUNCE_JSON,
  ANNOUNCE_MD,
  resolveDataDir,
  ensureDataDirs
};
