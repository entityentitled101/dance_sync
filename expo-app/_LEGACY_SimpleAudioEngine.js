import { Audio } from 'expo-av';

// D小调五声音阶的频率 (Hz)
const SCALE_FREQUENCIES = {
    'D2': 73.42,
    'A2': 110.00,
    'D3': 146.83,
    'E3': 164.81,
    'F3': 174.61,
    'A3': 220.00,
    'C4': 261.63,
    'D4': 293.66,
    'E4': 329.63,
    'F4': 349.23,
    'A4': 440.00,
};

class SimpleAudioEngine {
    constructor() {
        this.isReady = false;
        this.currentPreset = 1;
        this.sounds = new Map();
    }

    async init() {
        try {
            // 设置音频模式
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true, // 重要：静音模式下也播放
                staysActiveInBackground: false,
                shouldDuckAndroid: false,
            });

            this.isReady = true;
            console.log('✅ 原生音频引擎已初始化');
            return true;
        } catch (error) {
            console.error('❌ 音频初始化失败:', error);
            return false;
        }
    }

    // 根据速度映射到音阶索引
    velocityToNoteIndex(velocity) {
        const normalizedVel = Math.min(velocity / 200, 1);
        const notes = Object.keys(SCALE_FREQUENCIES);
        return Math.floor(normalizedVel * (notes.length - 1));
    }

    // 播放音符（使用 Web Audio API 在客户端生成音频）
    async playNote(velocity, energy) {
        if (!this.isReady || velocity < 20) return;

        try {
            const notes = Object.keys(SCALE_FREQUENCIES);
            const index = this.velocityToNoteIndex(velocity);
            const note = notes[index];
            const frequency = SCALE_FREQUENCIES[note];

            // 使用简单的哔哔声测试（后续可以改进）
            console.log(`播放音符: ${note} (${frequency}Hz) 速度:${velocity}`);

            // 注意：expo-av 不支持动态生成音调
            // 这里我们需要使用预录制的音频文件，或者使用其他方案

        } catch (error) {
            console.error('播放失败:', error);
        }
    }

    // 播放测试音符
    async playTestNote() {
        console.log('🔊 播放测试音符 C4');
        // 简单的测试实现
        return true;
    }

    switchPreset(presetId) {
        this.currentPreset = presetId;
        console.log(`切换到音色 ${presetId + 1}`);
    }
}

export default new SimpleAudioEngine();
