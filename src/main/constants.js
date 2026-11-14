'use strict';

const AUDIO_EXT = new Set(['.mp3', '.flac', '.wav', '.m4a', '.aac', '.ogg', '.opus']);

const MIME_COVER = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/bmp': '.bmp'
};

const DEFAULT_APPEARANCE = {
  theme: 'salt',
  motion: 'silky',
  bgOpacity: 1,
  lyricScale: 1
};

const DEFAULT_SETTINGS = {
  volume: 0.8,
  playerHeight: 94,
  appearance: { ...DEFAULT_APPEARANCE },
  lyricSize: 'large',
  reduceMotion: false,
  showWelcome: true,
  lastView: 'home'
};

const DEFAULT_PLAYER_STATE = {
  favorites: [],
  recent: [],
  queue: [],
  currentId: null,
  position: 0,
  plays: {},
  shuffle: false,
  repeat: 'all'
};

const THEME_KEYS = ['salt', 'moss', 'peach', 'rose', 'lavender', 'graphite', 'ios', 'netease'];
const MOTION_KEYS = ['silky', 'light', 'off'];

const DEFAULT_ANNOUNCEMENT_MD = `# Y_Music 2.0 全新启航

欢迎回来，这里是夜静为你准备的本地音乐空间。

## 最近更新
- 全新流光启动界面，每次启航都有仪式感
- 新增 iOS 与网易云主题
- 全局图标统一为线性图标
- 播放器高度、歌词字号与封面氛围可调
- 睡眠定时器、触摸滑动切歌、Lyricify 风格歌词动效
- 设置与歌单全部保存在 \`data/\`，可随程序目录迁移

## 小提示
启动界面可以在「设置 → 外观与动效」中关闭；把 \`.lrc\` 放在歌曲旁边即可自动匹配歌词。

© 2026 夜静 · [github.com/YeJing-Neko](https://github.com/YeJing-Neko)
`;

module.exports = {
  AUDIO_EXT,
  MIME_COVER,
  DEFAULT_APPEARANCE,
  DEFAULT_SETTINGS,
  DEFAULT_PLAYER_STATE,
  THEME_KEYS,
  MOTION_KEYS,
  DEFAULT_ANNOUNCEMENT_MD
};
