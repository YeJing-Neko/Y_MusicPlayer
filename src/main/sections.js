'use strict';

const path = require('node:path');
const crypto = require('node:crypto');
const { state } = require('./state');
const { DATA } = require('./paths');
const { jsonRead, jsonWrite, clean, safeId } = require('./utils');

const SECTIONS_FILE = path.join(DATA, 'sections.json');
const SECTION_COLORS = ['moss', 'amber', 'ocean', 'rose', 'violet', 'paper'];
const SECTION_ICONS = ['headphones', 'moon', 'sun', 'leaf', 'waves', 'coffee', 'planet', 'book', 'candle', 'sparkles', 'heart', 'music'];
const LEGACY_ICONS = {
  '♥': 'heart', '🎧': 'headphones', '🌙': 'moon', '☀️': 'sun', '🌿': 'leaf',
  '🌊': 'waves', '☕': 'coffee', '🪐': 'planet', '📖': 'book', '🕯️': 'candle',
  '🍃': 'leaf', '🌾': 'leaf', '✨': 'sparkles', '♫': 'music', '♪': 'music', '🎵': 'music'
};

async function loadSections() {
  const saved = await jsonRead(SECTIONS_FILE, state.sections);
  state.sections = saved && Array.isArray(saved.sections) ? saved : { sections: [] };
  return state.sections;
}

function normalizeIcon(section) {
  const raw = clean(section.icon || section.emoji);
  if (SECTION_ICONS.includes(raw)) return raw;
  return LEGACY_ICONS[raw] || 'headphones';
}

function normalizeSections(incoming) {
  const list = Array.isArray(incoming) ? incoming.slice(0, 60) : [];
  const validIds = new Set(state.library.tracks.map(t => t.id));
  return {
    sections: list.map(section => ({
      id: safeId(section.id) ? section.id : crypto.randomUUID().slice(0, 16),
      title: clean(section.title).slice(0, 30) || '未命名专区',
      subtitle: clean(section.subtitle).slice(0, 80),
      icon: normalizeIcon(section),
      color: SECTION_COLORS.includes(section.color) ? section.color : 'moss',
      trackIds: (Array.isArray(section.trackIds) ? section.trackIds : []).filter(id => validIds.has(id)),
      createdAt: section.createdAt || Date.now(),
      updatedAt: Date.now()
    }))
  };
}

async function saveSections(incoming) {
  state.sections = normalizeSections(incoming);
  await jsonWrite(SECTIONS_FILE, state.sections);
  return state.sections;
}

module.exports = {
  loadSections,
  saveSections
};
