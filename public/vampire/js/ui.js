// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(icon, name, desc, color) {
  const tc = document.getElementById('toast-container');
  if (!tc) return;
  const t = document.createElement('div');
  t.className = 'toast toast-item';
  if (color) t.style.borderColor = color;
  t.innerHTML = `<span class="t-icon">${icon}</span><div class="t-body"><div class="t-name" style="color:${color||'#fde047'}">${name}</div><div class="t-desc">${desc}</div></div>`;
  tc.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity 0.4s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 2800);
}

// ─── HUD Update ───────────────────────────────────────────────────────────────
function updateHUD() {
  const hpPct = Math.max(0, player.hp) / player.maxHp * 100;
  document.getElementById('hp-bar').style.width = hpPct + '%';
  document.getElementById('hp-txt').textContent = Math.ceil(Math.max(0, player.hp)) + '/' + player.maxHp;
  document.getElementById('xp-bar').style.width = (xp / xpNeeded * 100) + '%';
  document.getElementById('lv-txt').textContent = level;
  document.getElementById('kill-txt').textContent = '💀 ' + kills;
  const mm = Math.floor(gameTime / 60), ss = gameTime % 60;
  document.getElementById('time-txt').textContent = '⏱ ' + mm + ':' + String(ss).padStart(2, '0');

  // Item HUD chips
  const iHud = document.getElementById('item-hud');
  if (iHud) {
    const chips = [];
    if (player._dmgBoost) { const sec = Math.ceil((player._dmgBoostTimer || 0) / 60); chips.push({ icon: '💥', name: '공격 2배', timer: sec + 's' }); }
    if ((player.barrier || 0) > 0) chips.push({ icon: '🔮', name: '배리어 ' + Math.ceil(player.barrier), timer: '' });
    if ((player.dodge || 0) > 0) chips.push({ icon: '🌀', name: '회피 ' + Math.round(player.dodge * 100) + '%', timer: '' });
    if ((player.armor || 0) > 0) chips.push({ icon: '🛡️', name: '방어 ' + Math.round(player.armor * 100) + '%', timer: '' });
    if ((player.thorns || 0) > 0) chips.push({ icon: '⚡', name: '반격 ' + player.thorns, timer: '' });
    for (const w of weapons) {
      if (w.duration && (w.durationLeft || 0) > 0)
        chips.push({ icon: w.wtype === 'holy' ? '✝️' : '👻', name: w.name.split(' ').slice(0, 2).join(' '), timer: Math.ceil(w.durationLeft / 60) + 's' });
    }
    const itemChips = activeItems.map(i => ({ icon: i.icon, name: i.name, timer: '' }));
    const allChips = [...chips, ...itemChips];
    // Show icons-only when many items; full chip when ≤4
    const compact = allChips.length > 4;
    iHud.innerHTML = allChips.slice(0, compact ? 16 : 8).map(c =>
      compact
        ? `<div class="item-chip item-chip-sm" title="${c.name}${c.timer?' '+c.timer:''}">${c.icon}${c.timer?`<span class="ic-timer-sm">${c.timer}</span>`:''}</div>`
        : `<div class="item-chip"><span class="ic-icon">${c.icon}</span><span>${c.name}</span>${c.timer ? `<span class="ic-timer">${c.timer}</span>` : ''}</div>`
    ).join('');
  }

  // Weapon level HUD
  const wlvHud = document.getElementById('wlv-hud');
  if (wlvHud) {
    wlvHud.innerHTML = weapons.map(w => {
      const lv = w.wlevel || 1, maxed = lv >= 8;
      const pips = Array.from({ length: 8 }, (_, i) => `<div class="wlv-pip ${i < lv ? (maxed ? 'maxed' : 'filled') : ''}"></div>`).join('');
      return `<div class="wlv-row">${w.name.split(' ').slice(0, 2).join(' ')}${w.evolved ? '✨' : ''}<div class="wlv-pips">${pips}</div></div>`;
    }).join('');
  }
}

// ─── Legend / Transcend Effects ───────────────────────────────────────────────
function triggerLegendEffect() {
  // Gold particle burst at player position (game world)
  for (let i = 0; i < 35; i++) {
    const a = Math.random() * Math.PI * 2, s = Math.random() * 5 + 2;
    particles.push({ x: player.x, y: player.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5, life: 45, color: '#fde047' });
  }
  for (let i = 0; i < 15; i++) {
    const a = Math.random() * Math.PI * 2, s = Math.random() * 3 + 1;
    particles.push({ x: player.x, y: player.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 30, color: '#eab308' });
  }
}

