(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const field = document.getElementById('playfield');
  const $ = id => document.getElementById(id);
  const COLORS = ['#f6c6a5','#f2b39d','#e8a796','#de9ca0','#d9a7b7','#bfa4c2','#a7b4c5','#9dc4bd','#95ba9e','#e5b986'];
  const RADII = [21,26,32,39,47,56,67,80,94,108];
  const labels = ['初见之之','元气之之','开心之之','甜甜之之','闪亮之之','出游之之','浪漫之之','酷酷之之','超级之之','终极之之'];
  const focus = [[.34,.28,.58],[.5,.48,.92],[.5,.59,.68],[.52,.45,.68],[.59,.45,.65],[.56,.34,.68],[.5,.23,.62],[.45,.35,.66],[.57,.39,.66],[.48,.3,.55]];
  const images = Array.from({length:10},(_,i)=>{const img=new Image();img.src=i===9?'assets/final.png':`assets/level-${i+1}.jpg`;return img;});
  const evolution = $('evolution-list');
  labels.forEach((label,i)=>{const item=document.createElement('div');item.className='evolution-item';item.innerHTML=`<img src="${i===9?'assets/final.png':`assets/level-${i+1}.jpg`}" alt="${label}" style="object-position:${focus[i][0]*100}% ${focus[i][1]*100}%"><span>${i+1}级</span>`;evolution.append(item);});
  let W=400,H=570,dpr=1,balls=[],effects=[],score=0,best=0,current=0,next=0,aim=200,canDrop=true,over=false,lastTime=0,topTimer=0,dropWait=0,id=0;
  try{best=Number(localStorage.getItem('zhizhi-merge-best'))||0}catch{}
  $('best').textContent=best;
  const randomLevel=()=>{const n=Math.random();return n<.55?0:n<.85?1:2};
  function resize(){const rect=canvas.getBoundingClientRect();W=rect.width;H=rect.height;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);aim=Math.max(RADII[current]+7,Math.min(W-RADII[current]-7,aim));}
  function updateHud(){ $('score').textContent=score;$('best').textContent=best;$('next-image').src=next===9?'assets/final.png':`assets/level-${next+1}.jpg`; $('next-image').alt=`下一个：${labels[next]}`; }
  function reset(){balls=[];effects=[];score=0;current=randomLevel();next=randomLevel();aim=W/2;canDrop=true;over=false;topTimer=0;dropWait=0;lastTime=performance.now();$('gameover').classList.add('hidden');updateHud();}
  function drop(){if(over||!canDrop)return;const r=RADII[current];balls.push({id:++id,x:Math.max(r+5,Math.min(W-r-5,aim)),y:48,vx:0,vy:20,r,level:current,age:0,squish:0});current=next;next=randomLevel();aim=Math.max(RADII[current]+5,Math.min(W-RADII[current]-5,aim));canDrop=false;dropWait=.42;updateHud();}
  function merge(a,b){const level=a.level+1,x=(a.x+b.x)/2,y=(a.y+b.y)/2;balls=balls.filter(item=>item!==a&&item!==b);const r=RADII[level];balls.push({id:++id,x:Math.max(r+4,Math.min(W-r-4,x)),y:Math.max(r+4,y),vx:(a.vx+b.vx)*.2,vy:-165,r,level,age:0,squish:.8});score+=10*2**level;if(score>best){best=score;try{localStorage.setItem('zhizhi-merge-best',String(best))}catch{}}effects.push({x,y,life:.5,r:r*.6});updateHud();}
  function constrain(b,bounce=true){
    const left=b.r+3,right=W-b.r-3,floor=H-b.r-4;
    if(b.x<left){const impact=Math.max(0,-b.vx);b.x=left;if(impact>0)b.vx=bounce&&impact>80?impact*.42:0;if(bounce&&impact>80)b.squish=Math.max(b.squish,Math.min(.75,impact/500))}
    if(b.x>right){const impact=Math.max(0,b.vx);b.x=right;if(impact>0)b.vx=bounce&&impact>80?-impact*.42:0;if(bounce&&impact>80)b.squish=Math.max(b.squish,Math.min(.75,impact/500))}
    if(b.y>floor){const impact=Math.max(0,b.vy);b.y=floor;if(impact>0)b.vy=bounce&&impact>90?-impact*.38:0;if(bounce&&impact>90)b.squish=Math.max(b.squish,Math.min(1,impact/470));b.vx*=.9}
  }
  function step(dt){
    if(over)return;
    if(!canDrop){dropWait-=dt;if(dropWait<=0)canDrop=true}
    for(const b of balls){b.age+=dt;b.squish=Math.max(0,(b.squish||0)-dt*3.5);b.vy=Math.min(850,b.vy+1050*dt);b.x+=b.vx*dt;b.y+=b.vy*dt;b.vx*=Math.pow(.992,dt*60);constrain(b)}
    for(let iteration=0;iteration<5;iteration++){
      let didMerge=false;
      outer:for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++){
        const a=balls[i],b=balls[j],dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy)||.001,min=a.r+b.r;
        if(dist>=min)continue;
        if(a.level===b.level&&a.level<RADII.length-1&&a.age>.08&&b.age>.08){merge(a,b);didMerge=true;break outer}
        const nx=dx/dist,ny=dy/dist,overlap=min-dist,massA=a.r*a.r,massB=b.r*b.r,total=massA+massB;
        a.x-=nx*overlap*massB/total*.55;a.y-=ny*overlap*massB/total*.55;
        b.x+=nx*overlap*massA/total*.55;b.y+=ny*overlap*massA/total*.55;
        const rv=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
        if(rv<0){
          if(rv< -45){const s=Math.min(.85,-rv/550);a.squish=Math.max(a.squish,s);b.squish=Math.max(b.squish,s)}
          const restitution=rv< -130?.38:0;
          const impulse=-(1+restitution)*rv/(1/massA+1/massB);
          a.vx-=impulse*nx/massA;a.vy-=impulse*ny/massA;
          b.vx+=impulse*nx/massB;b.vy+=impulse*ny/massB;
        }
      }
      for(const b of balls)constrain(b,false);
      if(didMerge)iteration=0;
    }
    for(const e of effects)e.life-=dt;effects=effects.filter(e=>e.life>0);
    const danger=balls.some(b=>b.age>1.4&&b.y-b.r<104&&Math.abs(b.vy)<75);topTimer=danger?topTimer+dt:Math.max(0,topTimer-dt*2);if(topTimer>1.25)gameOver();
  }
  function gameOver(){over=true;$('final-score').textContent=score;$('final-best').textContent=best;$('gameover').classList.remove('hidden');$('again').focus();}
  function drawBall(b,alpha=1){const {x,y,r,level}=b,im=images[level],squish=b.squish||0;ctx.save();ctx.translate(x,y);ctx.scale(1+squish*.12,1-squish*.12);ctx.globalAlpha=alpha;ctx.shadowColor='#76544750';ctx.shadowBlur=9;ctx.shadowOffsetY=4;ctx.fillStyle=COLORS[level];ctx.beginPath();ctx.arc(0,0,r+2,0,Math.PI*2);ctx.fill();ctx.shadowColor='transparent';ctx.save();ctx.beginPath();ctx.arc(0,0,r-2,0,Math.PI*2);ctx.clip();if(im.complete&&im.naturalWidth){const side=Math.min(im.naturalWidth,im.naturalHeight)*focus[level][2],sx=Math.max(0,Math.min(im.naturalWidth-side,im.naturalWidth*focus[level][0]-side/2)),sy=Math.max(0,Math.min(im.naturalHeight-side,im.naturalHeight*focus[level][1]-side/2));ctx.drawImage(im,sx,sy,side,side,-r+1,-r+1,2*r-2,2*r-2)}else{ctx.fillStyle='#fff7ed';ctx.fillRect(-r,-r,2*r,2*r);ctx.font=`700 ${r}px sans-serif`;ctx.textAlign='center';ctx.fillStyle='#9f6b60';ctx.fillText('之',0,r*.35)}ctx.restore();ctx.strokeStyle='#fffaf1';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();ctx.restore();}
  function draw(){ctx.clearRect(0,0,W,H);ctx.save();ctx.strokeStyle='#e7cdbb';ctx.setLineDash([5,7]);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,104);ctx.lineTo(W,104);ctx.stroke();ctx.restore();ctx.font='700 11px "Noto Sans SC",sans-serif';ctx.fillStyle='#d8b8a3';ctx.textAlign='left';ctx.fillText('堆到这里就结束啦',12,95);if(!over){const r=RADII[current],x=Math.max(r+5,Math.min(W-r-5,aim));ctx.save();ctx.setLineDash([4,6]);ctx.strokeStyle='#d5ad9b';ctx.beginPath();ctx.moveTo(x,48+r);ctx.lineTo(x,H-8);ctx.stroke();ctx.restore();if(canDrop)drawBall({x,y:48,r,level:current},.88)}for(const b of balls)drawBall(b);for(const e of effects){ctx.save();ctx.globalAlpha=e.life*1.3;ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(e.x,e.y,e.r+(1-e.life)*60,0,Math.PI*2);ctx.stroke();ctx.restore()}if(topTimer>.15&&!over){ctx.fillStyle=`rgba(227,109,92,${Math.min(.18,topTimer*.15)})`;ctx.fillRect(0,0,W,104)}}
  function frame(t){const dt=Math.min(.025,Math.max(0,(t-lastTime)/1000));lastTime=t;if(!document.hidden)step(dt);draw();requestAnimationFrame(frame)}
  function pointerX(event){const rect=canvas.getBoundingClientRect();aim=Math.max(RADII[current]+5,Math.min(W-RADII[current]-5,event.clientX-rect.left))}
  canvas.addEventListener('pointermove',pointerX);canvas.addEventListener('pointerdown',event=>{event.preventDefault();pointerX(event);drop()});
  document.addEventListener('keydown',event=>{if(over){if(event.code==='KeyR')reset();return}if(event.code==='ArrowLeft'||event.code==='ArrowRight'){event.preventDefault();aim=Math.max(RADII[current]+5,Math.min(W-RADII[current]-5,aim+(event.code==='ArrowLeft'?-22:22)))}if(event.code==='Space'||event.code==='ArrowDown'){event.preventDefault();if(!event.repeat)drop()}if(event.code==='KeyR')reset()});
  $('restart').addEventListener('click',reset);$('again').addEventListener('click',reset);window.addEventListener('resize',resize);resize();reset();requestAnimationFrame(frame);
})();
