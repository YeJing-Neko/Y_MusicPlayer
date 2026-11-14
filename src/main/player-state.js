'use strict';

const path = require('node:path');
const { state } = require('./state');
const { DATA } = require('./paths');
const { jsonRead, jsonWrite } = require('./utils');
const { DEFAULT_PLAYER_STATE } = require('./constants');

const PLAYER_FILE = path.join(DATA, 'player.json');

async function loadPlayerState() {
  const saved = await jsonRead(PLAYER_FILE, {});
  const next = Object.assign({}, DEFAULT_PLAYER_STATE, saved);
  if (!Array.isArray(next.favorites)) next.favorites = [];
  if (!Array.isArray(next.recent)) next.recent = [];
  if (!Array.isArray(next.queue)) next.queue = [];
  if (!next.plays || typeof next.plays !== 'object') next.plays = {};
  state.player = next;
  return state.player;
}

function publicPlayerState() {
  return state.player;
}

async function savePlayerState(input) {
  if (!input || typeof input !== 'object') return state.player;
  const validIds = new Set(state.library.tracks.map(t => t.id));
  const localQueue = (Array.isArray(input.queue) ? input.queue : [])
    .filter(t => t && t.source === 'local' && validIds.has(t.id))
    .slice(0, 500);

  state.player = {
    favorites: (Array.isArray(input.favorites) ? input.favorites : [])
      .filter(id => validIds.has(id)).slice(0, 3000),
    recent: (Array.isArray(input.recent) ? input.recent : [])
      .filter(id => validIds.has(id)).slice(0, 40),
    queue: localQueue.map(t => ({ id: t.id, source: 'local' })),
    currentId: validIds.has(input.currentId) ? input.currentId : null,
    position: Math.max(0, Math.min(86400, Number(input.position) || 0)),
    plays: Object.fromEntries(
      Object.entries(input.plays || {})
        .filter(([id]) => validIds.has(id))
        .slice(0, 3000)
        .map(([id, n]) => [id, Math.max(0, Math.min(999999, Number(n) || 0))])
    ),
    shuffle: !!input.shuffle,
    repeat: ['off', 'all', 'one'].includes(input.repeat) ? input.repeat : 'all'
  };

  await jsonWrite(PLAYER_FILE, state.player);
  return state.player;
}

module.exports = {
  loadPlayerState,
  publicPlayerState,
  savePlayerState
};
