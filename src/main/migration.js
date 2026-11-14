'use strict';

const path = require('node:path');
const fsSync = require('node:fs');
const { state } = require('./state');
const { DATA } = require('./paths');
const { jsonWrite, stableTrackId } = require('./utils');

async function migrateStableIds() {
  const map = new Map();
  const used = new Set();
  const nextTracks = [];
  let changed = false;

  for (const track of state.library.tracks) {
    const nextId = stableTrackId(track);
    if (nextId !== track.id) {
      map.set(track.id, nextId);
      track.legacyId = track.legacyId || track.id;
      track.id = nextId;
      changed = true;
    }
    if (!used.has(track.id)) {
      used.add(track.id);
      nextTracks.push(track);
    } else {
      changed = true;
    }
  }

  if (nextTracks.length !== state.library.tracks.length) {
    state.library.tracks = nextTracks;
  }
  if (!changed) return false;

  const remap = (id) => map.get(id) || id;

  for (const section of state.sections.sections) {
    if (!Array.isArray(section.trackIds)) continue;
    section.trackIds = [...new Set(section.trackIds.map(remap).filter(id => used.has(id)))];
  }

  state.player.favorites = [...new Set((state.player.favorites || []).map(remap).filter(id => used.has(id)))];
  state.player.recent = (state.player.recent || []).map(remap).filter(id => used.has(id));
  state.player.queue = (state.player.queue || [])
    .map(item => ({ ...item, id: remap(item.id) }))
    .filter(item => used.has(item.id));
  state.player.currentId = state.player.currentId ? remap(state.player.currentId) : null;
  if (state.player.currentId && !used.has(state.player.currentId)) state.player.currentId = null;
  state.player.plays = Object.fromEntries(
    Object.entries(state.player.plays || {})
      .map(([id, count]) => [remap(id), count])
      .filter(([id]) => used.has(id))
  );

  for (const track of state.library.tracks) {
    if (!track.lyricsPath) continue;
    const base = path.basename(track.lyricsPath);
    for (const [oldId, newId] of map) {
      if (!base.includes(oldId)) continue;
      const nextName = base.replace(oldId, newId);
      const target = track.lyricsSource === '同目录 LRC'
        ? path.join(path.dirname(track.lyricsPath), nextName)
        : path.join(DATA, 'lyrics', nextName);
      try {
        if (!fsSync.existsSync(target)) fsSync.copyFileSync(track.lyricsPath, target);
      } catch {}
      if (fsSync.existsSync(target)) track.lyricsPath = target;
    }
  }

  await jsonWrite(path.join(DATA, 'library.json'), state.library);
  await jsonWrite(path.join(DATA, 'sections.json'), state.sections);
  await jsonWrite(path.join(DATA, 'player.json'), state.player);
  return true;
}

module.exports = { migrateStableIds };
