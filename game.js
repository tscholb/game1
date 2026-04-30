// ============================================================
// BOON DEFENSE — Roguelike Tower Defense
// Step 1: 코어 + 화면 전환 + 그리드/경로 + 메인 루프
// ============================================================

'use strict';

// ============================================================
// 상수
// ============================================================
const TILE = 32;
const COLS = 20;
const ROWS = 30;
const CANVAS_W = COLS * TILE; // 640
const CANVAS_H = ROWS * TILE; // 960

// 적 경로 (픽셀 좌표). 상단 외부 → 하단 외부, S자 흐름.
const PATH = [
  { x: 96,  y: -32 },
  { x: 96,  y: 224 },
  { x: 544, y: 224 },
  { x: 544, y: 480 },
  { x: 96,  y: 480 },
  { x: 96,  y: 736 },
  { x: 544, y: 736 },
  { x: 544, y: 992 },
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
    name: '루나',
    flavor: '달빛 아래 사냥하는 별의 명궁수. 그녀의 화살은 달의 가호를 머금는다.',
    color: '#a78bfa',
    accent: '#7c3aed',
    hair: '#c4b5fd',
    skin: '#fde6c8',
    cloth: '#3a2a6a',
    cloth2: '#a78bfa',
    passives: ['궁수 타워 시작 비용 -20%', '궁수 타워 데미지 +10%', '본인이 직접 전투에 참여'],
    combat: { dmg: 24, range: 180, fireRate: 0.4, projectile: 'arrow', air: true },
    skill: {
      name: '별의 화살비',
      desc: '하늘에서 화살이 쏟아져 모든 적에게 피해',
      cooldown: 22,
      kind: 'arrow-rain',
    },
    upgrades: [
      { id: 'a-precision', name: '정밀 사격', desc: '궁수/저격 데미지 단계당 +5%', max: 3, cost: [3, 6, 10], per: 0.05 },
      { id: 'a-quick',     name: '빠른 시위', desc: '궁수/저격 발사주기 단계당 -5%', max: 3, cost: [3, 6, 10], per: 0.05 },
      { id: 'a-eyes',      name: '예리한 눈', desc: '모든 타워 사거리 단계당 +5%',   max: 3, cost: [4, 8, 12], per: 0.05 },
      { id: 'a-bonus',     name: '시작 화살통', desc: '시작 시 궁수 타워 1개 무료 배치 (LV+1)', max: 1, cost: [12], per: 1 },
    ],
    prologue: [
      '달이 가장 차오르는 밤, 별의 정령들이 그녀에게 활을 건넸다.',
      '"네 화살은 빛이 닿지 않는 곳까지 닿으리라."',
      '그날 이후, 어둠에 숨은 자도, 그림자 너머의 적도',
      '그녀의 시야에서 도망칠 수 없었다.',
      '',
      '오늘 밤, 던전의 검은 입이 다시 열렸다.',
      '루나는 활을 들고, 달빛을 따라 걸어간다.',
    ],
  },
  mage: {
    id: 'mage',
    name: '이그니아',
    flavor: '검은 머리 위로 불꽃을 다스리는 매혹의 화염 대마법사. 그녀의 손끝에서 세상이 타오른다.',
    color: '#dc2626',
    accent: '#991b1b',
    hair: '#1a1a1a',
    skin: '#fbe1d3',
    cloth: '#3a0a0a',
    cloth2: '#dc2626',
    passives: ['마법 타워 시작 비용 -20%', '마법 타워 데미지 +10%', '본인이 직접 전투에 참여'],
    combat: { dmg: 30, range: 150, fireRate: 0.7, projectile: 'orb', air: true, magic: true },
    skill: {
      name: '화염 폭풍',
      desc: '가장 앞선 적 위치에 거대한 화염 폭발과 잔불',
      cooldown: 18,
      kind: 'fire-burst',
    },
    upgrades: [
      { id: 'm-power',  name: '비전의 힘',   desc: '마법/얼음 타워 데미지 단계당 +6%', max: 3, cost: [3, 6, 10], per: 0.06 },
      { id: 'm-sight',  name: '천리안',     desc: '모든 타워 사거리 단계당 +5%',     max: 3, cost: [4, 8, 12], per: 0.05 },
      { id: 'm-mark',   name: '예언의 표식', desc: '가호 선택지 +1개 (4지선다)',       max: 1, cost: [15], per: 1 },
      { id: 'm-bonus',  name: '별의 가호',   desc: '시작 시 마법 타워 1개 무료 배치 (LV+1)', max: 1, cost: [12], per: 1 },
    ],
    prologue: [
      '화염의 도시 헬리오스, 그곳에서 그녀는 태어났다.',
      '검은 머리에서 흘러내리는 잿빛, 보라색 눈에 깃든 불꽃 —',
      '어릴 적부터 그녀의 손끝은 이미 지옥을 품고 있었다.',
      '',
      '"세상이 차갑다면, 내가 태워주마."',
      '왕국의 마법사들이 그녀를 두려워해 추방했지만',
      '이그니아는 미소만 남기고 화염 속으로 사라졌다.',
      '',
      '이제 그녀는 던전의 깊은 어둠을 향해 손을 든다.',
      '모든 것이 타오를 때까지 — 그녀는 멈추지 않는다.',
    ],
  },
  merchant: {
    id: 'merchant',
    name: '레이나',
    flavor: '전장을 떠도는 전설의 용병. 그녀의 대검 앞에 살아남는 자는 없다.',
    color: '#fcd34d',
    accent: '#b45309',
    hair: '#fcd34d',
    skin: '#fbe1d3',
    cloth: '#1a1a1a',
    cloth2: '#f4f4f4',
    passives: ['시작 라이프 +5', '대검 광역 근접 공격', '본인이 직접 전투에 참여'],
    combat: { dmg: 55, range: 90, fireRate: 0.85, projectile: 'slash', air: false, splash: 70 },
    skill: {
      name: '대지 가르기',
      desc: '주변 모든 적을 휩쓰는 거대한 슬래시 일격',
      cooldown: 16,
      kind: 'great-cleave',
    },
    upgrades: [
      { id: 'mer-purse',   name: '강철 의지',     desc: '시작 라이프 단계당 +3',          max: 3, cost: [3, 5, 8],     per: 3 },
      { id: 'mer-trade',   name: '대검 숙련',     desc: '용병 데미지 단계당 +12%',        max: 3, cost: [4, 8, 14],    per: 0.12 },
      { id: 'mer-discount',name: '광전사',       desc: '용병 공속 단계당 -8%',           max: 3, cost: [4, 8, 14],    per: 0.08 },
      { id: 'mer-tribute', name: '용병의 기치',   desc: '모든 타워 데미지 +5%',           max: 2, cost: [6, 12],       per: 0.05 },
    ],
    prologue: [
      '스무 해를 전장에서 보냈다.',
      '백 명의 왕을 위해 검을 들었고, 백 개의 깃발 아래에서 피를 흘렸다.',
      '하지만 그 모든 명령들이 끝내 그녀에게 남긴 것은 —',
      '오직 자신의 검 한 자루뿐이었다.',
      '',
      '"이번엔 누구의 명령도 받지 않는다."',
      '금발을 묶고, 대검을 어깨에 걸친 채',
      '레이나는 자신만의 전장으로 걸어 나간다.',
      '',
      '대지를 가르는 검 앞에서 — 어떤 어둠도 살아남지 못한다.',
    ],
  },
};

// ============================================================
// 타워 정의 (Step 3)
// air 공격 가능 여부, 사거리, 데미지, 발사 주기 등
// ============================================================
const TOWERS = {
  archer: {
    id: 'archer', name: '궁수',
    desc: '단일 표적, 빠른 공속',
    cost: 50,
    upgradeCost: [60, 90], // L1->L2, L2->L3
    range: 130,
    dmg: 10,
    fireRate: 0.55, // 초
    projectile: { type: 'arrow', speed: 480 },
    air: true, // 공중 공격 가능
    splash: 0,
    color: '#7ed957',
  },
  cannon: {
    id: 'cannon', name: '대포',
    desc: '느린 광역 폭발',
    cost: 90,
    upgradeCost: [110, 150],
    range: 110,
    dmg: 22,
    fireRate: 1.4,
    projectile: { type: 'shell', speed: 280, arc: true },
    air: false,
    splash: 50,
    color: '#aaaaaa',
  },
  mage: {
    id: 'mage', name: '마법',
    desc: '실드 무시 마법 데미지',
    cost: 110,
    upgradeCost: [120, 170],
    range: 130,
    dmg: 18,
    fireRate: 0.85,
    projectile: { type: 'orb', speed: 380, magic: true },
    air: true,
    splash: 0,
    color: '#a78bfa',
  },
  frost: {
    id: 'frost', name: '얼음',
    desc: '광역 슬로우, 약한 데미지',
    cost: 75,
    upgradeCost: [80, 110],
    range: 95,
    dmg: 4,
    fireRate: 0.5,
    projectile: { type: 'frost', speed: 320, slow: 0.5, slowDur: 1.4 },
    air: true,
    splash: 60,
    color: '#7dd3fc',
  },
  sniper: {
    id: 'sniper', name: '저격',
    desc: '극장거리, 매우 강한 단발',
    cost: 160,
    upgradeCost: [180, 240],
    range: 280,
    dmg: 75,
    fireRate: 2.4,
    projectile: { type: 'bullet', speed: 900 },
    air: true,
    splash: 0,
    color: '#7a7a9a',
  },
};

const TOWER_ORDER = ['archer', 'cannon', 'mage', 'frost', 'sniper'];

// 업그레이드 시 적용할 배율 (레벨 1=기본, 2,3 강화)
const TOWER_LEVEL_MULT = {
  1: { dmg: 1.0, range: 1.0, fireRate: 1.0 },
  2: { dmg: 1.6, range: 1.1, fireRate: 0.85 },
  3: { dmg: 2.6, range: 1.2, fireRate: 0.7 },
};

// ============================================================
// 적 정의 (Step 3)
// ============================================================
const ENEMIES = {
  goblin: { name: '고블린', hp: 35, speed: 70, gold: 5, air: false, armor: 0 },
  orc: { name: '오크', hp: 95, speed: 45, gold: 8, air: false, armor: 0 },
  drone: { name: '드론', hp: 55, speed: 85, gold: 7, air: true, armor: 0 },
  shield: { name: '실드', hp: 70, speed: 50, gold: 9, air: false, armor: 0.5 }, // 마법 외 데미지 50% 감소
  rogue: { name: '도적', hp: 45, speed: 130, gold: 6, air: false, armor: 0 },
  giant: { name: '거인', hp: 1200, speed: 28, gold: 80, air: false, armor: 0.2, boss: true },
};

// ============================================================
// 영웅 엔티티 (Step 9: 직접 전투 참여)
// ============================================================
function placeHero() {
  if (!game.hero) return;
  // 좋은 자리 후보 (경로 가까운 빈 자리)
  const slots = [
    { tx: 13, ty: 4 },
    { tx: 13, ty: 14 },
    { tx: 1, ty: 14 },
    { tx: 13, ty: 24 },
  ];
  let slot = slots.find(s => !isTileBlocked(s.tx, s.ty) && !tileHasTower(s.tx, s.ty));
  if (!slot) slot = slots[0];
  game.heroEntity = {
    type: game.hero.id,
    tileX: slot.tx,
    tileY: slot.ty,
    cx: slot.tx * TILE + TILE / 2,
    cy: slot.ty * TILE + TILE / 2,
    cooldown: 0,
    skillCD: 0,
    isHero: true,
    flashT: 0,
    bobT: 0,
  };
}

function updateHero(dt) {
  const he = game.heroEntity;
  if (!he) return;
  he.bobT += dt;
  if (he.flashT > 0) he.flashT -= dt;
  if (he.skillCD > 0) he.skillCD -= dt;
  he.cooldown -= dt;
  const def = HEROES[he.type].combat;
  if (he.cooldown > 0) return;
  // 타겟 탐색
  let best = null;
  let bestT = -1;
  for (const e of game.enemies) {
    if (e.dead) continue;
    if (e.air && !def.air) continue;
    const d = Math.hypot(e.x - he.cx, e.y - he.cy);
    if (d > def.range) continue;
    if (e.pathT > bestT) { bestT = e.pathT; best = e; }
  }
  if (!best) return;
  const stat = heroEffectiveStat(he);
  if (def.projectile === 'slash') {
    // 근접 광역: 자신 주변 즉시 데미지
    const r = stat.range;
    for (const e of game.enemies) {
      if (e.dead) continue;
      if (e.air && !def.air) continue;
      if (Math.hypot(e.x - he.cx, e.y - he.cy) <= r) {
        e.hp -= stat.dmg;
        if (e.hp <= 0) e.dead = true;
        // 데미지 숫자
        game.damageNums = game.damageNums || [];
        game.damageNums.push({
          x: e.x + (Math.random() - 0.5) * 12,
          y: e.y - 20,
          value: Math.round(stat.dmg),
          life: 0.7, maxLife: 0.7,
          color: stat.dmg >= 60 ? '#fde68a' : '#fff',
          size: stat.dmg >= 60 ? 16 : 12,
        });
        e.hitT = 0.1;
      }
    }
    // 슬래시 호 이펙트
    game.effects.push({ kind: 'slash', x: he.cx, y: he.cy, r, t: 0, dur: 0.32, color: '#ffe89a' });
    addCameraShake(0.15, 3);
  } else {
    const p = {
      x: he.cx, y: he.cy - 16,
      target: best,
      type: def.projectile,
      speed: 520,
      dmg: stat.dmg,
      splash: 0,
      magic: !!def.magic,
      arc: false, arcT: 0, arcDur: 0,
      startX: he.cx, startY: he.cy - 16,
      targetX: best.x, targetY: best.y,
      slow: 0, slowDur: 0,
      dead: false,
      fromType: 'hero-' + he.type,
    };
    game.projectiles.push(p);
  }
  he.cooldown = stat.fireRate;
  he.flashT = 0.12;
}

function heroEffectiveStat(he) {
  const def = HEROES[he.type].combat;
  let stat = { dmg: def.dmg, range: def.range, fireRate: def.fireRate, splash: def.splash || 0 };
  if (game.meta) {
    stat.range *= game.meta.rangeMul;
    if (he.type === 'merchant') {
      stat.dmg *= (game.meta.mercDmgMul || 1);
      stat.fireRate *= (game.meta.mercFireMul || 1);
    }
  }
  return stat;
}

// 영웅 스킬 발동
function castHeroSkill() {
  const he = game.heroEntity;
  if (!he || he.skillCD > 0) return false;
  const skill = HEROES[he.type].skill;
  if (!skill) return false;
  if (skill.kind === 'arrow-rain') {
    // 25발 화살이 화면 위에서 떨어짐
    for (let i = 0; i < 28; i++) {
      const tx = Math.random() * CANVAS_W;
      const ty = 100 + Math.random() * (CANVAS_H - 200);
      setTimeout(() => spawnArrowRainBolt(tx, ty), i * 40);
    }
    addCameraShake(0.6, 8);
  } else if (skill.kind === 'star-burst') {
    // 가장 앞선 적 위치에 큰 폭발
    let target = null; let bestT = -1;
    for (const e of game.enemies) {
      if (e.dead) continue;
      if (e.pathT > bestT) { bestT = e.pathT; target = e; }
    }
    const tx = target ? target.x : CANVAS_W / 2;
    const ty = target ? target.y : CANVAS_H / 2;
    starBurstAt(tx, ty);
    addCameraShake(0.8, 12);
  } else if (skill.kind === 'fire-burst') {
    // 가장 앞선 적 위치에 거대한 화염 폭발 + 잔불
    let target = null; let bestT = -1;
    for (const e of game.enemies) {
      if (e.dead) continue;
      if (e.pathT > bestT) { bestT = e.pathT; target = e; }
    }
    const tx = target ? target.x : CANVAS_W / 2;
    const ty = target ? target.y : CANVAS_H / 2;
    fireBurstAt(tx, ty);
    addCameraShake(0.9, 14);
  } else if (skill.kind === 'great-cleave') {
    // 자신 주변 큰 광역 슬래시 + 강력한 데미지
    const r = 180;
    for (const e of game.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - he.cx, e.y - he.cy) <= r) {
        e.hp -= 200;
        if (e.hp <= 0) e.dead = true;
        e.hitT = 0.2;
      }
    }
    game.effects.push({ kind: 'slash-big', x: he.cx, y: he.cy, r, t: 0, dur: 0.55, color: '#fde68a' });
    // 황금 파편 파티클
    for (let i = 0; i < 50; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 200 + Math.random() * 300;
      game.particles = game.particles || [];
      game.particles.push({
        x: he.cx, y: he.cy - 16,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.5 + Math.random() * 0.5, maxLife: 1,
        size: 2 + Math.random() * 3,
        color: i % 3 === 0 ? '#ffffff' : (i % 2 ? '#fde68a' : '#fbbf24'),
        kind: 'shard', g: 200,
      });
    }
    addCameraShake(0.7, 12);
  } else if (skill.kind === 'gold-rain') {
    game.gold += 50;
    game.goldRainT = 5;
    // 동전 파티클
    for (let i = 0; i < 30; i++) {
      game.particles = game.particles || [];
      game.particles.push({
        x: he.cx + (Math.random() - 0.5) * 40,
        y: he.cy - 20,
        vx: (Math.random() - 0.5) * 200,
        vy: -150 - Math.random() * 100,
        life: 1.5, maxLife: 1.5,
        size: 4, color: '#fde68a', kind: 'coin', g: 380,
      });
    }
    addCameraShake(0.3, 4);
  }
  he.skillCD = skill.cooldown;
  updateSkillUI();
  return true;
}

