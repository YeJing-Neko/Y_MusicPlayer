'use strict';

const { app } = require('electron');
const fsSync = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const {
  DATA,
  ANNOUNCE_JSON,
  ANNOUNCE_MD
} = require('./paths');
const {
  DEFAULT_ANNOUNCEMENT_MD
} = require('./constants');
const {
  jsonRead,
  readTextFile,
  clean
} = require('./utils');

async function ensureAnnouncementFiles() {
  await fsp.mkdir(DATA, { recursive: true });

  if (!fsSync.existsSync(ANNOUNCE_MD)) {
    await fsp.writeFile(ANNOUNCE_MD, DEFAULT_ANNOUNCEMENT_MD, 'utf8');
  }

  if (!fsSync.existsSync(ANNOUNCE_JSON)) {
    await fsp.writeFile(ANNOUNCE_JSON, JSON.stringify({
      enabled: true,
      version: `v${app.getVersion()}`,
      title: 'Y_Music 版本提示',
      file: 'announcement.md',
      autoCloseSeconds: 10
    }, null, 2), 'utf8');
  }
}

async function getAnnouncement() {
  await ensureAnnouncementFiles();
  const config = await jsonRead(ANNOUNCE_JSON, {});
  if (config.enabled === false) return { enabled: false };

  const fileName = path.basename(clean(config.file) || 'announcement.md');
  const content = await readTextFile(path.join(DATA, fileName)).catch(() => '');
  return {
    enabled: true,
    version: clean(config.version) || `v${app.getVersion()}`,
    title: clean(config.title) || '版本提示',
    content,
    autoCloseSeconds: Math.max(3, Math.min(60, Number(config.autoCloseSeconds) || 10)),
    file: fileName
  };
}

module.exports = {
  ensureAnnouncementFiles,
  getAnnouncement
};
