// ============================================================
// BOON DEFENSE — Roguelike Tower Defense
// Step 1: 코어 + 화면 전환 + 그리드/경로 + 메인 루프
// ============================================================

'use strict';

// ============================================================
// 상수
// ============================================================
const TILE = 32;
const COLS = 30;
const ROWS = 20;
const CANVAS_W = COLS * TILE; // 960
const CANVAS_H = ROWS * TILE; // 640

// 적 경로 (픽셀 좌표). 좌측 외부에서 우측 외부까지 구불구불하게.
const PATH = [
  { x: -32, y: 96 },
  { x: 384, y: 96 },
  { x: 384, y: 224 },
  { x: 64, y: 224 },
  { x: 64, y: 352 },
  { x: 512, y: 352 },
  { x: 512, y: 480 },
  { x: 992, y: 480 },
];

// 타일이 경로의 일부인지 (타워 배치 불가)
const blockedTiles = new Set();
function buildBlockedTiles() {
  // 경로 두께를 1.5타일 정도로 잡고 그 영역의 타일을 막는다.
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i];
    const b = PATH[i + 1];
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 8);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = a.x + (b.x - a.x) * t;
      const py = a.y + (b.y - a.y) * t;
      // 경로 두께 만큼 타일 막기
      for (let dx = -20; dx <= 20; dx += 20) {
        for (let dy = -20; dy <= 20; dy += 20) {
          const cx = Math.floor((px + dx) / TILE);
          const cy = Math.floor((py + dy) / TILE);
          if (cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS) {
            blockedTiles.add(cy * COLS + cx);
          }
        }
      }
    }
  }
}
buildBlockedTiles();

function isTileBlocked(cx, cy) {
  if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) return true;
  return blockedTiles.has(cy * COLS + cx);
}

// ============================================================
// 영웅 데이터 (Step 1: 임시 데이터, Step 6에서 확장)
// ============================================================
const HEROES = {
  archer: {
    id: 'archer',
    name: '실프린',
    flavor: '숲의 정령과 계약한 명궁수. 화살은 결코 빗나가지 않는다.',
    color: '#7ed957',
    accent: '#4a8e3f',
    hair: '#5db347',
    skin: '#fde6c8',
    cloth: '#2f5c2a',
    cloth2: '#7ed957',
    passives: ['궁수 타워 시작 비용 -20%', '궁수 타워 데미지 +10%'],
  },
  mage: {
    id: 'mage',
    name: '아리엔',
    flavor: '별의 마법을 다루는 대마법사. 그녀의 지팡이는 차원을 가른다.',
    color: '#a78bfa',
    accent: '#6d4ed1',
    hair: '#c4b5fd',
    skin: '#fbe1d3',
    cloth: '#3a2a6a',
    cloth2: '#a78bfa',
    passives: ['마법 타워 시작 비용 -20%', '마법 타워 데미지 +10%'],
  },
  merchant: {
    id: 'merchant',
    name: '카이런',
    flavor: '대륙을 누비는 상인. 골드는 그가 휘두르는 또 다른 무기다.',
    color: '#fbbf24',
    accent: '#c8881b',
    hair: '#5b3b1a',
    skin: '#f4d2a8',
    cloth: '#7a4a14',
    cloth2: '#fbbf24',
    passives: ['시작 골드 +75', '적 처치 골드 +1'],
  },
};

// ============================================================
// 메타 진행 (Step 6에서 확장)
// ============================================================
const META_KEY = 'boon-defense-meta-v1';
const meta = loadMeta();

function loadMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { essence: 0, upgrades: {} };
}

function saveMeta() {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch (e) {}
}

// ============================================================
// 게임 상태
// ============================================================
const game = {
  state: 'menu', // 'menu' | 'playing' | 'paused' | 'gameover' | 'victory'
  hero: null,
  hp: 20,
  gold: 150,
  wave: 0,
  waveMax: 20,
  kills: 0,
  speed: 1,
  selectedHeroId: 'archer',
  towers: [],
  enemies: [],
  projectiles: [],
  effects: [],
  boons: [],
  selectedTower: null,
  hoveredTile: null,
  placingTowerType: null,
  waveActive: false,
  betweenWaves: true,
};

