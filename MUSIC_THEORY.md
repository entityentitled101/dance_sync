# 🎹 Dance Sync 音乐设计蓝图 (Music Theory & Implementation)

> 本文档是以**电子音乐编曲师 + 交互设计师**的双重视角，对项目未来音乐交互架构的系统性回应与规划。
> 创建日期: 2026-03-13

---

## 一、当前系统架构回顾

```
┌──────────────┐     WebSocket     ┌──────────────────────────────────────┐
│   手机 A     │  ────────────►  │   PC 浏览器 (Tone.js)                │
│  (主控手)     │   velocity       │                                      │
│  DeviceMotion │   energy         │  ┌─ Lead (Piano/Guitar)             │
│              │   intensity      │  ├─ Drone (Strings/Bass/嗡鸣)        │
│              │   preset(0/1/2)  │  ├─ Organ (Brass/Siren)             │
│              │                  │  ├─ Kick (MembraneSynth)            │
│              │                  │  ├─ Noise (Pink/Brown)              │
│              │                  │  └─ Master Limiter → 🔊 Speaker     │
└──────────────┘                  └──────────────────────────────────────┘
```

### 现有三套音色预设

| 预设 | 乐器层定义 | 风格 |
|------|-----------|------|
| **CLASSICAL** | Piano → Strings → Brass → Reverb全开 | 交响冥想，D小调和弦进行 |
| **CYBER PUNK** | Kick → Guitar(Saw) → Bass(Square) → Noise | Techno / 强劲底鼓 |
| **WARZONE** | Drone(Sine) → Heli(Noise+Tremolo) → Siren → Explosion | 电影级战争音场 |

### 核心问题

1. **对手的响应感不够强**：目前的触发逻辑依赖 `globalTick` (16分音符事件循环)，手势只是参与了"是否触发"的概率判定。用户很难感到"我甩了一下，声音立刻跟着弹了"。
2. **单手控制，表现力天花板低**：只有 velocity / energy 两个维度，乐器的表现力被严重限制。
3. **音色都是合成器生成的**：没有真实乐器采样或外部音源库，音色"塑料感"较重。

---

## 二、双手分工架构设计 (Dual Controller)

### 2.1 核心概念："主手 + 效果手"

```
                          ┌───────────────────────────────┐
┌──────────────┐          │        PC 音频引擎             │
│   手机 A     │          │                               │
│  "主控手"    │─────────►│  ► 控制 Bass Drone（底层铺垫）  │
│  (手表/戒指)  │ velocity │  ► 控制 Lead Melody（主旋律）   │
│              │ energy   │  ► 控制 总体能量/音量包络       │
│              │          │  ► 控制 和弦进行的切换节奏       │
└──────────────┘          │                               │
                          │         ▼ 底层混为一炉 ▼        │
┌──────────────┐          │                               │
│   iPad B     │          │  ► 叠加 打击/节奏型             │
│  "效果手"    │─────────►│  ► 叠加 装饰性旋律音色          │
│  (按钮+甩动)  │ velocity │  ► 叠加 特殊音效/采样          │
│              │ energy   │  ► 叠加 环境声/白噪音           │
│              │ button   │                               │
└──────────────┘          └──────────────────────────────┘
```

### 2.2 为什么这样分？（乐理解释）

在专业音乐制作中，一首曲子的声部可以分为两大类：

| 类别 | 功能 | 特点 | 对应"哪只手" |
|------|------|------|-------------|
| **Harmonic Foundation（和声基底）** | 铺垫和弦、提供调性基础、低频支撑 | 变化缓慢，听感稳定，是"安全网" | 主控手 A |
| **Ornamentation（装饰/点缀层）** | 打击乐、琶音、效果音、即兴独奏 | 变化快，听感 "刺激"，是"调味料" | 效果手 B |

**关键乐理原则**：效果手 B 永远不会"扰乱"主手 A 的旋律，因为：
- B 可以被限制在 A 当前正在弹的**同一个调性（Key）和和弦（Chord）**的音阶内。
- 哪怕 B 疯狂乱甩，只要它只能触发当前和弦内的音（比如 D 小调的 D F A），就**不可能跑调**。这叫做 **"调性笼子" (Scale Cage)**。
- 这正是 DJ 控制器、Ableton Push、Launchpad 的设计哲学：让操作者怎么乱按都好听。

### 2.3 效果手 B 的按钮模式设计

