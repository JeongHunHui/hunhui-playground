// ─── Fire Weapon ─────────────────────────────────────────────────────────────
function fireWeapon(w) {
  const wt = w.wtype;
  if (wt === 'bullet') {
    let nn = null, nd = Infinity;
    if (w.lockedTarget && enemies.includes(w.lockedTarget) && !w.lockedTarget.dead) {
      nn = w.lockedTarget;
    } else {
      for (const e of enemies) { const d = Math.hypot(e.x - player.x, e.y - player.y); if (d < nd) { nd = d; nn = e; } }
      w.lockedTarget = nn;
    }
    const ang = nn ? Math.atan2(nn.y - player.y, nn.x - player.x) : Math.random() * Math.PI * 2;
    const cnt = w.count || 1;
    for (let i = 0; i < cnt; i++) {
      const a = ang + (i - Math.floor(cnt / 2)) * 0.2;
      bullets.push({
        x: player.x, y: player.y,
        vx: Math.cos(a) * (w.speed || 8), vy: Math.sin(a) * (w.speed || 8),
        r: w.r, damage: w.damage * player.dmgMult, life: 90, btype: 'bullet',
        maxPierce: w.pierce || 1, pierces: 0, color: w.color, splash: w.splash || 0,
      });
    }
  } else if (wt === 'boomerang') {
    let nn = null, nd = Infinity;
    if (w.lockedTarget && enemies.includes(w.lockedTarget) && !w.lockedTarget.dead) { nn = w.lockedTarget; }
    else { for (const e of enemies) { const d = Math.hypot(e.x - player.x, e.y - player.y); if (d < nd) { nd = d; nn = e; } } w.lockedTarget = nn; }
    const cnt = w.count || 1;
    for (let i = 0; i < cnt; i++) {
      const ang = (nn ? Math.atan2(nn.y - player.y, nn.x - player.x) : Math.random() * Math.PI * 2) + i * (Math.PI * 2 / cnt);
      bullets.push({
        x: player.x, y: player.y, vx: Math.cos(ang) * (w.speed || 5), vy: Math.sin(ang) * (w.speed || 5),
        r: w.r, damage: w.damage * player.dmgMult, life: 50, btype: 'boomerang',
        maxPierce: 99, pierces: 0, color: w.color,
      });
    }
  } else if (wt === 'orbit') {
    w.durationLeft = w.duration || 1200; w.active = true;
    bullets = bullets.filter(b => b.ownerWid !== w.wid);
    const cnt = w.count || 3;
    for (let i = 0; i < cnt; i++) {
      const ang = i * (Math.PI * 2 / cnt);
      bullets.push({
        x: player.x, y: player.y, r: w.r,
        damage: w.damage * player.dmgMult, life: 999999, btype: 'orbit',
        angle: ang, orbitR: w.orbitR || 80, maxPierce: 99, pierces: 0,
        color: w.color, ownerWid: w.wid,
      });
    }
  } else if (wt === 'lightning') {
    const chain = w.chainCount || 3;
    const near = enemies.slice()
      .sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))
      .slice(0, chain);
    for (const e of near) {
      e.hp -= w.damage * player.dmgMult;
      spawnParticles(e.x, e.y, '#fde047', 5);
      if (e.hp <= 0 && !e.dead) killEnemy(e);
      bullets.push({ x: player.x, y: player.y, tx: e.x, ty: e.y, life: 8, btype: 'lightning_vis', r: 0, damage: 0, color: '#fde047' });
    }
  } else if (wt === 'aura') {
    bullets.push({
      x: player.x, y: player.y, r: w.r, damage: w.damage * player.dmgMult,
      life: 30, btype: 'aura', maxPierce: 99, pierces: 0, color: w.color,
    });
    for (const e of enemies) { if (Math.hypot(e.x - player.x, e.y - player.y) < w.r) e.frozen = Math.round(90 * (1 + (player.frostBonus || 0) * 0.5)); }
  } else if (wt === 'poison') {
    for (let i = 0; i < 2; i++) {
      const a = Math.random() * Math.PI * 2, dist = 15 + Math.random() * 50;
      bullets.push({
        x: player.x + Math.cos(a) * dist, y: player.y + Math.sin(a) * dist,
        r: w.r, damage: w.damage * player.dmgMult, life: 140, btype: 'poison',
        maxPierce: 99, pierces: 0, color: w.color,
      });
    }
  }
}

