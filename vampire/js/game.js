const cv=document.getElementById('c');
const ctx=cv.getContext('2d');
let W,H;
function resize(){W=cv.width=Math.min(window.innerWidth,700);H=cv.height=window.innerHeight;}
resize();window.addEventListener('resize',resize);

let player,enemies,bullets,xpOrbs,particles,weapons;
let kills,gameTime,level,xp,xpNeeded,running,paused,diffMult=1;
let healthItems=[];
let keys={};let touch={dx:0,dy:0};let animId;
let frameCount=0,lastSecond=Date.now();
let showAttackRange=false;

function startGame(diff){
  diffMult=diff||1;
  document.getElementById('overlay').style.display='none';
  player={
    x:0,y:0,r:16,hp:100,maxHp:100,spd:2.5,
    invincible:0,dmgMult:1,
    magnetR:80,xpMult:1,regen:0,luck:1,
    attackRange:350,
  };
  enemies=[];bullets=[];xpOrbs=[];particles=[];healthItems=[];
  weapons=[{...WEAPON_DEFS.knife,wid:'knife',timer:0,pierce:1,count:1}];
  kills=0;gameTime=0;level=1;xp=0;xpNeeded=20;
  running=true;paused=false;
  frameCount=0;lastSecond=Date.now();
  if(animId)cancelAnimationFrame(animId);
  loop();
}

function loop(){
  if(!running)return;
  if(!paused)update();
  draw();
  animId=requestAnimationFrame(loop);
}

