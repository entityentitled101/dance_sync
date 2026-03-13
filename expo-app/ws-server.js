const WebSocket = require('ws');
const os = require('os');

// 获取本机局域网 IP 地址
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    let backupIp = '127.0.0.1';
    for (const devName in interfaces) {
        if (devName.toLowerCase().includes('tap') || devName.toLowerCase().includes('vmware') || devName.toLowerCase().includes('virtual')) {
            continue;
        }
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                if (alias.address.startsWith('192.168.') || alias.address.startsWith('10.')) {
                    return alias.address;
                }
                backupIp = alias.address;
            }
        }
    }
    return backupIp !== '127.0.0.1' ? backupIp : '127.0.0.1';
}

const localIp = getLocalIp();
const wss = new WebSocket.Server({ port: 8080 });

console.log('🚀 WebSocket 服务器已启动 (Dual Controller Edition)');
console.log(`📡 局域网地址: ws://${localIp}:8080`);
console.log(`🏠 本地地址: ws://localhost:8080`);
console.log('------------------------------------');
console.log('等待连接...\n');

// ===== 三路客户端 =====
let expoClient = null;    // 手机 A (主控手 Expo App)
let fxClient = null;       // iPad B (效果手 网页)
let browserClient = null;  // 电脑浏览器 (音频引擎)
let messageCount = 0;

wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`\n✅ 新连接来自: ${clientIp}`);

    ws.on('message', (message) => {
        try {
            const messageStr = message.toString();
            const data = JSON.parse(messageStr);

            // ===== 客户端注册 =====
            if (data.type === 'register') {
                if (data.client === 'expo') {
                    expoClient = ws;
                    console.log('📱 主控手 (Expo App) 已注册');
                } else if (data.client === 'browser') {
                    browserClient = ws;
                    console.log('🌐 浏览器音频引擎已注册');
                } else if (data.client === 'fx_controller') {
                    fxClient = ws;
                    console.log('🎛️  效果手 (FX Controller) 已注册');
                }
            }

            // ===== 主控手数据转发：Expo → Browser =====
            else if (data.type === 'motion' && browserClient) {
                browserClient.send(messageStr);
                messageCount++;
                if (messageCount % 60 === 0) {
                    console.log(`📊 主控手已转发 ${messageCount} 条 | 速度: ${Math.round(data.velocity)} | 能量: ${Math.round(data.energy)}`);
                }
            }

            // ===== 效果手数据转发：FX Controller → Browser =====
            else if (data.type === 'fx_motion' && browserClient) {
                browserClient.send(messageStr);
                // 低频打印，避免刷屏
                if (messageCount % 120 === 0) {
                    console.log(`🎛️  效果手 | 模式: ${data.fxMode} | 速度: ${Math.round(data.velocity)}`);
                }
            }

            // ===== 音色切换转发：Expo → Browser =====
            else if (data.type === 'preset' && browserClient) {
                browserClient.send(messageStr);
                console.log(`🎵 音色切换到: ${data.value + 1}`);
            }

            // ===== 效果手模式切换转发：FX → Browser =====
            else if (data.type === 'fx_mode' && browserClient) {
                browserClient.send(messageStr);
                console.log(`🎛️  效果手切换模式: ${data.mode}`);
            }

        } catch (e) {
            console.error('❌ 消息解析错误:', e.message);
        }
    });

    ws.on('close', () => {
        if (ws === expoClient) {
            console.log('📱 主控手已断开');
            expoClient = null;
        } else if (ws === browserClient) {
            console.log('🌐 浏览器已断开');
            browserClient = null;
        } else if (ws === fxClient) {
            console.log('🎛️  效果手已断开');
            fxClient = null;
        }
    });

    ws.on('error', (error) => {
        console.error('❌ WebSocket 错误:', error.message);
    });
});

// 每 10 秒显示连接状态
setInterval(() => {
    console.log(`\n💡 连接状态: 主控手 ${expoClient ? '✅' : '❌'} | 浏览器 ${browserClient ? '✅' : '❌'} | 效果手 ${fxClient ? '✅' : '❌'}`);
}, 10000);

console.log('\n📌 双手控制器使用说明:');
console.log('1. 手机 Expo App → 主控手 (控制主旋律)');
console.log('2. iPad 打开 fx-controller.html → 效果手 (鼓/琶音/笛子)');
console.log('3. 电脑打开 index-websocket.html → 音频引擎\n');
