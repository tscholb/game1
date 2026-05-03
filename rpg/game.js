// ============================================================
// 이그니아의 화염 — 로그라이크 턴제 RPG
// ============================================================

const $ = id => document.getElementById(id);

// 빌드 버전 — sw.js의 캐시 키와 같이 올려준다
const VERSION = 'v46-boon-lv-effect';

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
    spriteWounded: '../assets/heroes/mage-wounded.png',
    defaultSkill: 'fireball',
  },
  {
    id: 'luna', name: '루나', title: '달빛 궁수',
    flavor: '달빛에 화살을 실어 보내는 침묵의 사냥꾼.',
    locked: true,
    baseHp: 90, baseAtk: 22, baseMag: 14,
    portrait: '../assets/heroes/luna.png',
    sprite: '../assets/heroes/luna.png',
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
  mimic:    { name: '미믹',     hp: 80,  atk: 14, emoji: '🪤', tier: 2 },
  // 보스
  giant:    { name: '어둠의 드리아드', hp: 280, atk: 22, emoji: '🌳', boss: true, sprite: '../assets/bosses/dryad.png' },
  lich:     { name: '보랏빛 마녀',     hp: 240, atk: 26, emoji: '💀', boss: true, sprite: '../assets/bosses/witch.png' },
  dragon:   { name: '심연의 드래곤',   hp: 380, atk: 30, emoji: '🐉', boss: true, sprite: '../assets/bosses/dragon-human.png' },
  // 3층 보스 페이즈 2 — 진정한 드래곤 모습
  'dragon-true': { name: '심연의 드래곤', hp: 460, atk: 36, emoji: '🐉', boss: true, sprite: '../assets/bosses/dragon-true.png' },
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
    cutin: '../assets/skills/ignia-meteor.png',
  },
  ignite: {
    id: 'ignite', name: '점화', icon: '🔆',
    cooldown: 4,
    special: 'detonateBurn',
    hits: 0, mul: 0,
    burnDmg: 0, burnTurns: 0,
    critBonus: 0,
    desc: '걸린 화상을 모두 소진해 큰 폭발 (스택당 마법력 ×1.5)',
    quote: '터져라 — 화염!',
    cutin: '../assets/skills/ignia-ignite.png',
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
// ※ 단순 스탯 +N 류는 모두 제거 — 능력치 강화는 상인을 통해 구매
const BOONS = [
  // common — 메커니즘 기반
  { id: 'b-warmup',    cat: 'attack',  name: '예열',     desc: '매 전투 첫 공격 데미지 +60%',         rarity: 'common', maxLevel: 3, mod: { firstAtkBonus: 0.6 } },
  { id: 'b-bulwark',   cat: 'defend',  name: '굳건한 자세', desc: '매 전투 첫 피격 데미지 -50%',       rarity: 'common', maxLevel: 2, mod: { firstHitReduce: 0.5 } },
  { id: 'b-spark',     cat: 'magic',   name: '점화',     desc: '전투 시작 시 적에 화상 6/3턴 자동 부여', rarity: 'common', maxLevel: 3, mod: { startBurn: { dmg: 6, turns: 3 } } },
  { id: 'b-bargain',   cat: 'utility', name: '상인의 눈',  desc: '획득 골드 +30%',                      rarity: 'common', maxLevel: 3, mod: { goldMul: 0.3 } },
  { id: 'b-merchant-bless', cat: 'utility', name: '상인의 가호', desc: '갈림길마다 한쪽이 앨리스의 가게로 등장한다', rarity: 'common', mod: { forkMerchant: true } },

  // rare — 메커니즘 기반
  { id: 'b-overheat',  cat: 'magic',   name: '과열',     desc: 'HP 50% 이하 시 마법 데미지 +50%',      rarity: 'rare',   maxLevel: 3, mod: { lowHpMagBonus: 0.5 } },
  { id: 'b-bloodlust', cat: 'attack',  name: '광폭',     desc: 'HP 30% 이하 시 공격력 +60%',           rarity: 'rare',   maxLevel: 3, mod: { lowHpAtkBonus: 0.6 } },
  { id: 'b-crit',      cat: 'attack',  name: '치명',     desc: '치명타 확률 +25% (1.5배 데미지)',      rarity: 'rare',   maxLevel: 3, mod: { critChance: 0.25 } },
  { id: 'b-thorns',    cat: 'defend',  name: '가시갑옷', desc: '피격 시 적에게 8 반사 데미지',          rarity: 'rare',   maxLevel: 3, mod: { thorns: 8 } },
  { id: 'b-quick',     cat: 'utility', name: '재빠른 손', desc: '모든 스킬 쿨다운 -1',                 rarity: 'rare',   maxLevel: 3, mod: { skillCdReduce: 1 } },

  // epic
  { id: 'b-flamethrower', cat: 'magic', name: '화염방사', desc: '새 스킬 「화염방사」 획득 — 5회 연속 화염',  rarity: 'epic',   mod: { grantSkill: 'flamethrower' } },
  { id: 'b-firestorm', cat: 'magic',   name: '화염 폭풍', desc: '새 스킬 「화염 폭풍」 획득 — 3회 연타',     rarity: 'epic',   mod: { grantSkill: 'firestorm' } },
  { id: 'b-inferno',   cat: 'magic',   name: '지옥불',   desc: '새 스킬 「지옥불」 획득 — 맹렬한 화상',     rarity: 'epic',   mod: { grantSkill: 'inferno' } },
  { id: 'b-burn-mark', cat: 'magic',   name: '낙인',     desc: '모든 스킬 화상 데미지 ×2, 지속 +2턴',  rarity: 'epic',   maxLevel: 2, mod: { burnMul: 2, burnTurnsBonus: 2 } },
  { id: 'b-shield',    cat: 'defend',  name: '불멸의 방패', desc: '방어 시 데미지 80% 차단 + HP +10', rarity: 'epic', mod: { defendPerfect: true } },
  { id: 'b-fortune',   cat: 'utility', name: '행운',     desc: '치명타 +15%, 골드 +50',                rarity: 'epic',   maxLevel: 3, mod: { critChance: 0.15 }, apply: g => { g.gold += 50; } },

  // legendary
  { id: 'b-phoenix',     cat: 'defend',  name: '불사조',     desc: 'HP 0이 되면 한 번 50%로 부활',         rarity: 'legendary', mod: { phoenix: true } },
  { id: 'b-vamp',        cat: 'attack',  name: '공격 흡혈',  desc: '일반 공격 데미지의 30% HP로 회복',     rarity: 'legendary', maxLevel: 3, mod: { attackLifesteal: 0.3 } },
  { id: 'b-mag-vamp',    cat: 'magic',   name: '마법 흡혈',  desc: '스킬 데미지의 30% HP로 회복',          rarity: 'legendary', maxLevel: 3, mod: { magLifesteal: 0.3 } },
  { id: 'b-magic-knight', cat: 'attack', name: '마법기사',   desc: '마법 직후 공격 +50% / 공격 직후 마법 +50%', rarity: 'legendary', mod: { magicKnight: true } },
  { id: 'b-flame-brand',  cat: 'attack', name: '화염낙인',   desc: '공격 데미지에 마법력이 합산되고 화상도 적용된다', rarity: 'legendary', mod: { flameBrand: true } },
  { id: 'b-ignite-magic', cat: 'magic',  name: '점화 마법',   desc: '새 스킬 「점화」 획득 — 적의 모든 화상을 소진해 큰 폭발', rarity: 'legendary', mod: { grantSkill: 'ignite' } },
  { id: 'b-meteor',      cat: 'magic',   name: '메테오',     desc: '새 스킬 「메테오」 획득 — 초강력 단발',   rarity: 'legendary', mod: { grantSkill: 'meteor' } },
  { id: 'b-firedom',     cat: 'magic',   name: '불의 지배',  desc: '새 스킬 「불의 지배」 획득 — 2턴 후 대폭발', rarity: 'legendary', mod: { grantSkill: 'firedom' } },
  { id: 'b-flame-lord',  cat: 'magic',   name: '화염의 군주', desc: '적의 화상이 처치 시까지 영구 지속',     rarity: 'legendary', mod: { eternalBurn: true } },
  { id: 'b-soul',        cat: 'utility', name: '영혼 흡수',  desc: '적 처치 시 최대 HP +5, HP 완전 회복',  rarity: 'legendary', mod: { soulSteal: true } },

  // unstable — 메리트 + 디메리트 (모두 메커니즘 기반)
  { id: 'b-time-warp',   cat: 'magic',   name: '시간 왜곡',  desc: '◆ 모든 스킬 쿨다운 절반 ◇ 일반 공격 후 2턴 쿨다운', rarity: 'unstable', mod: { skillCdHalf: true, attackCdMax: 2 } },
  { id: 'b-soul-trade',  cat: 'utility', name: '영혼 거래',  desc: '◆ 같은 카테고리 두 단계 위 가호 즉시 획득 ◇ 기존 가호 1개 무작위 삭제', rarity: 'unstable',
    apply: g => { applyUnstableSoulTrade(g); } },
  { id: 'b-double',       cat: 'attack', name: '쌍수',       desc: '◆ 공격이 2회 발동 ◇ 모든 스킬 쿨다운 ×2', rarity: 'unstable', mod: { atkMulti: 2, skillCdMul: 2 } },
  { id: 'b-double-skill', cat: 'magic',  name: '이중 시전',  desc: '◆ 스킬이 2회 발동 ◇ 일반 공격 후 2턴 쿨다운', rarity: 'unstable', mod: { skillMulti: 2, attackCdMax: 2 } },

  // 도구(소비 아이템) 관련 — 유틸 카테고리
  { id: 'b-herbalist',   cat: 'utility', name: '약초학자',   desc: '런 시작 시 「체력 포션」 2개 획득',
    rarity: 'common', maxLevel: 3, apply: g => { addTool(g, 'potion'); addTool(g, 'potion'); } },
  { id: 'b-tool-belt',   cat: 'utility', name: '도구 벨트',  desc: '런 시작 시 무작위 도구 3개 획득',
    rarity: 'rare',   maxLevel: 3, apply: g => { for (let i=0;i<3;i++) addTool(g, randomToolId()); } },
  { id: 'b-alchemist',   cat: 'utility', name: '연금술사',   desc: '매 층 시작 시 무작위 도구 1개 획득',
    rarity: 'rare',   maxLevel: 3, mod: { toolEachFloor: 1 }, apply: g => { addTool(g, randomToolId()); } },
  { id: 'b-tool-master', cat: 'utility', name: '도구 마스터', desc: '엘리트/보스 처치 시 무작위 도구 1개 획득',
    rarity: 'epic',   mod: { toolOnElite: true } },
  { id: 'b-loot-pouch',  cat: 'utility', name: '도굴꾼의 주머니', desc: '상자에서 도구도 함께 나온다',
    rarity: 'common', mod: { chestTool: true } },
  { id: 'b-toolkit-mastery', cat: 'utility', name: '도구의 진가', desc: '도구 효과 +50%',
    rarity: 'epic',   maxLevel: 3, mod: { toolPotency: 0.5 } },
];

// ===== 도구(소비 아이템) =====
const TOOLS = {
  potion:    { id: 'potion',    icon: '🧪', name: '체력 포션',     desc: 'HP +50 회복' },
  greater:   { id: 'greater',   icon: '❤️', name: '상급 포션',     desc: 'HP +120 회복' },
  bomb:      { id: 'bomb',      icon: '💣', name: '불꽃 폭탄',     desc: '적에게 40 마법 데미지 + 화상 12/4턴' },
  smoke:     { id: 'smoke',     icon: '💨', name: '연막탄',         desc: '다음 적 공격 완전 회피' },
  bulwark:   { id: 'bulwark',   icon: '🛡️', name: '방벽석',         desc: '즉시 데미지 80% 차단 + HP +15' },
  cooldown:  { id: 'cooldown',  icon: '💎', name: '냉각의 결정',   desc: '모든 스킬 쿨다운을 즉시 0으로' },
  haste:     { id: 'haste',     icon: '⏳', name: '각성의 모래',   desc: '이번 전투 모든 데미지 +30%' },
};
const TOOL_IDS = Object.keys(TOOLS);
function randomToolId() { return TOOL_IDS[Math.floor(Math.random() * TOOL_IDS.length)]; }
function addTool(g, id) {
  if (!TOOLS[id]) return;
  if (!g) return;
  if (!g.tools) g.tools = [];
  g.tools.push(id);
}

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
  for (const id of ['title', 'prologue', 'menu', 'fork', 'battle', 'boon-screen', 'rest-screen', 'chest-screen', 'shop-screen', 'result', 'fountain']) {
    const el = $(id);
    if (el) el.classList.toggle('hidden', id !== name);
  }
  // BGM 트랙 매핑 (battle 은 startBattle 에서 별도 설정)
  if (window.AUDIO) {
    const map = {
      title: 'title', menu: 'title',
      fork: 'explore', 'rest-screen': 'explore', 'chest-screen': 'explore',
      'shop-screen': 'shop', 'boon-screen': 'shop',
      result: 'result', fountain: 'title',
    };
    // prologue 는 호출 컨텍스트에 따라 다름 — 음악 유지
    if (Object.prototype.hasOwnProperty.call(map, name)) AUDIO.music(map[name]);
  }
}