function update(){
  frameCount++;
  const now=Date.now();
  if(now-lastSecond>=1000){
    gameTime++;lastSecond=now;
    if(player.regen>0)player.hp=Math.min(player.maxHp,player.hp+player.regen);
  }

  // 이동
  let mx=0,my=0;
  if(keys['ArrowLeft']||keys['a']||keys['A'])mx-=1;
  if(keys['ArrowRight']||keys['d']||keys['D'])mx+=1;
  if(keys['ArrowUp']||keys['w']||keys['W'])my-=1;
  if(keys['ArrowDown']||keys['s']||keys['S'])my+=1;
  mx+=touch.dx;my+=touch.dy;
  if(mx&&my){mx*=0.707;my*=0.707;}
  player.x+=mx*player.spd;player.y+=my*player.spd;
  if(player.invincible>0)player.invincible--;

  // 스폰
  const spawnRate=Math.max(5,Math.floor(50*Math.pow(0.965,gameTime/10)));
  if(frameCount%spawnRate===0){
    const cnt=Math.floor(1+Math.pow(gameTime/40,1.6));
    for(let i=0;i<cnt;i++)spawnEnemy();
  }
  if(gameTime>0&&gameTime%60===0&&frameCount%60===1)spawnBoss();

  // 무기 발동
  for(let w of weapons){
    if(w.wtype==='holy'||w.wtype==='ghost'){
      const existing=bullets.filter(b=>b.ownerWid===w.wid);
      if(existing.length!==w.count){
        bullets=bullets.filter(b=>b.ownerWid!==w.wid);
        const cnt=w.count||2;
        for(let i=0;i<cnt;i++){
          const ang=i*(Math.PI*2/cnt);
          bullets.push({
            x:player.x+Math.cos(ang)*(w.orbitR||120),
            y:player.y+Math.sin(ang)*(w.orbitR||120),
            r:w.r,damage:w.damage*player.dmgMult,
            life:99999,btype:w.wtype,angle:ang,orbitR:w.orbitR||120,
            maxPierce:99,pierces:0,color:w.color,ownerWid:w.wid
          });
        }
      } else {
        for(let b of existing){
          b.damage=w.damage*player.dmgMult;
          b.r=w.r;
          b.angle+=0.05;
          b.x=player.x+Math.cos(b.angle)*b.orbitR;
          b.y=player.y+Math.sin(b.angle)*b.orbitR;
        }
      }
    } else {
      w.timer++;
      if(w.timer>=w.cooldown){w.timer=0;fireWeapon(w);}
    }
  }

  // 총알 업데이트
  for(let b of bullets){
    if(b.btype==='orbit'){
      b.angle+=0.06;
      b.x=player.x+Math.cos(b.angle)*b.orbitR;
      b.y=player.y+Math.sin(b.angle)*b.orbitR;
    } else if(b.btype==='aura'){
      b.x=player.x;b.y=player.y;b.life--;
    } else if(b.btype==='boomerang'){
      b.x+=b.vx;b.y+=b.vy;b.life--;
      if(b.life===25){b.vx*=-1.2;b.vy*=-1.2;}
    } else if(b.btype==='poison'){
      b.life--;
    } else if(b.btype==='lightning_vis'){
      b.life--;
    } else if(b.btype==='holy'||b.btype==='ghost'){
      // 위치 이미 업데이트됨
    } else {
      b.x+=b.vx;b.y+=b.vy;b.life--;
    }

    if(b.btype==='lightning_vis')continue;

    for(let e of enemies){
      if(e.dead)continue;
      if(Math.hypot(b.x-e.x,b.y-e.y)<b.r+e.r){
        const dmg=b.damage*(b.btype==='aura'?0.18:1);
        e.hp-=dmg;
        spawnParticles(e.x,e.y,'#f87171',3);
        if(b.splash>0)doSplash(b.x,b.y,b.splash,b.damage*0.5);
        if(b.btype!=='orbit'&&b.btype!=='aura'&&b.btype!=='holy'&&b.btype!=='ghost'&&b.btype!=='poison'){
          b.pierces=(b.pierces||0)+1;
          if(b.pierces>=(b.maxPierce||1))b.life=-1;
        }
        if(e.hp<=0&&!e.dead)killEnemy(e);
      }
    }
  }
  bullets=bullets.filter(b=>b.life>0);

  // 적 이동
  for(let e of enemies){
    if(e.frozen>0){e.frozen--;continue;}
    const ex=player.x-e.x,ey=player.y-e.y,ed=Math.hypot(ex,ey)||1;
    e.x+=ex/ed*e.spd;e.y+=ey/ed*e.spd;
    if(player.invincible===0&&Math.hypot(e.x-player.x,e.y-player.y)<e.r+player.r){
      player.hp-=e.dmg;player.invincible=60;
      spawnParticles(player.x,player.y,'#ef4444',8);
      if(player.hp<=0){gameOver();return;}
    }
  }
  enemies=enemies.filter(e=>!e.dead);

  // XP 흡수
  for(let o of xpOrbs){
    const ox=player.x-o.x,oy=player.y-o.y,od=Math.hypot(ox,oy)||1;
    if(od<player.magnetR){o.x+=ox/od*5;o.y+=oy/od*5;}
    if(od<player.r+o.r){
      o.collected=true;
      xp+=Math.round(o.val*player.xpMult);
      while(xp>=xpNeeded){xp-=xpNeeded;xpNeeded=Math.floor(xpNeeded*1.3);levelUp();}
    }
  }
  xpOrbs=xpOrbs.filter(o=>!o.collected);

  // 체력 아이템 업데이트
  for(let h of healthItems){
    h.pulse+=0.1;
    h.life--;
    if(h.life<=0)h.collected=true;
    const dx=player.x-h.x,dy=player.y-h.y;
    if(Math.hypot(dx,dy)<player.r+h.r){
      h.collected=true;
      player.hp=Math.min(player.maxHp,player.hp+player.maxHp*0.15);
      spawnParticles(player.x,player.y,'#ef4444',8);
    }
  }
  healthItems=healthItems.filter(h=>!h.collected);

  for(let p of particles){p.x+=p.vx;p.y+=p.vy;p.vy+=0.08;p.life--;}
  particles=particles.filter(p=>p.life>0);

  // HUD
  const hpPct=Math.max(0,player.hp)/player.maxHp*100;
  document.getElementById('hp-bar').style.width=hpPct+'%';
  document.getElementById('hp-txt').textContent=Math.ceil(Math.max(0,player.hp))+'/'+player.maxHp;
  document.getElementById('xp-bar').style.width=(xp/xpNeeded*100)+'%';
  document.getElementById('lv-txt').textContent=level;
  document.getElementById('kill-txt').textContent='💀 '+kills;
  const mm=Math.floor(gameTime/60),ss=gameTime%60;
  document.getElementById('time-txt').textContent='⏱ '+mm+':'+String(ss).padStart(2,'0');
}

