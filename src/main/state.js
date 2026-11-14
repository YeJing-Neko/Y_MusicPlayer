'use strict';

const {
  DEFAULT_APPEARANCE,
  DEFAULT_SETTINGS,
  DEFAULT_PLAYER_STATE
} = require('./constants');

const state = {
  library: { root: '', scannedAt: null, tracks: [] },
  settings: {
    ...DEFAULT_SETTINGS,
    appearance: { ...DEFAULT_APPEARANCE }
  },
  sections: { sections: [] },
  player: { ...DEFAULT_PLAYER_STATE }
};

module.exports = { state };
