// ─── Global Constants ───────────────────────────────────────────────────────
const APPS_SCRIPT_URL = '/api/ranking';

// ─── Characters ─────────────────────────────────────────────────────────────
const CHARACTERS = {
  warrior: {icon:'⚔️',name:'전사',  emoji:'⚔️',startWeapons:['axe'],       hpMult:1.5,spdMult:0.9,dmgMult:1.0,xpMult:1.0},
  mage:    {icon:'🧙',name:'마법사',emoji:'🧙',startWeapons:['knife','magic'],hpMult:0.8,spdMult:1.0,dmgMult:1.0,xpMult:1.3},
  rogue:   {icon:'🗡️',name:'도적',  emoji:'🗡️',startWeapons:['knife','poison'],hpMult:1.0,spdMult:1.3,dmgMult:0.9,xpMult:1.0},
};

// ─── Weapon Definitions ──────────────────────────────────────────────────────
const WEAPON_DEFS = {
  knife:    {name:'🗡 단검',      desc:'빠른 단검 발사',       color:'#e2d4ff',cooldown:80, damage:12,speed:8,r:6, wtype:'bullet',  pierce:1,count:1},
  axe:      {name:'🪓 도끼',      desc:'되돌아오는 도끼',       color:'#f97316',cooldown:160,damage:22,speed:5,r:10,wtype:'boomerang'},
  magic:    {name:'✨ 마법진',    desc:'주변을 회전 공격',       color:'#c084fc',cooldown:200,damage:7, r:8, wtype:'orbit',   orbitR:80, count:3,duration:1200},
  fireball: {name:'🔥 파이어볼',  desc:'강력한 폭발 투사체',    color:'#ef4444',cooldown:180,damage:25,speed:4,r:12,wtype:'bullet',  pierce:1,splash:50},
  lightning:{name:'⚡ 번개',      desc:'가장 가까운 적 공격',   color:'#fde047',cooldown:140,damage:15,wtype:'lightning',chainCount:2},
  freeze:   {name:'❄️ 냉기장',    desc:'주변 적 빙결 + 슬로우', color:'#7dd3fc',cooldown:200,damage:10,r:120,wtype:'aura'},
  holy:     {name:'✝️ 성스러운 오라',desc:'성광 오브가 적을 태움',color:'#fef08a',cooldown:2, damage:11,r:14,wtype:'holy',   orbitR:110,count:3,duration:1500},
  poison:   {name:'☠️ 독구름',    desc:'독 지대를 생성해 데미지',color:'#4ade80',cooldown:250,damage:4, r:32,wtype:'poison'},
  ghost:    {name:'👻 유령 소환', desc:'유령이 주위를 공격',     color:'#a5b4fc',cooldown:2, damage:12,r:13,wtype:'ghost',  orbitR:130,count:2,duration:1800},
};

// ─── Evolution Definitions ───────────────────────────────────────────────────
const EVOLUTION_DEFS = [
  {id:'evo_holy_blade', name:'⚔️ 성검',      desc:'단검Lv8+공격 반지 → 성스러운 검',   baseWid:'knife',  reqItemId:'ring_dmg',   reqLevel:8,icon:'⚔️',color:'#fde047'},
  {id:'evo_black_hole', name:'🌀 블랙홀',     desc:'마법진Lv8+자석 보석 → 블랙홀',      baseWid:'magic',  reqItemId:'magnet_gem', reqLevel:8,icon:'🌀',color:'#8b5cf6'},
  {id:'evo_storm_axe',  name:'🌪️ 폭풍 도끼', desc:'도끼Lv8+루비 아뮬렛 → 폭풍 도끼',  baseWid:'axe',    reqItemId:'ruby',       reqLevel:8,icon:'🌪️',color:'#ef4444'},
  {id:'evo_blizzard',   name:'❄️ 블리자드',   desc:'냉기장Lv8+서리 결정 → 전체 냉동',   baseWid:'freeze', reqItemId:'frost_gem',  reqLevel:8,icon:'❄️',color:'#7dd3fc'},
  {id:'evo_death_cloud',name:'💀 죽음의 독',  desc:'독구름Lv8+흡혈 반지 → 생명 흡수',   baseWid:'poison', reqItemId:'lifesteal',  reqLevel:8,icon:'💀',color:'#4ade80'},
];

