// script.js - 增强版前端：声音、排行榜、虚拟按键、倾斜控制等
import Game from './game.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');
const scoreEl = document.getElementById('score');
const stateEl = document.getElementById('state');
const speedRange = document.getElementById('speedRange');
const levelEl = document.getElementById('level');
const levelNameEl = document.getElementById('levelName');

const tiltToggle = document.getElementById('tiltToggle');
const enableTiltBtn = document.getElementById('enableTiltBtn');
const dpad = document.getElementById('dpad');

const leaderboardList = document.getElementById('leaderboardList');
const clearLeaderboardBtn = document.getElementById('clearLeaderboard');

const nameModal = document.getElementById('nameModal');
const finalScoreEl = document.getElementById('finalScore');
const playerNameInput = document.getElementById('playerName');
const saveScoreBtn = document.getElementById('saveScoreBtn');
const closeModalBtn = document.getElementById('closeModalBtn');

const GRID = 20;
const game = new Game({cols: GRID, rows: GRID});

let cellSize;
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const size = Math.min(rect.width, 600);
  // ensure high DPI crispness
  const ratio = window.devicePixelRatio || 1;
  const px = Math.min(Math.floor(size * ratio), 2048);
  canvas.width = px;
  canvas.height = px;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  cellSize = canvas.width / GRID;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Polyfill for roundRect if not available
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
    if (typeof radius === 'number') {
      radius = { tl: radius, tr: radius, br: radius, bl: radius };
    } else {
      const defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
      for (let side in defaultRadius) {
        radius[side] = radius[side] || defaultRadius[side];
      }
    }
    this.beginPath();
    this.moveTo(x + radius.tl, y);
    this.lineTo(x + width - radius.tr, y);
    this.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    this.lineTo(x + width, y + height - radius.br);
    this.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    this.lineTo(x + radius.bl, y + height);
    this.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    this.lineTo(x, y + radius.tl);
    this.quadraticCurveTo(x, y, x + radius.tl, y);
    this.closePath();
  };
}

// 基本画面渲染
function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  
  // 更真实的背景：深绿色草地效果
  const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bgGradient.addColorStop(0, '#1a3a2a');
  bgGradient.addColorStop(0.5, '#0d2818');
  bgGradient.addColorStop(1, '#1a3a2a');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0,0,canvas.width,canvas.height);
  
  // 添加网格线效果，增强真实感
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= GRID; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cellSize, 0);
    ctx.lineTo(i * cellSize, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * cellSize);
    ctx.lineTo(canvas.width, i * cellSize);
    ctx.stroke();
  }

  const state = game.getState();
  
  // apple - 更真实的苹果
  if (state.apple) {
    drawApple(state.apple.x, state.apple.y);
  }
  
  // props/items - 道具
  if (state.props && state.props.length > 0) {
    state.props.forEach(prop => {
      drawProp(prop);
    });
  }
  
  // snake - 更真实的蛇
  for (let i = 0; i < state.snake.length; i++) {
    const p = state.snake[i];
    const isHead = i === state.snake.length - 1;
    const isTail = i === 0;
    const isInvincible = state.activeProp?.type === 'invincible';
    drawSnakeSegment(p.x, p.y, isHead, isTail, isInvincible);
  }
}

