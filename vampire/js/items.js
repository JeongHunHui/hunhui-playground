// ─── Spawn Item (with grade) ──────────────────────────────────────────────────
function spawnItem(x, y) {
  const rnd = Math.random();
  let acc = 0;
  let def = ITEM_DEFS[0];
  for (const d of ITEM_DEFS) { acc += d.rarity; if (rnd < acc) { def = d; break; } }

  const grade = rollItemGrade();
  const desc  = def.descFn(grade.mult);

  droppedItems.push({
    ...def,
    x, y, r: 14, life: 600, pulse: 0, collected: false,
    grade, desc,
  });
}

// ─── Collect Dropped Item ────────────────────────────────────────────────────
function collectItem(it) {
  it.apply(player, it.grade.mult);
  activeItems.push({ icon: it.icon, name: it.name, desc: it.desc, id: it.id });

  // Particles: color and count based on grade
  const n = it.grade.particleN || 8;
  spawnParticles(it.x, it.y, it.grade.color, n);
  // Extra white sparkle for epic+
  if (it.grade.prob <= 0.11) spawnParticles(it.x, it.y, '#ffffff', Math.floor(n * 0.4));

  // Toast with grade name and color
  const gradePrefix = `${it.grade.gradeEmoji} ${it.grade.name}`;
  showToast(it.icon, `${gradePrefix} ${it.name}`, it.desc, it.grade.color);
}

// ─── Spawn Chest ─────────────────────────────────────────────────────────────
function spawnChest() {
  const angle = Math.random() * Math.PI * 2;
  const d = 150 + Math.random() * 200;
  chests.push({ x: player.x + Math.cos(angle) * d, y: player.y + Math.sin(angle) * d, r: 18, collected: false, pulse: 0 });
}

// ─── Open Chest ───────────────────────────────────────────────────────────────
function openChest(c) {
  spawnParticles(c.x, c.y, '#fde047', 15);
  const roll = Math.random();
  if (roll < 0.30) {
    const heal = Math.round(player.maxHp * 0.3);
    player.hp = Math.min(player.maxHp, player.hp + heal);
    spawnParticles(c.x, c.y, '#ef4444', 8);
    showToast('❤️', '체력 회복', `HP +${heal}`, '#ef4444');
  } else if (roll < 0.52) {
    const xpAmt = Math.round(xpNeeded * 0.4 + 50);
    gainXp(xpAmt);
    spawnParticles(c.x, c.y, '#c084fc', 10);
    showToast('⭐', '경험치 획득', `XP +${xpAmt}`, '#c084fc');
  } else if (roll < 0.70) {
    player._dmgBoostTimer = (player._dmgBoostTimer || 0) + 900;
    if (!player._dmgBoost) { player._dmgBoost = true; player.dmgMult *= 2; }
    spawnParticles(c.x, c.y, '#ef4444', 12);
    showToast('💥', '공격 2배 버프', '15초 동안 공격력 2배!', '#ef4444');
  } else if (roll < 0.84) {
    player.magnetR += 25;
    spawnParticles(c.x, c.y, '#7c3aed', 8);
    showToast('🧲', '자석 강화', '자석 범위 +25', '#7c3aed');
  } else {
    spawnItem(c.x, c.y - 30);
    spawnParticles(c.x, c.y, '#fde047', 22);
    showToast('📦', '레어 보물!', '아이템 드롭!', '#fde047');
  }
}

// ─── Update All Items ─────────────────────────────────────────────────────────
function updateItems() {
  // Health items
  for (const h of healthItems) {
    h.pulse += 0.1; h.life--;
    if (h.life <= 0) { h.collected = true; continue; }
    if (Math.hypot(player.x - h.x, player.y - h.y) < player.r + h.r) {
      h.collected = true;
      player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.15);
      spawnParticles(player.x, player.y, '#ef4444', 8);
    }
  }
  healthItems = healthItems.filter(h => !h.collected);

  // Chests
  chestSpawnTimer++;
  if (chestSpawnTimer >= Math.floor(2400 + Math.random() * 1800)) { chestSpawnTimer = 0; spawnChest(); }
  for (const c of chests) {
    c.pulse = (c.pulse || 0) + 0.05;
    if (Math.hypot(player.x - c.x, player.y - c.y) < player.r + c.r) { c.collected = true; openChest(c); }
  }
  chests = chests.filter(c => !c.collected);

  // Dropped items (graded)
  for (const it of droppedItems) {
    it.pulse = (it.pulse || 0) + 0.06; it.life--;
    if (Math.hypot(player.x - it.x, player.y - it.y) < player.r + it.r) {
      it.collected = true;
      collectItem(it);
    }
  }
  droppedItems = droppedItems.filter(it => !it.collected && it.life > 0);
}