// ─── Enemy Types ─────────────────────────────────────────────────────────────
const ENEMY_TYPES = [
  // === 초반 (0~30초) ===
  {minT:0,   em:'🟢',color:'#22c55e',name:'슬라임',     hpM:1,   spdM:1,   rM:1,   xpM:1,   dmgM:1,   type:'normal'},
  {minT:15,  em:'🦇',color:'#7c3aed',name:'박쥐',       hpM:0.22,spdM:2.4, rM:0.7, xpM:0.7, dmgM:0.55,type:'bat', spawnCount:3},
  // === 초중반 (30~90초) ===
  {minT:30,  em:'💀',color:'#d4d4d4',name:'해골',       hpM:0.65,spdM:1.6, rM:0.9, xpM:1.2, dmgM:0.85,type:'normal'},
  {minT:30,  em:'⚡',color:'#fde047',name:'전기 슬라임', hpM:0.9, spdM:1.1, rM:0.95,xpM:1.3, dmgM:1.1, type:'elec'},
  {minT:45,  em:'🧟',color:'#65a30d',name:'좀비',       hpM:3.0, spdM:0.45,rM:1.2, xpM:1.6, dmgM:1.3, type:'zombie'},
  // === 중반 (60~150초) ===
  {minT:60,  em:'🎯',color:'#92400e',name:'해골 궁수',   hpM:0.7, spdM:0.75,rM:0.9, xpM:1.5, dmgM:0.0, type:'archer', shootDmg:12, shootCool:150},
  {minT:90,  em:'🛡️',color:'#64748b',name:'기사',       hpM:2.5, spdM:0.7, rM:1.2, xpM:1.8, dmgM:1.4, type:'normal'},
  {minT:90,  em:'👹',color:'#7f1d1d',name:'오거',        hpM:4.2, spdM:0.35,rM:1.5, xpM:2.2, dmgM:2.0, type:'ogre'},
  // === 후반 (120~210초) ===
  {minT:120, em:'🧙',color:'#1e40af',name:'마법사',     hpM:1.5, spdM:0.6, rM:1.0, xpM:2.0, dmgM:1.8, type:'mage', teleportCool:220, shootDmg:20, shootCool:90},
  {minT:150, em:'😈',color:'#dc2626',name:'데몬',       hpM:2,   spdM:1.4, rM:1.1, xpM:2.5, dmgM:1.7, type:'normal'},
  // === 최후반 (210초+) ===
  {minT:210, em:'🐉',color:'#7c3aed',name:'드래곤',     hpM:4,   spdM:0.9, rM:1.4, xpM:4,   dmgM:2.2, type:'normal'},
];

const BOSS_TYPES = [
  {minT:0,   em:'👑',color:'#16a34a',name:'슬라임 킹',  hpM:10,spdM:0.55,rM:2.2,xpM:30, dmgM:2},
  {minT:60,  em:'💀',color:'#a3a3a3',name:'해골 군주',  hpM:14,spdM:0.85,rM:2,  xpM:45, dmgM:2.6},
  {minT:120, em:'⚔️',color:'#475569',name:'암흑 기사',  hpM:20,spdM:0.75,rM:2.3,xpM:55, dmgM:3.1},
  {minT:180, em:'👿',color:'#991b1b',name:'대악마',     hpM:28,spdM:1.05,rM:2.5,xpM:75, dmgM:3.7},
  {minT:240, em:'🐲',color:'#5b21b6',name:'고대 드래곤',hpM:45,spdM:0.9, rM:3.0,xpM:120,dmgM:4.5},
];

