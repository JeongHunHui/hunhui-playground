// ─── Canvas & Globals ────────────────────────────────────────────────────────
const cv  = document.getElementById('c');
const ctx = cv.getContext('2d');
let W, H;

function resize() { W = cv.width = Math.min(window.innerWidth, 700); H = cv.height = window.innerHeight; }
resize(); window.addEventListener('resize', resize);

// Game state globals (window-level so all files access them)
let player, enemies, bullets, xpOrbs, particles, weapons;
let enemyBullets = [];
let kills, gameTime, level, xp, xpNeeded, running, paused;
let diffMult = 1, diffName = '보통';
let evolvedWeapons = new Set();
let healthItems = [], chests = [], chestSpawnTimer = 0, activeItems = [], droppedItems = [];
let keys = {}, touch = { dx: 0, dy: 0 }, animId;
let frameCount = 0, lastSecond = Date.now();

// ─── Start Game ───────────────────────────────────────────────────────────────
async function startGame(diff) {
  diffMult = diff || 1;
  diffName = diff <= 0.7 ? '쉬움' : diff >= 1.5 ? '어려움' : '보통';
  document.getElementById('overlay').style.display = 'none';

  try {
    const cfg = await fetch('/api/config').then(r => r.json());
    if (cfg && cfg.BALANCE_PATCH) document.getElementById('ver-badge').textContent = 'v2.0 / bp-' + cfg.BALANCE_PATCH;
  } catch (e) {}

  const ch = CHARACTERS[selectedChar] || CHARACTERS.warrior;
  player = initPlayer(ch);
  enemies = []; bullets = []; xpOrbs = []; particles = []; weapons = [];
  enemyBullets = [];
  healthItems = []; chests = []; chestSpawnTimer = 0; activeItems = []; droppedItems = [];
  evolvedWeapons = new Set();

  weapons = ch.startWeapons.map(wid => {
    const def = WEAPON_DEFS[wid];
    return { ...def, wid, timer: 0, pierce: def.pierce || 1, count: def.count || 1, chainCount: def.chainCount || 3, orbitR: def.orbitR || 80, durationLeft: def.duration || 0, active: !def.duration, wlevel: 1 };
  });

  kills = 0; gameTime = 0; level = 1; xp = 0; xpNeeded = 20;
  running = true; paused = false;
  frameCount = 0; lastSecond = Date.now();
  if (animId) cancelAnimationFrame(animId);
  loop();
}

// ─── Main Loop ────────────────────────────────────────────────────────────────
function loop() {
  if (!running) return;
  if (!paused) update();
  draw();
  animId = requestAnimationFrame(loop);
}

