'use strict';

const { BrowserWindow, Menu, screen, shell } = require('electron');
const path = require('node:path');
const {
  APP_DIR,
  PRELOAD
} = require('./paths');

let mainWindow = null;

function sendToWindow(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1680,
    height: 980,
    minWidth: 1040,
    minHeight: 680,
    show: false,
    frame: false,
    backgroundColor: '#cadbe9',
    autoHideMenuBar: true,
    title: 'Y_Music · 白板音乐空间',
    icon: path.join(APP_DIR, 'icon.png'),
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false
    }
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadFile(path.join(APP_DIR, 'index.html'));
  if (!process.argv.includes('--windowed')) mainWindow.maximize();

  mainWindow.webContents.on('did-finish-load', () => {
    try {
      const width = screen.getPrimaryDisplay().workAreaSize.width;
      const factor = width >= 3000 ? 1.34 : width >= 2400 ? 1.18 : width >= 2000 ? 1.07 : 1;
      if (factor !== 1) mainWindow.webContents.setZoomFactor(factor);
    } catch {}
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (process.argv.includes('--devtools')) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

function getMainWindow() {
  return mainWindow;
}

module.exports = {
  createMainWindow,
  getMainWindow,
  sendToWindow
};
