'use strict';

const path = require('node:path');
const fsp = require('node:fs/promises');
const crypto = require('node:crypto');
const iconv = require('iconv-lite');
const { pathToFileURL } = require('node:url');

const clean = (value) => String(value == null ? '' : value).replace(/\0/g, '').trim();

function stableTrackId(track) {
  const key = [
    clean(track.title).toLowerCase(),
    clean(track.artist).toLowerCase(),
    clean(track.album).toLowerCase(),
    Math.round(Number(track.duration) || 0)
  ].join('|');
  return crypto.createHash('sha1').update(key).digest('hex').slice(0, 16);
}

const jsonRead = async (file, fallback) => {
  try {
    return JSON.parse(await fsp.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
};

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
  const tmp = `${file}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(value, null, 2), 'utf8');
  await fsp.rename(tmp, file);
}

function safeId(id) {
  return /^[a-zA-Z0-9_-]{4,48}$/.test(String(id));
}

function hydrate(track) {
  return {
    ...track,
    url: pathToFileURL(track.absPath).href,
    coverUrl: track.cover ? pathToFileURL(track.cover).href : null
  };
}

module.exports = {
  clean,
  stableTrackId,
  jsonRead,
  jsonWrite,
  readTextFile,
  safeId,
  hydrate
};