function spawnArrowRainBolt(tx, ty) {
  // 화면 위에서 ty 위치까지 떨어지는 화살
  game.projectiles.push({
    x: tx, y: -20,
    target: null,
    type: 'arrow-rain',
    speed: 800,
    dmg: 35,
    splash: 36,
    magic: false,
    arc: false, arcT: 0, arcDur: 0,
    startX: tx, startY: -20,
    targetX: tx, targetY: ty,
    slow: 0, slowDur: 0,
    dead: false,
    fromType: 'hero-archer',
  });
}

function fireBurstAt(tx, ty) {
  // 거대한 화염 폭발 + 잔불 (DoT)
  game.effects.push({ kind: 'fireburst', x: tx, y: ty, r: 140, t: 0, dur: 0.7, color: '#ff4400' });
  game.effects.push({ kind: 'burn', x: tx, y: ty, r: 100, t: 0, dur: 3.0, color: '#ff8844', dps: 30, lastTick: 0 });
  for (const e of game.enemies) {
    if (e.dead) continue;
    if (Math.hypot(e.x - tx, e.y - ty) <= 140) {
      e.hp -= 130;
      if (e.hp <= 0) e.dead = true;
    }
  }
  // 화염 파티클
  for (let i = 0; i < 50; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 220 + Math.random() * 280;
    game.particles = game.particles || [];
    game.particles.push({
      x: tx, y: ty,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.5 + Math.random() * 0.6, maxLife: 1.1,
      size: 2 + Math.random() * 3,
      color: i % 3 === 0 ? '#fde68a' : (i % 2 ? '#ff8844' : '#dc2626'),
      kind: 'shard', g: 80,
    });
  }
}

function starBurstAt(tx, ty) {
  // 큰 폭발 + 도트 데미지
  game.effects.push({ kind: 'starburst', x: tx, y: ty, r: 130, t: 0, dur: 0.8, color: '#c084fc' });
  for (const e of game.enemies) {
    if (e.dead) continue;
    if (Math.hypot(e.x - tx, e.y - ty) <= 130) {
      e.hp -= 120;
      if (e.hp <= 0) { e.dead = true; }
    }
  }
  // 별 파티클
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 200 + Math.random() * 240;
    game.particles = game.particles || [];
    game.particles.push({
      x: tx, y: ty,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.7 + Math.random() * 0.4, maxLife: 1,
      size: 2 + Math.random() * 2,
      color: i % 2 ? '#c084fc' : '#fde68a',
      kind: 'star', g: 0,
    });
  }
}

function addCameraShake(dur, mag) {
  game.shakeT = Math.max(game.shakeT || 0, dur);
  game.shakeMag = Math.max(game.shakeMag || 0, mag);
}

function updateSkillUI() {
  const btn = $('skill-btn');
  if (!btn) return;
  const he = game.heroEntity;
  if (!he || !game.hero) {
    btn.classList.add('hidden');
    return;
  }
  const skill = HEROES[he.type].skill;
  btn.classList.remove('hidden');
  const cd = Math.max(0, he.skillCD);
  if (cd > 0) {
    btn.disabled = true;
    btn.innerHTML = `<span class="sname">${skill.name}</span><span class="scd">${cd.toFixed(1)}s</span>`;
  } else {
    btn.disabled = false;
    btn.innerHTML = `<span class="sname">${skill.name}</span><span class="scd ready">발동</span>`;
  }
}