效果手 iPad 上可以有 **4-5 个按钮**，每个切换一种"第二只手的声音人格"：

| 按钮 | 模式名称 | 声音描述 | 乐理实现 |
|------|---------|---------|---------|
| **① DRUM** | 体感鼓 | 甩动 = 敲击！像挥鼓槌一样甩出鼓点。力度映射为鼓声强弱 | `MembraneSynth` + `MetalSynth`，Velocity 直接映射为 `velocity` 参数，超过阈值就 trigger |
| **② KEYS** | 钢琴/琶音 | 甩动触发当前和弦内的随机分解和弦音。快速甩 = 快速琶音 | `PolySynth(triangle)`，音符锁死在主手当前和弦音阶内 (Scale Cage) |
| **③ FLUTE** | 笛子/口哨 | 甩动高度映射为 **音高 (Pitch)**。手举高 = 高音，手放低 = 低音。像吹口哨一样 | `Synth(sine)` + Portamento(滑音)，用 accelerationIncludingGravity.y 映射到音高 |
| **④ SFX** | 白噪音/环境 | 甩动控制"风声"或"呼吸声"的强度和滤波开合 | `Noise(white/pink)` + `AutoFilter`，velocity → filter.frequency |
| **⑤ RETRO** | 复古合成器 | 8-bit 芯片音，甩动控制频率扫描，配合飞行画面 | `Synth(square)` + `FrequencyShifter`，velocity → detune |

### 2.4 技术上怎么区分两只手？

**答案：两个 WebSocket 客户端，各自带不同的 `client` 标识。**

```javascript
// 手机 A 注册时:
ws.send(JSON.stringify({ type: 'register', client: 'expo_main' }));

// iPad B 注册时:
ws.send(JSON.stringify({ type: 'register', client: 'expo_fx' }));
```

`ws-server.js` 只需要多维护一个变量 `fxClient`，转发时把两路数据都送到浏览器，浏览器根据 `data.client` 字段分别处理。

---

## 三、如何让声音"对手的响应更强"

### 3.1 核心问题诊断

当前的 `playPerformanceNote()` 被 WebSocket `onmessage` 调用，频率约 60Hz。但实际产声是靠 `globalTick()` (每 16 分音符约 125ms 间隔)。这意味着中间有高达 125ms 的潜在延迟！

### 3.2 解决方案："Immediate Trigger + Quantized Rhythm" 双轨制

```
用户甩动 (实时) ─────┬──► 即时触发层 (ZERO LATENCY)
                     │      └─ 打击乐、音效、噪音
                     │      └─ 不需要节奏对齐，响应即时
                     │
                     └──► 节奏量化层 (QUANTIZED)
                            └─ 旋律、和弦、Bass
                            └─ 吸附到最近的 16n 拍
                            └─ 保持音乐性
```

**具体做法**：
- **鼓模式 (DRUM)**：完全绕过 `globalTick`，在 `onmessage` 中直接 `triggerAttackRelease`。用户一甩手，鼓就响。零延迟。
- **笛子模式 (FLUTE)**：也直接在 `onmessage` 中更新 `frequency.rampTo()`，因为笛声是连续音高。
- **琶音模式 (KEYS)**：使用 Tone.js 的 `Transport.nextSubdivision("16n")` 做微量化，既有即时感又不脱拍。

### 3.3 力度映射曲线

人类对力度的感知是非线性的。建议使用 **对数曲线** 而非线性映射：

```
感知力度 = log2(1 + rawVelocity / 50) / log2(3)
```

这会让轻柔的甩动和暴力的甩动之间拉开明显的动态范围，而不是一甩就满格。

---

## 四、可切换音源库 (Sampler Integration)

### 4.1 Tone.js 自带的采样能力

Tone.js 原生支持 `Tone.Sampler`，可以加载真实乐器的 `.mp3` / `.wav` 采样：

```javascript
const piano = new Tone.Sampler({
    urls: {
        A0: "A0.mp3", C1: "C1.mp3", "D#1": "Ds1.mp3",
        // ... 每隔 3 个半音采样一次，Tone.js 自动插值中间音高
    },
    baseUrl: "https://tonejs.github.io/audio/salamander/",
}).toDestination();
```

### 4.2 推荐的免费高质量音源库

