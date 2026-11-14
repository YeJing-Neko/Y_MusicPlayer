'use strict';

const { app, BrowserWindow } = require('electron');

// Set the product name before paths.js reads app.getPath('userData').
app.setName('Y_Music');
app.setAppUserModelId('com.yejing.y-music');

const { ensureDataDirs } = require('./paths');
const {
  loadLibrary,
  repairDemoPaths,
  ensureSeed
} = require('./library');
const { loadSettings } = require('./settings');
const { loadSections } = require('./sections');
const { loadPlayerState } = require('./player-state');
const { migrateStableIds } = require('./migration');
const { ensureAnnouncementFiles } = require('./announcement');
const { registerIpc } = require('./ipc');
const { createMainWindow, getMainWindow } = require('./window');

async function boot() {
  await ensureDataDirs();
  await loadSettings();
  await loadLibrary();
  await loadSections();
  await loadPlayerState();
  await migrateStableIds();
  await repairDemoPaths();
  await ensureSeed();
  await ensureAnnouncementFiles();

  registerIpc();
  createMainWindow();
}

app.whenReady().then(() => {
  boot().catch(error => {
    console.error('Y_Music failed to start:', error);
    if (!getMainWindow()) createMainWindow();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
