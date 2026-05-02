// ============================================================
// 이그니아의 화염 — 로그라이크 턴제 RPG
// ============================================================

const $ = id => document.getElementById(id);

// ===== 영웅 데이터 =====
const HEROES = [
  {
    id: 'ignia',
    name: '이그니아',
    title: '화염의 대마법사',
    flavor: '검은 머리 위로 불꽃을 다스리는 매혹의 화염 대마법사. 그녀의 손끝에서 세상이 타오른다.',
    locked: false,
    baseHp: 100, baseAtk: 18, baseMag: 28,
    skill: { name: '화염구', quote: '타올라라 — 이 세계마저!', cooldown: 3, burnDmg: 6, burnTurns: 3 },
    portrait: '../assets/heroes/mage.png',
    sprite: '../assets/heroes/mage.png',
    defaultSkill: 'fireball',
  },
  {
    id: 'luna', name: '루나', title: '달빛 궁수',
    flavor: '달빛에 화살을 실어 보내는 침묵의 사냥꾼.',
    locked: true,
    baseHp: 90, baseAtk: 22, baseMag: 14,
    portrait: '../assets/heroes/archer.png',
    sprite: '../assets/heroes/archer.png',
  },
  {
    id: 'reyna', name: '레이나', title: '대검 용병',
    flavor: '대검 한 자루로 전장을 가르는 용병.',
    locked: true,
    baseHp: 130, baseAtk: 26, baseMag: 8,
    portrait: '../assets/heroes/merchant.png',
    sprite: '../assets/heroes/merchant.png',
  },
];

// 현재 선택된 영웅 (전투/세이브 등에서 사용)
let HERO = HEROES[0];

const SKILL_QUOTES = [
  '타올라라 — 이 세계마저!',
  '잿더미가 되어라.',
  '이 불꽃이 너의 마지막을 비추리라.',
];

// ===== 적 데이터 =====
const ENEMIES = {
  goblin:   { name: '고블린',   hp: 30,  atk: 7,  emoji: '👺', tier: 1 },
  orc:      { name: '오크',     hp: 60,  atk: 11, emoji: '👹', tier: 2 },
  rogue:    { name: '도적',     hp: 45,  atk: 14, emoji: '🥷', tier: 2, dodge: 0.2 },
  shield:   { name: '방패병',   hp: 70,  atk: 9,  emoji: '🛡️', tier: 2, defReduce: 0.4 },
  drone:    { name: '드론',     hp: 50,  atk: 12, emoji: '🦟', tier: 3 },
  knight:   { name: '흑기사',   hp: 110, atk: 16, emoji: '⚔️', tier: 3 },
  // 보스
  giant:    { name: '폐허의 거인', hp: 280, atk: 22, emoji: '🗿', boss: true },
  lich:     { name: '리치왕',     hp: 240, atk: 26, emoji: '💀', boss: true },
  dragon:   { name: '심연의 드래곤', hp: 380, atk: 30, emoji: '🐉', boss: true },
};

// ===== 스킬 카탈로그 =====
// hits: 타격 횟수, mul: 1타당 mag 배율, burnDmg/burnTurns: 화상, critBonus: 추가 치명타 확률
const SKILLS = {
  fireball: {
    id: 'fireball', name: '화염구', icon: '🔥',
    cooldown: 3,
    hits: 1, mul: 1.0,
    burnDmg: 6, burnTurns: 3,
    critBonus: 0,
    desc: '단일 강타 + 화상 3턴',
    quote: '타올라라 — 이 세계마저!',
    cutin: '../assets/heroes/mage.png',
  },
  flamethrower: {
    id: 'flamethrower', name: '화염방사', icon: '🜂',
    cooldown: 4,
    hits: 5, mul: 0.45,
    burnDmg: 8, burnTurns: 4,
    critBonus: 0,
    desc: '5회 연속 화염 + 강한 화상',
    quote: '재가 될 때까지 — 끝나지 않아!',
    cutin: '../assets/skills/ignia-flamethrower.png',
  },
  firestorm: {
    id: 'firestorm', name: '화염 폭풍', icon: '🌪',
    cooldown: 4,
    hits: 3, mul: 0.7,
    burnDmg: 5, burnTurns: 2,
    critBonus: 0.1,
    desc: '3회 연타 + 가벼운 화상',
    quote: '폭풍이여, 휘몰아쳐라!',
    cutin: '../assets/skills/ignia-fireball.png',
  },
  meteor: {
    id: 'meteor', name: '메테오', icon: '☄',
    cooldown: 6,
    hits: 1, mul: 2.4,
    burnDmg: 0, burnTurns: 0,
    critBonus: 0.3,
    desc: '한 방 초강타, 높은 치명타',
    quote: '하늘이 무너지리라 — 메테오!',
    cutin: '../assets/skills/ignia-fireball.png',
  },
  inferno: {
    id: 'inferno', name: '지옥불', icon: '👹',
    cooldown: 5,
    hits: 1, mul: 1.1,
    burnDmg: 14, burnTurns: 5,
    critBonus: 0,
    desc: '맹렬한 화상 5턴',
    quote: '지옥의 불꽃을 받아라!',
    cutin: '../assets/skills/ignia-fireball.png',
  },
  firedom: {
    id: 'firedom', name: '불의 지배', icon: '👁',
    cooldown: 7,
    hits: 0, mul: 0,                  // 즉시 데미지 없음
    burnDmg: 0, burnTurns: 0,
    critBonus: 0,
    delay: 2,                         // 2턴 후 폭발
    delayMul: 3.4,                    // 폭발 시 mag × 3.4
    desc: '2턴 후 강력한 화염 폭발',
    quote: '내 손짓 한 번에 — 모든 것이 잿더미.',
    cutin: '../assets/skills/ignia-flame-finger.png',
  },
};

// ===== 가호 카테고리 =====
const CATEGORIES = {
  attack: { name: '공격', icon: '⚔', color: '#ff7a4a', desc: '근접 공격력 / 치명타 / 추가 공격' },
  magic:  { name: '마법', icon: '🔥', color: '#dc6aff', desc: '마법력 / 화염구 강화 / 화상' },
  defend: { name: '방어', icon: '🛡', color: '#6ea3e0', desc: '체력 / 방어 / 반사' },
  utility:{ name: '유틸', icon: '✦', color: '#fde68a', desc: '회복 / 골드 / 쿨다운 / 부활' },
};