// ============================================================
// 프롤로그
// ============================================================
const PROLOGUE = [
  {
    img: '../assets/story/prologue-1-darkness.png',
    text: '어린 시절, 검은 그림자가 마을을 삼켰다.\n비명도, 빛도, 모든 것이 어둠 속으로 빨려들어 갔다.\n\n— 그 어둠이 아빠를 데려갔다.',
  },
  {
    img: '../assets/story/prologue-1-darkness.png',
    text: '검은 손길이 그녀의 목을 조였다.\n죽음 직전, 가슴 깊은 곳에서 작은 불꽃이 깨어났다.\n\n그 불꽃이 어둠을 잠시 밀어냈고 — 그녀는 살아남았다.',
  },
  {
    img: null,                   // 텍스트 only (검은 화면)
    text: '그 후 수년의 어둠 속에서, 그녀는 불꽃을 키웠다.\n복수를 위한 불꽃.\n어둠을 모조리 태워버릴 불꽃.\n\n사람들은 그녀를 「화염의 대마법사 — 이그니아」라 부르기 시작했다.',
  },
  {
    img: '../assets/story/prologue-3-cave.png',
    text: '그러던 어느 날, 검은 짐승이 깨어났다는 소문이 들려왔다.\n어두운 궤도(軌道) — 그자의 둥지로 연결된 동굴.\n\n그녀는 망설이지 않았다.',
  },
  {
    img: '../assets/story/prologue-3-cave.png',
    text: '"기다려라, 어둠.\n오늘 밤, 네 그림자마저 잿더미로 만들어주마."\n\n— 작은 불꽃을 손에 든 채, 그녀는 어둠 속으로 걸어 들어갔다.',
  },
];

let prState = { scenes: [], index: 0, onDone: null, isPrologue: false, finalLabel: '시작 ⚔' };

// 일반화된 스토리 시퀀스 재생 (프롤로그 / 보스 인트로 / 보스 아웃트로 공유)
function playStorySequence(scenes, onDone, opts = {}) {
  prState.scenes = scenes;
  prState.index = 0;
  prState.onDone = onDone || (() => {});
  prState.isPrologue = !!opts.prologue;
  prState.finalLabel = opts.finalLabel || '계속 ▶';
  showScreen('prologue');
  renderStoryScene();
}

function startPrologue(onDone) {
  playStorySequence(
    PROLOGUE,
    () => {
      try { localStorage.setItem('ignia-prologue-seen', '1'); } catch (e) {}
      if (onDone) onDone();
      else { renderMenu(); showScreen('menu'); }
    },
    { prologue: true, finalLabel: '시작 ⚔' }
  );
}

function renderStoryScene() {
  const scene = prState.scenes[prState.index];
  if (!scene) return finishStory();
  const img = $('pr-img');
  const text = $('pr-text');
  // 이미지: speaker 가 있으면 화자 일러스트가 우선
  const imgSrc = (scene.speaker && SPEAKERS[scene.speaker]) || scene.img;
  // 화자 일러는 가운데 정렬로 크게
  img.classList.toggle('character', !!scene.speaker);
  if (imgSrc) {
    if (img.getAttribute('src') !== imgSrc) {
      img.classList.remove('shown');
      img.onload = () => img.classList.add('shown');
      img.src = imgSrc;
    } else {
      img.classList.add('shown');
    }
  } else {
    img.classList.remove('shown');
  }
  // 텍스트 (재시작 애니메이션)
  text.style.animation = 'none';
  void text.offsetWidth;
  text.style.animation = '';
  text.textContent = scene.text;
  // 단계 표시
  $('pr-step').textContent = `${prState.index + 1} / ${prState.scenes.length}`;
  // 마지막이면 다음 버튼 라벨 변경
  $('pr-next').textContent = (prState.index === prState.scenes.length - 1) ? prState.finalLabel : '다음 ▶';
}

function nextStoryScene() {
  prState.index++;
  if (prState.index >= prState.scenes.length) {
    finishStory();
  } else {
    renderStoryScene();
  }
}

function finishStory() {
  const cb = prState.onDone;
  prState.onDone = null;
  if (cb) cb();
}

// ============================================================
// 보스 스토리 (인트로 / 아웃트로)
// ============================================================
// 대화 화자 → 삽화 매핑. scene 에 speaker 가 있으면 해당 캐릭터 일러스트가 우선 표시된다.
const SPEAKERS = {
  ignia:  '../assets/heroes/mage.png',
  dryad:  '../assets/bosses/dryad.png',
  witch:  '../assets/bosses/witch.png',
  dragon: '../assets/bosses/dragon-human.png',
  alice:  '../assets/scenes/merchant.png',
  arina:  '../assets/scenes/arina.png',
  reyna:  '../assets/heroes/merchant.png',
  luna:   '../assets/heroes/luna.png',
};

// ===== 인연각성 (필살기) =====
// 동시에 한 명만 계약, 한 층 당 1회 사용
// 인연은 탐험 중 「인연 이벤트」 노드에서 무작위로 등장하여 결속을 제안
const BONDS = {
  alice: {
    id: 'alice', name: '앨리스', title: '여행하는 상인', icon: '💰',
    art: '../assets/scenes/merchant.png',
    skillName: '초특급 회복물약',
    quote: '앨리스 — "특별 손님이니까 — 이거, 받아."',
    desc: 'HP 100% 회복 + 회복량의 50% 보호막',
    intro: [
      { img: '../assets/scenes/merchant.png',
        text: '먼지 자욱한 길 끝, 작은 등불 하나가 흔들리고 있다.' },
      { speaker: 'alice',
        text: '앨리스 — "어머나 — 또 만났네요. 인연인가 봐요."' },
      { speaker: 'alice',
        text: '앨리스 — "이번엔 뭔가… 더 깊은 이야기가 하고 싶어졌어요."' },
      { speaker: 'alice',
        text: '앨리스 — "단골 손님에게만 주는 — 「특별 약속」이 있어요. 받아보지 않을래요?"' },
      { speaker: 'alice',
        text: '앨리스 — "함께 다녀준다면, 정말로 위험할 때… 단 한 번, 「초특급 회복물약」을 따라드릴게요."' },
    ],
    promptText: '앨리스의 「특별 약속」을 받아들이시겠습니까?',
    acceptScene: { speaker: 'alice', text: '앨리스 — "정말? — 후훗, 약속이에요. 잘 부탁해요, 손님."' },
    rejectScene: { speaker: 'alice', text: '앨리스 — "그래요? — 그래도 가게는 항상 열려있어요. 또 와요."' },
    farewellScene: { speaker: 'alice', text: '앨리스 — "어… 그래요. 단골 손님은 늘 떠나가네요… 또 와줄 거죠?"' },
  },
  arina: {
    id: 'arina', name: '아리나', title: '서큐버스', icon: '🦇',
    art: '../assets/scenes/arina.png',
    skillName: '거부할 수 없는 매혹',
    quote: '아리나 — "후훗 — 멈춰. 너는 지금부터 내 거야."',
    desc: '적이 3턴 동안 행동 불가',
    intro: [
      { img: '../assets/story/prologue-3-cave.png',
        text: '동굴 한구석 — 갑자기 짙은 향기가 코를 찌른다.\n달콤하면서도, 어딘가 아찔한 향.' },
      { speaker: 'arina',
        text: '— "어머나, 어머나. 이런 곳에 이렇게 예쁜 손님이 다 있다니."' },
      { speaker: 'ignia',
        text: '이그니아 — "…누구냐."' },
      { speaker: 'arina',
        text: '아리나 — "아리나라고 해. — 깜짝 놀랐어, 너처럼 곱고 단단한 얼굴은 정말 오랜만이거든."' },
      { speaker: 'arina',
        text: '아리나 — "그 흑발 사이로 비치는 눈매도, 잘록한 허리도, 새빨간 입술도 — 정말 위험할 정도로 아름답네."' },
      { speaker: 'ignia',
        text: '이그니아 — "용건만 말해라."' },
      { speaker: 'arina',
        text: '아리나 — "후훗 — 차갑긴.\n— 「인연」 하나 맺지 않을래?\n위험할 땐 내가 적의 발을 묶어줄게."' },
      { speaker: 'arina',
        text: '아리나 — "아 — 그리고. 네가 쫓고 있는 「어둠」 말이야.\n그자가… 정말로 적이라고 생각해? 한 번쯤은 의심해봐도 좋을 거야."' },
    ],
    promptText: '아리나의 「인연」을 받아들이시겠습니까?',
    acceptScene: { speaker: 'arina', text: '아리나 — "후훗 — 좋은 선택이야. — 너는 이제 내 거야."' },
    rejectScene: { speaker: 'arina', text: '아리나 — "어머, 차갑긴. — 뭐, 언젠가는 또 만나게 되겠지."' },
    farewellScene: { speaker: 'arina', text: '아리나 — "흥 — 다른 애한테 갈아탈 줄이야. — 후회하게 만들어줄지도 몰라?"' },
  },
  reyna: {
    id: 'reyna', name: '레이나', title: '대검 용병', icon: '⚔',
    art: '../assets/heroes/merchant.png',
    skillName: '맹렬한 상처',
    quote: '레이나 — "한 번에 — 끝낸다."',
    desc: '공격력 500% 단발 + 적 공격력 3턴 -50%',
    intro: [
      { speaker: 'reyna',
        text: '— 멀리서 들려오는 발소리. 등 뒤로 거대한 대검을 진 여자가 다가온다.' },
      { speaker: 'reyna',
        text: '레이나 — "…불꽃을 다루는 마법사로군. 소문은 들었다."' },
      { speaker: 'reyna',
        text: '레이나 — "혼자선 넘기 힘든 적이 있을 거다. — 부르기만 해. 한 번에 끝내주지."' },
      { speaker: 'reyna',
        text: '레이나 — "단, 한 사람만 — 그게 내 규칙이다."' },
    ],
    promptText: '레이나와의 「용병 계약」을 받아들이시겠습니까?',
    acceptScene: { speaker: 'reyna', text: '레이나 — "거래 성립. — 한 번 부르면, 한 번에 베어준다."' },
    rejectScene: { speaker: 'reyna', text: '레이나 — "…그런가. 후회하게 될 거다."' },
    farewellScene: { speaker: 'reyna', text: '레이나 — "…해지인가. 뭐, 좋다. — 다음 번에 부르고 싶어진다면, 검값은 두 배다."' },
  },
  luna: {
    id: 'luna', name: '루나', title: '달빛 궁수', icon: '🌙',
    art: '../assets/heroes/luna.png',
    skillName: '바람의 메아리',
    quote: '루나 — "달빛이여 — 길을 비추어라."',
    desc: '마력 500% 단발 + 3턴간 스킬 시 일반공격 추가타',
    intro: [
      { speaker: 'luna',
        text: '— 바람이 멈추고, 달빛 한 줄기가 길을 비춘다.' },
      { speaker: 'luna',
        text: '루나 — "…불꽃의 마법사. 너의 분노는 너무 시끄러워."' },
      { speaker: 'luna',
        text: '루나 — "하지만 — 그 분노에 「바람」이 더해진다면, 적은 흔적도 없이 사라질 거야."' },
      { speaker: 'luna',
        text: '루나 — "내 활을 빌려줄게. — 단, 한 명에게만."' },
    ],
    promptText: '루나의 「바람의 약속」을 받아들이시겠습니까?',
    acceptScene: { speaker: 'luna', text: '루나 — "약속이야. — 네가 부르면, 달빛이 함께 갈게."' },
    rejectScene: { speaker: 'luna', text: '루나 — "…알겠어. 바람은 강요하지 않으니까."' },
    farewellScene: { speaker: 'luna', text: '루나 — "…그래. 바람은 잡아두는 게 아니지. — 잘 가."' },
  },
};