function drawSnakeSegment(x, y, isHead, isTail, isInvincible) {
  const pad = cellSize * 0.05;
  const size = cellSize * 0.9;
  const cx = x * cellSize + pad;
  const cy = y * cellSize + pad;
  const radius = size * 0.3;
  
  // 蛇的颜色
  let color1, color2;
  if (isInvincible) {
    color1 = isHead ? '#ec4899' : '#f472b6';
    color2 = isHead ? '#db2777' : '#ec4899';
  } else {
    color1 = isHead ? '#22c55e' : '#0ea5a4';
    color2 = isHead ? '#16a34a' : '#0d9488';
  }
  
  // 渐变效果
  const gradient = ctx.createRadialGradient(cx + size/3, cy + size/3, size * 0.1, cx + size/2, cy + size/2, size * 0.7);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  ctx.fillStyle = gradient;
  
  // 圆角矩形
  ctx.beginPath();
  ctx.roundRect(cx, cy, size, size, radius);
  ctx.fill();
  
  // 高光效果
  const highlightGradient = ctx.createRadialGradient(cx + size * 0.3, cy + size * 0.3, 0, cx + size * 0.3, cy + size * 0.3, size * 0.4);
  highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
  highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = highlightGradient;
  ctx.beginPath();
  ctx.arc(cx + size * 0.3, cy + size * 0.3, size * 0.25, 0, Math.PI * 2);
  ctx.fill();
  
  // 蛇头添加眼睛
  if (isHead) {
    ctx.fillStyle = '#ffffff';
    const eyeSize = size * 0.15;
    const eyeOffset = size * 0.3;
    // 左眼
    ctx.beginPath();
    ctx.arc(cx + eyeOffset, cy + size * 0.4, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    // 右眼
    ctx.beginPath();
    ctx.arc(cx + size - eyeOffset, cy + size * 0.4, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    
    // 瞳孔
    ctx.fillStyle = '#000000';
    const pupilSize = eyeSize * 0.6;
    ctx.beginPath();
    ctx.arc(cx + eyeOffset, cy + size * 0.4, pupilSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + size - eyeOffset, cy + size * 0.4, pupilSize, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawApple(x, y) {
  const pad = cellSize * 0.1;
  const size = cellSize * 0.8;
  const cx = x * cellSize + cellSize / 2;
  const cy = y * cellSize + cellSize / 2;
  const radius = size / 2;
  
  // 苹果主体 - 渐变红色
  const gradient = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, radius * 0.2, cx, cy, radius);
  gradient.addColorStop(0, '#ff6b6b');
  gradient.addColorStop(0.7, '#ff4d4f');
  gradient.addColorStop(1, '#d32f2f');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // 高光
  const highlightGradient = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.4, 0, cx - radius * 0.3, cy - radius * 0.4, radius * 0.5);
  highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
  highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = highlightGradient;
  ctx.beginPath();
  ctx.arc(cx - radius * 0.3, cy - radius * 0.4, radius * 0.4, 0, Math.PI * 2);
  ctx.fill();
  
  // 果柄
  ctx.strokeStyle = '#8b4513';
  ctx.lineWidth = cellSize * 0.05;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy - radius);
  ctx.lineTo(cx + radius * 0.2, cy - radius - cellSize * 0.15);
  ctx.stroke();
  
  // 叶子
  ctx.fillStyle = '#4caf50';
  ctx.beginPath();
  ctx.ellipse(cx + radius * 0.3, cy - radius - cellSize * 0.1, radius * 0.3, radius * 0.2, Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawProp(prop) {
  const pad = cellSize * 0.1;
  const size = cellSize * 0.8;
  const cx = prop.x * cellSize + cellSize / 2;
  const cy = prop.y * cellSize + cellSize / 2;
  const radius = size / 2;
  
  // 道具主体 - 发光效果
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  const baseColor = prop.color || '#fbbf24';
  gradient.addColorStop(0, baseColor);
  gradient.addColorStop(0.5, baseColor);
  gradient.addColorStop(1, 'rgba(251, 191, 36, 0.2)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // 闪烁效果
  const blink = Math.floor(prop.age / 10) % 2;
  if (blink === 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // 外发光环
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = cellSize * 0.05;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.9, 0, Math.PI * 2);
  ctx.stroke();
}

function drawCell(x, y, scale = 1) {
  const pad = (1 - scale) * 0.5 * cellSize;
  ctx.fillRect(Math.round(x * cellSize + pad), Math.round(y * cellSize + pad), Math.round(cellSize * scale), Math.round(cellSize * scale));
}

// 游戏循环
let loopId = null;
let running = false;
let baseInterval = 120;
let currentInterval = 120;
const SPEED_CHANGE_THRESHOLD = 5; // ms difference threshold for speed changes
let lastLevel = 1;

function gameLoop() {
  game.step();
  draw();
  scoreEl.textContent = game.score;
  
  const state = game.getState();
  
  // 更新关卡显示
  if (levelEl && levelNameEl) {
    levelEl.textContent = state.level;
    levelNameEl.textContent = state.levelData.name;
  }
  
  // 检测关卡变化并调整速度
  if (state.level !== lastLevel) {
    lastLevel = state.level;
    // 根据关卡难度调整基础速度
    const newBaseInterval = baseInterval * state.levelData.speedMultiplier;
    adjustGameSpeed(newBaseInterval);
    // 播放升级音效
    playBeep({freq: 1600, length: 0.15, gain: 0.12, type: 'triangle'});
    vibrateShort();
  }
  
  if (state.activeProp) {
    stateEl.textContent = `状态: ${state.activeProp.name} (${state.propDuration})`;
  } else {
    stateEl.textContent = '状态: 运行中';
  }
  
  if (game.over) {
    stop();
    stateEl.textContent = '状态: 游戏结束';
    startBtn.disabled = false;
    onGameOver();
  }
}

function start(interval = 120) {
  if (running) return;
  running = true;
  baseInterval = interval;
  currentInterval = interval;
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  stateEl.textContent = '状态: 运行中';
  loopId = setInterval(gameLoop, interval);
}

function adjustGameSpeed(newInterval) {
  if (!running || Math.abs(newInterval - currentInterval) <= SPEED_CHANGE_THRESHOLD) return;
  
  currentInterval = newInterval;
  clearInterval(loopId);
  loopId = setInterval(gameLoop, newInterval);
}

function stop() {
  if (!running) return;
  running = false;
  clearInterval(loopId);
  loopId = null;
  pauseBtn.disabled = true;
}

// 控件事件
startBtn.addEventListener('click', () => start(parseInt(speedRange.value, 10)));
pauseBtn.addEventListener('click', () => {
  if (running) {
    stop();
    stateEl.textContent = '状态: 已暂停';
    startBtn.disabled = false;
  }
});
restartBtn.addEventListener('click', () => {
  game.reset();
  lastLevel = 1;
  draw();
  scoreEl.textContent = 0;
  if (levelEl && levelNameEl) {
    levelEl.textContent = 1;
    levelNameEl.textContent = '初级';
  }
  stateEl.textContent = '状态: 准备';
  stop();
  startBtn.disabled = false;
  pauseBtn.disabled = true;
});
speedRange.addEventListener('change', () => {
  if (running) {
    stop();
    start(parseInt(speedRange.value, 10));
  }
});

// 键盘控制
window.addEventListener('keydown', (e) => {
  const map = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right'
  };
  const key = e.key;
  if (map[key]) {
    e.preventDefault();
    game.changeDirection(map[key]);
    lightDpad(map[key]);
  }
});

// 触摸滑动：保留之前的滑动支持
let touchStart = null;
canvas.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  touchStart = {x: t.clientX, y: t.clientY};
}, {passive: true});
canvas.addEventListener('touchend', (e) => {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 20) game.changeDirection('right');
    else if (dx < -20) game.changeDirection('left');
  } else {
    if (dy > 20) game.changeDirection('down');
    else if (dy < -20) game.changeDirection('up');
  }
  touchStart = null;
}, {passive: true});

