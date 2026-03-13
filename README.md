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
  - `expo-app/App.js` : React Native 传感器主程序 (主控手，WebSocket Client)
  - `expo-app/ws-server.js` : WebSocket 中转服务器 (支持三路客户端：主控手+效果手+浏览器)
  - `index-websocket.html` : 浏览器音频引擎 (Tone.js + 双手 FX 层)
  - `fx-controller.html` : iPad/手机 效果手控制器 (五种乐器模式: 鼓/琑音/笛子/白噪/芯片音)
  - `visual-engine.js` : Canvas 视觉引擎 (3 套方案 + FPV 穿越)

- **设计文档**:
  - `VISUAL_CONCEPTS.md` : 视觉方案设计提案
  - `MUSIC_THEORY.md` : 音乐交互架构与乐理设计蓝图

- **已归档/不再使用**:
  - `index.html` (原 MediaPipe 版本，已废弃)
  - `AudioEngine.html` (原 WebView 版本，已废弃)
  - `SimpleAudioEngine.js` (原 expo-av 版本，已废弃)

---

## 📝 最新更新日志 (Changelog)

**v1.5.0 - The Visual Engine Overhaul**
- 🎨 极简黑白统一、参数控制台解耦、FPV 程序化穿越飞行、Joy Division 分形噪波波形、天际线遮罩切除、异形行星。

**v2.0.0 - Dual Controller & FX Layer (今日更新)**
- 🏛️ **双设备桥接架构**：WebSocket 服务器升级为三路转发 (主控手 + 效果手 + 浏览器)，支持手机+iPad 同时连接。
- 🎹 **iPad FX 控制器** (`fx-controller.html`)：5 种乐器模式按钮 (DRUM/KEYS/FLUTE/SFX/RETRO)，采用统一黑白赛博美学，支持 iOS Safari DeviceMotion 传感器。
- 🥁 **智能鼓组触发引擎**：根据挥动速度和连击频率自动切换 Kick（重击）/ Snare（中力）/ Hi-Hat（快速连击）/ Crash（暴力连击）。
- 🎼 **调性笼琑音 (Scale Cage)**：KEYS 模式下所有音符被锁定在 D 小调五声音阶内，确保乱甩也不会跑调。
- 🎶 **体感笛子 (FLUTE)**：iPad 垂直方向加速度映射音高，配合 Portamento 滑音实现真实的笛子吹奏体验。
- 🌬️ **环境声場 (SFX)**：挥动控制白噪声滤波器开度，从低语微风到高频朋克风暴。
- 🕹️ **8-Bit 芯片音 (RETRO)**：方波合成器随机触发五声音阶，配合飞行画面。

---

## 🛠️ 下一步开发计划 (Roadmap)

1.  [x] **GitHub 备份** (The VPN & Network Crises Resolved)
2.  [x] **高级前端视觉引擎 (TD 级衍生物)**
    - [x] 架构解耦：音频为主，Canvas 视觉系统可全屏可隐藏
    - [x] 全局滤镜：模拟 CRT 显示管与复古噪点 
    - [x] **全功能参数抽屉**：支持在 PC 端自定义飞行基速、视角摇晃灵敏度、视觉响应衰减、波峰绝对高度、残留扫描线及主色标等，去除了硬编码限制。
    - [x] 方案一：拓扑折叠几何 (Topological Morphing Wireframe)
    - [x] 方案二：**复古星际飞行 (Retro FPV Flight Sim)** 
        - 突破了速度绑定的枷锁：将飞行速度设置为恒定（可调）。
        - 引入了真正的 **6轴体感控制 (Gyroscope 3D Steer)**：挥动手机的俯仰和滚转（Pitch & Roll）实时控制 PC 画面中的机长视角（像穿越机大回环一样）。
        - 无垠网格走廊与多边形经纬网格恒星渲染，内置多层赛博朋克仪表盘。
    - [x] 方案三：**经典专辑波形 (Joy Division Waves)** 
        - 极高精度的 80+ 层多重采样遮挡波图，采用分形噪波算法高度还原 1979 年著名后朋克唱片封面《Unknown Pleasures》。
3.  [ ] **循环录音机 (Looper)**
    - 用户手势触发底鼓循环录制
    - 叠加多层音效
    - 实时编曲模式