function killEnemy(e){
  e.dead=true;kills++;
  spawnXpOrb(e.x,e.y,Math.round(e.xpVal*player.luck),e);
  if(Math.random()<0.05)spawnHealthItem(e.x,e.y);
}

function spawnEnemy(){
  const angle=Math.random()*Math.PI*2;
  const d=Math.max(W,H)*0.65;
  const pool=getEnemyPool(gameTime);
  let idx=0;
  const r=Math.random();
  if(pool.length>=3&&r<0.4)idx=pool.length-1;
  else if(pool.length>=2&&r<0.7)idx=pool.length-2;
  else idx=Math.floor(Math.random()*pool.length);
  const t=pool[Math.max(0,idx)];
  const baseHp=Math.floor((20+Math.pow(gameTime,1.5)*0.08)*(0.8+Math.random()*0.4)*diffMult);
  const hp=Math.max(1,Math.round(baseHp*t.hpM));
  const r2=Math.round(13*t.rM);
  enemies.push({
    x:player.x+Math.cos(angle)*d,y:player.y+Math.sin(angle)*d,
    hp,maxHp:hp,r:r2,
    spd:(0.8+Math.pow(gameTime/100,1.4)*0.8)*t.spdM,
    dmg:Math.round((5+gameTime*0.1)*t.dmgM),
    xpVal:Math.round(2*t.xpM),
    frozen:0,dead:false,color:t.color,emoji:t.em,name:t.name,
  });
}

function spawnBoss(){
  const angle=Math.random()*Math.PI*2;
  const d=Math.max(W,H)*0.7;
  const t=getBossType(gameTime);
  const baseHp=Math.floor((400+Math.pow(gameTime,1.6)*0.5)*diffMult);
  const hp=Math.round(baseHp*t.hpM);
  const r=Math.round(16*t.rM);
  enemies.push({
    x:player.x+Math.cos(angle)*d,y:player.y+Math.sin(angle)*d,
    hp,maxHp:hp,r,
    spd:(0.5+gameTime*0.003)*t.spdM,
    dmg:Math.round(18*t.dmgM),
    xpVal:Math.round(t.xpM),
    frozen:0,dead:false,boss:true,
    color:t.color,emoji:t.em,name:t.name,
  });
}

