# 🎵 Dance Sync (跳舞音乐) - 互动声音系统

## 🚀 快速演示指南 (Demo Quick Start)
**给朋友展示时，请严格按照以下步骤操作（特别针对开启 VPN 时，解决局域网不通的问题）：**

### 1. 启动 WebSocket 服务器 (终端 1)
这是"大脑"，负责转发手机信号。
```powershell
cd expo-app
node ws-server.js
# 服务器启动后会自动过滤掉 VPN 的虚拟网卡，只显示真正的“局域网地址”（如 192.168.x.x）
# 请记下屏幕上显示的这个局域网地址！
```

### 2. 启动 Expo 手机端 (终端 2 - 解决 VPN/虚拟网卡冲突的究极方案)
在开启 VPN 时，Expo 有时误抓取虚拟网卡（比如 `26.x.x.x`）从而导致网络不通、报错 `fetch failed`。
**为了强制使 Expo 绑定正确的真实局域网、并绕开外网检测，请运行以下格式的命令：**
```powershell
cd expo-app
$env:REACT_NATIVE_PACKAGER_HOSTNAME="在这里填入第1步显示的局域网IP"; npx expo start --offline

# 示例：如果第一步的地址是 192.168.1.92，那就运行下面这行：
# $env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.1.92"; npx expo start --offline
```
> 等待出现二维码，用手机上的 **Expo Go** App 直接扫描即可瞬间连上！

### 3. 连接音频引擎与手机 (客户端配置)
1. **电脑端发声**：用浏览器双击打开根目录的 `index-websocket.html`，点击页面中央的 **"启动音频系统"**。
2. **手机端连接**：在 App 界面输入框中填入**第 1 步**里的那个局域网 IP。
3. 点击 **"连接服务器"**，开始挥动手机享受动态音乐！

---

> **当前版本**：v1.0.0 (WebSocket Audio Bridge)  
> **Git 状态**：✅ 已初始化 Git 仓库 (Local Backup Ready)  
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

## 🛠️ 首次依赖安装

如果你是第一次去别的电脑上运行这个项目，请先进入目录安装一次依赖：
```bash
cd expo-app
npm install ws
npm install
```
后续每次游玩展示，请直接参考页面最顶部的 **🚀 快速演示指南**。

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

1.  [x] **GitHub 备份** (The VPN & Network Crises Resolved)
2.  [ ] **循环录音机 (Looper)**
    - 用户手势触发底鼓循环录制
    - 叠加多层音效
    - 实时编曲模式
