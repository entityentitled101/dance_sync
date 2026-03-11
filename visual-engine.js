// visual-engine.js
// 为 Dance Sync 设计的纯前端解耦视觉引擎（终极 FPV飞行控制 + 纯粹波形复刻版）

class VisualEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // --- 星空与行星 (Retro Flight) ---
        this.numStars = window.innerWidth < 768 ? 200 : 400;
        this.stars = [];
        this.flightZOffset = 0;

        // --- 摄影机姿态 (Retro Flight) ---
        this.camX = 0;
        this.camY = -150;
        this.camRoll = 0;
        this.camPitch = 0;
        // 目标姿态 (由陀螺仪控制)
        this.targetCamX = 0;
        this.targetCamY = -150;
        this.targetCamRoll = 0;
        this.targetCamPitch = 0;

        // --- 数据源 ---
        this.velocity = 0;
        this.energy = 0;
        // 陀螺仪旋转 (alpha, beta, gamma)
        this.rotation = { alpha: 0, beta: 0, gamma: 0 };

        // --- 前端 UI 控制参数 ---
        this.visPreset = 2; // 0=Topological, 1=Retro Flight, 2=Joy Division
        this.damping = 0.6;
        this.flightSpeed = 10;
        this.steeringSens = 0.2;
        this.waveAmp = 0.2; // 默认拉低到绝佳视觉比例
        this.zoom = 1.0;
        this.thickness = 0.5;
        this.blurBase = 0.15;
        this.colorRGB = "255, 255, 255";

        // 缓动与时间
        this.smoothVelocity = 0;
        this.smoothEnergy = 0;
        this.time = 0;

        this.centerX = this.width / 2;
        this.centerY = this.height / 2;

        window.addEventListener('resize', () => this.resize());
        this.initNodes();
        this.animate();
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        this.initNodes();
    }

    initNodes() {
        this.stars = [];
        for (let i = 0; i < this.numStars; i++) {
            // 类型分配：90% 星光，10% 三维大天体
            let kind = 'star';
            let r = Math.random();
            if (r > 0.90) { // 10% planets
                let pr = Math.random();
                if (pr > 0.6) kind = 'planet_mesh';          // 正常三维网格球
                else if (pr > 0.3) kind = 'planet_ring';     // 带土星环的球
                else kind = 'planet_poly';                   // 未知异形多面体 (八面体结晶)
            }

            this.stars.push({
                x: (Math.random() - 0.5) * 12000,
                y: -(Math.random() * 8000),
                z: Math.random() * 8000,
                type: kind,
                radius: Math.random() * 1500 + 400,
                rotY: Math.random() * Math.PI * 2,
                rotX: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.002,
                // 用于星球随机比例的异形缩放
                scaleX: Math.random() * 0.6 + 0.7,
                scaleY: Math.random() * 0.6 + 0.7,
                scaleZ: Math.random() * 0.6 + 0.7
            });
        }
    }

    updateData(velocity, energy, rotation) {
        this.velocity = velocity;
        this.energy = energy;
        if (rotation) {
            this.rotation = rotation;
        }
    }

    updateSettings(config) {
        if (config.visPreset !== undefined) this.visPreset = config.visPreset;
        if (config.damping !== undefined) this.damping = config.damping;
        if (config.flightSpeed !== undefined) this.flightSpeed = config.flightSpeed;
        if (config.steeringSens !== undefined) this.steeringSens = config.steeringSens;
        if (config.waveAmp !== undefined) this.waveAmp = config.waveAmp;
        if (config.zoom !== undefined) this.zoom = config.zoom;
        if (config.thickness !== undefined) this.thickness = config.thickness;
        if (config.blurBase !== undefined) this.blurBase = config.blurBase;

        if (config.color !== undefined) {
            let hex = config.color.replace('#', '');
            this.colorRGB = `${parseInt(hex.substring(0, 2), 16)}, ${parseInt(hex.substring(2, 4), 16)}, ${parseInt(hex.substring(4, 6), 16)}`;
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        let smoothingFactor = (this.damping * this.damping) * 0.15;
        this.smoothVelocity += (this.velocity - this.smoothVelocity) * smoothingFactor;
        this.smoothEnergy += (this.energy - this.smoothEnergy) * smoothingFactor;

        this.time += 0.005 + (this.smoothVelocity / 150000);

        // 飞行姿态计算 (完全抛弃手机硬件陀螺仪，改用基于运动能量的程序化 FPV 穿越机模拟)
        let moveIntensity = this.smoothEnergy / 100; // 0.0 ~ 1.0 (激烈挥动时可达1.0+)
        let swayTime = this.time * 2.5;

        // 利用带有无理数的正弦波叠加产生不可预测的类 S 型机动（大过载翻转飞行）
        let pseudoRoll = Math.sin(swayTime * 0.7) * Math.cos(swayTime * 1.3);
        let pseudoPitch = Math.sin(swayTime * 1.1) * Math.cos(swayTime * 0.8) * 0.6; // 稍微偏向下方一点点

        // 将能量映射为动作幅度：静止时平稳，挥动越猛，飞船翻滚和俯仰幅度越大！
        // steeringSens 将成倍放大这种失控边缘的穿越机机动感
        this.targetCamRoll = pseudoRoll * moveIntensity * 1.2 * this.steeringSens;
        this.targetCamPitch = pseudoPitch * moveIntensity * 0.8 * this.steeringSens;

        this.targetCamX = pseudoRoll * moveIntensity * 3000 * this.steeringSens;
        this.targetCamY = -150 + (this.targetCamPitch * 2000 * this.steeringSens);

        // 摄像机姿态极度平滑过渡
        this.camX += (this.targetCamX - this.camX) * 0.05;
        this.camY += (this.targetCamY - this.camY) * 0.05;
        this.camRoll += (this.targetCamRoll - this.camRoll) * 0.05;
        this.camPitch += (this.targetCamPitch - this.camPitch) * 0.05;

        // 残影参数抹屏
        let blurAlpha = Math.max(0.01, this.blurBase - (this.smoothEnergy / 5000));

        if (this.visPreset === 2 && this.blurBase >= 0.45) {
            this.ctx.fillStyle = `#000`;
        } else if (this.visPreset === 1) {
            this.ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0.6, blurAlpha * 2)})`;
        } else {
            this.ctx.fillStyle = `rgba(0, 0, 0, ${blurAlpha})`;
        }
        this.ctx.fillRect(0, 0, this.width, this.height);

        if (this.visPreset === 0) {
            this.drawTopologicalWireframe();
        } else if (this.visPreset === 1) {
            this.drawRetroFlightSim();
        } else if (this.visPreset === 2) {
            this.drawJoyDivisionWaves();
        }
    }

    // ===============================================
    // 方案一：高级 3D 六轴飞行 (Retro Flight FPV)
    // 带有天空巨型剪裁区，防止星球显示在跑道地平线以下穿模！
    // ===============================================
    drawRetroFlightSim() {
        const cWire = `rgba(${this.colorRGB}, 1)`;
        const cDim = `rgba(${this.colorRGB}, 0.25)`;
        const cDimmer = `rgba(${this.colorRGB}, 0.1)`;

        const currentSpeed = this.flightSpeed * 0.8;
        this.flightZOffset += currentSpeed;

        const fov = 400;
        const maxZ = 6000;
        const gridSpacingX = 400;
        const gridSpacingZ = 400;
        const groundY = 0; // 绝对地平线海拔为0

        // 这是适应手机竖屏和桌面横屏的基础地面积宽
        const numX = window.innerWidth > 1000 ? 12 : 7;

        // 3D 旋转函数 (处理 Pitch, Roll 姿态仪)
        const project3D = (x, y, z) => {
            let dx = x - this.camX;
            let dy = y - this.camY;
            let dz = z;

            // Pitch 使得机头上下
            let py = dy * Math.cos(-this.camPitch) - dz * Math.sin(-this.camPitch);
            let pz = dy * Math.sin(-this.camPitch) + dz * Math.cos(-this.camPitch);
            dy = py; dz = pz;

            // Roll 左右倾斜滚转
            let rx = dx * Math.cos(this.camRoll) - dy * Math.sin(this.camRoll);
            let ry = dx * Math.sin(this.camRoll) + dy * Math.cos(this.camRoll);
            dx = rx; dy = ry;

            if (dz > 10) {
                let scale = fov / dz;
                return {
                    x: this.centerX + dx * scale,
                    y: this.centerY + dy * scale,
                    scale: scale,
                    z: dz
                };
            }
            return null;
        };

        // ==========================
        // 1. SKY CLIPPING (天空遮罩)
        // 计算天际线在当前翻滚下的屏幕轨迹，强制裁切上方区域画星星
        // ==========================
        this.ctx.save();
        let hLeft = project3D(-1e6, groundY, 1e5);
        let hRight = project3D(1e6, groundY, 1e5);
        if (hLeft && hRight) {
            this.ctx.beginPath();
            this.ctx.moveTo(hLeft.x, hLeft.y);
            this.ctx.lineTo(hRight.x, hRight.y);
            // normal pointing upwards (-Y direction of screen for sky!)
            let dirX = hRight.x - hLeft.x;
            let dirY = hRight.y - hLeft.y;
            // The orthogonal vector pointing up is (dirY, -dirX)
            // Push points extremely far up to cover all sky
            this.ctx.lineTo(hRight.x + dirY * 10000, hRight.y - dirX * 10000);
            this.ctx.lineTo(hLeft.x + dirY * 10000, hLeft.y - dirX * 10000);
            this.ctx.closePath();
            this.ctx.clip(); // 启用天顶隔离盾！下面的星球绝不会漏进地板了
        }

        // ==========================
        // 2. STARS & PLANETS (星辰与各种形态的行星)
        // ==========================
        for (let s of this.stars) {
            // 星星极慢位移产生深空视差
            s.z -= currentSpeed * 0.1;
            s.rotY += s.rotSpeed;
            s.rotX += s.rotSpeed * 0.5;

            if (s.z < 10) {
                s.z = maxZ + 2000;
                s.x = (Math.random() - 0.5) * 12000 + this.camX;
                s.y = -(Math.random() * 6000) - 1000 + this.camY;
            }

            let p = project3D(s.x, s.y, s.z);
            if (!p) continue;

            let fade = 1 - (p.z / maxZ);
            if (fade <= 0) continue;

            if (s.type === 'star') {
                // 普通远星
                let sz = Math.max(1, (1500 / p.z) * this.thickness * 0.8);
                this.ctx.fillStyle = `rgba(${this.colorRGB}, ${fade})`;
                this.ctx.fillRect(p.x, p.y, sz, sz);
            }
            else if (s.type === 'planet_mesh') {
                // 三维经纬网格球
                let rad = s.radius * p.scale;
                this.ctx.strokeStyle = `rgba(${this.colorRGB}, ${fade * 0.2})`;
                this.ctx.lineWidth = 0.5;

                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
                this.ctx.stroke();

                this.ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    let angle = s.rotY + (i * Math.PI / 6);
                    let ellipseW = Math.abs(rad * Math.cos(angle));
                    if (ellipseW > 0.1) this.ctx.ellipse(p.x, p.y, ellipseW, rad, this.camRoll, 0, Math.PI * 2);
                }
                for (let i = -3; i <= 3; i++) {
                    if (i === 0) continue;
                    let latY = (i / 4) * rad;
                    let latRad = Math.sqrt(rad * rad - latY * latY);
                    let offset = Math.sin(s.rotX) * latY;
                    this.ctx.ellipse(p.x, p.y + offset, latRad, latRad * 0.2, this.camRoll, 0, Math.PI * 2);
                }
                this.ctx.stroke();
            }
            else if (s.type === 'planet_ring') {
                // 土星型 (星球 + 重叠法线圆环)
                let rad = s.radius * p.scale;
                this.ctx.strokeStyle = `rgba(${this.colorRGB}, ${fade * 0.25})`;
                this.ctx.lineWidth = 0.5;

                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); // Body
                this.ctx.stroke();

                this.ctx.beginPath();
                let ringRadX = rad * 2.0;
                let ringRadY = rad * 0.4;
                // 土星环因为倾角问题发生畸变
                this.ctx.ellipse(p.x, p.y, ringRadX, ringRadY, this.camRoll + s.rotY * 0.5, 0, Math.PI * 2);
                this.ctx.ellipse(p.x, p.y, ringRadX * 0.8, ringRadY * 0.8, this.camRoll + s.rotY * 0.5, 0, Math.PI * 2);
                this.ctx.stroke();
            }
            else if (s.type === 'planet_poly') {
                // 经典怀旧宇宙的立体结晶（八面体 Octahedron）
                let verts = [
                    { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
                    { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }
                ];
                let edges = [
                    [0, 2], [0, 3], [0, 4], [0, 5],
                    [1, 2], [1, 3], [1, 4], [1, 5],
                    [2, 4], [4, 3], [3, 5], [5, 2]
                ];

                let pVerts = [];
                let sinY = Math.sin(s.rotY), cosY = Math.cos(s.rotY);
                let sinX = Math.sin(s.rotX), cosX = Math.cos(s.rotX);

                for (let v of verts) {
                    // 应用自身星球的不规则缩放
                    let vx = v.x * s.radius * s.scaleX;
                    let vy = v.y * s.radius * s.scaleY;
                    let vz = v.z * s.radius * s.scaleZ;
                    // 自转
                    let y1 = vy * cosX - vz * sinX;
                    let z1 = vy * sinX + vz * cosX;
                    let x2 = vx * cosY - z1 * sinY;
                    let z2 = vx * sinY + z1 * cosY;

                    let vp = project3D(s.x + x2, s.y + y1, s.z + z2);
                    pVerts.push(vp);
                }

                this.ctx.strokeStyle = `rgba(${this.colorRGB}, ${fade * 0.35})`;
                this.ctx.lineWidth = Math.max(0.5, this.thickness * 0.5);
                this.ctx.beginPath();

                let allValid = true;
                for (let v of pVerts) if (!v || v.z < 10) allValid = false;

                if (allValid) {
                    for (let e of edges) {
                        this.ctx.moveTo(pVerts[e[0]].x, pVerts[e[0]].y);
                        this.ctx.lineTo(pVerts[e[1]].x, pVerts[e[1]].y);
                    }
                    this.ctx.stroke();
                }
            }
        }

        this.ctx.restore(); // 取消天空遮罩！！

        // ==========================
        // 3. 绝对平坦的无尽飞跃跑道
        // ==========================
        this.ctx.lineWidth = this.thickness + 0.2;

        const zCycle = this.flightZOffset % gridSpacingZ;

        // 横向地形网格
        for (let iz = 10; iz <= maxZ; iz += gridSpacingZ) {
            let z = iz - zCycle;
            if (z < 10) continue;

            this.ctx.beginPath();
            let started = false;
            // 横向超宽以避免视角大幅度倾斜时穿帮
            for (let ix = -numX * 5; ix <= numX * 5; ix++) {
                let x = ix * gridSpacingX + (Math.floor(this.camX / gridSpacingX) * gridSpacingX);
                let p = project3D(x, groundY, z);
                if (p) {
                    if (!started) { this.ctx.moveTo(p.x, p.y); started = true; }
                    else this.ctx.lineTo(p.x, p.y);
                }
            }
            let zFade = 1 - Math.pow((z / maxZ), 1.5);
            this.ctx.strokeStyle = `rgba(${this.colorRGB}, ${Math.max(0, zFade * 0.6)})`;
            this.ctx.stroke();
        }

        // 纵向地形网格 
        this.ctx.beginPath();
        for (let ix = -numX * 4; ix <= numX * 4; ix++) {
            let x = ix * gridSpacingX + (Math.floor(this.camX / gridSpacingX) * gridSpacingX);
            let started = false;
            for (let iz = maxZ; iz > 10; iz -= gridSpacingZ) {
                let z = iz - zCycle;
                let p = project3D(x, groundY, z);
                if (p) {
                    if (!started) { this.ctx.moveTo(p.x, p.y); started = true; }
                    else this.ctx.lineTo(p.x, p.y);
                }
            }
        }
        this.ctx.strokeStyle = cDimmer;
        this.ctx.stroke();

        // 天际线 (一条从极左延伸到极右的死线)
        this.ctx.beginPath();
        if (hLeft && hRight) {
            this.ctx.moveTo(hLeft.x, hLeft.y);
            this.ctx.lineTo(hRight.x, hRight.y);
        }
        this.ctx.strokeStyle = cWire;
        this.ctx.lineWidth = this.thickness;
        this.ctx.stroke();


        // ==========================
        // 4. RETRO HUD (底部控制面板 - 固定绝对位移)
        // ==========================
        const HUD_HEIGHT = 160;
        const HUD_Y = this.height - HUD_HEIGHT;
        const CENTER_Y = HUD_Y + 70;

        this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0, HUD_Y, this.width, HUD_HEIGHT);

        this.ctx.strokeStyle = cWire;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, HUD_Y); this.ctx.lineTo(this.width, HUD_Y);
        this.ctx.moveTo(0, HUD_Y + 4); this.ctx.lineTo(this.width, HUD_Y + 4);
        this.ctx.stroke();

        this.ctx.fillStyle = cWire;
        this.ctx.font = "bold 11px 'Courier New', Courier, monospace";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";

        let cxCen = this.centerX;
        let spacing = window.innerWidth > 600 ? 180 : 90;

        const drawCyberFrame = (x, y, w, h) => {
            this.ctx.strokeStyle = cDim;
            this.ctx.strokeRect(x, y, w, h);
            this.ctx.strokeStyle = cWire;
            this.ctx.beginPath();
            this.ctx.moveTo(x - 4, y + 10); this.ctx.lineTo(x - 4, y - 4); this.ctx.lineTo(x + 10, y - 4);
            this.ctx.moveTo(x + w - 10, y - 4); this.ctx.lineTo(x + w + 4, y - 4); this.ctx.lineTo(x + w + 4, y + 10);
            this.ctx.moveTo(x - 4, y + h - 10); this.ctx.lineTo(x - 4, y + h + 4); this.ctx.lineTo(x + 10, y + h + 4);
            this.ctx.moveTo(x + w - 10, y + h + 4); this.ctx.lineTo(x + w + 4, y + h + 4); this.ctx.lineTo(x + w + 4, y + h - 10);
            this.ctx.stroke();
        };

        let cx1 = cxCen - spacing;
        drawCyberFrame(cx1 - 40, CENTER_Y - 40, 80, 80);
        this.ctx.fillText("VELOCITY", cx1, CENTER_Y - 25);
        this.ctx.fillText("CM/S", cx1, CENTER_Y - 10);
        this.ctx.font = "bold 24px 'Courier New'";
        this.ctx.fillText(Math.floor(this.smoothVelocity).toString(), cx1, CENTER_Y + 15);
        let barW = Math.min(60, this.smoothVelocity / 2);
        this.ctx.fillRect(cx1 - 30, CENTER_Y + 32, barW, 4);

        let cx3 = cxCen;
        this.ctx.font = "bold 11px 'Courier New'";
        drawCyberFrame(cx3 - 40, CENTER_Y - 40, 80, 80);
        this.ctx.fillText("ATTITUDE", cx3, CENTER_Y - 25);
        this.ctx.fillText("PITCH", cx3, CENTER_Y - 10);
        this.ctx.font = "bold 24px 'Courier New'";
        this.ctx.fillText((this.camPitch * 180 / Math.PI).toFixed(1) + "°", cx3, CENTER_Y + 15);
        let eBarW = Math.min(60, Math.abs(this.camPitch) * 100);
        this.ctx.fillRect(cx3 - 30, CENTER_Y + 32, eBarW, 4);

        let cx4 = cxCen + spacing;
        let rRad = 40;
        drawCyberFrame(cx4 - rRad - 5, CENTER_Y - rRad - 5, rRad * 2 + 10, rRad * 2 + 10);

        this.ctx.beginPath();
        this.ctx.arc(cx4, CENTER_Y, rRad, 0, Math.PI * 2);
        this.ctx.strokeStyle = cDim;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(cx4 - rRad, CENTER_Y); this.ctx.lineTo(cx4 + rRad, CENTER_Y);
        this.ctx.moveTo(cx4, CENTER_Y - rRad); this.ctx.lineTo(cx4, CENTER_Y + rRad);
        this.ctx.arc(cx4, CENTER_Y, rRad * 0.5, 0, Math.PI * 2);
        this.ctx.stroke();

        let scanSpeed = this.time * 2.0;
        this.ctx.beginPath();
        this.ctx.moveTo(cx4, CENTER_Y);
        this.ctx.lineTo(cx4 + Math.cos(scanSpeed) * rRad, CENTER_Y + Math.sin(scanSpeed) * rRad);
        this.ctx.strokeStyle = cWire;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(cx4, CENTER_Y, 2, 0, Math.PI * 2);
        this.ctx.fillStyle = cWire;
        this.ctx.fill();

        if (this.smoothEnergy > 20) {
            let targetCount = Math.floor(this.smoothEnergy / 20);
            for (let k = 0; k < targetCount; k++) {
                let angle = (k * 2.1) % (Math.PI * 2);
                let dist = 10 + ((k * 17) % (rRad - 15));
                let MathCos = Math.cos(angle);
                let bx = cx4 + MathCos * dist;
                let by = CENTER_Y + Math.sin(angle) * dist;

                let angleDiff = Math.abs((scanSpeed % (Math.PI * 2)) - angle);
                if (angleDiff < 0.5 || angleDiff > Math.PI * 2 - 0.5) {
                    this.ctx.fillStyle = `rgba(${this.colorRGB}, 0.9)`;
                    this.ctx.fillRect(bx - 2, by - 2, 4, 4);
                    this.ctx.strokeRect(bx - 4, by - 4, 8, 8);
                } else {
                    this.ctx.fillStyle = `rgba(${this.colorRGB}, 0.2)`;
                    this.ctx.fillRect(bx - 1, by - 1, 2, 2);
                }
            }
        }
    }

    // ===============================================
    // 方案二：拓扑折叠几何 (Topological Wireframe)
    // ===============================================
    drawTopologicalWireframe() {
        const fov = 400;
        const R = Math.min(this.width, this.height) * 0.28;
        let morph1 = Math.sin(this.time * 0.4) * 3;
        let morph2 = Math.cos(this.time * 0.25) * 2;
        let distortion = (this.smoothEnergy / 80);
        this.ctx.strokeStyle = `rgba(${this.colorRGB}, 0.5)`;
        this.ctx.lineWidth = this.thickness + (this.smoothVelocity / 1600);
        this.ctx.beginPath();
        const numPoints = 250;
        for (let i = 0; i < numPoints; i++) {
            let t = (i / numPoints) * Math.PI * 2 * (3 + morph1);
            let noiseX = Math.sin(t * 12 + this.time * 4) * distortion * 6;
            let noiseY = Math.cos(t * 10 - this.time * 2.5) * distortion * 6;
            let noiseZ = Math.sin(t * 15 + this.time * 3.5) * distortion * 6;
            let rx = R * Math.cos(t) * (1 + 0.3 * Math.cos(t * morph2)) + noiseX;
            let ry = R * Math.sin(t) * (1 + 0.3 * Math.cos(t * morph2)) + noiseY;
            let rz = R * 0.4 * Math.sin(t * morph1) + noiseZ;
            let rotX = this.time * 0.3;
            let rotY = this.time * 0.45;
            let nx = rx * Math.cos(rotY) - rz * Math.sin(rotY);
            let nz = rx * Math.sin(rotY) + rz * Math.cos(rotY);
            rx = nx; rz = nz;
            let ny = ry * Math.cos(rotX) - rz * Math.sin(rotX);
            nz = ry * Math.sin(rotX) + rz * Math.cos(rotX);
            ry = ny; rz = nz;
            let scale = fov / (fov + rz + 300);
            let projX = this.centerX + rx * scale;
            let projY = this.centerY + ry * scale;

            if (i === 0) this.ctx.moveTo(projX, projY);
            else this.ctx.lineTo(projX, projY);
        }
        this.ctx.closePath();
        this.ctx.stroke();
    }

    // ===============================================
    // 方案三：Joy Division Waves (重构水平切割边界版)
    // 根据反馈：所有波形边缘绝对水平，只在中间暴突
    // ===============================================
    drawJoyDivisionWaves() {
        const numLines = 85;
        const numPoints = 140;

        const viewWidth = this.width * (window.innerWidth < 768 ? 0.95 : 0.65);
        const viewDepth = this.height * 0.65;

        const spacingX = viewWidth / numPoints;
        const spacingZ = viewDepth / numLines;

        const startX = - viewWidth / 2;
        const startZ = - viewDepth / 2;

        let angle = Math.sin(this.time * 0.1) * 0.15;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        const pitch = 0.55;
        const elevation = this.centerY + (this.height * 0.15);

        this.ctx.lineWidth = this.thickness + 0.1;

        for (let i = 0; i < numLines; i++) {
            let z = startZ + i * spacingZ;
            let normZ = i / (numLines - 1);

            this.ctx.beginPath();
            let currentLinePoints = [];

            let zFade = 0.4 + normZ * 0.6;

            for (let j = 0; j < numPoints; j++) {
                let x = startX + j * spacingX;
                let normX = j / (numPoints - 1);

                // 绝对距离中心的偏差
                let dx = normX - 0.5;
                let dist = Math.abs(dx);

                // --- 钟形遮罩控制绝对水平 ---
                // 使用极度陡峭且有绝对切割的边界
                let bellX = Math.exp(-Math.pow(dx * 7.0, 2));
                if (dist >= 0.45) bellX = 0; // 在宽幅边缘 100% 被绝对压平

                // 分形噪波（山脉生成基底）
                let MathSin2 = Math.sin(j * 0.2 + this.time * 1.5 + i * 0.3);
                let pureNoise = MathSin2 +
                    Math.cos(j * 0.45 - this.time * 0.8 - i * 0.5) * 0.5 +
                    Math.sin(j * 1.1 + this.time * 0.5 + i * 1.2) * 0.25;
                let ridge = Math.abs(pureNoise);

                // --- 能量与高度叠加 ---
                // 波峰滑块调整因子（默认我们已设为 0.2 的极简克制感）
                let ampMultiplier = this.waveAmp * 40;
                let activeEnergy = this.smoothEnergy * this.waveAmp;

                // 不同深度层的突刺参差感
                let layerBoost = 1.0;
                let rHash = Math.abs(Math.sin((i * 1234.5678)));
                if (rHash > 0.8) layerBoost = 1.6;
                else if (rHash < 0.2) layerBoost = 0.5;

                let centerAmp = (3 + activeEnergy * 0.5) * layerBoost * ampMultiplier;
                if (centerAmp > 150 * this.waveAmp) centerAmp = 150 * this.waveAmp; // 极限防炸锅

                // 侧边的偶尔神经系抖动：专辑封面里的绝对偶尔才出现的小毛刺
                let rareBump = 0;
                if (dist > 0.42) {
                    // 只在极少特定规律下，且特定深度才有小毛刺
                    if (Math.sin(j * 0.5 + i * 2.1) > 0.96 && Math.sin(this.time * 0.5 + i) > 0.5) {
                        rareBump = Math.random() * 2 * (1 - dist); // 产生极其微弱的1-2像素抖动
                    }
                }

                // 中心山脉 + 侧边缘稀有静电
                let altitude = (ridge * centerAmp * bellX) + rareBump;

                let y = -altitude;

                // 投影
                let rx = x * cosA - z * sinA;
                let rz = x * sinA + z * cosA;

                let px = this.centerX + rx * this.zoom;
                let py = elevation + (y + rz * pitch) * this.zoom;

                currentLinePoints.push({ x: px, y: py });

                if (j === 0) this.ctx.moveTo(px, py);
                else this.ctx.lineTo(px, py);
            }

            this.ctx.strokeStyle = `rgba(${this.colorRGB}, ${zFade})`;
            this.ctx.stroke();

            // 黑色实体封闭遮挡，利用 Painters Algorithm
            this.ctx.lineTo(currentLinePoints[currentLinePoints.length - 1].x, this.height + 400);
            this.ctx.lineTo(currentLinePoints[0].x, this.height + 400);
            this.ctx.closePath();

            this.ctx.fillStyle = `#000`;
            this.ctx.fill();
        }
    }
}

window.initVisualEngine = function () {
    if (!window.visualEngine) {
        window.visualEngine = new VisualEngine('visual-canvas');
        console.log('👁️ 高级艺术视觉引擎 (完全版 FP飞行与克制波形) 已加载');
    }
};
