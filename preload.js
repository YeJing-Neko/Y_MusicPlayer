const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('musicAPI', {
  info: () => ipcRenderer.invoke('app:info'),
  getAnnouncement: () => ipcRenderer.invoke('announcement:get'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  getLibrary: () => ipcRenderer.invoke('library:get'),
  chooseLibrary: () => ipcRenderer.invoke('library:choose'),
  scanLibrary: (root) => ipcRenderer.invoke('library:scan', root),
  revealLibrary: () => ipcRenderer.invoke('library:reveal'),
  getLyrics: (id) => ipcRenderer.invoke('lyrics:get', id),
  importLyrics: (id) => ipcRenderer.invoke('lyrics:import', id),
  getSections: () => ipcRenderer.invoke('sections:get'),
  saveSections: (sections) => ipcRenderer.invoke('sections:save', sections),
  getPlayerState: () => ipcRenderer.invoke('player:get'),
  savePlayerState: (state) => ipcRenderer.invoke('player:save', state),
  openData: () => ipcRenderer.invoke('app:openData'),
  toggleFullscreen: () => ipcRenderer.invoke('app:fullscreen'),
  minimize: () => ipcRenderer.invoke('app:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('app:toggleMaximize'),
  close: () => ipcRenderer.invoke('app:close'),
  neteaseSearch: (q) => ipcRenderer.invoke('netease:search', q),
  neteaseResolve: (id) => ipcRenderer.invoke('netease:resolve', id),
  neteaseLyrics: (id) => ipcRenderer.invoke('netease:lyrics', id),
  onScanProgress: (cb) => {
    const listener = (_e, data) => cb(data);
    ipcRenderer.on('scan:progress', listener);
    return () => ipcRenderer.removeListener('scan:progress', listener);
  }
});
