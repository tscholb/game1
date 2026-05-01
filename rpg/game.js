// ============================================================
// 이그니아의 화염 — 로그라이크 턴제 RPG
// ============================================================

const $ = id => document.getElementById(id);

// ===== 영웅 데이터 =====
const HERO = {
  id: 'ignia',
  name: '이그니아',
  flavor: '검은 머리 위로 불꽃을 다스리는 매혹의 화염 대마법사.',
  baseHp: 100,
  baseAtk: 18,
  baseMag: 28,
  skill: {
    name: '화염구',
    quote: '타올라라 — 이 세계마저!',
    cooldown: 3,
    burnDmg: 6,
    burnTurns: 3,
  },
  portrait: '../assets/heroes/mage.png',
  sprite: '../assets/heroes/mage-sprite.png',
};

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

// ===== 가호 데이터 =====
const BOONS = [
  // common
  { id: 'b-vigor',     name: '활력',     desc: '최대 HP +20',                        rarity: 'common', apply: g => { g.maxHp += 20; g.hp += 20; } },
  { id: 'b-strength',  name: '근력',     desc: '공격력 +4',                          rarity: 'common', mod: { atk: 4 } },
  { id: 'b-magic',     name: '마법 숙련', desc: '마법 데미지 +6',                     rarity: 'common', mod: { mag: 6 } },
  { id: 'b-heal',      name: '치유의 빛', desc: 'HP +30 즉시 회복',                   rarity: 'common', apply: g => { g.hp = Math.min(g.maxHp, g.hp + 30); } },
  { id: 'b-coin',      name: '동전 자루', desc: '골드 +30',                          rarity: 'common', apply: g => { g.gold += 30; } },

  // rare
  { id: 'b-iron',      name: '강철 의지', desc: '최대 HP +40, HP 완전 회복',          rarity: 'rare',   apply: g => { g.maxHp += 40; g.hp = g.maxHp; } },
  { id: 'b-fury',      name: '광기',     desc: '공격력 +8, 마법력 +8',               rarity: 'rare',   mod: { atk: 8, mag: 8 } },
  { id: 'b-crit',      name: '치명',     desc: '치명타 확률 +25% (1.5배 데미지)',     rarity: 'rare',   mod: { critChance: 0.25 } },
  { id: 'b-thorns',    name: '가시갑옷', desc: '피격 시 적에게 8 반사 데미지',         rarity: 'rare',   mod: { thorns: 8 } },
  { id: 'b-quick',     name: '재빠른 손', desc: '화염구 쿨다운 -1',                  rarity: 'rare',   mod: { skillCdReduce: 1 } },

  // epic
  { id: 'b-vamp',      name: '흡혈',     desc: '공격 시 데미지의 30% HP로 회복',      rarity: 'epic',   mod: { lifesteal: 0.3 } },
  { id: 'b-firestorm', name: '화염 폭풍', desc: '화염구가 연속 2회 발동',              rarity: 'epic',   mod: { skillMulti: 2 } },
  { id: 'b-burn-mark', name: '낙인',     desc: '화염구 화상 데미지 ×2, 지속 +2턴',     rarity: 'epic',   mod: { burnMul: 2, burnTurnsBonus: 2 } },
  { id: 'b-double',    name: '쌍수',     desc: '공격이 2회 발동',                    rarity: 'epic',   mod: { atkMulti: 2 } },
  { id: 'b-shield',    name: '불멸의 방패', desc: '방어 시 데미지 100% 차단 + HP +10', rarity: 'epic', mod: { defendPerfect: true } },

  // legendary
  { id: 'b-phoenix',   name: '불사조',   desc: 'HP 0이 되면 한 번 50%로 부활',       rarity: 'legendary', mod: { phoenix: true } },
  { id: 'b-meteor',    name: '메테오',   desc: '화염구가 5턴마다 자동 발동 (대기)',    rarity: 'legendary', mod: { autoMeteor: true } },
  { id: 'b-overpower', name: '폭주',     desc: '공격력 ×2, 마법력 ×2',                rarity: 'legendary', mod: { atkMul: 2, magMul: 2 } },
  { id: 'b-soul',      name: '영혼 흡수', desc: '적 처치 시 최대 HP +5, HP 완전 회복', rarity: 'legendary', mod: { soulSteal: true } },
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
  for (const id of ['menu', 'dungeon', 'battle', 'boon-screen', 'rest-screen', 'result', 'fountain']) {
    $(id).classList.toggle('hidden', id !== name);
  }
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
    nodeIndex: 0,
    map: [],
    skillCdMax: HERO.skill.cooldown + bonus.startCd,
    skillCd: 0,
    enemiesDefeated: 0,
    bossesDefeated: 0,
    phoenixUsed: false,
    autoMeteorTimer: 0,
  };
  generateFloor();
  renderDungeon();
  showScreen('dungeon');
}

