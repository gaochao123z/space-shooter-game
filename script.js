// 游戏变量
let canvas, ctx;
let player;
let bullets = [];
let enemies = [];
let stars = [];
let score = 0;
let lives = 3;
let gameRunning = false;
let gamePaused = false;
let lastTime = 0;
let enemySpawnTimer = 0;
let bulletSpawnTimer = 0;

// 键盘状态
const keys = {
  w: false,
  a: false,
  s: false,
  d: false
};

// 游戏元素类
class Player {
  constructor() {
    this.width = 50;
    this.height = 40;
    this.x = canvas.width / 2 - this.width / 2;
    this.y = canvas.height - this.height - 20;
    this.speed = 5;
    this.color = '#4fc3f7';
  }

  draw() {
    // 绘制飞船主体
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(this.x + this.width / 2, this.y);
    ctx.lineTo(this.x + this.width, this.y + this.height);
    ctx.lineTo(this.x, this.y + this.height);
    ctx.closePath();
    ctx.fill();
    
    // 绘制驾驶舱
    ctx.fillStyle = '#e3f2fd';
    ctx.beginPath();
    ctx.arc(this.x + this.width / 2, this.y + 15, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制引擎火焰
    if (keys.w || keys.a || keys.s || keys.d) {
      ctx.fillStyle = '#ff9800';
      ctx.beginPath();
      ctx.moveTo(this.x + this.width / 2 - 5, this.y + this.height);
      ctx.lineTo(this.x + this.width / 2, this.y + this.height + 10);
      ctx.lineTo(this.x + this.width / 2 + 5, this.y + this.height);
      ctx.closePath();
      ctx.fill();
    }
  }

  update() {
    // 移动控制
    if (keys.a && this.x > 0) this.x -= this.speed;
    if (keys.d && this.x < canvas.width - this.width) this.x += this.speed;
    if (keys.w && this.y > 0) this.y -= this.speed;
    if (keys.s && this.y < canvas.height - this.height) this.y += this.speed;
  }
}

class Bullet {
  constructor(x, y) {
    this.width = 4;
    this.height = 15;
    this.x = x;
    this.y = y;
    this.speed = 8;
    this.color = '#ffeb3b';
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // 添加子弹发光效果
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(this.x + 1, this.y + 2, 2, 4);
  }

  update() {
    this.y -= this.speed;
    return this.y > -this.height; // 如果子弹超出屏幕上方则返回false
  }
}

class Enemy {
  constructor(type) {
    this.type = type; // 'plane' 或 'asteroid'
    this.width = type === 'plane' ? 40 : 50;
    this.height = type === 'plane' ? 30 : 50;
    this.x = Math.random() * (canvas.width - this.width);
    this.y = -this.height;
    this.speed = type === 'plane' ? 3 : 2;
    this.color = type === 'plane' ? '#f44336' : '#795548';
  }