function triggerTranscendEffect() {
  // Rainbow multicolor burst
  const colors = ['#ef4444', '#f97316', '#eab308', '#4ade80', '#3b82f6', '#8b5cf6', '#ec4899'];
  for (let i = 0; i < 55; i++) {
    const a = Math.random() * Math.PI * 2, s = Math.random() * 6 + 2;
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push({ x: player.x, y: player.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, life: 55, color });
  }
  // Screen flash
  const flashEl = document.getElementById('flash-overlay');
  if (flashEl) {
    flashEl.classList.remove('flash-active');
    void flashEl.offsetWidth; // reflow
    flashEl.classList.add('flash-active');
    setTimeout(() => flashEl.classList.remove('flash-active'), 800);
  }
}

// ─── Level Up UI ─────────────────────────────────────────────────────────────
function levelUp() {
  level++; paused = true;
  const el    = document.getElementById('level-up');
  const cards = document.getElementById('upg-cards');
  el.style.display = 'flex'; cards.innerHTML = '';

  const ownedWids = new Set(weapons.map(w => w.wid));
  const collectedItemIds = new Set(activeItems.filter(i => i.id).map(i => i.id));
  let pool = [];

  // Force evolution picks first
  for (const evo of EVOLUTION_DEFS) {
    if (evolvedWeapons.has(evo.id)) continue;
    const w = weapons.find(x => x.wid === evo.baseWid);
    if (w && (w.wlevel || 1) >= evo.reqLevel && collectedItemIds.has(evo.reqItemId)) {
      pool.unshift({ uid: evo.id, name: evo.name, desc: evo.desc, icon: evo.icon, utype: 'evo', tier: 6, evoData: evo, _forcePick: true });
    }
  }
  for (const u of WEAPON_NEW)      { if (!ownedWids.has(u.wid)) pool.push({ ...u }); }
  const usedWids = new Set();
  for (const u of [...WEAPON_UPGRADES].sort(() => Math.random() - 0.5)) {
    if (ownedWids.has(u.wid) && !usedWids.has(u.wid)) { pool.push({ ...u }); usedWids.add(u.wid); }
  }
  pool.push(...STAT_UPGRADES.map(u => ({ ...u })));

  const picks = []; const usedU = new Set();
  for (const u of pool) { if (u._forcePick && picks.length < 3) { picks.push(u); usedU.add(u.uid); } }
  pool.filter(u => !u._forcePick).sort(() => Math.random() - 0.5);
  for (const u of pool) {
    if (picks.length >= 3) break;
    if (!u._forcePick && !usedU.has(u.uid)) { picks.push(u); usedU.add(u.uid); }
  }
  while (picks.length < 3) {
    const fb = STAT_UPGRADES[picks.length % STAT_UPGRADES.length];
    picks.push({ ...fb, uid: fb.uid + '_fb' + picks.length });
  }

  let hasLegend = false, hasTranscend = false;

  for (const u of picks) {
    const grade = rollGradeFrom(u.tier || 0);
    u._grade = grade;
    computeUpgradeValues(u, grade);

    if (grade.idx === 5) hasLegend = true;
    if (grade.idx === 6) hasTranscend = true;

    const d = document.createElement('div');
    const isWupgrade = u.utype === 'wupgrade';
    const isEvo      = u.utype === 'evo';
    d.className = `upg-card ${isWupgrade ? 'is-upgrade ' : ''}${isEvo ? 'is-evo ' : ''}${grade.cls}`;
    if (grade.cls !== 'grade-transcend') {
      d.style.borderColor = grade.color;
      d.style.background  = grade.bg;
      d.style.boxShadow   = `0 0 8px ${grade.color}66`;
    }

    const gradeStars = { '일반':'', '레어':'★', '희귀':'★★', '에픽':'★★★', '유니크':'◆', '레전드':'◆◆', '초월':'✦' };

    // Add shimmer / holo overlay for legend/transcend
    let overlayHtml = '';
    if (grade.idx === 5) overlayHtml = '<div class="legend-shimmer"></div>';
    if (grade.idx === 6) overlayHtml = '<div class="transcend-holo"></div>';

    d.innerHTML = overlayHtml
      + `<div class="upg-icon">${u.icon}</div>`
      + `<div class="upg-name" style="color:${grade.color}">${u.name}</div>`
      + `<div class="upg-desc">${u.desc}</div>`
      + `<div class="grade-badge" style="background:${grade.color}22;color:${grade.color};border:1px solid ${grade.color}88">${gradeStars[grade.name] ? gradeStars[grade.name] + ' ' : ''}${grade.name}</div>`;

    const uu = u;
    d.onclick = () => { applyUpgrade(uu); el.style.display = 'none'; paused = false; };
    cards.appendChild(d);
  }

  // Trigger special effects after DOM update
  if (hasTranscend) {
    setTimeout(triggerTranscendEffect, 50);
  } else if (hasLegend) {
    setTimeout(triggerLegendEffect, 50);
  }
}

