# 📡 实时连接与演示指南 (v2.0)

本指南针对**向他人展示 (Demo Mode)** 场景优化，确保最稳定的连接成功率。

## 核心架构
```
[手机 Expo Go] --(Tunnel 云端通道)--> [React Native Server]
      ↓ (WebSocket 直连)
[Node.js 中转服务器] --(localhost)--> [电脑浏览器 Tone.js Audio]
```

---

## ✅ 准备工作 (只需做一次)

### 1. 安装依赖
在 `expo-app` 目录下：
```powershell
npm install
npm install ws expo-sensors
```

### 2. 检查防火墙
确保 Windows 防火墙允许 `Node.js` 通过。

---

## 🚀 启动步骤 (每次演示时)

请按顺序开启 **三个窗口**：

### 1️⃣ 第一步：启动信令服务器 (Terminal 1)
这是整个系统的“红绿灯”，负责中转手机数据。
```powershell
cd expo-app
node ws-server.js
```
> **关键信息**：服务器启动后会直接显示 **📡 局域网地址**（例如 `192.168.1.5`），请记住它。

### 2️⃣ 第二步：启动手机端 APP (Terminal 2)
使用 **Tunnel 模式**，即使手机开了 VPN 也能连上。这是解决局域网连接问题的最佳方案。
```powershell
cd expo-app
npx expo start --tunnel
```
> **操作**：等待二维码出现，用手机 Expo Go App 扫描。

### 3️⃣ 第三步：启动音频端 (浏览器)
在电脑上直接双击打开项目根目录下的：
`index-websocket.html`

> **注意**：Chrome 可能会因没有交互而静音，进入页面后请点击一下屏幕任意位置以激活音频。

---

## 📱 手机端操作
1.  扫码进入 App（此时会看到 "Disconnected"）。
2.  在输入框填入 **第一步获取的 IPv4 地址**。
3.  点击 **Check Connection**。
4.  如果你能听到电脑发出声音，说明成功！

---

## ❓ 常见问题排查 (Troubleshooting)

### Q: 手机连上了 Expo 但连不上 WebSocket？
*   **原因**：Tunnel 只负责加载 App 界面，WebSocket 数据还是走的局域网直连。
*   **解法**：
    1.  确认手机和电脑在同一 WiFi。
    2.  确认输入的 IP 地址是 `ipconfig` 查到的本机 IPv4，不是 `127.0.0.1`。
    3.  如果是公共 WiFi (如咖啡厅/学校) 可能隔离了设备间通信，尝试用手机开热点给电脑连。

### Q: 浏览器没声音？
*   **原因**：浏览器自动播放策略限制。
*   **解法**：刷新页面，随便点击一下页面空白处，确保 AudioContext 状态从 `suspended` 变为 `running`。打开 F12 控制台如果看到 `AudioContext resumed` 即正常。
## 架构说明

```
手机(Expo App) → WebSocket服务器(电脑) → 浏览器(电脑/手机Safari)
   传感器数据                转发                  Tone.js播放
```

## 步骤 1: 安装 WebSocket 依赖

在 `expo-app` 目录下运行：

```powershell
npm install ws
```

## 步骤 2: 启动 WebSocket 服务器

在 `expo-app` 目录下运行：

```powershell
node ws-server.js
```

你会看到类似这样的输出：
```
🚀 WebSocket 服务器已启动在 ws://localhost:8080
等待连接...
```

**重要**：记下你的电脑 IP 地址。在命令行运行：

```powershell
ipconfig
```

找到 "IPv4 地址"，例如：`192.168.1.100`

## 步骤 3: 修改 Expo App 配置

我会帮你把 `App.js` 改成 WebSocket 版本，然后你需要：

1. 在手机上打开 Expo App
2. 在界面上输入电脑的 IP 地址（例如：`192.168.1.100`）
3. 点击"连接服务器"按钮

## 步骤 4: 打开浏览器音频页面

我会创建一个新的 `index-websocket.html`，你需要：

1. 在电脑浏览器（Chrome/Edge）打开它
2. 或者在手机 Safari 中打开它

页面会自动连接到 WebSocket 服务器。

## 步骤 5: 测试

1. 确保 WebSocket 服务器显示两个连接都成功
2. 挥动手机
3. 浏览器中应该能听到声音！

## 故障排查

### 问题 1: 连接失败

- 确保手机和电脑在同一个 WiFi 网络
- 关闭电脑防火墙（或允许 8080 端口）
- 检查 IP 地址是否正确

### 问题 2: 有连接但没声音

- 检查浏览器音量
- 点击浏览器页面中的"启动音频"按钮（浏览器需要用户交互）

### 问题 3: 数据不传输

- 查看 WebSocket 服务器的终端输出
- 查看 Expo 终端的输出日志