// 虚拟按键（移动端）
function enableDpad(enable) {
  if (enable) {
    dpad.style.pointerEvents = 'auto';
    dpad.setAttribute('aria-hidden', 'false');
  } else {
    dpad.style.pointerEvents = 'none';
    dpad.setAttribute('aria-hidden', 'true');
  }
}
function lightDpad(dir) {
  // 简单视觉反馈（点亮一瞬间）
  const btn = dpad.querySelector(`[data-dir="${dir}"]`);
  if (!btn) return;
  const orig = btn.style.background;
  btn.style.background = 'rgba(34,197,94,0.9)';
  setTimeout(() => { btn.style.background = ''; }, 120);
}
dpad.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const btn = e.target.closest('.dpad-btn');
  if (!btn) return;
  const dir = btn.dataset.dir;
  game.changeDirection(dir);
  lightDpad(dir);
  vibrateShort();
}, {passive:false});
dpad.addEventListener('mousedown', (e) => {
  const btn = e.target.closest('.dpad-btn');
  if (!btn) return;
  const dir = btn.dataset.dir;
  game.changeDirection(dir);
  lightDpad(dir);
});

// 显示虚拟按键仅在触摸设备上
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (isTouchDevice) enableDpad(true);

// 倾斜控制（DeviceOrientation）
let tiltEnabled = false;
let lastTiltTime = 0;
let tiltThrottle = 120; // ms
function onDeviceOrientation(e) {
  const now = Date.now();
  if (now - lastTiltTime < tiltThrottle) return;
  lastTiltTime = now;
  // gamma: 左右倾斜 (-90 ~ 90). beta: 上下 (-180 ~ 180)
  const gamma = e.gamma || 0;
  const beta = e.beta || 0;
  const threshold = 12;
  if (Math.abs(gamma) > Math.abs(beta)) {
    if (gamma > threshold) game.changeDirection('right');
    else if (gamma < -threshold) game.changeDirection('left');
  } else {
    if (beta > threshold) game.changeDirection('down');
    else if (beta < -threshold) game.changeDirection('up');
  }
}