function generateFloor() {
  // 매 층 5~7방 + 보스 1
  const rooms = 5 + Math.floor(Math.random() * 2);
  const map = [];
  for (let i = 0; i < rooms; i++) {
    const types = ['combat', 'combat', 'combat', 'boon', 'rest', 'elite'];
    map.push({ type: types[Math.floor(Math.random() * types.length)], done: false });
  }
  map.push({ type: 'boss', done: false });
  game.run.map = map;
  game.run.nodeIndex = 0;
}

// ============================================================
// 던전 화면
// ============================================================
function renderDungeon() {
  $('floor-num').textContent = game.run.floor;
  $('dungeon-hp').textContent = game.run.hp;
  $('dungeon-max-hp').textContent = game.run.maxHp;
  $('dungeon-gold').textContent = game.run.gold;
  const map = $('dungeon-map');
  map.innerHTML = '';
  game.run.map.forEach((node, i) => {
    const row = document.createElement('div');
    row.className = 'dungeon-row';
    const el = document.createElement('div');
    el.className = 'node';
    el.dataset.type = node.type;
    if (node.done) el.classList.add('done');
    if (i === game.run.nodeIndex && !node.done) el.classList.add('available');
    if (i < game.run.nodeIndex) el.classList.add('done');
    el.textContent = nodeIcon(node.type);
    if (i === game.run.nodeIndex && !node.done) {
      el.addEventListener('click', () => enterNode(i));
    }
    row.appendChild(el);
    map.appendChild(row);
  });
}

function nodeIcon(type) {
  return { combat: '⚔', elite: '☠', boon: '✦', rest: '🔥', boss: '👑' }[type] || '?';
}

function enterNode(i) {
  const node = game.run.map[i];
  if (node.done) return;
  if (node.type === 'combat') startBattle('normal');
  else if (node.type === 'elite') startBattle('elite');
  else if (node.type === 'boss') startBattle('boss');
  else if (node.type === 'boon') openBoonScreen('보너스 가호');
  else if (node.type === 'rest') openRest();
}

function advanceNode() {
  game.run.map[game.run.nodeIndex].done = true;
  game.run.nodeIndex++;
  if (game.run.nodeIndex >= game.run.map.length) {
    // 층 완료
    game.run.floor++;
    if (game.run.floor > 3) {
      endRun(true);
      return;
    }
    generateFloor();
  }
  renderDungeon();
  showScreen('dungeon');
}

