// ─── Enemy Helpers ────────────────────────────────────────────────────────────
function getEnemyPool(t) { return ENEMY_TYPES.filter(e => t >= e.minT); }
function getBossType(t)  { let r = BOSS_TYPES[0]; for (const b of BOSS_TYPES) { if (t >= b.minT) r = b; } return r; }

// ─── Spawn Enemy ──────────────────────────────────────────────────────────────
function spawnEnemy() {
  const pool = getEnemyPool(gameTime);
  let idx = 0;
  let t;
  // 최대 3번 재추첨: 총 쏘는 적(archer/mage) 빈도 감소
  for (let attempt = 0; attempt < 3; attempt++) {
    const rnd = Math.random();
    if (pool.length >= 3 && rnd < 0.38) idx = pool.length - 1;
    else if (pool.length >= 2 && rnd < 0.68) idx = pool.length - 2;
    else idx = Math.floor(Math.random() * pool.length);
    t = pool[Math.max(0, idx)];
    // 총 쏘는 적은 30% 확률로만 등장 허용 (70%는 재추첨)
    if ((t.type === 'archer' || t.type === 'mage') && Math.random() < 0.70 && attempt < 2) continue;
    break;
  }

  const angle = Math.random() * Math.PI * 2;
  const d = Math.max(W, H) * 0.65;

  const baseHp = Math.floor((20 + Math.pow(gameTime, 1.5) * 0.08) * (0.8 + Math.random() * 0.4) * diffMult);
  const hp = Math.max(1, Math.round(baseHp * t.hpM));
  const r  = Math.round(13 * t.rM);

  const makeEnemy = (offX, offY, extraProps) => ({
    x: player.x + Math.cos(angle) * d + (offX || 0),
    y: player.y + Math.sin(angle) * d + (offY || 0),
    hp, maxHp: hp, r,
    spd: (0.7 + Math.pow(gameTime / 100, 1.4) * 0.55) * t.spdM,
    dmg: t.dmgM === 0 ? 0 : Math.round((5 + gameTime * 0.1) * t.dmgM),
    xpVal: Math.round(2 * t.xpM),
    frozen: 0, dead: false,
    color: t.color, emoji: t.em, name: t.name,
    type: t.type || 'normal',
    shootTimer: 0,
    teleportTimer: 0,
    shootDmg: t.shootDmg || 0,
    shootCool: t.shootCool || 9999,
    teleportCool: t.teleportCool || 9999,
    ...(extraProps || {}),
  });

  if (t.type === 'bat') {
    // Bats spawn in groups of 3
    for (let i = 0; i < (t.spawnCount || 3); i++) {
      const scatter = (Math.random() - 0.5) * 80;
      const scatter2 = (Math.random() - 0.5) * 80;
      enemies.push(makeEnemy(scatter, scatter2));
    }
  } else {
    enemies.push(makeEnemy());
  }
}

// ─── Spawn Boss ───────────────────────────────────────────────────────────────
function spawnBoss() {
  const angle = Math.random() * Math.PI * 2;
  const d = Math.max(W, H) * 0.7;
  const t = getBossType(gameTime);
  const baseHp = Math.floor((400 + Math.pow(gameTime, 1.6) * 0.5) * diffMult);
  const hp = Math.round(baseHp * t.hpM);
  const r  = Math.round(16 * t.rM);
  enemies.push({
    x: player.x + Math.cos(angle) * d,
    y: player.y + Math.sin(angle) * d,
    hp, maxHp: hp, r,
    spd: (0.45 + gameTime * 0.002) * t.spdM,
    dmg: Math.round(18 * t.dmgM),
    xpVal: Math.round(t.xpM),
    frozen: 0, dead: false, boss: true,
    color: t.color, emoji: t.em, name: t.name,
    type: 'boss',
    shootTimer: 0, teleportTimer: 0,
  });
}