// 앨리스 — 가게 방문 시 무작위로 한 줄
const ALICE_LINES = [
  '"어서 오세요. — 또 만났네요. 오늘은 무얼 찾고 있나요?"',
  '"이런 깊은 곳까지 와주시는 분은 정말 드물어요."',
  '"신선한 물건이 들어왔답니다. 한번 보세요."',
  '"무리하진 마세요. — 살아 돌아오셔야 또 거래할 수 있으니까요."',
  '"가끔은… 운명조차 골드 몇 닢에 살 수 있답니다."',
];

// 앨리스 — 첫 등장 컷씬 (런 당 1회)
const ALICE_INTRO = [
  { img: '../assets/story/prologue-3-cave.png',
    text: '동굴 한가운데 — 어울리지 않는 따뜻한 등불 하나.\n수정과 약병이 가지런히 늘어선, 작은 가게가 자리잡고 있다.' },
  { speaker: 'ignia',
    text: '이그니아 — "…이런 곳에, 가게?"' },
  { speaker: 'alice',
    text: '앨리스 — "어머, 손님이네요. 어서 오세요.\n이런 데까지 내려오는 분은 정말 오랜만이라."' },
  { speaker: 'ignia',
    text: '이그니아 — "…너, 어둠이 무섭지 않아?"' },
  { speaker: 'alice',
    text: '앨리스 — "글쎄요. 어둠이 무서운 사람은… 보통 여기까지 못 내려오죠.\n저는 그저, 필요한 사람에게 필요한 걸 건넬 뿐이에요."' },
  { speaker: 'alice',
    text: '앨리스 — "제 이름은 앨리스. 골드만 있다면, 무엇이든 거래해드려요."' },
  { speaker: 'ignia',
    text: '이그니아 — "…수상한 가게군.\n뭐, 손해 볼 건 없겠지."' },
];

// 아리나 — 첫 등장 컷씬 (런 당 1회)
const BOSS_STORIES = {
  // 1층 — 어둠의 드리아드
  giant: {
    intro: [
      { img: '../assets/story/prologue-3-cave.png',
        text: '으슥한 동굴 안, 갑작스럽게 싱그러운 풀냄새가 코를 찌른다.' },
      { speaker: 'ignia',
        text: '이그니아 — "낯선 냄새가 나는군…"' },
      { img: '../assets/bosses/dryad.png',
        text: '뒤틀린 뿌리들이 일어서고, 보랏빛 안개가 스며 나온다.\n어머니 같던 모습은 어디에도 없다 — 어둠이 그녀를 삼킨 것이다.' },
      { speaker: 'ignia',
        text: '이그니아 — "어둠…\n내가 그토록 찾던 그 냄새였구나!!"' },
      { speaker: 'dryad',
        text: '드리아드 — "불…? 뜨거워…???\n당장 사라져…!!"' },
      { speaker: 'ignia',
        text: '이그니아 — "사라져?\n\n— 그래.\n일단 죽을만큼 불태워주고… 질문은 그다음으로 하지!"' },
    ],
    outro: [
      { img: '../assets/bosses/dryad.png',
        text: '뒤틀린 뿌리들이 잿더미로 무너져 내린다.\n그 사이로, 흐릿한 한 마디가 새어나온다.' },
      { speaker: 'dryad',
        text: '드리아드 — "고맙…다…\n날… 고통에서…"' },
      { speaker: 'ignia',
        text: '이그니아 — "그냥 이용당한 녀석인가…\n하지만…"' },
      { speaker: 'ignia',
        text: '이그니아의 눈이 차갑게 빛난다.\n\n이그니아 — "찾았다 — 어둠."' },
    ],
  },
  // 2층 — 보랏빛 마녀
  lich: {
    intro: [
      { img: '../assets/story/prologue-3-cave.png',
        text: '동굴의 끝…\n그곳에는, 은색 단발의 여자가 있었다.' },
      { speaker: 'witch',
        text: '마녀 — "누구지?"' },
      { speaker: 'ignia',
        text: '이그니아 — "이 냄새는…\n또 어둠이다."' },
      { speaker: 'ignia',
        text: '이그니아 — "또다시 어둠의 힘을 쓰는 녀석인가."' },
      { speaker: 'witch',
        text: '마녀 — "불꽃…?\n불꽃은 이미 다 제거했다고 생각했는데?"' },
      { speaker: 'ignia',
        text: '이그니아 — "…불의 마법을 알아?"' },
      { speaker: 'witch',
        text: '마녀 — "싹을 다 잘라버렸다고 생각했는데…\n잔재인가?"' },
      { speaker: 'ignia',
        text: '이그니아의 손끝에 불꽃이 일어선다 — 그 어떤 때보다도 거세게.\n\n이그니아 — "너…!"' },
      { speaker: 'witch',
        text: '마녀 — "어둠이여… 나에게 힘을."' },
    ],
    outro: [
      { img: '../assets/bosses/witch.png',
        text: '보랏빛 화염이 사그라들며 마녀가 무릎을 꿇는다.' },
      { speaker: 'witch',
        text: '보랏빛 마녀 — "너… 정말로 그자에게… 닿으려는 거니…?"' },
      { speaker: 'ignia',
        text: '이그니아 — "끝까지.\n어둠이 다 타버릴 때까지."' },
    ],
  },
  // 3층 — 심연의 드래곤
  dragon: {
    intro: [
      { img: '../assets/story/prologue-3-cave.png',
        text: '동굴의 가장 깊은 곳…\n공기 자체가 짓눌릴 만큼 묵직해진다.\n\n— 이그니아의 손끝 불꽃마저 숨을 죽인다.' },
      { img: '../assets/bosses/dragon-human.png',
        text: '어둠 속에서 한 명의 여인이 걸어나왔다.\n뿔과 푸른 화염을 두른, 인간이라 부르기엔 너무 위태로운 자.' },
      { speaker: 'dragon',
        text: '심연의 드래곤 — "작은 불꽃아…\n이 어둠은, 너 따위가 감히 만질 수 있는 것이 아니다."' },
      { speaker: 'ignia',
        text: '이그니아 — "그래?\n\n그럼 — 직접 확인해보자."' },
    ],
    // 1페이즈 처치 후 → 부활/변신 트랜지션 (이 outro 끝나면 자동으로 페이즈 2 전투 시작)
    outro: [
      { img: '../assets/bosses/dragon-human.png',
        text: '푸른 화염이 잦아들며, 인간의 형상이 무너져 내린다.' },
      { speaker: 'ignia',
        text: '이그니아 — "끝났다…\n\n아니, 시작이다.\n어둠은, 아직 남아있으니—"' },
      { img: null,
        text: '— 그 순간.' },
      { img: '../assets/bosses/dragon-human.png',
        text: '쓰러져있던 형상이 다시 일어선다.\n살이 부풀어오르고, 뼈가 비명을 지르며 비틀린다.\n푸른 화염이 두 배, 세 배로 폭발한다.' },
      { speaker: 'dragon',
        text: '심연의 드래곤 — "이대로 — 끝낼 수 있을 줄 알았느냐!?\n작은 불꽃이… 감히 — !!"' },
      { img: '../assets/bosses/dragon-true.png',
        text: '인간의 형상은 사라지고, 그 자리에 거대한 어둠의 비룡이 솟아오른다.\n\n— 진정한 심연의 드래곤이, 이제야 모습을 드러냈다.' },
    ],
    phase2: {
      enemyId: 'dragon-true',
      // 페이즈 2 처치 후 진짜 엔딩 outro
      finalOutro: [
        { img: '../assets/bosses/dragon-true.png',
          text: '거대한 어둠의 비룡이 마지막 비명을 토하며 잿더미가 된다.\n\n동굴이 — 처음으로, 조용해졌다.' },
        { speaker: 'ignia',
          text: '이그니아 — "이게 끝이다.\n\n정말로 — 끝이다."' },
      ],
    },
  },
};

function getBossStoryByFloor(floor) {
  const id = ['giant', 'lich', 'dragon'][floor - 1] || 'dragon';
  return BOSS_STORIES[id];
}