// ─── Item Definitions (graded) ───────────────────────────────────────────────
// apply(player, multiplier) — multiplier from item grade
const ITEM_DEFS = [
  {id:'ring_dmg',   icon:'💍', name:'공격 반지',    rarity:0.28, descFn:m=>`공격력 +${Math.round(20*m)}%`,        apply:(p,m)=>{p.dmgMult*=(1+0.20*m);}},
  {id:'wind_boots', icon:'🌪️', name:'질풍 부츠',    rarity:0.24, descFn:m=>`이동속도 +${Math.round(25*m)}%`,      apply:(p,m)=>{p.spd*=(1+0.25*m);}},
  {id:'ruby',       icon:'🔴', name:'루비 아뮬렛',  rarity:0.22, descFn:m=>`최대 HP +${Math.round(50*m)}`,        apply:(p,m)=>{const v=Math.round(50*m);p.maxHp+=v;p.hp=Math.min(p.hp+v,p.maxHp);}},
  {id:'lifesteal',  icon:'🩸', name:'흡혈 반지',    rarity:0.14, descFn:m=>`킬 시 HP+${Math.round(5*m)}`,         apply:(p,m)=>{p.lifesteal=(p.lifesteal||0)+Math.round(5*m);}},
  {id:'magnet_gem', icon:'💎', name:'자석 보석',    rarity:0.13, descFn:m=>`XP 범위 +${Math.round(80*m)}`,        apply:(p,m)=>{p.magnetR+=Math.round(80*m);}},
  {id:'amulet',     icon:'🧿', name:'수호 부적',    rarity:0.09, descFn:m=>`회피율 +${Math.round(15*m)}%`,        apply:(p,m)=>{p.dodge=Math.min(0.5,(p.dodge||0)+0.15*m);}},
  {id:'frost_gem',  icon:'❄️', name:'서리 결정',    rarity:0.07, descFn:m=>`냉기 오라 강화 x${m.toFixed(1)}`,     apply:(p,m)=>{p.frostBonus=(p.frostBonus||0)+m;}},
  {id:'fire_stone', icon:'🔥', name:'화염 석',      rarity:0.06, descFn:m=>`공격 폭발 +${Math.round(15*m)}`,      apply:(p,m)=>{p.fireBonus=(p.fireBonus||0)+Math.round(15*m);}},
  {id:'angel_wing', icon:'👼', name:'천사의 날개',  rarity:0.03, descFn:m=>`HP+${Math.round(100*m)}, 재생+${Math.round(2*m)}`, apply:(p,m)=>{const v=Math.round(100*m);p.maxHp+=v;p.hp=Math.min(p.hp+v,p.maxHp);p.regen=(p.regen||0)+Math.round(2*m);}},
  {id:'dragon_orb', icon:'🐉', name:'용의 구슬',    rarity:0.02, descFn:m=>`공격력 +${Math.round(40*m)}%, HP+${Math.round(80*m)}`, apply:(p,m)=>{p.dmgMult*=(1+0.40*m);const v=Math.round(80*m);p.maxHp+=v;p.hp=Math.min(p.hp+v,p.maxHp);}},
  {id:'shadow_gem', icon:'🌑', name:'암흑 보석',    rarity:0.04, descFn:m=>`방어력 +${Math.round(12*m)}%`,        apply:(p,m)=>{p.armor=Math.min(0.7,(p.armor||0)+0.12*m);}},
  {id:'speed_rune', icon:'🔷', name:'속도 룬',      rarity:0.08, descFn:m=>`이동속도 +${Math.round(20*m)}%, XP +${Math.round(15*m)}%`, apply:(p,m)=>{p.spd*=(1+0.20*m);p.xpMult*=(1+0.15*m);}},
];

// ─── Item Grades ─────────────────────────────────────────────────────────────
const ITEM_GRADES = [
  {name:'일반',   color:'#9ca3af',gradeEmoji:'⬜',prob:0.38,mult:1.0,  particleN:6},
  {name:'레어',   color:'#3b82f6',gradeEmoji:'🟦',prob:0.26,mult:1.2,  particleN:10},
  {name:'희귀',   color:'#4ade80',gradeEmoji:'🟩',prob:0.18,mult:1.4,  particleN:14},
  {name:'에픽',   color:'#8b5cf6',gradeEmoji:'🟪',prob:0.11,mult:1.7,  particleN:20},
  {name:'유니크', color:'#f97316',gradeEmoji:'🟧',prob:0.05,mult:2.2,  particleN:28},
  {name:'레전드', color:'#eab308',gradeEmoji:'⭐',prob:0.02,mult:3.0,  particleN:40},
  {name:'초월',   color:'#ef4444',gradeEmoji:'💫',prob:0.01,mult:4.5,  particleN:60},
];

