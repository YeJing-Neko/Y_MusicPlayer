<div align="center">

# Y_Music

**本地优先 · 触摸友好 · 白板音乐空间**

A local-first, touch-friendly music player for interactive whiteboards.

![Version](https://img.shields.io/badge/Version-2.0.0-0a84ff?style=flat-square)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-4f8aa8?style=flat-square)
![Electron](https://img.shields.io/badge/Electron-45-47848F?style=flat-square&logo=electron&logoColor=white)
![Local First](https://img.shields.io/badge/Local--First-No%20Server-5f8f71?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-c08a62?style=flat-square)

</div>

Y_Music 是一个为**触摸白板、横屏展示和桌面大屏**设计的本地音乐播放器。它不依赖音乐服务器：扫描本地文件夹、读取音频标签与封面、自动匹配歌词，歌单、收藏和播放记录全部保存在独立的 `data/` 目录里。2.0 版本加入流光启航界面、iOS / 网易云主题和统一线性图标。

界面结构参考 [Sylvakru](https://github.com/AfalpHy/sylvakru) 的浅色磨砂风格，全屏歌词动效参考 [Lyricify](https://github.com/WXRIW/Lyricify-App)，2.0 启航界面使用纯 CSS 流光与极光动画。使用 Electron + 原生 Web Audio 实现，支持 Windows、macOS 和 Linux。

## 2.0 更新

这是 Y_Music 的第二个大版本，重点是把播放器真正做成完整的本地音乐空间：

- **2.0 流光启航**：首次启动展示全屏极光 / 流光界面，支持「开始聆听」与「跳过」，可在设置中关闭每次启动展示。
- **真正的全局主题**：新增 iOS 与网易云主题，页面、侧栏、卡片、搜索框、按钮、播放器、进度条和歌单图标会一起切换，而不是只换强调色。
- **统一图标系统**：界面和歌单全部改用内置线性 SVG 图标，并统一歌单封面左上角图标的位置与尺寸。
- **完全本地化**：移除在线音乐接口与相关搜索入口，曲库、歌词、歌单和播放记录只保存在本机。
- **工程重构**：主进程与渲染进程拆分为独立模块，加入 electron-builder 打包和三平台 GitHub Actions 构建。

![Y_Music 主界面](preview.png)

![全局外观设置](customization.png)

## 为什么是 Y_Music

- **本地优先**：曲库、封面、歌词、歌单都在本机，断网也能完整使用。
- **为大屏和触摸设计**：更大的按钮、可调播放器高度、可调歌词字号、触屏手势。
- **歌单跟着数据走**：设置与歌单保存为普通 JSON，复制 `data/`（或使用免安装版）即可带到另一台电脑。
- **不只好看**：自动歌词、内嵌封面、睡眠定时器、全局主题、丝滑动效。
- **无账号体系**：不需要登录，不上传个人数据。

## 主要功能

### 本地音乐库

- 扫描 MP3 / FLAC / WAV / M4A / AAC / OGG / Opus。
- 读取标题、艺术家、专辑、音轨、年份、时长、码率、内嵌封面。
- 无内嵌封面时自动寻找同目录 `cover.jpg` / `folder.jpg`。
- 按艺术家、专辑、文件夹自动归类；标签缺失时使用文件名和文件夹名回退。
- 播放全部、随机播放、队列、单曲循环、列表循环、收藏。
- 「听歌排行」按本机播放次数统计，不联网。
- 支持 4K / 大屏自动缩放。

### 自动歌词

- 优先匹配歌曲同目录、同名的 `.lrc`，支持 `01 歌名.lrc` 等前缀。
- 没有同名歌词时读取内嵌歌词（ID3 USLT / LYRICS 等）。
- 支持 UTF-8、UTF-8 BOM、UTF-16、GB18030 / GBK 编码。
- 支持 `[mm:ss.xx]`、多时间标签、翻译行和 `[offset:]`。
- 全屏歌词采用 Lyricify 风格：当前行放大高亮、相邻行景深模糊、平滑逐行滚动、渐进填色与翻译行适配。
- 沉浸页可点击歌词跳转，可整体提前 / 延后 0.5 秒，可手动导入 / 替换 LRC。

### 可编辑歌单

- 新建、改名、写说明、选颜色与图标。
- 从曲库多选歌曲，随时增删。
- 只保存歌曲引用，不复制、不修改音频文件。
- 「我喜欢的」为内置歌单，同样保存在本地。

### 全局个性化

- 8 套全局主题：海盐、青苔、蜜桃、樱粉、雾紫、石墨、iOS、网易云。iOS 与网易云会整体替换页面、侧栏、卡片、按钮、播放器和图标样式，而不只是换强调色。
- 3 档动效：丝滑 / 轻盈 / 关闭。
- 可调封面氛围、播放器高度（76–150px）、歌词字号（80%–140%）。
- 所有界面图标统一使用内置线性 SVG 图标，不再混用 emoji。
- 设置实时写入 `data/settings.json`，所有页面同步生效。
- 主题、动效和播放器尺寸会随数据目录一起迁移。

### 2.0 启航界面

![2.0 启航界面](welcome.png)

- 启动时展示全屏流光 / 极光启动页：`2.0 全新启航`（默认开启）。
- 「开始聆听」或「跳过」进入主页；`Enter` / `Space` / `Esc` 也可进入。
- 设置中可开关「每次启动时展示 2.0 启航界面」，选择会持久化到 `data/settings.json`。
- 尊重系统「减少动态效果」设置，并提供低动态模式。

### 触摸大屏增强

- 睡眠定时器：15 / 30 / 45 / 60 / 90 分钟后自动暂停，倒计时显示在播放器上。
- 播放器空白区或沉浸页左右滑动切换上一首 / 下一首。
- 页面切换、封面呼吸、环境背景漂浮等轻量动效。
- 主要按钮按触摸尺寸设计，手指可直接操作。

### 本地公告

启动播放器时会在左下角显示版本提示小窗，可点击「查看公告」阅读完整 Markdown；默认 **10 秒**后自动关闭。

公告完全本地化：

- `data/announcement.md`：公告正文，直接写 Markdown。
- `data/announcement.json`：开关、版本号、标题和自动关闭秒数。

```json
{
  "enabled": true,
  "version": "v2.0.0",
  "title": "Y_Music 2.0 全新启航",
  "file": "announcement.md",
  "autoCloseSeconds": 10
}
```

把 `enabled` 改为 `false` 即可关闭启动提示。修改后重启生效；也可以在「设置 → 本地数据 → 本地公告」再次查看。

## 快速开始

### 直接运行

从 GitHub Releases 下载对应系统的安装包：

- Windows：`Y_Music-Setup-2.0.0.exe`（安装版）或 `Y_Music-2.0.0-portable.exe`（免安装版）
- macOS：`Y_Music-2.0.0-*.dmg`
- Linux：`Y_Music-2.0.0-*.AppImage` 或 `.deb`

Windows 未签名安装包可能触发 SmartScreen，选择「更多信息 → 仍要运行」即可。免安装版把数据保存在 exe 同级的 `data/`；安装版保存在用户数据目录，见下方「数据与隐私」。

### 从源码运行

需要 Node.js 20 或更高版本。Windows、macOS 和 Linux 都可以直接运行：

```bash
npm install
npm start
```

也可以只打开窗口、不自动最大化：

```bash
npm run windowed
```

首次启动且没有曲库数据时，会自动载入 `demo_music` 中的 6 首示例歌曲和歌词。

### 构建安装包

```bash
npm install

# 当前系统
npm run build

# 指定平台（建议在对应系统上构建）
npm run build:win
npm run build:mac
npm run build:linux
```

构建结果在 `release/`。Windows 产出 NSIS 安装版和 portable 单文件版；macOS 产出 dmg/zip；Linux 产出 AppImage/deb。仓库内的 `.github/workflows/build.yml` 也会在推送 `v*` 标签或手动触发时，用三个系统分别构建并上传产物。

### 便携目录（源码版）

如果目录已经包含 `node_modules`，可以直接双击：

```text
启动 Y_Music.cmd
```

把整个源码目录复制到另一台 Windows 电脑后仍可使用；若 `node_modules` 被删除，执行一次 `npm install` 即可恢复。

### 使用自己的音乐

1. 打开「设置 → 本地音乐库」。
2. 点击「选择文件夹」，选中音乐目录。
3. 等待扫描完成；封面、歌词和标签会自动建立索引。
4. 在「所有歌曲」「艺术家」「专辑」「文件夹」中浏览，或新建歌单。

> 首次扫描会写入 `data/`。请不要把个人的 `data/` 和 `node_modules/` 提交到 Git；仓库已经通过 `.gitignore` 排除它们。

## 数据与隐私

个人数据保存在 `data/`，位置随运行方式变化：

| 运行方式 | 数据目录 |
| --- | --- |
| 源码 / 开发 | 项目根目录 `data/` |
| Windows 免安装版 | exe 同级的 `data/` |
| Windows 安装版 | `%APPDATA%\Y_Music\data` |
| macOS | `~/Library/Application Support/Y_Music/data` |
| Linux | `~/.config/Y_Music/data` |

```text
data/
├─ library.json       本地曲库索引
├─ sections.json      自定义歌单与收藏
├─ player.json        队列、收藏、最近播放、播放次数
├─ settings.json      曲库路径、主题、动效、播放器高度、音量
├─ announcement.md    启动公告正文
├─ announcement.json  公告开关、版本、标题、自动关闭秒数
├─ covers/            自动缓存的封面
└─ lyrics/            内嵌或手动导入的歌词
```

- 程序不收集、不上传个人数据，也没有任何在线音乐接口。
- 主题、动效、歌单、收藏和播放记录都是全局配置，不依赖浏览器缓存。
- 曲目使用稳定的元数据指纹 ID；移动音乐目录后重新选择文件夹并扫描，原歌单、收藏和播放记录仍能匹配。

**备份方式**：关闭程序后复制整个 `data/` 目录即可。恢复时把它放回对应位置。免安装版可以连同 exe 一起复制。

## 快捷键

| 操作 | 方式 |
| --- | --- |
| 播放 / 暂停 | 底部播放键或 `Space` |
| 全屏 / 退出全屏 | 设置页按钮或 `F11` |
| 沉浸歌词 | 底部「歌词」或 `L` |
| 播放队列 | 底部队列按钮 |
| 静音 | 音量图标或 `M` |
| 上一首 / 下一首 | 底部按钮或 `Shift + ← / →` |
| 关闭弹层 / 返回 | `Esc` 或左上角返回 |
| 歌词跳转 | 点击任意同步歌词行 |
| 歌词微调 | 沉浸页「歌词提前 / 延后」 |
| 睡眠定时 | 播放器月亮图标 → 15–90 分钟 |
| 左右滑动切歌 | 播放器空白区或沉浸页（触屏） |
| 移动 / 最大化窗口 | 拖动顶部空白处 / 双击顶部 |

## 项目结构

```text
.
├─ src/
│  ├─ main/
│  │  ├─ index.js         主进程入口、生命周期与启动流程
│  │  ├─ window.js        无边框窗口、标题栏与缩放
│  │  ├─ ipc.js           IPC 注册与参数校验
│  │  ├─ library.js       音乐扫描、元数据、封面/歌词缓存
│  │  ├─ lyrics.js        LRC 解析与编码处理
│  │  ├─ settings.js      外观与曲库设置持久化
│  │  ├─ sections.js      歌单与收藏
│  │  ├─ player-state.js  队列、最近播放、播放次数
│  │  ├─ announcement.js  本地公告
│  │  └─ ...              paths / state / migration 等
│  └─ preload/index.js    contextBridge API
├─ app/
│  ├─ index.html          页面结构
│  ├─ styles.css          主题、布局与歌词动效
│  └─ js/                 渲染进程模块（按加载顺序共享全局作用域）
│     ├─ core.js          ICONS、主题、全局状态
│     ├─ views.js         首页/曲库/艺术家/专辑/文件夹
│     ├─ now-playing.js   底部播放器与队列
│     ├─ lyrics.js        歌词渲染、偏移与卡拉 OK 渐变
│     ├─ playback.js      播放控制与进度
│     ├─ scan.js          扫描进度
│     ├─ sections.js      歌单交互
│     ├─ ui.js            设置、弹层与通知
│     ├─ actions.js       业务动作
│     ├─ events.js        事件绑定
│     ├─ sleep.js         睡眠定时
│     ├─ announcement.js  启动公告渲染
│     ├─ welcome.js       2.0 流光启航界面
│     └─ main.js          初始化入口
├─ build/                 安装包图标
├─ .github/workflows/     三平台构建工作流
├─ demo_music/            示例歌曲与 LRC
├─ data/                  本地数据（不提交）
├─ preview.png            主界面预览
├─ customization.png      外观设置预览
├─ welcome.png            2.0 启航界面预览
├─ 启动 Y_Music.cmd       Windows 源码便携启动脚本
├─ LICENSE
└─ README.md
```

## 开发

```bash
# 普通启动
npm start

# 固定窗口启动
npm run windowed

# 打开开发者工具
npm run devtools

# 只打包成未压缩目录，便于调试
npm run pack
```

主进程位于 `src/main/`，按扫描、歌词、设置、歌单、播放状态、公告和窗口职责拆分；渲染进程位于 `app/js/`，使用经典脚本按固定顺序加载，共享同一全局作用域，避免引入构建工具。前后端通过 `src/preload/index.js` 暴露的 `window.musicAPI` 通信，渲染进程不开启 Node 集成。

技术栈：Electron、原生 HTML / CSS / JavaScript、Web Audio、`music-metadata`、`iconv-lite`、electron-builder。

## 已知限制

- APE、WMA、DSD 等 Chromium 无法直接解码的格式暂未纳入；可以转为 FLAC / MP3 后使用。
- 音乐目录被移动或清空时，程序会提示「歌曲文件缺失」，不会直接删除索引；重新扫描或选择文件夹即可恢复。
- macOS / Linux 安装包需要在对应系统上构建；未签名版本会触发系统安全提示。
- 示例音乐与封面由脚本合成，仅用于演示。

## 常见问题

**歌词不显示？**  
确认 `.lrc` 与歌曲同名并放在同一目录；也可以在沉浸页手动导入。乱码歌词建议另存为 UTF-8。

**换电脑后歌单还在，但歌曲显示缺失？**  
复制的是程序目录而不是音乐文件，或者音乐路径发生了变化。重新选择音乐文件夹并扫描即可；歌单引用会通过稳定 ID 恢复。

**启动界面不显示？**  
打开「设置 → 外观与动效 → 启动界面」，确认开关已开启。关闭后会直接进入首页，不影响其他功能。

**如何清空数据？**  
关闭程序后备份并删除 `data/`，下次启动会重新建立空库；删除前请确认不需要现有歌单和收藏。

## 致谢

- 界面结构与视觉参考：[Sylvakru](https://github.com/AfalpHy/sylvakru)
- 全屏歌词动效参考：[Lyricify-App](https://github.com/WXRIW/Lyricify-App)
- 音频元数据：[music-metadata](https://github.com/Borewit/music-metadata)
- 编码处理：[iconv-lite](https://github.com/ashtuchkin/iconv-lite)
- 桌面运行时：[Electron](https://www.electronjs.org/)

## License

本项目基于 [MIT License](LICENSE) 开源。

音乐、封面和歌词的版权归各自权利人所有。本项目不提供、不存储任何受版权保护的音乐资源；请使用自己拥有合法使用权的音频文件。

---

<div align="center">

**Y_Music** © 2026 夜静（YeJing-Neko）

[GitHub](https://github.com/YeJing-Neko)

如果这个项目对你有帮助，欢迎 Star。

</div>