// ============================================================
// DOM 참조
// ============================================================
const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ============================================================
// 메인 메뉴 렌더링
// ============================================================
function renderMainMenu() {
  $('meta-essence').textContent = meta.essence;

  const heroList = $('hero-list');
  heroList.innerHTML = '';

  for (const hero of Object.values(HEROES)) {
    const card = document.createElement('div');
    card.className = 'hero-card';
    if (game.selectedHeroId === hero.id) card.classList.add('selected');

    const portrait = document.createElement('canvas');
    portrait.className = 'icon';
    portrait.width = 64;
    portrait.height = 64;
    portrait.style.background = `linear-gradient(135deg, ${hero.accent}33, ${hero.color}22)`;
    // Step 2에서 미형 일러스트로 채울 placeholder
    const pctx = portrait.getContext('2d');
    pctx.imageSmoothingEnabled = false;
    pctx.fillStyle = hero.color;
    pctx.beginPath();
    pctx.arc(32, 28, 10, 0, Math.PI * 2);
    pctx.fill();
    pctx.fillRect(22, 36, 20, 20);

    card.appendChild(portrait);

    const info = document.createElement('div');
    info.className = 'info';
    info.innerHTML = `<div class="name">${hero.name}</div><div class="flavor">${hero.flavor}</div>`;
    card.appendChild(info);

    card.addEventListener('click', () => {
      game.selectedHeroId = hero.id;
      renderMainMenu();
    });

    heroList.appendChild(card);
  }

  renderHeroDetail();
}

function renderHeroDetail() {
  const detail = $('hero-detail');
  const hero = HEROES[game.selectedHeroId];
  if (!hero) {
    detail.classList.add('hidden');
    return;
  }
  detail.classList.remove('hidden');
  $('hd-name').textContent = hero.name;
  $('hd-flavor').textContent = hero.flavor;

  const passive = $('hd-passive');
  passive.innerHTML = '';
  for (const p of hero.passives) {
    const li = document.createElement('li');
    li.textContent = p;
    passive.appendChild(li);
  }

  // Step 6에서 강화 트리 채움
  $('hd-upgrades').innerHTML = '<p style="color:#6b7088;font-size:12px;font-style:italic;">강화 시스템은 다음 단계에서 추가됩니다</p>';
}

// ============================================================
// 화면 전환
// ============================================================
function showScreen(name) {
  $('main-menu').classList.toggle('hidden', name !== 'menu');
  $('game-screen').classList.toggle('hidden', name !== 'game');
}

function startRun() {
  game.hero = HEROES[game.selectedHeroId];
  game.state = 'playing';
  game.hp = 20;
  game.gold = 150;
  game.wave = 0;
  game.kills = 0;
  game.towers = [];
  game.enemies = [];
  game.projectiles = [];
  game.effects = [];
  game.boons = [];
  game.waveActive = false;
  game.betweenWaves = true;

  $('hb-icon').style.background = game.hero.color;
  $('hb-name').textContent = game.hero.name;

  showScreen('game');
  updateHud();
}

function quitToMenu() {
  game.state = 'menu';
  showScreen('menu');
  renderMainMenu();
}

// ============================================================
// HUD 업데이트
// ============================================================
function updateHud() {
  $('hp').textContent = game.hp;
  $('gold').textContent = game.gold;
  $('wave').textContent = game.wave;
  $('wave-max').textContent = game.waveMax;
  $('kills').textContent = game.kills;
  $('start-wave').disabled = game.waveActive || game.state !== 'playing';
  $('speed-btn').textContent = `속도 ×${game.speed} (F)`;
}

