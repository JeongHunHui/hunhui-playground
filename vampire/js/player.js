// ─── Character Selection ──────────────────────────────────────────────────────
let selectedChar = 'warrior';

function selectChar(id, el) {
  selectedChar = id;
  document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

// ─── Player Init ──────────────────────────────────────────────────────────────
function initPlayer(ch) {
  const baseHp = Math.round(100 * ch.hpMult);
  return {
    x: 0, y: 0, r: 16,
    hp: baseHp, maxHp: baseHp,
    spd: 2.5 * ch.spdMult,
    invincible: 0,
    dmgMult: ch.dmgMult,
    magnetR: 80,
    xpMult: ch.xpMult,
    regen: 0,
    luck: 1,
    dodge: 0,
    armor: 0,
    barrierMax: 0,
    barrier: 0,
    barrierCooldown: 0,
    thorns: 0,
    durationMult: 1,
    cooldownMult: 1,
    lifesteal: 0,
    xpPerKill: 0,
    frostBonus: 0,
    fireBonus: 0,
    charEmoji: ch.emoji,
    _dmgBoost: false,
    _dmgBoostTimer: 0,
  };
}
