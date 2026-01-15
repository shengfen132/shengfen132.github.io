// game.js - 贪吃蛇核心逻辑（含道具系统和关卡系统）
export default class Game {
  constructor({ cols = 20, rows = 20 } = {}) {
    this.cols = cols;
    this.rows = rows;
    this.MAX_POSITION_ATTEMPTS = 100;
    this.PROP_LIFETIME_STEPS = 300; // 300 steps ≈ 30 seconds
    
    // 关卡定义 (speedMultiplier是游戏间隔的倍数，值越小速度越快)
    this.levels = [
      { level: 1, name: '初级', scoreTarget: 10, speedMultiplier: 1.0, propChance: 0.15 },
      { level: 2, name: '入门', scoreTarget: 25, speedMultiplier: 0.9, propChance: 0.18 },
      { level: 3, name: '进阶', scoreTarget: 45, speedMultiplier: 0.8, propChance: 0.20 },
      { level: 4, name: '高手', scoreTarget: 70, speedMultiplier: 0.7, propChance: 0.22 },
      { level: 5, name: '专家', scoreTarget: 100, speedMultiplier: 0.6, propChance: 0.25 },
      { level: 6, name: '大师', scoreTarget: 150, speedMultiplier: 0.5, propChance: 0.28 },
      { level: 7, name: '传奇', scoreTarget: 999, speedMultiplier: 0.4, propChance: 0.30 }
    ];
    
    this.reset();
  }

  reset() {
    this.snake = [
      { x: Math.floor(this.cols / 2), y: Math.floor(this.rows / 2) }
    ];
    this.direction = 'right';
    this.nextDirection = 'right';
    this.apple = this.randomPosition();
    this.score = 0;
    this.over = false;
    
    // 关卡系统
    this.currentLevel = 1;
    this.levelJustChanged = false;
    
    // 道具系统
    this.props = []; // 当前场上的道具
    this.activeProp = null; // 当前激活的道具效果
    this.propDuration = 0; // 道具效果剩余时间（步数）
    this.propSpawnChance = 0.15; // 每次吃到苹果后有15%概率生成道具
    this.propTypes = [
      { type: 'speed', name: '加速', color: '#fbbf24', duration: 50 },
      { type: 'slow', name: '减速', color: '#3b82f6', duration: 50 },
      { type: 'double', name: '双倍分', color: '#8b5cf6', duration: 30 },
      { type: 'invincible', name: '无敌', color: '#ec4899', duration: 40 },
      { type: 'shrink', name: '缩短', color: '#10b981', duration: 0 } // 立即效果
    ];
    
    this.updateLevel();
  }

  randomPosition() {
    const occupied = new Set(this.snake.map(p => `${p.x},${p.y}`));
    if (this.props && this.props.length > 0) {
      this.props.forEach(p => occupied.add(`${p.x},${p.y}`));
    }
    
    let pos;
    let attempts = 0;
    do {
      pos = {
        x: Math.floor(Math.random() * this.cols),
        y: Math.floor(Math.random() * this.rows)
      };
      attempts++;
      if (attempts > this.MAX_POSITION_ATTEMPTS) return { x: 0, y: 0 }; // fallback
    } while (occupied.has(`${pos.x},${pos.y}`));
    return pos;
  }

  changeDirection(dir) {
    const opposite = {
      up: 'down',
      down: 'up',
      left: 'right',
      right: 'left'
    };
    if (opposite[this.direction] !== dir) {
      this.nextDirection = dir;
    }
  }

  // 更新关卡设置
  updateLevel() {
    // 从高级别向低级别查找，找到第一个达到目标分数的关卡
    // （levels数组已按level从小到大排序，所以倒序查找能找到最高达成的关卡）
    let newLevelData = this.levels[0];
    for (let i = this.levels.length - 1; i >= 0; i--) {
      if (this.score >= this.levels[i].scoreTarget) {
        newLevelData = this.levels[i];
        break;
      }
    }
    
    if (newLevelData.level !== this.currentLevel) {
      this.currentLevel = newLevelData.level;
      this.levelJustChanged = true;
    }
    this.propSpawnChance = newLevelData.propChance;
  }