// ===== 가호 데이터 (cat: 카테고리) =====
const BOONS = [
  // common
  { id: 'b-vigor',     cat: 'defend',  name: '활력',     desc: '최대 HP +20',                        rarity: 'common', apply: g => { g.maxHp += 20; g.hp += 20; } },
  { id: 'b-strength',  cat: 'attack',  name: '근력',     desc: '공격력 +4',                          rarity: 'common', mod: { atk: 4 } },
  { id: 'b-magic',     cat: 'magic',   name: '마법 숙련', desc: '마법 데미지 +6',                     rarity: 'common', mod: { mag: 6 } },
  { id: 'b-heal',      cat: 'utility', name: '치유의 빛', desc: 'HP +30 즉시 회복',                   rarity: 'common', apply: g => { g.hp = Math.min(g.maxHp, g.hp + 30); } },
  { id: 'b-coin',      cat: 'utility', name: '동전 자루', desc: '골드 +30',                          rarity: 'common', apply: g => { g.gold += 30; } },

  // rare
  { id: 'b-iron',      cat: 'defend',  name: '강철 의지', desc: '최대 HP +40, HP 완전 회복',          rarity: 'rare',   apply: g => { g.maxHp += 40; g.hp = g.maxHp; } },
  { id: 'b-fury',      cat: 'attack',  name: '광기',     desc: '공격력 +8, 마법력 +8',               rarity: 'rare',   mod: { atk: 8, mag: 8 } },
  { id: 'b-crit',      cat: 'attack',  name: '치명',     desc: '치명타 확률 +25% (1.5배 데미지)',     rarity: 'rare',   mod: { critChance: 0.25 } },
  { id: 'b-thorns',    cat: 'defend',  name: '가시갑옷', desc: '피격 시 적에게 8 반사 데미지',         rarity: 'rare',   mod: { thorns: 8 } },
  { id: 'b-quick',     cat: 'utility', name: '재빠른 손', desc: '화염구 쿨다운 -1',                  rarity: 'rare',   mod: { skillCdReduce: 1 } },
  { id: 'b-flame',     cat: 'magic',   name: '불꽃 친화', desc: '마법력 +12',                         rarity: 'rare',   mod: { mag: 12 } },

  // epic
  { id: 'b-vamp',      cat: 'attack',  name: '흡혈',     desc: '공격 시 데미지의 30% HP로 회복',      rarity: 'epic',   mod: { lifesteal: 0.3 } },
  { id: 'b-flamethrower', cat: 'magic', name: '화염방사', desc: '새 스킬 「화염방사」 획득 — 5회 연속 화염',  rarity: 'epic',   mod: { grantSkill: 'flamethrower' } },
  { id: 'b-firestorm', cat: 'magic',   name: '화염 폭풍', desc: '새 스킬 「화염 폭풍」 획득 — 3회 연타',     rarity: 'epic',   mod: { grantSkill: 'firestorm' } },
  { id: 'b-inferno',   cat: 'magic',   name: '지옥불',   desc: '새 스킬 「지옥불」 획득 — 맹렬한 화상',     rarity: 'epic',   mod: { grantSkill: 'inferno' } },
  { id: 'b-burn-mark', cat: 'magic',   name: '낙인',     desc: '모든 스킬 화상 데미지 ×2, 지속 +2턴',  rarity: 'epic',   mod: { burnMul: 2, burnTurnsBonus: 2 } },
  { id: 'b-double',    cat: 'attack',  name: '쌍수',     desc: '공격이 2회 발동',                    rarity: 'epic',   mod: { atkMulti: 2 } },
  { id: 'b-shield',    cat: 'defend',  name: '불멸의 방패', desc: '방어 시 데미지 100% 차단 + HP +10', rarity: 'epic', mod: { defendPerfect: true } },
  { id: 'b-fortune',   cat: 'utility', name: '행운',     desc: '치명타 +15%, 골드 +50',                rarity: 'epic',   mod: { critChance: 0.15 }, apply: g => { g.gold += 50; } },

  // legendary
  { id: 'b-phoenix',   cat: 'defend',  name: '불사조',   desc: 'HP 0이 되면 한 번 50%로 부활',       rarity: 'legendary', mod: { phoenix: true } },
  { id: 'b-meteor',    cat: 'magic',   name: '메테오',   desc: '새 스킬 「메테오」 획득 — 초강력 단발',   rarity: 'legendary', mod: { grantSkill: 'meteor' } },
  { id: 'b-firedom',   cat: 'magic',   name: '불의 지배', desc: '새 스킬 「불의 지배」 획득 — 2턴 후 대폭발', rarity: 'legendary', mod: { grantSkill: 'firedom' } },
  { id: 'b-overpower', cat: 'attack',  name: '폭주',     desc: '공격력 ×2, 마법력 ×2',                rarity: 'legendary', mod: { atkMul: 2, magMul: 2 } },
  { id: 'b-soul',      cat: 'utility', name: '영혼 흡수', desc: '적 처치 시 최대 HP +5, HP 완전 회복', rarity: 'legendary', mod: { soulSteal: true } },
];

// ===== 상태 =====
const game = {
  // 영구
  meta: loadMeta(),
  // run
  run: null,
};