// 그리기: 영웅 (사거리 + 캐릭터 + 빛)
function drawHeroEntity() {
  const he = game.heroEntity;
  if (!he) return;
  // 사거리 (선택 시 또는 항상 살짝 표시)
  const stat = heroEffectiveStat(he);
  ctx.strokeStyle = 'rgba(243,216,120,0.18)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.arc(he.cx, he.cy, stat.range, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // 영웅 모션 — 호흡(상하), 사위(좌우), 공격 시 살짝 앞으로 기울기
  const bob = Math.sin(he.bobT * 2.4) * 1.5;
  const breath = Math.sin(he.bobT * 1.4) * 1.2;
  const sway = Math.cos(he.bobT * 0.8) * 0.6;
  const heroColor = HEROES[he.type].color;
  // 발 아래 큰 빛나는 원 (위압감)
  ctx.fillStyle = `${heroColor}26`;
  ctx.beginPath();
  ctx.ellipse(he.cx, he.cy + 20, 24, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `${heroColor}55`;
  ctx.beginPath();
  ctx.ellipse(he.cx, he.cy + 20, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // 발광 (영웅 색, 발사 시 약하게)
  if (he.flashT > 0) {
    const r = parseInt(heroColor.slice(1, 3), 16);
    const g = parseInt(heroColor.slice(3, 5), 16);
    const b = parseInt(heroColor.slice(5, 7), 16);
    ctx.fillStyle = `rgba(${r},${g},${b},${he.flashT * 0.6})`;
    ctx.beginPath();
    ctx.arc(he.cx, he.cy - 12, 20, 0, Math.PI * 2);
    ctx.fill();
  }
  // 영웅 캐릭터 (위압적 크기 + 모션)
  const sprite = HERO_SPRITE[he.type];
  if (sprite && sprite.complete && sprite.naturalWidth > 0) {
    const size = 60;
    const dx = he.cx - size / 2 + sway;
    const dy = he.cy + bob + breath - size + 12;
    if (he.flashT > 0) {
      // 공격 모션 — 살짝 앞으로 숙임
      const tilt = he.flashT * 0.18;
      ctx.save();
      ctx.translate(he.cx, he.cy + 16);
      ctx.rotate(tilt);
      ctx.translate(-he.cx, -(he.cy + 16));
      ctx.drawImage(sprite, dx, dy, size, size);
      ctx.restore();
    } else {
      ctx.drawImage(sprite, dx, dy, size, size);
    }
  } else {
    drawHeroPortrait(ctx, he.type, he.cx - 32, he.cy + bob + breath - 28, 1);
  }
  // 머리 위 작은 별 (HP 없음, 무적 표시)
  ctx.fillStyle = heroColor;
  drawStar(ctx, he.cx, he.cy - 38 + bob, 4, 5);
}

// ============================================================
// 캐릭터 드로잉 (도형 조합 픽셀 아트)
// 영웅 일러스트는 좀 더 디테일하게 (미형)
// ============================================================

// 픽셀 사각형 헬퍼 (정수 좌표 보장)
function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function pxCircle(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

// 부드러운 그림자
function drawShadow(ctx, x, y, w) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y, w, w * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ============================================================
// 영웅 미형 일러스트 (큰 사이즈, 메뉴/배너용)
// 표준 사이즈: 64x64 캔버스
// ============================================================
function drawArcherHero(ctx, ox, oy, scale = 1) {
  const s = scale;
  const hero = HEROES.archer;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(s, s);

  // 그림자
  drawShadow(ctx, 32, 60, 14);

  // 망토 뒷면 (어깨에서 흘러내림)
  ctx.fillStyle = hero.cloth;
  ctx.beginPath();
  ctx.moveTo(20, 28);
  ctx.lineTo(12, 56);
  ctx.lineTo(20, 58);
  ctx.lineTo(28, 32);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(44, 28);
  ctx.lineTo(52, 56);
  ctx.lineTo(44, 58);
  ctx.lineTo(36, 32);
  ctx.closePath();
  ctx.fill();

  // 긴 머리카락 뒤
  ctx.fillStyle = hero.hair;
  ctx.beginPath();
  ctx.ellipse(32, 26, 14, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // 몸통 (튜닉)
  px(ctx, 24, 32, 16, 20, hero.cloth);
  px(ctx, 24, 32, 16, 4, hero.cloth2); // 어깨 라인
  // 허리 띠
  px(ctx, 24, 44, 16, 2, '#3a2a14');

  // 팔 (활을 든 자세)
  px(ctx, 18, 34, 6, 14, hero.skin); // 왼팔 (활 잡은 손)
  px(ctx, 40, 36, 6, 12, hero.skin); // 오른팔 (시위 당김)

  // 다리 (스커트형 짧은 부츠)
  px(ctx, 26, 48, 5, 10, hero.cloth);
  px(ctx, 33, 48, 5, 10, hero.cloth);
  px(ctx, 26, 56, 5, 4, '#3a2a14'); // 부츠
  px(ctx, 33, 56, 5, 4, '#3a2a14');

  // 머리 (얼굴)
  pxCircle(ctx, 32, 22, 9, hero.skin);

  // 앞머리 (밝은 색 강조)
  ctx.fillStyle = hero.hair;
  ctx.beginPath();
  ctx.moveTo(23, 18);
  ctx.quadraticCurveTo(28, 12, 32, 14);
  ctx.quadraticCurveTo(36, 12, 41, 18);
  ctx.lineTo(40, 22);
  ctx.lineTo(36, 18);
  ctx.lineTo(32, 19);
  ctx.lineTo(28, 18);
  ctx.lineTo(24, 22);
  ctx.closePath();
  ctx.fill();

  // 사이드 머리카락 (얼굴 옆)
  px(ctx, 22, 20, 2, 8, hero.hair);
  px(ctx, 40, 20, 2, 8, hero.hair);

  // 눈 (큰 미형 눈)
  px(ctx, 27, 22, 2, 3, '#1a1a2a');
  px(ctx, 35, 22, 2, 3, '#1a1a2a');
  px(ctx, 27, 22, 1, 1, '#fff'); // 하이라이트
  px(ctx, 35, 22, 1, 1, '#fff');

  // 작은 입
  px(ctx, 31, 26, 2, 1, '#a85a5a');

  // 볼터치
  ctx.fillStyle = 'rgba(255, 150, 150, 0.4)';
  ctx.fillRect(26, 25, 2, 1);
  ctx.fillRect(36, 25, 2, 1);

  // 활 (큰 활)
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(14, 22);
  ctx.quadraticCurveTo(8, 38, 14, 54);
  ctx.stroke();
  // 시위
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(14, 22);
  ctx.lineTo(14, 54);
  ctx.stroke();
  // 화살
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(14, 38);
  ctx.lineTo(28, 38);
  ctx.stroke();
  px(ctx, 13, 37, 2, 3, '#7ed957'); // 깃털

  ctx.restore();
}

function drawMageHero(ctx, ox, oy, scale = 1) {
  const s = scale;
  const hero = HEROES.mage;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(s, s);

  drawShadow(ctx, 32, 60, 14);

  // 로브 뒷자락
  ctx.fillStyle = hero.cloth;
  ctx.beginPath();
  ctx.moveTo(18, 36);
  ctx.lineTo(10, 60);
  ctx.lineTo(54, 60);
  ctx.lineTo(46, 36);
  ctx.closePath();
  ctx.fill();
  // 로브 무늬 (별)
  ctx.fillStyle = '#fde68a';
  ctx.fillRect(20, 50, 2, 2);
  ctx.fillRect(28, 54, 2, 2);
  ctx.fillRect(40, 52, 2, 2);

  // 긴 머리 (뒤)
  ctx.fillStyle = hero.hair;
  ctx.beginPath();
  ctx.ellipse(32, 28, 16, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  // 몸 (로브 윗부분)
  px(ctx, 24, 32, 16, 16, hero.cloth);
  // 가슴 부분 골드 트림
  px(ctx, 24, 38, 16, 1, '#fbbf24');
  px(ctx, 31, 32, 2, 6, hero.cloth2); // 중앙 라인

  // 팔 (지팡이 잡은 자세)
  px(ctx, 18, 34, 6, 14, hero.cloth);
  px(ctx, 40, 34, 6, 14, hero.cloth);
  // 손
  px(ctx, 18, 46, 6, 4, hero.skin);
  px(ctx, 40, 46, 6, 4, hero.skin);

  // 머리 (얼굴)
  pxCircle(ctx, 32, 22, 9, hero.skin);

  // 앞머리 (옆 가르마)
  ctx.fillStyle = hero.hair;
  ctx.beginPath();
  ctx.moveTo(23, 17);
  ctx.quadraticCurveTo(30, 11, 36, 13);
  ctx.lineTo(41, 16);
  ctx.lineTo(40, 22);
  ctx.lineTo(35, 18);
  ctx.lineTo(28, 19);
  ctx.lineTo(24, 22);
  ctx.closePath();
  ctx.fill();
  // 사이드 머리
  px(ctx, 22, 20, 2, 10, hero.hair);
  px(ctx, 40, 20, 2, 10, hero.hair);

  // 눈
  px(ctx, 27, 22, 2, 3, '#2a1a4a');
  px(ctx, 35, 22, 2, 3, '#2a1a4a');
  px(ctx, 27, 22, 1, 1, '#fff');
  px(ctx, 35, 22, 1, 1, '#fff');

  // 입
  px(ctx, 31, 26, 2, 1, '#9a4a6a');

  // 볼
  ctx.fillStyle = 'rgba(255, 180, 200, 0.4)';
  ctx.fillRect(26, 25, 2, 1);
  ctx.fillRect(36, 25, 2, 1);

  // 별 머리 장식
  ctx.fillStyle = '#fde68a';
  drawStar(ctx, 32, 11, 3, 5);

  // 지팡이 (오른손)
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(46, 14);
  ctx.lineTo(50, 56);
  ctx.stroke();
  // 지팡이 위 보석
  ctx.fillStyle = hero.cloth2;
  ctx.beginPath();
  ctx.arc(45, 12, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(43, 10, 1.5, 0, Math.PI * 2);
  ctx.fill();
  // 보석 빛남
  ctx.fillStyle = 'rgba(192,132,252,0.4)';
  ctx.beginPath();
  ctx.arc(45, 12, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawMerchantHero(ctx, ox, oy, scale = 1) {
  const s = scale;
  const hero = HEROES.merchant;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(s, s);

  drawShadow(ctx, 32, 60, 14);

  // 망토 (황금 망토 흩날림)
  ctx.fillStyle = hero.cloth2;
  ctx.beginPath();
  ctx.moveTo(20, 28);
  ctx.lineTo(8, 58);
  ctx.lineTo(18, 58);
  ctx.lineTo(28, 32);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(44, 28);
  ctx.lineTo(56, 58);
  ctx.lineTo(46, 58);
  ctx.lineTo(36, 32);
  ctx.closePath();
  ctx.fill();
  // 망토 트림
  ctx.fillStyle = hero.accent;
  ctx.fillRect(8, 56, 10, 2);
  ctx.fillRect(46, 56, 10, 2);

  // 몸통 (조끼)
  px(ctx, 24, 32, 16, 18, hero.cloth);
  // 단추
  px(ctx, 31, 36, 2, 2, '#fbbf24');
  px(ctx, 31, 42, 2, 2, '#fbbf24');
  // 흰 셔츠 카라
  px(ctx, 28, 32, 8, 3, '#f4ead8');

  // 팔
  px(ctx, 18, 34, 6, 14, hero.cloth);
  px(ctx, 40, 34, 6, 14, hero.cloth);
  px(ctx, 18, 46, 6, 4, hero.skin);
  px(ctx, 40, 46, 6, 4, hero.skin);

  // 다리
  px(ctx, 26, 50, 5, 8, '#3a2a14');
  px(ctx, 33, 50, 5, 8, '#3a2a14');
  px(ctx, 26, 56, 5, 4, '#1a0a04'); // 부츠
  px(ctx, 33, 56, 5, 4, '#1a0a04');

  // 머리
  pxCircle(ctx, 32, 22, 9, hero.skin);

  // 머리카락 (단정한 사이드 컷)
  ctx.fillStyle = hero.hair;
  ctx.beginPath();
  ctx.moveTo(23, 18);
  ctx.lineTo(24, 13);
  ctx.lineTo(40, 13);
  ctx.lineTo(41, 18);
  ctx.lineTo(36, 16);
  ctx.lineTo(28, 16);
  ctx.closePath();
  ctx.fill();
  px(ctx, 23, 17, 2, 6, hero.hair);
  px(ctx, 39, 17, 2, 6, hero.hair);

  // 눈 (날카로운 눈매)
  px(ctx, 27, 22, 2, 2, '#2a1a0a');
  px(ctx, 35, 22, 2, 2, '#2a1a0a');
  px(ctx, 27, 22, 1, 1, '#fff');
  px(ctx, 35, 22, 1, 1, '#fff');

  // 미소
  ctx.strokeStyle = '#8a4a2a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(32, 25, 2, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // 동전 자루 (왼손)
  ctx.fillStyle = '#8a6a3a';
  ctx.beginPath();
  ctx.arc(15, 50, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(13, 44, 4, 2);
  // 동전이 보임
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(13, 47, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(17, 48, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // 동전 위에 떠다니는 빛
  ctx.fillStyle = 'rgba(251, 191, 36, 0.5)';
  ctx.beginPath();
  ctx.arc(48, 38, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(251, 191, 36, 0.7)';
  ctx.fillRect(47, 37, 1, 1);

  ctx.restore();
}

function drawStar(ctx, cx, cy, rOuter, points) {
  const rInner = rOuter * 0.45;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

// 영웅 ID로 일러스트 그리기
function drawHeroPortrait(ctx, heroId, ox, oy, scale = 1) {
  const img = HERO_IMG[heroId];
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, ox, oy, 64 * scale, 64 * scale);
    return;
  }
  if (heroId === 'archer') drawArcherHero(ctx, ox, oy, scale);
  else if (heroId === 'mage') drawMageHero(ctx, ox, oy, scale);
  else if (heroId === 'merchant') drawMerchantHero(ctx, ox, oy, scale);
}

// 영웅 일러스트 이미지 로드 (있으면 도형 대신 사용)
// HERO_IMG: 메뉴/배너용 큰 일러스트 (배경 있어도 OK)
// HERO_SPRITE: 인게임용 투명배경 스프라이트
const HERO_IMG = {};
const HERO_SPRITE = {};
function loadHeroPortraits() {
  const portraits = {
    archer: 'assets/heroes/archer.png',
    mage: 'assets/heroes/mage.png',
    merchant: 'assets/heroes/merchant.png',
  };
  const sprites = {
    archer: 'assets/heroes/archer-sprite.png',
    mage: 'assets/heroes/mage-sprite.png',
    merchant: 'assets/heroes/merchant-sprite.png',
  };
  for (const [id, src] of Object.entries(portraits)) {
    const img = new Image();
    img.onload = () => {
      HERO_IMG[id] = img;
      if (game.state === 'menu') renderMainMenu();
    };
    img.onerror = () => {};
    img.src = src;
  }
  for (const [id, src] of Object.entries(sprites)) {
    const img = new Image();
    img.onload = () => { HERO_SPRITE[id] = img; };
    img.onerror = () => {};
    img.src = src;
  }
}
loadHeroPortraits();

// ============================================================
// Kenney Tower Defense 타일셋 로드 (지형/경로/타워/적/발사체)
// ============================================================
const KENNEY = {};
function loadKenney() {
  // 사용할 타일 ID 목록 (지형은 즉시 로드, 그 외는 lazy 가능)
  const ids = [
    1, 24, 27, 67, 93, 96,        // 잔디/모래 + 변형
    111, 123, 124, 130, 132, 144, // 잔디/모래 디테일 (꽃, 풀, 바위 등 추정)
    181, 182, 183, 184, 187,      // 타워 기지 (추정)
    189, 200, 207, 208, 209, 210, // 타워 포신 (추정)
    245, 246, 247, 248, 271, 272, // 적 보병/유닛 (추정)
    250, 251, 252, 253, 254,      // 적 추가
    287, 288, 289, 290, 291, 292, // 발사체 (추정)
  ];
  for (const id of ids) {
    const num = String(id).padStart(3, '0');
    const img = new Image();
    img.src = `assets/kenney/towerDefense_tile${num}.png`;
    KENNEY[id] = img;
  }
}
loadKenney();

// 타일 그리기 헬퍼 — 캐싱되어 있으면 그림, 아니면 fallback 호출
function kdraw(id, x, y, size) {
  const img = KENNEY[id];
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, x, y, size, size);
    return true;
  }
  return false;
}

// ============================================================
// 타워 캐릭터 (인게임용, 32x40 박스, 발 기준 중앙 하단)
// ============================================================

// 공통: 인간형 베이스 (머리 + 몸 + 다리). 좌표는 (cx, footY) 기준.
function drawHumanoidBase(ctx, cx, footY, opt) {
  const skin = opt.skin || '#fde6c8';
  const cloth = opt.cloth || '#3a3a4a';
  const cloth2 = opt.cloth2 || '#5a5a6a';
  const hair = opt.hair || '#1a1a2a';
  // 그림자
  drawShadow(ctx, cx, footY, 12);
  // 다리
  px(ctx, cx - 5, footY - 12, 4, 10, cloth);
  px(ctx, cx + 1, footY - 12, 4, 10, cloth);
  // 부츠
  px(ctx, cx - 5, footY - 4, 4, 3, '#1a0a04');
  px(ctx, cx + 1, footY - 4, 4, 3, '#1a0a04');
  // 몸통
  px(ctx, cx - 7, footY - 24, 14, 14, cloth);
  px(ctx, cx - 7, footY - 24, 14, 3, cloth2); // 어깨
  // 팔
  px(ctx, cx - 10, footY - 22, 4, 11, cloth);
  px(ctx, cx + 6, footY - 22, 4, 11, cloth);
  // 손
  px(ctx, cx - 10, footY - 12, 4, 3, skin);
  px(ctx, cx + 6, footY - 12, 4, 3, skin);
  // 머리
  pxCircle(ctx, cx, footY - 30, 6, skin);
  // 머리카락
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(cx, footY - 32, 7, Math.PI, Math.PI * 2);
  ctx.fill();
  // 눈
  px(ctx, cx - 3, footY - 30, 1, 2, '#1a1a2a');
  px(ctx, cx + 2, footY - 30, 1, 2, '#1a1a2a');
}

function drawArcherTower(ctx, cx, footY, level = 1) {
  const palette = [
    { cloth: '#3d6b2c', cloth2: '#7ed957', hair: '#5b3b1a', skin: '#fde6c8' },
    { cloth: '#2d5b1c', cloth2: '#a3e070', hair: '#5b3b1a', skin: '#fde6c8' },
    { cloth: '#1d4b0c', cloth2: '#d4f088', hair: '#a87a3a', skin: '#fde6c8' },
  ][level - 1];
  drawHumanoidBase(ctx, cx, footY, palette);
  // 후드
  ctx.fillStyle = palette.cloth;
  ctx.beginPath();
  ctx.arc(cx, footY - 32, 8, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 8, footY - 32, 16, 4);
  // 활
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 13, footY - 26);
  ctx.quadraticCurveTo(cx - 17, footY - 18, cx - 13, footY - 10);
  ctx.stroke();
  // 시위
  ctx.strokeStyle = '#d0d0d0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 13, footY - 26);
  ctx.lineTo(cx - 13, footY - 10);
  ctx.stroke();
  // 레벨 별
  drawLevelStars(ctx, cx, footY - 42, level, '#7ed957');
}

function drawCannonTower(ctx, cx, footY, level = 1) {
  const palette = [
    { cloth: '#5a5a5a', cloth2: '#7a7a7a', hair: '#1a1a1a', skin: '#e8c8a8' },
    { cloth: '#4a4a4a', cloth2: '#aaaaaa', hair: '#1a1a1a', skin: '#e8c8a8' },
    { cloth: '#3a3a3a', cloth2: '#d4af37', hair: '#1a1a1a', skin: '#e8c8a8' },
  ][level - 1];
  drawHumanoidBase(ctx, cx, footY, palette);
  // 헬멧
  ctx.fillStyle = palette.cloth2;
  ctx.beginPath();
  ctx.arc(cx, footY - 32, 7, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 7, footY - 32, 14, 3);
  // 헬멧 뿔
  ctx.fillStyle = '#d4af37';
  px(ctx, cx - 1, footY - 40, 2, 4, '#d4af37');
  // 대포 (오른쪽)
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(cx + 6, footY - 22, 14, 8);
  ctx.fillRect(cx + 18, footY - 20, 4, 4);
  ctx.fillStyle = palette.cloth2;
  ctx.fillRect(cx + 6, footY - 22, 4, 8); // 베이스
  // 포구 어둠
  px(ctx, cx + 21, footY - 19, 1, 2, '#0a0a0a');
  drawLevelStars(ctx, cx, footY - 42, level, '#aaaaaa');
}

function drawMageTower(ctx, cx, footY, level = 1) {
  const palette = [
    { cloth: '#3a2a6a', cloth2: '#a78bfa', hair: '#c4b5fd', skin: '#fde6c8' },
    { cloth: '#2a1a5a', cloth2: '#c084fc', hair: '#e9c4ff', skin: '#fde6c8' },
    { cloth: '#1a0a4a', cloth2: '#f3d878', hair: '#fde68a', skin: '#fde6c8' },
  ][level - 1];
  drawHumanoidBase(ctx, cx, footY, palette);
  // 마법사 모자 (뾰족)
  ctx.fillStyle = palette.cloth;
  ctx.beginPath();
  ctx.moveTo(cx - 8, footY - 32);
  ctx.lineTo(cx + 8, footY - 32);
  ctx.lineTo(cx + 2, footY - 44);
  ctx.closePath();
  ctx.fill();
  // 모자 트림
  px(ctx, cx - 8, footY - 32, 16, 2, palette.cloth2);
  // 모자 끝 별
  ctx.fillStyle = palette.cloth2;
  drawStar(ctx, cx + 2, footY - 44, 2, 5);
  // 지팡이
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + 12, footY - 30);
  ctx.lineTo(cx + 14, footY - 6);
  ctx.stroke();
  // 지팡이 보석
  ctx.fillStyle = palette.cloth2;
  ctx.beginPath();
  ctx.arc(cx + 12, footY - 32, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(192,132,252,0.4)';
  ctx.beginPath();
  ctx.arc(cx + 12, footY - 32, 5, 0, Math.PI * 2);
  ctx.fill();
  drawLevelStars(ctx, cx, footY - 50, level, '#a78bfa');
}

function drawFrostTower(ctx, cx, footY, level = 1) {
  const palette = [
    { cloth: '#1e3a8a', cloth2: '#7dd3fc', hair: '#bfdbfe', skin: '#fde6c8' },
    { cloth: '#0e2a7a', cloth2: '#93dafd', hair: '#dbeafe', skin: '#fde6c8' },
    { cloth: '#0a1a5a', cloth2: '#e0f2ff', hair: '#ffffff', skin: '#fde6c8' },
  ][level - 1];
  drawHumanoidBase(ctx, cx, footY, palette);
  // 후드
  ctx.fillStyle = palette.cloth;
  ctx.beginPath();
  ctx.arc(cx, footY - 32, 8, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 8, footY - 32, 16, 4);
  // 후드 트림 (얼음)
  px(ctx, cx - 8, footY - 28, 16, 1, palette.cloth2);
  // 얼음 지팡이
  ctx.strokeStyle = '#7a8aa0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 12, footY - 30);
  ctx.lineTo(cx - 14, footY - 6);
  ctx.stroke();
  // 얼음 결정 (뾰족한 다이아몬드)
  ctx.fillStyle = palette.cloth2;
  ctx.beginPath();
  ctx.moveTo(cx - 12, footY - 38);
  ctx.lineTo(cx - 8, footY - 32);
  ctx.lineTo(cx - 12, footY - 26);
  ctx.lineTo(cx - 16, footY - 32);
  ctx.closePath();
  ctx.fill();
  // 얼음 광채
  ctx.fillStyle = 'rgba(125,211,252,0.4)';
  ctx.beginPath();
  ctx.arc(cx - 12, footY - 32, 6, 0, Math.PI * 2);
  ctx.fill();
  // 얼음 결정 하이라이트
  px(ctx, cx - 13, footY - 35, 1, 4, '#fff');
  drawLevelStars(ctx, cx, footY - 44, level, '#7dd3fc');
}

function drawSniperTower(ctx, cx, footY, level = 1) {
  const palette = [
    { cloth: '#2a2a3a', cloth2: '#5a5a7a', hair: '#3a2a1a', skin: '#e8c8a8' },
    { cloth: '#1a1a2a', cloth2: '#7a7a9a', hair: '#3a2a1a', skin: '#e8c8a8' },
    { cloth: '#0a0a1a', cloth2: '#d4af37', hair: '#3a2a1a', skin: '#e8c8a8' },
  ][level - 1];
  drawHumanoidBase(ctx, cx, footY, palette);
  // 망토 후드
  ctx.fillStyle = palette.cloth;
  ctx.beginPath();
  ctx.arc(cx, footY - 32, 8, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 8, footY - 32, 16, 5);
  // 후드 그림자 (얼굴 가림)
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(cx - 5, footY - 31, 10, 5);
  // 눈만 빛남
  px(ctx, cx - 3, footY - 30, 2, 1, '#ff5050');
  px(ctx, cx + 1, footY - 30, 2, 1, '#ff5050');
  // 라이플 (양손)
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(cx - 14, footY - 18, 28, 3);
  ctx.fillStyle = palette.cloth2;
  ctx.fillRect(cx - 4, footY - 19, 8, 2); // 손잡이
  // 망원경
  ctx.fillStyle = '#5a5a5a';
  ctx.fillRect(cx - 2, footY - 22, 6, 2);
  // 총구
  px(ctx, cx + 14, footY - 17, 2, 1, '#0a0a0a');
  drawLevelStars(ctx, cx, footY - 42, level, '#7a7a9a');
}

function drawLevelStars(ctx, cx, y, level, color) {
  if (level < 2) return;
  ctx.fillStyle = color;
  for (let i = 0; i < level - 1; i++) {
    drawStar(ctx, cx - (level - 2) * 4 + i * 8, y, 2.5, 5);
  }
}

// 타워 ID 분기
function drawTower(ctx, type, cx, footY, level = 1) {
  // 타워 base — 큰 돌 받침대 (잔디 위에서 즉시 보이도록)
  ctx.save();
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(cx, footY + 2, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // 베이스 사각형 (돌 색상)
  const baseW = 26, baseH = 22;
  const bx = cx - baseW / 2, by = footY - baseH + 4;
  // 외곽 어두운
  ctx.fillStyle = '#3a2f24';
  ctx.fillRect(bx - 1, by - 1, baseW + 2, baseH + 2);
  // 안쪽 베이지
  ctx.fillStyle = '#a08054';
  ctx.fillRect(bx, by, baseW, baseH);
  // 하이라이트
  ctx.fillStyle = '#c9a378';
  ctx.fillRect(bx, by, baseW, 4);
  // 외곽선 흰
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(bx, by, baseW, baseH);
  ctx.restore();
  if (type === 'archer') drawArcherTower(ctx, cx, footY, level);
  else if (type === 'cannon') drawCannonTower(ctx, cx, footY, level);
  else if (type === 'mage') drawMageTower(ctx, cx, footY, level);
  else if (type === 'frost') drawFrostTower(ctx, cx, footY, level);
  else if (type === 'sniper') drawSniperTower(ctx, cx, footY, level);
}

// ============================================================
// 적 캐릭터 (24x32 박스, 발 기준 중앙)
// ============================================================
function drawGoblin(ctx, cx, footY, hpRatio = 1) {
  drawShadow(ctx, cx, footY, 8);
  const skin = '#7a9d4a';
  // 다리
  px(ctx, cx - 4, footY - 8, 3, 7, '#3a4a2a');
  px(ctx, cx + 1, footY - 8, 3, 7, '#3a4a2a');
  // 몸
  px(ctx, cx - 5, footY - 18, 10, 11, '#5a3a1a');
  // 팔
  px(ctx, cx - 8, footY - 16, 3, 8, skin);
  px(ctx, cx + 5, footY - 16, 3, 8, skin);
  // 머리
  pxCircle(ctx, cx, footY - 22, 5, skin);
  // 귀 (뾰족)
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(cx - 5, footY - 24);
  ctx.lineTo(cx - 9, footY - 28);
  ctx.lineTo(cx - 5, footY - 22);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 5, footY - 24);
  ctx.lineTo(cx + 9, footY - 28);
  ctx.lineTo(cx + 5, footY - 22);
  ctx.closePath();
  ctx.fill();
  // 눈 (붉은 빛)
  px(ctx, cx - 3, footY - 23, 1, 1, '#ff5050');
  px(ctx, cx + 2, footY - 23, 1, 1, '#ff5050');
  // 이빨
  px(ctx, cx - 1, footY - 20, 1, 1, '#fff');
  px(ctx, cx + 1, footY - 20, 1, 1, '#fff');
  // 곤봉
  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(cx + 6, footY - 24, 2, 12);
  ctx.fillRect(cx + 5, footY - 26, 4, 4);
}

function drawOrc(ctx, cx, footY, hpRatio = 1) {
  drawShadow(ctx, cx, footY, 11);
  const skin = '#5a7a3a';
  // 다리
  px(ctx, cx - 5, footY - 10, 4, 9, '#2a1a0a');
  px(ctx, cx + 1, footY - 10, 4, 9, '#2a1a0a');
  // 몸
  px(ctx, cx - 8, footY - 22, 16, 13, '#4a3a2a');
  px(ctx, cx - 8, footY - 22, 16, 3, '#7a5a3a'); // 어깨 갑옷
  // 팔 (큰 팔)
  px(ctx, cx - 11, footY - 20, 4, 10, skin);
  px(ctx, cx + 7, footY - 20, 4, 10, skin);
  // 머리
  pxCircle(ctx, cx, footY - 26, 6, skin);
  // 송곳니
  px(ctx, cx - 2, footY - 22, 1, 2, '#fff');
  px(ctx, cx + 1, footY - 22, 1, 2, '#fff');
  // 눈
  px(ctx, cx - 3, footY - 27, 2, 2, '#ffaa00');
  px(ctx, cx + 1, footY - 27, 2, 2, '#ffaa00');
  // 도끼 (오른손)
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(cx + 9, footY - 24, 2, 14); // 자루
  ctx.fillStyle = '#aaaaaa';
  ctx.beginPath();
  ctx.moveTo(cx + 8, footY - 26);
  ctx.lineTo(cx + 14, footY - 24);
  ctx.lineTo(cx + 14, footY - 18);
  ctx.lineTo(cx + 8, footY - 16);
  ctx.closePath();
  ctx.fill();
}

function drawDrone(ctx, cx, footY, hpRatio = 1, t = 0) {
  // 공중 적: 흔들림
  const yOff = Math.sin(t * 0.005) * 3;
  const cy = footY - 16 + yOff;
  // 발 그림자 (지면)
  drawShadow(ctx, cx, footY, 7);
  // 본체 (구체)
  pxCircle(ctx, cx, cy, 7, '#9a3a4a');
  pxCircle(ctx, cx - 2, cy - 2, 2, '#d75a6a');
  // 눈 하나 (큰)
  pxCircle(ctx, cx, cy, 3, '#fde68a');
  px(ctx, cx - 1, cy, 2, 2, '#1a1a2a');
  // 날개 (펄럭이는)
  const wing = Math.sin(t * 0.02) * 2;
  ctx.fillStyle = '#7a2a3a';
  ctx.beginPath();
  ctx.moveTo(cx - 7, cy);
  ctx.lineTo(cx - 14, cy - 4 + wing);
  ctx.lineTo(cx - 14, cy + 2 + wing);
  ctx.lineTo(cx - 7, cy + 2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 7, cy);
  ctx.lineTo(cx + 14, cy - 4 + wing);
  ctx.lineTo(cx + 14, cy + 2 + wing);
  ctx.lineTo(cx + 7, cy + 2);
  ctx.closePath();
  ctx.fill();
}

function drawShield(ctx, cx, footY, hpRatio = 1) {
  drawShadow(ctx, cx, footY, 11);
  const skin = '#d4a878';
  // 다리
  px(ctx, cx - 5, footY - 10, 4, 9, '#3a3a4a');
  px(ctx, cx + 1, footY - 10, 4, 9, '#3a3a4a');
  // 갑옷 몸통
  px(ctx, cx - 8, footY - 22, 16, 13, '#5a5a7a');
  px(ctx, cx - 8, footY - 22, 16, 3, '#7a7a9a');
  // 팔
  px(ctx, cx + 7, footY - 20, 4, 10, '#5a5a7a');
  // 헬멧
  pxCircle(ctx, cx, footY - 26, 6, '#7a7a9a');
  px(ctx, cx - 5, footY - 27, 10, 3, '#5a5a7a');
  // 헬멧 슬릿 (눈)
  px(ctx, cx - 3, footY - 25, 6, 1, '#ff5050');
  // 방패 (왼쪽, 큰)
  ctx.fillStyle = '#9a7a3a';
  ctx.fillRect(cx - 16, footY - 25, 8, 18);
  ctx.fillStyle = '#fde68a';
  ctx.fillRect(cx - 14, footY - 22, 4, 12);
  ctx.fillStyle = '#9a7a3a';
  ctx.fillRect(cx - 13, footY - 17, 2, 2); // 보스
}

function drawRogue(ctx, cx, footY, hpRatio = 1) {
  drawShadow(ctx, cx, footY, 8);
  // 다리
  px(ctx, cx - 4, footY - 8, 3, 7, '#1a1a2a');
  px(ctx, cx + 1, footY - 8, 3, 7, '#1a1a2a');
  // 망토
  ctx.fillStyle = '#2a1a3a';
  ctx.beginPath();
  ctx.moveTo(cx - 8, footY - 22);
  ctx.lineTo(cx - 6, footY - 4);
  ctx.lineTo(cx + 6, footY - 4);
  ctx.lineTo(cx + 8, footY - 22);
  ctx.closePath();
  ctx.fill();
  // 후드 (얼굴 가림)
  ctx.fillStyle = '#1a0a1a';
  ctx.beginPath();
  ctx.arc(cx, footY - 24, 7, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 7, footY - 24, 14, 4);
  // 빛나는 눈 (보라)
  px(ctx, cx - 3, footY - 22, 1, 1, '#c084fc');
  px(ctx, cx + 2, footY - 22, 1, 1, '#c084fc');
  // 단검
  ctx.fillStyle = '#aaaaaa';
  ctx.fillRect(cx + 7, footY - 14, 6, 2);
  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(cx + 5, footY - 14, 2, 2);
}

function drawGiant(ctx, cx, footY, hpRatio = 1) {
  drawShadow(ctx, cx, footY, 18);
  const skin = '#5a3a4a';
  // 다리
  px(ctx, cx - 8, footY - 16, 6, 14, '#2a1a0a');
  px(ctx, cx + 2, footY - 16, 6, 14, '#2a1a0a');
  // 몸 (거대)
  px(ctx, cx - 14, footY - 36, 28, 22, '#4a2a3a');
  px(ctx, cx - 14, footY - 36, 28, 5, '#7a4a5a');
  // 팔
  px(ctx, cx - 18, footY - 32, 5, 18, skin);
  px(ctx, cx + 13, footY - 32, 5, 18, skin);
  // 머리
  pxCircle(ctx, cx, footY - 42, 10, skin);
  // 뿔
  ctx.fillStyle = '#1a0a1a';
  ctx.beginPath();
  ctx.moveTo(cx - 8, footY - 48);
  ctx.lineTo(cx - 6, footY - 56);
  ctx.lineTo(cx - 4, footY - 48);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 4, footY - 48);
  ctx.lineTo(cx + 6, footY - 56);
  ctx.lineTo(cx + 8, footY - 48);
  ctx.closePath();
  ctx.fill();
  // 눈 (분노한)
  px(ctx, cx - 5, footY - 42, 3, 3, '#ff2020');
  px(ctx, cx + 2, footY - 42, 3, 3, '#ff2020');
  // 송곳니
  px(ctx, cx - 3, footY - 36, 2, 4, '#fff');
  px(ctx, cx + 1, footY - 36, 2, 4, '#fff');
}

// 적 그리기 분기
function drawEnemy(ctx, type, cx, footY, hpRatio, t) {
  if (type === 'goblin') drawGoblin(ctx, cx, footY, hpRatio);
  else if (type === 'orc') drawOrc(ctx, cx, footY, hpRatio);
  else if (type === 'drone') drawDrone(ctx, cx, footY, hpRatio, t);
  else if (type === 'shield') drawShield(ctx, cx, footY, hpRatio);
  else if (type === 'rogue') drawRogue(ctx, cx, footY, hpRatio);
  else if (type === 'giant') drawGiant(ctx, cx, footY, hpRatio);
}

// ============================================================
// 가호(Boon) 정의 (Step 5)
// 등급: common, rare, epic, legendary
// kind: 'global'(모든 타워/전역), 'tower-mod'(특정 타워 변형), 'instant'(즉시 효과)
// 효과는 boons[].id별 구현체에서 처리 (modifyTowerStats / onProjectileFire / onEnemyKill 등 훅)
// ============================================================
const BOONS = [
  // ---- common: 즉시/스탯 ----
  { id: 'gold-rush', name: '골드러시', desc: '시작 즉시 +60 골드', rarity: 'common', kind: 'instant',
    apply: () => { game.gold += 60; } },
  { id: 'wall-mend', name: '성벽 보강', desc: '생명 +5 (즉시)', rarity: 'common', kind: 'instant',
    apply: () => { game.hp += 5; } },
  { id: 'sharp-arrow', name: '날카로운 화살', desc: '모든 타워 데미지 +10%', rarity: 'common', kind: 'global' },
  { id: 'eagle-eye', name: '매의 눈', desc: '모든 타워 사거리 +12%', rarity: 'common', kind: 'global' },
  { id: 'quick-fire', name: '쾌속 사격', desc: '모든 타워 발사주기 -10%', rarity: 'common', kind: 'global' },
  { id: 'frugal', name: '검소한 손', desc: '타워 비용 -10%', rarity: 'common', kind: 'global' },

  // ---- rare: 더 강한 일반 효과 ----
  { id: 'bountiful', name: '풍요의 손', desc: '적 처치 골드 +2', rarity: 'rare', kind: 'global' },
  { id: 'wave-tribute', name: '웨이브 공물', desc: '웨이브 클리어 시 추가 +25 골드', rarity: 'rare', kind: 'global' },
  { id: 'magic-focus', name: '마력 집중', desc: '마법/얼음 타워 데미지 +25%', rarity: 'rare', kind: 'global' },
  { id: 'iron-bowstring', name: '강철 시위', desc: '궁수/저격 데미지 +25%', rarity: 'rare', kind: 'global' },
  { id: 'big-boom', name: '큰 폭발', desc: '대포/얼음 광역 반경 +40%', rarity: 'rare', kind: 'global' },

  // ---- epic: 타워 변형 ----
  { id: 'archer-chain', name: '사슬 화살', desc: '궁수 화살이 적중 후 1명에게 튕김', rarity: 'epic', kind: 'tower-mod', tower: 'archer' },
  { id: 'archer-pierce', name: '꿰뚫는 화살', desc: '궁수 화살이 적 2명을 관통', rarity: 'epic', kind: 'tower-mod', tower: 'archer' },
  { id: 'cannon-air', name: '비행 사격', desc: '대포가 공중 적도 공격', rarity: 'epic', kind: 'tower-mod', tower: 'cannon' },
  { id: 'cannon-burn', name: '화염 잔류', desc: '대포 폭발 위치에 잔불 (1.6초간 도트 데미지)', rarity: 'epic', kind: 'tower-mod', tower: 'cannon' },
  { id: 'mage-mark', name: '약화 표식', desc: '마법에 맞은 적은 이후 받는 데미지 +30%', rarity: 'epic', kind: 'tower-mod', tower: 'mage' },
  { id: 'frost-shatter', name: '빙결 파열', desc: '슬로우 상태 적이 죽으면 폭발', rarity: 'epic', kind: 'tower-mod', tower: 'frost' },
  { id: 'sniper-execute', name: '처형', desc: '저격 — 체력 25% 이하 적 즉시 처치', rarity: 'epic', kind: 'tower-mod', tower: 'sniper' },

  // ---- legendary: 강력한 변형 ----
  { id: 'archer-multi', name: '폭우 사격', desc: '궁수가 매 발사마다 화살 2발 동시 발사', rarity: 'legendary', kind: 'tower-mod', tower: 'archer' },
  { id: 'mage-chain', name: '연쇄 번개', desc: '마법이 추가로 2명에게 연쇄 (감쇠 -30%)', rarity: 'legendary', kind: 'tower-mod', tower: 'mage' },
  { id: 'frost-perma', name: '영원한 한기', desc: '얼음 슬로우 100% (정지)', rarity: 'legendary', kind: 'tower-mod', tower: 'frost' },
  { id: 'sniper-double', name: '쌍기관총', desc: '저격이 발사마다 두 발', rarity: 'legendary', kind: 'tower-mod', tower: 'sniper' },
  { id: 'tower-resonance', name: '타워 공명', desc: '인접한 같은 타입의 타워끼리 데미지 +15% (누적)', rarity: 'legendary', kind: 'global' },
];

const RARITY_WEIGHT = { common: 60, rare: 28, epic: 10, legendary: 2 };

function rollBoonChoices(count = 3) {
  const owned = new Set(game.boons.map(b => b.id));
  const pool = BOONS.filter(b => !owned.has(b.id));
  // common 보장 1개, 나머지 가중치
  const result = [];
  const tries = pool.slice();
  function pickRarity() {
    const total = Object.values(RARITY_WEIGHT).reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (const [k, w] of Object.entries(RARITY_WEIGHT)) {
      r -= w;
      if (r <= 0) return k;
    }
    return 'common';
  }
  while (result.length < count && tries.length > 0) {
    const r = pickRarity();
    const sub = tries.filter(b => b.rarity === r);
    const pick = sub.length ? sub[Math.floor(Math.random() * sub.length)]
                            : tries[Math.floor(Math.random() * tries.length)];
    result.push(pick);
    const idx = tries.indexOf(pick);
    if (idx >= 0) tries.splice(idx, 1);
  }
  return result;
}

function hasBoon(id) {
  return game.boons.some(b => b.id === id);
}

function addBoon(b) {
  if (hasBoon(b.id)) return;
  game.boons.push(b);
  if (b.apply) b.apply();
  renderBoonList();
  renderTowerShop();
  if (game.selectedTower) renderTowerInfo();
  updateHud();
}

// 가호의 effective stat 보정 — getTowerStat 사용 시 추가 호출
function applyBoonStats(tw, def, stat) {
  // global 보정
  if (hasBoon('sharp-arrow')) stat.dmg *= 1.10;
  if (hasBoon('eagle-eye')) stat.range *= 1.12;
  if (hasBoon('quick-fire')) stat.fireRate *= 0.9;
  if (hasBoon('big-boom') && (tw.type === 'cannon' || tw.type === 'frost')) stat.splash *= 1.4;
  if (hasBoon('magic-focus') && (tw.type === 'mage' || tw.type === 'frost')) stat.dmg *= 1.25;
  if (hasBoon('iron-bowstring') && (tw.type === 'archer' || tw.type === 'sniper')) stat.dmg *= 1.25;
  // 타워 공명: 인접한 같은 타입 수만큼 +15%
  if (hasBoon('tower-resonance')) {
    let neighbors = 0;
    for (const o of game.towers) {
      if (o === tw || o.type !== tw.type) continue;
      const dx = Math.abs(o.tileX - tw.tileX);
      const dy = Math.abs(o.tileY - tw.tileY);
      if (dx <= 1 && dy <= 1) neighbors++;
    }
    stat.dmg *= 1 + 0.15 * neighbors;
  }
  return stat;
}

function effectiveTowerCostBoon(id) {
  let cost = TOWERS[id].cost;
  if (hasBoon('frugal')) cost = Math.round(cost * 0.9);
  return cost;
}

// 가호의 화살 변형 — 발사 시 추가 발사체 생성
function onProjectileSpawn(tw, target, basePList) {
  const def = TOWERS[tw.type];
  if (tw.type === 'archer' && hasBoon('archer-multi')) {
    // 추가 한 발 (같은 타겟)
    basePList.push({ duplicate: true });
  }
  if (tw.type === 'sniper' && hasBoon('sniper-double')) {
    basePList.push({ duplicate: true });
  }
}

// 가호 효과: 적중 처리 (관통/체인/처형 등)
function onAfterHit(p, enemy) {
  if (p._chained || p._pierced) return; // 한 번만
  // 사슬 화살
  if (p.fromType === 'archer' && hasBoon('archer-chain') && !p._chained) {
    // 가까운 다른 적 찾기
    let next = null;
    let bd = 200;
    for (const e of game.enemies) {
      if (e === enemy || e.dead) continue;
      const d = Math.hypot(e.x - enemy.x, e.y - enemy.y);
      if (d < bd) { bd = d; next = e; }
    }
    if (next) {
      const np = makeArrowFollow(p, next, enemy.x, enemy.y, 0.7);
      np._chained = true;
      game.projectiles.push(np);
    }
  }
  // 관통 화살
  if (p.fromType === 'archer' && hasBoon('archer-pierce') && !p._pierced) {
    let next = null;
    let bd = 220;
    for (const e of game.enemies) {
      if (e === enemy || e.dead) continue;
      const d = Math.hypot(e.x - enemy.x, e.y - enemy.y);
      if (d < bd) { bd = d; next = e; }
    }
    if (next) {
      const np = makeArrowFollow(p, next, enemy.x, enemy.y, 1.0);
      np._pierced = true;
      game.projectiles.push(np);
    }
  }
  // 마법 표식
  if (p.fromType === 'mage' && hasBoon('mage-mark')) {
    enemy.markedT = 5;
  }
  // 마법 연쇄
  if (p.fromType === 'mage' && hasBoon('mage-chain') && !p._chained) {
    let count = 2;
    let cur = enemy;
    let dmg = p.dmg * 0.7;
    while (count > 0) {
      let next = null;
      let bd = 160;
      for (const e of game.enemies) {
        if (e === cur || e.dead) continue;
        const d = Math.hypot(e.x - cur.x, e.y - cur.y);
        if (d < bd) { bd = d; next = e; }
      }
      if (!next) break;
      const np = {
        x: cur.x, y: cur.y - 8,
        target: next, type: 'orb',
        speed: 700,
        dmg, splash: 0,
        magic: true, arc: false, arcT: 0, arcDur: 0,
        startX: cur.x, startY: cur.y - 8,
        targetX: next.x, targetY: next.y,
        slow: 0, slowDur: 0,
        dead: false,
        fromType: 'mage',
        _chained: true,
      };
      game.projectiles.push(np);
      cur = next;
      dmg *= 0.7;
      count--;
    }
  }
  // 저격 처형
  if (p.fromType === 'sniper' && hasBoon('sniper-execute')) {
    if (!enemy.dead && enemy.hp / enemy.maxHp <= 0.25 && !enemy.boss) {
      enemy.hp = 0;
      enemy.dead = true;
    }
  }
}

function makeArrowFollow(p, target, fromX, fromY, dmgMul) {
  return {
    x: fromX, y: fromY - 8,
    target,
    type: 'arrow', speed: 480,
    dmg: p.dmg * dmgMul, splash: 0,
    magic: false, arc: false, arcT: 0, arcDur: 0,
    startX: fromX, startY: fromY - 8,
    targetX: target.x, targetY: target.y,
    slow: 0, slowDur: 0,
    dead: false,
    fromType: 'archer',
  };
}

// 빙결 파열, 화염 잔류 등 사후 효과
function onSplashHit(p, x, y) {
  if (p.fromType === 'cannon' && hasBoon('cannon-burn')) {
    game.effects.push({ kind: 'burn', x, y, r: p.splash, t: 0, dur: 1.6, color: '#ff8844', dps: p.dmg * 0.4, lastTick: 0 });
  }
}

function onEnemyKilled(e) {
  // 처치 파편 파티클
  game.particles = game.particles || [];
  const baseColor = e.boss ? '#ff4040' : (e.air ? '#9a3a4a' : '#7a9d4a');
  const count = e.boss ? 30 : 8;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 80 + Math.random() * 160;
    game.particles.push({
      x: e.x, y: e.y - 8,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80,
      life: 0.5 + Math.random() * 0.4, maxLife: 0.9,
      size: 1.5 + Math.random() * 2,
      color: i % 3 === 0 ? '#fde68a' : baseColor,
      kind: 'shard', g: 350,
    });
  }
  if (e.boss) addCameraShake(0.4, 6);
  if (hasBoon('frost-shatter') && e.slowT > 0 && !e._shattered) {
    e._shattered = true;
    game.effects.push({ kind: 'splash', x: e.x, y: e.y, r: 60, t: 0, dur: 0.3, color: '#7dd3fc' });
    for (const o of game.enemies) {
      if (o === e || o.dead) continue;
      if (Math.hypot(o.x - e.x, o.y - e.y) < 60) {
        o.hp -= 15;
        if (o.hp <= 0) o.dead = true;
      }
    }
  }
}

function renderBoonList() {
  const list = $('boon-list');
  list.innerHTML = '';
  if (game.boons.length === 0) {
    list.innerHTML = '<p class="empty">아직 없음</p>';
    return;
  }
  for (let i = game.boons.length - 1; i >= 0; i--) {
    const b = game.boons[i];
    const el = document.createElement('div');
    el.className = `boon-item ${b.rarity}`;
    el.innerHTML = `<div class="name">${b.name}</div><div class="desc">${b.desc}</div>`;
    list.appendChild(el);
  }
}

function showBoonOverlay() {
  const overlay = $('boon-overlay');
  $('boon-wave').textContent = game.wave;
  const numChoices = (game.meta && game.meta.boonChoices) || 3;
  const choices = rollBoonChoices(numChoices);
  const wrap = $('boon-choices');
  wrap.innerHTML = '';
  for (const b of choices) {
    const el = document.createElement('div');
    el.className = `boon-choice ${b.rarity}`;
    const rarityLabel = { common: '일반', rare: '희귀', epic: '영웅', legendary: '전설' }[b.rarity] || b.rarity;
    const target = b.tower ? `${TOWERS[b.tower].name} 전용` : (b.kind === 'instant' ? '즉시 효과' : '전체');
    el.innerHTML = `
      <div class="rarity">${rarityLabel}</div>
      <div class="name">${b.name}</div>
      <div class="desc">${b.desc}</div>
      <div class="target">${target}</div>`;
    el.addEventListener('click', () => openBoonConfirm(b));
    wrap.appendChild(el);
  }
  overlay.classList.remove('hidden');
}

function openBoonConfirm(boon) {
  const card = $('boon-confirm-card');
  card.className = 'boon-confirm-card ' + boon.rarity;
  const rarityLabel = { common: '일반', rare: '희귀', epic: '영웅', legendary: '전설' }[boon.rarity] || boon.rarity;
  const target = boon.tower ? `${TOWERS[boon.tower].name} 전용` : (boon.kind === 'instant' ? '즉시 효과' : '모든 병사');
  $('bc-rarity').textContent = `◆ ${rarityLabel} 가호 ◆`;
  $('bc-rarity').style.color = {
    common: '#c8cdd9', rare: '#93d8ff', epic: '#d8b4fe', legendary: '#fde68a'
  }[boon.rarity] || '#fff';
  $('bc-name').textContent = boon.name;
  $('bc-desc').textContent = boon.desc;
  $('bc-target').textContent = target;
  $('boon-confirm').classList.add('active');
  // 핸들러 한 번 등록
  const yesBtn = $('boon-confirm-yes');
  const noBtn = $('boon-confirm-no');
  const close = () => $('boon-confirm').classList.remove('active');
  const onYes = () => {
    close();
    triggerBoonFlash(boon.rarity);
    addBoon(boon);
    $('boon-overlay').classList.add('hidden');
    yesBtn.removeEventListener('click', onYes);
    noBtn.removeEventListener('click', onNo);
  };
  const onNo = () => {
    close();
    yesBtn.removeEventListener('click', onYes);
    noBtn.removeEventListener('click', onNo);
  };
  yesBtn.addEventListener('click', onYes);
  noBtn.addEventListener('click', onNo);
}

function triggerBoonFlash(rarity) {
  const flash = $('boon-flash');
  flash.className = '';
  // 강제 reflow로 애니메이션 재시작
  void flash.offsetWidth;
  flash.classList.add(rarity, 'active');
  setTimeout(() => flash.classList.remove('active', rarity), 1100);
  // 카메라 흔들림 (등급별 강도)
  const shakeMag = { common: 0, rare: 4, epic: 8, legendary: 14 }[rarity] || 0;
  if (shakeMag > 0) addCameraShake(0.5, shakeMag);
}

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
  return { essence: 0, upgrades: {}, stats: { totalRuns: 0, bestWave: 0, totalKills: 0 } };
}

function saveMeta() {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch (e) {}
}

function getUpgradeLevel(heroId, upId) {
  return (meta.upgrades[heroId] && meta.upgrades[heroId][upId]) || 0;
}

function buyUpgrade(heroId, upId) {
  const hero = HEROES[heroId];
  const up = hero.upgrades.find(u => u.id === upId);
  if (!up) return false;
  const cur = getUpgradeLevel(heroId, upId);
  if (cur >= up.max) return false;
  const cost = up.cost[cur];
  if (meta.essence < cost) return false;
  meta.essence -= cost;
  if (!meta.upgrades[heroId]) meta.upgrades[heroId] = {};
  meta.upgrades[heroId][upId] = cur + 1;
  saveMeta();
  return true;
}

// 영웅별 메타 강화 합산 효과 (런 시작 시 적용)
function metaBonus(heroId) {
  const u = meta.upgrades[heroId] || {};
  const hero = HEROES[heroId];
  const acc = {
    archerDmgMul: 1, archerFireMul: 1, sniperDmgMul: 1, sniperFireMul: 1,
    mageDmgMul: 1, frostDmgMul: 1,
    mercDmgMul: 1, mercFireMul: 1,
    allTowerDmgMul: 1,
    rangeMul: 1,
    startGold: 0, startHp: 0, killGold: 0, costMul: 1, waveBonus: 0,
    boonChoices: 3,
    freeTowers: [], // {type, level}
  };
  for (const up of hero.upgrades) {
    const lvl = u[up.id] || 0;
    if (!lvl) continue;
    const v = lvl * up.per;
    switch (up.id) {
      case 'a-precision': acc.archerDmgMul *= 1 + v; acc.sniperDmgMul *= 1 + v; break;
      case 'a-quick':     acc.archerFireMul *= 1 - v; acc.sniperFireMul *= 1 - v; break;
      case 'a-eyes':
      case 'm-sight':     acc.rangeMul *= 1 + v; break;
      case 'a-bonus':     acc.freeTowers.push({ type: 'archer', level: 2 }); break;
      case 'm-power':     acc.mageDmgMul *= 1 + v; acc.frostDmgMul *= 1 + v; break;
      case 'm-mark':      acc.boonChoices = 4; break;
      case 'm-bonus':     acc.freeTowers.push({ type: 'mage', level: 2 }); break;
      // 용병 (레이나)
      case 'mer-purse':   acc.startHp += v; break;          // 시작 라이프 +
      case 'mer-trade':   acc.mercDmgMul *= 1 + v; break;   // 용병 데미지 +
      case 'mer-discount':acc.mercFireMul *= 1 - v; break;  // 용병 공속 -
      case 'mer-tribute': acc.allTowerDmgMul *= 1 + v; break; // 모든 타워 데미지 +
    }
  }
  return acc;
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
  const stats = meta.stats || { totalRuns: 0, bestWave: 0, totalKills: 0 };
  $('menu-stats').innerHTML = `
    <div class="stat"><span class="k">최고 웨이브</span><span class="v">${stats.bestWave}</span></div>
    <div class="stat"><span class="k">총 출진</span><span class="v">${stats.totalRuns}</span></div>
    <div class="stat"><span class="k">총 처치</span><span class="v">${stats.totalKills}</span></div>`;

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
    portrait.style.background = `linear-gradient(135deg, ${hero.accent}44, ${hero.color}22)`;
    const pctx = portrait.getContext('2d');
    pctx.imageSmoothingEnabled = false;
    drawHeroPortrait(pctx, hero.id, 0, 0, 1);
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
  // 새 구조에서는 hero-summary로 대체
  renderHeroSummary();
}

function renderHeroSummary() {
  const summary = $('hero-summary');
  const hero = HEROES[game.selectedHeroId];
  if (!hero) {
    summary.classList.add('hidden');
    return;
  }
  summary.classList.remove('hidden');
  $('hs-name').textContent = hero.name;
  $('hs-flavor').textContent = hero.flavor;

  // 큰 일러스트
  const portrait = $('hs-portrait');
  const img = HERO_IMG[hero.id];
  if (img && img.complete && img.naturalWidth > 0) {
    portrait.src = img.src;
    portrait.classList.remove('hidden');
  } else {
    portrait.classList.add('hidden');
  }

  // 패시브
  const passive = $('hs-passive');
  passive.innerHTML = '';
  for (const p of hero.passives) {
    const li = document.createElement('li');
    li.textContent = p;
    passive.appendChild(li);
  }

  // 이어하기 / 저장된 런 표시
  const saved = loadRun();
  const resumeBtn = $('resume-run');
  const startBtn = $('start-run');
  const runInfo = $('run-info');
  if (saved && saved.heroId === hero.id) {
    resumeBtn.classList.remove('hidden');
    runInfo.classList.remove('hidden');
    runInfo.innerHTML = `진행 중인 게임 — 웨이브 <b>${saved.wave}</b> · 생명 <b>${saved.hp}</b> · 골드 <b>${saved.gold}</b> · 타워 <b>${saved.towers.length}</b>개 · 가호 <b>${saved.boons.length}</b>개`;
    startBtn.textContent = '⚔ 새 게임 시작 (저장 폐기) ⚔';
  } else if (saved) {
    resumeBtn.classList.add('hidden');
    runInfo.classList.remove('hidden');
    const sh = HEROES[saved.heroId];
    runInfo.innerHTML = `다른 영웅(<b>${sh ? sh.name : saved.heroId}</b>)의 진행 중 게임이 있습니다. 그 영웅을 선택하면 이어할 수 있습니다.`;
    startBtn.textContent = '⚔ 게임 시작 ⚔';
  } else {
    resumeBtn.classList.add('hidden');
    runInfo.classList.add('hidden');
    startBtn.textContent = '⚔ 게임 시작 ⚔';
  }
}

// ============================================================
// 영원의 샘 화면 (메타 강화 트리)
// ============================================================
function openFountain() {
  if (!game.fountainHeroId) game.fountainHeroId = game.selectedHeroId;
  renderFountain();
  showScreen('fountain');
}

function renderFountain() {
  $('fountain-essence').textContent = meta.essence;
  // 영웅 탭
  const tabs = $('fountain-hero-tabs');
  tabs.innerHTML = '';
  for (const hero of Object.values(HEROES)) {
    const tab = document.createElement('div');
    tab.className = 'fountain-tab';
    if (game.fountainHeroId === hero.id) tab.classList.add('active');
    const img = HERO_IMG[hero.id];
    if (img && img.complete) {
      const ic = document.createElement('img');
      ic.src = img.src;
      tab.appendChild(ic);
    }
    const name = document.createElement('span');
    name.textContent = hero.name;
    tab.appendChild(name);
    tab.addEventListener('click', () => {
      game.fountainHeroId = hero.id;
      renderFountain();
    });
    tabs.appendChild(tab);
  }
  // 영웅 배너
  const hero = HEROES[game.fountainHeroId];
  $('fh-name').textContent = hero.name;
  $('fh-flavor').textContent = hero.flavor;
  const banner = $('fh-portrait');
  const heroImg = HERO_IMG[hero.id];
  if (heroImg && heroImg.complete) {
    banner.src = heroImg.src;
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
  // 강화 트리
  const wrap = $('fh-upgrades');
  wrap.innerHTML = '';
  for (const up of hero.upgrades) {
    const lvl = getUpgradeLevel(hero.id, up.id);
    const maxed = lvl >= up.max;
    const cost = maxed ? null : up.cost[lvl];
    const card = document.createElement('div');
    card.className = 'upgrade-card';
    let pips = '';
    for (let i = 0; i < up.max; i++) {
      pips += `<div class="pip ${i < lvl ? 'filled' : ''}"></div>`;
    }
    const can = !maxed && meta.essence >= cost;
    card.innerHTML = `
      <div class="name">${up.name}</div>
      <div class="desc">${up.desc}</div>
      <div class="pips">${pips}</div>
      <div class="row">
        ${maxed
          ? '<span class="maxed">최대</span><span></span>'
          : `<span class="cost ${can ? '' : 'unaffordable'}">◆ ${cost}</span>
             <button data-up="${up.id}" ${can ? '' : 'disabled'}>강화</button>`}
      </div>`;
    wrap.appendChild(card);
  }
  wrap.querySelectorAll('button[data-up]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (buyUpgrade(hero.id, btn.dataset.up)) {
        renderFountain();
      }
    });
  });
}

// ============================================================
// 프롤로그 화면 (영웅 사진 + 스토리 스크롤)
// ============================================================
function showPrologue() {
  const hero = HEROES[game.selectedHeroId];
  if (!hero) { _startRun(); return; }
  $('prologue-title').textContent = hero.name;

  const portrait = $('prologue-portrait');
  const img = HERO_IMG[hero.id];
  if (img && img.complete) {
    portrait.src = img.src;
    portrait.style.display = '';
  } else {
    portrait.style.display = 'none';
  }

  const story = $('prologue-story');
  story.innerHTML = '';
  story.classList.remove('scrolling');
  const lines = hero.prologue || [];
  for (const line of lines) {
    const p = document.createElement('p');
    if (line.startsWith('"') || line === '') {
      if (line === '') p.style.height = '0.6em';
      else { p.textContent = line; p.classList.add('highlight'); }
    } else {
      p.textContent = line;
    }
    story.appendChild(p);
  }

  // 스크롤 시간: 라인 수에 비례
  const dur = Math.max(14, lines.length * 1.8);
  story.style.setProperty('--scroll-duration', dur + 's');
  // 강제 reflow 후 애니메이션 시작
  void story.offsetHeight;
  story.classList.add('scrolling');

  showScreen('prologue');
}

// ============================================================
// 화면 전환
// ============================================================
function showScreen(name) {
  $('main-menu').classList.toggle('hidden', name !== 'menu');
  $('game-screen').classList.toggle('hidden', name !== 'game');
  $('fountain-screen').classList.toggle('hidden', name !== 'fountain');
  $('prologue-screen').classList.toggle('hidden', name !== 'prologue');
}

function startRun() {
  try {
    return _startRun();
  } catch (err) {
    console.error('startRun failed:', err);
    alert('게임 시작 중 오류가 발생했습니다.\n\n' + (err && err.message || err) + '\n\n메뉴의 "전체 초기화" 버튼을 눌러 데이터를 리셋해보세요.');
    game.state = 'menu';
    showScreen('menu');
  }
}

function _startRun() {
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
  game.heroEntity = null;
  game.particles = [];
  game.damageNums = [];
  game.shakeT = 0;
  game.shakeMag = 0;
  game.goldRainT = 0;

  const hbCanvas = $('hb-portrait');
  const hbCtx = hbCanvas.getContext('2d');
  hbCtx.imageSmoothingEnabled = false;
  hbCtx.clearRect(0, 0, 48, 48);
  drawHeroPortrait(hbCtx, game.hero.id, -8, -8, 48 / 64);
  $('hb-name').textContent = game.hero.name;

  // 영웅 패시브 적용 (Step 3 기본 형태)
  applyHeroPassives();

  showScreen('game');
  renderTowerShop();
  renderTowerInfo();
  renderBoonList();
  $('boon-overlay').classList.add('hidden');
  $('result-screen').classList.add('hidden');
  saveRun();
  updateHud();
  // 첫 프레임 즉시 그리기 (게임 루프가 돌기 전이라도 캔버스가 비지 않도록)
  try { render(); } catch (e) { console.error('Initial render failed:', e); }
  console.log('[startRun] state=', game.state, 'hero=', game.hero && game.hero.id, 'heroEntity=', !!game.heroEntity, 'towers=', game.towers.length);
}

function applyHeroPassives() {
  // 영웅 기본 패시브
  if (game.hero.id === 'merchant') game.hp += 5; // 용병: 시작 라이프 +5
  // 메타 강화
  game.meta = metaBonus(game.hero.id);
  game.gold += game.meta.startGold;
  game.hp += game.meta.startHp;
  // 영웅 본체 자동 배치 (먼저)
  placeHero();
  // 시작 무료 타워 (영웅 강화로 부여)
  for (const ft of game.meta.freeTowers) {
    placeStarterTower(ft.type, ft.level);
  }
  updateSkillUI();
}

function placeStarterTower(type, level) {
  // 좌상단부터 빈칸 찾아 자동 배치
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (isTileBlocked(x, y) || tileHasTower(x, y)) continue;
      // 경로 가까운 칸 우선이 좋지만 단순화
      const tw = makeTower(type, x, y);
      tw.level = level;
      tw.totalSpent = TOWERS[type].cost;
      game.towers.push(tw);
      return;
    }
  }
}