  // 获取当前关卡信息
  getCurrentLevelData() {
    return this.levels.find(l => l.level === this.currentLevel) || this.levels[0];
  }

  step() {
    if (this.over) return;

    this.direction = this.nextDirection;
    const head = this.snake[this.snake.length - 1];
    const delta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[this.direction];
    const newHead = { x: head.x + delta[0], y: head.y + delta[1] };

    // 检查道具效果持续时间
    if (this.propDuration > 0) {
      this.propDuration--;
      if (this.propDuration === 0) {
        this.activeProp = null;
      }
    }

    // 边界检查（如果不是无敌状态）
    if (this.activeProp?.type !== 'invincible') {
      if (newHead.x < 0 || newHead.x >= this.cols || newHead.y < 0 || newHead.y >= this.rows) {
        this.over = true;
        return;
      }
    } else {
      // 无敌状态下穿墙
      newHead.x = (newHead.x + this.cols) % this.cols;
      newHead.y = (newHead.y + this.rows) % this.rows;
    }

    // 自撞检查（如果不是无敌状态）
    if (this.activeProp?.type !== 'invincible') {
      for (let i = 0; i < this.snake.length; i++) {
        if (this.snake[i].x === newHead.x && this.snake[i].y === newHead.y) {
          this.over = true;
          return;
        }
      }
    }

    this.snake.push(newHead);

    // 检查是否吃到苹果
    if (newHead.x === this.apple.x && newHead.y === this.apple.y) {
      const scoreGain = this.activeProp?.type === 'double' ? 2 : 1;
      this.score += scoreGain;
      this.apple = this.randomPosition();
      
      // 检查是否升级
      this.levelJustChanged = false;
      this.updateLevel();
      
      // 有概率生成道具
      if (Math.random() < this.propSpawnChance) {
        this.spawnProp();
      }
    } else {
      this.snake.shift(); // 没吃到就移除尾巴
    }

    // 检查是否吃到道具
    for (let i = this.props.length - 1; i >= 0; i--) {
      const prop = this.props[i];
      if (newHead.x === prop.x && newHead.y === prop.y) {
        this.activateProp(prop);
        this.props.splice(i, 1);
      }
    }

    // 移除过期道具（30秒后消失）
    this.props = this.props.filter(p => {
      p.age = (p.age || 0) + 1;
      return p.age < this.PROP_LIFETIME_STEPS;
    });
  }

  spawnProp() {
    if (this.props.length >= 3) return; // 最多同时3个道具
    
    const propType = this.propTypes[Math.floor(Math.random() * this.propTypes.length)];
    const prop = {
      ...this.randomPosition(),
      ...propType,
      age: 0
    };
    this.props.push(prop);
  }

  activateProp(prop) {
    switch (prop.type) {
      case 'speed':
        // 加速效果在 script.js 中处理
        this.activeProp = { type: 'speed', name: prop.name };
        this.propDuration = prop.duration;
        break;
      case 'slow':
        // 减速效果在 script.js 中处理
        this.activeProp = { type: 'slow', name: prop.name };
        this.propDuration = prop.duration;
        break;
      case 'double':
        // 双倍分数
        this.activeProp = { type: 'double', name: prop.name };
        this.propDuration = prop.duration;
        break;
      case 'invincible':
        // 无敌（穿墙，不会自撞）
        this.activeProp = { type: 'invincible', name: prop.name };
        this.propDuration = prop.duration;
        break;
      case 'shrink':
        // 立即缩短蛇身（移除一半身体）
        // Note: Snake head is at the end of the array, so splice(0, count) removes tail segments
        const removeCount = Math.floor(this.snake.length / 2);
        if (removeCount > 0 && this.snake.length > 1) {
          this.snake.splice(0, removeCount);
        }
        this.activeProp = null; // 立即效果，不持续
        break;
    }
  }

  getState() {
    return {
      snake: this.snake,
      apple: this.apple,
      props: this.props,
      activeProp: this.activeProp,
      propDuration: this.propDuration,
      score: this.score,
      over: this.over,
      level: this.currentLevel,
      levelData: this.getCurrentLevelData(),
      levelJustChanged: this.levelJustChanged
    };
  }
}
