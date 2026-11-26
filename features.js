(function(){
  const $ = s => document.querySelector(s);
  const NF = {
    open(app, container){
      const m = {prayer:this.prayer, weather:this.weather, currency:this.currency,
        quran:this.quran, hadith:this.hadith, game2048:this.g2048,
        snake:this.snake, colorpicker:this.color, unitconv:this.unit,
        countdown:this.countdown, wordscramble:this.word};
      if(m[app]) m[app].call(this, container);
    },

    prayer(c){
      c.innerHTML = `<div style="max-width:500px;margin:0 auto">
        <h2 style="color:var(--accent);text-align:center;margin-bottom:14px">🕌 مواقيت الصلاة</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
          <input id="pCity" value="Cairo" placeholder="المدينة" style="padding:10px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text);font-family:inherit">
          <input id="pCountry" value="Egypt" placeholder="البلد" style="padding:10px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text);font-family:inherit">
        </div>
        <button id="pGo" style="width:100%;padding:12px;background:var(--accent);color:#000;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit">عرض</button>
        <div id="pOut" style="margin-top:16px"></div></div>`;
      const load = async()=>{
        const city = $('#pCity').value.trim()||'Cairo';
        const country = $('#pCountry').value.trim()||'Egypt';
        $('#pOut').innerHTML = '<p style="text-align:center;color:var(--muted)">⏳...</p>';
        try{
          const r = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${city}&country=${country}&method=5`);
          const d = (await r.json()).data;
          const t = d.timings;
          const rows = [['الفجر','Fajr','🌙'],['الشروق','Sunrise','🌅'],['الظهر','Dhuhr','☀️'],['العصر','Asr','🌤️'],['المغرب','Maghrib','🌇'],['العشاء','Isha','🌙']];
          $('#pOut').innerHTML = `<p style="text-align:center;color:var(--accent);margin-bottom:10px;font-size:13px">${city} — ${d.date.readable}</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${rows.map(([ar,en,e])=>`<div style="padding:12px;background:var(--card);border:1px solid var(--border);border-radius:10px;text-align:center"><div style="font-size:22px">${e}</div><div style="font-weight:700;color:var(--accent);font-size:13px">${ar}</div><div style="color:var(--text);font-size:16px;font-weight:800">${t[en]}</div></div>`).join('')}</div>`;
        }catch(e){ $('#pOut').innerHTML = '<p style="color:#ff5470;text-align:center">❌ فشل</p>'; }
      };
      $('#pGo').addEventListener('click', load);
      load();
    },

    weather(c){
      c.innerHTML = `<div style="max-width:500px;margin:0 auto">
        <h2 style="color:var(--accent);text-align:center;margin-bottom:14px">🌤️ الطقس</h2>
        <button id="wGo" style="width:100%;padding:12px;background:var(--accent);color:#000;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit">استخدم موقعي</button>
        <div id="wOut" style="margin-top:16px"></div></div>`;
      const load = async(lat,lon)=>{
        $('#wOut').innerHTML = '<p style="text-align:center;color:var(--muted)">⏳...</p>';
        try{
          const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`);
          const cur = (await r.json()).current;
          const icons = {0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',51:'🌧️',61:'🌧️',71:'❄️',95:'⛈️'};
          const names = {0:'صافي',1:'صافي جزئياً',2:'غائم',3:'غائم',45:'ضباب',51:'رذاذ',61:'مطر',71:'ثلج',95:'عاصفة'};
          $('#wOut').innerHTML = `<div style="padding:20px;background:var(--card);border:1px solid var(--border);border-radius:14px;text-align:center">
            <div style="font-size:64px">${icons[cur.weather_code]||'🌡️'}</div>
            <div style="font-size:42px;font-weight:800;color:var(--accent)">${cur.temperature_2m}°C</div>
            <div style="color:var(--text);margin:8px 0">${names[cur.weather_code]||'—'}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px;font-size:13px">
              <div style="padding:8px;background:var(--bg-2);border-radius:8px">💧 ${cur.relative_humidity_2m}%</div>
              <div style="padding:8px;background:var(--bg-2);border-radius:8px">💨 ${cur.wind_speed_10m} km/h</div>
            </div></div>`;
        }catch(e){ $('#wOut').innerHTML = '<p style="color:#ff5470;text-align:center">❌ فشل</p>'; }
      };
      $('#wGo').addEventListener('click', ()=>{
        if(navigator.geolocation){
          navigator.geolocation.getCurrentPosition(p=>load(p.coords.latitude,p.coords.longitude), ()=>load(30.04,31.24));
        } else load(30.04,31.24);
      });
      load(30.04,31.24);
    },

    currency(c){
      c.innerHTML = `<div style="max-width:400px;margin:0 auto">
        <h2 style="color:var(--accent);text-align:center;margin-bottom:14px">💱 عملات</h2>
        <input id="cAmt" type="number" value="1" style="width:100%;padding:12px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text);margin-bottom:8px;font-family:inherit">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <select id="cFrom" style="padding:10px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text);font-family:inherit"><option value="USD">USD</option><option value="EGP">EGP</option><option value="EUR">EUR</option><option value="SAR">SAR</option><option value="AED">AED</option></select>
          <select id="cTo" style="padding:10px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text);font-family:inherit"><option value="EGP">EGP</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="SAR">SAR</option><option value="AED">AED</option></select>
        </div>
        <button id="cGo" style="width:100%;padding:12px;background:var(--accent);color:#000;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit">تحويل</button>
        <div id="cOut" style="margin-top:16px;text-align:center;font-size:24px;color:var(--accent);font-weight:800"></div></div>`;
      $('#cGo').addEventListener('click', async()=>{
        const amt = +$('#cAmt').value||1;
        const from = $('#cFrom').value, to = $('#cTo').value;
        $('#cOut').textContent = '⏳...';
        try{
          const r = await fetch(`https://open.er-api.com/v6/latest/${from}`);
          const rate = (await r.json()).rates[to];
          $('#cOut').innerHTML = `${amt} ${from} = <span style="font-size:32px">${(amt*rate).toFixed(2)}</span> ${to}`;
        }catch(e){ $('#cOut').textContent = '❌'; }
      });
    },

    quran(c){
      const vs = [
        ['إِنَّ مَعَ الْعُسْرِ يُسْرًا','الشرح: 6'],
        ['وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ','الطلاق: 3'],
        ['إِنَّ اللَّهَ مَعَ الصَّابِرِينَ','البقرة: 153'],
        ['وَقُل رَّبِّ زِدْنِي عِلْمًا','طه: 114'],
        ['فَاذْكُرُونِي أَذْكُرْكُمْ','البقرة: 152'],
        ['إِنَّ اللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتَّىٰ يُغَيِّرُوا مَا بِأَنفُسِهِمْ','الرعد: 11'],
        ['لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا','البقرة: 286'],
        ['وَقَالَ رَبُّكُمُ ادْعُونِي أَسْتَجِبْ لَكُمْ','غافر: 60'],
        ['وَعَسَىٰ أَن تَكْرَهُوا شَيْئًا وَهُوَ خَيْرٌ لَّكُمْ','البقرة: 216'],
        ['فَإِنَّ مَعَ الْعُسْرِ يُسْرًا','الشرح: 5']
      ];
      const v = vs[Math.floor(Math.random()*vs.length)];
      c.innerHTML = `<div style="max-width:500px;margin:0 auto;text-align:center">
        <h2 style="color:var(--accent);margin-bottom:14px">📖 آية</h2>
        <div style="padding:30px;background:var(--card);border:1px solid var(--border);border-radius:14px;border-right:4px solid var(--accent)">
          <p style="font-family:'Amiri',serif;font-size:22px;line-height:1.8;color:var(--text);margin-bottom:14px">"${v[0]}"</p>
          <p style="color:var(--accent);font-size:14px">${v[1]}</p>
        </div>
        <button id="qNew" style="margin-top:14px;padding:10px 24px;background:var(--accent);color:#000;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit">آية أخرى</button></div>`;
      $('#qNew').addEventListener('click', ()=>this.quran(c));
    },

    hadith(c){
      const hs = [
        ['إنما الأعمال بالنيات','متفق عليه'],
        ['من كان يؤمن بالله واليوم الآخر فليقل خيراً أو ليصمت','متفق عليه'],
        ['لا يؤمن أحدكم حتى يحب لأخيه ما يحب لنفسه','متفق عليه'],
        ['الدين النصيحة','مسلم'],
        ['الطهور شطر الإيمان','مسلم'],
        ['اتق الله حيثما كنت','الترمذي'],
        ['الكلمة الطيبة صدقة','متفق عليه'],
        ['أحب الأعمال إلى الله أدومها وإن قل','متفق عليه'],
        ['من سلك طريقاً يطلب فيه علماً سلك الله به طريقاً من طرق الجنة','مسلم'],
        ['من نفس عن مؤمن كربة نفس الله عنه كربة','مسلم']
      ];
      const h = hs[Math.floor(Math.random()*hs.length)];
      c.innerHTML = `<div style="max-width:500px;margin:0 auto;text-align:center">
        <h2 style="color:var(--accent);margin-bottom:14px">💡 حديث</h2>
        <div style="padding:30px;background:var(--card);border:1px solid var(--border);border-radius:14px;border-right:4px solid var(--accent)">
          <p style="font-size:18px;line-height:1.8;color:var(--text);margin-bottom:14px">"${h[0]}"</p>
          <p style="color:var(--accent);font-size:14px">${h[1]}</p>
        </div>
        <button id="hNew" style="margin-top:14px;padding:10px 24px;background:var(--accent);color:#000;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit">آخر</button></div>`;
      $('#hNew').addEventListener('click', ()=>this.hadith(c));
    },

    g2048(c){
      c.innerHTML = `<div style="max-width:340px;margin:0 auto;text-align:center">
        <h2 style="color:var(--accent);margin-bottom:8px">🔢 2048</h2>
        <div style="display:flex;justify-content:space-between;margin-bottom:10px">
          <span style="color:var(--text)">النقاط: <b id="s2048" style="color:var(--accent)">0</b></span>
          <button id="n2048" style="padding:6px 12px;background:var(--accent);color:#000;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:12px;font-family:inherit">جديد</button>
        </div>
        <div id="b2048" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;background:var(--bg-2);padding:8px;border-radius:12px;touch-action:none"></div>
        <p style="color:var(--muted);font-size:11px;margin-top:10px">أسهم الكيبورد أو اسحب</p></div>`;
      let grid = Array(16).fill(0), score = 0;
      const colors = {0:'#1a1a24',2:'#3a3a44',4:'#5a5a64',8:'#8b6c1f',16:'#b8860b',32:'#d4af37',64:'#e8c97a',128:'#f4d97e',256:'#faeaa0',512:'#ffd700',1024:'#ffed4e',2048:'#ff6b9d'};
      const draw = ()=>{
        $('#b2048').innerHTML = grid.map(n=>`<div style="aspect-ratio:1;background:${colors[n]||'#ff4d6d'};border-radius:8px;display:flex;align-items:center;justify-content:center;color:${n>4?'#000':'#fff'};font-weight:800;font-size:${n>999?14:n>99?18:22}px">${n||''}</div>`).join('');
        $('#s2048').textContent = score;
      };
      const spawn = ()=>{
        const e = grid.map((v,i)=>v===0?i:-1).filter(i=>i>=0);
        if(e.length) grid[e[Math.floor(Math.random()*e.length)]] = Math.random()<0.9?2:4;
      };
      const move = (dir)=>{
        const before = [...grid];
        const get = (i)=> (dir==='left'||dir==='right') ? [0,1,2,3].map(j=>grid[i*4+j]) : [0,1,2,3].map(j=>grid[j*4+i]);
        const set = (i,r)=>{ if(dir==='left'||dir==='right') r.forEach((v,j)=>grid[i*4+j]=v); else r.forEach((v,j)=>grid[j*4+i]=v); };
        const combine = (r)=>{
          r = r.filter(v=>v); const out = [];
          for(let i=0;i<r.length;i++){ if(r[i]===r[i+1]){out.push(r[i]*2); score+=r[i]*2; i++;} else out.push(r[i]); }
          while(out.length<4) out.push(0); return out;
        };
        for(let i=0;i<4;i++){
          let r = get(i);
          if(dir==='right'||dir==='down') r = r.reverse();
          r = combine(r);
          if(dir==='right'||dir==='down') r = r.reverse();
          set(i,r);
        }
        if(JSON.stringify(before)!==JSON.stringify(grid)){ spawn(); draw(); }
      };
      const init = ()=>{ grid = Array(16).fill(0); score=0; spawn(); spawn(); draw(); };
      document.addEventListener('keydown', e=>{
        if(!document.getElementById('b2048')) return;
        if(e.key==='ArrowLeft') move('left');
        if(e.key==='ArrowRight') move('right');
        if(e.key==='ArrowUp') move('up');
        if(e.key==='ArrowDown') move('down');
      });
      let sx=0, sy=0;
      const bd = $('#b2048');
      bd.addEventListener('touchstart', e=>{sx=e.touches[0].clientX; sy=e.touches[0].clientY;});
      bd.addEventListener('touchend', e=>{
        const dx=e.changedTouches[0].clientX-sx, dy=e.changedTouches[0].clientY-sy;
        if(Math.abs(dx)>Math.abs(dy)){ if(dx>30) move('left'); else if(dx<-30) move('right'); }
        else { if(dy>30) move('up'); else if(dy<-30) move('down'); }
      });
      $('#n2048').addEventListener('click', init);
      init();
    },

    snake(c){
      c.innerHTML = `<div style="max-width:340px;margin:0 auto;text-align:center">
        <h2 style="color:var(--accent);margin-bottom:8px">🐍 سنيك</h2>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="color:var(--text)">النقاط: <b id="snScore" style="color:var(--accent)">0</b></span>
          <button id="snNew" style="padding:6px 12px;background:var(--accent);color:#000;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:12px;font-family:inherit">جديد</button>
        </div>
        <canvas id="snCvs" width="320" height="320" style="background:var(--bg-2);border-radius:12px;border:1px solid var(--border);max-width:100%"></canvas>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px;max-width:180px;margin-left:auto;margin-right:auto">
          <div></div><button class="dpad" data-d="up" style="padding:12px;background:var(--card);border:1px solid var(--border);border-radius:8px;cursor:pointer;color:var(--text)">↑</button><div></div>
          <button class="dpad" data-d="left" style="padding:12px;background:var(--card);border:1px solid var(--border);border-radius:8px;cursor:pointer;color:var(--text)">←</button>
          <button class="dpad" data-d="down" style="padding:12px;background:var(--card);border:1px solid var(--border);border-radius:8px;cursor:pointer;color:var(--text)">↓</button>
          <button class="dpad" data-d="right" style="padding:12px;background:var(--card);border:1px solid var(--border);border-radius:8px;cursor:pointer;color:var(--text)">→</button>
        </div></div>`;
      const cvs = $('#snCvs'), ctx = cvs.getContext('2d'), cell = 20;
      let snake = [{x:8,y:8}], dir = {x:1,y:0}, food = {x:10,y:10}, score = 0, over = false, timer = null;
      const draw = ()=>{
        ctx.fillStyle = '#0c0c10'; ctx.fillRect(0,0,320,320);
        ctx.fillStyle = '#d4af37';
        snake.forEach(s=>ctx.fillRect(s.x*cell+1, s.y*cell+1, cell-2, cell-2));
        ctx.fillStyle = '#dc143c';
        ctx.fillRect(food.x*cell+1, food.y*cell+1, cell-2, cell-2);
        if(over){ ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(0,0,320,320); ctx.fillStyle='#d4af37'; ctx.font='bold 24px Cairo'; ctx.textAlign='center'; ctx.fillText('انتهت', 160, 160); }
      };
      const step = ()=>{
        if(over) return;
        const h = {x:snake[0].x+dir.x, y:snake[0].y+dir.y};
        if(h.x<0||h.x>=16||h.y<0||h.y>=16||snake.some(s=>s.x===h.x&&s.y===h.y)){ over=true; draw(); clearInterval(timer); return; }
        snake.unshift(h);
        if(h.x===food.x&&h.y===food.y){ score+=10; $('#snScore').textContent=score; do{food={x:Math.floor(Math.random()*16),y:Math.floor(Math.random()*16)};} while(snake.some(s=>s.x===food.x&&s.y===food.y)); } else snake.pop();
        draw();
      };
      const setD = (d)=>{
        const m = {up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
        const nd = m[d]; if(nd.x===-dir.x && nd.y===-dir.y) return; dir = nd;
      };
      const init = ()=>{ snake=[{x:8,y:8}]; dir={x:1,y:0}; food={x:10,y:10}; score=0; over=false; $('#snScore').textContent=0; clearInterval(timer); timer=setInterval(step,150); draw(); };
      document.addEventListener('keydown', e=>{
        if(!document.getElementById('snCvs')) return;
        if(e.key==='ArrowUp') setD('up'); if(e.key==='ArrowDown') setD('down');
        if(e.key==='ArrowLeft') setD('left'); if(e.key==='ArrowRight') setD('right');
      });
      c.querySelectorAll('.dpad').forEach(b=>b.addEventListener('click', ()=>setD(b.dataset.d)));
      $('#snNew').addEventListener('click', init);
      init();
    },

    color(c){
      c.innerHTML = `<div style="max-width:400px;margin:0 auto;text-align:center">
        <h2 style="color:var(--accent);margin-bottom:14px">🎨 منتقي الألوان</h2>
        <input type="color" id="cpIn" value="#d4af37" style="width:200px;height:200px;border:none;border-radius:20px;cursor:pointer;background:none">
        <div id="cpInfo" style="margin-top:16px;padding:14px;background:var(--card);border:1px solid var(--border);border-radius:12px;font-family:monospace"></div>
        <button id="cpCopy" style="margin-top:10px;padding:10px 24px;background:var(--accent);color:#000;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit">📋 نسخ HEX</button></div>`;
      const u = ()=>{
        const h = $('#cpIn').value;
        const r = parseInt(h.slice(1,3),16), g = parseInt(h.slice(3,5),16), b = parseInt(h.slice(5,7),16);
        $('#cpInfo').innerHTML = `HEX: <b style="color:${h}">${h}</b><br>RGB: rgb(${r}, ${g}, ${b})`;
      };
      $('#cpIn').addEventListener('input', u);
      $('#cpCopy').addEventListener('click', ()=>{ navigator.clipboard.writeText($('#cpIn').value); alert('تم نسخ '+$('#cpIn').value); });
      u();
    },

    unit(c){
      c.innerHTML = `<div style="max-width:400px;margin:0 auto">
        <h2 style="color:var(--accent);text-align:center;margin-bottom:14px">📏 محول وحدات</h2>
        <input id="uV" type="number" value="1" style="width:100%;padding:12px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text);margin-bottom:8px;font-family:inherit">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <select id="uF" style="padding:10px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text);font-family:inherit"><option value="m">متر</option><option value="km">كيلومتر</option><option value="cm">سنتيمتر</option><option value="kg">كيلو</option><option value="g">جرام</option></select>
          <select id="uT" style="padding:10px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text);font-family:inherit"><option value="cm">سنتيمتر</option><option value="m">متر</option><option value="km">كيلومتر</option><option value="kg">كيلو</option><option value="g">جرام</option></select>
        </div>
        <button id="uGo" style="width:100%;padding:12px;background:var(--accent);color:#000;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit">تحويل</button>
        <div id="uOut" style="margin-top:16px;text-align:center;font-size:24px;color:var(--accent);font-weight:800"></div></div>`;
      const f = {m:1, km:1000, cm:0.01, kg:1000, g:1};
      $('#uGo').addEventListener('click', ()=>{
        const v = +$('#uV').value||0;
        const r = (v * f[$('#uF').value] / f[$('#uT').value]).toFixed(4);
        $('#uOut').textContent = `${v} = ${r}`;
      });
    },

    countdown(c){
      c.innerHTML = `<div style="max-width:400px;margin:0 auto;text-align:center">
        <h2 style="color:var(--accent);margin-bottom:14px">⏳ عداد</h2>
        <input id="cdDt" type="date" style="width:100%;padding:12px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text);margin-bottom:8px;font-family:inherit">
        <button id="cdGo" style="width:100%;padding:12px;background:var(--accent);color:#000;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit">ابدأ</button>
        <div id="cdOut" style="margin-top:16px"></div></div>`;
      let t = null;
      $('#cdGo').addEventListener('click', ()=>{
        if(t) clearInterval(t);
        const tg = new Date($('#cdDt').value).getTime();
        if(!tg) return;
        const up = ()=>{
          const d = tg - Date.now();
          if(d<0){ $('#cdOut').innerHTML='<p style="color:#dc143c">انتهى</p>'; clearInterval(t); return; }
          const D = Math.floor(d/86400000), H = Math.floor((d%86400000)/3600000), M = Math.floor((d%3600000)/60000), S = Math.floor((d%60000)/1000);
          $('#cdOut').innerHTML = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">${[[D,'يوم'],[H,'ساعة'],[M,'دقيقة'],[S,'ثانية']].map(([v,l])=>`<div style="padding:12px;background:var(--card);border:1px solid var(--border);border-radius:10px"><div style="font-size:22px;font-weight:800;color:var(--accent)">${v}</div><div style="font-size:11px;color:var(--muted)">${l}</div></div>`).join('')}</div>`;
        };
        up(); t = setInterval(up, 1000);
      });
    },

    word(c){
      const words = ['الكتاب','الحاسوب','الشمس','القمر','الشجرة','الطائر','البيت','المدرسة','السماء','الماء','النار','الأرض'];
      const start = ()=>{
        const w = words[Math.floor(Math.random()*words.length)];
        const s = w.split('').sort(()=>Math.random()-.5).join('');
        c.innerHTML = `<div style="max-width:400px;margin:0 auto;text-align:center">
          <h2 style="color:var(--accent);margin-bottom:14px">🔤 ترتيب الحروف</h2>
          <div style="padding:30px;background:var(--card);border:1px solid var(--border);border-radius:14px;font-size:28px;font-weight:800;color:var(--text);letter-spacing:8px;margin-bottom:14px">${s}</div>
          <input id="wIn" placeholder="الكلمة" style="width:100%;padding:12px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text);margin-bottom:8px;text-align:center;font-family:inherit">
          <button id="wChk" style="width:100%;padding:12px;background:var(--accent);color:#000;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit">تحقق</button>
          <div id="wRes" style="margin-top:14px;font-size:16px;font-weight:700"></div></div>`;
        $('#wChk').addEventListener('click', ()=>{
          if($('#wIn').value.trim()===w){ $('#wRes').innerHTML='<span style="color:#4ade80">✅ صحيح</span>'; setTimeout(start,1500); }
          else $('#wRes').innerHTML='<span style="color:#ff5470">❌ حاول</span>';
        });
        $('#wIn').addEventListener('keydown', e=>{if(e.key==='Enter')$('#wChk').click();});
      };
      start();
    }
  };
  window.NEWFEATURES = NF;
})();