function fireWeapon(w){
  const wt=w.wtype;
  if(wt==='bullet'){
    // attackRange 내 적만 타겟
    const inRange=enemies.filter(e=>Math.hypot(e.x-player.x,e.y-player.y)<=player.attackRange);
    if(inRange.length===0)return; // 사거리 내 적 없으면 발사 안 함
    let nn=null,nd=Infinity;
    if(w.lockedTarget&&inRange.includes(w.lockedTarget)){
      nn=w.lockedTarget;
    } else {
      for(let e of inRange){const d=Math.hypot(e.x-player.x,e.y-player.y);if(d<nd){nd=d;nn=e;}}
      w.lockedTarget=nn;
    }
    const ang=nn?Math.atan2(nn.y-player.y,nn.x-player.x):Math.random()*Math.PI*2;
    const cnt=w.count||1;
    for(let i=0;i<cnt;i++){
      const a=ang+(i-Math.floor(cnt/2))*0.2;
      bullets.push({x:player.x,y:player.y,vx:Math.cos(a)*(w.speed||8),vy:Math.sin(a)*(w.speed||8),
        r:w.r,damage:w.damage*player.dmgMult,life:90,btype:'bullet',
        maxPierce:w.pierce||1,pierces:0,color:w.color,splash:w.splash||0});
    }
  } else if(wt==='boomerang'){
    // attackRange 내 적만 타겟
    const inRange=enemies.filter(e=>Math.hypot(e.x-player.x,e.y-player.y)<=player.attackRange);
    if(inRange.length===0)return;
    let nn=null,nd=Infinity;
    if(w.lockedTarget&&inRange.includes(w.lockedTarget)){nn=w.lockedTarget;}
    else{for(let e of inRange){const d=Math.hypot(e.x-player.x,e.y-player.y);if(d<nd){nd=d;nn=e;}}w.lockedTarget=nn;}
    const ang=nn?Math.atan2(nn.y-player.y,nn.x-player.x):Math.random()*Math.PI*2;
    bullets.push({x:player.x,y:player.y,vx:Math.cos(ang)*(w.speed||5),vy:Math.sin(ang)*(w.speed||5),
      r:w.r,damage:w.damage*player.dmgMult,life:50,btype:'boomerang',maxPierce:99,pierces:0,color:w.color});
  } else if(wt==='orbit'){
    bullets=bullets.filter(b=>b.ownerWid!==w.wid);
    const cnt=w.count||3;
    for(let i=0;i<cnt;i++){
      const ang=i*(Math.PI*2/cnt);
      bullets.push({x:player.x,y:player.y,r:w.r,damage:w.damage*player.dmgMult,
        life:99999,btype:'orbit',angle:ang,orbitR:w.orbitR||80,
        maxPierce:99,pierces:0,color:w.color,ownerWid:w.wid});
    }
  } else if(wt==='lightning'){
    const chain=w.chainCount||3;
    const near=enemies.slice().sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y)).slice(0,chain);
    for(let e of near){
      e.hp-=w.damage*player.dmgMult;
      spawnParticles(e.x,e.y,'#fde047',5);
      if(e.hp<=0&&!e.dead)killEnemy(e);
      bullets.push({x:player.x,y:player.y,tx:e.x,ty:e.y,life:8,btype:'lightning_vis',r:0,damage:0,color:'#fde047'});
    }
  } else if(wt==='aura'){
    bullets.push({x:player.x,y:player.y,r:w.r,damage:w.damage*player.dmgMult,
      life:30,btype:'aura',maxPierce:99,pierces:0,color:w.color});
    for(let e of enemies){if(Math.hypot(e.x-player.x,e.y-player.y)<w.r)e.frozen=90;}
  } else if(wt==='poison'){
    for(let i=0;i<3;i++){
      const a=Math.random()*Math.PI*2,dist=15+Math.random()*50;
      bullets.push({x:player.x+Math.cos(a)*dist,y:player.y+Math.sin(a)*dist,
        r:w.r,damage:w.damage*player.dmgMult,life:200,btype:'poison',
        maxPierce:99,pierces:0,color:w.color});
    }
  }
}

function doSplash(x,y,r,dmg){
  for(let e of enemies){
    if(Math.hypot(e.x-x,e.y-y)<r){
      e.hp-=dmg;
      if(e.hp<=0&&!e.dead)killEnemy(e);
    }
  }
  spawnParticles(x,y,'#f97316',12);
}

