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

const PRESETS = [
  { id: 0, name: 'DEFAULT (FIST)', desc: '深沉正弦波 | 铺底背景' },
  { id: 1, name: 'AGILE PULSE', desc: '锐利方波 | 激光线条' },
  { id: 2, name: 'ETHEREAL VOID', desc: '空灵神圣 | 天籁之音' },
  { id: 3, name: 'SYMPHONIC', desc: '交响宏大 | 弦乐厚重' },
];

export default function App() {
  const [currentPreset, setCurrentPreset] = useState(1);
  const [velocity, setVelocity] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [serverIp, setServerIp] = useState('192.168.1.92'); // 默认IP
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
      const instantVelocity = Math.sqrt(x * x + y * y + z * z) * 100;
      setVelocity(Math.round(instantVelocity));

      velocityBuffer.current.push(instantVelocity);
      if (velocityBuffer.current.length > 30) {
        velocityBuffer.current.shift();
      }

      const avgEnergy = velocityBuffer.current.reduce((a, b) => a + b, 0) / velocityBuffer.current.length;
      setEnergy(Math.min(100, Math.round(avgEnergy)));

      // 发送数据到 WebSocket 服务器
      if (wsConnected && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'motion',
          velocity: instantVelocity,
          energy: avgEnergy,
          preset: currentPreset
        }));
      }
    });

    return () => subscription && subscription.remove();
  }, [wsConnected, currentPreset]);

  // 切换音色
  const switchPreset = (presetId) => {
    setCurrentPreset(presetId);
    if (wsConnected && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'preset',
        value: presetId
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

          {/* 音色按钮 */}
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
                  {preset.id + 1}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 速度显示 */}
          <View style={styles.infoSection}>
            <Text style={styles.velocityLabel}>速度</Text>
            <Text style={styles.velocityValue}>{velocity} cm/s</Text>
            <Text style={styles.velocityHint}>
              能量: {energy}% | 音色: {currentPreset + 1}
            </Text>
          </View>

          {/* 当前音色 */}
          <View style={styles.presetInfo}>
            <Text style={styles.presetName}>[{currentPreset + 1}] {PRESETS[currentPreset].name}</Text>
            <Text style={styles.presetDesc}>{PRESETS[currentPreset].desc}</Text>
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
  buttonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 15,
  },
  presetButton: {
    width: (width - 60) / 2,
    height: 80,
    borderWidth: 2,
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
    fontSize: 32,
    fontWeight: '300',
  },
  presetButtonTextActive: {
    color: '#000',
  },
  infoSection: {
    marginTop: 40,
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
  velocityHint: {
    color: '#666',
    fontSize: 11,
    marginTop: 8,
  },
  presetInfo: {
    marginTop: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  presetName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '300',
    letterSpacing: 1,
    marginBottom: 5,
  },
  presetDesc: {
    color: '#666',
    fontSize: 14,
    fontWeight: '300',
  },
  disconnectButton: {
    position: 'absolute',
    bottom: 30,
    left: width * 0.2,
    right: width * 0.2,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#666',
    alignItems: 'center',
  },
  disconnectButtonText: {
    color: '#666',
    fontSize: 12,
    letterSpacing: 1,
  },
});