// ─── Kill Enemy ───────────────────────────────────────────────────────────────
function killEnemy(e) {
  e.dead = true;
  kills++;
  if (player.bloodMoon && player.dmgMult < (player._bloodMoonBase||1)*1.5) {
    if (!player._bloodMoonBase) player._bloodMoonBase = player.dmgMult;
    player.dmgMult = Math.min(player._bloodMoonBase * 1.5, player.dmgMult * 1.01);
  }
  spawnXpOrb(e.x, e.y, Math.round((e.xpVal + (player.xpPerKill || 0)) * player.luck), e);
  if (Math.random() < 0.05) spawnHealthItem(e.x, e.y);
  const itemChance = e.boss ? 0.20 : 0.04;
  if (Math.random() < itemChance) spawnItem(e.x, e.y + (e.r || 20));
  if ((player.lifesteal || 0) > 0) player.hp = Math.min(player.maxHp, player.hp + player.lifesteal);

  // ── 보스 처치 대박 보상 ──
  if (e.boss) {
    // 1. 화면 폭발 파티클 (다색, 대량)
    const colors = ['#fde047','#f97316','#ef4444','#c084fc','#3b82f6','#22c55e','#ffffff'];
    for (let i = 0; i < 7; i++) spawnParticles(e.x + (Math.random()-0.5)*80, e.y + (Math.random()-0.5)*80, colors[i], 18);
    spawnParticles(player.x, player.y, '#fde047', 30); // 플레이어 위에도
    // 2. HP 전체 회복
    player.hp = player.maxHp;
    // 3. 보스 처치 버프 (30초 동안 공격력 2배 + 5초 무적)
    player._bossKillBuff = 1800; // 30초 * 60프레임
    player.dmgMult *= 2;
    player.invincible = 300; // 5초 무적
    // 4. 보장된 아이템 드롭 (3개: 에픽+ 보장)
    for (let i = 0; i < 3; i++) {
      const a = (Math.PI * 2 / 3) * i;
      spawnItemForced(e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60, 3); // minTier=3 (에픽+)
    }
    // 5. XP 폭발
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 60;
      spawnXpOrb(e.x + Math.cos(a)*d, e.y + Math.sin(a)*d, Math.round(e.xpVal * 0.4), e);
    }
    // 6. 토스트 알림
    showToast('👑', '보스 처치!', '전 회복 + 공격2배(30초) + 아이템3개!', '#fde047');
    // 7. 화면 플래시
    window._screenFlash = {r:255,g:215,b:0,a:0.4,fade:0.025};
  }

  // Type-specific death effects
  if (e.type === 'zombie' && !e.isMini) {
    // Zombie splits into 2 mini zombies
    for (let i = 0; i < 2; i++) {
      const a = Math.random() * Math.PI * 2;
      const miniHp = Math.max(1, Math.round(e.maxHp * 0.28));
      enemies.push({
        x: e.x + Math.cos(a) * 22, y: e.y + Math.sin(a) * 22,
        hp: miniHp, maxHp: miniHp, r: Math.round(e.r * 0.62),
        spd: e.spd * 1.35, dmg: Math.round(e.dmg * 0.55),
        xpVal: Math.round(e.xpVal * 0.3),
        frozen: 0, dead: false,
        color: '#4d7c0f', emoji: '🧟', name: '미니 좀비',
        type: 'zombie', isMini: true,
        shootTimer: 0, teleportTimer: 0, shootDmg: 0, shootCool: 9999, teleportCool: 9999,
      });
    }
    spawnParticles(e.x, e.y, '#65a30d', 12);
  }

  if (e.type === 'elec') {
    // Electric explosion on death
    const explosionR = 90 + e.r * 2;
    spawnParticles(e.x, e.y, '#fde047', 22);
    spawnParticles(e.x, e.y, '#ffffff', 10);
    const dist = Math.hypot(player.x - e.x, player.y - e.y);
    if (dist < explosionR && player.invincible === 0) {
      const falloff = 1 - dist / explosionR;
      let dmg = 18 * falloff * diffMult * (1 - (player.armor || 0));
      if ((player.barrier || 0) > 0) { player.barrier = Math.max(0, player.barrier - dmg); dmg = 0; }
      player.hp -= dmg;
      player.invincible = 30;
      if (player.hp <= 0) { gameOver(); }
    }
    // Also add visual shockwave bullet
    enemyBullets.push({ x: e.x, y: e.y, vx: 0, vy: 0, r: explosionR, damage: 0, life: 12, color: '#fde04788', isShockwave: true });
  }
}

