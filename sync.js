(function(){
  const SYNC = {
    tokenKey: 'tj_github_token',
    gistKey: 'tj_gist_id',
    cacheKey: 'tj_state_cache',

    getToken(){ return localStorage.getItem(this.tokenKey) || ''; },
    setToken(t){ localStorage.setItem(this.tokenKey, t); },
    getGistId(){ return localStorage.getItem(this.gistKey) || ''; },
    setGistId(id){ localStorage.setItem(this.gistKey, id); },

    isReady(){ return !!this.getToken(); },

    async api(path, method, body){
      const token = this.getToken();
      if(!token) throw new Error('No token');
      const res = await fetch('https://api.github.com' + path, {
        method: method || 'GET',
        headers: {
          'Authorization': 'token ' + token,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
      });
      if(!res.ok){
        const err = await res.text();
        throw new Error('GitHub ' + res.status + ': ' + err.slice(0,200));
      }
      return res.json();
    },

    async test(){
      if(!this.getToken()) return {ok:false, msg:'لا يوجد توكن'};
      try {
        const user = await this.api('/user');
        return {ok:true, msg:'مرحباً ' + user.login};
      } catch(e){ return {ok:false, msg:e.message}; }
    },

    async createGist(data){
      const payload = {
        description: 'taha-site-data',
        public: false,
        files: {
          'taha-site-data.json': { content: JSON.stringify(data, null, 2) }
        }
      };
      const res = await this.api('/gists', 'POST', payload);
      this.setGistId(res.id);
      return res.id;
    },

    async updateGist(data){
      let id = this.getGistId();
      if(!id) return await this.createGist(data);
      try {
        await this.api('/gists/' + id, 'PATCH', {
          files: { 'taha-site-data.json': { content: JSON.stringify(data, null, 2) } }
        });
        return id;
      } catch(e){
        // gist deleted, recreate
        return await this.createGist(data);
      }
    },

    async pull(){
      const id = this.getGistId();
      if(!id || !this.getToken()) return null;
      try {
        const res = await this.api('/gists/' + id);
        const file = res.files['taha-site-data.json'];
        if(!file) return null;
        let content = file.content;
        if(!content && file.raw_url){
          const raw = await fetch(file.raw_url);
          content = await raw.text();
        }
        return JSON.parse(content);
      } catch(e){
        return null;
      }
    },

    async push(data){
      if(!this.isReady()) return null;
      try {
        const id = await this.updateGist(data);
        localStorage.setItem(this.cacheKey, JSON.stringify(data));
        return id;
      } catch(e){
        console.warn('sync push err:', e);
        return null;
      }
    },

    getCache(){
      try { return JSON.parse(localStorage.getItem(this.cacheKey) || 'null'); } catch { return null; }
    }
  };

  window.SYNC = SYNC;
})();
