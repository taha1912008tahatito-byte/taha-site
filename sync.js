window.SYNC = (function(){
  const KEY = 'tj_cloud_blob_id';
  const CACHE = 'tj_cloud_cache';
  const BASE = 'https://jsonblob.com/api/jsonBlob';

  const S = {
    getBlobId(){ return localStorage.getItem(KEY) || ''; },
    setBlobId(id){ localStorage.setItem(KEY, id); },
    clearBlobId(){ localStorage.removeItem(KEY); },
    isReady(){ return !!this.getBlobId(); },

    async createBlob(data){
      const res = await fetch(BASE, {
        method: 'POST',
        headers: {'Content-Type':'application/json','Accept':'application/json'},
        body: JSON.stringify(data)
      });
      if(!res.ok) throw new Error('فشل الإنشاء: '+res.status);
      const loc = res.headers.get('Location') || res.headers.get('location');
      if(!loc) throw new Error('لم يتم إنشاء ID');
      const id = loc.split('/').pop();
      this.setBlobId(id);
      localStorage.setItem(CACHE, JSON.stringify(data));
      return id;
    },

    async updateBlob(data){
      const id = this.getBlobId();
      if(!id) return await this.createBlob(data);
      const res = await fetch(BASE+'/'+id, {
        method: 'PUT',
        headers: {'Content-Type':'application/json','Accept':'application/json'},
        body: JSON.stringify(data)
      });
      if(!res.ok){
        if(res.status === 404){
          this.clearBlobId();
          return await this.createBlob(data);
        }
        throw new Error('فشل التحديث: '+res.status);
      }
      localStorage.setItem(CACHE, JSON.stringify(data));
      return id;
    },

    async pull(){
      const id = this.getBlobId();
      if(!id) return null;
      try {
        const res = await fetch(BASE+'/'+id, {headers:{'Accept':'application/json'}});
        if(!res.ok) return null;
        return await res.json();
      } catch(e){ return null; }
    },

    async push(data){
      try {
        const id = await this.updateBlob(data);
        return id;
      } catch(e){
        console.warn('push err:', e);
        return null;
      }
    },

    async activate(data){
      const id = await this.createBlob(data);
      return {ok: true, id};
    },

    async connect(id){
      const res = await fetch(BASE+'/'+id, {headers:{'Accept':'application/json'}});
      if(!res.ok) throw new Error('الرابط غير صالح');
      const data = await res.json();
      this.setBlobId(id);
      return data;
    },

    getCache(){
      try { return JSON.parse(localStorage.getItem(CACHE) || 'null'); } catch { return null; }
    }
  };
  return S;
})();
