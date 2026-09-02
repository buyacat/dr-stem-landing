/* ============ Dr. Stem — Landing v3 interactions (Astro) ============ */
(function(){
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const I18N = window.DRSTEM_I18N || {};
  /* This file is loaded via `?url` as a raw static asset, so Astro/Vite never
     substitutes import.meta.env into it — the base path has to arrive at
     runtime instead, via window.DRSTEM_BASE (set in MainLayout.astro). */
  const BASE = (window.DRSTEM_BASE || '/').replace(/\/$/, '') + '/';
  const asset = (path) => BASE + path.replace(/^\//, '');

  /* ---------- icons ---------- */
  const I = {
    magnet:'<img src="'+asset('/images/magnet-2.png')+'">',
    ekg:'<img src="'+asset('/images/ekg-2.png')+'">',
    foto:'<img src="'+asset('/images/foto-2.png')+'">',
    uv:'<img src="'+asset('/images/uv-2.png')+'">',
    strum:'<img src="'+asset('/images/strum-2.png')+'">',
    light:'<img src="'+asset('/images/light-2.png')+'">',
    co2:'<img src="'+asset('/images/co2-2.png')+'">',
    napruga:'<img src="'+asset('/images/napruga-2.png')+'">',
    o2:'<img src="'+asset('/images/o2-2.png')+'">',
    providnist:'<img src="'+asset('/images/providnist-2.png')+'">',
    syla:'<img src="'+asset('/images/syla-2.png')+'">',
    heart:'<img src="'+asset('/images/heart-2.png')+'">',
    gaz:'<img src="'+asset('/images/gaz-2.png')+'">',
    atmosphere:'<img src="'+asset('/images/atmosphere-2.png')+'">',
  };
  const foot = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/></svg>';

  /* sensor scatter — localized labels from I18N */
  const scatterLabels = I18N.scatterLabels || [];
  const devices = [
    {ic:'magnet', label: scatterLabels[0] || 'Ультрафіолет',   x:13, y:5,  d:.22, bright:false},
    {ic:'ekg',    label: scatterLabels[1] || 'Провідність',    x:10, y:72, d:.16, bright:false},
    {ic:'foto',   label: scatterLabels[2] || 'Датчик CO₂',     x:26, y:35, d:.30, bright:false},
    {ic:'uv',     label: scatterLabels[3] || 'Вологість ґрунту',x:29, y:78, d:.12, bright:false},
    {ic:'strum',  label: scatterLabels[4] || 'Сила',           x:42, y:52, d:.20, bright:false},
    {ic:'light',  label: scatterLabels[5] || 'Напруга',         x:40, y:5,  d:.34, bright:false},
    {ic:'co2',    label: scatterLabels[6] || 'Кут повороту',   x:55, y:14,  d:.14, bright:false},
    {ic:'napruga',label: scatterLabels[7] || 'Температура',     x:57, y:65, d:.26, bright:false},
    {ic:'o2',     label: scatterLabels[8] || 'Струм',           x:70, y:44, d:.18, bright:false},
    {ic:'providnist', label: scatterLabels[9] || 'Світло',          x:83, y:12,  d:.30, bright:false},
    {ic:'heart',  label: scatterLabels[10] || 'ЧСС',             x:85, y:57, d:.22, bright:false},
    {ic:'gaz',    label: scatterLabels[11] || 'Тиск газу',             x:71, y:82, d:.12, bright:false},
    {ic:'atmosphere', label: scatterLabels[12] || 'Атмосфера',             x:87, y:88, d:.16, bright:false},
  ];

  function buildDevices(){
    const stage = document.getElementById('scatter'); if(!stage) return;
    devices.forEach((dv,i)=>{
      const el=document.createElement('div');
      el.className='device'+(dv.bright?' bright':'');
      el.style.left=dv.x+'%'; el.style.top=dv.y+'%';
      el.dataset.depth=dv.d;
      el.style.transitionDelay=(i%5*0.05)+'s';
      const inner = dv.ic ? `<div class="icon">${I[dv.ic]}</div>` : `<div class="sym">${dv.sym}</div>`;
      el.innerHTML=`<div class="nub"></div>
        <div class="top"><span>● +</span><span>—</span></div>
        <div class="screen">${inner}<div class="label">${dv.label}</div></div>
        <div class="foot">${foot}<span>Dr.STEM</span></div>`;
      stage.appendChild(el);
    });
  }

  /* ---------- parallax registry + unified loop ---------- */
  let layers=[];
  function absTop(el){let t=0;while(el){t+=el.offsetTop;el=el.offsetParent;}return t;}
  function register(){
    layers=[...document.querySelectorAll('[data-float]')].map(el=>({
      el, base:absTop(el)+el.offsetHeight/2,
      vx:+el.dataset.vx||0, vy:+el.dataset.vy||0,
      mx:+el.dataset.mx||0, my:+el.dataset.my||0, rot:+el.dataset.rot||0,
      clamp:+el.dataset.clamp||110}));
  }
  function recalc(){ layers.forEach(L=>{L.base=absTop(L.el)+L.el.offsetHeight/2;}); regDevices(); }
  function regDevices(){
    const sec=document.getElementById('includes');
    const base=sec?absTop(sec):0;
    devEls=[...document.querySelectorAll('#scatter .device')].map(el=>({el, base, depth:+el.dataset.depth||0}));
  }

  /* ---------- sun-tracked specular glint on the glass icons ----------
     The page's light source lives at 78% across / 12% down the VIEWPORT
     (same anchor as the .hero radial-gradient), so it stays put while the
     page scrolls under it, like real sunlight through a window. For every
     `.inc .ic` we take the direction from the capsule's centre toward that
     point and offset the ::before sheen along it, so each icon catches the
     light from its own position on screen.
     The raw angle is damped toward "straight up" and clamped, so the glint
     tilts left/right along the top rim instead of swinging a full circle —
     subtle, not a spinning gimmick. */
  const SUN_VX = 0.78, SUN_VY = 0.12;   /* viewport-relative sun */
  const GLINT_R = 36;                   /* px from capsule centre */
  const UP = -Math.PI / 2;              /* rest direction */
  const GLINT_DAMP = 0.55;              /* how much of the true angle we keep */
  const GLINT_SWING = 1.22;             /* ±70° max tilt away from "up" */
  const TAU = Math.PI * 2;
  let glints = [];
  function regGlints(){
    glints = [...document.querySelectorAll('.inc .ic')].map(el=>({
      el, dx:0, dy:0, wx:NaN, wy:NaN, init:false
    }));
  }
  const glintRects = [];
  function glintPass(){
    if(reduce || !glints.length) return;
    const sx = window.innerWidth * SUN_VX, sy = window.innerHeight * SUN_VY;
    const vh = window.innerHeight;
    /* read every rect first, write after — never interleave */
    for(let i=0;i<glints.length;i++) glintRects[i] = glints[i].el.getBoundingClientRect();
    for(let i=0;i<glints.length;i++){
      const g = glints[i], r = glintRects[i];
      if(r.bottom < -80 || r.top > vh + 80) continue;   /* off-screen: skip */
      const cx = r.left + r.width/2, cy = r.top + r.height/2;
      let d = Math.atan2(sy - cy, sx - cx) - UP;
      d = ((d % TAU) + TAU + Math.PI) % TAU - Math.PI;   /* wrap to ±π */
      d *= GLINT_DAMP;
      if(d >  GLINT_SWING) d =  GLINT_SWING;
      else if(d < -GLINT_SWING) d = -GLINT_SWING;
      const a = UP + d;
      const tx = Math.cos(a) * GLINT_R, ty = Math.sin(a) * GLINT_R;
      if(g.init){ g.dx += (tx-g.dx)*0.18; g.dy += (ty-g.dy)*0.18; }
      else { g.dx = tx; g.dy = ty; g.init = true; }
      if(Math.abs(g.dx-g.wx) < 0.15 && Math.abs(g.dy-g.wy) < 0.15) continue;
      g.wx = g.dx; g.wy = g.dy;
      g.el.style.setProperty('--sun-dx', g.dx.toFixed(2)+'px');
      g.el.style.setProperty('--sun-dy', g.dy.toFixed(2)+'px');
    }
  }

  let tmX=0,tmY=0,mX=0,mY=0;
  if(!reduce){
    window.addEventListener('mousemove',e=>{
      tmX=(e.clientX/window.innerWidth-.5)*2;
      tmY=(e.clientY/window.innerHeight-.5)*2;
    },{passive:true});
  }

  const electrons=[
    {sel:'.e1',rx:182,ry:52,rot:0,  speed:0.00040,phase:0},
    {sel:'.e2',rx:182,ry:52,rot:60, speed:0.00033,phase:1.9},
    {sel:'.e3',rx:182,ry:52,rot:120,speed:0.00028,phase:3.6}
  ];
  let eNodes=[];
  let devEls=[];
  let chipLayers=[], stageAtom=null;

  function loop(now){
    mX+=(tmX-mX)*.06; mY+=(tmY-mY)*.06;
    const mid=window.scrollY + window.innerHeight/2;
    for(const L of layers){
      const p=mid-L.base, C=L.clamp, cl=(v)=>v<-C?-C:v>C?C:v;
      const tx=cl(p*L.vx) + mX*L.mx;
      const ty=cl(p*L.vy) + mY*L.my;
      const rz=Math.max(-8,Math.min(8,p*L.rot));
      L.el.style.transform=`translate3d(${tx.toFixed(1)}px,${ty.toFixed(1)}px,0) rotate(${rz.toFixed(2)}deg)`;
    }
    if(!reduce){
      for(let i=0;i<eNodes.length;i++){
        const s=electrons[i], el=eNodes[i]; if(!el)continue;
        const a=now*s.speed*6.283 + s.phase;
        const x=Math.cos(a)*s.rx, yy=Math.sin(a)*s.ry;
        const rad=s.rot*Math.PI/180;
        const xr=x*Math.cos(rad)-yy*Math.sin(rad);
        const yr=x*Math.sin(rad)+yy*Math.cos(rad);
        const sc=0.55+0.45*((yy+s.ry)/(2*s.ry));
        el.style.transform=`translate3d(${xr.toFixed(1)}px,${yr.toFixed(1)}px,${(yy*2).toFixed(1)}px) scale(${sc.toFixed(2)})`;
        el.style.zIndex='';
      }
    }
    const sy=window.scrollY, vh=window.innerHeight;
    for(const D of devEls){
      if(!D.el.classList.contains('in')){
        const r=D.el.getBoundingClientRect();
        if(r.top < vh-70 && r.bottom > 0) D.el.classList.add('in');
      }
      if(D.el.classList.contains('in') && !reduce){
        D.el.style.transform = 'translate3d(0,'+(-(sy-D.base)*D.depth).toFixed(1)+'px,0)';
      }
    }
    glintPass();
    requestAnimationFrame(loop);
  }

  /* ---------- charts ---------- */
  function makePath(vals,w,h,pad){
    const max=Math.max(...vals),min=Math.min(...vals),n=vals.length;
    return vals.map((v,i)=>{
      const x=pad+(i/(n-1))*(w-pad*2);
      const yy=h-pad-((v-min)/(max-min||1))*(h-pad*2);
      return (i?'L':'M')+x.toFixed(1)+' '+yy.toFixed(1);
    }).join(' ');
  }
  function drawChart(svg){
    if(svg.dataset.done)return; svg.dataset.done='1';
    const w=+svg.getAttribute('data-w')||300,h=96,pad=8;
    const color=svg.getAttribute('data-color')||'#29C5DA';
    const vals=(svg.getAttribute('data-vals')||'').split(',').map(Number);
    const d=makePath(vals,w,h,pad);
    const ns='http://www.w3.org/2000/svg';
    const area=document.createElementNS(ns,'path');
    area.setAttribute('d',d+` L ${w-pad} ${h-pad} L ${pad} ${h-pad} Z`);
    area.setAttribute('fill',color); area.setAttribute('opacity','0');
    svg.appendChild(area);
    const line=document.createElementNS(ns,'path');
    line.setAttribute('d',d); line.setAttribute('fill','none'); line.setAttribute('stroke',color);
    line.setAttribute('stroke-width','2.4'); line.setAttribute('stroke-linejoin','round'); line.setAttribute('stroke-linecap','round');
    svg.appendChild(line);
    if(reduce){ area.setAttribute('opacity','0.10'); return; }
    const len=line.getTotalLength();
    line.style.strokeDasharray=len; line.style.strokeDashoffset=len;
    const dur=1500, t0=performance.now();
    function step(t){
      const k=Math.min((t-t0)/dur,1);
      const e=1-Math.pow(1-k,3);
      line.style.strokeDashoffset=(len*(1-e)).toFixed(1);
      area.setAttribute('opacity',(0.10*e).toFixed(3));
      if(k<1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- nav magnet ---------- */
  function navMagnet(){
    document.querySelectorAll('.dn-item').forEach(el=>{
      el.addEventListener('mouseenter',()=>{
        el.style.transition='opacity .2s,color .2s';
      });
      el.addEventListener('mousemove',e=>{
        const r=el.getBoundingClientRect();
        const dx=(e.clientX-(r.left+r.width/2))*0.18;
        const dy=(e.clientY-(r.top+r.height/2))*0.18;
        el.style.transform=`translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(1.06)`;
      });
      el.addEventListener('mouseleave',()=>{
        el.style.transition='opacity .2s,color .2s,transform .5s cubic-bezier(.2,.8,.2,1)';
        el.style.transform='translate(0,0) scale(1)';
      });
    });
  }

  /* ---------- nav ---------- */
  function navScroll(){
    const nav=document.querySelector('.nav');
    window.addEventListener('scroll',()=>{ if(nav) nav.classList.toggle('scrolled',window.scrollY>30); },{passive:true});
    if(nav) nav.classList.toggle('scrolled',window.scrollY>30);
    const darkIds=['#demo','#ai'];
    const darkEls=darkIds.map(id=>document.querySelector(id)).filter(Boolean);
    if(nav&&darkEls.length){
      const dObs=new IntersectionObserver(()=>{
        const onDark=darkEls.some(el=>{
          const r=el.getBoundingClientRect();
          return r.top<=80&&r.bottom>0;
        });
        nav.classList.toggle('on-dark',onDark);
      },{rootMargin:'0px',threshold:[0,.1,.5,1]});
      darkEls.forEach(el=>dObs.observe(el));
      window.addEventListener('scroll',()=>{
        const onDark=darkEls.some(el=>{
          const r=el.getBoundingClientRect();
          return r.top<=80&&r.bottom>0;
        });
        nav.classList.toggle('on-dark',onDark);
      },{passive:true});
    }
  }

  function dotNav(){
    const items=[...document.querySelectorAll('.dn-item')];
    if(!items.length) return;
    const sections=items.map(a=>document.querySelector(a.getAttribute('href')));
    const obs=new IntersectionObserver(entries=>{
      entries.forEach(en=>{
        if(!en.isIntersecting) return;
        const idx=sections.indexOf(en.target);
        if(idx<0) return;
        items.forEach(a=>a.classList.remove('active'));
        items[idx].classList.add('active');
      });
    },{rootMargin:'-40% 0px -40% 0px',threshold:0});
    sections.forEach(s=>{if(s) obs.observe(s);});
    items[0].classList.add('active');
  }

  /* ---------- form with real submit + i18n ---------- */
  function form(){
    const f=document.getElementById('demo-form'); if(!f)return;
    const btn=f.querySelector('[type="submit"]');
    const hint=f.querySelector('.form-hint');
    const ok=document.querySelector('.form-ok');
    const submitText = f.dataset.submit || 'Submit';
    const sendingText = f.dataset.sending || 'Sending...';
    const successText = f.dataset.success || '✓ Sent';
    const successHint = f.dataset.successHint || 'Thank you!';
    const errorText = f.dataset.error || submitText;
    const errorHint = f.dataset.errorHint || 'Error. Please try again.';

    f.addEventListener('submit', async function(e) {
      e.preventDefault();
      btn.disabled = true;
      btn.textContent = sendingText;
      try {
        const res = await fetch(asset('/send.php'), { method: 'POST', body: new FormData(f) });
        const data = await res.json();
        if (data.ok) {
          btn.textContent = successText;
          if (hint) hint.textContent = successHint;
          f.reset();
          if(ok) { f.style.display='none'; ok.classList.add('show'); }
        } else { throw new Error(); }
      } catch {
        btn.disabled = false;
        btn.textContent = errorText;
        if (hint) hint.textContent = errorHint;
      }
    });
  }

  /* ---------- kit tabs ---------- */
  function kitTabs(){
    const tabs=[...document.querySelectorAll('.kit-tab')];
    const panels=[...document.querySelectorAll('.kit-panel')];
    if(!tabs.length) return;
    tabs.forEach(t=>t.addEventListener('click',()=>{
      tabs.forEach(x=>x.classList.remove('active'));
      panels.forEach(p=>p.classList.remove('active'));
      t.classList.add('active');
      const p=document.getElementById('kit-'+t.dataset.kit);
      if(p) p.classList.add('active');
    }));
  }

  function dlDrop(){
    const drop=document.getElementById('dl-drop');
    const btn=document.getElementById('dl-btn');
    if(!drop||!btn) return;
    const toggle=e=>{e.stopPropagation();drop.classList.toggle('open');btn.setAttribute('aria-expanded',drop.classList.contains('open'));};
    const close=()=>{drop.classList.remove('open');btn.setAttribute('aria-expanded','false');};
    btn.addEventListener('click',toggle);
    document.addEventListener('click',e=>{if(!drop.contains(e.target)) close();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape') close();});
  }

  /* ---------- scroll reveal ---------- */
  function revealOnScroll(){
    const els=[...document.querySelectorAll('.reveal, .reveal-crt')];
    if(!els.length) return;
    if(reduce){ els.forEach(el=>el.classList.add('is-visible')); return; }
    const obs=new IntersectionObserver(entries=>{
      entries.forEach(en=>{
        if(en.isIntersecting){
          en.target.classList.add('is-visible');
          obs.unobserve(en.target);
        }
      });
    },{rootMargin:'0px 0px -8% 0px',threshold:0.12});
    els.forEach(el=>obs.observe(el));
  }

  /* ---------- count-up on stat numbers ----------
     Any numeric run inside a [data-countup] element counts up from 0 once it
     scrolls into view; everything else in the text (dashes, units) is left
     untouched, so "7–12" and "5–50" animate both sides at once. */
  function countUp(){
    const els=[...document.querySelectorAll('[data-countup]')];
    if(!els.length) return;
    if(reduce) return;
    const obs=new IntersectionObserver(entries=>{
      entries.forEach(en=>{
        if(!en.isIntersecting) return;
        obs.unobserve(en.target);
        const el=en.target;
        const raw=el.textContent;
        const nums=[...raw.matchAll(/\d+/g)];
        if(!nums.length) return;
        const dur=1100, t0=performance.now();
        function step(t){
          const k=Math.min((t-t0)/dur,1);
          const e=1-Math.pow(1-k,3);
          let out='', last=0;
          nums.forEach(m=>{
            const target=+m[0];
            out+=raw.slice(last,m.index)+Math.round(target*e);
            last=m.index+m[0].length;
          });
          out+=raw.slice(last);
          el.textContent=out;
          if(k<1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    },{rootMargin:'0px 0px -10% 0px',threshold:0.4});
    els.forEach(el=>obs.observe(el));
  }

  /* Replace {{DRSTEM_APP_URL}} links with actual URL */
  function fixAppLinks(){
    const url = window.DRSTEM_APP_URL || 'https://app.drstem.eu/#/';
    document.querySelectorAll('a[href="{{DRSTEM_APP_URL}}"]').forEach(a=>{
      a.href = url;
    });
  }

  document.addEventListener('DOMContentLoaded',()=>{
    fixAppLinks();
    buildDevices();
    register();
    regDevices();
    regGlints();
    const stageEl=document.querySelector('.stage');
    stageAtom=document.querySelector('.stage .atom-wrap');
    const scx=stageEl?stageEl.offsetWidth/2:0, scy=stageEl?stageEl.offsetHeight/2:0;
    chipLayers=[...document.querySelectorAll('.stage>.layer:not(.atom-wrap)')].map((el,i)=>({
      el, phase:i*1.57,
      bx:(el.offsetLeft+el.offsetWidth/2)-scx,
      by:(el.offsetTop+el.offsetHeight/2)-scy
    }));
    eNodes=electrons.map(s=>document.querySelector(s.sel));
    document.querySelectorAll('[data-chart]').forEach(drawChart);
    navScroll(); navMagnet(); form(); kitTabs(); dotNav(); dlDrop(); revealOnScroll(); countUp();
    window.addEventListener('resize',recalc,{passive:true});
    window.addEventListener('load',recalc,{passive:true});
    if(document.fonts&&document.fonts.ready) document.fonts.ready.then(recalc);
    requestAnimationFrame(loop);
  });
})();
