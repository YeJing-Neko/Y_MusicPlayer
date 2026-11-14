'use strict';

const { state } = require('./state');
const { readTextFile } = require('./utils');

function findTrack(id) {
  return state.library.tracks.find(track => track.id === id) || null;
}

async function getLyrics(id) {
  const track = findTrack(id);
  if (!track || !track.lyricsPath) return { text: '', source: '' };
  try {
    return { text: await readTextFile(track.lyricsPath), source: track.lyricsSource };
  } catch {
    return { text: '', source: '' };
  }
}

module.exports = {
  findTrack,
  getLyrics
};