// ── 레벨업 ──
function levelUp(){
  level++;paused=true;
  const el=document.getElementById('level-up');
  const cards=document.getElementById('upg-cards');
  el.style.display='flex';cards.innerHTML='';

  const ownedWids=new Set(weapons.map(w=>w.wid));
  let pool=[];
  for(let u of WEAPON_NEW){if(!ownedWids.has(u.wid))pool.push({...u});}
  for(let u of WEAPON_UPGRADES){if(ownedWids.has(u.wid))pool.push({...u});}
  pool.push(...STAT_UPGRADES.map(u=>({...u})));

  pool.sort(()=>Math.random()-0.5);
  const picks=[];const usedU=new Set();
  for(let u of pool){
    if(picks.length>=3)break;
    if(!usedU.has(u.uid)){picks.push(u);usedU.add(u.uid);}
  }
  while(picks.length<3){
    const fb=STAT_UPGRADES[picks.length%STAT_UPGRADES.length];
    if(!usedU.has(fb.uid+'_fb')){
      picks.push({...fb,uid:fb.uid+'_fb'});usedU.add(fb.uid+'_fb');
    } else {
      picks.push({...fb,uid:fb.uid+'_fb2',name:fb.name});
      break;
    }
  }

  // 등급 중 가장 높은 것 감지 (파티클 효과용)
  let highestGradeIdx=-1;
  const gradeCards=picks.map(u=>{
    const grade=rollGrade();
    u._grade=grade;
    const idx=GRADES.findIndex(g=>g.id===grade.id);
    if(idx>highestGradeIdx)highestGradeIdx=idx;
    return {u,grade};
  });

  gradeCards.forEach(({u,grade})=>{
    const d=document.createElement('div');
    const isWupgrade=u.utype==='wupgrade';
    d.className='upg-card '+(isWupgrade?'is-upgrade ':'')+grade.cls;
    d.style.borderColor=grade.color;
    if(grade.id!=='TRANSCEND'&&grade.id!=='LEGEND'){
      d.style.background=grade.bg;
      d.style.boxShadow='0 0 8px '+grade.color+'55';
    } else if(grade.id==='LEGEND'){
      d.style.background=grade.bg;
    }
    d.innerHTML=
      '<div class="grade-badge" style="background:'+grade.color+'22;color:'+grade.color+';border:1px solid '+grade.color+'88">'+grade.name+'</div>'+
      '<div class="upg-icon">'+u.icon+'</div>'+
      '<div class="upg-name" style="color:'+grade.color+'">'+u.name+'</div>'+
      '<div class="upg-desc">'+u.desc+'</div>';
    const uu=u;
    d.onclick=()=>{applyUpgrade(uu);el.style.display='none';paused=false;};
    cards.appendChild(d);
  });

  // 이펙트 트리거 (카드 등장 후 약간 딜레이)
  setTimeout(()=>{
    const cx=W/2, cy=H/2;
    if(highestGradeIdx>=4){ // TRANSCEND
      spawnTranscendParticles(cx,cy);
    } else if(highestGradeIdx>=3){ // LEGEND
      spawnLegendParticles(cx,cy);
    }
  },50);
}

