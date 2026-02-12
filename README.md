# Dance Sync (体感生物声学)

> **当前版本**：v1.0.0 (WebSocket Audio Bridge)  
> **状态**：✅ 稳定版 (Ready for Backup)  
> **平台**：Expo (iOS/Android) + Web Browser (Audio Engine)

本项目使用手机传感器捕捉实时运动数据 (速度/能量)，通过 WebSocket 桥接传输到浏览器端，驱动 Tone.js 生成动态电子音乐和交响乐。

---

## 🏗️ 系统架构 (WebSocket)

```
┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
│   Expo App      │  发送数据  │  WebSocket      │  转发数据  │   Browser       │
│  (传感器采集)    │─────────▶│   服务器         │─────────▶│  (Tone.js)      │
│   iPhone        │          │  (电脑 Node.js)  │          │  (播放音乐)     │
└─────────────────┘          └─────────────────┘          └─────────────────┘
```

**为什么这样做？**
为了规避 iOS WebView 中 Web Audio API 的限制，我们采用了一种创新的混合架构：手机只负责采集数据，电脑负责强大的音频合成。

---

## 🎵 功能特性

### 四种独立音色
1.  **DEFAULT (FIST)**: 深沉正弦波，冥想背景
2.  **AGILE PULSE**: 锐利方波，激光线条感
3.  **ETHEREAL VOID**: 空灵神圣，长混响天籁
4.  **SYMPHONIC**: 交响宏大，厚重弦乐质感

### 动态底鼓系统
每个音色拥有专属的底鼓 (Kick) 节奏型，随能量自动触发：
- 标准四拍 (House)
- 快速双拍 (Techno)
- 慢拍简约 (Ambient)
- 交响三连音 (Cinematic)

---

## 🚀 启动指南

### 1. 安装依赖

```bash
cd expo-app
npm install ws
```

### 2. 启动 WebSocket 服务器 (必须第一步)

在电脑终端运行：

```bash
cd expo-app
node ws-server.js
# 此时会显示: WebSocket 服务器已启动在 ws://localhost:8080
```

### 3. 启动 Expo App (手机端)

在另一个终端运行：

```bash
cd expo-app
npx expo start --tunnel
```

- 使用 Expo Go 扫码打开 App
- **连接**: 输入电脑 IP (如 `192.168.1.92`)，点击"连接服务器"
- **确认**: 看到 WebSocket 服务器日志显示 `📱 Expo App 已注册`

### 4. 启动音频引擎 (电脑端)

- 双击打开根目录下的 **`index-websocket.html`**
- 点击页面中央的 **"启动音频系统"** 按钮
- **确认**: 看到 WebSocket 服务器日志显示 `🌐 浏览器已注册`

---

## 📂 文件结构说明

- **核心代码**:
  - `expo-app/App.js` : React Native 传感器主程序 (WebSocket Client)
  - `expo-app/ws-server.js` : WebSocket 中转服务器 (Node.js)
  - `index-websocket.html` : 浏览器音频引擎 (Tone.js + WebSocket Client)

- **已归档/不再使用**:
  - `index.html` (原 MediaPipe 版本，已废弃)
  - `AudioEngine.html` (原 WebView 版本，已废弃)
  - `SimpleAudioEngine.js` (原 expo-av 版本，已废弃)

---

## 🛠️ 下一步开发计划 (Roadmap)

1.  [ ] **GitHub 备份** (当前任务)
2.  [ ] **循环录音机 (Looper)**
    - 用户手势触发底鼓循环录制
    - 叠加多层音效
    - 实时编曲模式