function loadMeta() {
  try {
    const raw = localStorage.getItem('ignia-meta-v1');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { essence: 0, upgrades: {} };
}

function saveMeta() {
  try { localStorage.setItem('ignia-meta-v1', JSON.stringify(game.meta)); } catch (e) {}
}

const META_UPGRADES = [
  { id: 'u-hp',   name: '튼튼한 육체', desc: '최대 HP 단계당 +20',     max: 5, costs: [3, 6, 10, 15, 22], per: 20 },
  { id: 'u-atk',  name: '날카로운 검', desc: '공격력 단계당 +3',       max: 5, costs: [3, 6, 10, 15, 22], per: 3 },
  { id: 'u-mag',  name: '강한 마력',  desc: '마법력 단계당 +4',       max: 5, costs: [3, 6, 10, 15, 22], per: 4 },
  { id: 'u-cd',   name: '빠른 시전',  desc: '화염구 시작 쿨다운 -1',  max: 1, costs: [12], per: 1 },
  { id: 'u-gold', name: '재물운',    desc: '시작 골드 +25',          max: 3, costs: [4, 8, 14], per: 25 },
];

function metaBonus() {
  const acc = { hp: 0, atk: 0, mag: 0, startCd: 0, startGold: 0 };
  for (const u of META_UPGRADES) {
    const lvl = (game.meta.upgrades[u.id] || 0);
    if (!lvl) continue;
    const v = lvl * u.per;
    if (u.id === 'u-hp')  acc.hp += v;
    if (u.id === 'u-atk') acc.atk += v;
    if (u.id === 'u-mag') acc.mag += v;
    if (u.id === 'u-cd')  acc.startCd -= v;
    if (u.id === 'u-gold') acc.startGold += v;
  }
  return acc;
}

// ============================================================
// 시작 / 종료
// ============================================================
function showScreen(name) {
  for (const id of ['title', 'menu', 'fork', 'battle', 'boon-screen', 'rest-screen', 'result', 'fountain']) {
    const el = $(id);
    if (el) el.classList.toggle('hidden', id !== name);
  }
}

// ============================================================
// 타이틀 / 영웅 선택
// ============================================================
function renderTitle() {
  $('title-essence').textContent = game.meta.essence;
}

function renderMenu() {
  // 영웅 카드 목록
  const list = $('hero-list');
  list.innerHTML = '';
  for (const h of HEROES) {
    const card = document.createElement('div');
    card.className = 'hero-card';
    if (h.locked) card.classList.add('locked');
    if (HERO.id === h.id && !h.locked) card.classList.add('selected');
    card.innerHTML = `
      <img src="${h.portrait}" alt="${h.name}">
      <div class="h-name">${h.name}</div>
      <div class="h-tag">${h.title}</div>`;
    if (!h.locked) {
      card.addEventListener('click', () => { HERO = h; renderMenu(); });
    }
    list.appendChild(card);
  }
  // 선택된 영웅 디테일
  $('sel-name').textContent = HERO.name;
  $('sel-flavor').textContent = HERO.flavor;
  const bonus = metaBonus();
  $('menu-hp').textContent = HERO.baseHp + bonus.hp;
  $('menu-atk').textContent = HERO.baseAtk + bonus.atk;
  $('menu-mag').textContent = HERO.baseMag + bonus.mag;
}

function newRun() {
  const bonus = metaBonus();
  game.run = {
    maxHp: HERO.baseHp + bonus.hp,
    hp: HERO.baseHp + bonus.hp,
    atk: HERO.baseAtk + bonus.atk,
    mag: HERO.baseMag + bonus.mag,
    gold: bonus.startGold,
    boons: [],
    floor: 1,
    roomNum: 0,
    roomsPerFloor: 7,
    pendingFork: null,
    skills: [HERO.defaultSkill || 'fireball'],
    skillCds: {},               // { skillId: turnsRemaining }
    skillStartCdReduce: bonus.startCd,
    enemiesDefeated: 0,
    bossesDefeated: 0,
    phoenixUsed: false,
    history: [],
  };
  // 첫 방은 바로 시작 (전투 또는 가벼운 시작)
  enterFirstRoom();
}

function enterFirstRoom() {
  game.run.roomNum = 1;
  game.run.history.push({ type: 'combat', kind: 'normal', icon: '⚔', name: '시작' });
  startBattle('normal', { id: 'first', type: 'combat', kind: 'normal' });
}

// ============================================================
// 분기점 노드 생성 / 표시
// ============================================================
// 가중치: 적 80% (그중 엘리트 20% = 전체 16%), 보물 10%, 샘물(휴식) 10%
const NODE_TEMPLATES = {
  combat:   { type: 'combat',   kind: 'normal',   icon: '⚔', name: '적 조우' },
  elite:    { type: 'elite',    kind: 'elite',    icon: '☠', name: '엘리트' },
  treasure: { type: 'treasure', kind: 'treasure', icon: '💰', name: '보물' },
  rest:     { type: 'rest',     kind: 'rest',     icon: '🔥', name: '샘물' },
};

function rollNodeTemplate() {
  const r = Math.random();
  if (r < 0.80) {
    // 적 — 그중 20%가 엘리트
    return Math.random() < 0.20 ? NODE_TEMPLATES.elite : NODE_TEMPLATES.combat;
  }
  if (r < 0.90) return NODE_TEMPLATES.treasure;
  return NODE_TEMPLATES.rest;
}

function generateFork() {
  // 두 갈래 — 같은 타입이어도 보상 카테고리는 다르게
  const a = rollNodeTemplate();
  const b = rollNodeTemplate();
  return [decorateNode(a), decorateNode(b, decorateNode(a).rewardCat)];
}

function decorateNode(tmpl, avoidCat) {
  // 보상 카테고리 + 등급 미리 결정 (사용자에게 보임)
  const categories = ['attack', 'magic', 'defend', 'utility'];
  const pool = avoidCat ? categories.filter(c => c !== avoidCat) : categories;
  const cat = pool[Math.floor(Math.random() * pool.length)];

  let rarityFloor = 'common';
  if (tmpl.kind === 'elite') rarityFloor = 'rare';
  if (tmpl.kind === 'treasure') rarityFloor = 'rare';
  // 후반 등급 상승
  const f = game.run.floor;
  if (f >= 2 && Math.random() < 0.35) rarityFloor = bumpRarity(rarityFloor);
  if (f >= 3 && Math.random() < 0.35) rarityFloor = bumpRarity(rarityFloor);
  return {
    ...tmpl,
    rewardCat: cat,
    rewardRarity: rarityFloor,
  };
}

function bumpRarity(r) {
  return r === 'common' ? 'rare' : r === 'rare' ? 'epic' : r === 'epic' ? 'legendary' : 'legendary';
}

function nextStep() {
  const r = game.run;
  // 직전 노드가 보스였으면 → 다음 층
  if (r.currentNode && r.currentNode.kind === 'boss') {
    r.floor++;
    if (r.floor > 3) { endRun(true); return; }
    r.roomNum = 1;
    // 다음 층 시작 표시
    r.history.push({ type: 'floor', kind: 'floor', icon: '🏛', name: '층 ' + r.floor });
    r.history.push({ type: 'combat', kind: 'normal', icon: '⚔', name: '시작' });
    startBattle('normal', { id: 'first', type: 'combat', kind: 'normal' });
    return;
  }
  r.roomNum++;
  // 마지막 방 → 보스
  if (r.roomNum > r.roomsPerFloor) {
    r.history.push({ type: 'boss', kind: 'boss', icon: '👑', name: '보스' });
    startBattle('boss', { id: 'boss', type: 'combat', kind: 'boss', rewardCat: 'utility', rewardRarity: 'legendary' });
    return;
  }
  // 분기점 두 갈래
  r.pendingFork = generateFork();
  renderFork();
  showScreen('fork');
}

function renderFork() {
  const wrap = $('fork-options');
  wrap.innerHTML = '';
  for (const node of game.run.pendingFork) {
    const card = document.createElement('div');
    // 등급도 숨김 — 카테고리 색상/이름만 노출
    card.className = `path-card mystery`;
    const cat = CATEGORIES[node.rewardCat];
    card.style.setProperty('--cat-color', cat.color);
    card.innerHTML = `
      <div class="path-mystery">?</div>
      <div class="path-cat-name">${cat.icon} ${cat.name}</div>
      <div class="path-hint">길이 끝에 무엇이 기다릴지 모른다</div>`;
    card.addEventListener('click', () => chooseFork(node));
    wrap.appendChild(card);
  }
}

function chooseFork(node) {
  game.run.pendingFork = null;
  // 진행 기록
  game.run.history = game.run.history || [];
  game.run.history.push({ type: node.type, kind: node.kind, icon: node.icon, name: node.name, rewardCat: node.rewardCat, rewardRarity: node.rewardRarity });
  if (node.type === 'combat') startBattle('normal', node);
  else if (node.type === 'elite') startBattle('elite', node);
  else if (node.type === 'boon') openBoonScreen('신비한 사당', node.rewardCat, node.rewardRarity);
  else if (node.type === 'rest') openRest(node);
  else if (node.type === 'treasure') openTreasure(node);
}

function openTreasure(node) {
  const gold = 30 + Math.floor(Math.random() * 30) + game.run.floor * 10;
  game.run.gold += gold;
  // 가호 보상
  setTimeout(() => openBoonScreen(`보물! +${gold} 골드`, node.rewardCat, node.rewardRarity), 200);
}

// ============================================================
// 전투
// ============================================================
function startBattle(kind, node) {
  const f = game.run.floor;
  let ePool;
  if (kind === 'normal') ePool = ['goblin', 'orc', 'rogue', 'shield', 'drone'];
  else if (kind === 'elite') ePool = ['knight', 'shield', 'drone'];
  else if (kind === 'boss') ePool = [['giant', 'lich', 'dragon'][f - 1] || 'dragon'];
  const eid = ePool[Math.floor(Math.random() * ePool.length)];
  const def = ENEMIES[eid];
  game.run.currentNode = node || { kind, rewardCat: null, rewardRarity: null };
  // 층/엘리트 스케일링
  const scale = 1 + (f - 1) * 0.4 + (kind === 'elite' ? 0.4 : 0);
  game.run.battle = {
    enemy: {
      id: eid,
      name: def.name,
      maxHp: Math.round(def.hp * scale),
      hp: Math.round(def.hp * scale),
      atk: Math.round(def.atk * scale),
      def: def,
      kind,
      burns: 0,
      burnDmg: 0,
    },
    turn: 1,
    heroDefend: 0,
    heroBurn: 0,
    log: [],
    over: false,
  };
  $('enemy-name').textContent = def.name + (kind === 'elite' ? ' (엘리트)' : kind === 'boss' ? ' (보스)' : '');
  $('enemy-art').textContent = def.emoji;
  if (def.boss) $('enemy-art').style.fontSize = '90px';
  else $('enemy-art').style.fontSize = '70px';
  $('hero-img').src = HERO.sprite;
  refreshBattleUI();
  $('battle-log').innerHTML = '';
  log(`${def.name} 출현!`, 'system');
  showScreen('battle');
}

function refreshBattleUI() {
  const r = game.run;
  const b = r.battle;
  $('hero-hp').textContent = r.hp;
  $('hero-max-hp').textContent = r.maxHp;
  $('enemy-hp').textContent = b.enemy.hp;
  $('enemy-max-hp').textContent = b.enemy.maxHp;
  $('hero-hp-fill').style.width = (r.hp / r.maxHp * 100) + '%';
  $('enemy-hp-fill').style.width = (b.enemy.hp / b.enemy.maxHp * 100) + '%';
  $('hero-hp-fill').classList.remove('low', 'critical');
  if (r.hp / r.maxHp < 0.25) $('hero-hp-fill').classList.add('critical');
  else if (r.hp / r.maxHp < 0.5) $('hero-hp-fill').classList.add('low');
  $('turn-num').textContent = b.turn;
  $('hud-floor').textContent = r.floor;
  $('hud-room').textContent = r.roomNum;
  $('hud-rooms').textContent = r.roomsPerFloor;
  $('hud-hp').textContent = r.hp;
  $('hud-gold').textContent = r.gold;
  // 스킬 버튼 표시
  refreshSkillButton();
  // 상태 표시
  const heroStatus = $('hero-status');
  heroStatus.innerHTML = '';
  if (b.heroDefend > 0) heroStatus.innerHTML = '<span class="status-chip defend">방어</span>';
  const enemyStatus = $('enemy-status');
  enemyStatus.innerHTML = '';
  if (b.enemy.burns > 0) enemyStatus.innerHTML += `<span class="status-chip burn">화상 ${b.enemy.burns}턴</span>`;
  if (b.enemy.dominion) enemyStatus.innerHTML += `<span class="status-chip dominion">🔥 ${b.enemy.dominion.delay}턴 후 폭발</span>`;
}

function log(text, kind = '') {
  const p = document.createElement('p');
  p.textContent = text;
  if (kind) p.className = kind;
  const logEl = $('battle-log');
  logEl.appendChild(p);
  logEl.scrollTop = logEl.scrollHeight;
}

function showDmgNum(side, value, kind = '') {
  const parent = side === 'hero' ? $('hero-side') : $('enemy-side');
  const rect = parent.getBoundingClientRect();
  const stage = $('dmg-layer').getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'dmg-num ' + kind;
  el.textContent = (kind === 'heal' ? '+' : '') + value;
  el.style.left = (rect.left + rect.width / 2 - stage.left) + 'px';
  el.style.top = (rect.top + 30 - stage.top) + 'px';
  $('dmg-layer').appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

function shake() {
  const app = $('app');
  app.classList.remove('shake');
  void app.offsetWidth;
  app.classList.add('shake');
  setTimeout(() => app.classList.remove('shake'), 500);
}

function hitFlash(side) {
  const el = side === 'hero' ? $('hero-side') : $('enemy-side');
  el.classList.remove('hit');
  void el.offsetWidth;
  el.classList.add('hit');
  setTimeout(() => el.classList.remove('hit'), 320);
}

// ===== 전투 액션 =====
function heroAction(action) {
  if (game.run.battle.over) return;
  if (action === 'attack') doAttack();
  else if (action === 'skill') openSkillPicker();
  else if (action === 'defend') doDefend();
  else if (action === 'flee') doFlee();
}

// ===== 스킬 헬퍼 =====
function getSkillCooldown(skillId) {
  const base = SKILLS[skillId].cooldown;
  const startCd = game.run.skillStartCdReduce || 0;   // 음수
  const reduce = getBoonModSum('skillCdReduce');
  return Math.max(1, base + startCd - reduce);
}

function getSkillCdNow(skillId) {
  return game.run.skillCds[skillId] || 0;
}

function refreshSkillButton() {
  const r = game.run;
  const skillBtn = document.querySelector('[data-action="skill"]');
  if (!skillBtn) return;
  // 1개 보유: 그 스킬 정보 표시 / 2개+: '스킬' 라벨 + 사용가능 개수
  if (r.skills.length === 1) {
    const s = SKILLS[r.skills[0]];
    const cd = getSkillCdNow(s.id);
    skillBtn.querySelector('.ico').textContent = s.icon;
    skillBtn.querySelector('.label').textContent = s.name;
    skillBtn.querySelector('.sub').textContent = cd > 0 ? `${cd}턴 후` : s.desc;
    skillBtn.disabled = cd > 0;
  } else {
    const ready = r.skills.filter(id => getSkillCdNow(id) === 0).length;
    skillBtn.querySelector('.ico').textContent = '✦';
    skillBtn.querySelector('.label').textContent = '스킬';
    skillBtn.querySelector('.sub').textContent = `${ready}/${r.skills.length} 사용가능`;
    skillBtn.disabled = ready === 0;
  }
}

function openSkillPicker() {
  const r = game.run;
  if (r.battle.over) return;
  // 1개만 보유 + 사용가능 → 바로 시전
  if (r.skills.length === 1) {
    if (getSkillCdNow(r.skills[0]) > 0) return;
    castSkill(r.skills[0]);
    return;
  }
  // 다중 → 모달
  const modal = $('skill-picker');
  const wrap = $('skill-picker-list');
  wrap.innerHTML = '';
  for (const id of r.skills) {
    const s = SKILLS[id];
    const cd = getSkillCdNow(id);
    const cdMax = getSkillCooldown(id);
    const card = document.createElement('button');
    card.className = 'skill-card' + (cd > 0 ? ' on-cd' : '');
    card.disabled = cd > 0;
    card.innerHTML = `
      <div class="sc-ico">${s.icon}</div>
      <div class="sc-name">${s.name}</div>
      <div class="sc-desc">${s.desc}</div>
      <div class="sc-cd">${cd > 0 ? `${cd}턴 후` : `쿨 ${cdMax}턴`}</div>`;
    if (cd === 0) {
      card.addEventListener('click', () => {
        modal.classList.remove('active');
        castSkill(id);
      });
    }
    wrap.appendChild(card);
  }
  modal.classList.add('active');
}

function closeSkillPicker() {
  $('skill-picker').classList.remove('active');
}

function effectiveStat(stat) {
  const r = game.run;
  // mod 계산
  let val = r[stat] || 0;
  for (const b of r.boons) {
    if (b.mod && b.mod[stat]) val += b.mod[stat];
  }
  // 곱셈 mods (atkMul / magMul)
  for (const b of r.boons) {
    if (stat === 'atk' && b.mod && b.mod.atkMul) val *= b.mod.atkMul;
    if (stat === 'mag' && b.mod && b.mod.magMul) val *= b.mod.magMul;
  }
  return Math.round(val);
}

function hasBoonMod(key) {
  return game.run.boons.find(b => b.mod && b.mod[key]);
}

function getBoonModSum(key) {
  let sum = 0;
  for (const b of game.run.boons) {
    if (b.mod && b.mod[key]) sum += b.mod[key];
  }
  return sum;
}

function doAttack() {
  const b = game.run.battle;
  const atkMulti = hasBoonMod('atkMulti') ? hasBoonMod('atkMulti').mod.atkMulti : 1;
  for (let i = 0; i < atkMulti; i++) {
    if (b.enemy.hp <= 0) break;
    let dmg = effectiveStat('atk');
    // 회피
    if (b.enemy.def.dodge && Math.random() < b.enemy.def.dodge) {
      log(`이그니아의 공격 — 회피됨!`, 'enemy');
      continue;
    }
    // 치명타
    let crit = false;
    const critC = getBoonModSum('critChance');
    if (Math.random() < critC) { dmg = Math.round(dmg * 1.5); crit = true; }
    // 방패병 감소
    if (b.enemy.def.defReduce) dmg = Math.round(dmg * (1 - b.enemy.def.defReduce));
    dealDamageToEnemy(dmg, crit ? 'crit' : '');
    // 흡혈
    const ls = getBoonModSum('lifesteal');
    if (ls > 0) {
      const heal = Math.round(dmg * ls);
      healHero(heal);
    }
    log(`이그니아의 공격 → ${dmg}${crit ? ' (치명타!)' : ''}`, 'hero');
    if (b.enemy.hp <= 0) break;
  }
  endTurnHero();
}

function castSkill(skillId) {
  const r = game.run;
  const b = r.battle;
  const s = SKILLS[skillId];
  if (!s) return;
  if (getSkillCdNow(skillId) > 0) return;
  // cut-in (스킬별 일러스트)
  playCutin(s.name, s.quote, s.cutin);
  // 지연 폭발 스킬 (불의 지배 등)
  if (s.delay) {
    setTimeout(() => {
      const dmg = Math.round(effectiveStat('mag') * s.delayMul);
      b.enemy.dominion = { delay: s.delay, dmg, name: s.name };
      log(`${s.name} 각인 — ${s.delay}턴 후 폭발 (${dmg})`, 'hero');
      r.skillCds[skillId] = getSkillCooldown(skillId);
      endTurnHero();
    }, 800);
    return;
  }
  setTimeout(() => {
    const burnMul = hasBoonMod('burnMul') ? hasBoonMod('burnMul').mod.burnMul : 1;
    const burnBonus = getBoonModSum('burnTurnsBonus');
    const burnDmg = Math.round(s.burnDmg * burnMul);
    const burnTurns = s.burnTurns + burnBonus;
    const critBase = getBoonModSum('critChance');
    let totalDmg = 0;
    for (let i = 0; i < s.hits; i++) {
      if (b.enemy.hp <= 0) break;
      let dmg = Math.round(effectiveStat('mag') * s.mul);
      let crit = false;
      const critChance = critBase + (s.critBonus || 0);
      if (Math.random() < critChance) { dmg = Math.round(dmg * 1.5); crit = true; }
      dealDamageToEnemy(dmg, crit ? 'crit' : '');
      totalDmg += dmg;
      // 흡혈
      const ls = getBoonModSum('lifesteal');
      if (ls > 0) healHero(Math.round(dmg * ls));
    }
    // 화상 적용 (있으면)
    if (burnTurns > 0 && burnDmg > 0 && b.enemy.hp > 0) {
      b.enemy.burns = Math.max(b.enemy.burns, burnTurns);
      b.enemy.burnDmg = Math.max(b.enemy.burnDmg, burnDmg);
      log(`${s.name}! → 총 ${totalDmg} (${s.hits}타) + 화상`, 'hero');
    } else {
      log(`${s.name}! → 총 ${totalDmg} (${s.hits}타)`, 'hero');
    }
    r.skillCds[skillId] = getSkillCooldown(skillId);
    endTurnHero();
  }, 800);
}

function doDefend() {
  const b = game.run.battle;
  if (hasBoonMod('defendPerfect')) {
    b.heroDefend = 1.0;
    healHero(10);
    log('완벽 방어! HP +10', 'hero');
  } else {
    b.heroDefend = 0.5;
    log('방어 자세 — 다음 적 공격 데미지 -50%', 'hero');
  }
  endTurnHero();
}

function doFlee() {
  const b = game.run.battle;
  if (b.enemy.def.boss || b.enemy.kind === 'elite') {
    log('이 적에게서는 도망칠 수 없다!', 'system');
    return;
  }
  if (Math.random() < 0.6) {
    log('성공적으로 도망쳤다.', 'system');
    setTimeout(() => {
      b.over = true;
      nextStep();
    }, 600);
  } else {
    log('도망 실패!', 'system');
    endTurnHero(true);
  }
}

function dealDamageToEnemy(dmg, kind) {
  const b = game.run.battle;
  b.enemy.hp = Math.max(0, b.enemy.hp - dmg);
  showDmgNum('enemy', dmg, kind);
  hitFlash('enemy');
  shake();
  refreshBattleUI();
}

function healHero(amount) {
  const r = game.run;
  const heal = Math.min(r.maxHp - r.hp, amount);
  if (heal <= 0) return;
  r.hp += heal;
  showDmgNum('hero', heal, 'heal');
  refreshBattleUI();
}

function dealDamageToHero(dmg) {
  const r = game.run;
  const b = r.battle;
  // 방어
  if (b.heroDefend > 0) dmg = Math.round(dmg * (1 - b.heroDefend));
  r.hp = Math.max(0, r.hp - dmg);
  showDmgNum('hero', dmg);
  hitFlash('hero');
  refreshBattleUI();
  // 가시
  const thorns = getBoonModSum('thorns');
  if (thorns > 0) {
    setTimeout(() => {
      b.enemy.hp = Math.max(0, b.enemy.hp - thorns);
      showDmgNum('enemy', thorns);
      log(`가시 반사 → ${thorns}`, 'hero');
      refreshBattleUI();
    }, 350);
  }
  // 부활
  if (r.hp <= 0 && hasBoonMod('phoenix') && !r.phoenixUsed) {
    r.phoenixUsed = true;
    r.hp = Math.round(r.maxHp * 0.5);
    log('🔥 불사조의 가호! HP 50%로 부활!', 'system');
    refreshBattleUI();
  }
}

function endTurnHero(skipDefense) {
  const b = game.run.battle;
  // 화상 데미지 (적)
  if (b.enemy.burns > 0 && b.enemy.hp > 0) {
    const burn = b.enemy.burnDmg;
    b.enemy.hp = Math.max(0, b.enemy.hp - burn);
    showDmgNum('enemy', burn, 'burn');
    log(`화상 → ${burn}`, 'system');
    b.enemy.burns--;
    refreshBattleUI();
  }
  if (b.enemy.hp <= 0) {
    setTimeout(() => onEnemyDefeat(), 500);
    return;
  }
  // 적 턴
  setTimeout(() => enemyTurn(), 700);
}

function enemyTurn() {
  const b = game.run.battle;
  if (b.enemy.hp <= 0) return;
  const dmg = b.enemy.atk;
  log(`${b.enemy.name}의 공격 → ${dmg}`, 'enemy');
  dealDamageToHero(dmg);
  if (game.run.hp <= 0) {
    setTimeout(() => onHeroDefeat(), 600);
    return;
  }
  // 방어 해제
  b.heroDefend = 0;
  b.turn++;
  // 모든 스킬 쿨다운 -1
  for (const id of Object.keys(game.run.skillCds)) {
    if (game.run.skillCds[id] > 0) game.run.skillCds[id]--;
  }
  // 불의 지배 등 지연 폭발 처리
  if (b.enemy.dominion && b.enemy.hp > 0) {
    b.enemy.dominion.delay--;
    if (b.enemy.dominion.delay <= 0) {
      const ddmg = b.enemy.dominion.dmg;
      const name = b.enemy.dominion.name;
      b.enemy.dominion = null;
      setTimeout(() => {
        log(`🔥 ${name} 폭발! → ${ddmg}`, 'system');
        dealDamageToEnemy(ddmg, 'crit');
        if (b.enemy.hp <= 0) {
          setTimeout(() => onEnemyDefeat(), 500);
        } else {
          refreshBattleUI();
        }
      }, 400);
      return;
    }
  }
  setTimeout(() => refreshBattleUI(), 100);
}

function onEnemyDefeat() {
  const b = game.run.battle;
  b.over = true;
  log(`${b.enemy.name} 처치!`, 'system');
  game.run.enemiesDefeated++;
  // 보상 골드
  let gold = 10 + game.run.floor * 5 + (b.enemy.kind === 'elite' ? 25 : 0) + (b.enemy.def.boss ? 60 : 0);
  game.run.gold += gold;
  log(`+${gold} 골드`, 'system');
  // 영혼 흡수
  if (hasBoonMod('soulSteal')) {
    game.run.maxHp += 5;
    game.run.hp = game.run.maxHp;
    log('영혼 흡수! 최대 HP +5, 완전 회복', 'system');
  }
  // 보스 처치 시 정수 +
  if (b.enemy.def.boss) {
    game.run.bossesDefeated++;
    game.meta.essence += 5;
    saveMeta();
  }
  setTimeout(() => {
    const node = game.run.currentNode || {};
    let context = '전투 승리!';
    let cat = node.rewardCat;
    let rarity = node.rewardRarity || 'common';
    if (b.enemy.kind === 'boss') {
      context = '보스 처치!';
      rarity = 'epic';
    } else if (b.enemy.kind === 'elite') {
      context = '엘리트 처치!';
      rarity = node.rewardRarity || 'rare';
    } else if (node.id === 'first') {
      context = '첫 전투 승리!';
    }
    openBoonScreen(context, cat, rarity);
  }, 800);
}

function onHeroDefeat() {
  log('이그니아 쓰러졌다...', 'system');
  setTimeout(() => endRun(false), 1000);
}

// ============================================================
// 가호 시스템
// ============================================================
function rollBoonChoices(category, rarityFloor = 'common') {
  const weights = {
    common:    { common: 60, rare: 30, epic: 10, legendary: 0 },
    rare:      { common: 30, rare: 50, epic: 18, legendary: 2 },
    epic:      { common: 0,  rare: 30, epic: 55, legendary: 15 },
    legendary: { common: 0,  rare: 0,  epic: 40, legendary: 60 },
  }[rarityFloor] || { common: 60, rare: 30, epic: 10, legendary: 0 };
  const owned = new Set(game.run.boons.map(b => b.id));
  // 카테고리 매칭: 카테고리 지정 시 해당 카테고리 우선
  let pool = BOONS.filter(b => !owned.has(b.id));
  let priority = category ? pool.filter(b => b.cat === category) : pool;
  const picks = [];
  for (let i = 0; i < 3; i++) {
    let r = Math.random() * 100;
    let chosenRarity = 'common';
    for (const k of ['legendary', 'epic', 'rare', 'common']) {
      if (r < weights[k]) { chosenRarity = k; break; }
      r -= weights[k];
    }
    // 카테고리 매칭 풀 우선, 없으면 전체 풀
    let candidates = priority.filter(b => b.rarity === chosenRarity);
    if (candidates.length === 0) candidates = pool.filter(b => b.rarity === chosenRarity);
    if (candidates.length === 0) candidates = priority.length > 0 ? priority : pool;
    if (candidates.length === 0) break;
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    picks.push(chosen);
    pool = pool.filter(b => b !== chosen);
    priority = priority.filter(b => b !== chosen);
  }
  return picks;
}

function openBoonScreen(context, category, rarityFloor) {
  $('boon-context').textContent = context;
  const choices = rollBoonChoices(category, rarityFloor);
  const wrap = $('boon-choices');
  wrap.innerHTML = '';
  for (const b of choices) {
    const el = document.createElement('div');
    el.className = `boon-choice ${b.rarity}`;
    const lbl = { common: '일반', rare: '희귀', epic: '영웅', legendary: '전설' }[b.rarity];
    el.innerHTML = `
      <div class="rarity">${lbl}</div>
      <div class="name">${b.name}</div>
      <div class="desc">${b.desc}</div>`;
    el.addEventListener('click', () => openBoonConfirm(b));
    wrap.appendChild(el);
  }
  showScreen('boon-screen');
}

function openBoonConfirm(boon) {
  const card = $('boon-confirm-card');
  card.className = 'boon-confirm-card ' + boon.rarity;
  $('bc-rarity').textContent = `◆ ${{common:'일반',rare:'희귀',epic:'영웅',legendary:'전설'}[boon.rarity]} 가호 ◆`;
  $('bc-name').textContent = boon.name;
  $('bc-desc').textContent = boon.desc;
  $('boon-confirm').classList.add('active');
  const yes = $('boon-confirm-yes'), no = $('boon-confirm-no');
  const close = () => $('boon-confirm').classList.remove('active');
  const onYes = () => {
    close();
    boonFlash(boon.rarity);
    applyBoon(boon);
    yes.removeEventListener('click', onYes);
    no.removeEventListener('click', onNo);
    setTimeout(() => nextStep(), 800);
  };
  const onNo = () => {
    close();
    yes.removeEventListener('click', onYes);
    no.removeEventListener('click', onNo);
  };
  yes.addEventListener('click', onYes);
  no.addEventListener('click', onNo);
}

function applyBoon(boon) {
  game.run.boons.push(boon);
  if (boon.apply) boon.apply(game.run);
  // 새 스킬 획득
  if (boon.mod && boon.mod.grantSkill) {
    const sid = boon.mod.grantSkill;
    if (!game.run.skills.includes(sid)) {
      game.run.skills.push(sid);
      game.run.skillCds[sid] = 0;
    }
  }
}

function boonFlash(rarity) {
  const flash = $('boon-flash');
  flash.className = '';
  void flash.offsetWidth;
  flash.classList.add(rarity, 'active');
  setTimeout(() => flash.classList.remove('active', rarity), 1100);
  if (['rare', 'epic', 'legendary'].includes(rarity)) shake();
}

// ============================================================
// 진행도 모달
// ============================================================
function openProgressModal() {
  const trail = $('progress-trail');
  trail.innerHTML = '';
  const history = game.run.history || [];
  history.forEach((h, i) => {
    if (h.type === 'floor') {
      const sep = document.createElement('div');
      sep.className = 'trail-node floor';
      sep.textContent = h.name;
      trail.appendChild(sep);
      return;
    }
    const node = document.createElement('div');
    let cls = 'trail-node ' + (h.type || h.kind);
    if (i === history.length - 1) cls += ' current';
    node.className = cls;
    node.textContent = h.icon || '?';
    node.title = h.name || '';
    trail.appendChild(node);
    if (i < history.length - 1 && history[i + 1].type !== 'floor') {
      const arrow = document.createElement('span');
      arrow.className = 'trail-arrow';
      arrow.textContent = '→';
      trail.appendChild(arrow);
    }
  });
  $('progress-modal').classList.add('active');
}

function closeProgressModal() {
  $('progress-modal').classList.remove('active');
}

// ============================================================
// 휴식
// ============================================================
function openRest(node) {
  showScreen('rest-screen');
}

// ============================================================
// 스킬 cut-in
// ============================================================
function playCutin(name, quote, image) {
  const cut = $('cutin');
  $('cutin-img').src = image || HERO.portrait;
  $('cutin-quote').textContent = quote || SKILL_QUOTES[Math.floor(Math.random() * SKILL_QUOTES.length)];
  $('cutin-name').textContent = name;
  cut.classList.remove('active');
  void cut.offsetWidth;
  cut.classList.add('active');
  setTimeout(() => cut.classList.remove('active'), 1700);
}

// ============================================================
// 결과
// ============================================================
function endRun(victory) {
  const r = game.run;
  // 정수 보상
  let earned = r.enemiesDefeated + r.bossesDefeated * 5 + (victory ? 20 : 0);
  game.meta.essence += earned;
  saveMeta();

  $('result-title').textContent = victory ? 'VICTORY' : 'DEFEAT';
  $('result-title').className = victory ? 'victory' : 'defeat';
  $('result-text').textContent = victory
    ? '이그니아는 던전을 정복했다.'
    : '이그니아는 쓰러졌다... 정수를 모아 다시 도전하자.';
  $('result-stats').innerHTML = `
    <div class="stat"><span class="k">처치</span><span class="v">${r.enemiesDefeated}</span></div>
    <div class="stat"><span class="k">보스</span><span class="v">${r.bossesDefeated}</span></div>
    <div class="stat"><span class="k">획득 정수</span><span class="v">+${earned}</span></div>
    <div class="stat"><span class="k">최종 층</span><span class="v">${r.floor}</span></div>`;
  showScreen('result');
}

// ============================================================
// 영원의 샘
// ============================================================
function openFountain() {
  renderFountain();
  showScreen('fountain');
}

function renderFountain() {
  $('fountain-essence').textContent = game.meta.essence;
  const wrap = $('fountain-upgrades');
  wrap.innerHTML = '';
  for (const u of META_UPGRADES) {
    const lvl = game.meta.upgrades[u.id] || 0;
    const maxed = lvl >= u.max;
    const cost = maxed ? null : u.costs[lvl];
    const can = !maxed && game.meta.essence >= cost;
    const card = document.createElement('div');
    card.className = 'upgrade-card';
    let pips = '';
    for (let i = 0; i < u.max; i++) pips += `<div class="pip ${i < lvl ? 'filled' : ''}"></div>`;
    card.innerHTML = `
      <div class="name">${u.name}</div>
      <div class="desc">${u.desc}</div>
      <div class="pips">${pips}</div>
      <div class="row">
        ${maxed
          ? '<span class="maxed">최대</span><span></span>'
          : `<span class="cost ${can ? '' : 'unaffordable'}">◆ ${cost}</span>
             <button data-id="${u.id}" ${can ? '' : 'disabled'}>강화</button>`}
      </div>`;
    wrap.appendChild(card);
  }
  wrap.querySelectorAll('button[data-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const u = META_UPGRADES.find(x => x.id === id);
      const lvl = game.meta.upgrades[id] || 0;
      if (lvl >= u.max) return;
      const cost = u.costs[lvl];
      if (game.meta.essence < cost) return;
      game.meta.essence -= cost;
      game.meta.upgrades[id] = lvl + 1;
      saveMeta();
      renderFountain();
    });
  });
}