// ─── Update ───────────────────────────────────────────────────────────────────
function update() {
  frameCount++;
  const now = Date.now();
  if (now - lastSecond >= 1000) {
    gameTime++; lastSecond = now;
    if (player.regen > 0) player.hp = Math.min(player.maxHp, player.hp + player.regen);
    // Barrier recharge
    if ((player.barrierMax || 0) > 0) {
      player.barrierCooldown = (player.barrierCooldown || 0) + 1;
      if (player.barrierCooldown >= 30) { player.barrierCooldown = 0; player.barrier = Math.min(player.barrierMax, player.barrier + player.barrierMax * 0.5); }
    }
    // Damage boost timer
    if (player._dmgBoostTimer > 0) {
      player._dmgBoostTimer -= 60;
      if (player._dmgBoostTimer <= 0 && player._dmgBoost) { player._dmgBoost = false; player.dmgMult /= 2; }
    }
    // 보스 처치 버프 타이머
    if ((player._bossKillBuff || 0) > 0) {
      player._bossKillBuff--;
      if (player._bossKillBuff === 0) { player.dmgMult /= 2; } // 공격2배 해제
    }
  }

  // Player movement
  let mx = 0, my = 0;
  if (keys['ArrowLeft']  || keys['a'] || keys['A']) mx -= 1;
  if (keys['ArrowRight'] || keys['d'] || keys['D']) mx += 1;
  if (keys['ArrowUp']    || keys['w'] || keys['W']) my -= 1;
  if (keys['ArrowDown']  || keys['s'] || keys['S']) my += 1;
  mx += touch.dx; my += touch.dy;
  if (mx && my) { mx *= 0.707; my *= 0.707; }
  player.x += mx * player.spd; player.y += my * player.spd;
  if (player.invincible > 0) player.invincible--;

  // Enemy spawn
  const spawnRate = Math.max(5, Math.floor(60 * Math.pow(0.97, gameTime / 10)));
  if (frameCount % spawnRate === 0) {
    const cnt = Math.floor(1 + Math.pow(gameTime / 60, 1.5));
    for (let i = 0; i < cnt; i++) spawnEnemy();
  }
  if (gameTime > 0 && gameTime % 60 === 0 && frameCount % 60 === 1) spawnBoss();

  // Update systems
  updateWeapons();
  updateBullets();
  updateEnemies();
  updateEnemyBullets();
  updateItems();

  // XP orb magnet
  for (const o of xpOrbs) {
    const ox = player.x - o.x, oy = player.y - o.y, od = Math.hypot(ox, oy) || 1;
    if (od < player.magnetR) { o.x += ox / od * 5; o.y += oy / od * 5; }
    if (od < player.r + o.r) {
      o.collected = true;
      gainXp(Math.round(o.val * player.xpMult));
    }
  }
  xpOrbs = xpOrbs.filter(o => !o.collected);

  // Particles
  for (const p of particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life--; }
  particles = particles.filter(p => p.life > 0);

  updateHUD();
}

// ─── GainXP (global) ─────────────────────────────────────────────────────────
function gainXp(amt) {
  xp += amt;
  while (xp >= xpNeeded) { xp -= xpNeeded; xpNeeded = Math.floor(xpNeeded * 1.18 + 10); levelUp(); }
}

// ─── Game Over ────────────────────────────────────────────────────────────────
function gameOver() {
  running = false;
  showGameOver();
}