| 库名 | 内容 | URL | 体力 |
|------|------|-----|------|
| **Salamander Grand Piano** | 真实三角钢琴多力度采样 | tonejs.github.io/audio/salamander/ | 约 30MB |
| **Tone.js Built-in Instruments** | 各种合成器预设 | 已内置 | 0KB |
| **freesound.org API** | 海量白噪音、鸟鸣、流水、风声采样 | freesound.org/apiv2 | 按需加载 |
| **MIDI.js Soundfonts** | 128 种 GM 标准音色 (钢琴/长笛/小提琴/吉他...) | gleitz/midi-js-soundfonts (GitHub) | 按需 ~2MB/种 |

### 4.3 架构设想：音色插槽系统

```
每个 Preset (CLASSICAL / CYBERPUNK / WARZONE) 内部有 4 个音色"插槽"：

┌─ Preset: CLASSICAL ──────────────────────────┐
│  Slot 1 (Lead):    [Salamander Piano ▼]      │  ← 用户可切换为: 钢片琴 / 竖琴
│  Slot 2 (Drone):   [Synth Strings    ▼]      │  ← 用户可切换为: 大提琴 / Pad
│  Slot 3 (Accent):  [Brass Ensemble   ▼]      │  ← 用户可切换为: 圆号 / 人声
│  Slot 4 (Effect):  [Reverb Tail      ▼]      │  ← 用户可切换为: 教堂 / 峡谷
└──────────────────────────────────────────────┘
```

用户在 iPad/手机界面上选择不同音色，但底层的触发逻辑（什么时候弹、弹什么音符、弹多大声）完全不变。这就实现了你说的**"我的一套逻辑都是一样的，但可以切换音色"**。

---

## 五、接入公开古典曲库 / DJ 模式

### 5.1 底层原理："Stems Separation"（轨道分离）

专业 DJ 的做法是把一首完整的歌拆成多个独立轨道（Stems）：
- 鼓组 (Drums)
- 低音 (Bass)
- 人声 (Vocals)
- 其他 (Other/Melody)

然后用推子分别控制每一轨的音量和效果。

### 5.2 在我们系统中的实现路径

```
方案 A（推荐起步）：Pre-split Stems
─ 提前用 AI 音轨分离工具（如 Demucs、Spleeter）把古典乐拆好
─ 存为 4 个 .mp3 文件
─ 在浏览器中用 4 个 Tone.Player 同时播放
─ 主手 A 的 energy 控制 "鼓组" 和 "弦乐" 的音量交叉淡入
─ 效果手 B 可以在这个底乐上叠加自己的即兴层

方案 B（进阶）：MIDI 回放 + 实时音色替换
─ 加载古典乐的 MIDI 文件（公共域，如 musescore.com）
─ 通过 Tone.js 的 @tonejs/midi 库解析音符
─ 用我们自选的 Sampler 音色来"演奏"MIDI
─ 主手控制播放速度/力度，效果手叠加装饰
─ 优势：可以实时改变曲速、调性、音色

方案 C（终极版）：实时AI伴奏
─ 使用 Magenta.js (Google) 的 MusicRNN 模型
─ 它可以根据你弹的几个音，实时生成"下一段旋律"
─ 完全即兴，永不重复
```

### 5.3 推荐的古典曲目（公共域，无版权问题）

| 曲目 | 适合的画面 | BPM | 调性 |
|------|-----------|-----|------|
| 贝多芬 - 月光奏鸣曲 | Joy Division 波形 | ~56 | C# minor |
| 德彪西 - 月光 | 拓扑线框 | ~72 | Db Major |
| 巴赫 - G弦上的咏叹调 | 缓慢飞行 + 星空 | ~66 | D Major |
| 维瓦尔第 - 四季·夏 (暴风雨) | 激烈飞行穿越 | ~160 | G minor |
| 肖邦 - 降E大调夜曲 | Joy Division (低能量) | ~60 | Eb Major |

这些都是 **1923 年之前出版的作品**，全部属于公共域（Public Domain），可以自由使用。

---

## 六、自然环境音色方案（飞行模式专属）

### 6.1 设计目标

当用户在 Retro Flight Sim 画面中飞行时，音频不再是传统乐器，而是**自然环境的声场**：

```
                      挥动力度
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   [微风低语]       [高速气流]        [雷暴碎裂]
    Filter开度低     Filter开度中      Filter全开
    Noise(white)    + 呼啸声采样      + 雷声采样
    + 鸟鸣点缀      + 机械嗡鸣        + 爆裂噪声
```

### 6.2 实际音色配方

