/**
 * 太空飞机大战 (Space Shooter) - AI 生成代码
 * 基于提供的 README.md 规范实现
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const hpFill = document.getElementById('hp-bar-fill');
const scoreEl = document.getElementById('score-display');
const weaponEl = document.getElementById('weapon-display');

// --- 游戏配置 ---
const CFG = {
    playerSpeed: 5,
    maxHp: 100,
    dmgShip: 15,    // 飞机伤害
    dmgMeteor: 10,  // 陨石伤害
    dropRate: 0.3,  // 掉落概率
    weaponDuration: 5000 // 武器持续时间 (ms)
};

// --- 游戏状态 ---
let state = {
    active: false,
    score: 0,
    lastTime: 0,
    enemySpawnTimer: 0,
    bgmLoop: null
};

// 玩家对象
let player = {
    x: 0, y: 0, r: 20,
    hp: CFG.maxHp,
    weaponLevel: 1,
    weaponTimer: 0,
    isHurt: false,
    hurtTimer: 0
};

// 实体池
let bullets = [];
let enemies = [];
let items = [];
let particles = [];
let keys = {};

// --- 音效系统 (Web Audio API) ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
const actx = new AudioContext();

const Sound = {
    playTone: (freq, type, duration, vol = 0.1) => {
        if (actx.state === 'suspended') actx.resume();
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, actx.currentTime);
        gain.gain.setValueAtTime(vol, actx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + duration);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start();
        osc.stop(actx.currentTime + duration);
    },
    shoot: () => Sound.playTone(800, 'triangle', 0.1, 0.05),
    hit: () => Sound.playTone(100, 'sawtooth', 0.2, 0.1),
    collect: () => { // 拾取音效: 快速升调
        if (actx.state === 'suspended') actx.resume();
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.frequency.setValueAtTime(400, actx.currentTime);
        osc.frequency.linearRampToValueAtTime(1200, actx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, actx.currentTime);
        gain.gain.linearRampToValueAtTime(0, actx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start();
        osc.stop(actx.currentTime + 0.1);
    },
    bgm: () => {
        // 简单的循环背景低音
        if (state.bgmLoop) clearInterval(state.bgmLoop);
        state.bgmLoop = setInterval(() => {
            if (!state.active) return;
            Sound.playTone(50, 'sine', 0.5, 0.02);
        }, 1000);
    }
};

// --- 初始化与输入 ---
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (!state.active) {
        player.x = canvas.width / 2;
        player.y = canvas.height - 100;
    }
}
window.addEventListener('resize', resize);

// 键盘控制 (PC)
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// 触摸控制 (Mobile)
canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const touch = e.touches[0];
    player.x = touch.clientX;
    player.y = touch.clientY - 50; // 手指上方一点
}, { passive: false });

// --- 核心逻辑 ---

function spawnEnemy() {
    // 难度递增: 分数越高生成越快
    const interval = Math.max(20, 60 - Math.floor(state.score / 500));
    if (state.enemySpawnTimer++ < interval) return;
    state.enemySpawnTimer = 0;

    const isShip = Math.random() > 0.4; // 60% 飞机, 40% 陨石
    const r = isShip ? 20 : 25;
    enemies.push({
        x: Math.random() * (canvas.width - 2 * r) + r,
        y: -r,
        r: r,
        type: isShip ? 'ship' : 'meteor',
        hp: isShip ? 2 : 5,
        speed: Math.random() * 2 + 2 + (state.score / 5000)
    });
}

function fireBullet() {
    if (Date.now() % 200 > 20) return; // 射击频率控制

    Sound.shoot();
    const bSpeed = 10;
    // 武器系统
    const configs = {
        1: [{ x: 0, y: -1 }],
        2: [{ x: -0.2, y: -1 }, { x: 0.2, y: -1 }],
        3: [{ x: -0.3, y: -1 }, { x: 0, y: -1 }, { x: 0.3, y: -1 }],
        4: [{ x: -0.4, y: -1 }, { x: -0.15, y: -1 }, { x: 0.15, y: -1 }, { x: 0.4, y: -1 }],
        5: [{ x: -0.5, y: -1 }, { x: -0.25, y: -1 }, { x: 0, y: -1 }, { x: 0.25, y: -1 }, { x: 0.5, y: -1 }]
    };

    const pattern = configs[player.weaponLevel] || configs[1];
    pattern.forEach(p => {
        bullets.push({
            x: player.x,
            y: player.y - 20,
            vx: p.x * bSpeed,
            vy: p.y * bSpeed
        });
    });
}

function update(time) {
    if (!state.active) return;
    const dt = time - state.lastTime;
    state.lastTime = time;

    // 1. 玩家移动 (WASD)
    if (keys['w'] || keys['arrowup']) player.y -= CFG.playerSpeed;
    if (keys['s'] || keys['arrowdown']) player.y += CFG.playerSpeed;
    if (keys['a'] || keys['arrowleft']) player.x -= CFG.playerSpeed;
    if (keys['d'] || keys['arrowright']) player.x += CFG.playerSpeed;

    // 边界限制
    player.x = Math.max(player.r, Math.min(canvas.width - player.r, player.x));
    player.y = Math.max(player.r, Math.min(canvas.height - player.r, player.y));

    // 2. 自动射击
    fireBullet();

    // 3. 武器计时
    if (player.weaponLevel > 1) {
        player.weaponTimer -= dt;
        if (player.weaponTimer <= 0) {
            player.weaponLevel = 1;
            uiUpdate();
        }
    }

    // 4. 生成与更新实体
    spawnEnemy();

    // 更新子弹
    bullets.forEach((b, i) => {
        b.x += b.vx; b.y += b.vy;
        if (b.y < 0) bullets.splice(i, 1);
    });

    // 更新敌人
    enemies.forEach((e, i) => {
        e.y += e.speed;

        // 碰撞检测: 敌人 vs 玩家
        const dist = Math.hypot(player.x - e.x, player.y - e.y);
        if (dist < player.r + e.r) {
            const dmg = e.type === 'ship' ? CFG.dmgShip : CFG.dmgMeteor;
            takeDamage(dmg);
            enemies.splice(i, 1);
            createParticles(e.x, e.y, 'orange');
            return;
        }

        // 碰撞检测: 敌人 vs 子弹
        bullets.forEach((b, j) => {
            if (Math.hypot(b.x - e.x, b.y - e.y) < e.r) {
                e.hp--;
                bullets.splice(j, 1);
                if (e.hp <= 0) {
                    state.score += (e.type === 'ship' ? 10 : 20);
                    Sound.hit();
                    createParticles(e.x, e.y, '#fff');
                    tryDropItem(e.x, e.y, e.type);
                    enemies.splice(i, 1);
                }
            }
        });

        if (e.y > canvas.height) enemies.splice(i, 1);
    });

    // 更新道具
    items.forEach((item, i) => {
        item.y += 2;
        if (Math.hypot(player.x - item.x, player.y - item.y) < player.r + 15) {
            applyItem(item.type);
            items.splice(i, 1);
        } else if (item.y > canvas.height) {
            items.splice(i, 1);
        }
    });

    // 更新粒子
    particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy; p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    });

    uiUpdate();
    draw();
    requestAnimationFrame(update);
}

// 掉落逻辑
function tryDropItem(x, y, enemyType) {
    if (Math.random() > CFG.dropRate) return;

    // 智能分配: 飞机倾向掉武器(0.8)，陨石倾向掉血(0.7)
    let isWeapon = false;
    if (enemyType === 'ship') isWeapon = Math.random() < 0.8;
    else isWeapon = Math.random() > 0.7;

    items.push({ x, y, type: isWeapon ? 'weapon' : 'heal' });
}

function applyItem(type) {
    Sound.collect();
    if (type === 'heal') {
        player.hp = Math.min(CFG.maxHp, player.hp + 25);
    } else {
        player.weaponLevel = Math.min(5, player.weaponLevel + 1);
        player.weaponTimer = CFG.weaponDuration;
    }
}

function takeDamage(dmg) {
    player.hp -= dmg;
    player.isHurt = true;
    player.hurtTimer = 10;
    Sound.hit(); // 借用爆炸声
    if (player.hp <= 0) gameOver();
}

function createParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            life: 20, color
        });
    }
}

// --- 渲染 ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制玩家
    ctx.save();
    ctx.translate(player.x, player.y);
    if (player.hurtTimer > 0) {
        ctx.globalAlpha = 0.5; // 受伤闪烁
        player.hurtTimer--;
    }
    ctx.fillStyle = '#00d2ff';
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(-20, 20);
    ctx.lineTo(0, 10);
    ctx.lineTo(20, 20);
    ctx.fill();
    ctx.restore();

    // 敌人
    enemies.forEach(e => {
        ctx.fillStyle = e.type === 'ship' ? '#ff4757' : '#ffa502';
        ctx.beginPath();
        if (e.type === 'ship') { // 三角形飞机
            ctx.moveTo(e.x, e.y + e.r);
            ctx.lineTo(e.x - e.r, e.y - e.r);
            ctx.lineTo(e.x + e.r, e.y - e.r);
        } else { // 圆形陨石
            ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        }
        ctx.fill();
    });

    // 子弹
    ctx.fillStyle = '#ffff00';
    bullets.forEach(b => {
        ctx.fillRect(b.x - 2, b.y - 5, 4, 10);
    });

    // 道具
    items.forEach(item => {
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(item.type === 'heal' ? '✚' : '⚡', item.x, item.y);
    });

    // 粒子
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
    });
}

function uiUpdate() {
    hpFill.style.width = Math.max(0, (player.hp / CFG.maxHp) * 100) + '%';
    scoreEl.innerText = `分数: ${state.score}`;
    let wText = `Lv.${player.weaponLevel}`;
    if (player.weaponLevel > 1) {
        wText += ` (${Math.ceil(player.weaponTimer / 1000)}s)`;
    }
    weaponEl.innerText = `武器: ${wText}`;
}

// --- 流程控制 ---
function startGame() {
    state.active = true;
    state.score = 0;
    player.hp = CFG.maxHp;
    player.weaponLevel = 1;
    enemies = [];
    bullets = [];
    items = [];
    resize();

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');

    Sound.bgm();
    requestAnimationFrame(update);
}

function gameOver() {
    state.active = false;
    clearInterval(state.bgmLoop);
    document.getElementById('final-score').innerText = `最终分数: ${state.score}`;
    document.getElementById('game-over-screen').classList.remove('hidden');
}

document.getElementById('start-btn').onclick = startGame;
document.getElementById('restart-btn').onclick = startGame;

resize(); // 初始化一次大小