function applyUpgrade(u){
  const gm=(u._grade?u._grade.mult:1.0);
  if(u.utype==='stat'){
    if(u.uid.startsWith('spd'))player.spd*=(1+0.2*gm);
    else if(u.uid.startsWith('hp')){const add=Math.round(30*gm);player.maxHp+=add;player.hp=Math.min(player.hp+add,player.maxHp);}
    else if(u.uid.startsWith('dmg'))player.dmgMult*=(1+0.2*gm);
    else if(u.uid.startsWith('pierce')){
      const k=weapons.find(w=>w.wid==='knife');if(k)k.pierce=(k.pierce||1)+1;
      const f=weapons.find(w=>w.wid==='fireball');if(f)f.pierce=(f.pierce||1)+1;
    }
    else if(u.uid.startsWith('xpboost'))player.xpMult*=(1+0.3*gm);
    else if(u.uid.startsWith('magnet'))player.magnetR+=Math.round(50*gm);
    else if(u.uid.startsWith('regen'))player.regen=(player.regen||0)+Math.max(1,Math.round(gm));
    else if(u.uid.startsWith('luck'))player.luck*=(1+0.25*gm);
    else if(u.uid.startsWith('range'))player.attackRange+=Math.round(50*gm);
  } else if(u.utype==='new'){
    const def=WEAPON_DEFS[u.wid];
    if(def)weapons.push({...def,wid:u.wid,timer:0,pierce:def.pierce||1,count:def.count||1,chainCount:def.chainCount||3,orbitR:def.orbitR||80});
  } else if(u.utype==='wupgrade'){
    const w=weapons.find(x=>x.wid===u.wid);
    if(!w)return;
    if(u.uid==='up_knife_dmg'){w.damage*=(1+0.3*gm);w.cooldown=Math.max(10,w.cooldown*(1-0.15*gm));}
    else if(u.uid==='up_knife_cnt')w.count=(w.count||1)+Math.max(1,Math.floor(gm));
    else if(u.uid==='up_axe_dmg')w.damage*=(1+0.4*gm);
    else if(u.uid==='up_magic_orb'){w.orbitR=(w.orbitR||80)+Math.round(30*gm);w.damage*=(1+0.2*gm);bullets=bullets.filter(b=>b.ownerWid!==w.wid);}
    else if(u.uid==='up_fireball_splash'){w.splash=(w.splash||50)+Math.round(25*gm);w.damage*=(1+0.2*gm);}
    else if(u.uid==='up_lightning_chain')w.chainCount=(w.chainCount||3)+Math.round(2*gm);
    else if(u.uid==='up_freeze_range'){w.r=(w.r||120)+Math.round(40*gm);}
    else if(u.uid==='up_holy_cnt'){w.count=(w.count||4)+1;w.damage*=(1+0.3*gm);bullets=bullets.filter(b=>b.ownerWid!==w.wid);}
    else if(u.uid==='up_poison_size'){w.r=(w.r||40)+Math.round(20*gm);w.damage*=(1+0.3*gm);}
    else if(u.uid==='up_ghost_cnt'){w.count=(w.count||2)+1;w.damage*=(1+0.3*gm);bullets=bullets.filter(b=>b.ownerWid!==w.wid);}
  }
}