| 能量段 | 主声音 | 点缀声音 | 实现方式 |
|--------|--------|----------|----------|
| 0-20% (滑翔) | 微风白噪音 (Filter 极低) | 偶尔一声鸟鸣采样 | Noise → LowPass(200Hz) + 随机触发 Sampler |
| 20-50% (巡航) | 风声渐强 + 低频嗡鸣 | 远处雷声 rumble | Filter 开到 600Hz + FatOscillator(30Hz) |
| 50-80% (俯冲) | 呼啸声 + 引擎轰鸣 | 金属碎裂、拉丝声 | Filter 开到 2kHz + Distortion |
| 80-100% (失控) | 全频噪声风暴 | 爆炸、电弧声 | Filter 全开 + 采样堆叠 |

---

## 七、分阶段实施路线图

### Phase 1：双设备桥接（最优先）
- [ ] `ws-server.js` 支持注册 `expo_main` 和 `expo_fx` 两个客户端
- [ ] 浏览器分别解析两路数据，主手控制现有逻辑，效果手控制新增层
- [ ] iPad App 增加可点击的 4~5 个按钮 UI（DRUM / KEYS / FLUTE / SFX / RETRO）

### Phase 2：即时触发引擎
- [ ] 效果手的"鼓"和"音效"模式实现零延迟触发
- [ ] 效果手的 "KEYS" 模式实现 Scale Cage 调性锁定
- [ ] 对数力度曲线映射

### Phase 3：音色库接入
- [ ] 集成 Tone.Sampler，预加载 Salamander Piano 采样
- [ ] 建立 "音色插槽" UI，用户可在不同乐器之间切换
- [ ] 加入环境声采样（风/鸟鸣/雷声）下载与缓存机制

### Phase 4：DJ 模式 / MIDI 回放
- [ ] 集成 @tonejs/midi 解析库
- [ ] 加载公共域古典 MIDI，用自定义音色实时渲染
- [ ] 主手 velocity 控制回放速度 (Time Stretching)
- [ ] 效果手在曲目上叠加即兴层

### Phase 5：AI 即兴（远期探索）
- [ ] 研究 Magenta.js MusicRNN / MusicVAE 在浏览器中的可行性
- [ ] 输入几个主手弹出的音符，AI 实时生成下一段旋律
- [ ] 探索手势 → MIDI → AI → 声音的完整闭环

---

## 八、乐理速查表（给完全不懂乐理的你）

### 8.1 为什么"乱晃也能好听"？

秘诀是 **五声音阶 (Pentatonic Scale)**。

传统西方音阶有 7 个音 (Do Re Mi Fa Sol La Si)，其中 Fa 和 Si 是"危险音"，放在一起容易刺耳。而五声音阶只有 5 个：**Do Re Mi Sol La**（去掉了 Fa 和 Si）。

在五声音阶中，无论你怎么随机组合这 5 个音，都不会产生刺耳的不协和感。这就是为什么所有的儿童木琴都只有 5 根木条——怎么敲都好听！

**我们只要让效果手 B 的音符输出锁定在五声音阶内，用户完全不需要懂乐理，怎么乱甩都是悦耳的。**

### 8.2 什么是"和弦进行"？

我们当前的系统使用了一个 D 小调的和弦循环：

```
Dm    →    Bb    →    F    →    C
(忧伤)    (黑暗)    (明亮)    (期待)
 ↓                              ↓
 └──────────── 循环 ────────────┘
```

主手 A 在这4个和弦之间缓慢切换（每2小节切一次），底层的 Drone/Bass 跟着走。效果手 B 的琶音也会自动跟着和弦变，用户无需知道当前是什么和弦。

### 8.3 "笛子模式"的音高怎么映射？

```
手机竖直举过头顶 (y轴加速度最大)
          ↓ 映射
       最高音 C6 (高音 Do)
          │
       中间音 C4 (中央 Do)  ← 手机水平端着
          │
       最低音 C2 (低音 Do)
          ↓ 映射
手机朝下垂放 (y轴加速度最小)
```

加上 `Portamento`（自动滑音）效果，音高之间的过渡会像真正吹笛子一样丝滑连贯，而不是生硬跳跃。

---

> **总结**：您的直觉极其准确——"一只手做底、一只手做花"，正是全世界 DJ 控制器和电子乐器的黄金架构。
> 我们只需分阶段把它搭建起来，就能让 Dance Sync 从一个"体感音乐玩具"进化为一台真正的**穿戴式双手舞蹈乐器**。
