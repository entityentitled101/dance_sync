const WebSocket = require('ws');

// 创建 WebSocket 服务器，监听 8080 端口
const wss = new WebSocket.Server({ port: 8080 });

console.log('🚀 WebSocket 服务器已启动在 ws://localhost:8080');
console.log('等待连接...\n');

let expoClient = null;  // Expo App 连接
let browserClient = null;  // 浏览器连接
let messageCount = 0;

wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`\n✅ 新连接来自: ${clientIp}`);

    // 监听客户端消息
    ws.on('message', (message) => {
        try {
            // 将 Buffer 转换为字符串
            const messageStr = message.toString();
            const data = JSON.parse(messageStr);

            // 识别客户端类型
            if (data.type === 'register') {
                if (data.client === 'expo') {
                    expoClient = ws;
                    console.log('📱 Expo App 已注册');
                } else if (data.client === 'browser') {
                    browserClient = ws;
                    console.log('🌐 浏览器已注册');
                }
            }
            // 转发传感器数据：Expo -> Browser
            else if (data.type === 'motion' && browserClient) {
                // 重要：发送字符串而不是 Buffer
                browserClient.send(messageStr);
                messageCount++;

                // 每 60 条消息打印一次统计（避免刷屏）
                if (messageCount % 60 === 0) {
                    console.log(`📊 已转发 ${messageCount} 条消息 | 速度: ${Math.round(data.velocity)} | 能量: ${Math.round(data.energy)}`);
                }
            }
            // 转发音色切换：Expo -> Browser
            else if (data.type === 'preset' && browserClient) {
                browserClient.send(messageStr);
                console.log(`🎵 音色切换到: ${data.value + 1}`);
            }
        } catch (e) {
            console.error('❌ 消息解析错误:', e.message);
        }
    });

    ws.on('close', () => {
        if (ws === expoClient) {
            console.log('📱 Expo App 已断开');
            expoClient = null;
        } else if (ws === browserClient) {
            console.log('🌐 浏览器已断开');
            browserClient = null;
        }
    });

    ws.on('error', (error) => {
        console.error('❌ WebSocket 错误:', error.message);
    });
});

// 每 10 秒显示连接状态
setInterval(() => {
    console.log(`\n💡 连接状态: Expo ${expoClient ? '✅' : '❌'} | 浏览器 ${browserClient ? '✅' : '❌'}`);
}, 10000);

console.log('\n📌 使用说明:');
console.log('1. 在 Expo App 中点击"启动音频引擎"');
console.log('2. 在浏览器中打开 index.html');
console.log('3. 挥动手机，浏览器中会播放声音\n');