function hasSeenPrologue() {
  try { return localStorage.getItem('ignia-prologue-seen') === '1'; } catch (e) { return false; }
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
    gold: bonus.startGold + 30,    // 상인 시드 골드
    boons: [],
    floor: 1,
    roomNum: 0,
    roomsPerFloor: 16,
    pendingFork: null,
    skills: [HERO.defaultSkill || 'fireball'],
    skillCds: {},               // { skillId: turnsRemaining }
    skillStartCdReduce: bonus.startCd,
    enemiesDefeated: 0,
    bossesDefeated: 0,
    phoenixUsed: false,
    history: [],
    shopsOfferedThisFloor: 0,
    tools: [],
    bondsMet: [],
    bond: game.meta.bond || null,
    bondUsedThisFloor: false,
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
// 가중치: 적 70% (그중 엘리트 20%), 보물 8%, 샘물 8%, 상자 7%, 상인 7%
const NODE_TEMPLATES = {
  combat:   { type: 'combat',   kind: 'normal',   icon: '⚔', name: '적 조우' },
  elite:    { type: 'elite',    kind: 'elite',    icon: '☠', name: '엘리트' },
  treasure: { type: 'treasure', kind: 'treasure', icon: '💰', name: '보물' },
  rest:     { type: 'rest',     kind: 'rest',     icon: '💧', name: '샘물' },
  chest:    { type: 'chest',    kind: 'chest',    icon: '📦', name: '의문의 상자' },
  shop:     { type: 'shop',     kind: 'shop',     icon: '🏪', name: '앨리스의 가게' },
  bond:     { type: 'event',    kind: 'bond',     icon: '🌟', name: '인연' },
};

function rollNodeTemplate() {
  const r = Math.random();
  if (r < 0.08) return NODE_TEMPLATES.bond; // 무작위 이벤트 — 인연
  if (r < 0.72) {
    // 적 — 그중 20%가 엘리트
    return Math.random() < 0.20 ? NODE_TEMPLATES.elite : NODE_TEMPLATES.combat;
  }
  if (r < 0.80) return NODE_TEMPLATES.treasure;
  if (r < 0.87) return NODE_TEMPLATES.rest;
  if (r < 0.93) return NODE_TEMPLATES.chest;
  return NODE_TEMPLATES.shop;
}

// ===== 상점 아이템 =====
const SHOP_ITEMS = [
  { id: 'shop-heal',     name: '회복 물약',   icon: '🧪', desc: 'HP +30',         price: 30, apply: g => { g.hp = Math.min(g.maxHp, g.hp + 30); } },
  { id: 'shop-fullheal', name: '대정수',      icon: '💎', desc: 'HP 완전 회복',   price: 80, apply: g => { g.hp = g.maxHp; } },
  { id: 'shop-maxhp',    name: '체력의 비석', icon: '🩸', desc: '최대 HP +20',    price: 70, apply: g => { g.maxHp += 20; g.hp += 20; } },
  { id: 'shop-atk',      name: '강철검',      icon: '⚔',  desc: '공격력 +3',      price: 55, apply: g => { g.atk += 3; } },
  { id: 'shop-mag',      name: '마력 결정',   icon: '✨', desc: '마법력 +4',      price: 55, apply: g => { g.mag += 4; } },
  { id: 'shop-crit',     name: '행운 부적',   icon: '🍀', desc: '치명타 +5%',     price: 70, apply: g => {
    g.boons.push({ id: 'shop-crit-' + Date.now() + '-' + Math.floor(Math.random()*1e6), rarity: 'shop', mod: { critChance: 0.05 }, name: '행운 부적', desc: '치명타 +5%' });
  }},
  { id: 'shop-skillcd',  name: '시계 톱니',   icon: '⏱', desc: '스킬 시작 쿨다운 -1', price: 90, apply: g => { g.skillStartCdReduce -= 1; } },
];

function generateFork() {
  const r = game.run;
  // 두 갈래 — 같은 타입이어도 보상 카테고리는 다르게
  let a = rollNodeTemplate();
  let b = rollNodeTemplate();
  // 상인의 가호 — 한쪽은 무조건 상점
  const wantMerchant = !!hasBoonMod('forkMerchant');
  // 페어 보장 — 한 층에 최소 2회 상점이 옵션으로 등장하도록 막판 보정
  const offered = r.shopsOfferedThisFloor || 0;
  const shortage = Math.max(0, 2 - offered);
  const forksRemaining = r.roomsPerFloor - r.roomNum + 1;
  const pity = shortage >= forksRemaining;
  if ((wantMerchant || pity) && a.type !== 'shop' && b.type !== 'shop') {
    if (Math.random() < 0.5) a = NODE_TEMPLATES.shop;
    else b = NODE_TEMPLATES.shop;
  }
  if (a.type === 'shop' || b.type === 'shop') {
    r.shopsOfferedThisFloor = offered + 1;
  }
  const da = decorateNode(a);
  return [da, decorateNode(b, da.rewardCat)];
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
  if (r === 'unstable') return 'unstable';
  return r === 'common' ? 'rare' : r === 'rare' ? 'epic' : r === 'epic' ? 'legendary' : 'legendary';
}

function nextStep() {
  const r = game.run;
  // 직전 노드가 보스였으면 → 다음 층
  if (r.currentNode && r.currentNode.kind === 'boss') {
    r.floor++;
    if (r.floor > 3) { endRun(true); return; }
    r.roomNum = 1;
    r.shopsOfferedThisFloor = 0;
    r.bondUsedThisFloor = false;
    // 연금술사 — 매 층 시작 시 무작위 도구 1개
    const alch = hasBoonMod('toolEachFloor');
    if (alch) {
      const n = alch.mod.toolEachFloor || 1;
      for (let i = 0; i < n; i++) addTool(r, randomToolId());
    }
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
    const node = { id: 'boss', type: 'combat', kind: 'boss', rewardCat: 'utility', rewardRarity: 'legendary' };
    const story = getBossStoryByFloor(r.floor);
    if (story && story.intro && story.intro.length) {
      playStorySequence(story.intro, () => startBattle('boss', node), { finalLabel: '전투 ⚔' });
    } else {
      startBattle('boss', node);
    }
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
  if (window.AUDIO) {
    if (node.type === 'event' && node.kind === 'bond') AUDIO.sfx('arina');
    else if (node.type === 'rest') AUDIO.sfx('spring');
    else if (node.type === 'shop') AUDIO.sfx('shop');
    else if (node.type === 'treasure' || node.type === 'chest') AUDIO.sfx('coin');
    else AUDIO.sfx('fork');
  }
  game.run.pendingFork = null;
  // 진행 기록
  game.run.history = game.run.history || [];
  game.run.history.push({ type: node.type, kind: node.kind, icon: node.icon, name: node.name, rewardCat: node.rewardCat, rewardRarity: node.rewardRarity });
  if (node.type === 'combat') startBattle('normal', node);
  else if (node.type === 'elite') startBattle('elite', node);
  else if (node.type === 'boon') openBoonScreen('신비한 사당', node.rewardCat, node.rewardRarity);
  else if (node.type === 'rest') openRest(node);
  else if (node.type === 'treasure') openTreasure(node);
  else if (node.type === 'chest') openChest(node);
  else if (node.type === 'shop') openShop(node);
  else if (node.type === 'event' && node.kind === 'bond') openBondEvent(node);
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
  else if (kind === 'mimic') ePool = ['mimic'];
  const eid = (node && node.forceEnemy) ? node.forceEnemy : ePool[Math.floor(Math.random() * ePool.length)];
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
      burnStacks: [],
    },
    turn: 1,
    attackCd: 0,
    firstAtkUsed: false,
    firstHitReduced: false,
    heroDefend: 0,
    heroBurn: 0,
    lastAction: null,
    log: [],
    over: false,
    toolDmgBoost: 0,
  };
  $('enemy-name').textContent = def.name + (kind === 'elite' ? ' (엘리트)' : kind === 'boss' ? ' (보스)' : '');
  const art = $('enemy-art');
  if (def.sprite) {
    art.classList.add('with-sprite');
    art.innerHTML = `<img class="enemy-sprite" src="${def.sprite}" alt="${def.name}">`;
    art.style.fontSize = '';
  } else {
    art.classList.remove('with-sprite');
    art.innerHTML = '';
    art.textContent = def.emoji;
    art.style.fontSize = def.boss ? '90px' : '70px';
  }
  $('hero-img').src = HERO.sprite;
  game.run._heroSpriteWounded = false;
  // 점화 가호 — 전투 시작 시 자동 화상
  const sb = hasBoonMod('startBurn');
  if (sb && sb.mod && sb.mod.startBurn) {
    const lv = sb.level || 1;
    applyBurn(game.run.battle.enemy, sb.mod.startBurn.dmg * lv, sb.mod.startBurn.turns);
  }
  refreshBattleUI();
  $('battle-log').innerHTML = '';
  log(`${def.name} 출현!`, 'system');
  if (sb) log('점화! 적이 불타기 시작한다', 'hero');
  showScreen('battle');
  // 전투 BGM
  if (window.AUDIO) AUDIO.music(kind === 'boss' ? 'boss' : 'battle');
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
  // 부상 일러스트 — HP 40% 이하에서 교체, 회복 시 원래 스프라이트로 복귀
  const woundedSrc = HERO.spriteWounded;
  if (woundedSrc) {
    const shouldWound = r.hp / r.maxHp <= 0.4 && r.hp > 0;
    if (shouldWound !== r._heroSpriteWounded) {
      r._heroSpriteWounded = shouldWound;
      $('hero-img').src = shouldWound ? woundedSrc : HERO.sprite;
    }
  }
  $('turn-num').textContent = b.turn;
  $('hud-floor').textContent = r.floor;
  $('hud-room').textContent = r.roomNum;
  $('hud-rooms').textContent = r.roomsPerFloor;
  $('hud-hp').textContent = r.hp;
  $('hud-gold').textContent = r.gold;
  // 스킬 버튼 표시
  refreshSkillButton();
  // 공격 버튼 (쿨다운 표시)
  const atkBtn = document.querySelector('[data-action="attack"]');
  if (atkBtn) {
    if (b.attackCd > 0) {
      atkBtn.disabled = true;
      atkBtn.querySelector('.sub').textContent = `${b.attackCd}턴 후`;
    } else {
      atkBtn.disabled = false;
      atkBtn.querySelector('.sub').textContent = '기본 공격';
    }
  }
  // 인연각성 — 결속 시에만 노출
  const ultRow = $('ult-row');
  if (ultRow) {
    if (r.bond && BONDS[r.bond]) {
      ultRow.classList.remove('hidden');
      const bond = BONDS[r.bond];
      const ico = $('ult-ico'); const nameEl = $('ult-name'); const sub = $('ult-sub');
      if (ico) ico.textContent = bond.icon;
      if (nameEl) nameEl.textContent = `인연각성 — ${bond.skillName}`;
      const ultBtn = $('ult-btn');
      if (r.bondUsedThisFloor) {
        if (ultBtn) ultBtn.disabled = true;
        if (sub) sub.textContent = '이 층에서 사용함 (다음 층에서 회복)';
      } else {
        if (ultBtn) ultBtn.disabled = false;
        if (sub) sub.textContent = `${bond.name} — ${bond.desc}`;
      }
    } else {
      ultRow.classList.add('hidden');
    }
  }
  // 도구 버튼
  const toolBtn = document.querySelector('[data-action="tool"]');
  if (toolBtn) {
    const tools = r.tools || [];
    const subEl = toolBtn.querySelector('.sub');
    const icoEl = toolBtn.querySelector('.ico');
    const labEl = toolBtn.querySelector('.label');
    if (tools.length === 0) {
      toolBtn.disabled = true;
      icoEl.textContent = '🧰';
      labEl.textContent = '도구';
      if (subEl) subEl.textContent = '없음';
    } else {
      toolBtn.disabled = false;
      const unique = [...new Set(tools)];
      if (unique.length === 1) {
        const t = TOOLS[unique[0]];
        icoEl.textContent = t.icon;
        labEl.textContent = t.name;
        if (subEl) subEl.textContent = `×${tools.length}`;
      } else {
        icoEl.textContent = '🧰';
        labEl.textContent = '도구';
        if (subEl) subEl.textContent = `${tools.length}개 (${unique.length}종)`;
      }
    }
  }
  // 상태 표시
  const heroStatus = $('hero-status');
  heroStatus.innerHTML = '';
  if (b.heroDefend > 0) heroStatus.innerHTML = '<span class="status-chip defend">방어</span>';
  const enemyStatus = $('enemy-status');
  enemyStatus.innerHTML = '';
  const stacks = b.enemy.burnStacks || [];
  if (stacks.length > 0) {
    const dot = stacks.reduce((s, st) => s + st.dmg, 0);
    enemyStatus.innerHTML += `<span class="status-chip burn">🔥 화상 ${stacks.length}중첩 (${dot}/턴)</span>`;
  }
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
  const b = game.run.battle;
  if (b.over) return;
  if (action === 'attack') {
    if (b.attackCd > 0) return;
    doAttack();
  }
  else if (action === 'skill') openSkillPicker();
  else if (action === 'defend') doDefend();
  else if (action === 'tool') openToolPicker();
  else if (action === 'flee') doFlee();
  else if (action === 'ult') useBond();
}

// ===== 인연각성 =====
function useBond() {
  const r = game.run;
  const b = r.battle;
  if (!r.bond || !BONDS[r.bond]) { log('계약된 동료가 없다.', 'system'); return; }
  if (r.bondUsedThisFloor) { log('이 층에서는 이미 인연각성을 사용했다.', 'system'); return; }
  const bond = BONDS[r.bond];
  r.bondUsedThisFloor = true;
  refreshBattleUI();
  // 컷씬: 일러 + 대사 → 효과
  playStorySequence(
    [{ img: bond.art, text: `🌟 인연각성 — ${bond.skillName}\n\n${bond.quote}` }],
    () => { showScreen('battle'); applyBondEffect(bond); },
    { finalLabel: '발동 ▶' }
  );
}