// ============================================================
// 전투
// ============================================================
function startBattle(kind) {
  const f = game.run.floor;
  let ePool;
  if (kind === 'normal') ePool = ['goblin', 'orc', 'rogue', 'shield', 'drone'];
  else if (kind === 'elite') ePool = ['knight', 'shield', 'drone'];
  else if (kind === 'boss') ePool = [['giant', 'lich', 'dragon'][f - 1] || 'dragon'];
  const eid = ePool[Math.floor(Math.random() * ePool.length)];
  const def = ENEMIES[eid];
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
    skillCdNow: game.run.skillCd,
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
  $('battle-gold').textContent = r.gold;
  // 스킬 cooldown 표시
  const skillBtn = document.querySelector('[data-action="skill"]');
  if (b.skillCdNow > 0) {
    skillBtn.disabled = true;
    skillBtn.querySelector('.sub').textContent = `${b.skillCdNow}턴 후`;
  } else {
    skillBtn.disabled = false;
    skillBtn.querySelector('.sub').textContent = '강한 마법';
  }
  // 상태 표시
  const heroStatus = $('hero-status');
  heroStatus.innerHTML = '';
  if (b.heroDefend > 0) heroStatus.innerHTML = '<span class="status-chip defend">방어</span>';
  const enemyStatus = $('enemy-status');
  enemyStatus.innerHTML = '';
  if (b.enemy.burns > 0) enemyStatus.innerHTML = `<span class="status-chip burn">화상 ${b.enemy.burns}턴</span>`;
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
  const b = game.run.battle;
  if (action === 'attack') doAttack();
  else if (action === 'skill') {
    if (b.skillCdNow > 0) return;
    doSkill();
  }
  else if (action === 'defend') doDefend();
  else if (action === 'flee') doFlee();
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

function doSkill() {
  const r = game.run;
  const b = r.battle;
  // cut-in
  playCutin(HERO.skill.name, HERO.skill.quote);
  setTimeout(() => {
    const skillMulti = hasBoonMod('skillMulti') ? hasBoonMod('skillMulti').mod.skillMulti : 1;
    for (let i = 0; i < skillMulti; i++) {
      if (b.enemy.hp <= 0) break;
      let dmg = effectiveStat('mag');
      const burnMul = hasBoonMod('burnMul') ? hasBoonMod('burnMul').mod.burnMul : 1;
      const burnBonus = getBoonModSum('burnTurnsBonus');
      const burnDmg = Math.round(HERO.skill.burnDmg * burnMul);
      const burnTurns = HERO.skill.burnTurns + burnBonus;
      // 치명타
      let crit = false;
      const critC = getBoonModSum('critChance');
      if (Math.random() < critC) { dmg = Math.round(dmg * 1.5); crit = true; }
      dealDamageToEnemy(dmg, crit ? 'crit' : '');
      // 화상 적용
      b.enemy.burns = Math.max(b.enemy.burns, burnTurns);
      b.enemy.burnDmg = Math.max(b.enemy.burnDmg, burnDmg);
      log(`화염구! → ${dmg}${crit ? ' (치명타!)' : ''} + 화상`, 'hero');
      // 흡혈
      const ls = getBoonModSum('lifesteal');
      if (ls > 0) healHero(Math.round(dmg * ls));
    }
    b.skillCdNow = r.skillCdMax;
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
      advanceNode();
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
  // 자동 메테오
  if (hasBoonMod('autoMeteor')) {
    game.run.autoMeteorTimer++;
    if (game.run.autoMeteorTimer >= 5 && b.enemy.hp > 0) {
      game.run.autoMeteorTimer = 0;
      const meteorDmg = Math.round(effectiveStat('mag') * 1.8);
      setTimeout(() => {
        log('☄ 메테오 강림!', 'system');
        dealDamageToEnemy(meteorDmg, 'crit');
      }, 600);
    }
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
  if (b.skillCdNow > 0) b.skillCdNow--;
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
  // 스킬 cd 저장
  game.run.skillCd = b.skillCdNow;
  // 보스 처치 시 정수 +
  if (b.enemy.def.boss) {
    game.run.bossesDefeated++;
    game.meta.essence += 5;
    saveMeta();
  }
  setTimeout(() => {
    // 일반 전투 → 가호 보상, 엘리트/보스 → 더 좋은 가호
    if (b.enemy.kind === 'boss') {
      openBoonScreen('보스 처치 보상!', 'epic');
    } else if (b.enemy.kind === 'elite') {
      openBoonScreen('엘리트 처치 보상!', 'rare');
    } else {
      openBoonScreen('전투 승리!');
    }
  }, 800);
}

function onHeroDefeat() {
  log('이그니아 쓰러졌다...', 'system');
  setTimeout(() => endRun(false), 1000);
}

// ============================================================
// 가호 시스템
// ============================================================
function rollBoonChoices(rarityFloor = 'common') {
  const weights = {
    common:    { common: 60, rare: 30, epic: 10, legendary: 0 },
    rare:      { common: 30, rare: 50, epic: 18, legendary: 2 },
    epic:      { common: 0,  rare: 30, epic: 55, legendary: 15 },
    legendary: { common: 0,  rare: 0,  epic: 40, legendary: 60 },
  }[rarityFloor] || { common: 60, rare: 30, epic: 10, legendary: 0 };
  const owned = new Set(game.run.boons.map(b => b.id));
  const pool = BOONS.filter(b => !owned.has(b.id));
  const picks = [];
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    // 가중치 기반 추첨
    let r = Math.random() * 100;
    let chosenRarity = 'common';
    for (const k of ['legendary', 'epic', 'rare', 'common']) {
      if (r < weights[k]) { chosenRarity = k; break; }
      r -= weights[k];
    }
    const candidates = pool.filter(b => b.rarity === chosenRarity);
    const chosen = candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : pool[Math.floor(Math.random() * pool.length)];
    picks.push(chosen);
    pool.splice(pool.indexOf(chosen), 1);
  }
  return picks;
}

function openBoonScreen(context, rarityFloor) {
  $('boon-context').textContent = context;
  const choices = rollBoonChoices(rarityFloor);
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
    setTimeout(() => advanceNode(), 800);
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
  // 쿨다운 강화 즉시 반영
  if (boon.mod && boon.mod.skillCdReduce) {
    game.run.skillCdMax = Math.max(1, game.run.skillCdMax - boon.mod.skillCdReduce);
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
// 휴식
// ============================================================
function openRest() {
  showScreen('rest-screen');
}

// ============================================================
// 스킬 cut-in
// ============================================================
function playCutin(name, quote) {
  const cut = $('cutin');
  $('cutin-img').src = HERO.portrait;
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

// ============================================================
// 메인 메뉴 갱신
// ============================================================
function renderMenu() {
  $('meta-essence').textContent = game.meta.essence;
  const bonus = metaBonus();
  $('menu-hp').textContent = HERO.baseHp + bonus.hp;
  $('menu-atk').textContent = HERO.baseAtk + bonus.atk;
  $('menu-mag').textContent = HERO.baseMag + bonus.mag;
}

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
  // 메뉴
  $('start-btn').addEventListener('click', newRun);
  $('fountain-btn').addEventListener('click', openFountain);
  $('hard-reset-btn').addEventListener('click', hardReset);
  $('fountain-back').addEventListener('click', () => { renderMenu(); showScreen('menu'); });
  // 던전
  $('dungeon-quit').addEventListener('click', () => {
    if (confirm('던전을 포기합니까? 현재 진행이 사라집니다.')) {
      endRun(false);
    }
  });
  // 전투
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => heroAction(btn.dataset.action));
  });
  // 보스/가호 후 진행
  $('boon-skip').addEventListener('click', () => {
    game.run.gold += 30;
    advanceNode();
  });
  // 휴식
  $('rest-heal').addEventListener('click', () => {
    game.run.hp = Math.min(game.run.maxHp, game.run.hp + 30);
    advanceNode();
  });
  $('rest-skip').addEventListener('click', () => advanceNode());
  // 결과
  $('back-to-menu').addEventListener('click', () => { renderMenu(); showScreen('menu'); });

  renderMenu();
  showScreen('menu');

  // SW 등록
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}
boot();
