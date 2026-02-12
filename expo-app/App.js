import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Modal,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DeviceMotion } from 'expo-sensors';

const { width, height } = Dimensions.get('window');
// 音色预设配置 (3个核心音色)
const PRESETS = [
  { id: 0, name: 'CLASSICAL', desc: '钢琴 | 提琴 | 铜管 | 全奏' },
  { id: 1, name: 'CYBER PUNK', desc: '底鼓 | 吉他 | 贝斯 | 噪音' },
  { id: 2, name: 'WARZONE', desc: '嗡鸣 | 螺旋桨 | 警报 | 爆炸' },
];

export default function App() {
  const [currentPreset, setCurrentPreset] = useState(0); // 默认钢琴
  const [velocity, setVelocity] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [serverIp, setServerIp] = useState('192.168.1.92');
  const [intensity, setIntensity] = useState(0); // 0-3 四个阶段

  const wsRef = useRef(null);
  const velocityBuffer = useRef([]);

  // 连接到 WebSocket 服务器
  const connectWebSocket = () => {
    try {
      const ws = new WebSocket(`ws://${serverIp}:8080`);

      ws.onopen = () => {
        console.log('✅ WebSocket 已连接');
        setWsConnected(true);
        // 注册为 Expo 客户端
        ws.send(JSON.stringify({ type: 'register', client: 'expo' }));
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket 错误:', error.message);
        Alert.alert('连接失败', '无法连接到服务器，请检查 IP 地址和服务器状态');
      };

      ws.onclose = () => {
        console.log('⚠️ WebSocket 已断开');
        setWsConnected(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('连接失败:', error);
      Alert.alert('错误', error.message);
    }
  };

  // 启动传感器
  useEffect(() => {
    DeviceMotion.setUpdateInterval(16); // ~60Hz

    const subscription = DeviceMotion.addListener((motionData) => {
      if (!motionData || !motionData.acceleration) return;

      const { x, y, z } = motionData.acceleration;
      // 增加灵敏度
      const instantVelocity = Math.sqrt(x * x + y * y + z * z) * 120;
      setVelocity(Math.round(instantVelocity));

      velocityBuffer.current.push(instantVelocity);
      if (velocityBuffer.current.length > 30) {
        velocityBuffer.current.shift();
      }

      const avgEnergy = velocityBuffer.current.reduce((a, b) => a + b, 0) / velocityBuffer.current.length;
      setEnergy(Math.min(100, Math.round(avgEnergy)));

      // 发送数据 (包含 intensity)
      if (wsConnected && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'motion',
          velocity: instantVelocity,
          energy: avgEnergy,
          preset: currentPreset,
          intensity: intensity // 发送新的层级信息
        }));
      }
    });

    return () => subscription && subscription.remove();
  }, [wsConnected, currentPreset, intensity]); // 添加 intensity 依赖

  // 切换音色
  const switchPreset = (presetId) => {
    setCurrentPreset(presetId);
    setIntensity(0); // 切换音色时重置层级
    if (wsConnected && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'preset',
        value: presetId
      }));
    }
  };

  // 改变层级
  const changeIntensity = (newLevel) => {
    setIntensity(newLevel);
    if (wsConnected && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'intensity',
        value: newLevel
      }));
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* 顶部栏 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {wsConnected ? '🟢 已连接' : '🔴 未连接'}
        </Text>
      </View>

      {/* 连接界面 */}
      {!wsConnected && (
        <View style={styles.connectContainer}>
          {/* ... (保持不变) ... */}
          {/* 需要重新包含这里的组件，因为是全部替换 */}
          <Text style={styles.connectTitle}>WebSocket 传感器</Text>
          <Text style={styles.connectHint}>输入电脑 IP 地址</Text>
          <TextInput
            style={styles.ipInput}
            value={serverIp}
            onChangeText={setServerIp}
            placeholder="192.168.1.92"
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
          />
          <TouchableOpacity
            style={styles.connectButton}
            onPress={connectWebSocket}
          >
            <Text style={styles.connectButtonText}>连接服务器</Text>
          </TouchableOpacity>
          <Text style={styles.connectInfo}>
            确保电脑已运行：{'\n'}
            node ws-server.js
          </Text>
        </View>
      )}

      {/* 主界面 */}
      {wsConnected && (
        <>
          {/* 能量进度条 */}
          <View style={styles.energySection}>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${energy}%` }]} />
            </View>
            <Text style={styles.energyText}>{energy}%</Text>
          </View>

          {/* 音色按钮 (3个并排) */}
          <View style={styles.buttonsContainer}>
            {PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.id}
                style={[
                  styles.presetButton,
                  currentPreset === preset.id && styles.presetButtonActive
                ]}
                onPress={() => switchPreset(preset.id)}
              >
                <Text style={[
                  styles.presetButtonText,
                  currentPreset === preset.id && styles.presetButtonTextActive
                ]}>
                  {preset.name.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 当前音色描述 */}
          <View style={styles.presetInfo}>
            <Text style={styles.presetDesc}>{PRESETS[currentPreset].desc}</Text>
          </View>

          {/* 层级滑动控制 (自定义 UI) */}
          <View style={styles.intensityContainer}>
            <Text style={styles.intensityTitle}>LAYER INTENSITY (层级叠加)</Text>
            <View style={styles.intensityTrack}>
              {[0, 1, 2, 3].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.intensityStep,
                    level <= intensity && styles.intensityStepActive
                  ]}
                  onPress={() => changeIntensity(level)}
                >
                  <Text style={{
                    color: level <= intensity ? '#000' : '#888',
                    fontWeight: 'bold'
                  }}>
                    {level + 1}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.intensityLabels}>
              <Text style={styles.intensityLabel}>Base (基础)</Text>
              <Text style={styles.intensityLabel}>Full (全开)</Text>
            </View>
          </View>

          {/* 速度显示 */}
          <View style={styles.infoSection}>
            <Text style={styles.velocityLabel}>速度</Text>
            <Text style={styles.velocityValue}>{velocity} cm/s</Text>
          </View>

          {/* 断开按钮 */}
          <TouchableOpacity
            style={styles.disconnectButton}
            onPress={() => {
              if (wsRef.current) {
                wsRef.current.close();
              }
              setWsConnected(false);
            }}
          >
            <Text style={styles.disconnectButtonText}>断开连接</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: 1,
  },
  connectContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  connectTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '300',
    marginBottom: 10,
    letterSpacing: 2,
  },
  connectHint: {
    color: '#666',
    fontSize: 12,
    marginBottom: 30,
  },
  ipInput: {
    width: '100%',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#fff',
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 30,
  },
  connectButton: {
    paddingVertical: 18,
    paddingHorizontal: 50,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#fff',
  },
  connectButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 2,
  },
  connectInfo: {
    color: '#444',
    fontSize: 11,
    marginTop: 40,
    textAlign: 'center',
    lineHeight: 18,
  },
  energySection: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#222',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#fff',
  },
  energyText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'right',
    fontWeight: '300',
  },
  // 重写按钮容器样式
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 10,
  },
  presetButton: {
    flex: 1,
    height: 60,
    borderWidth: 1,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  presetButtonActive: {
    backgroundColor: '#fff',
  },
  presetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  presetButtonTextActive: {
    color: '#000',
  },
  presetInfo: {
    marginTop: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  presetDesc: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
  },
  // 层级控制样式 (更明显的推子风格)
  intensityContainer: {
    marginTop: 40,
    paddingHorizontal: 30,
    marginBottom: 20,
    alignItems: 'center',
  },
  intensityTitle: {
    color: '#888',
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 15,
    fontWeight: '600',
  },
  // 模拟滑块轨道
  intensityTrack: {
    flexDirection: 'row',
    height: 60,                // 加高，更易触控
    backgroundColor: '#1a1a1a', // 深色轨道背景
    borderRadius: 30,
    padding: 5,
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#333',
  },
  // 滑块按钮
  intensityStep: {
    width: 50,                // 更大的触控区
    height: 50,
    borderRadius: 25,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  intensityStepActive: {
    backgroundColor: '#fff',   // 选中高亮
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
    transform: [{ scale: 1.1 }] // 选中放大效果
  },
  intensityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
    paddingHorizontal: 15,
  },
  intensityLabel: {
    color: '#666',
    fontSize: 10,
    letterSpacing: 1,
  },

  infoSection: {
    marginTop: 20,
    alignItems: 'center',
  },
  velocityLabel: {
    color: '#999',
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 5,
  },
  velocityValue: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '200',
  },
  disconnectButton: {
    marginTop: 30,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 20,
  },
  disconnectButtonText: {
    color: '#666',
    fontSize: 12,
    letterSpacing: 1,
  },
});
