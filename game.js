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
  if (heroId === 'archer') drawArcherHero(ctx, ox, oy, scale);
  else if (heroId === 'mage') drawMageHero(ctx, ox, oy, scale);
  else if (heroId === 'merchant') drawMerchantHero(ctx, ox, oy, scale);
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

  const hbCanvas = $('hb-portrait');
  const hbCtx = hbCanvas.getContext('2d');
  hbCtx.imageSmoothingEnabled = false;
  hbCtx.clearRect(0, 0, 48, 48);
  drawHeroPortrait(hbCtx, game.hero.id, -8, -8, 48 / 64);
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
  ctx.fillText('Step 2: 캐릭터 미리보기 (전투는 다음 단계)', 12, CANVAS_H - 12);

  // 데모: 타워 5종 한 줄 (Step 3에서 실제 배치 시스템으로 교체)
  const towerDemo = [
    { type: 'archer', label: '궁수' },
    { type: 'cannon', label: '대포' },
    { type: 'mage', label: '마법' },
    { type: 'frost', label: '얼음' },
    { type: 'sniper', label: '저격' },
  ];
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '11px sans-serif';
  ctx.fillText('타워 데모', 700, 32);
  for (let i = 0; i < towerDemo.length; i++) {
    const x = 720 + i * 36;
    const y = 90;
    const lvl = ((Math.floor(performance.now() / 1500) + i) % 3) + 1;
    drawTower(ctx, towerDemo[i].type, x, y, lvl);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(towerDemo[i].label, x, y + 14);
    ctx.textAlign = 'start';
  }

  // 데모: 적 6종 한 줄
  const enemyDemo = ['goblin', 'orc', 'drone', 'shield', 'rogue', 'giant'];
  const enemyLabels = ['고블린', '오크', '드론', '실드', '도적', '거인'];
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '11px sans-serif';
  ctx.fillText('적 데모', 700, 580);
  const t = performance.now();
  for (let i = 0; i < enemyDemo.length; i++) {
    const x = 720 + i * 36;
    const y = 620;
    drawEnemy(ctx, enemyDemo[i], x, y, 1, t);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(enemyLabels[i], x, y + 14);
    ctx.textAlign = 'start';
  }
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