function applyBondEffect(bond) {
  const r = game.run;
  const b = r.battle;
  if (window.AUDIO) AUDIO.sfx('legendary');
  if (bond.id === 'alice') {
    const heal = r.maxHp - r.hp;
    r.hp = r.maxHp;
    const shield = Math.round(heal * 0.5) + Math.round(r.maxHp * 0.10);
    b.heroShield = (b.heroShield || 0) + shield;
    showDmgNum('hero', heal, 'heal');
    log(`✨ 초특급 회복물약 — HP 100% + 보호막 ${shield}`, 'hero');
  } else if (bond.id === 'arina') {
    b.enemyStunTurns = (b.enemyStunTurns || 0) + 3;
    log(`💜 거부할 수 없는 매혹 — ${b.enemy.name} 3턴 행동 불가`, 'hero');
  } else if (bond.id === 'reyna') {
    const dmg = Math.round(effectiveStat('atk') * 5);
    dealDamageToEnemy(dmg, 'crit');
    b.enemyAtkDebuff = { mul: 0.5, turns: 3 };
    log(`⚔ 맹렬한 상처 → ${dmg} + 적 공격력 -50% (3턴)`, 'hero');
  } else if (bond.id === 'luna') {
    const dmg = Math.round(effectiveStat('mag') * 5);
    dealDamageToEnemy(dmg, 'crit');
    b.skillExtraAttackTurns = 3;
    log(`🌙 바람의 메아리 → ${dmg} + 3턴간 스킬 시 일반공격 추가타`, 'hero');
  }
  refreshBattleUI();
  if (b.enemy.hp <= 0) {
    setTimeout(() => onEnemyDefeat(), 500);
  } else {
    endTurnHero();
  }
}

// ===== 도구 헬퍼 =====
function openToolPicker() {
  const r = game.run;
  if (!r.tools || r.tools.length === 0) return;
  if (r.battle.over) return;
  // 1종류만 보유 → 바로 사용
  const unique = [...new Set(r.tools)];
  if (unique.length === 1) { useTool(unique[0]); return; }
  const modal = $('tool-picker');
  const wrap = $('tool-picker-list');
  wrap.innerHTML = '';
  // 종류별 카운트
  const counts = {};
  for (const id of r.tools) counts[id] = (counts[id] || 0) + 1;
  for (const id of Object.keys(counts)) {
    const t = TOOLS[id];
    const card = document.createElement('button');
    card.className = 'skill-card';
    card.innerHTML = `
      <div class="sc-ico">${t.icon}</div>
      <div class="sc-name">${t.name} ×${counts[id]}</div>
      <div class="sc-desc">${t.desc}</div>
      <div class="sc-cd">사용</div>`;
    card.addEventListener('click', () => {
      modal.classList.remove('active');
      useTool(id);
    });
    wrap.appendChild(card);
  }
  modal.classList.add('active');
}
function closeToolPicker() { $('tool-picker').classList.remove('active'); }

function useTool(id) {
  const r = game.run;
  const b = r.battle;
  if (!TOOLS[id]) return;
  const idx = r.tools.indexOf(id);
  if (idx < 0) return;
  const potencyBonus = 1 + (hasBoonMod('toolPotency') ? hasBoonMod('toolPotency').mod.toolPotency : 0);
  const t = TOOLS[id];
  let endsTurn = true;
  if (window.AUDIO) {
    if (id === 'bomb') AUDIO.sfx('bomb');
    else if (id === 'potion' || id === 'greater') AUDIO.sfx('potion');
    else if (id === 'smoke' || id === 'bulwark') AUDIO.sfx('defend');
    else if (id === 'cooldown') AUDIO.sfx('select');
    else if (id === 'haste') AUDIO.sfx('skill');
    else AUDIO.sfx('tool');
  }
  if (id === 'potion') {
    const heal = Math.round(50 * potencyBonus);
    healHero(heal);
    log(`🧪 체력 포션 — HP +${heal}`, 'hero');
  } else if (id === 'greater') {
    const heal = Math.round(120 * potencyBonus);
    healHero(heal);
    log(`❤️ 상급 포션 — HP +${heal}`, 'hero');
  } else if (id === 'bomb') {
    const dmg = Math.round(40 * potencyBonus);
    const burnDmg = Math.round(12 * potencyBonus);
    b.enemy.hp = Math.max(0, b.enemy.hp - dmg);
    showDmgNum('enemy', dmg, 'magic');
    log(`💣 불꽃 폭탄 → ${dmg}`, 'hero');
    applyBurn(b.enemy, burnDmg, 4);
  } else if (id === 'smoke') {
    b.heroDefend = 1.0;
    log(`💨 연막탄 — 다음 적 공격 회피`, 'hero');
  } else if (id === 'bulwark') {
    b.heroDefend = 0.8;
    healHero(Math.round(15 * potencyBonus));
    log(`🛡️ 방벽석 — 데미지 -80% + HP +${Math.round(15 * potencyBonus)}`, 'hero');
  } else if (id === 'cooldown') {
    for (const sid of Object.keys(r.skillCds)) r.skillCds[sid] = 0;
    log(`💎 냉각의 결정 — 모든 쿨다운 초기화`, 'hero');
    endsTurn = false; // 즉시 행동 가능
  } else if (id === 'haste') {
    b.toolDmgBoost = 0.3;
    log(`⏳ 각성의 모래 — 이번 전투 데미지 +30%`, 'hero');
  }
  r.tools.splice(idx, 1);
  refreshBattleUI();
  if (endsTurn) endTurnHero();
}

