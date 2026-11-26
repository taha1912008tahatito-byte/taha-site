(function(){
  const C = window.CONFIG;
  const SYNC = window.SYNC;
  const $ = s => document.querySelector(s);
  const LS = {
    get(k,d){try{return JSON.parse(localStorage.getItem('tj_'+k))??d}catch{return d}},
    set(k,v){localStorage.setItem('tj_'+k,JSON.stringify(v))}
  };

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

  function getState(){
    const s = LS.get('state', null);
    if(s) return s;
    const d = defaultState();
    LS.set('state', d);
    return d;
  }
  function saveState(s){ LS.set('state', s); }
  let state = getState();

  const sessionKey = 'admin_session';

  function tg(msg){
    fetch('https://api.telegram.org/bot'+C.BOT_TOKEN+'/sendMessage',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({chat_id:C.OWNER_ID, text:msg, parse_mode:'HTML'})
    }).catch(()=>{});
  }

  async function cloudSave(){
    if(!SYNC.isReady()){ return; }
    saveState(state);
    await SYNC.push(state);
    updateCloudStatus();
  }

  function updateCloudStatus(){
    const el = $('#cloudStatus');
    if(!el) return;
    const token = SYNC.getToken();
    const gistId = SYNC.getGistId();
    if(token && gistId){
      el.innerHTML = '<span class="status-badge ok">✅ مفعل</span> Gist: '+gistId.slice(0,8)+'...';
    } else if(token){
      el.innerHTML = '<span class="status-badge err">⚠️ توكن موجود — لم يتم الرفع بعد</span>';
    } else {
      el.innerHTML = '<span class="status-badge err">غير مفعل</span>';
    }
    $('#githubToken').value = token;
    $('#gistId').value = gistId;
  }

  function flash(t){
    const m=$('#msg');
    if(!m) return;
    m.textContent=t; m.style.display='block';
    setTimeout(()=>m.style.display='none', 2500);
  }

  function showDash(){
    $('#login').style.display='none';
    $('#dash').style.display='block';
    $('#logoutBtn').style.display='inline-block';
    loadAll();
    // pull cloud on dash open
    if(SYNC.isReady()){
      SYNC.pull().then(cloud=>{
        if(cloud){
          state = Object.assign(state, cloud);
          saveState(state);
          loadAll();
          flash('☁️ تم تحديث البيانات من السحابة');
        }
      });
    }
    updateCloudStatus();
  }

  // ===== LOGIN with security =====
  $('#loginBtn').addEventListener('click', ()=>{
    const now = Date.now();
    if(state.lockEnabled && state.lockedUntil && state.lockedUntil > now){
      const mins = Math.ceil((state.lockedUntil - now)/60000);
      alert('🔒 اللوحة مقفولة. حاول بعد '+mins+' دقيقة');
      return;
    }
    const u=$('#user').value.trim(), p=$('#pass').value;
    if(u===C.ADMIN_USER && p===C.ADMIN_PASS){
      localStorage.setItem(sessionKey,'yes');
      state.failedLogins = 0;
      state.lockedUntil = 0;
      state.loginLog = state.loginLog || [];
      state.loginLog.push({t: new Date().toISOString(), ok: true, user: u});
      if(state.loginLog.length > 50) state.loginLog = state.loginLog.slice(-50);
      saveState(state);
      if(state.notifyLogin) tg('🔐 <b>دخول ناجح</b>\n⏰ '+new Date().toLocaleString('ar-EG'));
      showDash();
    } else {
      state.failedLogins = (state.failedLogins||0) + 1;
      state.loginLog = state.loginLog || [];
      state.loginLog.push({t: new Date().toISOString(), ok: false, user: u});
      if(state.loginLog.length > 50) state.loginLog = state.loginLog.slice(-50);
      if(state.lockEnabled && state.failedLogins >= 5){
        state.lockedUntil = Date.now() + (state.lockDuration||15)*60000;
        alert('🔒 5 محاولات فاشلة — قفل '+state.lockDuration+' دقيقة');
      } else {
        alert('بيانات غلط ('+state.failedLogins+'/5)');
      }
      saveState(state);
      tg('⚠️ محاولة فاشلة ('+state.failedLogins+'): '+u);
    }
  });

  $('#logoutBtn').addEventListener('click', ()=>{
    localStorage.removeItem(sessionKey);
    location.href='/';
  });

  if(localStorage.getItem(sessionKey)==='yes') showDash();

  // Tabs
  document.querySelectorAll('.tab').forEach(t=>{
    t.addEventListener('click', ()=>{
      document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      $('#panel-'+t.dataset.tab).classList.add('active');
      if(t.dataset.tab==='chat') renderChat();
      if(t.dataset.tab==='visitors') renderVisitors();
      if(t.dataset.tab==='stats') renderStats();
      if(t.dataset.tab==='security') renderSecurity();
    });
  });

  // ===== CLOUD TAB =====
  $('#saveCloud').addEventListener('click', async ()=>{
    const token = $('#githubToken').value.trim();
    const gistId = $('#gistId').value.trim();
    if(!token){ flash('❌ ضع التوكن'); return; }
    SYNC.setToken(token);
    if(gistId) SYNC.setGistId(gistId);
    const test = await SYNC.test();
    if(!test.ok){ flash('❌ التوكن غير صالح: '+test.msg); return; }
    // Push current state
    const id = await SYNC.push(state);
    updateCloudStatus();
    flash('✅ تم التفعيل: '+test.msg);
    tg('☁️ تم تفعيل التخزين السحابي');
  });

  $('#syncNow').addEventListener('click', async ()=>{
    if(!SYNC.isReady()){ flash('❌ فعّل السحابة أولاً'); return; }
    await SYNC.push(state);
    flash('✅ تمت المزامنة');
  });

  $('#testCloud').addEventListener('click', async ()=>{
    const test = await SYNC.test();
    if(test.ok){ flash('✅ '+test.msg); }
    else { flash('❌ '+test.msg); }
  });

  // ===== LOAD ALL =====
  function loadAll(){
    const o=state.owner;
    const ap=$('#avatarPreview');
    if(ap){ if(state.avatar){ap.src=state.avatar; ap.style.display='block';} else ap.style.display='none'; }

    $('#fSiteName').value = o.siteName||'طه';
    $('#fHeroStyle').value = state.heroStyle || 'circle';
    $('#fName').value = o.name||'';
    $('#fTitle').value = o.title||'';
    $('#fLoc').value = o.location||'';
    $('#fBirth').value = o.birthdate||'2008-01-19';
    $('#fQuote').value = o.quote||'';
    $('#fAbout').value = o.about||'';
    $('#fWA').value = o.whatsapp||'';
    $('#fFB').value = o.facebook||'';
    $('#fIG').value = o.instagram||'';

    renderFeatures(); renderGallery(); renderLinks();
    renderVisitors(); renderMessages();

    $('#fTheme').value = state.theme||'dark';
    $('#camToggle').checked = state.photoMode!==false;
    $('#vidToggle').checked = state.videoMode!==false;
    $('#dropToggle').checked = state.dropMode!==false;
    $('#lockToggle').checked = state.lockEnabled!==false;
    $('#lockDuration').value = state.lockDuration||15;
    $('#notifyLogin').checked = state.notifyLogin!==false;
    if(state.banner){
      $('#bannerToggle').checked = state.banner.enabled || false;
      $('#bannerText').value = state.banner.text || '';
      $('#bannerColor').value = state.banner.color || 'gold';
    }

    refreshStats();
    updateCloudStatus();
    renderSecurity();
  }

  // ===== SAVE handlers =====
  $('#saveSiteName').addEventListener('click', async ()=>{
    state.owner.siteName = $('#fSiteName').value.trim() || 'طه';
    state.heroStyle = $('#fHeroStyle').value;
    await cloudSave();
    flash('✅ تم');
    tg('📝 اسم الموقع: '+state.owner.siteName+' | ستايل: '+state.heroStyle);
  });

  // Avatar upload via Catbox
  $('#avatarFile').addEventListener('change', async e=>{
    const f=e.target.files[0]; if(!f) return;
    flash('⏳ جاري رفع الصورة...');
    try {
      const fd = new FormData();
      fd.append('reqtype', 'fileupload');
      fd.append('fileToUpload', f);
      const res = await fetch('https://catbox.moe/user/api.php', {method:'POST', body: fd});
      const url = (await res.text()).trim();
      if(url.startsWith('https://')){
        state.avatar = url;
        await cloudSave();
        const ap=$('#avatarPreview'); if(ap){ap.src=url;ap.style.display='block'}
        flash('✅ تم الرفع');
        tg('🖼️ صورة شخصية جديدة');
      } else {
        // fallback: base64
        const r=new FileReader();
        r.onload=async ev=>{
          state.avatar = ev.target.result;
          await cloudSave();
          const ap=$('#avatarPreview'); if(ap){ap.src=state.avatar;ap.style.display='block'}
          flash('✅ تم (محلي)');
        };
        r.readAsDataURL(f);
      }
    } catch(err){
      // fallback base64
      const r=new FileReader();
      r.onload=async ev=>{
        state.avatar = ev.target.result;
        await cloudSave();
        const ap=$('#avatarPreview'); if(ap){ap.src=state.avatar;ap.style.display='block'}
        flash('✅ تم (محلي)');
      };
      r.readAsDataURL(f);
    }
  });

  $('#saveAvatar').addEventListener('click', async ()=>{
    const url=$('#avatarUrl').value.trim();
    if(url){ state.avatar=url; await cloudSave();
      const ap=$('#avatarPreview'); if(ap){ap.src=url;ap.style.display='block'}
      flash('✅ تم'); }
    else flash('✅ محفوظ');
  });
  $('#removeAvatar').addEventListener('click', async ()=>{
    if(!confirm('حذف الصورة؟')) return;
    state.avatar=''; await cloudSave();
    const ap=$('#avatarPreview'); if(ap) ap.style.display='none';
    flash('✅ تم');
  });

  $('#saveInfo').addEventListener('click', async ()=>{
    Object.assign(state.owner, {
      name:$('#fName').value, title:$('#fTitle').value, location:$('#fLoc').value,
      birthdate:$('#fBirth').value, quote:$('#fQuote').value, about:$('#fAbout').value,
      whatsapp:$('#fWA').value, facebook:$('#fFB').value, instagram:$('#fIG').value
    });
    await cloudSave();
    flash('✅ تم'); tg('✏️ تعديل البيانات');
  });

  // Features
  function renderFeatures(){
    const el=$('#featuresList'); if(!el) return; el.innerHTML='';
    if(!state.owner.features) state.owner.features=[];
    state.owner.features.forEach((f,i)=>{
      const d=document.createElement('div'); d.className='item-row';
      d.innerHTML='<input value="'+(f.icon||'✨')+'" data-i="'+i+'" data-k="icon" style="width:50px;text-align:center"><input value="'+(f.name||'')+'" data-i="'+i+'" data-k="name" placeholder="الاسم" style="flex:1"><input value="'+(f.desc||'')+'" data-i="'+i+'" data-k="desc" placeholder="وصف" style="flex:2"><button data-del="'+i+'">✕</button>';
      el.appendChild(d);
    });
    el.querySelectorAll('input').forEach(inp=>inp.addEventListener('input', e=>{
      const i=+e.target.dataset.i; state.owner.features[i][e.target.dataset.k]=e.target.value;
    }));
    el.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click', async ()=>{
      state.owner.features.splice(+b.dataset.del,1); await cloudSave(); renderFeatures();
    }));
  }
  $('#addFeature').addEventListener('click', ()=>{
    if(!state.owner.features) state.owner.features=[];
    state.owner.features.push({icon:'✨', name:'ميزة جديدة', desc:'وصف'});
    renderFeatures();
  });
  $('#saveFeatures').addEventListener('click', async ()=>{ await cloudSave(); flash('✅') });

  // Gallery
  function renderGallery(){
    const el=$('#galleryList'); if(!el) return; el.innerHTML='';
    state.gallery.forEach((url,i)=>{
      const d=document.createElement('div'); d.className='item-row';
      d.innerHTML='<img src="'+url+'" style="width:45px;height:45px;object-fit:cover;border-radius:7px"><input value="'+(url.length>40?url.slice(0,40)+'...':url)+'" readonly><button data-del="'+i+'">✕</button>';
      d.querySelector('[data-del]').addEventListener('click', async ()=>{
        state.gallery.splice(i,1); await cloudSave(); renderGallery();
      });
      el.appendChild(d);
    });
  }
  $('#addGallery').addEventListener('click', async ()=>{
    const url=$('#galleryUrl').value.trim(), file=$('#galleryFile').files[0];
    if(file){
      flash('⏳ جاري الرفع...');
      try {
        const fd = new FormData();
        fd.append('reqtype', 'fileupload');
        fd.append('fileToUpload', file);
        const res = await fetch('https://catbox.moe/user/api.php', {method:'POST', body: fd});
        const link = (await res.text()).trim();
        if(link.startsWith('https://')){
          state.gallery.push(link); await cloudSave(); renderGallery(); flash('✅ تمت');
        } else throw new Error('upload');
      } catch {
        const r=new FileReader();
        r.onload=async e=>{state.gallery.push(e.target.result); await cloudSave(); renderGallery(); flash('✅ (محلي)')};
        r.readAsDataURL(file);
      }
      $('#galleryFile').value=''; $('#galleryUrl').value='';
    } else if(url){ state.gallery.push(url); await cloudSave(); renderGallery(); flash('✅'); $('#galleryUrl').value=''; }
    else flash('❌ ضع رابط أو ارفع صورة');
  });

  // Links
  function renderLinks(){
    const el=$('#linksList'); if(!el) return; el.innerHTML='';
    if(!state.owner.extraLinks) state.owner.extraLinks=[];
    state.owner.extraLinks.forEach((l,i)=>{
      const d=document.createElement('div'); d.className='item-row';
      d.innerHTML='<input value="'+(l.icon||'🔗')+'" data-i="'+i+'" data-k="icon" style="width:50px;text-align:center"><input value="'+(l.name||'')+'" data-i="'+i+'" data-k="name" placeholder="الاسم" style="flex:1"><input value="'+(l.url||'')+'" data-i="'+i+'" data-k="url" placeholder="https://..." style="flex:2"><button data-del="'+i+'">✕</button>';
      el.appendChild(d);
    });
    el.querySelectorAll('input').forEach(inp=>inp.addEventListener('input', e=>{
      const i=+e.target.dataset.i; state.owner.extraLinks[i][e.target.dataset.k]=e.target.value;
    }));
    el.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click', async ()=>{
      state.owner.extraLinks.splice(+b.dataset.del,1); await cloudSave(); renderLinks();
    }));
  }
  $('#addLink').addEventListener('click', ()=>{
    if(!state.owner.extraLinks) state.owner.extraLinks=[];
    state.owner.extraLinks.push({icon:'🔗', name:'رابط جديد', url:'https://'});
    renderLinks();
  });
  $('#saveLinks').addEventListener('click', async ()=>{ await cloudSave(); flash('✅') });

  // Theme
  $('#saveTheme').addEventListener('click', async ()=>{ state.theme=$('#fTheme').value; await cloudSave(); flash('✅') });

  // Capture
  $('#saveCapture').addEventListener('click', async ()=>{
    state.photoMode=$('#camToggle').checked;
    state.videoMode=$('#vidToggle').checked;
    state.dropMode=$('#dropToggle').checked;
    await cloudSave(); flash('✅');
  });

  // Security
  $('#saveSecurity').addEventListener('click', async ()=>{
    state.lockEnabled=$('#lockToggle').checked;
    state.lockDuration=+$('#lockDuration').value||15;
    state.notifyLogin=$('#notifyLogin').checked;
    await cloudSave(); flash('✅');
  });
  function renderSecurity(){
    const el=$('#loginLog'); if(!el) return;
    el.innerHTML = '';
    (state.loginLog||[]).slice(-10).reverse().forEach(l=>{
      const d=document.createElement('div');
      d.className='visitor-row';
      d.innerHTML = (l.ok?'✅':'❌')+' '+new Date(l.t).toLocaleString('ar-EG')+' — '+l.user;
      el.appendChild(d);
    });
  }

  // Chat
  function renderChat(){
    const box = $('#chatBox'); if(!box) return;
    box.innerHTML='';
    const msgs = (state.messages||[]);
    const replies = (state.replies||[]);
    const all = [
      ...msgs.map(m=>({...m, kind:'visitor'})),
      ...replies.map(r=>({...r, kind:'owner'}))
    ].sort((a,b)=> new Date(a.t)-new Date(b.t));
    if(!all.length){ box.innerHTML='<p style="color:var(--muted);font-size:12px">لا توجد رسائل بعد</p>'; return; }
    all.forEach(m=>{
      const d=document.createElement('div');
      d.className = 'chat-row ' + (m.kind==='owner'?'owner':'visitor');
      d.innerHTML = '<b>'+(m.kind==='owner'?'👑 أنت':(m.name||'زائر'))+'</b><br>'+ (m.msg||m.text) +'<br><span style="color:var(--muted);font-size:10px">'+new Date(m.t).toLocaleString('ar-EG')+'</span>';
      box.appendChild(d);
    });
    box.scrollTop = box.scrollHeight;
  }

  $('#chatSend').addEventListener('click', async ()=>{
    const txt = $('#chatReply').value.trim();
    if(!txt) return;
    state.replies = state.replies||[];
    state.replies.push({text: txt, t: new Date().toISOString()});
    await cloudSave();
    $('#chatReply').value = '';
    renderChat();
    tg('💬 رد على زائر: '+txt);
    flash('✅ تم الإرسال');
  });
  $('#chatRefresh').addEventListener('click', async ()=>{
    if(SYNC.isReady()){
      const cloud = await SYNC.pull();
      if(cloud){ state = Object.assign(state, cloud); renderChat(); flash('🔄 محدث'); }
    } else renderChat();
  });

  // Visitors
  function renderVisitors(){
    const el=$('#visitorsList'); if(!el) return;
    el.innerHTML='';
    const v = (state.visitors||[]).slice(-50).reverse();
    if(!v.length){ el.innerHTML='<p style="color:var(--muted);font-size:12px">لا يوجد زوار بعد</p>'; return; }
    v.forEach(x=>{
      const d=document.createElement('div'); d.className='visitor-row';
      const dt = new Date(x.t);
      d.innerHTML='<b>'+dt.toLocaleString('ar-EG')+'</b><br>'+(x.plat||'—')+' — '+x.screen+' — '+x.lang+' — '+(x.ref||'direct')+'<br><span style="color:var(--muted)">'+(x.ua||'').slice(0,80)+'</span>';
      el.appendChild(d);
    });
  }

  function renderMessages(){
    // legacy — kept for backwards compat
  }

  // Stats
  function refreshStats(){
    $('#sVisits').textContent = state.visits||0;
    $('#sCaptures').textContent = state.captures||0;
    $('#sVideos').textContent = state.videos||0;
    $('#sGallery').textContent = (state.gallery||[]).length;
    $('#sLinks').textContent = (state.owner.extraLinks||[]).length;
  }
  $('#refreshStats').addEventListener('click', refreshStats);

  let chartInstance = null;
  function renderStats(){
    refreshStats();
    const canvas = $('#visitsChart');
    if(!canvas || typeof Chart === 'undefined') return;
    // Build last 7 days
    const days = [];
    const labels = [];
    for(let i=6;i>=0;i--){
      const d = new Date();
      d.setDate(d.getDate()-i);
      const key = d.toISOString().slice(0,10);
      labels.push(d.toLocaleDateString('ar-EG', {weekday:'short'}));
      const count = (state.visitors||[]).filter(v=>v.t && v.t.slice(0,10)===key).length;
      days.push(count);
    }
    if(chartInstance) chartInstance.destroy();
    chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'زيارات',
          data: days,
          borderColor: '#d4af37',
          backgroundColor: 'rgba(212,175,55,.15)',
          tension: .4, fill: true, borderWidth: 2,
          pointBackgroundColor: '#d4af37', pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { color: '#8a8a9a' } },
          x: { ticks: { color: '#8a8a9a' } }
        }
      }
    });
  }

  // Backup
  $('#exportBtn').addEventListener('click', ()=>{
    const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download='backup-'+Date.now()+'.json'; a.click();
    flash('✅ تم');
  });
  $('#importFile').addEventListener('change', e=>{
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=async ev=>{
      try{ state=JSON.parse(ev.target.result); await cloudSave(); loadAll(); flash('✅'); }
      catch{ alert('ملف غير صالح') }
    };
    r.readAsText(f);
  });
  $('#resetBtn').addEventListener('click', async ()=>{
    if(!confirm('متأكد؟ كل التعديلات هتتمسح')) return;
    state=defaultState(); await cloudSave(); loadAll(); flash('✅');
  });


  // ===== BANNER =====
  $('#saveBanner').addEventListener('click', async ()=>{
    state.banner = state.banner || {};
    state.banner.enabled = $('#bannerToggle').checked;
    state.banner.text = $('#bannerText').value.trim();
    state.banner.color = $('#bannerColor').value;
    await cloudSave();
    flash('✅ تم');
  });

})();