// ─── Skill Upgrade Grades ─────────────────────────────────────────────────────
const GRADES = [
  {name:'일반',   color:'#9ca3af',bg:'#151515',  prob:0.38,idx:0,cls:'grade-common'},
  {name:'레어',   color:'#3b82f6',bg:'#0d1f4e',  prob:0.26,idx:1,cls:'grade-rare'},
  {name:'희귀',   color:'#4ade80',bg:'#051a0d',  prob:0.18,idx:2,cls:'grade-uncommon'},
  {name:'에픽',   color:'#8b5cf6',bg:'#1a0d4e',  prob:0.11,idx:3,cls:'grade-epic'},
  {name:'유니크', color:'#f97316',bg:'#2a1500',  prob:0.05,idx:4,cls:'grade-unique'},
  {name:'레전드', color:'#eab308',bg:'#1f1a00',  prob:0.02,idx:5,cls:'grade-legend'},
  {name:'초월',   color:'#ef4444',bg:'#1a0510',  prob:0.01,idx:6,cls:'grade-transcend'},
];
const GRADE_MULT = [1.0,1.25,1.6,2.0,2.6,3.4,5.0];

// ─── Stat Upgrades Pool ───────────────────────────────────────────────────────
const STAT_UPGRADES = [
  {uid:'spd',      name:'💨 이동속도+',    desc:'이동속도 증가',        icon:'💨',utype:'stat',tier:0},
  {uid:'hp',       name:'❤️ 최대 HP+',    desc:'최대 HP 증가',          icon:'❤️',utype:'stat',tier:0},
  {uid:'xpboost',  name:'🌟 경험치+',     desc:'XP 획득량 증가',        icon:'🌟',utype:'stat',tier:0},
  {uid:'magnet',   name:'🧲 자석 범위+',  desc:'XP 흡수 범위 증가',     icon:'🧲',utype:'stat',tier:0},
  {uid:'dmg',      name:'⚔️ 공격력+',    desc:'모든 무기 공격력 증가',  icon:'⚔️',utype:'stat',tier:2},
  {uid:'regen',    name:'💚 재생력+',     desc:'초당 HP 회복',           icon:'💚',utype:'stat',tier:1},
  {uid:'luck',     name:'🍀 행운+',       desc:'XP 드롭량 증가',         icon:'🍀',utype:'stat',tier:0},
  {uid:'pierce',   name:'🎯 관통+',       desc:'단검/파이어볼 관통 +1',  icon:'🎯',utype:'stat',tier:2},
  {uid:'dodge',    name:'🌀 회피율+',     desc:'피해 회피 확률 증가',    icon:'🌀',utype:'stat',tier:2},
  {uid:'armor',    name:'🛡️ 방어력+',    desc:'받는 피해 감소',          icon:'🛡️',utype:'stat',tier:2},
  {uid:'barrier',  name:'🔮 배리어',      desc:'주기적 피해 무효화 막',  icon:'🔮',utype:'stat',tier:3},
  {uid:'thorns',   name:'⚡ 반격',        desc:'피격 시 주변 적 데미지', icon:'⚡',utype:'stat',tier:3},
  {uid:'duration', name:'⏳ 지속시간+',  desc:'소환/오브 지속시간 증가', icon:'⏳',utype:'stat',tier:2},
  {uid:'cooldown', name:'⏱ 쿨다운-',     desc:'무기 쿨다운 감소',        icon:'⏱',utype:'stat',tier:3},
];