// ─── Update Enemies ───────────────────────────────────────────────────────────
function updateEnemies() {
  for (const e of enemies) {
    if (e.dead) continue;
    if (e.frozen > 0) { e.frozen--; continue; }

    // Special AI behaviors
    if (e.type === 'mage') {
      // Mage: teleports and fires magic bolts
      e.teleportTimer = (e.teleportTimer || 0) + 1;
      if (e.teleportTimer >= e.teleportCool) {
        e.teleportTimer = 0;
        const a = Math.random() * Math.PI * 2;
        const dist = 180 + Math.random() * 120;
        e.x = player.x + Math.cos(a) * dist;
        e.y = player.y + Math.sin(a) * dist;
        spawnParticles(e.x, e.y, '#1e40af', 10);
      }
      e.shootTimer = (e.shootTimer || 0) + 1;
      if (e.shootTimer >= e.shootCool) {
        e.shootTimer = 0;
        const ang = Math.atan2(player.y - e.y, player.x - e.x);
        const spread = 0.25;
        for (let i = -1; i <= 1; i++) {
          const a = ang + i * spread;
          enemyBullets.push({
            x: e.x, y: e.y,
            vx: Math.cos(a) * 4, vy: Math.sin(a) * 4,
            r: 7, damage: e.shootDmg * diffMult, life: 120,
            color: '#3b82f6',
          });
        }
      }
    } else if (e.type === 'archer') {
      // Archer: shoots single projectile
      e.shootTimer = (e.shootTimer || 0) + 1;
      if (e.shootTimer >= e.shootCool) {
        e.shootTimer = 0;
        const ang = Math.atan2(player.y - e.y, player.x - e.x);
        enemyBullets.push({
          x: e.x, y: e.y,
          vx: Math.cos(ang) * 5, vy: Math.sin(ang) * 5,
          r: 5, damage: e.shootDmg * diffMult, life: 140,
          color: '#92400e',
        });
        spawnParticles(e.x, e.y, '#92400e', 4);
      }
    } else if (e.type === 'ogre') {
      // Ogre: AoE shockwave when close
      e.shootTimer = (e.shootTimer || 0) + 1;
      if (e.shootTimer >= 180 && Math.hypot(player.x - e.x, player.y - e.y) < 120) {
        e.shootTimer = 0;
        // Shockwave: push enemies and deal dmg
        if (player.invincible === 0) {
          let dmg = e.dmg * 1.5 * (1 - (player.armor || 0));
          if ((player.barrier || 0) > 0) { player.barrier = Math.max(0, player.barrier - dmg); dmg = 0; }
          player.hp -= dmg;
          player.invincible = 80;
          spawnParticles(e.x, e.y, '#7f1d1d', 18);
          if (player.hp <= 0) { gameOver(); return; }
        }
      }
    }

    // Standard movement toward player
    const ex = player.x - e.x, ey = player.y - e.y, ed = Math.hypot(ex, ey) || 1;
    e.x += ex / ed * e.spd;
    e.y += ey / ed * e.spd;

    // Contact damage
    if (player.invincible === 0 && Math.hypot(e.x - player.x, e.y - player.y) < e.r + player.r) {
      if (e.dmg === 0) continue; // archer has no contact dmg
      if (Math.random() < (player.dodge || 0)) {
        spawnParticles(player.x, player.y, '#7dd3fc', 5);
      } else {
        let dmg = e.dmg * (1 - (player.armor || 0));
        if ((player.barrier || 0) > 0) { player.barrier = Math.max(0, player.barrier - dmg); dmg = 0; }
        player.hp -= dmg;
        if ((player.thorns || 0) > 0) {
          for (const te of enemies) {
            if (Math.hypot(te.x - player.x, te.y - player.y) < 120) te.hp -= player.thorns;
          }
        }
      }
      player.invincible = 60;
      spawnParticles(player.x, player.y, '#ef4444', 8);
      if (player.hp <= 0) { gameOver(); return; }
    }
  }
  enemies = enemies.filter(e => !e.dead);
}

// ─── Update Enemy Bullets ─────────────────────────────────────────────────────
function updateEnemyBullets() {
  for (const b of enemyBullets) {
    if (!b.isShockwave) { b.x += b.vx; b.y += b.vy; }
    b.life--;
    if (b.isShockwave || b.damage === 0) continue;
    const dist = Math.hypot(player.x - b.x, player.y - b.y);
    if (dist < player.r + b.r && player.invincible === 0) {
      if (Math.random() < (player.dodge || 0)) {
        spawnParticles(player.x, player.y, '#7dd3fc', 4);
      } else {
        let dmg = b.damage * (1 - (player.armor || 0));
        if ((player.barrier || 0) > 0) { player.barrier = Math.max(0, player.barrier - dmg); dmg = 0; }
        player.hp -= dmg;
        spawnParticles(player.x, player.y, '#ef4444', 6);
        player.invincible = 40;
        if (player.hp <= 0) { gameOver(); return; }
      }
      b.life = -1;
    }
  }
  enemyBullets = enemyBullets.filter(b => b.life > 0);
}