function quitToMenu() {
  game.state = 'menu';
  showScreen('menu');
  renderMainMenu();
}

// 전체 초기화: 정수 + 강화 + 진행 중 저장 + Service Worker 캐시까지
function hardResetAll() {
  if (!confirm('모든 데이터를 초기화합니다.\n\n· 정수 0\n· 영웅 강화 모두 해제\n· 진행 중 저장 삭제\n· 캐시 정리\n\n진행하시겠습니까?')) return;
  // beforeunload에서 saveRun 막기
  game._resetting = true;
  game.state = 'menu';
  const beforeKeys = Object.keys(localStorage);
  console.log('[hardReset] before clear, keys:', beforeKeys, 'count=', beforeKeys.length);
  try {
    meta.essence = 0;
    meta.upgrades = {};
    meta.stats = { totalRuns: 0, bestWave: 0, totalKills: 0 };
    try { localStorage.clear(); } catch (_) {}
    try { sessionStorage.clear(); } catch (_) {}
  } catch (e) { console.warn(e); }
  const afterKeys = Object.keys(localStorage);
  console.log('[hardReset] after clear, keys:', afterKeys, 'count=', afterKeys.length);
  // Service Worker 캐시 비우기 + 등록 해제
  try {
    if ('caches' in window) {
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
    }
  } catch (e) { console.warn(e); }
  alert(
    `초기화 결과:\n\n` +
    `· 삭제 전 키 수: ${beforeKeys.length}\n` +
    `· 삭제 후 키 수: ${afterKeys.length}\n` +
    (afterKeys.length > 0 ? `\n남은 키: ${afterKeys.join(', ')}\n` : '') +
    `\n새로고침 후 빈 메뉴가 떠야 합니다.`
  );
  setTimeout(() => location.reload(), 300);
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
  $('speed-btn').textContent = `×${game.speed}`;
  updateCancelButton();
}