// ===== 스킬 헬퍼 =====
function getSkillCooldown(skillId) {
  const base = SKILLS[skillId].cooldown;
  const startCd = game.run.skillStartCdReduce || 0;   // 음수
  const reduce = getBoonModSum('skillCdReduce');
  let cd = base + startCd - reduce;
  if (hasBoonMod('skillCdHalf')) cd = Math.ceil(cd / 2);
  // 쌍수 — 스킬 쿨다운 ×N 페널티
  const cdMul = hasBoonMod('skillCdMul') ? hasBoonMod('skillCdMul').mod.skillCdMul : 1;
  if (cdMul > 1) cd = Math.ceil(cd * cdMul);
  return Math.max(1, cd);
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

// ===== 화상 (스택형) =====
function applyBurn(target, dmg, turns) {
  if (!dmg || !turns) return;
  if (!target.burnStacks) target.burnStacks = [];
  target.burnStacks.push({ dmg: Math.round(dmg), turns });
}

function tickBurns(target) {
  const stacks = target.burnStacks || [];
  if (stacks.length === 0) return 0;
  let total = 0;
  for (const st of stacks) total += st.dmg;
  if (!hasBoonMod('eternalBurn')) {
    for (const st of stacks) st.turns--;
    target.burnStacks = stacks.filter(s => s.turns > 0);
  }
  return total;
}

function detonateBurns(target) {
  const stacks = target.burnStacks || [];
  const count = stacks.length;
  target.burnStacks = [];
  return count;
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

function getBoonLevel(id) {
  const b = game.run.boons.find(x => x.id === id);
  return b ? (b.level || 1) : 0;
}

// 가호의 레벨별 효과 텍스트 — UI 표시용
function getBoonEffectAtLevel(boon, level) {
  if (!boon) return '';
  const m = boon.mod || {};
  const pct = (v) => `${Math.round(v * 100)}%`;
  switch (boon.id) {
    case 'b-warmup':         return `첫 공격 +${pct(m.firstAtkBonus * level)}`;
    case 'b-bulwark':        return `첫 피격 -${pct(Math.min(1, m.firstHitReduce * level))}`;
    case 'b-spark':          return `시작 화상 ${m.startBurn.dmg * level} / ${m.startBurn.turns}턴`;
    case 'b-bargain':        return `골드 +${pct(m.goldMul * level)}`;
    case 'b-overheat':       return `HP 50% 이하 마법 +${pct(m.lowHpMagBonus * level)}`;
    case 'b-bloodlust':      return `HP 30% 이하 공격 +${pct(m.lowHpAtkBonus * level)}`;
    case 'b-crit':           return `치명 확률 +${pct(m.critChance * level)}`;
    case 'b-thorns':         return `가시 반사 ${m.thorns * level}`;
    case 'b-quick':          return `스킬 쿨다운 -${m.skillCdReduce * level}`;
    case 'b-fortune':        return `치명 +${pct(m.critChance * level)} · 골드 +${50 * level} 누적`;
    case 'b-vamp':           return `공격 흡혈 ${pct(m.attackLifesteal * level)}`;
    case 'b-mag-vamp':       return `마법 흡혈 ${pct(m.magLifesteal * level)}`;
    case 'b-burn-mark':      return `화상 ×${m.burnMul * level} · 지속 +${m.burnTurnsBonus * level}턴`;
    case 'b-toolkit-mastery':return `도구 효과 +${pct(m.toolPotency * level)}`;
    case 'b-alchemist':      return `시작 도구 ×${level} · 매 층 도구 ×${level}`;
    case 'b-herbalist':      return `시작 「체력 포션」 ×${2 * level}`;
    case 'b-tool-belt':      return `시작 무작위 도구 ×${3 * level}`;
    default:                 return boon.desc || '';
  }
}

function getBoonModSum(key) {
  let sum = 0;
  for (const b of game.run.boons) {
    if (b.mod && typeof b.mod[key] === 'number') sum += b.mod[key] * (b.level || 1);
  }
  return sum;
}

function doAttack() {
  const b = game.run.battle;
  const r = game.run;
  if (window.AUDIO) AUDIO.sfx('attack');
  const atkMulti = hasBoonMod('atkMulti') ? hasBoonMod('atkMulti').mod.atkMulti : 1;
  const flameBrand = !!hasBoonMod('flameBrand');
  const knightCombo = !!hasBoonMod('magicKnight') && b.lastAction === 'magic';
  for (let i = 0; i < atkMulti; i++) {
    if (b.enemy.hp <= 0) break;
    // 화염낙인 — 공격에 마법력 합산
    let dmg = effectiveStat('atk') + (flameBrand ? effectiveStat('mag') : 0);
    // 마법기사 콤보 — 직전이 마법이면 +50%
    if (knightCombo) dmg = Math.round(dmg * 1.5);
    // 광폭 — HP 30% 이하 시 공격력 부스트
    const lowAtk = getBoonModSum('lowHpAtkBonus');
    if (lowAtk > 0 && r.hp / r.maxHp < 0.3) dmg = Math.round(dmg * (1 + lowAtk));
    // 예열 — 매 전투 첫 공격 부스트 (atkMulti 첫 hit 만)
    if (!b.firstAtkUsed) {
      const fab = getBoonModSum('firstAtkBonus');
      if (fab > 0) dmg = Math.round(dmg * (1 + fab));
      b.firstAtkUsed = true;
    }
    // 회피
    if (b.enemy.def.dodge && Math.random() < b.enemy.def.dodge) {
      log(`이그니아의 공격 — 회피됨!`, 'enemy');
      continue;
    }
    // 치명타
    let crit = false;
    const critC = getBoonModSum('critChance');
    if (Math.random() < critC) { dmg = Math.round(dmg * 1.5); crit = true; if (window.AUDIO) AUDIO.sfx('crit'); }
    // 방패병 감소
    if (b.enemy.def.defReduce) dmg = Math.round(dmg * (1 - b.enemy.def.defReduce));
    dealDamageToEnemy(dmg, crit ? 'crit' : '');
    // 공격 흡혈
    const ls = getBoonModSum('attackLifesteal');
    if (ls > 0) {
      const heal = Math.round(dmg * ls);
      healHero(heal);
    }
    // 화염낙인 — 화상 스택 추가
    if (flameBrand && b.enemy.hp > 0) {
      applyBurn(b.enemy, Math.max(3, Math.round(effectiveStat('mag') * 0.25)), 2);
    }
    const tag = crit ? ' (치명타!)' : '';
    const brandTag = flameBrand ? ' 🔥' : '';
    const comboTag = knightCombo && i === 0 ? ' [마법기사]' : '';
    log(`이그니아의 공격 → ${dmg}${tag}${brandTag}${comboTag}`, 'hero');
    if (b.enemy.hp <= 0) break;
  }
  // 마법기사 — 공격 후 lastAction 갱신
  if (hasBoonMod('magicKnight')) b.lastAction = 'attack';
  // 시간 왜곡 / 이중 시전 — 공격 쿨다운 발동
  const aCd = hasBoonMod('attackCdMax') ? hasBoonMod('attackCdMax').mod.attackCdMax : 0;
  if (aCd > 0) b.attackCd = aCd;
  endTurnHero();
}

function castSkill(skillId) {
  const r = game.run;
  const b = r.battle;
  const s = SKILLS[skillId];
  if (!s) return;
  if (window.AUDIO) {
    if (skillId === 'meteor') AUDIO.sfx('meteor');
    else if (skillId === 'firedom' || skillId === 'inferno' || skillId === 'firestorm' || skillId === 'flamethrower') AUDIO.sfx('fire');
    else AUDIO.sfx('skill');
  }
  if (getSkillCdNow(skillId) > 0) return;
  // cut-in (스킬별 일러스트)
  playCutin(s.name, s.quote, s.cutin);
  const skillMulti = hasBoonMod('skillMulti') ? hasBoonMod('skillMulti').mod.skillMulti : 1;
  const knightCombo = !!hasBoonMod('magicKnight') && b.lastAction === 'attack';
  const knightMul = knightCombo ? 1.5 : 1;
  // 점화 — 적의 모든 화상 스택을 소진해 큰 폭발
  if (s.special === 'detonateBurn') {
    setTimeout(() => {
      const count = detonateBurns(b.enemy);
      if (count <= 0) {
        log(`${s.name} — 화상이 없다!`, 'system');
      } else {
        let dmg = Math.round(effectiveStat('mag') * 1.5 * count * knightMul);
        dealDamageToEnemy(dmg, 'crit');
        log(`${s.name}! → ${count}중첩 폭발 → ${dmg}${knightCombo ? ' [마법기사]' : ''}`, 'hero');
      }
      r.skillCds[skillId] = getSkillCooldown(skillId);
      if (hasBoonMod('magicKnight')) b.lastAction = 'magic';
      finishHeroSkill();
    }, 800);
    return;
  }
  // 지연 폭발 스킬 (불의 지배 등)
  if (s.delay) {
    setTimeout(() => {
      const dmg = Math.round(effectiveStat('mag') * s.delayMul * skillMulti * knightMul);
      b.enemy.dominion = { delay: s.delay, dmg, name: s.name };
      log(`${s.name} 각인 — ${s.delay}턴 후 폭발 (${dmg})${knightCombo ? ' [마법기사]' : ''}`, 'hero');
      r.skillCds[skillId] = getSkillCooldown(skillId);
      if (hasBoonMod('magicKnight')) b.lastAction = 'magic';
      finishHeroSkill();
    }, 800);
    return;
  }
  setTimeout(() => {
    const bmBoon = hasBoonMod('burnMul');
    const burnMul = bmBoon ? bmBoon.mod.burnMul * (bmBoon.level || 1) : 1;
    const burnBonus = getBoonModSum('burnTurnsBonus');
    const burnDmg = Math.round(s.burnDmg * burnMul);
    const burnTurns = s.burnTurns + burnBonus;
    const critBase = getBoonModSum('critChance');
    const ls = getBoonModSum('magLifesteal');
    let totalDmg = 0;
    let totalHits = 0;
    for (let cast = 0; cast < skillMulti; cast++) {
      if (b.enemy.hp <= 0) break;
      for (let i = 0; i < s.hits; i++) {
        if (b.enemy.hp <= 0) break;
        let dmg = Math.round(effectiveStat('mag') * s.mul * knightMul);
        // 과열 — HP 50% 이하 시 마법 부스트
        const lowMag = getBoonModSum('lowHpMagBonus');
        if (lowMag > 0 && r.hp / r.maxHp < 0.5) dmg = Math.round(dmg * (1 + lowMag));
        let crit = false;
        const critChance = critBase + (s.critBonus || 0);
        if (Math.random() < critChance) { dmg = Math.round(dmg * 1.5); crit = true; }
        dealDamageToEnemy(dmg, crit ? 'crit' : '');
        totalDmg += dmg;
        totalHits++;
        // 마법 흡혈
        if (ls > 0) healHero(Math.round(dmg * ls));
      }
    }
    // 화상 적용 (있으면) — 시전 횟수만큼 스택 추가
    if (burnTurns > 0 && burnDmg > 0 && b.enemy.hp > 0) {
      for (let cast = 0; cast < skillMulti; cast++) applyBurn(b.enemy, burnDmg, burnTurns);
      log(`${s.name}! → 총 ${totalDmg} (${totalHits}타) + 화상 ${skillMulti}중첩${knightCombo ? ' [마법기사]' : ''}`, 'hero');
    } else {
      log(`${s.name}! → 총 ${totalDmg} (${totalHits}타)${knightCombo ? ' [마법기사]' : ''}`, 'hero');
    }
    r.skillCds[skillId] = getSkillCooldown(skillId);
    if (hasBoonMod('magicKnight')) b.lastAction = 'magic';
    finishHeroSkill();
  }, 800);
}

function finishHeroSkill() {
  const b = game.run.battle;
  // 바람의 메아리 — 스킬 시 일반 공격 추가타
  if (b.skillExtraAttackTurns && b.skillExtraAttackTurns > 0 && b.enemy.hp > 0) {
    const extra = Math.round(effectiveStat('atk') * 0.6);
    if (window.AUDIO) AUDIO.sfx('attack');
    dealDamageToEnemy(extra, '');
    log(`바람의 메아리 — 추가 일반공격 → ${extra}`, 'hero');
  }
  endTurnHero();
}

function doDefend() {
  const b = game.run.battle;
  if (window.AUDIO) AUDIO.sfx('defend');
  if (hasBoonMod('defendPerfect')) {
    b.heroDefend = 0.8;
    healHero(10);
    log('강력 방어! 데미지 -80% + HP +10', 'hero');
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
    if (window.AUDIO) AUDIO.sfx('cancel');
    return;
  }
  if (window.AUDIO) AUDIO.sfx('flee');
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
  if (b.toolDmgBoost) dmg = Math.round(dmg * (1 + b.toolDmgBoost));
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
  if (window.AUDIO) AUDIO.sfx('heal');
  showDmgNum('hero', heal, 'heal');
  refreshBattleUI();
}

function dealDamageToHero(dmg) {
  const r = game.run;
  const b = r.battle;
  // 굳건한 자세 — 매 전투 첫 피격 감소
  if (!b.firstHitReduced) {
    const fhr = Math.min(1, getBoonModSum('firstHitReduce'));
    if (fhr > 0) {
      dmg = Math.round(dmg * (1 - fhr));
      b.firstHitReduced = true;
      log('굳건한 자세 — 첫 피격 감소', 'system');
    }
  }
  // 방어
  if (b.heroDefend > 0) dmg = Math.round(dmg * (1 - b.heroDefend));
  // 보호막 — 먼저 흡수
  if (b.heroShield && b.heroShield > 0 && dmg > 0) {
    const absorbed = Math.min(b.heroShield, dmg);
    b.heroShield -= absorbed;
    dmg -= absorbed;
    log(`보호막이 ${absorbed} 흡수 (남은 보호막 ${b.heroShield})`, 'hero');
  }
  r.hp = Math.max(0, r.hp - dmg);
  if (window.AUDIO && dmg > 0) AUDIO.sfx('hit');
  showDmgNum('hero', dmg);
  hitFlash('hero');
  refreshBattleUI();
  // 가시
  const thorns = getBoonModSum('thorns');
  if (thorns > 0) {
    setTimeout(() => {
      b.enemy.hp = Math.max(0, b.enemy.hp - thorns);
      if (window.AUDIO) AUDIO.sfx('thorn');
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
  // 화상 도트 (스택별 합산)
  if (b.enemy.hp > 0) {
    const burnTotal = tickBurns(b.enemy);
    if (burnTotal > 0) {
      b.enemy.hp = Math.max(0, b.enemy.hp - burnTotal);
      showDmgNum('enemy', burnTotal, 'burn');
      log(`화상 도트 → ${burnTotal}`, 'system');
      refreshBattleUI();
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
  // 거부할 수 없는 매혹 — 적 행동 불가
  if (b.enemyStunTurns && b.enemyStunTurns > 0) {
    b.enemyStunTurns--;
    log(`${b.enemy.name} — 매혹 상태! 행동 불가 (남은 ${b.enemyStunTurns}턴)`, 'enemy');
    if (b.enemyAtkDebuff && b.enemyAtkDebuff.turns > 0) b.enemyAtkDebuff.turns--;
    if (b.skillExtraAttackTurns && b.skillExtraAttackTurns > 0) b.skillExtraAttackTurns--;
    b.heroDefend = 0;
    b.turn++;
    for (const id of Object.keys(game.run.skillCds)) {
      if (game.run.skillCds[id] > 0) game.run.skillCds[id]--;
    }
    if (b.attackCd > 0) b.attackCd--;
    refreshBattleUI();
    return;
  }
  let dmg = b.enemy.atk;
  // 맹렬한 상처 — 적 공격력 디버프
  if (b.enemyAtkDebuff && b.enemyAtkDebuff.turns > 0) {
    dmg = Math.round(dmg * b.enemyAtkDebuff.mul);
  }
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
  // 공격 쿨다운 -1 (시간 왜곡 가호)
  if (b.attackCd > 0) b.attackCd--;
  // 인연각성 버프 지속 -1
  if (b.enemyAtkDebuff && b.enemyAtkDebuff.turns > 0) b.enemyAtkDebuff.turns--;
  if (b.skillExtraAttackTurns && b.skillExtraAttackTurns > 0) b.skillExtraAttackTurns--;
  // 매 턴 recoil HP 손실 (광기의 화염 등)
  const recoil = getBoonModSum('recoil');
  if (recoil > 0 && game.run.hp > 1) {
    game.run.hp = Math.max(1, game.run.hp - recoil);
    log(`광기의 대가 — HP -${recoil}`, 'system');
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
  if (window.AUDIO) {
    AUDIO.sfx(b.enemy.def.boss ? 'fanfare' : 'death');
    if (b.enemy.def.boss) setTimeout(() => AUDIO.sfx('coin'), 300);
  }
  // 보상 골드
  let gold = 10 + game.run.floor * 5 + (b.enemy.kind === 'elite' ? 25 : 0) + (b.enemy.def.boss ? 60 : 0);
  const goldMul = getBoonModSum('goldMul');
  if (goldMul > 0) gold = Math.round(gold * (1 + goldMul));
  game.run.gold += gold;
  if (window.AUDIO) AUDIO.sfx('coin');
  log(`+${gold} 골드`, 'system');
  // 도구 마스터 — 엘리트/보스 처치 시 무작위 도구 1개
  if (hasBoonMod('toolOnElite') && (b.enemy.kind === 'elite' || b.enemy.def.boss)) {
    const tid = randomToolId();
    addTool(game.run, tid);
    log(`도구 획득! ${TOOLS[tid].icon} ${TOOLS[tid].name}`, 'system');
  }
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
    let isBoss = false;
    if (b.enemy.kind === 'boss') {
      context = '보스 처치!';
      rarity = 'epic';
      isBoss = true;
    } else if (b.enemy.kind === 'elite') {
      context = '엘리트 처치!';
      rarity = node.rewardRarity || 'rare';
    } else if (node.id === 'first') {
      context = '첫 전투 승리!';
    }
    // 보스 처치 시 아웃트로 → 가호 화면
    if (isBoss) {
      const story = getBossStoryByFloor(game.run.floor);
      // 페이즈 2 가 정의된 보스
      if (story && story.phase2) {
        if (b.enemy.id !== story.phase2.enemyId) {
          // 페이즈 1 클리어 — 트랜지션 outro 끝나면 페이즈 2 전투 자동 시작 (가호 화면 없음)
          playStorySequence(story.outro, () => {
            startBattle('boss', {
              id: 'boss-p2', type: 'combat', kind: 'boss',
              rewardCat: 'utility', rewardRarity: 'legendary',
              forceEnemy: story.phase2.enemyId,
            });
          }, { finalLabel: '!! 전투 ⚔' });
          return;
        }
        // 페이즈 2 클리어 — 진짜 outro 후 가호 화면
        if (story.phase2.finalOutro && story.phase2.finalOutro.length) {
          playStorySequence(story.phase2.finalOutro, () => openBoonScreen(context, cat, rarity), { finalLabel: '계속 ▶' });
          return;
        }
      }
      // 일반 보스 — 기존 outro 흐름
      if (story && story.outro && story.outro.length) {
        playStorySequence(story.outro, () => openBoonScreen(context, cat, rarity), { finalLabel: '계속 ▶' });
        return;
      }
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
    common:    { common: 56, rare: 28, epic: 9,  legendary: 0,  unstable: 7 },
    rare:      { common: 28, rare: 47, epic: 16, legendary: 2,  unstable: 7 },
    epic:      { common: 0,  rare: 28, epic: 51, legendary: 14, unstable: 7 },
    legendary: { common: 0,  rare: 0,  epic: 38, legendary: 55, unstable: 7 },
  }[rarityFloor] || { common: 56, rare: 28, epic: 9, legendary: 0, unstable: 7 };
  // 보유 중이지만 최대 레벨에 도달한 가호만 제외 (레벨업 가능한 것은 풀에 유지)
  const maxedIds = new Set();
  for (const b of game.run.boons) {
    const def = BOONS.find(x => x.id === b.id);
    const max = def && def.maxLevel ? def.maxLevel : 1;
    if ((b.level || 1) >= max) maxedIds.add(b.id);
  }
  // 카테고리 매칭: 카테고리 지정 시 해당 카테고리 우선
  let pool = BOONS.filter(b => !maxedIds.has(b.id));
  let priority = category ? pool.filter(b => b.cat === category) : pool;
  const picks = [];
  for (let i = 0; i < 3; i++) {
    let r = Math.random() * 100;
    let chosenRarity = 'common';
    for (const k of ['unstable', 'legendary', 'epic', 'rare', 'common']) {
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
  const legendaryEls = [];
  for (const b of choices) {
    const el = document.createElement('div');
    el.className = `boon-choice ${b.rarity}`;
    const lbl = { common: '일반', rare: '희귀', epic: '영웅', legendary: '전설', unstable: '불안정' }[b.rarity];
    const curLv = getBoonLevel(b.id);
    const max = b.maxLevel || 1;
    const isLevelUp = curLv > 0 && curLv < max;
    let badge = '';
    if (isLevelUp) {
      const cur = getBoonEffectAtLevel(b, curLv);
      const nxt = getBoonEffectAtLevel(b, curLv + 1);
      badge = `
        <div class="lv-badge up">⬆ Lv.${curLv} → Lv.${curLv + 1}</div>
        <div class="lv-effect">
          <div class="lv-eff-row"><span class="lv-eff-tag cur">현재</span> ${cur}</div>
          <div class="lv-eff-row"><span class="lv-eff-tag next">다음</span> ${nxt}</div>
        </div>`;
      el.classList.add('level-up');
    } else if (max > 1) {
      const lv1 = getBoonEffectAtLevel(b, 1);
      const lvm = getBoonEffectAtLevel(b, max);
      badge = `
        <div class="lv-badge">최대 Lv.${max}</div>
        <div class="lv-effect dim">
          <div class="lv-eff-row"><span class="lv-eff-tag">Lv.1</span> ${lv1}</div>
          <div class="lv-eff-row"><span class="lv-eff-tag">Lv.${max}</span> ${lvm}</div>
        </div>`;
    }
    el.innerHTML = `
      <div class="rarity">${lbl}</div>
      <div class="name">${b.name}</div>
      <div class="desc">${b.desc}</div>
      ${badge}`;
    el.addEventListener('click', () => openBoonConfirm(b));
    wrap.appendChild(el);
    if (b.rarity === 'legendary') legendaryEls.push(el);
  }
  showScreen('boon-screen');
  // 전설 가호가 포함되면 등장 연출 (플래시 + 줌-인)
  if (legendaryEls.length > 0) {
    triggerLegendReveal(legendaryEls);
  }
}

function triggerLegendReveal(els) {
  if (window.AUDIO) AUDIO.sfx('legendary');
  const flash = $('legend-flash');
  const rays  = $('legend-rays');
  if (flash) {
    flash.classList.remove('active');
    void flash.offsetWidth;
    flash.classList.add('active');
  }
  if (rays) {
    rays.classList.remove('active');
    void rays.offsetWidth;
    rays.classList.add('active');
  }
  for (const el of els) {
    el.classList.remove('legend-reveal');
    void el.offsetWidth;
    el.classList.add('legend-reveal');
  }
}

function openBoonConfirm(boon) {
  const card = $('boon-confirm-card');
  card.className = 'boon-confirm-card ' + boon.rarity;
  const rarLbl = {common:'일반',rare:'희귀',epic:'영웅',legendary:'전설',unstable:'불안정'}[boon.rarity];
  const curLv = getBoonLevel(boon.id);
  const max = boon.maxLevel || 1;
  const isLevelUp = curLv > 0 && curLv < max;
  if (isLevelUp) {
    card.classList.add('level-up');
    $('bc-rarity').innerHTML = `◆ ${rarLbl} 가호 — <span class="lv-up-tag">⬆ Lv.${curLv} → Lv.${curLv + 1}</span> ◆`;
  } else {
    $('bc-rarity').textContent = `◆ ${rarLbl} 가호 ◆`;
  }
  $('bc-name').textContent = boon.name;
  // 효과 비교 — 레벨업이면 현재 → 다음, 아니면 일반 설명
  if (isLevelUp) {
    const cur = getBoonEffectAtLevel(boon, curLv);
    const nxt = getBoonEffectAtLevel(boon, curLv + 1);
    $('bc-desc').innerHTML = `
      <div class="bc-effect-cmp">
        <div class="bc-eff-row"><span class="bc-eff-tag cur">현재 Lv.${curLv}</span> ${cur}</div>
        <div class="bc-eff-row"><span class="bc-eff-tag next">⬆ Lv.${curLv + 1}</span> ${nxt}</div>
      </div>
      <div class="bc-base-desc">${boon.desc}</div>`;
  } else {
    $('bc-desc').textContent = boon.desc;
  }
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
  const r = game.run;
  const existing = r.boons.find(b => b.id === boon.id);
  const max = boon.maxLevel || 1;
  if (existing) {
    if ((existing.level || 1) < max) existing.level = (existing.level || 1) + 1;
    if (boon.apply) boon.apply(r);
    if (window.AUDIO) AUDIO.sfx('levelup');
    return;
  }
  const entry = Object.assign({}, boon, { level: 1 });
  r.boons.push(entry);
  if (boon.apply) boon.apply(r);
  if (window.AUDIO) AUDIO.sfx(boon.rarity === 'legendary' ? 'legendary' : 'boon');
  if (boon.mod && boon.mod.grantSkill) {
    const sid = boon.mod.grantSkill;
    if (!r.skills.includes(sid)) {
      r.skills.push(sid);
      r.skillCds[sid] = 0;
    }
  }
}

// 영혼 거래: 기존 가호 하나 삭제 + 같은 카테고리 한 단계 위 가호 획득
function applyUnstableSoulTrade(g) {
  // 자신(불안정 가호) 제외한 다른 보유 가호
  const others = g.boons.filter(x => x.id !== 'b-soul-trade');
  if (others.length === 0) return;
  const sacrificed = others[Math.floor(Math.random() * others.length)];
  // 삭제 — boons 배열에서 제거 (mod 효과는 매 호출마다 boons 를 순회하므로 자동 무효화)
  g.boons = g.boons.filter(b => b.id !== sacrificed.id);
  // 같은 카테고리, 두 단계 높은 등급의 미보유 가호 풀
  const owned = new Set(g.boons.map(b => b.id));
  const tryRarities = [
    bumpRarity(bumpRarity(sacrificed.rarity)), // +2
    bumpRarity(sacrificed.rarity),             // +1 폴백
    sacrificed.rarity,                          // 동급 폴백
  ];
  let candidates = [];
  for (const targetRarity of tryRarities) {
    candidates = BOONS.filter(b =>
      b.cat === sacrificed.cat &&
      b.rarity === targetRarity &&
      b.rarity !== 'unstable' &&
      !owned.has(b.id)
    );
    if (candidates.length > 0) break;
  }
  if (candidates.length === 0) return;
  const replacement = candidates[Math.floor(Math.random() * candidates.length)];
  g.boons.push(replacement);
  if (replacement.apply) replacement.apply(g);
  if (replacement.mod && replacement.mod.grantSkill) {
    const sid = replacement.mod.grantSkill;
    if (!g.skills.includes(sid)) {
      g.skills.push(sid);
      g.skillCds[sid] = 0;
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
  renderProgressBoons();
  $('progress-modal').classList.add('active');
}

function renderProgressBoons() {
  const wrap = $('progress-boons');
  wrap.innerHTML = '';
  const boons = (game.run && game.run.boons) || [];
  if (!boons.length) {
    const empty = document.createElement('div');
    empty.className = 'boon-chip-empty';
    empty.textContent = '— 아직 획득한 가호가 없다 —';
    wrap.appendChild(empty);
    return;
  }
  const order = { legendary: 0, epic: 1, unstable: 2, rare: 3, common: 4, shop: 5 };
  const sorted = [...boons].sort((a, b) => (order[a.rarity] ?? 9) - (order[b.rarity] ?? 9));
  for (const boon of sorted) {
    const cat = CATEGORIES[boon.cat] || { icon: '◆', color: '#888' };
    const chip = document.createElement('div');
    chip.className = 'boon-chip rarity-' + (boon.rarity || 'common');
    chip.style.borderLeftColor = cat.color;
    const max = boon.maxLevel || 1;
    const lv = boon.level || 1;
    const lvTag = max > 1 ? `<span class="bc-lv">Lv.${lv}/${max}</span>` : '';
    chip.innerHTML = `
      <div class="bc-head">
        <span class="bc-ico" style="color:${cat.color}">${cat.icon}</span>
        <span class="bc-name">${boon.name}</span>
        ${lvTag}
        <span class="bc-rar">${({common:'일반',rare:'희귀',epic:'영웅',legendary:'전설',unstable:'불안정',shop:'상점'})[boon.rarity] || ''}</span>
      </div>
      <div class="bc-desc">${boon.desc || ''}</div>`;
    wrap.appendChild(chip);
  }
}

function closeProgressModal() {
  $('progress-modal').classList.remove('active');
}

// ============================================================
// 휴식
// ============================================================
function openRest(node) {
  game.run.pendingRest = node;
  showScreen('rest-screen');
}

// ============================================================
// 상자방
// ============================================================
function openChest(node) {
  game.run.pendingChest = node;
  showScreen('chest-screen');
}

// ============================================================
// 상점
// ============================================================
// ============================================================
// 아리나 이벤트
// ============================================================
// ===== 인연 이벤트 — 결속 제안 =====
function openBondEvent(node) {
  const r = game.run;
  if (!r.bondsMet) r.bondsMet = [];
  // 후보: 아직 만나지 않았고 + 현재 결속 중도 아닌 캐릭터
  const candidates = Object.keys(BONDS).filter(id =>
    !r.bondsMet.includes(id) && r.bond !== id
  );
  if (candidates.length === 0) {
    // 만날 사람이 없다 — 작은 보상으로 대체
    const gold = 30 + r.floor * 10;
    r.gold += gold;
    log(`길에서 작은 보따리를 발견했다. +${gold} 골드`, 'system');
    nextStep();
    return;
  }
  const chosenId = candidates[Math.floor(Math.random() * candidates.length)];
  const bond = BONDS[chosenId];
  r.bondsMet.push(chosenId);
  // 인트로 컷씬 → 수락/거절 프롬프트
  playStorySequence(bond.intro, () => promptBondAccept(bond), { finalLabel: '대답하기 ▶' });
}

function promptBondAccept(bond) {
  const modal = $('bond-prompt');
  $('bond-prompt-art').src = bond.art;
  $('bond-prompt-title').textContent = `${bond.icon} ${bond.name} — ${bond.title}`;
  $('bond-prompt-skill').textContent = `「${bond.skillName}」 — ${bond.desc}`;
  $('bond-prompt-text').textContent = bond.promptText;
  // 기존 결속이 있으면 — 빨간 경고
  const warn = $('bond-prompt-warn');
  const warnText = $('bond-prompt-warn-text');
  const cur = game.run.bond && game.run.bond !== bond.id ? BONDS[game.run.bond] : null;
  if (cur && warn && warnText) {
    warn.classList.remove('hidden');
    warnText.textContent = `현재 ${cur.icon} ${cur.name} 와 결속 중 — 수락 시 기존 결속은 해지됩니다.`;
  } else if (warn) {
    warn.classList.add('hidden');
  }
  modal.classList.add('active');
  const yes = $('bond-prompt-yes'), no = $('bond-prompt-no');
  const close = () => modal.classList.remove('active');
  const onYes = () => {
    close();
    cleanup();
    acceptBond(bond);
  };
  const onNo = () => {
    close();
    cleanup();
    rejectBond(bond);
  };
  function cleanup() {
    yes.removeEventListener('click', onYes);
    no.removeEventListener('click', onNo);
  }
  yes.addEventListener('click', onYes);
  no.addEventListener('click', onNo);
}

function acceptBond(bond) {
  const r = game.run;
  // 기존 결속이 있다면 — 해지된 영웅의 아쉬움
  const old = r.bond && r.bond !== bond.id ? BONDS[r.bond] : null;
  const finalize = () => {
    r.bond = bond.id;
    game.meta.bond = bond.id;
    saveMeta();
    if (window.AUDIO) AUDIO.sfx('legendary');
    // 새 결속의 수락 대사
    playStorySequence(
      [bond.acceptScene],
      () => nextStep(),
      { finalLabel: '계속 ▶' }
    );
  };
  if (old) {
    // 옛 결속의 작별 대사
    if (window.AUDIO) AUDIO.sfx('cancel');
    playStorySequence(
      [old.farewellScene],
      finalize,
      { finalLabel: '미안 ▶' }
    );
  } else {
    finalize();
  }
}

function rejectBond(bond) {
  if (window.AUDIO) AUDIO.sfx('cancel');
  playStorySequence(
    [bond.rejectScene],
    () => nextStep(),
    { finalLabel: '계속 ▶' }
  );
}

function openShop(node) {
  game.run.pendingShop = node;
  // 가게에서 4개 무작위 매물
  const shuffled = [...SHOP_ITEMS].sort(() => Math.random() - 0.5).slice(0, 4);
  game.run.shopOffer = shuffled.map(item => ({ ...item, sold: false }));
  // 매 방문마다 인사말 무작위
  const flavor = document.querySelector('#shop-screen .shop-flavor');
  if (flavor) flavor.textContent = ALICE_LINES[Math.floor(Math.random() * ALICE_LINES.length)];
  renderShop();
  // 첫 등장 — 짧은 컷씬 후 가게 입장
  if (!game.run.aliceMet) {
    game.run.aliceMet = true;
    playStorySequence(ALICE_INTRO, () => showScreen('shop-screen'), { finalLabel: '가게로 ▶' });
  } else {
    showScreen('shop-screen');
  }
}

function renderShop() {
  $('shop-gold').textContent = game.run.gold;
  const wrap = $('shop-items');
  wrap.innerHTML = '';
  for (const item of game.run.shopOffer) {
    const card = document.createElement('button');
    card.className = 'shop-item';
    const canAfford = game.run.gold >= item.price;
    if (item.sold) card.classList.add('sold');
    if (!canAfford && !item.sold) card.classList.add('cant-afford');
    card.disabled = item.sold || !canAfford;
    card.innerHTML = `
      <div class="si-ico">${item.icon}</div>
      <div class="si-name">${item.name}</div>
      <div class="si-desc">${item.desc}</div>
      <div class="si-price">${item.sold ? '판매됨' : `${item.price} 골드`}</div>`;
    if (!item.sold && canAfford) {
      card.addEventListener('click', () => {
        game.run.gold -= item.price;
        item.apply(game.run);
        item.sold = true;
        renderShop();
      });
    }
    wrap.appendChild(card);
  }
}

function resolveChestOpen() {
  const node = game.run.pendingChest;
  game.run.pendingChest = null;
  if (window.AUDIO) AUDIO.sfx('open');
  // 도굴꾼의 주머니 — 상자 열 때 무작위 도구 1개
  if (hasBoonMod('chestTool')) {
    addTool(game.run, randomToolId());
  }
  // 50/50 — 가호 or 미믹
  if (Math.random() < 0.5) {
    const cat = node ? node.rewardCat : null;
    const rarity = bumpRarity(node ? node.rewardRarity : 'common');
    openBoonScreen('상자의 가호', cat, rarity);
  } else {
    // 미믹 전투 — 승리 시 rare 가호 보장
    startBattle('mimic', {
      id: 'mimic-chest',
      type: 'combat',
      kind: 'normal',
      forceEnemy: 'mimic',
      rewardCat: node ? node.rewardCat : null,
      rewardRarity: bumpRarity(node ? node.rewardRarity : 'common'),
    });
  }
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
  if (window.AUDIO) AUDIO.sfx(victory ? 'fanfare' : 'gameover');
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
async function hardReset() {
  if (!confirm('모든 데이터와 캐시를 완전히 초기화합니다. 계속하시겠습니까?')) return;
  try { localStorage.clear(); } catch (e) {}
  try { sessionStorage.clear(); } catch (e) {}
  // 캐시 / 서비스워커 — 끝까지 await 해서 새로고침 전에 정리 완료
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (e) {}
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
  } catch (e) {}
  // IndexedDB도 비움 (지원 브라우저 한정)
  try {
    if (indexedDB && indexedDB.databases) {
      const dbs = await indexedDB.databases();
      await Promise.all(dbs.map(db => db.name && new Promise(res => {
        const req = indexedDB.deleteDatabase(db.name);
        req.onsuccess = req.onerror = req.onblocked = () => res();
      })));
    }
  } catch (e) {}
  alert('초기화 완료. 새로고침합니다.');
  // 캐시 무시 강제 재요청
  location.replace(location.pathname + '?cb=' + Date.now());
}

// ============================================================
// 부팅
// ============================================================
function boot() {
  // 버전 라벨
  const vEl = $('title-version');
  if (vEl) vEl.textContent = VERSION;
  // 오디오 초기화 (첫 입력 시 컨텍스트 생성)
  const initAudio = () => {
    if (!window.AUDIO) return;
    AUDIO.init();
    AUDIO.resume();
    refreshAudioToggles();
    // 첫 입력 직후 타이틀 음악 시도 (자동재생 정책 우회)
    const cur = $('title') && !$('title').classList.contains('hidden');
    if (cur) AUDIO.music('title');
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
    window.addEventListener(ev, initAudio, { once: true, passive: true })
  );
  // 오디오 토글 버튼
  const refreshAudioToggles = () => {
    if (!window.AUDIO) return;
    const m = $('audio-music'); const s = $('audio-sfx');
    if (m) { m.textContent = AUDIO.musicEnabled ? '🎵' : '🔇'; m.classList.toggle('off', !AUDIO.musicEnabled); }
    if (s) { s.textContent = AUDIO.sfxEnabled ? '🔊' : '🔕'; s.classList.toggle('off', !AUDIO.sfxEnabled); }
  };
  window.refreshAudioToggles = refreshAudioToggles;
  $('audio-music').addEventListener('click', () => { AUDIO.init(); AUDIO.toggleMusic(); refreshAudioToggles(); AUDIO.sfx('click'); });
  $('audio-sfx').addEventListener('click', () => { AUDIO.init(); AUDIO.toggleSfx(); refreshAudioToggles(); AUDIO.sfx('click'); });
  refreshAudioToggles();
  // 타이틀
  $('title-start').addEventListener('click', () => {
    if (hasSeenPrologue()) {
      renderMenu();
      showScreen('menu');
    } else {
      startPrologue(() => { renderMenu(); showScreen('menu'); });
    }
  });
  $('title-prologue').addEventListener('click', () => {
    startPrologue(() => { renderTitle(); showScreen('title'); });
  });
  $('title-fountain').addEventListener('click', openFountain);
  $('title-reset').addEventListener('click', hardReset);
  // 프롤로그 컨트롤
  $('pr-next').addEventListener('click', nextStoryScene);
  $('pr-skip').addEventListener('click', finishStory);
  // 영웅 선택
  $('select-back').addEventListener('click', () => { renderTitle(); showScreen('title'); });
  $('start-btn').addEventListener('click', newRun);
  // 영원의 샘 → 타이틀로 복귀
  $('fountain-back').addEventListener('click', () => { renderTitle(); showScreen('title'); });
  // 전투
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => heroAction(btn.dataset.action));
  });
  $('ult-btn').addEventListener('click', () => heroAction('ult'));
  // 스킬 picker 닫기
  $('skill-picker-close').addEventListener('click', closeSkillPicker);
  $('skill-picker-backdrop').addEventListener('click', closeSkillPicker);
  $('tool-picker-close').addEventListener('click', closeToolPicker);
  $('tool-picker-backdrop').addEventListener('click', closeToolPicker);
  // 보스/가호 후 진행
  $('boon-skip').addEventListener('click', () => {
    game.run.gold += 30;
    nextStep();
  });
  // 샘물 — 마신다 / 지나간다
  $('rest-heal').addEventListener('click', () => {
    const node = game.run.pendingRest;
    game.run.pendingRest = null;
    const cat = node ? node.rewardCat : null;
    const rarity = node ? node.rewardRarity : 'common';
    openBoonScreen('샘물의 가호', cat, rarity);
  });
  $('rest-skip').addEventListener('click', () => {
    game.run.pendingRest = null;
    nextStep();
  });
  // 상자 — 연다 / 지나간다
  $('chest-open').addEventListener('click', resolveChestOpen);
  $('chest-skip').addEventListener('click', () => {
    game.run.pendingChest = null;
    nextStep();
  });
  // 상점 — 떠나간다
  $('shop-leave').addEventListener('click', () => {
    game.run.pendingShop = null;
    game.run.shopOffer = null;
    nextStep();
  });
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