// ─── Apply Upgrade ────────────────────────────────────────────────────────────
function applyUpgrade(u) {
  const v = u._vals || {};
  if (u.utype === 'stat') {
    if (u.uid.startsWith('spd'))     player.spd *= (1 + (v.spd || 0.2));
    else if (u.uid.startsWith('hp')) { const add = v.hp || 30; player.maxHp += add; player.hp = Math.min(player.hp + add, player.maxHp); }
    else if (u.uid.startsWith('dmg')) player.dmgMult *= (1 + (v.dmg || 0.2));
    else if (u.uid.startsWith('pie')) {
      const k = weapons.find(w => w.wid === 'knife'); if (k) k.pierce = (k.pierce || 1) + 1;
      const f = weapons.find(w => w.wid === 'fireball'); if (f) f.pierce = (f.pierce || 1) + 1;
    }
    else if (u.uid.startsWith('xpb')) player.xpMult *= (1 + (v.xp || 0.3));
    else if (u.uid.startsWith('mag')) player.magnetR += (v.mag || 50);
    else if (u.uid.startsWith('reg')) player.regen = (player.regen || 0) + (v.regen || 1);
    else if (u.uid.startsWith('luc')) player.luck *= (1 + (v.luck || 0.25));
    else if (u.uid.startsWith('dod')) player.dodge = Math.min(0.5, (player.dodge || 0) + (v.dodge || 0.1));
    else if (u.uid.startsWith('arm')) player.armor = Math.min(0.7, (player.armor || 0) + (v.armor || 0.08));
    else if (u.uid.startsWith('bar')) { player.barrierMax = (player.barrierMax || 0) + (v.barrier || 80); player.barrier = (player.barrier || 0) + (v.barrier || 80); }
    else if (u.uid.startsWith('tho')) player.thorns = (player.thorns || 0) + (v.thorns || 20);
    else if (u.uid.startsWith('dur')) { const mult = 1 + (v.dur || 0.2); for (const w of weapons) { if (w.duration) w.duration = Math.round(w.duration * mult); } }
    else if (u.uid.startsWith('coo')) player.cooldownMult = Math.max(0.3, (player.cooldownMult || 1) * (1 - (v.cd || 0.1)));
  } else if (u.utype === 'new') {
    const def = WEAPON_DEFS[u.wid];
    if (def) {
      const dur = def.duration;
      weapons.push({ ...def, wid: u.wid, timer: 0, pierce: def.pierce || 1, count: def.count || 1, chainCount: def.chainCount || 3, orbitR: def.orbitR || 80, durationLeft: dur || 0, active: !dur, wlevel: 1 });
    }
  } else if (u.utype === 'evo') {
    const evo = u.evoData; if (!evo) return;
    evolvedWeapons.add(evo.id);
    const w = weapons.find(x => x.wid === evo.baseWid);
    if (w) {
      w.damage *= 3.5; w.wlevel = 9; w.evolved = true; w.evolvedName = evo.name;
      if (w.wid === 'knife')  { w.count = (w.count || 1) + 3; w.pierce = 99; w.cooldown = Math.max(10, w.cooldown * 0.5); }
      if (w.wid === 'magic')  { w.orbitR = (w.orbitR || 80) + 120; w.count = (w.count || 3) + 3; bullets = bullets.filter(b => b.ownerWid !== w.wid); }
      if (w.wid === 'axe')    { w.count = 3; w.damage *= 1.5; }
      if (w.wid === 'freeze') { w.r = (w.r || 120) * 3; w.cooldown = Math.max(20, w.cooldown * 0.5); }
      if (w.wid === 'poison') { w.r = (w.r || 32) * 3; w.damage *= 2; player.lifesteal = (player.lifesteal || 0) + 15; }
      spawnParticles(player.x, player.y, '#ff6ac1', 20);
      spawnParticles(player.x, player.y, '#fde047', 20);
    }
  } else if (u.utype === 'wupgrade') {
    const w = weapons.find(x => x.wid === u.wid);
    if (!w) return;
    w.wlevel = Math.min(8, (w.wlevel || 1) + 1);
    if (u.uid === 'up_knife_dmg')       { w.damage *= (1 + (v.d || 0.3)); w.cooldown = Math.max(10, w.cooldown * 0.85); }
    else if (u.uid === 'up_knife_cnt')  w.count = (w.count || 1) + 1;
    else if (u.uid === 'up_axe_dmg')    w.damage *= (1 + (v.d || 0.4));
    else if (u.uid === 'up_magic_orb')  { w.orbitR = (w.orbitR || 80) + (v.r || 30); w.damage *= (1 + (v.d || 0.2)); bullets = bullets.filter(b => b.ownerWid !== w.wid); }
    else if (u.uid === 'up_fireball_splash') { w.splash = (w.splash || 50) + (v.sp || 25); w.damage *= (1 + (v.d || 0.2)); }
    else if (u.uid === 'up_lightning_chain') w.chainCount = (w.chainCount || 3) + (v.ch || 2);
    else if (u.uid === 'up_freeze_range')    w.r = (w.r || 120) + (v.r || 40);
    else if (u.uid === 'up_holy_cnt')   { w.count = (w.count || 4) + 1; w.damage *= (1 + (v.d || 0.3)); bullets = bullets.filter(b => b.ownerWid !== w.wid); }
    else if (u.uid === 'up_poison_size'){ w.r = (w.r || 40) + (v.r || 20); w.damage *= (1 + (v.d || 0.3)); }
    else if (u.uid === 'up_ghost_cnt')  { w.count = (w.count || 2) + 1; w.damage *= (1 + (v.d || 0.3)); bullets = bullets.filter(b => b.ownerWid !== w.wid); }
  }
}

