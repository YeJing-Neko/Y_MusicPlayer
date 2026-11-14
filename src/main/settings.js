'use strict';

const path = require('node:path');
const { state } = require('./state');
const { DATA } = require('./paths');
const { jsonRead, jsonWrite } = require('./utils');
const {
  DEFAULT_APPEARANCE,
  THEME_KEYS,
  MOTION_KEYS
} = require('./constants');

const SETTINGS_FILE = path.join(DATA, 'settings.json');

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

async function loadSettings() {
  const saved = await jsonRead(SETTINGS_FILE, {});
  const next = Object.assign({}, state.settings, saved);
  next.appearance = { ...DEFAULT_APPEARANCE, ...(saved.appearance || {}) };
  next.volume = clampNumber(next.volume, 0, 1, 0.8);
  next.playerHeight = Math.round(clampNumber(next.playerHeight, 76, 150, 94));
  next.showWelcome = next.showWelcome !== false;
  state.settings = next;
  return state.settings;
}

function publicSettings() {
  return {
    volume: state.settings.volume,
    playerHeight: state.settings.playerHeight,
    showWelcome: state.settings.showWelcome !== false,
    appearance: { ...DEFAULT_APPEARANCE, ...(state.settings.appearance || {}) }
  };
}

async function saveSettings(patch) {
  if (patch && typeof patch === 'object') {
    if (patch.volume != null) {
      state.settings.volume = clampNumber(patch.volume, 0, 1, 0.8);
    }
    if (patch.playerHeight != null) {
      state.settings.playerHeight = Math.round(clampNumber(patch.playerHeight, 76, 150, 94));
    }
    if (patch.showWelcome != null) {
      state.settings.showWelcome = !!patch.showWelcome;
    }
    if (patch.appearance && typeof patch.appearance === 'object') {
      const a = patch.appearance;
      const current = state.settings.appearance || DEFAULT_APPEARANCE;
      state.settings.appearance = {
        theme: THEME_KEYS.includes(a.theme) ? a.theme : (current.theme || 'salt'),
        motion: MOTION_KEYS.includes(a.motion) ? a.motion : (current.motion || 'silky'),
        bgOpacity: clampNumber(a.bgOpacity, 0.5, 1, 1),
        lyricScale: clampNumber(a.lyricScale, 0.8, 1.4, 1)
      };
    }
  }
  await jsonWrite(SETTINGS_FILE, state.settings);
  return publicSettings();
}

module.exports = {
  loadSettings,
  publicSettings,
  saveSettings
};
