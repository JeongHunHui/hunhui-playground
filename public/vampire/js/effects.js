// ── 파티클 시스템 ──
// particles 배열은 game.js에서 전역으로 관리됨

function spawnParticles(x, y, color, n){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2,s=Math.random()*3+1;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-1,life:25,color,r:3});
  }
}

// 황금 파티클 burst (LEGEND 카드 등장 시)
function spawnLegendParticles(cx, cy){
  const colors=['#f59e0b','#fde047','#fbbf24','#fef08a','#f97316'];
  for(let i=0;i<40;i++){
    const a=Math.random()*Math.PI*2;
    const s=Math.random()*5+2;
    const color=colors[Math.floor(Math.random()*colors.length)];
    particles.push({
      x:cx+Math.cos(a)*80*(Math.random()),
      y:cy+Math.sin(a)*80*(Math.random()),
      vx:Math.cos(a)*s,
      vy:Math.sin(a)*s-2,
      life:45+Math.floor(Math.random()*20),
      color,
      r:Math.random()*4+2
    });
  }
}

// 무지개 파티클 + 화면 플래시 (TRANSCEND 카드 등장 시)
const RAINBOW_COLORS=['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899'];
function spawnTranscendParticles(cx, cy){
  for(let i=0;i<80;i++){
    const a=(i/80)*Math.PI*2;
    const s=Math.random()*7+3;
    const color=RAINBOW_COLORS[i%RAINBOW_COLORS.length];
    particles.push({
      x:cx+Math.cos(a)*60*(0.5+Math.random()*0.5),
      y:cy+Math.sin(a)*60*(0.5+Math.random()*0.5),
      vx:Math.cos(a)*s,
      vy:Math.sin(a)*s-1,
      life:60+Math.floor(Math.random()*30),
      color,
      r:Math.random()*5+2
    });
  }
  flashScreen();
}

// 화면 플래시 효과
function flashScreen(){
  let flash=document.getElementById('flash-overlay');
  if(!flash){
    flash=document.createElement('div');
    flash.id='flash-overlay';
    document.body.appendChild(flash);
  }
  flash.style.background='radial-gradient(ellipse,#fff8,transparent)';
  flash.style.opacity='0.7';
  flash.style.transition='opacity 0.05s';
  setTimeout(()=>{
    flash.style.transition='opacity 0.5s';
    flash.style.opacity='0';
  },80);
}
