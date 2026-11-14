'use strict';

const path = require('node:path');
const fsp = require('node:fs/promises');
const { app, ipcMain, dialog, shell } = require('electron');
const {
  DATA,
  DEMO,
  ANNOUNCE_MD
} = require('./paths');
const { state } = require('./state');
const {
  jsonWrite,
  readTextFile
} = require('./utils');
const {
  getMainWindow
} = require('./window');
const {
  scanLibrary,
  getLibraryPayload,
  getTrack
} = require('./library');
const {
  publicSettings,
  saveSettings
} = require('./settings');
const {
  saveSections
} = require('./sections');
const {
  publicPlayerState,
  savePlayerState
} = require('./player-state');
const {
  getLyrics
} = require('./lyrics');
const {
  getAnnouncement
} = require('./announcement');

function registerIpc() {
  ipcMain.handle('app:info', async () => {
    const win = getMainWindow();
    return {
      version: app.getVersion(),
      dataDir: DATA,
      demoDir: DEMO,
      isFullscreen: win ? win.isFullScreen() : false,
      platform: process.platform
    };
  });

  ipcMain.handle('announcement:get', async () => getAnnouncement());

  ipcMain.handle('settings:get', async () => publicSettings());
  ipcMain.handle('settings:save', async (_event, patch) => saveSettings(patch));

  ipcMain.handle('library:get', async () => getLibraryPayload());
  ipcMain.handle('library:choose', async () => {
    const result = await dialog.showOpenDialog(getMainWindow(), {
      title: '选择音乐文件夹',
      properties: ['openDirectory'],
      defaultPath: state.settings.libraryRoot || DEMO
    });
    if (result.canceled || !result.filePaths[0]) return null;
    state.settings.libraryRoot = result.filePaths[0];
    await saveSettings();
    return result.filePaths[0];
  });
  ipcMain.handle('library:scan', async (_event, root) => {
    const target = typeof root === 'string' && root ? root : state.settings.libraryRoot;
    if (!target) throw new Error('还没有选择音乐文件夹');
    return scanLibrary(target);
  });
  ipcMain.handle('library:reveal', async () => {
    if (state.library.root) await shell.openPath(state.library.root);
  });

  ipcMain.handle('lyrics:get', async (_event, id) => getLyrics(id));
  ipcMain.handle('lyrics:import', async (_event, id) => {
    const track = getTrack(id);
    if (!track) throw new Error('未找到歌曲');

    const result = await dialog.showOpenDialog(getMainWindow(), {
      title: '选择 LRC 歌词',
      properties: ['openFile'],
      filters: [{ name: '歌词', extensions: ['lrc', 'txt'] }]
    });
    if (result.canceled || !result.filePaths[0]) return null;

    const text = await readTextFile(result.filePaths[0]);
    const target = path.join(DATA, 'lyrics', `manual-${id}.lrc`);
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.writeFile(target, text, 'utf8');
    track.lyricsPath = target;
    track.lyricsSource = '自定义歌词';
    await jsonWrite(path.join(DATA, 'library.json'), state.library);
    return { text, source: track.lyricsSource };
  });

  ipcMain.handle('sections:get', async () => state.sections);
  ipcMain.handle('sections:save', async (_event, incoming) => saveSections(incoming));

  ipcMain.handle('player:get', async () => publicPlayerState());
  ipcMain.handle('player:save', async (_event, player) => savePlayerState(player));

  ipcMain.handle('app:openData', async () => shell.openPath(DATA));
  ipcMain.handle('app:openAnnouncement', async () => shell.openPath(ANNOUNCE_MD));
  ipcMain.handle('app:fullscreen', async () => {
    const win = getMainWindow();
    if (!win) return false;
    win.setFullScreen(!win.isFullScreen());
    return win.isFullScreen();
  });
  ipcMain.handle('app:minimize', async () => {
    const win = getMainWindow();
    if (win) win.minimize();
  });
  ipcMain.handle('app:toggleMaximize', async () => {
    const win = getMainWindow();
    if (!win) return false;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
    return win.isMaximized();
  });
  ipcMain.handle('app:close', async () => {
    const win = getMainWindow();
    if (win) win.close();
  });

}

module.exports = { registerIpc };
