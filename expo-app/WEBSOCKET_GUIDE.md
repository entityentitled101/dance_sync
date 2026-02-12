# WebSocket 方案实施指南

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