// renderMenu는 위에서 정의됨 (타이틀/선택 섹션)

// ============================================================
// 초기화
// ============================================================
function hardReset() {
  if (!confirm('모든 데이터를 초기화합니다. 계속하시겠습니까?')) return;
  try { localStorage.clear(); } catch (e) {}
  try { sessionStorage.clear(); } catch (e) {}
  try {
    if ('caches' in window) caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k))));
    if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
  } catch (e) {}
  alert('초기화 완료. 새로고침합니다.');
  setTimeout(() => location.reload(), 200);
}

// ============================================================
// 부팅
// ============================================================
function boot() {
  // 타이틀
  $('title-start').addEventListener('click', () => { renderMenu(); showScreen('menu'); });
  $('title-fountain').addEventListener('click', openFountain);
  $('title-reset').addEventListener('click', hardReset);
  // 영웅 선택
  $('select-back').addEventListener('click', () => { renderTitle(); showScreen('title'); });
  $('start-btn').addEventListener('click', newRun);
  // 영원의 샘 → 타이틀로 복귀
  $('fountain-back').addEventListener('click', () => { renderTitle(); showScreen('title'); });
  // 전투
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => heroAction(btn.dataset.action));
  });
  // 스킬 picker 닫기
  $('skill-picker-close').addEventListener('click', closeSkillPicker);
  $('skill-picker-backdrop').addEventListener('click', closeSkillPicker);
  // 보스/가호 후 진행
  $('boon-skip').addEventListener('click', () => {
    game.run.gold += 30;
    nextStep();
  });
  // 휴식
  $('rest-heal').addEventListener('click', () => {
    game.run.hp = Math.min(game.run.maxHp, game.run.hp + 30);
    nextStep();
  });
  $('rest-skip').addEventListener('click', () => nextStep());
  // 분기점 포기
  $('fork-quit').addEventListener('click', () => {
    if (confirm('던전을 포기합니까?')) endRun(false);
  });
  // 진행도 모달
  $('hud-progress-btn').addEventListener('click', openProgressModal);
  $('progress-close').addEventListener('click', closeProgressModal);
  $('progress-modal').addEventListener('click', e => {
    if (e.target.id === 'progress-modal') closeProgressModal();
  });
  // 결과
  $('back-to-menu').addEventListener('click', () => { renderTitle(); showScreen('title'); });

  renderTitle();
  showScreen('title');

  // SW 등록
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}
boot();
