import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Platform,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DeviceMotion } from 'expo-sensors';

const { width, height } = Dimensions.get('window');

// 音色预设配置 (3个核心音色) - 仅主控手使用
const PRESETS = [
  { id: 0, name: 'CLASSICAL', desc: '钢琴 | 提琴 | 铜管 | 全奏' },
  { id: 1, name: 'CYBER PUNK', desc: '底鼓 | 吉他 | 贝斯 | 噪音' },
  { id: 2, name: 'WARZONE', desc: '嗡鸣 | 螺旋桨 | 警报 | 爆炸' },
];

// FX 模式定义 - 仅效果手使用
const FX_MODES = [
  { id: 'drum',  icon: '◎', name: 'DRUM',  desc: '体感架子鼓' },
  { id: 'keys',  icon: '♪', name: 'KEYS',  desc: '和声琶音' },
  { id: 'flute', icon: '≈', name: 'FLUTE', desc: '体感音高' },
  { id: 'sfx',   icon: '◌', name: 'SFX',   desc: '白噪风声' },
  { id: 'retro', icon: '▦', name: 'RETRO', desc: '8-Bit 芯片' },
];

export default function App() {
  // ===== 角色状态 =====
  const [role, setRole] = useState(null); // null = 未选择, 'main' = 主控手, 'fx' = 效果手

  // ===== 共用状态 =====
  const [velocity, setVelocity] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [serverIp, setServerIp] = useState('192.168.1.92');

  // ===== 主控手状态 =====
  const [currentPreset, setCurrentPreset] = useState(0);
  const [intensity, setIntensity] = useState(0);

  // ===== 效果手状态 =====
  const [fxMode, setFxMode] = useState('drum');
  const [fxVol, setFxVol] = useState(1.0);     // 0.5x - 4.0x
  const [fxPitch, setFxPitch] = useState(0);   // -12 到 +12 (半音)

  const wsRef = useRef(null);
  const velocityBuffer = useRef([]);

  // ===== 连接 WebSocket =====
  const connectWebSocket = () => {
    try {
      const ws = new WebSocket(`ws://${serverIp}:8080`);

      ws.onopen = () => {
        console.log('✅ WebSocket 已连接');
        setWsConnected(true);
        // 根据角色注册不同的客户端身份
        const clientType = role === 'main' ? 'expo' : 'fx_controller';
        ws.send(JSON.stringify({ type: 'register', client: clientType }));
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

  // ===== 传感器数据采集 (两种角色共用，但发送不同类型的数据) =====
  useEffect(() => {
    if (!role) return; // 未选择角色时不启动传感器

    DeviceMotion.setUpdateInterval(16); // ~60Hz

    const subscription = DeviceMotion.addListener((motionData) => {
      if (!motionData || !motionData.acceleration) return;

      const { x, y, z } = motionData.acceleration;
      const instantVelocity = Math.sqrt(x * x + y * y + z * z) * 120;
      setVelocity(Math.round(instantVelocity));

      velocityBuffer.current.push(instantVelocity);
      if (velocityBuffer.current.length > 30) {
        velocityBuffer.current.shift();
      }

      const avgEnergy = velocityBuffer.current.reduce((a, b) => a + b, 0) / velocityBuffer.current.length;
      setEnergy(Math.min(100, Math.round(avgEnergy)));

      if (wsConnected && wsRef.current?.readyState === WebSocket.OPEN) {
        if (role === 'main') {
          // ===== 主控手：发送 motion 类型 =====
          let rotAlpha = 0, rotBeta = 0, rotGamma = 0;
          if (motionData.rotation && (Math.abs(motionData.rotation.beta) > 0.01 || Math.abs(motionData.rotation.gamma) > 0.01)) {
            rotAlpha = motionData.rotation.alpha;
            rotBeta = motionData.rotation.beta;
            rotGamma = motionData.rotation.gamma;
          } else if (motionData.accelerationIncludingGravity) {
            const ag = motionData.accelerationIncludingGravity;
            rotGamma = Math.atan2(ag.x, Math.sqrt(ag.y * ag.y + ag.z * ag.z));
            rotBeta = Math.atan2(ag.y, Math.sqrt(ag.x * ag.x + ag.z * ag.z));
          }

          wsRef.current.send(JSON.stringify({
            type: 'motion',
            velocity: instantVelocity,
            energy: avgEnergy,
            preset: currentPreset,
            intensity: intensity,
            rotation: { alpha: rotAlpha, beta: rotBeta, gamma: rotGamma }
          }));
        } else {
          // ===== 效果手：发送 fx_motion 类型 =====
          // 额外发送 accY 用于笛子模式的音高映射
          let accY = 0;
          if (motionData.accelerationIncludingGravity) {
            accY = motionData.accelerationIncludingGravity.y;
          }
          wsRef.current.send(JSON.stringify({
            type: 'fx_motion',
            velocity: instantVelocity,
            energy: avgEnergy,
            fxMode: fxMode,
            accY: accY,
            fxVol: fxVol,      // 传给浏览器
            fxPitch: fxPitch   // 传给浏览器
          }));
        }
      }
    });

    return () => subscription && subscription.remove();
  }, [wsConnected, currentPreset, intensity, role, fxMode]);

  // ===== 主控手：切换音色 =====
  const switchPreset = (presetId) => {
    setCurrentPreset(presetId);
    setIntensity(0);
    if (wsConnected && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'preset', value: presetId }));
    }
  };

  // ===== 主控手：改变层级 =====
  const changeIntensity = (newLevel) => {
    setIntensity(newLevel);
    if (wsConnected && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'intensity', value: newLevel }));
    }
  };

  // ===== 效果手：切换 FX 模式 =====
  const switchFxMode = (modeId) => {
    setFxMode(modeId);
    if (wsConnected && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'fx_mode', mode: modeId }));
    }
  };

  // ===== 断开连接 =====
  const disconnect = () => {
    if (wsRef.current) wsRef.current.close();
    setWsConnected(false);
  };

  // ====================================================
  // 渲染：角色选择界面
  // ====================================================
  if (!role) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.roleSelectContainer}>
          <Text style={styles.roleTitle}>DANCE SYNC</Text>
          <Text style={styles.roleSubtitle}>选择控制器角色</Text>

          <TouchableOpacity
            style={styles.roleButton}
            onPress={() => setRole('main')}
          >
            <Text style={styles.roleIcon}>◉</Text>
            <Text style={styles.roleName}>主控手</Text>
            <Text style={styles.roleDesc}>控制主旋律 · 和弦 · 能量</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.roleButton}
            onPress={() => setRole('fx')}
          >
            <Text style={styles.roleIcon}>◎</Text>
            <Text style={styles.roleName}>效果手</Text>
            <Text style={styles.roleDesc}>鼓点 · 琶音 · 笛子 · 音效</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ====================================================
  // 渲染：连接界面（两种角色共用）
  // ====================================================
  if (!wsConnected) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setRole(null); disconnect(); }}>
            <Text style={styles.backText}>← 返回选择</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.connectContainer}>
          <Text style={styles.connectTitle}>
            {role === 'main' ? '◉ 主控手' : '◎ 效果手'}
          </Text>
          <Text style={styles.connectHint}>输入电脑 IP 地址</Text>
          <TextInput
            style={styles.ipInput}
            value={serverIp}
            onChangeText={setServerIp}
            placeholder="192.168.1.92"
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
          />
          <TouchableOpacity style={styles.connectButton} onPress={connectWebSocket}>
            <Text style={styles.connectButtonText}>连接服务器</Text>
          </TouchableOpacity>
          <Text style={styles.connectInfo}>
            确保电脑已运行：{'\n'}
            node ws-server.js
          </Text>
        </View>
      </View>
    );
  }

  // ====================================================
  // 渲染：主控手操作界面
  // ====================================================
  if (role === 'main') {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>◉ 主控手 · 🟢 已连接</Text>
        </View>

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
              style={[styles.presetButton, currentPreset === preset.id && styles.presetButtonActive]}
              onPress={() => switchPreset(preset.id)}
            >
              <Text style={[styles.presetButtonText, currentPreset === preset.id && styles.presetButtonTextActive]}>
                {preset.name.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.presetInfo}>
          <Text style={styles.presetDesc}>{PRESETS[currentPreset].desc}</Text>
        </View>

        {/* 层级控制 */}
        <View style={styles.intensityContainer}>
          <Text style={styles.intensityTitle}>LAYER INTENSITY (层级叠加)</Text>
          <View style={styles.intensityTrack}>
            {[0, 1, 2, 3].map((level) => (
              <TouchableOpacity
                key={level}
                style={[styles.intensityStep, level <= intensity && styles.intensityStepActive]}
                onPress={() => changeIntensity(level)}
              >
                <Text style={{ color: level <= intensity ? '#000' : '#888', fontWeight: 'bold' }}>
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

        <TouchableOpacity style={styles.disconnectButton} onPress={disconnect}>
          <Text style={styles.disconnectButtonText}>断开连接</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ====================================================
  // 渲染：效果手操作界面 (iPad 第二控制器)
  // ====================================================
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>◎ 效果手 · 🟢 已连接</Text>
      </View>

      {/* FX 模式按钮网格 */}
      <View style={styles.fxGrid}>
        {FX_MODES.map((mode) => (
          <TouchableOpacity
            key={mode.id}
            style={[styles.fxButton, fxMode === mode.id && styles.fxButtonActive]}
            onPress={() => switchFxMode(mode.id)}
          >
            <Text style={[styles.fxIcon, fxMode === mode.id && styles.fxIconActive]}>{mode.icon}</Text>
            <Text style={[styles.fxName, fxMode === mode.id && styles.fxNameActive]}>{mode.name}</Text>
            <Text style={[styles.fxDesc, fxMode === mode.id && styles.fxDescActive]}>{mode.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 速度 + 能量显示 */}
      <View style={styles.fxDataRow}>
        <View style={styles.fxDataItem}>
          <Text style={styles.fxDataLabel}>VEL</Text>
          <Text style={styles.fxDataValue}>{velocity}</Text>
        </View>
        <View style={styles.fxDataItem}>
          <Text style={styles.fxDataLabel}>NRG</Text>
          <Text style={styles.fxDataValue}>{energy}</Text>
        </View>
      </View>

      {/* FX 全局控制: 音量与音高 */}
      <View style={styles.fxControlsRow}>
        <View style={styles.fxControlGroup}>
          <Text style={styles.fxControlTitle}>LOUDNESS (音量倍率)</Text>
          <View style={styles.fxControlSteps}>
            {[0.5, 1.0, 2.0, 4.0].map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.fxControlStep, fxVol === v && styles.fxControlStepActive]}
                onPress={() => setFxVol(v)}
              >
                <Text style={[styles.fxStepText, fxVol === v && styles.fxStepTextActive]}>{v}x</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.fxControlGroup}>
          <Text style={styles.fxControlTitle}>TRANSPOSE (音高偏移)</Text>
          <View style={styles.fxControlSteps}>
            {[-12, -7, 0, 7, 12].map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.fxControlStep, fxPitch === p && styles.fxControlStepActive]}
                onPress={() => setFxPitch(p)}
              >
                <Text style={[styles.fxStepText, fxPitch === p && styles.fxStepTextActive]}>{p > 0 ? `+${p}` : p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.disconnectButton} onPress={disconnect}>
        <Text style={styles.disconnectButtonText}>断开连接</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  // ===== 角色选择 =====
  roleSelectContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  roleTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '200',
    letterSpacing: 10,
    marginBottom: 5,
  },
  roleSubtitle: {
    color: '#666',
    fontSize: 12,
    letterSpacing: 3,
    marginBottom: 50,
  },
  roleButton: {
    width: '100%',
    paddingVertical: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    marginBottom: 15,
  },
  roleIcon: {
    color: '#fff',
    fontSize: 32,
    marginBottom: 8,
    opacity: 0.7,
  },
  roleName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '300',
    letterSpacing: 4,
    marginBottom: 6,
  },
  roleDesc: {
    color: '#666',
    fontSize: 11,
    letterSpacing: 2,
  },

  // ===== 通用 =====
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
  backText: {
    color: '#888',
    fontSize: 14,
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

  // ===== 主控手 =====
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
  intensityTrack: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#1a1a1a',
    borderRadius: 30,
    padding: 5,
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#333',
  },
  intensityStep: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  intensityStepActive: {
    backgroundColor: '#fff',
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
    transform: [{ scale: 1.1 }]
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

  // ===== 效果手 FX 界面 =====
  fxGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 8,
    alignContent: 'center',
  },
  fxButton: {
    width: (width - 36) / 2,  // 两列布局
    height: (height - 300) / 3,  // 三行
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fxButtonActive: {
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  fxIcon: {
    fontSize: 28,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 6,
  },
  fxIconActive: {
    color: '#fff',
  },
  fxName: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 4,
    fontWeight: '600',
  },
  fxNameActive: {
    color: '#fff',
  },
  fxDesc: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 2,
    marginTop: 4,
  },
  fxDescActive: {
    color: 'rgba(255,255,255,0.5)',
  },
  fxDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  fxDataItem: {
    alignItems: 'center',
  },
  fxDataLabel: {
    color: '#666',
    fontSize: 9,
    letterSpacing: 2,
  },
  fxDataValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '200',
    marginTop: 2,
  },
  // FX 控制条样式
  fxControlsRow: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  fxControlGroup: {
    marginBottom: 20,
  },
  fxControlTitle: {
    color: '#666',
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 10,
    textAlign: 'center',
  },
  fxControlSteps: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  fxControlStep: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  fxControlStepActive: {
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  fxStepText: {
    color: '#666',
    fontSize: 11,
    fontWeight: '600',
  },
  fxStepTextActive: {
    color: '#fff',
  },
});
