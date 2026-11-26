(function(){
  const C = window.CONFIG;
  const $ = s => document.querySelector(s);
  const LS = {
    get(k,d){ try{return JSON.parse(localStorage.getItem('tj_'+k)) ?? d;}catch{return d;} },
    set(k,v){ localStorage.setItem('tj_'+k, JSON.stringify(v)); }
  };

  const DEFAULT = {
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
    visits: 0, captures: 0, photoMode: true
  };

  function getState(){
    const s = LS.get('state', null);
    if(s) return s;
    LS.set('state', DEFAULT);
    return JSON.parse(JSON.stringify(DEFAULT));
  }
  function saveState(s){ LS.set('state', s); }

  let state = getState();

  const sessionKey = 'admin_session';
  function isLoggedIn(){ return localStorage.getItem(sessionKey) === 'yes'; }

  function showDash(){
    $('#login').style.display = 'none';
    $('#dash').style.display = 'block';
    loadAll();
  }

  $('#loginBtn').addEventListener('click', () => {
    const u = $('#user').value.trim();
    const p = $('#pass').value;
    if(u === C.ADMIN_USER && p === C.ADMIN_PASS){
      localStorage.setItem(sessionKey, 'yes');
      const msg = '🔐 دخول المالك من لوحة التحكم\n⏰ ' + new Date().toLocaleString('ar-EG');
      fetch('https://api.telegram.org/bot' + C.BOT_TOKEN + '/sendMessage', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({chat_id: C.OWNER_ID, text: msg})
      }).catch(()=>{});
      showDash();
    } else {
      alert('بيانات غلط');
      fetch('https://api.telegram.org/bot' + C.BOT_TOKEN + '/sendMessage', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({chat_id: C.OWNER_ID, text: '⚠️ محاولة دخول فاشلة: ' + u})
      }).catch(()=>{});
    }
  });

  $('#logoutBtn').addEventListener('click', () => {
    localStorage.removeItem(sessionKey);
    location.reload();
  });

  if(isLoggedIn()) showDash();

  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      $('#panel-' + t.dataset.tab).classList.add('active');
    });
  });

  function loadAll(){
    const o = state.owner;
    $('#fName').value = o.name;
    $('#fTitle').value = o.title;
    $('#fLoc').value = o.location;
    $('#fBirth').value = o.birthdate;
    $('#fQuote').value = o.quote;
    $('#fAbout').value = o.about;
    $('#fWA').value = o.whatsapp;
    $('#fFB').value = o.facebook;
    $('#fIG').value = o.instagram;

    const sl = $('#sectionsList');
    sl.innerHTML = '';
    const names = {hero:'الرئيسية', quote:'الحكمة', about:'عني', gallery:'الصور', links:'روابط إضافية', contact:'التواصل'};
    Object.entries(state.sections).forEach(([k,v]) => {
      const d = document.createElement('div');
      d.className = 'toggle';
      d.innerHTML = '<span>' + (names[k]||k) + '</span><input type="checkbox" data-sec="' + k + '" ' + (v?'checked':'') + '>';
      d.querySelector('input').addEventListener('change', e => {
        state.sections[k] = e.target.checked;
        saveState(state);
        flash('تم التحديث — افتح الموقع لرؤية التغيير');
      });
      sl.appendChild(d);
    });

    renderSkills();
    renderGallery();
    renderLinks();

    $('#fTheme').value = state.theme;
    $('#camToggle').checked = state.photoMode !== false;
    $('#maintToggle').checked = !!state.maintenance;
    $('#maintMsg').value = state.maintenanceMsg || '';

    refreshStats();
    renderFeatures();
  }

  function flash(t){
    const m = $('#msg');
    m.textContent = t;
    m.style.display = 'block';
    setTimeout(() => m.style.display = 'none', 2500);
  }

  $('#saveInfo').addEventListener('click', () => {
    Object.assign(state.owner, {
      name: $('#fName').value,
      title: $('#fTitle').value,
      location: $('#fLoc').value,
      birthdate: $('#fBirth').value,
      quote: $('#fQuote').value,
      about: $('#fAbout').value,
      whatsapp: $('#fWA').value,
      facebook: $('#fFB').value,
      instagram: $('#fIG').value
    });
    saveState(state);
    flash('✅ تم الحفظ');
  });

  function renderSkills(){
    const el = $('#skillsList');
    el.innerHTML = '';
    state.skills.forEach((s, i) => {
      const d = document.createElement('div');
      d.className = 'item-row';
      d.innerHTML = '<input value="' + s.name + '" data-i="' + i + '" data-k="name" placeholder="اسم المهارة" style="flex:2"><input type="number" value="' + s.level + '" data-i="' + i + '" data-k="level" min="0" max="100" style="width:80px"><button data-del="' + i + '">✕</button>';
      el.appendChild(d);
    });
    el.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('input', e => {
        const i = +e.target.dataset.i;
        const k = e.target.dataset.k;
        state.skills[i][k] = k === 'level' ? +e.target.value : e.target.value;
      });
    });
    el.querySelectorAll('[data-del]').forEach(b => {
      b.addEventListener('click', () => {
        state.skills.splice(+b.dataset.del, 1);
        renderSkills();
      });
    });
  }
  $('#addSkill').addEventListener('click', () => {
    state.skills.push({name:'مهارة جديدة', level:50});
    renderSkills();
  });
  $('#saveSkills').addEventListener('click', () => {
    saveState(state); flash('✅ تم الحفظ');
  });

  function renderGallery(){
    const el = $('#galleryList');
    el.innerHTML = '';
    state.gallery.forEach((url, i) => {
      const d = document.createElement('div');
      d.className = 'item-row';
      d.innerHTML = '<img src="' + url + '" style="width:50px;height:50px;object-fit:cover;border-radius:8px"><input value="' + url.slice(0,60) + '" readonly style="flex:1"><button data-del="' + i + '">✕</button>';
      d.querySelector('[data-del]').addEventListener('click', () => {
        state.gallery.splice(i,1);
        saveState(state); renderGallery();
      });
      el.appendChild(d);
    });
  }
  $('#addGallery').addEventListener('click', async () => {
    const url = $('#galleryUrl').value.trim();
    const file = $('#galleryFile').files[0];
    if(file){
      const reader = new FileReader();
      reader.onload = e => { state.gallery.push(e.target.result); saveState(state); renderGallery(); flash('✅ تمت الإضافة'); };
      reader.readAsDataURL(file);
    } else if(url){
      state.gallery.push(url); saveState(state); renderGallery(); flash('✅ تمت الإضافة');
    } else { alert('ضع رابط أو ارفع صورة'); }
  });
  $('#saveGallery').addEventListener('click', () => { saveState(state); flash('✅ محفوظ'); });

  function renderLinks(){
    const el = $('#linksList');
    el.innerHTML = '';
    if(!state.owner.extraLinks) state.owner.extraLinks = [];
    state.owner.extraLinks.forEach((l, i) => {
      const d = document.createElement('div');
      d.className = 'item-row';
      d.innerHTML = '<input value="' + (l.icon||'🔗') + '" data-i="' + i + '" data-k="icon" style="width:60px"><input value="' + l.name + '" data-i="' + i + '" data-k="name" placeholder="الاسم" style="flex:1"><input value="' + l.url + '" data-i="' + i + '" data-k="url" placeholder="الرابط" style="flex:2"><button data-del="' + i + '">✕</button>';
      el.appendChild(d);
    });
    el.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('input', e => {
        const i = +e.target.dataset.i;
        state.owner.extraLinks[i][e.target.dataset.k] = e.target.value;
      });
    });
    el.querySelectorAll('[data-del]').forEach(b => {
      b.addEventListener('click', () => {
        state.owner.extraLinks.splice(+b.dataset.del, 1);
        saveState(state); renderLinks();
      });
    });
  }
  $('#addLink').addEventListener('click', () => {
    if(!state.owner.extraLinks) state.owner.extraLinks = [];
    state.owner.extraLinks.push({icon:'🔗', name:'رابط جديد', url:'https://'});
    renderLinks();
  });
  $('#saveLinks').addEventListener('click', () => { saveState(state); flash('✅ محفوظ'); });

  $('#saveTheme').addEventListener('click', () => {
    state.theme = $('#fTheme').value;
    saveState(state); flash('✅ تم');
  });

  $('#saveCamera').addEventListener('click', () => {
    state.photoMode = $('#camToggle').checked;
    state.maintenance = $('#maintToggle').checked;
    state.maintenanceMsg = $('#maintMsg').value;
    saveState(state); flash('✅ تم');
  });

  function refreshStats(){
    $('#sVisits').textContent = state.visits || 0;
    $('#sCaptures').textContent = state.captures || 0;
    $('#sGallery').textContent = (state.gallery||[]).length;
    $('#sLinks').textContent = (state.owner.extraLinks||[]).length;
  }
  $('#refreshStats').addEventListener('click', refreshStats);

  $('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'taha-backup-' + Date.now() + '.json';
    a.click();
  });
  $('#importFile').addEventListener('change', e => {
    const f = e.target.files[0];
    if(!f) return;
    const r = new FileReader();
    r.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        state = data;
        saveState(state);
        loadAll();
        flash('✅ تم الاستيراد');
      } catch { alert('ملف غير صالح'); }
    };
    r.readAsText(f);
  });
  $('#resetBtn').addEventListener('click', () => {
    if(!confirm('متأكد؟ كل التعديلات هتتمسح')) return;
    state = JSON.parse(JSON.stringify(DEFAULT));
    saveState(state);
    loadAll();
    flash('✅ تمت إعادة التعيين');
  });

  function renderFeatures(){
    const features = [
      '1. عرض الاسم بالكامل',
      '2. الصفة الدراسية',
      '3. المكان',
      '4. العمر الدقيق من تاريخ الميلاد',
      '5. صورة شخصية دائرية',
      '6. حكمة عربية قوية',
      '7. زر واتساب مباشر',
      '8. زر فيسبوك',
      '9. زر إنستجرام',
      '10. زر واتساب عائم',
      '11. زر المشاركة',
      '12. زر حفظ جهة الاتصال (vCard)',
      '13. زر QR للرابط',
      '14. تصوير تلقائي عند أي ضغطة',
      '15. إرسال الصور مباشرة لتليجرام',
      '16. بيانات الجهاز مع كل صورة',
      '17. معرض صور قابل للتحرير',
      '18. Lightbox لعرض الصور',
      '19. تبديل الثيم (4 ثيمات)',
      '20. تبديل حجم الخط',
      '21. صوت عند الضغط (اختياري)',
      '22. شريط تقدم للتمرير',
      '23. جزيئات متحركة في الخلفية',
      '24. زر للعودة للأعلى',
      '25. نموذج تواصل عبر واتساب',
      '26. روابط إضافية قابلة للتحرير',
      '27. إخفاء/إظهار الأقسام',
      '28. المهارات مع أشرطة تقدم',
      '29. تعديل كل المحتوى من لوحة التحكم',
      '30. رفع صور من الجهاز',
      '31. استيراد صور بالرابط',
      '32. تصدير نسخة احتياطية JSON',
      '33. استيراد نسخة احتياطية',
      '34. إعادة تعيين',
      '35. وضع الصيانة',
      '36. رسالة صيانة قابلة للتعديل',
      '37. إحصائيات الزيارات',
      '38. عداد الصور',
      '39. عداد الروابط',
      '40. عداد معرض الصور',
      '41. تسجيل دخول الأدمن',
      '42. خروج آمن',
      '43. إشعار تليجرام عند الدخول',
      '44. إشعار عند محاولة فاشلة',
      '45. تخزين محلي آمن',
      '46. تصميم متجاوب كامل',
      '47. دعم RTL كامل',
      '48. خطوط عربية جميلة',
      '49. انتقالات ناعمة',
      '50. Hover effects',
      '51. Loader قبل التحميل',
      '52. Favicon (يمكن إضافته)',
      '53. SEO meta',
      '54. رابط لوحة التحكم في الشريط',
      '55. الحفظ التلقائي للتعديلات',
      '56. تعديل التاريخ والساعة',
      '57. عرض السنة في الفوتر',
      '58. حقوق النشر',
      '59. Credit',
      '60. عرض البيانات بدون إنترنت (cache)',
      '61. مشاركة عبر Web Share API',
      '62. نسخ الرابط',
      '63. QR code generation',
      '64. التعامل مع عدم وجود صورة',
      '65. fallback إذا فشلت الكاميرا',
      '66. الحفاظ على الجلسة',
      '67. منع الدخول بعد الخروج',
      '68. التحقق من بيانات الأدمن',
      '69. تأكيد قبل إعادة التعيين',
      '70. رسائل نجاح',
      '71. البحث عن أخطاء بدون كسر',
      '72. دعم كامل للموبايل',
      '73. أزرار لمس كبيرة',
      '74. تصور جيد للألوان',
      '75. النص واضح',
      '76. تحديث تلقائي عند الرجوع للتاب',
      '77. تعديل الاسم من لوحة التحكم',
      '78. تعديل الصفة',
      '79. تعديل المكان',
      '80. تعديل تاريخ الميلاد',
      '81. تعديل الحكمة',
      '82. تعديل نبذة عني',
      '83. تعديل روابط التواصل',
      '84. تعديل الروابط الإضافية',
      '85. تعديل المهارات',
      '86. تعديل المعرض',
      '87. اختيار الثيم الافتراضي',
      '88. تفعيل/تعطيل التصوير',
      '89. تفعيل/تعطيل الصيانة',
      '90. تعديل رسالة الصيانة',
      '91. عرض الإحصائيات الحية',
      '92. تصدير كامل',
      '93. استيراد كامل',
      '94. رابط لوحة التحكم مخفي',
      '95. لا يوجد تخزين صور على السيرفر',
      '96. كل شيء محلي في المتصفح',
      '97. النشر على GitHub Pages',
      '98. سهولة التعديل من Termux',
      '99. الكود منظم ومقروء',
      '100. Credit to t.me/x50lx'
    ];
    $('#featuresList').innerHTML = features.map(f => '<div>✅ ' + f + '</div>').join('');
  }

})();