const WEAPON_NEW = [
  {uid:'w_knife',    wid:'knife',    name:'🗡 단검',         desc:'빠른 단검 발사',    icon:'🗡',utype:'new',tier:0},
  {uid:'w_axe',      wid:'axe',      name:'🪓 도끼',         desc:'되돌아오는 도끼',   icon:'🪓',utype:'new',tier:1},
  {uid:'w_magic',    wid:'magic',    name:'✨ 마법진',       desc:'주변 회전 공격',    icon:'✨',utype:'new',tier:2},
  {uid:'w_freeze',   wid:'freeze',   name:'❄️ 냉기장',      desc:'주변 적 빙결',      icon:'❄️',utype:'new',tier:2},
  {uid:'w_poison',   wid:'poison',   name:'☠️ 독구름',       desc:'독 지대 생성',      icon:'☠️',utype:'new',tier:1},
  {uid:'w_fireball', wid:'fireball', name:'🔥 파이어볼',    desc:'강력 폭발 투사체',  icon:'🔥',utype:'new',tier:3},
  {uid:'w_lightning',wid:'lightning',name:'⚡ 번개',         desc:'자동 타격 번개',    icon:'⚡',utype:'new',tier:3},
  {uid:'w_holy',     wid:'holy',     name:'✝️ 성스러운 오라',desc:'성광이 적을 태움',  icon:'✝️',utype:'new',tier:4},
  {uid:'w_ghost',    wid:'ghost',    name:'👻 유령 소환',   desc:'공격하는 유령 소환',icon:'👻',utype:'new',tier:5},
];

