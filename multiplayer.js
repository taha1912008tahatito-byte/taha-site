(function(){
  const $ = s => document.querySelector(s);
  const esc = s => String(s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  const MP = {
    peer: null, isHost: false, roomId: null, nickname: '', myId: '',
    hostConn: null, clients: [], connected: false, users: [],
    currentHandler: null,

    async initPeer(id) {
      if (typeof Peer === 'undefined') throw new Error('مكتبة الألعاب لم تتحمل — أعد تحديث الصفحة');
      return new Promise((res, rej) => {
        const p = new Peer(id, { debug: 0 });
        p.on('open', id => { this.peer = p; this.myId = id; res(); });
        p.on('error', e => rej(e));
        setTimeout(() => { if (!this.peer) rej(new Error('انتهت مدة الاتصال')); }, 15000);
      });
    },

    async host(roomId, nickname) {
      this.isHost = true; this.roomId = roomId; this.nickname = nickname;
      try { await this.initPeer('thahost-' + roomId); }
      catch(e) { throw new Error(e.type === 'unavailable-id' ? 'اسم الغرفة مستخدم — جرب تاني' : 'فشل الاتصال'); }
      this.peer.on('connection', conn => {
        this.clients.push(conn);
        conn.on('data', d => this.onHostData(conn, d));
        conn.on('close', () => {
          this.clients = this.clients.filter(c => c !== conn);
          this.emitUsers();
        });
      });
      this.connected = true;
    },

    async join(roomId, nickname) {
      this.isHost = false; this.roomId = roomId; this.nickname = nickname;
      await this.initPeer('thauser-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
      return new Promise((res, rej) => {
        const conn = this.peer.connect('thahost-' + roomId);
        const t = setTimeout(() => rej(new Error('الغرفة غير موجودة')), 10000);
        conn.on('open', () => { clearTimeout(t); this.hostConn = conn; this.connected = true; conn.send({type:'hello', nickname}); res(); });
        conn.on('data', d => this.onClientData(d));
        conn.on('error', e => { clearTimeout(t); rej(new Error('فشل الاتصال')); });
        conn.on('close', () => { this.connected = false; this.emit({type:'disconnected'}); });
      });
    },

    onHostData(conn, d) {
      if (d.type === 'hello') { conn._nickname = d.nickname; this.emitUsers(); return; }
      d.from = conn.peer; d.nickname = conn._nickname;
      this.emit(d);
      this.clients.forEach(c => { if (c !== conn && c.open) c.send(d); });
    },

    onClientData(d) { this.emit(d); },

    getUsers() {
      const u = [{peerId: this.myId, nickname: this.nickname}];
      this.clients.forEach(c => u.push({peerId: c.peer, nickname: c._nickname || '?'}));
      return u;
    },

    emitUsers() {
      const users = this.getUsers();
      this.users = users;
      this.emit({type:'users', users});
      this.clients.forEach(c => c.open && c.send({type:'users', users}));
    },

    send(d) {
      d.from = this.myId; d.nickname = this.nickname;
      this.emit(d);
      if (this.isHost) this.clients.forEach(c => c.open && c.send(d));
      else if (this.hostConn && this.hostConn.open) this.hostConn.send(d);
    },

    emit(d) { if (this.currentHandler) this.currentHandler(d); },

    disconnect() {
      try { if (this.peer) this.peer.destroy(); } catch(e){}
      this.peer = null; this.clients = []; this.hostConn = null;
      this.connected = false; this.isHost = false; this.currentHandler = null;
    }
  };
  window.MP = MP;

  // ===== LOBBY =====
  function renderLobby(container, title, onStart) {
    container.innerHTML = `
      <div style="max-width:400px;margin:0 auto;padding:10px">
        <h2 style="color:var(--accent);text-align:center;margin-bottom:4px;font-size:20px">${title}</h2>
        <p style="color:var(--muted);text-align:center;font-size:11px;margin-bottom:16px">العب مع أي حد في الموقع</p>
        <input id="mpNick" placeholder="اسمك" style="width:100%;padding:11px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text);margin-bottom:10px;font-family:inherit">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
          <button id="mpCreate" style="padding:11px;background:var(--accent);color:#000;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit">➕ إنشاء</button>
          <button id="mpJoinBtn" style="padding:11px;background:#8b5cf6;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit">🔗 دخول</button>
        </div>
        <div id="mpJoinForm" style="display:none">
          <input id="mpRoomCode" placeholder="كود الغرفة" style="width:100%;padding:11px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text);margin-bottom:10px;text-transform:uppercase;font-family:inherit">
          <button id="mpJoinGo" style="width:100%;padding:11px;background:var(--accent);color:#000;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit">دخول</button>
        </div>
        <div id="mpError" style="color:#ff5470;text-align:center;margin-top:10px;font-size:12px"></div>
        <div id="mpStatus" style="color:var(--muted);text-align:center;margin-top:10px;font-size:12px"></div>
      </div>`;

    $('#mpCreate').addEventListener('click', async () => {
      const nick = $('#mpNick').value.trim() || 'مضيف';
      const code = Math.random().toString(36).slice(2,8).toUpperCase();
      $('#mpStatus').textContent = '⏳...';
      try { await MP.host(code, nick); onStart({isHost: true, roomId: code}); }
      catch(e) { $('#mpStatus').textContent=''; $('#mpError').textContent = '❌ ' + (e.message || 'خطأ'); }
    });

    $('#mpJoinBtn').addEventListener('click', () => { $('#mpJoinForm').style.display = 'block'; });

    $('#mpJoinGo').addEventListener('click', async () => {
      const nick = $('#mpNick').value.trim() || 'لاعب';
      const code = $('#mpRoomCode').value.trim().toUpperCase();
      if (!code) { $('#mpError').textContent = '❌ اكتب الكود'; return; }
      $('#mpStatus').textContent = '⏳...';
      try { await MP.join(code, nick); onStart({isHost: false, roomId: code}); }
      catch(e) { $('#mpStatus').textContent=''; $('#mpError').textContent = '❌ ' + (e.message || 'فشل'); }
    });
  }

  function roomHeader(roomId) {
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:var(--card);border-radius:10px;margin-bottom:8px;font-size:12px">
      <span>🏠 <b style="color:var(--accent)">${esc(roomId)}</b></span>
      <span id="mpUserCount" style="color:var(--muted)">0 لاعب</span>
      <button id="mpLeave" style="padding:5px 10px;background:#dc143c;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-family:inherit">خروج</button>
    </div>`;
  }

  function leaveGame() {
    MP.disconnect();
    const A = document.querySelector('#appContent');
    if (A) A.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted)">تم الخروج — اضغط رجوع</div>';
  }

  // ===== CHAT =====
  function openChat(container) {
    renderLobby(container, '💬 دردشة جماعية', ({roomId}) => {
      container.innerHTML = `
        <div style="max-width:500px;margin:0 auto;padding:10px">
          ${roomHeader(roomId)}
          <div id="mpUsers" style="padding:8px;background:var(--bg-2);border-radius:8px;margin-bottom:8px;font-size:12px;color:var(--text-dim);min-height:28px"></div>
          <div id="mpMessages" style="height:380px;overflow-y:auto;background:var(--bg-2);border-radius:10px;padding:10px;margin-bottom:8px"></div>
          <div style="display:flex;gap:6px">
            <input id="mpMsgIn" placeholder="رسالة..." style="flex:1;padding:10px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text);font-family:inherit;font-size:13px">
            <button id="mpSendMsg" style="padding:10px 16px;background:var(--accent);color:#000;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit">إرسال</button>
          </div>
        </div>`;

      function addMsg(name, text, mine) {
        const d = document.createElement('div');
        d.style.cssText = 'margin-bottom:6px;padding:6px 10px;border-radius:8px;font-size:13px;color:var(--text);' +
          (mine ? 'background:rgba(212,175,55,.15);border-right:3px solid var(--accent)' : 'background:rgba(139,92,246,.1);border-right:3px solid #8b5cf6');
        d.innerHTML = '<b style="color:var(--accent);font-size:11px">' + esc(name) + '</b><br>' + esc(text);
        $('#mpMessages').appendChild(d);
        $('#mpMessages').scrollTop = $('#mpMessages').scrollHeight;
      }

      function send() {
        const t = $('#mpMsgIn').value.trim();
        if (!t) return;
        MP.send({type: 'chat', text: t});
        $('#mpMsgIn').value = '';
      }

      MP.currentHandler = (d) => {
        if (d.type === 'users') {
          $('#mpUsers').textContent = '👥 ' + d.users.map(u => u.nickname).join(' • ');
          $('#mpUserCount').textContent = d.users.length + ' لاعب';
        }
        if (d.type === 'chat') addMsg(d.nickname, d.text, d.from === MP.myId);
        if (d.type === 'disconnected') { alert('انقطع الاتصال'); leaveGame(); }
      };

      $('#mpSendMsg').addEventListener('click', send);
      $('#mpMsgIn').addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
      $('#mpLeave').addEventListener('click', leaveGame);
      if (MP.isHost) MP.emitUsers();
    });
  }

  // ===== TIC TAC TOE =====
  function openTTT(container) {
    renderLobby(container, '❌ إكس أو جماعي', ({roomId}) => {
      container.innerHTML = `
        <div style="max-width:340px;margin:0 auto;padding:10px">
          ${roomHeader(roomId)}
          <div id="mpUsers" style="padding:8px;background:var(--bg-2);border-radius:8px;margin-bottom:8px;font-size:12px;color:var(--text-dim)"></div>
          <div id="tttStatus" style="text-align:center;color:var(--accent);font-weight:700;margin-bottom:10px;font-size:14px">دور X</div>
          <div id="tttBoard" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px"></div>
          <button id="tttNew" style="margin-top:12px;width:100%;padding:10px;background:var(--accent);color:#000;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit">لعبة جديدة</button>
        </div>`;

      let board = Array(9).fill('');
      let turn = 'X', done = false, mySymbol = MP.isHost ? 'X' : null;
      const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

      function draw() {
        const el = $('#tttBoard'); el.innerHTML = '';
        board.forEach((v, i) => {
          const b = document.createElement('button');
          b.style.cssText = 'aspect-ratio:1;background:var(--card);border:1px solid var(--border);border-radius:10px;font-size:30px;font-weight:800;cursor:pointer;font-family:inherit;color:' + (v==='X'?'#d4af37':v==='O'?'#8b5cf6':'var(--text)');
          b.textContent = v;
          b.addEventListener('click', () => {
            if (done || board[i] || !mySymbol || mySymbol !== turn) return;
            board[i] = turn;
            const w = wins.find(w => board[w[0]] && board[w[0]]===board[w[1]] && board[w[1]]===board[w[2]]);
            if (w) { done = true; $('#tttStatus').textContent = '🏆 ' + board[w[0]] + ' فاز'; }
            else if (board.every(x => x)) { done = true; $('#tttStatus').textContent = 'تعادل'; }
            else { turn = turn === 'X' ? 'O' : 'X'; $('#tttStatus').textContent = 'دور ' + turn + (turn===mySymbol?' (دورك)':''); }
            draw();
            MP.send({type:'ttt-move', board:[...board], turn, done, win: w ? board[w[0]] : null});
          });
          el.appendChild(b);
        });
      }

      MP.currentHandler = (d) => {
        if (d.type === 'users') {
          $('#mpUsers').textContent = '👥 ' + d.users.map((u,i) => (i===0?'❌ ':'⭕ ') + u.nickname).join(' • ');
          $('#mpUserCount').textContent = d.users.length + ' لاعب';
          if (MP.isHost && d.users[1]) MP.send({type:'ttt-role', peerId: d.users[1].peerId, symbol: 'O'});
        }
        if (d.type === 'ttt-role' && d.peerId === MP.myId) {
          mySymbol = d.symbol;
          $('#tttStatus').textContent = 'أنت ' + d.symbol + (d.symbol==='X'?' - دورك':' - انتظر');
        }
        if (d.type === 'ttt-move' && d.from !== MP.myId) {
          board = [...d.board]; turn = d.turn; done = d.done;
          if (d.win) $('#tttStatus').textContent = '🏆 ' + d.win + ' فاز';
          else if (d.done) $('#tttStatus').textContent = 'تعادل';
          else $('#tttStatus').textContent = 'دور ' + turn + (turn===mySymbol?' (دورك)':'');
          draw();
        }
        if (d.type === 'ttt-new') {
          board = Array(9).fill(''); turn = 'X'; done = false;
          $('#tttStatus').textContent = 'دور X';
          draw();
        }
      };

      $('#tttNew').addEventListener('click', () => {
        board = Array(9).fill(''); turn = 'X'; done = false;
        $('#tttStatus').textContent = 'دور X'; draw();
        MP.send({type:'ttt-new'});
      });
      $('#mpLeave').addEventListener('click', leaveGame);

      if (MP.isHost) MP.emitUsers();
      draw();
    });
  }

  // ===== RPS =====
  function openRPS(container) {
    renderLobby(container, '✊ حجر ورقة مقص', ({roomId}) => {
      container.innerHTML = `
        <div style="max-width:400px;margin:0 auto;padding:10px">
          ${roomHeader(roomId)}
          <div id="mpUsers" style="padding:8px;background:var(--bg-2);border-radius:8px;margin-bottom:10px;font-size:12px;color:var(--text-dim)"></div>
          <div id="rpsStatus" style="text-align:center;color:var(--accent);margin-bottom:12px;font-size:14px">اختر سلاحك</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
            <button class="rpsBtn" data-v="rock" style="padding:18px;background:var(--card);border:1px solid var(--border);border-radius:12px;font-size:30px;cursor:pointer">✊</button>
            <button class="rpsBtn" data-v="paper" style="padding:18px;background:var(--card);border:1px solid var(--border);border-radius:12px;font-size:30px;cursor:pointer">✋</button>
            <button class="rpsBtn" data-v="scissors" style="padding:18px;background:var(--card);border:1px solid var(--border);border-radius:12px;font-size:30px;cursor:pointer">✌️</button>
          </div>
          <div id="rpsResults" style="min-height:60px"></div>
          <button id="rpsReset" style="margin-top:10px;width:100%;padding:10px;background:var(--accent);color:#000;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit">جولة جديدة</button>
        </div>`;

      let picks = {};
      const icons = {rock:'✊', paper:'✋', scissors:'✌️'};

      function tally() {
        if (!MP.isHost) return;
        const expected = MP.getUsers().length;
        if (Object.keys(picks).length < expected || expected < 2) return;
        const entries = Object.entries(picks);
        const counts = {rock:0, paper:0, scissors:0};
        entries.forEach(([_, v]) => counts[v]++);
        let winner = 'تعادل';
        if (counts.rock && counts.scissors && !counts.paper) winner = 'rock';
        else if (counts.paper && counts.rock && !counts.scissors) winner = 'paper';
        else if (counts.scissors && counts.paper && !counts.rock) winner = 'scissors';
        const users = MP.getUsers();
        const results = entries.map(([pid, pick]) => ({
          peerId: pid, name: (users.find(u => u.peerId === pid)||{}).nickname || '?',
          pick, win: winner === pick
        }));
        MP.send({type:'rps-result', results, winner});
      }

      function showResults(results, winner) {
        let html = '<h3 style="color:var(--accent);font-size:13px;margin-bottom:6px">النتائج:</h3>';
        results.forEach(r => {
          html += '<div style="padding:5px 10px;margin-bottom:3px;background:var(--bg-2);border-radius:6px;font-size:12px;color:var(--text);' + (r.win?'border-right:3px solid #4ade80':'') + '">' + esc(r.name) + ' → ' + icons[r.pick] + (r.win?' 🏆':'') + '</div>';
        });
        $('#rpsResults').innerHTML = html;
        $('#rpsStatus').textContent = winner === 'تعادل' ? 'تعادل' : 'الفائز: ' + icons[winner];
      }

      document.querySelectorAll('.rpsBtn').forEach(b => {
        b.addEventListener('click', () => {
          const v = b.dataset.v;
          picks[MP.myId] = v;
          MP.send({type:'rps-pick', pick: v});
          $('#rpsStatus').textContent = 'اخترت ' + icons[v] + ' - انتظر';
          if (MP.isHost) tally();
        });
      });

      MP.currentHandler = (d) => {
        if (d.type === 'users') {
          $('#mpUsers').textContent = '👥 ' + d.users.map(u => u.nickname).join(' • ');
          $('#mpUserCount').textContent = d.users.length + ' لاعب';
        }
        if (d.type === 'rps-pick' && d.from !== MP.myId) { picks[d.from] = d.pick; if (MP.isHost) tally(); }
        if (d.type === 'rps-result') showResults(d.results, d.winner);
        if (d.type === 'rps-reset') { picks = {}; $('#rpsResults').innerHTML=''; $('#rpsStatus').textContent='اختر سلاحك'; }
      };

      $('#rpsReset').addEventListener('click', () => {
        picks = {}; $('#rpsResults').innerHTML=''; $('#rpsStatus').textContent='اختر سلاحك';
        MP.send({type:'rps-reset'});
      });
      $('#mpLeave').addEventListener('click', leaveGame);

      if (MP.isHost) MP.emitUsers();
    });
  }

  // ===== REACTION RACE =====
  function openReaction(container) {
    renderLobby(container, '⚡ سباق سرعة', ({roomId}) => {
      container.innerHTML = `
        <div style="max-width:400px;margin:0 auto;padding:10px">
          ${roomHeader(roomId)}
          <div id="mpUsers" style="padding:8px;background:var(--bg-2);border-radius:8px;margin-bottom:10px;font-size:12px;color:var(--text-dim)"></div>
          <div id="rrStatus" style="text-align:center;color:var(--accent);font-size:15px;margin-bottom:12px">انتظر الإشارة</div>
          <button id="rrBtn" style="width:100%;padding:60px;background:var(--card);border:3px solid var(--border);border-radius:20px;font-size:60px;cursor:pointer;color:var(--text);transition:all .3s;font-family:inherit">⏳</button>
          <div id="rrResults" style="margin-top:12px;font-size:12px"></div>
          <button id="rrStart" style="margin-top:10px;width:100%;padding:10px;background:var(--accent);color:#000;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit">ابدأ الجولة</button>
        </div>`;

      let started = false, goTime = 0, results = [];

      $('#rrBtn').addEventListener('click', () => {
        if (!started || !goTime) {
          $('#rrBtn').textContent = '❌'; $('#rrBtn').style.background = '#dc143c';
          $('#rrStatus').textContent = 'استنى الإشارة!';
          setTimeout(() => { $('#rrBtn').textContent = '⏳'; $('#rrBtn').style.background = 'var(--card)'; }, 1000);
          return;
        }
        const reaction = Date.now() - goTime;
        MP.send({type:'rr-result', reaction});
        $('#rrBtn').textContent = reaction + 'ms';
        $('#rrBtn').style.background = 'var(--card)';
        $('#rrStatus').textContent = 'وقتك: ' + reaction + 'ms';
        started = false;
      });

      $('#rrStart').addEventListener('click', () => {
        results = [];
        $('#rrResults').innerHTML = '';
        $('#rrBtn').textContent = '⏳';
        $('#rrBtn').style.background = 'var(--card)';
        started = false; goTime = 0;
        $('#rrStatus').textContent = 'استعد...';
        const delay = 2000 + Math.random() * 4000;
        setTimeout(() => {
          goTime = Date.now();
          MP.send({type:'rr-go', goTime});
          $('#rrBtn').textContent = '🎯';
          $('#rrBtn').style.background = 'linear-gradient(135deg, #4ade80, #22c55e)';
          $('#rrStatus').textContent = 'اضغط الآن!';
          started = true;
        }, delay);
        MP.send({type:'rr-wait'});
      });

      MP.currentHandler = (d) => {
        if (d.type === 'users') {
          $('#mpUsers').textContent = '👥 ' + d.users.map(u => u.nickname).join(' • ');
          $('#mpUserCount').textContent = d.users.length + ' لاعب';
        }
        if (d.type === 'rr-wait') {
          $('#rrStatus').textContent = 'استعد...';
          $('#rrBtn').textContent = '⏳';
          $('#rrBtn').style.background = 'var(--card)';
          results = []; $('#rrResults').innerHTML = ''; started = false; goTime = 0;
        }
        if (d.type === 'rr-go') {
          goTime = d.goTime; started = true;
          $('#rrBtn').textContent = '🎯';
          $('#rrBtn').style.background = 'linear-gradient(135deg, #4ade80, #22c55e)';
          $('#rrStatus').textContent = 'اضغط الآن!';
        }
        if (d.type === 'rr-result') {
          results.push({name: d.nickname, ms: d.reaction});
          if (MP.isHost && results.length >= MP.getUsers().length) {
            const sorted = [...results].sort((a,b) => a.ms - b.ms);
            MP.send({type:'rr-final', sorted});
          }
        }
        if (d.type === 'rr-final') {
          let html = '<h3 style="color:var(--accent);font-size:13px;margin-bottom:6px">🏆 الترتيب:</h3>';
          d.sorted.forEach((r, i) => {
            html += '<div style="padding:5px 10px;margin-bottom:3px;background:var(--bg-2);border-radius:6px;font-size:12px;color:var(--text)">' + (i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)) + ' ' + esc(r.name) + ' — ' + r.ms + 'ms</div>';
          });
          $('#rrResults').innerHTML = html;
        }
      };

      $('#mpLeave').addEventListener('click', leaveGame);
      if (MP.isHost) MP.emitUsers();
    });
  }

  MP.openGame = function(type, container) {
    if (type === 'chat') openChat(container);
    else if (type === 'ttt') openTTT(container);
    else if (type === 'rps') openRPS(container);
    else if (type === 'reaction') openReaction(container);
  };
})();