// iOS 必须在用户手势中请求权限
function enableTiltPermissionFlow() {
  // show enable tilt button for iOS Safari
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    enableTiltBtn.style.display = 'inline-block';
    enableTiltBtn.addEventListener('click', async () => {
      try {
        const resp = await DeviceOrientationEvent.requestPermission();
        if (resp === 'granted') {
          tiltToggle.checked = true;
          setTilt(true);
          enableTiltBtn.style.display = 'none';
        } else {
          alert('倾斜权限被拒绝');
        }
      } catch (err) {
        console.warn('请求倾斜权限失败', err);
      }
    });
  }
}
enableTiltPermissionFlow();

tiltToggle.addEventListener('change', () => {
  setTilt(tiltToggle.checked);
});

function setTilt(on) {
  tiltEnabled = on;
  if (on) {
    window.addEventListener('deviceorientation', onDeviceOrientation);
    stateEl.textContent = '状态: 运行（倾斜已启用）';
  } else {
    window.removeEventListener('deviceorientation', onDeviceOrientation);
    stateEl.textContent = '状态: 等待';
  }
}

// 声音：使用 Web Audio API 生成短音效
let audioCtx = null;
function ensureAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}
function playBeep({freq = 880, length = 0.08, type = 'sine', gain = 0.08} = {}) {
  try {
    ensureAudioContext();
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + length);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + length + 0.02);
  } catch (err) {
    // 一些浏览器在未由用户手势触发时拒绝播放，忽略错误
    // console.warn('playBeep failed', err);
  }
}

function vibrateShort() {
  if (navigator.vibrate) navigator.vibrate(30);
}