const WEAPON_UPGRADES = [
  {uid:'up_knife_dmg',      wid:'knife',    name:'🗡 단검 강화',    desc:'단검 강화',      icon:'🗡',utype:'wupgrade',tier:0},
  {uid:'up_knife_cnt',      wid:'knife',    name:'🗡 다연사',       desc:'단검 발사 수 +1',icon:'🗡',utype:'wupgrade',tier:1},
  {uid:'up_axe_dmg',        wid:'axe',      name:'🪓 도끼 강화',    desc:'도끼 강화',      icon:'🪓',utype:'wupgrade',tier:0},
  {uid:'up_magic_orb',      wid:'magic',    name:'✨ 마법진 확장',  desc:'마법진 확장',    icon:'✨',utype:'wupgrade',tier:1},
  {uid:'up_fireball_splash',wid:'fireball', name:'🔥 폭발 강화',   desc:'폭발 강화',      icon:'🔥',utype:'wupgrade',tier:2},
  {uid:'up_lightning_chain',wid:'lightning',name:'⚡ 연쇄 번개+',   desc:'번개 강화',      icon:'⚡',utype:'wupgrade',tier:2},
  {uid:'up_freeze_range',   wid:'freeze',   name:'❄️ 냉기장 확장', desc:'냉기장 강화',    icon:'❄️',utype:'wupgrade',tier:1},
  {uid:'up_holy_cnt',       wid:'holy',     name:'✝️ 성광 오브+',   desc:'성광 강화',      icon:'✝️',utype:'wupgrade',tier:2},
  {uid:'up_poison_size',    wid:'poison',   name:'☠️ 독구름 강화',  desc:'독구름 강화',   icon:'☠️',utype:'wupgrade',tier:1},
  {uid:'up_ghost_cnt',      wid:'ghost',    name:'👻 유령 추가소환',desc:'유령 강화',      icon:'👻',utype:'wupgrade',tier:3},
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function rollGradeFrom(minTier = 0) {
  const sub = GRADES.slice(minTier);
  const total = sub.reduce((s, g) => s + g.prob, 0);
  let r = Math.random() * total, acc = 0;
  for (const g of sub) { acc += g.prob; if (r < acc) return g; }
  return sub[sub.length - 1];
}

function rollItemGrade() {
  const total = ITEM_GRADES.reduce((s, g) => s + g.prob, 0);
  let r = Math.random() * total, acc = 0;
  for (const g of ITEM_GRADES) { acc += g.prob; if (r < acc) return g; }
  return ITEM_GRADES[ITEM_GRADES.length - 1];
}

function computeUpgradeValues(u, grade) {
  const m = GRADE_MULT[grade.idx];
  const rv2 = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  if (u.utype === 'stat') {
    if (u.uid.startsWith('spd'))      { const v=rv2(15,30); u._vals={spd:v/100}; u.desc='이동속도 +'+v+'%'; }
    else if (u.uid.startsWith('hp'))  { const v=Math.round(rv2(25,50)*m); u._vals={hp:v}; u.desc='최대 HP +'+v; }
    else if (u.uid.startsWith('dmg')) { const v=rv2(15,30); u._vals={dmg:v/100}; u.desc='공격력 +'+Math.round(v*m)+'%'; }
    else if (u.uid.startsWith('xpb')) { const v=rv2(20,40); u._vals={xp:v/100}; u.desc='경험치 획득 +'+v+'%'; }
    else if (u.uid.startsWith('mag')) { const v=Math.round(rv2(40,80)*m); u._vals={mag:v}; u.desc='자석 범위 +'+v; }
    else if (u.uid.startsWith('reg')) { const v=Math.max(1,Math.round(m*rv2(1,2))); u._vals={regen:v}; u.desc='초당 HP +'+v+' 회복'; }
    else if (u.uid.startsWith('luc')) { const v=rv2(20,35); u._vals={luck:v/100}; u.desc='드롭 +'+v+'%'; }
    else if (u.uid.startsWith('pie')) { u._vals={}; u.desc='관통 +1'; }
    else if (u.uid.startsWith('dod')) { const v=rv2(8,18); u._vals={dodge:v/100}; u.desc='회피율 +'+v+'%'; }
    else if (u.uid.startsWith('arm')) { const v=rv2(5,15); u._vals={armor:v/100}; u.desc='피해 -'+Math.round(v*m)+'%'; }
    else if (u.uid.startsWith('bar')) { const v=Math.round(rv2(60,120)*m); u._vals={barrier:v}; u.desc='배리어 '+v+' HP'; }
    else if (u.uid.startsWith('tho')) { const v=Math.round(rv2(15,35)*m); u._vals={thorns:v}; u.desc='반격 '+v+' 데미지'; }
    else if (u.uid.startsWith('dur')) { const v=rv2(15,35); u._vals={dur:v/100}; u.desc='지속시간 +'+Math.round(v*m)+'%'; }
    else if (u.uid.startsWith('coo')) { const v=rv2(5,15); u._vals={cd:v/100}; u.desc='쿨다운 -'+Math.round(v*m)+'%'; }
  } else if (u.utype === 'wupgrade') {
    if (u.uid==='up_knife_dmg')       { const v=Math.round(rv2(25,45)*m); u._vals={d:v/100}; u.desc='단검 DMG +'+v+'%, 쿨다운↓'; }
    else if (u.uid==='up_knife_cnt')  { u._vals={}; u.desc='단검 발사 수 +1'; }
    else if (u.uid==='up_axe_dmg')    { const v=Math.round(rv2(35,60)*m); u._vals={d:v/100}; u.desc='도끼 DMG +'+v+'%'; }
    else if (u.uid==='up_magic_orb')  { const r2=Math.round(rv2(25,45)*m),v=Math.round(rv2(15,30)*m); u._vals={r:r2,d:v/100}; u.desc='궤도 반경 +'+r2+', DMG +'+v+'%'; }
    else if (u.uid==='up_fireball_splash'){ const sp=Math.round(rv2(20,40)*m),v=Math.round(rv2(15,30)*m); u._vals={sp,d:v/100}; u.desc='폭발범위 +'+sp+', DMG +'+v+'%'; }
    else if (u.uid==='up_lightning_chain'){ const ch=Math.max(1,Math.round(rv2(1,3)*m)); u._vals={ch}; u.desc='번개 연쇄 +'+ch+'명'; }
    else if (u.uid==='up_freeze_range'){ const r2=Math.round(rv2(30,60)*m); u._vals={r:r2}; u.desc='냉기 범위 +'+r2; }
    else if (u.uid==='up_holy_cnt')   { const v=Math.round(rv2(20,40)*m); u._vals={d:v/100}; u.desc='성광 오브 +1, DMG +'+v+'%'; }
    else if (u.uid==='up_poison_size'){ const r2=Math.round(rv2(15,30)*m),v=Math.round(rv2(20,35)*m); u._vals={r:r2,d:v/100}; u.desc='독 범위 +'+r2+', DMG +'+v+'%'; }
    else if (u.uid==='up_ghost_cnt')  { const v=Math.round(rv2(20,40)*m); u._vals={d:v/100}; u.desc='유령 +1, DMG +'+v+'%'; }
  }
}