// ─── Draw ─────────────────────────────────────────────────────────────────────
function draw() {
  // Map background by time
  let mapBg = '#0a0514', mapGrid = '#1a1030', mapName = '';
  if (gameTime >= 480)      { mapBg = '#0a0019'; mapGrid = '#1a0030'; mapName = '🌑 심연'; }
  else if (gameTime >= 300) { mapBg = '#190a00'; mapGrid = '#2a1400'; mapName = '🔥 화산'; }
  else if (gameTime >= 120) { mapBg = '#0a0014'; mapGrid = '#1a0020'; mapName = '⚰️ 던전'; }
  else                      { mapName = '🌲 초원'; }

  ctx.fillStyle = mapBg; ctx.fillRect(0, 0, W, H);
  // Screen flash (boss kill etc.)
  if (window._screenFlash && window._screenFlash.a > 0) {
    const f = window._screenFlash;
    ctx.save(); ctx.globalAlpha = f.a;
    ctx.fillStyle = `rgb(${f.r},${f.g},${f.b})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    f.a -= f.fade;
    if (f.a <= 0) window._screenFlash = null;
  }
  if (mapName && running) {
    ctx.save(); ctx.font = '11px sans-serif'; ctx.fillStyle = 'rgba(200,180,255,0.35)';
    ctx.textAlign = 'right'; ctx.fillText(mapName, W - 8, H - 8); ctx.restore();
  }
  ctx.strokeStyle = mapGrid; ctx.lineWidth = 1;
  const ox = (player.x % 80 + 80) % 80, oy = (player.y % 80 + 80) % 80;
  for (let x = -ox; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = -oy; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  const camX = W / 2 - player.x, camY = H / 2 - player.y;
  ctx.save(); ctx.translate(camX, camY);

  // Magnet range hint
  ctx.beginPath(); ctx.arc(player.x, player.y, player.magnetR, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(124,58,237,0.07)'; ctx.lineWidth = 1; ctx.stroke();

  // XP Orbs
  for (const o of xpOrbs) {
    ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
    ctx.fillStyle = (o.color || '#7c3aed') + '88'; ctx.fill();
    ctx.strokeStyle = o.strokeColor || '#c084fc'; ctx.lineWidth = 1.5; ctx.stroke();
  }

  // Health items
  for (const h of healthItems) {
    const pulse = Math.sin(h.pulse) * 0.25 + 0.85;
    ctx.save(); ctx.globalAlpha = Math.min(1, h.life / 60) * pulse;
    ctx.font = h.r * 2.2 + 'px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('♥', h.x, h.y + h.r * 0.6); ctx.restore();
  }

  // Dropped items (graded)
  for (const it of droppedItems) {
    const pulse = Math.sin(it.pulse || 0) * 0.2 + 0.85;
    const fadeA = Math.min(1, it.life / 60);
    ctx.save(); ctx.translate(it.x, it.y); ctx.scale(pulse, pulse); ctx.globalAlpha = fadeA;
    ctx.beginPath(); ctx.arc(0, 0, it.r + 3, 0, Math.PI * 2);
    const gradeColor = it.grade ? it.grade.color : '#fde047';
    ctx.fillStyle = gradeColor + '22'; ctx.fill();
    ctx.strokeStyle = gradeColor; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(it.icon, 0, 0);
    // Grade label
    if (it.grade && it.grade.prob < 0.38) {
      ctx.font = '9px sans-serif'; ctx.fillStyle = gradeColor;
      ctx.fillText(it.grade.name, 0, it.r + 10);
    }
    ctx.globalAlpha = 1; ctx.restore();
  }

  // Chests
  for (const c of chests) {
    const pulse = Math.sin(c.pulse || 0) * 0.15 + 0.9;
    ctx.save(); ctx.translate(c.x, c.y); ctx.scale(pulse, pulse);
    ctx.font = '28px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('📦', 0, 0);
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.strokeStyle = '#fde047'; ctx.lineWidth = 2; ctx.globalAlpha = 0.6 + Math.sin(c.pulse || 0) * 0.4;
    ctx.stroke(); ctx.globalAlpha = 1; ctx.restore();
  }

  // Player bullets
  for (const b of bullets) {
    if (b.btype === 'lightning_vis') {
      ctx.strokeStyle = b.color; ctx.lineWidth = 2; ctx.globalAlpha = b.life / 8;
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.tx, b.ty); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (b.btype === 'orbit') {
      ctx.globalAlpha = 0.12; ctx.beginPath(); ctx.arc(player.x, player.y, b.orbitR, 0, Math.PI * 2);
      ctx.strokeStyle = b.color; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(b.x, b.y, 8, 0, Math.PI * 2); ctx.fillStyle = b.color; ctx.fill();
    } else if (b.btype === 'holy') {
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = '#fef08a66'; ctx.fill();
      ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = '#fff9'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(b.x, b.y - b.r * 0.7); ctx.lineTo(b.x, b.y + b.r * 0.7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(b.x - b.r * 0.7, b.y); ctx.lineTo(b.x + b.r * 0.7, b.y); ctx.stroke();
    } else if (b.btype === 'ghost') {
      ctx.globalAlpha = 0.7;
      ctx.font = b.r * 2 + 'px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('👻', b.x, b.y + b.r * 0.55);
      ctx.globalAlpha = 1;
    } else if (b.btype === 'aura') {
      ctx.beginPath(); ctx.arc(player.x, player.y, b.r, 0, Math.PI * 2);
      ctx.strokeStyle = b.color; ctx.lineWidth = 2; ctx.globalAlpha = 0.22; ctx.stroke();
      ctx.fillStyle = b.color + '0a'; ctx.fill(); ctx.globalAlpha = 1;
    } else if (b.btype === 'poison') {
      ctx.globalAlpha = Math.min(0.45, b.life / 80);
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = b.color; ctx.fill(); ctx.globalAlpha = 1;
    } else {
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = b.color; ctx.fill();
    }
  }

  // Enemy bullets
  for (const b of enemyBullets) {
    if (b.isShockwave) {
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.strokeStyle = b.color || '#fde04766'; ctx.lineWidth = 3;
      ctx.globalAlpha = b.life / 12; ctx.stroke(); ctx.globalAlpha = 1;
    } else {
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = b.color || '#ef4444'; ctx.fill();
      // Glow
      ctx.shadowBlur = 8; ctx.shadowColor = b.color || '#ef4444'; ctx.fill(); ctx.shadowBlur = 0;
    }
  }

  // Enemies
  for (const e of enemies) {
    ctx.globalAlpha = e.frozen ? 0.55 : 1;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    ctx.fillStyle = e.frozen ? '#93c5fd22' : e.color + '44'; ctx.fill();
    ctx.strokeStyle = e.frozen ? '#93c5fd' : e.color; ctx.lineWidth = e.boss ? 3 : 2; ctx.stroke();
    ctx.font = e.r * 1.3 + 'px sans-serif'; ctx.textAlign = 'center'; ctx.globalAlpha = 1;
    ctx.fillText(e.emoji, e.x, e.y + e.r * 0.42);
    const bw = e.r * 2.6;
    ctx.fillStyle = '#33333388'; ctx.fillRect(e.x - bw / 2, e.y - e.r - 10, bw, 5);
    ctx.fillStyle = e.boss ? '#ef4444' : '#22c55e';
    ctx.fillRect(e.x - bw / 2, e.y - e.r - 10, bw * (Math.max(0, e.hp) / e.maxHp), 5);
    if (e.boss) {
      ctx.font = '11px sans-serif'; ctx.fillStyle = '#fca5a5'; ctx.textAlign = 'center';
      ctx.fillText(e.name, e.x, e.y - e.r - 13);
    }
  }
  ctx.globalAlpha = 1;

  // Player
  const pa = player.invincible > 0 ? (Math.floor(player.invincible / 5) % 2 ? 0.3 : 1) : 1;
  ctx.globalAlpha = pa;
  ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fillStyle = '#2d1f4e'; ctx.fill();
  ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 3; ctx.stroke();
  ctx.font = '20px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(player.charEmoji || '🧙', player.x, player.y + 7);
  ctx.globalAlpha = 1;

  // Particles
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / 30);
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = p.color; ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ─── Spawn Helpers ────────────────────────────────────────────────────────────
function spawnXpOrb(x, y, val, e) {
  let r = 6, color = '#22c55e', strokeColor = '#4ade80';
  if (e && e.boss)       { r = 12; color = '#eab308'; strokeColor = '#fde047'; }
  else if (e && e.maxHp > 50) { r = 8; color = '#3b82f6'; strokeColor = '#93c5fd'; }
  xpOrbs.push({ x, y, r, val, collected: false, color, strokeColor });
}

function spawnHealthItem(x, y) {
  healthItems.push({ x, y, r: 8, life: 900, collected: false, pulse: 0 });
}

function spawnParticles(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = Math.random() * 3 + 1;
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, life: 25, color });
  }
}

// ─── Input Handlers ───────────────────────────────────────────────────────────
document.addEventListener('keydown', e => keys[e.key] = true);
document.addEventListener('keyup',   e => keys[e.key] = false);

let joystickStart = null;
cv.addEventListener('touchstart', e => { const t = e.touches[0]; joystickStart = { x: t.clientX, y: t.clientY }; }, { passive: true });
cv.addEventListener('touchmove', e => {
  if (!joystickStart) return;
  const t = e.touches[0];
  const dx = t.clientX - joystickStart.x, dy = t.clientY - joystickStart.y;
  const d = Math.hypot(dx, dy) || 1, maxD = 50;
  touch.dx = Math.abs(dx) > 8 ? Math.min(d, maxD) / maxD * (dx / d) : 0;
  touch.dy = Math.abs(dy) > 8 ? Math.min(d, maxD) / maxD * (dy / d) : 0;
}, { passive: true });
cv.addEventListener('touchend', () => { touch.dx = 0; touch.dy = 0; joystickStart = null; });