// ─── Update Weapons (timers + orbit/ghost/holy spawn) ────────────────────────
function updateWeapons() {
  for (const w of weapons) {
    if (w.wtype === 'holy' || w.wtype === 'ghost') {
      if (!w.durationLeft) w.durationLeft = w.duration || 1200;
      w.durationLeft--;
      if (w.durationLeft <= 0) {
        bullets = bullets.filter(b => b.ownerWid !== w.wid);
        w.durationLeft = 0; w.active = false;
      } else {
        const existing = bullets.filter(b => b.ownerWid === w.wid);
        const cnt = w.count || 2;
        if (existing.length !== cnt) {
          bullets = bullets.filter(b => b.ownerWid !== w.wid);
          for (let i = 0; i < cnt; i++) {
            const ang = i * (Math.PI * 2 / cnt);
            bullets.push({
              x: player.x + Math.cos(ang) * (w.orbitR || 120),
              y: player.y + Math.sin(ang) * (w.orbitR || 120),
              r: w.r, damage: w.damage * player.dmgMult, life: 999999,
              btype: w.wtype, angle: ang, orbitR: w.orbitR || 120,
              maxPierce: 99, pierces: 0, color: w.color, ownerWid: w.wid,
            });
          }
        } else {
          for (const b of existing) {
            b.damage = w.damage * player.dmgMult; b.r = w.r;
            b.angle += 0.03;
            b.x = player.x + Math.cos(b.angle) * b.orbitR;
            b.y = player.y + Math.sin(b.angle) * b.orbitR;
          }
        }
      }
    } else {
      w.timer++;
      const effCool = Math.max(5, Math.floor(w.cooldown * (player.cooldownMult || 1)));
      if (w.timer >= effCool) { w.timer = 0; fireWeapon(w); }
    }
  }
}

// ─── Update Bullets ───────────────────────────────────────────────────────────
function updateBullets() {
  for (const b of bullets) {
    if (b.btype === 'orbit') {
      b.angle += 0.035; b.life--;
      b.x = player.x + Math.cos(b.angle) * b.orbitR;
      b.y = player.y + Math.sin(b.angle) * b.orbitR;
    } else if (b.btype === 'aura') {
      b.x = player.x; b.y = player.y; b.life--;
    } else if (b.btype === 'boomerang') {
      b.x += b.vx; b.y += b.vy; b.life--;
      if (b.life === 25) { b.vx *= -1.2; b.vy *= -1.2; }
    } else if (b.btype === 'poison' || b.btype === 'lightning_vis') {
      b.life--;
    } else if (b.btype === 'holy' || b.btype === 'ghost') {
      // position updated by updateWeapons
    } else {
      b.x += b.vx; b.y += b.vy; b.life--;
    }

    if (b.btype === 'lightning_vis') continue;

    for (const e of enemies) {
      if (e.dead) continue;
      if (Math.hypot(b.x - e.x, b.y - e.y) < b.r + e.r) {
        const dmg = b.damage * (b.btype === 'aura' ? 0.18 : 1);
        e.hp -= dmg;
        spawnParticles(e.x, e.y, '#f87171', 3);
        if (b.splash > 0) doSplash(b.x, b.y, b.splash, b.damage * 0.5);
        // Fire bonus from item
        if ((player.fireBonus || 0) > 0 && Math.random() < 0.25) {
          doSplash(b.x, b.y, 40, player.fireBonus);
        }
        if (b.btype !== 'orbit' && b.btype !== 'aura' && b.btype !== 'holy' && b.btype !== 'ghost' && b.btype !== 'poison') {
          b.pierces = (b.pierces || 0) + 1;
          if (b.pierces >= (b.maxPierce || 1)) b.life = -1;
        }
        if (e.hp <= 0 && !e.dead) killEnemy(e);
      }
    }
  }
  bullets = bullets.filter(b => b.life > 0);
}

function doSplash(x, y, r, dmg) {
  for (const e of enemies) {
    if (Math.hypot(e.x - x, e.y - y) < r) {
      e.hp -= dmg;
      if (e.hp <= 0 && !e.dead) killEnemy(e);
    }
  }
  spawnParticles(x, y, '#f97316', 12);
}