// ── 그리기 ──
function draw(){
  ctx.fillStyle='#0a0514';ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='#1a1030';ctx.lineWidth=1;
  const ox=(player.x%80+80)%80,oy=(player.y%80+80)%80;
  for(let x=-ox;x<W;x+=80){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=-oy;y<H;y+=80){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}

  const cx=W/2-player.x,cy=H/2-player.y;
  ctx.save();ctx.translate(cx,cy);

  // 자석 범위 힌트
  ctx.beginPath();ctx.arc(player.x,player.y,player.magnetR,0,Math.PI*2);
  ctx.strokeStyle='rgba(124,58,237,0.07)';ctx.lineWidth=1;ctx.stroke();

  // 공격 사거리 시각화 (showAttackRange=true 시 표시)
  if(showAttackRange&&player){
    ctx.beginPath();ctx.arc(player.x,player.y,player.attackRange,0,Math.PI*2);
    ctx.strokeStyle='rgba(239,68,68,0.25)';ctx.lineWidth=1.5;ctx.setLineDash([6,6]);ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='rgba(239,68,68,0.04)';ctx.fill();
  }

  // XP 오브
  for(let o of xpOrbs){
    ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,Math.PI*2);
    ctx.fillStyle=(o.color||'#7c3aed')+'88';ctx.fill();
    ctx.strokeStyle=o.strokeColor||'#c084fc';ctx.lineWidth=1.5;ctx.stroke();
  }
  // 체력 아이템
  for(let h of healthItems){
    const pulse=Math.sin(h.pulse)*0.25+0.85;
    ctx.save();
    ctx.globalAlpha=Math.min(1,h.life/60)*pulse;
    ctx.font=(h.r*2.2)+'px sans-serif';ctx.textAlign='center';
    ctx.fillText('♥',h.x,h.y+h.r*0.6);
    ctx.restore();
  }

  // 총알
  for(let b of bullets){
    if(b.btype==='lightning_vis'){
      ctx.strokeStyle=b.color;ctx.lineWidth=2;ctx.globalAlpha=b.life/8;
      ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.tx,b.ty);ctx.stroke();
      ctx.globalAlpha=1;
    } else if(b.btype==='orbit'){
      ctx.globalAlpha=0.12;ctx.beginPath();ctx.arc(player.x,player.y,b.orbitR,0,Math.PI*2);
      ctx.strokeStyle=b.color;ctx.lineWidth=1;ctx.stroke();ctx.globalAlpha=1;
      ctx.beginPath();ctx.arc(b.x,b.y,8,0,Math.PI*2);ctx.fillStyle=b.color;ctx.fill();
    } else if(b.btype==='holy'){
      ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
      ctx.fillStyle='#fef08a66';ctx.fill();
      ctx.strokeStyle='#fef08a';ctx.lineWidth=2;ctx.stroke();
      ctx.strokeStyle='#fff9';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(b.x,b.y-b.r*0.7);ctx.lineTo(b.x,b.y+b.r*0.7);ctx.stroke();
      ctx.beginPath();ctx.moveTo(b.x-b.r*0.7,b.y);ctx.lineTo(b.x+b.r*0.7,b.y);ctx.stroke();
    } else if(b.btype==='ghost'){
      ctx.globalAlpha=0.7;
      ctx.font=(b.r*2)+'px sans-serif';ctx.textAlign='center';
      ctx.fillText('👻',b.x,b.y+b.r*0.55);
      ctx.globalAlpha=1;
    } else if(b.btype==='aura'){
      ctx.beginPath();ctx.arc(player.x,player.y,b.r,0,Math.PI*2);
      ctx.strokeStyle=b.color;ctx.lineWidth=2;ctx.globalAlpha=0.22;ctx.stroke();
      ctx.fillStyle=b.color+'0a';ctx.fill();ctx.globalAlpha=1;
    } else if(b.btype==='poison'){
      const al=Math.min(0.45,b.life/80);
      ctx.globalAlpha=al;
      ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
      ctx.fillStyle=b.color;ctx.fill();ctx.globalAlpha=1;
    } else {
      ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
      ctx.fillStyle=b.color;ctx.fill();
    }
  }

  // 적
  for(let e of enemies){
    ctx.globalAlpha=e.frozen?0.55:1;
    ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,Math.PI*2);
    ctx.fillStyle=e.frozen?'#93c5fd22':e.color+'44';ctx.fill();
    ctx.strokeStyle=e.frozen?'#93c5fd':e.color;ctx.lineWidth=e.boss?3:2;ctx.stroke();
    ctx.font=(e.r*1.3)+'px sans-serif';ctx.textAlign='center';ctx.globalAlpha=1;
    ctx.fillText(e.emoji,e.x,e.y+e.r*0.42);
    const bw=e.r*2.6;
    ctx.fillStyle='#33333388';ctx.fillRect(e.x-bw/2,e.y-e.r-10,bw,5);
    ctx.fillStyle=e.boss?'#ef4444':'#22c55e';
    ctx.fillRect(e.x-bw/2,e.y-e.r-10,bw*(Math.max(0,e.hp)/e.maxHp),5);
    if(e.boss){
      ctx.font='11px sans-serif';ctx.fillStyle='#fca5a5';ctx.textAlign='center';
      ctx.fillText(e.name,e.x,e.y-e.r-13);
    }
  }
  ctx.globalAlpha=1;

  // 플레이어
  const pa=player.invincible>0?(Math.floor(player.invincible/5)%2?0.3:1):1;
  ctx.globalAlpha=pa;
  ctx.beginPath();ctx.arc(player.x,player.y,player.r,0,Math.PI*2);
  ctx.fillStyle='#2d1f4e';ctx.fill();
  ctx.strokeStyle='#c084fc';ctx.lineWidth=3;ctx.stroke();
  ctx.font='20px sans-serif';ctx.textAlign='center';
  ctx.fillText('🧙',player.x,player.y+7);
  ctx.globalAlpha=1;

  // 파티클
  for(let p of particles){
    ctx.globalAlpha=Math.max(0,p.life/30);
    ctx.beginPath();ctx.arc(p.x,p.y,p.r||3,0,Math.PI*2);
    ctx.fillStyle=p.color;ctx.fill();
  }
  ctx.globalAlpha=1;
  ctx.restore();
}