function updateCancelButton() {
  const btn = $('cancel-btn');
  if (!btn) return;
  const show = !!(game.placingTowerType || game.selectedTower);
  btn.classList.toggle('hidden', !show);
  if (game.placingTowerType) {
    const def = TOWERS[game.placingTowerType];
    btn.textContent = `${def.name} 소환 중 — 빈칸 탭 / 취소`;
  } else if (game.selectedTower) {
    btn.textContent = '선택 해제';
  }
}

// ============================================================
// 렌더링 (Step 1: 그리드 + 경로만)
// ============================================================
function render() {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // 화면 흔들림
  ctx.save();
  if (game.shakeT > 0 && game.shakeMag > 0) {
    const k = game.shakeT;
    const sx = (Math.random() - 0.5) * game.shakeMag * Math.min(1, k);
    const sy = (Math.random() - 0.5) * game.shakeMag * Math.min(1, k);
    ctx.translate(sx, sy);
  }

  // 배경
  ctx.fillStyle = '#2a8a3a';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // 잔디 타일 (Kenney) — 캐싱된 이미지로 채움. 없으면 단색 fallback
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!kdraw(24, x * TILE, y * TILE, TILE)) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#2f9a44' : '#2a8a3a';
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
  }
  // 디테일 (꽃/덤불) — 일시 비활성. 타워 가시성 우선 확보 후 다시 켤 예정
  // const decorIds = [130, 132];
  // for (let y = 0; y < ROWS; y++) { ... }

  // 경로 그리기 (모래/흙길 — Kenney 잔디 타일에 어울리는 톤)
  ctx.strokeStyle = '#7a5a32';
  ctx.lineWidth = 40;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(PATH[0].x, PATH[0].y);
  for (let i = 1; i < PATH.length; i++) ctx.lineTo(PATH[i].x, PATH[i].y);
  ctx.stroke();

  // 경로 안쪽 밝은 모래 (Kenney sand 색감과 매치)
  ctx.strokeStyle = '#c89b5a';
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

  // 시작/종료 (그래픽)
  drawCaveEntrance(PATH[0].x, PATH[0].y);
  drawCastleGate(PATH[PATH.length - 1].x, PATH[PATH.length - 1].y);

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

  // 적 그리기 (경로의 t값 기준)
  const tNow = performance.now();
  for (const e of game.enemies) {
    drawEnemyWithBar(ctx, e, tNow);
  }

  // 타워 그리기
  for (const tw of game.towers) {
    drawTowerWithRange(ctx, tw, tw === game.selectedTower);
  }
  // 영웅 그리기
  drawHeroEntity();

  // 발사체 그리기
  for (const p of game.projectiles) drawProjectile(ctx, p);

  // 이펙트
  for (const fx of game.effects) drawEffect(ctx, fx);

  // 파티클
  if (game.particles) {
    for (const pa of game.particles) {
      const a = Math.max(0, pa.life / pa.maxLife);
      ctx.globalAlpha = a;
      if (pa.kind === 'star') {
        ctx.fillStyle = pa.color;
        drawStar(ctx, pa.x, pa.y, pa.size, 4);
      } else if (pa.kind === 'coin') {
        ctx.fillStyle = pa.color;
        ctx.beginPath();
        ctx.ellipse(pa.x, pa.y, pa.size, pa.size * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = pa.color;
        ctx.fillRect(pa.x - pa.size / 2, pa.y - pa.size / 2, pa.size, pa.size);
      }
      ctx.globalAlpha = 1;
    }
  }

  // 데미지 숫자
  if (game.damageNums) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px sans-serif';
    for (const dn of game.damageNums) {
      const a = Math.max(0, dn.life / dn.maxLife);
      ctx.globalAlpha = a;
      ctx.font = `bold ${dn.size}px sans-serif`;
      // 외곽선
      ctx.strokeStyle = '#1a1018';
      ctx.lineWidth = 3;
      ctx.strokeText(`${dn.value}`, dn.x, dn.y);
      ctx.fillStyle = dn.color;
      ctx.fillText(`${dn.value}`, dn.x, dn.y);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'start';
  }

  // 골드 비 인디케이터
  if (game.goldRainT > 0) {
    ctx.fillStyle = `rgba(243,216,120,${0.15 * (game.goldRainT / 5)})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  // 배치 미리보기 (선택한 타워를 호버 타일에 표시)
  if (game.placingTowerType) {
    // 영웅 차단 영역 항상 표시 (배치 불가 영역)
    if (game.heroEntity) {
      const he = game.heroEntity;
      ctx.fillStyle = 'rgba(255, 80, 80, 0.18)';
      ctx.strokeStyle = 'rgba(255, 80, 80, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      [0, -1].forEach(dy => {
        const tx = he.tileX, ty = he.tileY + dy;
        if (ty < 0) return;
        ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
        ctx.strokeRect(tx * TILE + 1, ty * TILE + 1, TILE - 2, TILE - 2);
      });
      ctx.setLineDash([]);
    }
    if (game.hoveredTile) {
      const { x, y } = game.hoveredTile;
      const blocked = isTileBlocked(x, y) || tileHasTower(x, y);
      const cx = x * TILE + TILE / 2;
      const cy = y * TILE + TILE;
      const def = TOWERS[game.placingTowerType];
      // 사거리 원
      ctx.strokeStyle = blocked ? 'rgba(255,80,80,0.6)' : 'rgba(243,216,120,0.6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy - TILE / 2, def.range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // 미리보기 캐릭터 (반투명)
      ctx.globalAlpha = blocked ? 0.4 : 0.7;
      drawTower(ctx, game.placingTowerType, cx, cy, 1);
      ctx.globalAlpha = 1;
    }
  }

  ctx.restore();
}

// 시작점: 동굴 입구 (상단, 아래로 향함)
function drawCaveEntrance(x, y) {
  const cx = x;
  const cy = Math.max(0, y);
  // 바위 더미
  ctx.fillStyle = '#3a3a4a';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 6, 32, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5a5a6a';
  ctx.beginPath();
  ctx.arc(cx - 20, cy - 8, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 20, cy - 6, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy - 16, 10, 0, Math.PI * 2);
  ctx.fill();
  // 동굴 입구 (검은 아치, 아래로 향함)
  ctx.fillStyle = '#0a0a14';
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy - 10);
  ctx.quadraticCurveTo(cx, cy - 24, cx + 14, cy - 10);
  ctx.lineTo(cx + 14, cy + 18);
  ctx.lineTo(cx - 14, cy + 18);
  ctx.closePath();
  ctx.fill();
  // 동굴 안의 빨간 빛
  ctx.fillStyle = 'rgba(255,80,40,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 2, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // 두 개의 작은 눈
  ctx.fillStyle = '#ff4040';
  ctx.fillRect(cx - 5, cy - 6, 2, 2);
  ctx.fillRect(cx + 3, cy - 6, 2, 2);
  // 바위 디테일
  ctx.fillStyle = '#7a7a8a';
  ctx.fillRect(cx - 28, cy - 14, 3, 2);
  ctx.fillRect(cx + 24, cy - 16, 3, 2);
}

// 끝점: 성 (하단, 정면)
function drawCastleGate(x, y) {
  const cx = x;
  const cy = Math.min(CANVAS_H, y);
  // 성 베이스 (회색 돌)
  ctx.fillStyle = '#6a6a7a';
  ctx.fillRect(cx - 30, cy - 36, 60, 40);
  // 흙 그림자
  ctx.fillStyle = '#2a2a3a';
  ctx.fillRect(cx - 30, cy + 4, 60, 4);
  // 돌 텍스처 라인
  ctx.fillStyle = '#5a5a6a';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(cx - 30, cy - 32 + i * 12, 60, 1);
  }
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(cx - 22 + i * 14, cy - 36, 1, 12);
  }
  // 성벽 위 톱니
  ctx.fillStyle = '#6a6a7a';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(cx - 30 + i * 14, cy - 42, 8, 8);
  }
  // 좌우 탑
  ctx.fillStyle = '#5a5a7a';
  ctx.fillRect(cx - 38, cy - 44, 12, 48);
  ctx.fillRect(cx + 26, cy - 44, 12, 48);
  // 탑 지붕 (삼각형)
  ctx.fillStyle = '#7d3f3f';
  ctx.beginPath();
  ctx.moveTo(cx - 38, cy - 44);
  ctx.lineTo(cx - 32, cy - 58);
  ctx.lineTo(cx - 26, cy - 44);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 26, cy - 44);
  ctx.lineTo(cx + 32, cy - 58);
  ctx.lineTo(cx + 38, cy - 44);
  ctx.closePath();
  ctx.fill();
  // 탑 창문
  ctx.fillStyle = '#fde68a';
  ctx.fillRect(cx - 35, cy - 30, 4, 6);
  ctx.fillRect(cx + 31, cy - 30, 4, 6);
  ctx.fillRect(cx - 35, cy - 16, 4, 6);
  ctx.fillRect(cx + 31, cy - 16, 4, 6);
  // 깃발 (좌)
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 32, cy - 58);
  ctx.lineTo(cx - 32, cy - 68);
  ctx.stroke();
  ctx.fillStyle = '#f3d878';
  ctx.beginPath();
  ctx.moveTo(cx - 32, cy - 68);
  ctx.lineTo(cx - 22, cy - 64);
  ctx.lineTo(cx - 32, cy - 60);
  ctx.closePath();
  ctx.fill();
  // 깃발 (우)
  ctx.strokeStyle = '#3a2a1a';
  ctx.beginPath();
  ctx.moveTo(cx + 32, cy - 58);
  ctx.lineTo(cx + 32, cy - 68);
  ctx.stroke();
  ctx.fillStyle = '#f3d878';
  ctx.beginPath();
  ctx.moveTo(cx + 32, cy - 68);
  ctx.lineTo(cx + 42, cy - 64);
  ctx.lineTo(cx + 32, cy - 60);
  ctx.closePath();
  ctx.fill();
  // 정문 (어두운 아치, 위로 향함)
  ctx.fillStyle = '#1a1018';
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy + 4);
  ctx.lineTo(cx - 12, cy - 14);
  ctx.quadraticCurveTo(cx, cy - 26, cx + 12, cy - 14);
  ctx.lineTo(cx + 12, cy + 4);
  ctx.closePath();
  ctx.fill();
  // 정문 격자
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 1;
  for (let i = -10; i <= 10; i += 4) {
    ctx.beginPath();
    ctx.moveTo(cx + i, cy - 12);
    ctx.lineTo(cx + i, cy + 2);
    ctx.stroke();
  }
  for (let i = -10; i <= 2; i += 4) {
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + i);
    ctx.lineTo(cx + 10, cy + i);
    ctx.stroke();
  }
  // 잔디/땅 패치
  ctx.fillStyle = '#3a4a2a';
  ctx.fillRect(cx - 38, cy + 4, 76, 4);
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
  // 스폰 큐
  tickSpawn(dt);

  // 적 업데이트
  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const e = game.enemies[i];
    updateEnemy(e, dt);
    if (e.dead) {
      onEnemyKilled(e);
      game.kills += 1;
      let drop = e.goldDrop;
      if (game.meta) drop += game.meta.killGold;
      if (hasBoon('bountiful')) drop += 2;
      if (game.goldRainT > 0) drop *= 2;
      game.gold += drop;
      game.enemies.splice(i, 1);
      game._dirtyShop = true;
    } else if (e.reachedEnd) {
      game.hp -= e.dmgToBase;
      game.enemies.splice(i, 1);
    }
  }

  // 타워 업데이트 (적 탐색 + 발사)
  for (const tw of game.towers) updateTower(tw, dt);
  updateHero(dt);
  if (game.goldRainT > 0) game.goldRainT -= dt;

  // 발사체 업데이트
  for (let i = game.projectiles.length - 1; i >= 0; i--) {
    const p = game.projectiles[i];
    updateProjectile(p, dt);
    if (p.dead) game.projectiles.splice(i, 1);
  }

  // 이펙트
  for (let i = game.effects.length - 1; i >= 0; i--) {
    const fx = game.effects[i];
    fx.t += dt;
    if (fx.kind === 'burn') {
      fx.lastTick = (fx.lastTick || 0) + dt;
      if (fx.lastTick >= 0.2) {
        fx.lastTick = 0;
        for (const e of game.enemies) {
          if (e.dead) continue;
          if (Math.hypot(e.x - fx.x, e.y - fx.y) <= fx.r) {
            e.hp -= fx.dps * 0.2;
            if (e.hp <= 0) e.dead = true;
          }
        }
      }
    }
    if (fx.t >= fx.dur) game.effects.splice(i, 1);
  }

  // 파티클
  game.particles = game.particles || [];
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const pa = game.particles[i];
    pa.life -= dt;
    pa.x += pa.vx * dt;
    pa.y += pa.vy * dt;
    if (pa.g) pa.vy += pa.g * dt;
    if (pa.life <= 0) game.particles.splice(i, 1);
  }

  // 데미지 숫자
  game.damageNums = game.damageNums || [];
  for (let i = game.damageNums.length - 1; i >= 0; i--) {
    const dn = game.damageNums[i];
    dn.life -= dt;
    dn.y -= 30 * dt;
    if (dn.life <= 0) game.damageNums.splice(i, 1);
  }

  // 화면 흔들림 감쇠
  if (game.shakeT > 0) {
    game.shakeT -= dt;
    if (game.shakeT <= 0) game.shakeMag = 0;
  }

  // 라이프 0 → 패배 (결과 화면 연결)
  if (game.hp <= 0 && game.state === 'playing') {
    game.hp = 0;
    game.state = 'gameover';
    showResult(false);
  }

  // 웨이브 종료 체크
  if (game.waveActive && game.spawnQueue && game.spawnQueue.length === 0 && game.enemies.length === 0) {
    onWaveEnd();
  }

  if (game._dirtyShop) {
    renderTowerShop();
    if (game.selectedTower) renderTowerInfo();
    game._dirtyShop = false;
  }
  updateSkillUI();
  updateHud();
}

// ============================================================
// 타워 인스턴스 / 로직
// ============================================================
function makeTower(type, tileX, tileY) {
  const def = TOWERS[type];
  return {
    type,
    tileX, tileY,
    cx: tileX * TILE + TILE / 2,
    cy: tileY * TILE + TILE / 2,
    level: 1,
    cooldown: 0,
    totalSpent: def.cost,
  };
}

function getTowerStat(tw) {
  const def = TOWERS[tw.type];
  const m = TOWER_LEVEL_MULT[tw.level];
  const stat = {
    range: def.range * m.range,
    dmg: def.dmg * m.dmg,
    fireRate: def.fireRate * m.fireRate,
    splash: def.splash,
  };
  // 영웅 패시브
  if (game.hero) {
    if (game.hero.id === 'archer' && tw.type === 'archer') stat.dmg *= 1.10;
    if (game.hero.id === 'mage' && tw.type === 'mage') stat.dmg *= 1.10;
  }
  // 메타 강화
  if (game.meta) {
    if (tw.type === 'archer') { stat.dmg *= game.meta.archerDmgMul; stat.fireRate *= game.meta.archerFireMul; }
    if (tw.type === 'sniper') { stat.dmg *= game.meta.sniperDmgMul; stat.fireRate *= game.meta.sniperFireMul; }
    if (tw.type === 'mage')   stat.dmg *= game.meta.mageDmgMul;
    if (tw.type === 'frost')  stat.dmg *= game.meta.frostDmgMul;
    stat.dmg *= (game.meta.allTowerDmgMul || 1);
    stat.range *= game.meta.rangeMul;
  }
  return applyBoonStats(tw, def, stat);
}

function tileHasTower(tx, ty) {
  if (game.heroEntity) {
    const he = game.heroEntity;
    // 영웅 자리 본인 + 위쪽 1칸 (큰 sprite가 가리지 않도록)
    if (he.tileX === tx && he.tileY === ty) return true;
    if (he.tileX === tx && he.tileY - 1 === ty) return true;
  }
  return game.towers.some(t => t.tileX === tx && t.tileY === ty);
}

function updateTower(tw, dt) {
  const def = TOWERS[tw.type];
  const stat = getTowerStat(tw);
  tw.cooldown -= dt;
  if (tw.cooldown > 0) return;

  const canHitAir = def.air || (tw.type === 'cannon' && hasBoon('cannon-air'));

  // 타겟 탐색: 가장 앞선 (path 진행도 높은) 적 우선
  let best = null;
  let bestT = -1;
  for (const e of game.enemies) {
    if (e.dead) continue;
    if (e.air && !canHitAir) continue;
    const dx = e.x - tw.cx;
    const dy = e.y - tw.cy;
    if (dx * dx + dy * dy > stat.range * stat.range) continue;
    if (e.pathT > bestT) {
      bestT = e.pathT;
      best = e;
    }
  }
  if (!best) return;

  // 발사
  fireProjectile(tw, best);
  tw.cooldown = stat.fireRate;
}

function fireProjectile(tw, target) {
  const def = TOWERS[tw.type];
  const stat = getTowerStat(tw);
  const baseList = [{}];
  onProjectileSpawn(tw, target, baseList);
  for (let i = 0; i < baseList.length; i++) {
    const offY = i * 8 - (baseList.length - 1) * 4; // 다중 발사 시 오프셋
    let slow = def.projectile.slow || 0;
    let slowDur = def.projectile.slowDur || 0;
    if (tw.type === 'frost' && hasBoon('frost-perma')) { slow = 1.0; slowDur = 4; }
    const p = {
      x: tw.cx,
      y: tw.cy - 16 + offY,
      target,
      type: def.projectile.type,
      speed: def.projectile.speed,
      dmg: stat.dmg,
      splash: stat.splash,
      magic: !!def.projectile.magic,
      arc: !!def.projectile.arc,
      arcT: 0,
      arcDur: 0.5,
      startX: tw.cx,
      startY: tw.cy - 16 + offY,
      targetX: target.x,
      targetY: target.y,
      slow, slowDur,
      dead: false,
      fromType: tw.type,
    };
    game.projectiles.push(p);
  }
}

function updateProjectile(p, dt) {
  if (p.type === 'arrow-rain') {
    // 위에서 ty 위치까지 빠르게 떨어짐
    const dy = p.targetY - p.y;
    if (dy < 6) {
      hitProjectile(p, p.x, p.targetY);
      return;
    }
    p.y += p.speed * dt;
    return;
  }
  if (p.arc) {
    // 포물선: 시작에서 타겟 위치까지 보간 + 위로 호
    p.arcT += dt;
    const t = Math.min(1, p.arcT / p.arcDur);
    if (p.target && !p.target.dead) {
      p.targetX = p.target.x;
      p.targetY = p.target.y;
    }
    p.x = p.startX + (p.targetX - p.startX) * t;
    const yLin = p.startY + (p.targetY - p.startY) * t;
    p.y = yLin - 50 * Math.sin(t * Math.PI);
    if (t >= 1) {
      hitProjectile(p, p.targetX, p.targetY);
    }
  } else {
    // 직선 호밍
    if (!p.target || p.target.dead) {
      // 타겟 사망 시 마지막 위치까지 이동 후 소멸
      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 6) { p.dead = true; return; }
      p.x += (dx / d) * p.speed * dt;
      p.y += (dy / d) * p.speed * dt;
      return;
    }
    p.targetX = p.target.x;
    p.targetY = p.target.y;
    const dx = p.targetX - p.x;
    const dy = p.targetY - p.y;
    const d = Math.hypot(dx, dy);
    if (d < 8) {
      hitProjectile(p, p.target.x, p.target.y);
      return;
    }
    p.x += (dx / d) * p.speed * dt;
    p.y += (dy / d) * p.speed * dt;
  }
}

function hitProjectile(p, hitX, hitY) {
  if (p.dead) return;
  p.dead = true;
  if (p.splash > 0) {
    // 광역
    for (const e of game.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - hitX, e.y - hitY);
      if (d <= p.splash) {
        applyHit(e, p);
      }
    }
    // 폭발 이펙트
    game.effects.push({ kind: 'splash', x: hitX, y: hitY, r: p.splash, t: 0, dur: 0.35, color: p.type === 'frost' ? '#7dd3fc' : '#ffaa44' });
    // 폭발 파티클
    game.particles = game.particles || [];
    const isFrost = p.type === 'frost';
    for (let i = 0; i < (p.type === 'arrow-rain' ? 4 : 14); i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 80 + Math.random() * 220;
      game.particles.push({
        x: hitX, y: hitY,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.4 + Math.random() * 0.4, maxLife: 0.8,
        size: 2 + Math.random() * 3,
        color: isFrost ? '#7dd3fc' : (i % 2 ? '#fde68a' : '#ff8844'),
        kind: 'shard', g: 250,
      });
    }
    if (p.type !== 'arrow-rain') addCameraShake(0.18, 4);
    onSplashHit(p, hitX, hitY);
  } else {
    // 단일 (target 우선, 없으면 가까운 적)
    if (p.target && !p.target.dead) {
      applyHit(p.target, p);
      onAfterHit(p, p.target);
    }
  }
}

function applyHit(enemy, p) {
  const def = ENEMIES[enemy.type];
  let dmg = p.dmg;
  // 실드: 마법 외 50% 감소
  if (def.armor && !p.magic) {
    dmg *= (1 - def.armor);
  }
  // 마법 표식: +30% 받는 데미지
  if ((enemy.markedT ?? 0) > 0) dmg *= 1.3;
  enemy.hp -= dmg;
  if (enemy.hp <= 0) enemy.dead = true;
  // 데미지 숫자
  game.damageNums = game.damageNums || [];
  game.damageNums.push({
    x: enemy.x + (Math.random() - 0.5) * 12,
    y: enemy.y - 20,
    value: Math.round(dmg),
    life: 0.7, maxLife: 0.7,
    color: p.magic ? '#c084fc' : (dmg >= 50 ? '#fde68a' : '#fff'),
    size: dmg >= 50 ? 16 : 12,
    crit: dmg >= 50,
  });
  // 적 피격 흔들림 표시
  enemy.hitT = 0.1;
  // 슬로우 적용
  if (p.slow > 0 && p.slowDur > 0) {
    enemy.slowMul = Math.min(enemy.slowMul ?? 1, 1 - p.slow);
    enemy.slowT = Math.max(enemy.slowT ?? 0, p.slowDur);
  }
  // 작은 피격 이펙트
  game.effects.push({ kind: 'hit', x: enemy.x, y: enemy.y - 16, t: 0, dur: 0.18, color: p.magic ? '#c084fc' : '#ffe89a' });
}

// ============================================================
// 적 인스턴스 / 로직
// ============================================================
function makeEnemy(type, hpMul = 1) {
  const def = ENEMIES[type];
  const hp = Math.round(def.hp * hpMul);
  return {
    type,
    hp,
    maxHp: hp,
    speed: def.speed,
    air: def.air,
    pathSeg: 0,
    pathT: 0, // 전체 경로 진행도 0~PATH.length-1
    x: PATH[0].x,
    y: PATH[0].y,
    slowMul: 1,
    slowT: 0,
    dead: false,
    reachedEnd: false,
    goldDrop: def.gold,
    dmgToBase: def.boss ? 5 : 1,
    boss: !!def.boss,
  };
}

function updateEnemy(e, dt) {
  if (e.slowT > 0) {
    e.slowT -= dt;
    if (e.slowT <= 0) { e.slowMul = 1; }
  }
  if (e.markedT > 0) e.markedT -= dt;
  if (e.hitT > 0) e.hitT -= dt;
  const speed = e.speed * (e.slowMul ?? 1);
  let remain = speed * dt;
  while (remain > 0 && e.pathSeg < PATH.length - 1) {
    const a = PATH[e.pathSeg];
    const b = PATH[e.pathSeg + 1];
    const dx = b.x - e.x;
    const dy = b.y - e.y;
    const d = Math.hypot(dx, dy);
    if (d <= remain) {
      e.x = b.x;
      e.y = b.y;
      e.pathSeg += 1;
      e.pathT = e.pathSeg;
      remain -= d;
    } else {
      e.x += (dx / d) * remain;
      e.y += (dy / d) * remain;
      // pathT는 세그먼트 진행도 추가
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      const traveled = Math.hypot(e.x - a.x, e.y - a.y);
      e.pathT = e.pathSeg + (segLen > 0 ? traveled / segLen : 0);
      remain = 0;
    }
  }
  if (e.pathSeg >= PATH.length - 1) {
    e.reachedEnd = true;
  }
}

// ============================================================
// 그리기: 타워(사거리), 적(HP바), 발사체, 이펙트
// ============================================================
function drawTowerWithRange(ctx, tw, showRange) {
  const stat = getTowerStat(tw);
  if (showRange) {
    ctx.strokeStyle = 'rgba(243,216,120,0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(tw.cx, tw.cy, stat.range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  drawTower(ctx, tw.type, tw.cx, tw.cy + TILE / 2, tw.level);
}

function drawEnemyWithBar(ctx, e, t) {
  const footY = e.y + (e.air ? 0 : 10);
  // 피격 깜빡임
  if (e.hitT > 0) {
    ctx.save();
    ctx.translate(e.x + (Math.random() - 0.5) * 2, e.y + (Math.random() - 0.5) * 2);
    ctx.translate(-e.x, -e.y);
    drawEnemy(ctx, e.type, e.x, footY, e.hp / e.maxHp, t);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = e.hitT * 5;
    drawEnemy(ctx, e.type, e.x, footY, e.hp / e.maxHp, t);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  } else {
    drawEnemy(ctx, e.type, e.x, footY, e.hp / e.maxHp, t);
  }
  // HP 바
  if (e.hp < e.maxHp) {
    const w = e.boss ? 36 : 22;
    const h = 3;
    const bx = e.x - w / 2;
    const by = e.y - (e.boss ? 56 : 36);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx - 1, by - 1, w + 2, h + 2);
    ctx.fillStyle = '#5a1a1a';
    ctx.fillRect(bx, by, w, h);
    ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#7ed957' : (e.hp / e.maxHp > 0.25 ? '#fbbf24' : '#ff5050');
    ctx.fillRect(bx, by, w * (e.hp / e.maxHp), h);
  }
  // 슬로우 표시
  if (e.slowT > 0) {
    ctx.fillStyle = 'rgba(125,211,252,0.3)';
    ctx.beginPath();
    ctx.arc(e.x, e.y, 14, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawProjectile(ctx, p) {
  if (p.type === 'arrow') {
    // 진행 방향
    const dx = (p.target ? p.target.x : p.targetX) - p.x;
    const dy = (p.target ? p.target.y : p.targetY) - p.y;
    const a = Math.atan2(dy, dx);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(a);
    ctx.fillStyle = '#8a6a3a';
    ctx.fillRect(-10, -1, 14, 2);
    ctx.fillStyle = '#7ed957';
    ctx.fillRect(-12, -2, 3, 4);
    ctx.fillStyle = '#aaaaaa';
    ctx.fillRect(4, -1, 2, 2);
    ctx.restore();
  } else if (p.type === 'shell') {
    pxCircle(ctx, p.x, p.y, 4, '#3a3a3a');
    pxCircle(ctx, p.x - 1, p.y - 1, 1.5, '#7a7a7a');
  } else if (p.type === 'orb') {
    ctx.fillStyle = 'rgba(192,132,252,0.5)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.fill();
    pxCircle(ctx, p.x, p.y, 4, '#c084fc');
    pxCircle(ctx, p.x - 1, p.y - 1, 1.5, '#fff');
  } else if (p.type === 'frost') {
    ctx.fillStyle = 'rgba(125,211,252,0.5)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e0f2ff';
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(performance.now() * 0.01);
    ctx.fillRect(-4, -1, 8, 2);
    ctx.fillRect(-1, -4, 2, 8);
    ctx.restore();
  } else if (p.type === 'bullet') {
    const dx = (p.target ? p.target.x : p.targetX) - p.x;
    const dy = (p.target ? p.target.y : p.targetY) - p.y;
    const a = Math.atan2(dy, dx);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(a);
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(-6, -1, 8, 2);
    ctx.fillStyle = 'rgba(253,230,138,0.4)';
    ctx.fillRect(-14, -1, 8, 2);
    ctx.restore();
  } else if (p.type === 'arrow-rain') {
    // 수직으로 떨어지는 빛나는 화살
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(p.x - 1, p.y - 14, 2, 14);
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(p.x - 1, p.y - 6, 2, 8);
    ctx.fillStyle = '#7ed957';
    ctx.fillRect(p.x - 2, p.y - 14, 4, 3);
  } else if (p.type === 'coin') {
    // 동전: 회전하는 원
    const r = 5 + Math.sin(performance.now() * 0.02) * 1;
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c8881b';
    ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
  }
}

function drawEffect(ctx, fx) {
  const k = fx.t / fx.dur;
  if (fx.kind === 'place-ring') {
    // 타워 배치 직후 — 노란 링 확장 + 빛
    const r = 8 + 28 * k;
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(253, 230, 138, ${(1 - k) * 0.25})`;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  if (fx.kind === 'splash') {
    ctx.strokeStyle = fx.color;
    ctx.globalAlpha = 1 - k;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, fx.r * k, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (fx.kind === 'hit') {
    ctx.fillStyle = fx.color;
    ctx.globalAlpha = 1 - k;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, 5 + k * 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (fx.kind === 'slash' || fx.kind === 'slash-big') {
    // 호 형태의 슬래시 — 빠르게 그어지고 페이드
    const big = fx.kind === 'slash-big';
    const rNow = fx.r * Math.min(1, k * 1.4);
    ctx.save();
    ctx.translate(fx.x, fx.y);
    ctx.rotate(-Math.PI / 2 + (k - 0.5) * Math.PI * (big ? 1.4 : 1.0));
    ctx.strokeStyle = `rgba(255,232,154,${1 - k})`;
    ctx.lineWidth = big ? 6 : 3;
    ctx.beginPath();
    ctx.arc(0, 0, rNow * 0.85, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();
    if (big) {
      ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * 0.7})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, rNow * 0.7, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();
    }
    ctx.restore();
    // 광역 원
    ctx.strokeStyle = `rgba(255,232,154,${(1 - k) * 0.3})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, rNow, 0, Math.PI * 2);
    ctx.stroke();
  } else if (fx.kind === 'fireburst') {
    // 거대한 화염 폭발 + 빛 줄기
    const rNow = fx.r * Math.min(1, k * 1.4);
    ctx.fillStyle = `rgba(255,68,0,${0.55 * (1 - k)})`;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, rNow, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(253,230,138,${0.7 * (1 - k)})`;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, rNow * 0.55, 0, Math.PI * 2);
    ctx.fill();
    // 흩날리는 불꽃
    const rays = 10;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2 + fx.t * 6;
      ctx.strokeStyle = `rgba(255,140,40,${1 - k})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(fx.x, fx.y);
      ctx.lineTo(fx.x + Math.cos(a) * rNow * 1.15, fx.y + Math.sin(a) * rNow * 1.15);
      ctx.stroke();
    }
  } else if (fx.kind === 'starburst') {
    // 보라색 거대 폭발 + 빛 줄기
    const rNow = fx.r * Math.min(1, k * 1.4);
    ctx.fillStyle = `rgba(192,132,252,${0.5 * (1 - k)})`;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, rNow, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${1 - k})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, rNow * 0.85, 0, Math.PI * 2);
    ctx.stroke();
    // 빛줄기
    const rays = 8;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2 + fx.t * 4;
      ctx.strokeStyle = `rgba(243,216,120,${0.8 * (1 - k)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fx.x, fx.y);
      ctx.lineTo(fx.x + Math.cos(a) * rNow * 1.2, fx.y + Math.sin(a) * rNow * 1.2);
      ctx.stroke();
    }
  } else if (fx.kind === 'burn') {
    ctx.fillStyle = `rgba(255,120,60,${0.25 * (1 - k)})`;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, fx.r, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + fx.t * 6;
      const fx2 = fx.x + Math.cos(a) * fx.r * 0.6;
      const fy2 = fx.y + Math.sin(a) * fx.r * 0.6;
      ctx.fillStyle = i % 2 ? '#ff8844' : '#fde68a';
      ctx.beginPath();
      ctx.arc(fx2, fy2 - Math.abs(Math.sin(fx.t * 8 + i)) * 4, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ============================================================
// 타워 상점 UI / 배치 / 정보 패널
// ============================================================
function renderTowerShop() {
  const shop = $('tower-shop');
  shop.innerHTML = '';
  for (const id of TOWER_ORDER) {
    const def = TOWERS[id];
    const cost = effectiveTowerCost(id);
    const card = document.createElement('div');
    card.className = 'tower-card';
    if (cost > game.gold) card.classList.add('unaffordable');
    if (game.placingTowerType === id) card.classList.add('selected');

    const icon = document.createElement('canvas');
    icon.className = 'icon';
    icon.width = 40;
    icon.height = 40;
    const ictx = icon.getContext('2d');
    ictx.imageSmoothingEnabled = false;
    drawTower(ictx, id, 20, 38, 1);

    const info = document.createElement('div');
    info.className = 'info';
    info.innerHTML = `<div class="name">${def.name}</div><div class="desc">${def.desc}</div>`;

    const cost_el = document.createElement('div');
    cost_el.className = 'cost';
    cost_el.textContent = `${cost}G`;

    card.append(icon, info, cost_el);
    card.addEventListener('click', () => {
      if (effectiveTowerCost(id) > game.gold) return;
      game.placingTowerType = (game.placingTowerType === id) ? null : id;
      game.selectedTower = null;
      renderTowerShop();
      updateCancelButton();
      // 모바일: 타워 선택 후 사이드바 자동 닫기
      $('sidebar').classList.remove('open');
    });
    shop.appendChild(card);
  }
}

function effectiveTowerCost(id) {
  let cost = effectiveTowerCostBoon(id);
  // 영웅 패시브: 시작 비용 -20% (해당 타워)
  if (game.hero) {
    if (game.hero.id === 'archer' && id === 'archer') cost = Math.round(cost * 0.8);
    if (game.hero.id === 'mage' && id === 'mage') cost = Math.round(cost * 0.8);
  }
  // 메타: 비용 할인
  if (game.meta) cost = Math.round(cost * game.meta.costMul);
  return cost;
}

function placeTowerAt(tx, ty) {
  if (!game.placingTowerType) return false;
  if (isTileBlocked(tx, ty) || tileHasTower(tx, ty)) return false;
  const cost = effectiveTowerCost(game.placingTowerType);
  if (game.gold < cost) return false;
  game.gold -= cost;
  const tw = makeTower(game.placingTowerType, tx, ty);
  game.towers.push(tw);
  // 방금 배치 — 취소 시 5초 안에 환불 가능
  game.lastPlaced = { tw, cost, placedAt: performance.now() };
  // 배치 시각 피드백 — 빛나는 링
  game.effects.push({
    kind: 'place-ring',
    x: tx * TILE + TILE / 2,
    y: ty * TILE + TILE / 2,
    r: 6, t: 0, dur: 0.5,
  });
  renderTowerShop();
  updateHud();
  return true;
}

function selectTowerAt(tx, ty) {
  const tw = game.towers.find(t => t.tileX === tx && t.tileY === ty);
  game.selectedTower = tw || null;
  renderTowerInfo();
}

function renderTowerInfo() {
  const panel = $('tower-info');
  const tw = game.selectedTower;
  if (!tw) {
    panel.classList.add('hidden');
    return;
  }
  panel.classList.remove('hidden');
  const rect = canvas.getBoundingClientRect();
  const px = (tw.cx / CANVAS_W) * rect.width + rect.left + 10;
  const py = (tw.cy / CANVAS_H) * rect.height + rect.top + 10;
  panel.style.left = Math.min(window.innerWidth - 240, px) + 'px';
  panel.style.top = Math.min(window.innerHeight - 160, py) + 'px';

  const def = TOWERS[tw.type];
  const stat = getTowerStat(tw);
  $('ti-name').textContent = `${def.name} (LV ${tw.level})`;
  $('ti-stats').innerHTML =
    `데미지: ${stat.dmg.toFixed(0)}<br>사거리: ${stat.range.toFixed(0)}<br>주기: ${stat.fireRate.toFixed(2)}s` +
    (stat.splash ? `<br>광역: ${stat.splash}` : '') +
    (def.air ? '<br>지상+공중' : '<br>지상만');

  const upBtn = $('ti-upgrade');
  const sellBtn = $('ti-sell');
  if (tw.level < 3) {
    const cost = def.upgradeCost[tw.level - 1];
    upBtn.textContent = `업그레이드 ${cost}G`;
    upBtn.disabled = game.gold < cost;
    upBtn.onclick = () => {
      if (game.gold < cost) return;
      game.gold -= cost;
      tw.level += 1;
      tw.totalSpent += cost;
      renderTowerInfo();
      updateHud();
    };
  } else {
    upBtn.textContent = '최대 레벨';
    upBtn.disabled = true;
    upBtn.onclick = null;
  }
  const refund = Math.floor(tw.totalSpent * 0.7);
  sellBtn.textContent = `판매 +${refund}G`;
  sellBtn.onclick = () => {
    game.gold += refund;
    game.towers = game.towers.filter(t => t !== tw);
    game.selectedTower = null;
    renderTowerInfo();
    updateHud();
  };
}

// ============================================================
// 웨이브 시스템 (Step 4 기본 형태, Step 4에서 확장)
// ============================================================
function generateWave(n) {
  // 간단한 구성: 웨이브 번호에 따라 적 종류 증가
  const groups = [];
  if (n % 5 === 0) {
    // 보스 웨이브
    groups.push({ type: 'giant', count: 1, interval: 0, hpMul: 1 + (n / 10) });
    groups.push({ type: 'goblin', count: 6, interval: 0.7, hpMul: 1 });
  } else {
    groups.push({ type: 'goblin', count: 4 + n, interval: 0.7, hpMul: 1 + n * 0.06 });
    if (n >= 2) groups.push({ type: 'orc', count: 2 + Math.floor(n / 2), interval: 1.0, hpMul: 1 + n * 0.05 });
    if (n >= 3) groups.push({ type: 'rogue', count: 3 + Math.floor(n / 3), interval: 0.5, hpMul: 1 + n * 0.05 });
    if (n >= 4) groups.push({ type: 'drone', count: 2 + Math.floor(n / 3), interval: 0.8, hpMul: 1 + n * 0.05 });
    if (n >= 6) groups.push({ type: 'shield', count: 2 + Math.floor((n - 5) / 2), interval: 0.9, hpMul: 1 + n * 0.05 });
  }
  return groups;
}

function startWave() {
  if (game.waveActive) return;
  if (game.wave >= game.waveMax) return;
  game.wave += 1;
  game.waveActive = true;
  const groups = generateWave(game.wave);
  // spawn 큐 만들기: [{type, hpMul, time}] 이벤트 리스트
  game.spawnQueue = [];
  let t = 0;
  for (const g of groups) {
    for (let i = 0; i < g.count; i++) {
      game.spawnQueue.push({ time: t, type: g.type, hpMul: g.hpMul });
      t += g.interval;
    }
    t += 0.6; // 그룹 간 간격
  }
  game.spawnT = 0;
  updateHud();
}

function tickSpawn(dt) {
  if (!game.waveActive || !game.spawnQueue) return;
  game.spawnT += dt;
  while (game.spawnQueue.length > 0 && game.spawnQueue[0].time <= game.spawnT) {
    const ev = game.spawnQueue.shift();
    game.enemies.push(makeEnemy(ev.type, ev.hpMul));
  }
}

function onWaveEnd() {
  game.waveActive = false;
  game.spawnQueue = null;
  // 웨이브 보너스 골드
  let bonus = 20 + game.wave * 2;
  if (hasBoon('wave-tribute')) bonus += 25;
  if (game.meta) bonus += game.meta.waveBonus;
  game.gold += bonus;
  updateHud();
  // 마지막 웨이브?
  if (game.wave >= game.waveMax) {
    game.state = 'victory';
    showResult(true);
    return;
  }
  // 자동 저장 (웨이브 사이)
  saveRun();
  renderTowerShop();
  // 가호 선택 표시
  showBoonOverlay();
}

// ============================================================
// 결과 화면 + 정수 지급
// ============================================================
function showResult(victory) {
  // 정수 계산
  let gain = 0;
  if (victory) {
    gain = 25 + Math.floor(game.kills / 20);
  } else {
    gain = Math.max(1, Math.floor(game.wave * 1.5));
  }
  // 보스 클리어 보너스
  gain += Math.floor((game.wave - 1) / 5) * 3;
  meta.essence += gain;
  // 통계 업데이트
  meta.stats = meta.stats || { totalRuns: 0, bestWave: 0, totalKills: 0 };
  meta.stats.totalRuns += 1;
  meta.stats.totalKills += game.kills;
  if (game.wave > meta.stats.bestWave) meta.stats.bestWave = game.wave;
  saveMeta();
  clearSavedRun();
  $('result-title').textContent = victory ? '승리!' : '패배';
  $('result-text').textContent = victory
    ? `${game.hero.name}, 던전을 정복했습니다.`
    : `${game.hero.name}이(가) 쓰러졌습니다. 정수를 모아 다시 도전하세요.`;
  $('rs-wave').textContent = game.wave;
  $('rs-kills').textContent = game.kills;
  $('rs-essence').textContent = '◆ +' + gain;
  $('result-screen').classList.remove('hidden');
}

// ============================================================
// 진행 중 자동 저장 / 이어하기 (Step 6.5)
// ============================================================
const RUN_KEY = 'boon-defense-run-v1';

function saveRun() {
  if (game.state !== 'playing') return;
  const data = {
    heroId: game.hero.id,
    hp: game.hp,
    gold: game.gold,
    wave: game.wave,
    kills: game.kills,
    boons: game.boons.map(b => b.id),
    towers: game.towers.map(t => ({ type: t.type, tx: t.tileX, ty: t.tileY, level: t.level, totalSpent: t.totalSpent })),
  };
  try { localStorage.setItem(RUN_KEY, JSON.stringify(data)); } catch (e) {}
}

function loadRun() {
  try {
    const raw = localStorage.getItem(RUN_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // 검증: hero ID가 알려진 영웅이고, 필수 필드가 있어야 함
    if (!data || !data.heroId || !HEROES[data.heroId]) {
      localStorage.removeItem(RUN_KEY);
      return null;
    }
    if (typeof data.hp !== 'number' || typeof data.gold !== 'number' || !Array.isArray(data.towers) || !Array.isArray(data.boons)) {
      localStorage.removeItem(RUN_KEY);
      return null;
    }
    return data;
  } catch (e) {
    try { localStorage.removeItem(RUN_KEY); } catch (_) {}
    return null;
  }
}

function clearSavedRun() {
  try { localStorage.removeItem(RUN_KEY); } catch (e) {}
}

function resumeRun(data) {
  game.hero = HEROES[data.heroId];
  game.state = 'playing';
  game.hp = data.hp;
  game.gold = data.gold;
  game.wave = data.wave;
  game.kills = data.kills;
  game.towers = data.towers.map(t => {
    const tw = makeTower(t.type, t.tx, t.ty);
    tw.level = t.level;
    tw.totalSpent = t.totalSpent;
    return tw;
  });
  game.enemies = [];
  game.projectiles = [];
  game.effects = [];
  game.boons = data.boons.map(id => BOONS.find(b => b.id === id)).filter(Boolean);
  game.waveActive = false;
  game.spawnQueue = null;
  game.placingTowerType = null;
  game.selectedTower = null;
  game.meta = metaBonus(game.hero.id);
  game.particles = [];
  game.damageNums = [];
  game.shakeT = 0;
  game.shakeMag = 0;
  game.goldRainT = 0;
  placeHero();
  updateSkillUI();

  const hbCanvas = $('hb-portrait');
  const hbCtx = hbCanvas.getContext('2d');
  hbCtx.imageSmoothingEnabled = false;
  hbCtx.clearRect(0, 0, 48, 48);
  drawHeroPortrait(hbCtx, game.hero.id, -8, -8, 48 / 64);
  $('hb-name').textContent = game.hero.name;

  showScreen('game');
  renderTowerShop();
  renderTowerInfo();
  renderBoonList();
  $('boon-overlay').classList.add('hidden');
  $('result-screen').classList.add('hidden');
  updateHud();
}

// ============================================================
// 입력
// ============================================================
function setupInput() {
  function canvasCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (CANVAS_W / rect.width),
      y: (clientY - rect.top) * (CANVAS_H / rect.height),
    };
  }

  function tileFromClient(clientX, clientY) {
    const { x, y } = canvasCoords(clientX, clientY);
    return { x: Math.floor(x / TILE), y: Math.floor(y / TILE) };
  }

  canvas.addEventListener('mousemove', (e) => {
    game.hoveredTile = tileFromClient(e.clientX, e.clientY);
  });
  canvas.addEventListener('mouseleave', () => {
    game.hoveredTile = null;
  });

  canvas.addEventListener('click', (e) => {
    const t = tileFromClient(e.clientX, e.clientY);
    if (game.placingTowerType) {
      placeTowerAt(t.x, t.y);
    } else {
      selectTowerAt(t.x, t.y);
    }
  });

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    cancelSelection();
  });

  // 터치: tap = 배치/선택, 두 손가락 = 취소
  let touchStartTile = null;
  let touchStartTime = 0;
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length >= 2) {
      cancelSelection();
      touchStartTile = null;
      return;
    }
    const t = e.touches[0];
    touchStartTile = tileFromClient(t.clientX, t.clientY);
    touchStartTime = performance.now();
    game.hoveredTile = touchStartTile;
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 0) return;
    const t = e.touches[0];
    game.hoveredTile = tileFromClient(t.clientX, t.clientY);
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (!touchStartTile) return;
    const dur = performance.now() - touchStartTime;
    // 짧은 탭만 동작 (드래그/길게 누름 무시)
    if (dur < 700) {
      const tile = game.hoveredTile || touchStartTile;
      if (game.placingTowerType) {
        placeTowerAt(tile.x, tile.y);
      } else {
        selectTowerAt(tile.x, tile.y);
      }
    }
    touchStartTile = null;
  }, { passive: false });

  function cancelSelection() {
    // 방금 배치한 타워가 있으면 5초 이내에 한해 환불
    if (game.lastPlaced) {
      const elapsed = (performance.now() - game.lastPlaced.placedAt) / 1000;
      if (elapsed < 5) {
        const lp = game.lastPlaced;
        game.towers = game.towers.filter(t => t !== lp.tw);
        game.gold += lp.cost;
        updateHud();
        renderTowerShop();
      }
      game.lastPlaced = null;
    }
    game.placingTowerType = null;
    game.selectedTower = null;
    renderTowerShop();
    renderTowerInfo();
    updateCancelButton();
  }
  game._cancelSelection = cancelSelection;

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
    if (!confirm('메뉴로 돌아가시겠습니까? 진행 중이라면 자동 저장되어 다시 이어할 수 있습니다.')) return;
    if (game.state === 'playing' && !game.waveActive) {
      saveRun();
    } else if (game.state === 'playing' && game.waveActive) {
      // 웨이브 도중 포기 — 정수만 일부 지급 후 저장 폐기
      showResult(false);
      return;
    }
    quitToMenu();
  });
  $('sidebar-close').addEventListener('click', () => {
    $('sidebar').classList.remove('open');
  });
  $('sidebar-toggle').addEventListener('click', () => {
    $('sidebar').classList.toggle('open');
  });
  $('skill-btn').addEventListener('click', () => {
    castHeroSkill();
  });
  $('cancel-btn').addEventListener('click', () => {
    if (game._cancelSelection) game._cancelSelection();
    $('sidebar').classList.remove('open');
  });

  $('start-run').addEventListener('click', () => {
    const saved = loadRun();
    if (saved && !confirm(saved.heroId === game.selectedHeroId
        ? '진행 중인 게임이 있습니다. 새 게임으로 시작하면 저장이 사라집니다. 계속하시겠습니까?'
        : '다른 영웅의 진행 중 게임 저장이 있습니다. 새 게임을 시작하시겠습니까?')) {
      return;
    }
    clearSavedRun();
    showPrologue();
  });
  $('resume-run').addEventListener('click', () => {
    const saved = loadRun();
    if (!saved) return;
    resumeRun(saved);
  });
  // 영원의 샘
  $('open-fountain').addEventListener('click', openFountain);
  $('back-to-menu').addEventListener('click', () => {
    renderMainMenu();
    showScreen('menu');
  });
  // 프롤로그
  $('start-game').addEventListener('click', () => {
    startRun();
  });
  $('skip-prologue').addEventListener('click', () => {
    startRun();
  });
  $('boon-skip').addEventListener('click', () => {
    game.gold += 30;
    $('boon-overlay').classList.add('hidden');
    saveRun();
    updateHud();
  });
  $('result-btn').addEventListener('click', () => {
    $('result-screen').classList.add('hidden');
    quitToMenu();
  });
  $('hard-reset-btn').addEventListener('click', hardResetAll);
}

function onStartWave() {
  if (game.waveActive || game.state !== 'playing') return;
  startWave();
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
  // 초기 캔버스 1회 렌더
  ctx.fillStyle = '#1a1d28';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // 창 닫기/새로고침 시에도 저장 (웨이브 도중이 아닐 때, 그리고 리셋 중이 아닐 때만)
  window.addEventListener('beforeunload', () => {
    if (game._resetting) return;
    if (game.state === 'playing' && !game.waveActive) {
      saveRun();
    }
  });

  // PWA: Service Worker 등록
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
}

boot();