// ============================================================
// 렌더링 (Step 1: 그리드 + 경로만)
// ============================================================
function render() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // 배경
  ctx.fillStyle = '#1a1d28';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // 잔디 패턴 (배치 가능 영역 표시용 약한 격자)
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (isTileBlocked(x, y)) continue;
      const checker = (x + y) % 2 === 0;
      ctx.fillStyle = checker ? '#1f2330' : '#1c1f2a';
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }

  // 경로 그리기 (둥근 흙길 느낌)
  ctx.strokeStyle = '#3a2f24';
  ctx.lineWidth = 40;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(PATH[0].x, PATH[0].y);
  for (let i = 1; i < PATH.length; i++) ctx.lineTo(PATH[i].x, PATH[i].y);
  ctx.stroke();

  // 경로 안쪽 밝은 색
  ctx.strokeStyle = '#5a4836';
  ctx.lineWidth = 32;
  ctx.beginPath();
  ctx.moveTo(PATH[0].x, PATH[0].y);
  for (let i = 1; i < PATH.length; i++) ctx.lineTo(PATH[i].x, PATH[i].y);
  ctx.stroke();

  // 경로 점선 (방향 표시)
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 10]);
  ctx.beginPath();
  ctx.moveTo(PATH[0].x, PATH[0].y);
  for (let i = 1; i < PATH.length; i++) ctx.lineTo(PATH[i].x, PATH[i].y);
  ctx.stroke();
  ctx.setLineDash([]);

  // 시작/종료 표시
  drawPathEndpoint(PATH[0].x, PATH[0].y, '#4a7d3f', '입구');
  drawPathEndpoint(PATH[PATH.length - 1].x, PATH[PATH.length - 1].y, '#7d3f3f', '성문');

  // 호버 타일 표시 (Step 3에서 타워 배치 시 활용)
  if (game.hoveredTile) {
    const { x, y } = game.hoveredTile;
    const blocked = isTileBlocked(x, y);
    ctx.fillStyle = blocked ? 'rgba(255,80,80,0.25)' : 'rgba(120,220,120,0.25)';
    ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    ctx.strokeStyle = blocked ? 'rgba(255,80,80,0.6)' : 'rgba(120,220,120,0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2);
  }

  // 디버그/안내 (Step 1만)
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '12px sans-serif';
  ctx.fillText('Step 1: 그리드 + 경로 (캐릭터/전투는 다음 단계)', 12, CANVAS_H - 12);
}

function drawPathEndpoint(x, y, color, label) {
  const cx = Math.max(8, Math.min(CANVAS_W - 8, x));
  const cy = y;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, cy + 4);
  ctx.textAlign = 'start';
}

// ============================================================
// 게임 루프
// ============================================================
let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000) * game.speed;
  lastTime = now;

  if (game.state === 'playing') {
    update(dt);
    render();
  }
  requestAnimationFrame(loop);
}

function update(dt) {
  // Step 3+ 에서 채움 (타워, 적, 발사체 업데이트)
}

// ============================================================
// 입력
// ============================================================
function setupInput() {
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (CANVAS_W / rect.width);
    const y = (e.clientY - rect.top) * (CANVAS_H / rect.height);
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    game.hoveredTile = { x: tx, y: ty };
  });
  canvas.addEventListener('mouseleave', () => {
    game.hoveredTile = null;
  });

  document.addEventListener('keydown', (e) => {
    if (game.state !== 'playing') return;
    if (e.code === 'Space') {
      e.preventDefault();
      onStartWave();
    } else if (e.code === 'KeyF') {
      toggleSpeed();
    } else if (e.code === 'Escape') {
      game.placingTowerType = null;
      game.selectedTower = null;
    }
  });

  $('start-wave').addEventListener('click', onStartWave);
  $('speed-btn').addEventListener('click', toggleSpeed);
  $('quit-btn').addEventListener('click', () => {
    if (confirm('정말 포기하시겠습니까? 현재 진행 상황은 잃습니다.')) {
      quitToMenu();
    }
  });
  $('start-run').addEventListener('click', startRun);
  $('reset-meta').addEventListener('click', () => {
    if (confirm('메타 진행을 초기화하시겠습니까? 정수와 모든 강화가 사라집니다.')) {
      meta.essence = 0;
      meta.upgrades = {};
      saveMeta();
      renderMainMenu();
    }
  });
}

function onStartWave() {
  if (game.waveActive || game.state !== 'playing') return;
  // Step 4에서 실제 웨이브 시작
  game.wave += 1;
  game.waveActive = true;
  updateHud();
  setTimeout(() => {
    // 임시: 1초 후 자동 종료 (Step 4에서 실제 로직으로 교체)
    game.waveActive = false;
    updateHud();
  }, 1000);
}

function toggleSpeed() {
  game.speed = game.speed === 1 ? 2 : game.speed === 2 ? 3 : 1;
  updateHud();
}

// ============================================================
// 부팅
// ============================================================
function boot() {
  setupInput();
  renderMainMenu();
  showScreen('menu');
  requestAnimationFrame(loop);
  // 초기 캔버스 1회 렌더 (게임 진입 전에도 빈 캔버스로)
  ctx.fillStyle = '#1a1d28';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

boot();