// ─── Game Over Screen ────────────────────────────────────────────────────────
function showGameOver() {
  const ov = document.getElementById('overlay');
  const mm = Math.floor(gameTime / 60), ss = gameTime % 60;
  const timeStr = mm + ':' + String(ss).padStart(2, '0');
  ov.innerHTML = `
    <h1>💀 사망</h1>
    <p>생존 시간: ${timeStr}<br>처치 수: ${kills}<br>레벨: ${level}</p>
    <div style="margin:12px 0">
      <p style="color:#c084fc;font-size:0.85rem;margin-bottom:6px">🏆 이니셜 등록 (영문 대문자 1~3자)</p>
      <input id="initial-input" maxlength="3" placeholder="AAA"
        style="background:#1a1030;border:1px solid #7c3aed;color:#f0e6ff;padding:8px 14px;border-radius:8px;font-size:1.2rem;text-align:center;width:80px;text-transform:uppercase"
        oninput="this.value=this.value.toUpperCase().replace(/[^A-Z]/g,'')">
      <button class="start" style="margin-left:8px;padding:8px 16px;font-size:0.9rem" onclick="submitRanking(${gameTime},${kills},${level})">순위 등록</button>
    </div>
    <div id="rank-msg" style="font-size:0.8rem;color:#9f8ab8;margin-bottom:10px"></div>
    <div id="rank-table" style="max-height:260px;overflow-y:auto;margin-bottom:12px;width:100%;max-width:360px;"></div>
    <button class="start" onclick="startGame()">다시 도전!</button>
  `;
  ov.style.display = 'flex';
}

// ─── Ranking Submit ───────────────────────────────────────────────────────────
async function submitRanking(time, kills, level) {
  const input = document.getElementById('initial-input');
  const initials = (input ? input.value : '').toUpperCase().trim();
  const msg = document.getElementById('rank-msg');
  const rankTable = document.getElementById('rank-table');
  if (!initials || !/^[A-Z]{1,3}$/.test(initials)) { msg.textContent = '⚠️ 영문 대문자 1~3자로 입력해주세요'; return; }
  msg.textContent = '⏳ 등록 중...';
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submitScore', initials, time, kills, level, version: 'v2.0', difficulty: diffName }),
    });
    msg.textContent = '✅ 랭킹 등록 완료! 상위 10위:';
  } catch (e) { msg.textContent = '⚠️ 등록 실패'; }
  try {
    const r = await fetch(APPS_SCRIPT_URL + '?action=getRanking');
    const data = await r.json();
    const rows = data.ranking || data || [];
    if (rankTable && rows.length) {
      const fmt = s => { const m = Math.floor(s / 60), sc = s % 60; return m + ':' + String(sc).padStart(2, '0'); };
      rankTable.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:0.78rem;color:#e2d4ff">'
        + '<tr style="color:#c084fc;border-bottom:1px solid #3d2a5e"><th>#</th><th>이니셜</th><th>시간</th><th>킬</th><th>레벨</th><th>난이도</th></tr>'
        + rows.slice(0, 10).map((row, i) =>
            `<tr style="border-bottom:1px solid #1a1030;${row.initials === initials && row.time === time ? 'background:#2d1f4e' : ''}">
              <td>${i + 1}</td><td>${row.initials}</td><td>${fmt(row.time)}</td><td>${row.kills}</td><td>${row.level}</td><td>${row.difficulty || '-'}</td></tr>`
          ).join('')
        + '</table>';
    }
  } catch (e) {}
}