function spawnXpOrb(x,y,val,e){
  let r=6,color='#22c55e',strokeColor='#4ade80';
  if(e&&e.boss){r=12;color='#eab308';strokeColor='#fde047';}
  else if(e&&e.maxHp>50){r=8;color='#3b82f6';strokeColor='#93c5fd';}
  xpOrbs.push({x,y,r,val,collected:false,color,strokeColor});
}
function spawnHealthItem(x,y){
  healthItems.push({x,y,r:8,life:900,collected:false,pulse:0});
}

function gameOver(){
  running=false;
  const ov=document.getElementById('overlay');
  const mm=Math.floor(gameTime/60),ss=gameTime%60;
  const timeStr=mm+':'+String(ss).padStart(2,'0');
  ov.innerHTML=`
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
  ov.style.display='flex';
}

async function submitRanking(time,kills,level){
  const input=document.getElementById('initial-input');
  const initials=(input?input.value:'').toUpperCase().trim();
  const msg=document.getElementById('rank-msg');
  const rankTable=document.getElementById('rank-table');
  if(!initials||!/^[A-Z]{1,3}$/.test(initials)){msg.textContent='⚠️ 영문 대문자 1~3자로 입력해주세요';return;}
  msg.textContent='⏳ 등록 중...';
  try{
    await fetch(APPS_SCRIPT_URL,{
      method:'POST',
      headers:{'Content-Type':'text/plain'},
      body:JSON.stringify({action:'submitScore',initials,time,kills,level})
    });
    msg.textContent='✅ 랭킹 등록 완료! 상위 10위:';
  }catch(e){msg.textContent='⚠️ 등록 실패 (나중에 다시 시도)';}
  try{
    const r=await fetch(APPS_SCRIPT_URL+'?action=getRanking');
    const data=await r.json();
    const rows=data.ranking||data||[];
    if(rankTable&&rows.length){
      const fmt=(s)=>{const m=Math.floor(s/60),sc=s%60;return m+':'+String(sc).padStart(2,'0');};
      rankTable.innerHTML='<table style="width:100%;border-collapse:collapse;font-size:0.78rem;color:#e2d4ff">'
        +'<tr style="color:#c084fc;border-bottom:1px solid #3d2a5e"><th>#</th><th>이니셜</th><th>시간</th><th>킬</th><th>레벨</th></tr>'
        +rows.slice(0,10).map((row,i)=>`<tr style="border-bottom:1px solid #1a1030;${row.initials===initials&&row.time===time?'background:#2d1f4e':''}"><td>${i+1}</td><td>${row.initials}</td><td>${fmt(row.time)}</td><td>${row.kills}</td><td>${row.level}</td></tr>`).join('')
        +'</table>';
    }
  }catch(e){}
}

// ── 입력 ──
document.addEventListener('keydown',e=>{
  keys[e.key]=true;
  // R키로 사거리 표시 토글
  if(e.key==='r'||e.key==='R')showAttackRange=!showAttackRange;
});
document.addEventListener('keyup',e=>keys[e.key]=false);

let joystickStart=null;
cv.addEventListener('touchstart',e=>{const t=e.touches[0];joystickStart={x:t.clientX,y:t.clientY};},{passive:true});
cv.addEventListener('touchmove',e=>{
  if(!joystickStart)return;
  const t=e.touches[0];
  const dx=t.clientX-joystickStart.x,dy=t.clientY-joystickStart.y;
  const d=Math.hypot(dx,dy)||1,maxD=50;
  touch.dx=Math.abs(dx)>8?Math.min(d,maxD)/maxD*(dx/d):0;
  touch.dy=Math.abs(dy)>8?Math.min(d,maxD)/maxD*(dy/d):0;
},{passive:true});
cv.addEventListener('touchend',()=>{touch.dx=0;touch.dy=0;joystickStart=null;});