  draw() {
    if (this.type === 'plane') {
      // 绘制敌机
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(this.x + this.width / 2, this.y + this.height);
      ctx.lineTo(this.x, this.y);
      ctx.lineTo(this.x + this.width, this.y);
      ctx.closePath();
      ctx.fill();
      
      // 敌机驾驶舱
      ctx.fillStyle = '#ffcdd2';
      ctx.beginPath();
      ctx.arc(this.x + this.width / 2, this.y + 15, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 绘制陨石
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
      ctx.fill();
      
      // 添加陨石纹理
      ctx.fillStyle = '#5d4037';
      for (let i = 0; i < 5; i++) {
        const spotX = this.x + Math.random() * this.width;
        const spotY = this.y + Math.random() * this.height;
        const radius = Math.random() * 5;
        ctx.beginPath();
        ctx.arc(spotX, spotY, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  update() {
    this.y += this.speed;
    return this.y < canvas.height; // 如果敌人超出屏幕下方则返回false
  }
}

// 初始化游戏
function init() {
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');
  
  // 创建星空背景
  createStars();
  
  // 初始化玩家
  player = new Player();
  
  // 绑定事件监听器
  bindEventListeners();
  
  // 启动游戏循环
  requestAnimationFrame(gameLoop);
}

// 创建星空背景
function createStars() {
  stars = [];
  for (let i = 0; i < 100; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2,
      opacity: Math.random() * 0.5 + 0.1
    });
  }
}

// 绘制星空背景
function drawStars() {
  for (let star of stars) {
    ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 绑定事件监听器
function bindEventListeners() {
  // 键盘事件
  document.addEventListener('keydown', (e) => {
    if (e.key === 'w' || e.key === 'W') keys.w = true;
    if (e.key === 'a' || e.key === 'A') keys.a = true;
    if (e.key === 's' || e.key === 'S') keys.s = true;
    if (e.key === 'd' || e.key === 'D') keys.d = true;
  });
  
  document.addEventListener('keyup', (e) => {
    if (e.key === 'w' || e.key === 'W') keys.w = false;
    if (e.key === 'a' || e.key === 'A') keys.a = false;
    if (e.key === 's' || e.key === 'S') keys.s = false;
    if (e.key === 'd' || e.key === 'D') keys.d = false;
  });
  
  // 按钮事件
  document.getElementById('start-btn').addEventListener('click', startGame);
  document.getElementById('resume-btn').addEventListener('click', resumeGame);
  document.getElementById('restart-btn').addEventListener('click', restartGame);
}

// 开始游戏
function startGame() {
  gameRunning = true;
  gamePaused = false;
  score = 0;
  lives = 3;
  bullets = [];
  enemies = [];
  updateScore();
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('pause-screen').classList.add('hidden');
  document.getElementById('game-over-screen').classList.add('hidden');
}

// 暂停游戏
function pauseGame() {
  gamePaused = true;
  document.getElementById('pause-screen').classList.remove('hidden');
}

// 继续游戏
function resumeGame() {
  gamePaused = false;
  document.getElementById('pause-screen').classList.add('hidden');
}

// 重新开始游戏
function restartGame() {
  gameRunning = true;
  gamePaused = false;
  score = 0;
  lives = 3;
  bullets = [];
  enemies = [];
  player = new Player();
  updateScore();
  document.getElementById('game-over-screen').classList.add('hidden');
  document.getElementById('pause-screen').classList.add('hidden');
}

// 更新分数显示
function updateScore() {
  document.getElementById('score-value').textContent = score;
  document.getElementById('lives-value').textContent = lives;
}

// 游戏主循环
function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;
  
  if (gameRunning && !gamePaused) {
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制星空背景
    drawStars();
    
    // 更新和绘制玩家
    player.update();
    player.draw();
    
    // 自动发射子弹
    if (timestamp - bulletSpawnTimer > 200) { // 每200ms发射一次子弹
      bullets.push(new Bullet(player.x + player.width / 2 - 2, player.y));
      bulletSpawnTimer = timestamp;
    }
    
    // 更新和绘制子弹
    for (let i = bullets.length - 1; i >= 0; i--) {
      if (!bullets[i].update()) {
        bullets.splice(i, 1);
      } else {
        bullets[i].draw();
      }
    }
    
    // 生成敌人
    if (timestamp - enemySpawnTimer > 1000) { // 每1000ms生成一个敌人
      const enemyType = Math.random() > 0.5 ? 'plane' : 'asteroid';
      enemies.push(new Enemy(enemyType));
      enemySpawnTimer = timestamp;
    }
    
    // 更新和绘制敌人
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (!enemies[i].update()) {
        enemies.splice(i, 1);
      } else {
        enemies[i].draw();
      }
    }
    
    // 检测碰撞
    checkCollisions();
  }
  
  requestAnimationFrame(gameLoop);
}

// 检测碰撞
function checkCollisions() {
  // 子弹与敌人的碰撞
  for (let i = bullets.length - 1; i >= 0; i--) {
    for (let j = enemies.length - 1; j >= 0; j--) {
      if (
        bullets[i].x < enemies[j].x + enemies[j].width &&
        bullets[i].x + bullets[i].width > enemies[j].x &&
        bullets[i].y < enemies[j].y + enemies[j].height &&
        bullets[i].y + bullets[i].height > enemies[j].y
      ) {
        // 碰撞发生
        bullets.splice(i, 1);
        enemies.splice(j, 1);
        score += enemies[j].type === 'plane' ? 10 : 5; // 飞机10分，陨石5分
        updateScore();
        break;
      }
    }
  }
  
  // 玩家与敌人的碰撞
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (
      player.x < enemies[i].x + enemies[i].width &&
      player.x + player.width > enemies[i].x &&
      player.y < enemies[i].y + enemies[i].height &&
      player.y + player.height > enemies[i].y
    ) {
      // 碰撞发生
      enemies.splice(i, 1);
      lives--;
      updateScore();
      
      if (lives <= 0) {
        gameOver();
      }
    }
  }
}

// 游戏结束
function gameOver() {
  gameRunning = false;
  document.getElementById('final-score').textContent = score;
  document.getElementById('game-over-screen').classList.remove('hidden');
}

// 初始化游戏
window.onload = init;