// 把声音绑定到游戏事件（基于轮询检测变化）
let lastScore = game.score;
let lastOver = game.over;
let lastPropCount = 0;
let lastPropType = null;
function pollGameForSounds() {
  const state = game.getState();
  
  if (game.score !== lastScore) {
    // 吃到苹果
    playBeep({freq: 1200, length: 0.06, gain: 0.08, type: 'sine'});
    vibrateShort();
    lastScore = game.score;
  }
  
  // 检测吃到道具
  const currentPropCount = state.props ? state.props.length : 0;
  if (currentPropCount < lastPropCount) {
    // 吃到道具音效
    playBeep({freq: 1800, length: 0.12, gain: 0.1, type: 'square'});
    vibrateShort();
  }
  lastPropCount = currentPropCount;
  
  // 检测道具效果变化并调整速度
  const currentPropType = state.activeProp?.type || null;
  if (currentPropType !== lastPropType) {
    if (currentPropType === 'speed') {
      adjustGameSpeed(baseInterval * 0.5); // 加速50%
    } else if (currentPropType === 'slow') {
      adjustGameSpeed(baseInterval * 1.5); // 减速50%
    } else {
      adjustGameSpeed(baseInterval); // 恢复正常速度
    }
    lastPropType = currentPropType;
  }
  
  if (game.over && !lastOver) {
    // game over
    playBeep({freq: 200, length: 0.4, gain: 0.12, type: 'sawtooth'});
    // show modal etc handled elsewhere
    lastOver = game.over;
  }
  if (!game.over) lastOver = false;
}

// 游戏结束处理：弹出模态输入名字并保存到 localStorage 排行榜
const LB_KEY = 'snake_leaderboard_v1';
function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(LB_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}
function saveLeaderboard(list) {
  localStorage.setItem(LB_KEY, JSON.stringify(list));
}
function addScoreToLeaderboard(name, score) {
  const list = loadLeaderboard();
  list.push({name: name || 'Player', score: Number(score) || 0, time: Date.now()});
  list.sort((a,b) => b.score - a.score || a.time - b.time);
  const top = list.slice(0, 10);
  saveLeaderboard(top);
  renderLeaderboard();
}
function clearLeaderboard() {
  localStorage.removeItem(LB_KEY);
  renderLeaderboard();
}
function renderLeaderboard() {
  const list = loadLeaderboard();
  leaderboardList.innerHTML = '';
  if (list.length === 0) {
    const li = document.createElement('li');
    li.textContent = '暂无记录，开始游戏并保存分数！';
    leaderboardList.appendChild(li);
    return;
  }
  list.forEach((it) => {
    const li = document.createElement('li');
    li.textContent = `${it.name} — ${it.score}`;
    leaderboardList.appendChild(li);
  });
}

clearLeaderboardBtn.addEventListener('click', () => {
  if (confirm('确定要清空排行榜吗？')) clearLeaderboard();
});

// Modal 行为
function onGameOver() {
  finalScoreEl.textContent = game.score;
  playerNameInput.value = '';
  nameModal.setAttribute('aria-hidden', 'false');
  nameModal.style.display = 'flex';
  // play sound handled in poll
}
saveScoreBtn.addEventListener('click', () => {
  const name = playerNameInput.value.trim() || 'Player';
  addScoreToLeaderboard(name, game.score);
  nameModal.setAttribute('aria-hidden', 'true');
  nameModal.style.display = 'none';
});
closeModalBtn.addEventListener('click', () => {
  nameModal.setAttribute('aria-hidden', 'true');
  nameModal.style.display = 'none';
});

// 自动保存分数当用户不想输入名时（例如关闭模态）
nameModal.addEventListener('transitionend', () => {
  // placeholder - not used currently
});

// 初始化渲染与排行榜
renderLeaderboard();
draw();

// 主轮询（处理声音 & 轻量事件检测）
// 这里不改变游戏主循环频率，只做小量检查
setInterval(pollGameForSounds, 80);

// 小提示：确保用户交互后才能播放声音（某些浏览器限制）
document.addEventListener('pointerdown', () => ensureAudioContext(), {once:true});

// 加载后确保 D-pad 在触摸设备上可见
if (isTouchDevice) {
  dpad.style.display = 'grid';
  enableDpad(true);
} else {
  dpad.style.display = 'none';
}