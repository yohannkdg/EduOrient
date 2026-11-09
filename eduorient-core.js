(function(){
  const CORE = window.EduOrientCore = window.EduOrientCore || {};
  CORE.SCHOOLS_URL = './school.json';
  CORE.PROVISIONAL_IMAGE = '';
  CORE._schools = null;
  CORE._promise = null;

  CORE.normalize = function(v){
    return String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9+\s]/g,' ').replace(/\s+/g,' ').trim();
  };
  CORE.tokens = function(v){ return CORE.normalize(v).split(' ').filter(Boolean); };
  CORE.escapeHtml = function(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  CORE.escapeAttr = function(v){ return CORE.escapeHtml(v).replace(/'/g,'&#39;'); };
  CORE.lang = function(){ return (window.EduOrientLanguage && window.EduOrientLanguage.getLanguage && window.EduOrientLanguage.getLanguage()) || document.documentElement.lang || 'fr'; };
  CORE.t = function(key, fallback){
    if (window.EduOrientLanguage && window.EduOrientLanguage.t) { const v = window.EduOrientLanguage.t(key); if (v && v !== key) return v; }
    return fallback || key;
  };

  CORE.loadSchools = async function(force){
    if (CORE._schools && !force) return CORE._schools;
    if (CORE._promise && !force) return CORE._promise;
    CORE._promise = fetch(CORE.SCHOOLS_URL, {cache:'no-store'}).then(r=>{ if(!r.ok) throw new Error('school.json '+r.status); return r.json(); }).then(data=>{ CORE._schools = Array.isArray(data)?data:[]; return CORE._schools; }).catch(e=>{ console.error(e); CORE._schools=[]; return []; }).finally(()=>{ CORE._promise=null; });
    return CORE._promise;
  };

  CORE.schoolText = function(s){
    const fees=(s.feesByLevel||[]).map(f=>[f.level,f.currency,f.period,f.source].join(' '));
    return [s.name,s.city,s.country,s.type,s.address,s.description,s.website,s.imageSource,s.imageStatus,(s.programs||[]).join(' '),(s.diplomas||[]).join(' '),(s.admission||[]).join(' '),fees.join(' ')].join(' ');
  };

  CORE.displayImage = function(s){
    if (!s) return '';
    const c = [s.displayImage,s.image,s.imageUrl,s.photo].find(v=>typeof v==='string' && v.trim() && !/placeholder|provisional|generic/i.test(v));
    return c || '';
  };

  CORE.imageStatus = function(s){
    if (!s) return {displayed:false, label:'', className:'', unverified:false, historical:false};
    const src = CORE.displayImage(s);
    if (!src) return {displayed:false, label:'Sans photo vérifiée', className:'image-status-missing', unverified:false, historical:false};
    const txt = ((s.imageStatus||'')+' '+JSON.stringify(s.imageResearch||{})+' '+JSON.stringify((s.verification&&s.verification.image)||{})).toLowerCase();
    const unverified = /non vérifiée|non verifiee|à vérifier|a verifier|droits|licence|source à confirmer|catalogue existant|correspondance/i.test(txt) || s.imageVerified===false;
    const historical = !!s.imageHistorical;
    if (unverified || historical) return {displayed:true, label:'', className:'image-status-unverified', unverified:true, historical};
    return {displayed:true, label:'Photo', className:'image-status-ok', unverified:false, historical};
  };
  CORE.imageStatusHtml = function(s){
    const st = CORE.imageStatus(s);
    if (!st.displayed || !st.label) return '';
    return '<p class="image-status '+CORE.escapeAttr(st.className)+'" title="'+CORE.escapeAttr(String((s&&s.imageSource)||'Photo historique — source ou droits à vérifier'))+'">'+CORE.escapeHtml(st.label)+'</p>';
  };

  CORE.feeSummary = function(s, lang){
    lang = lang || CORE.lang();
    const fees = Array.isArray(s.feesByLevel)?s.feesByLevel:[];
    if (!fees.length) return lang==='en'?'Fees not provided — to be confirmed with the institution.':'Tarifs non renseignés — à confirmer auprès de l’établissement.';
    const f = fees.find(x=>x && x.tuitionFee!=null) || fees[0];
    const cur = f.currency || '';
    const est = f.registrationFeeEstimate || f.tuitionFeeEstimate || f.verified === false;
    const val = f.tuitionFee!=null ? Number(f.tuitionFee).toLocaleString(lang==='en'?'en-US':'fr-FR') + (cur?(' '+cur):'') : (lang==='en'?'to be confirmed':'à confirmer');
    if (lang==='en') return (est?'Indicative estimate: ':'Tuition: ') + val + ' — to be confirmed.';
    return (est?'Estimation indicative : ':'Scolarité : ') + val + ' — à vérifier.';
  };

  function lev(a,b){ if(a===b) return 0; if(!a.length) return b.length; if(!b.length) return a.length; const m=[]; for(let i=0;i<=b.length;i++) m[i]=[i]; for(let j=0;j<=a.length;j++) m[0][j]=j; for(let i=1;i<=b.length;i++) for(let j=1;j<=a.length;j++) m[i][j]=b[i-1]===a[j-1]?m[i-1][j-1]:Math.min(m[i-1][j-1]+1,m[i][j-1]+1,m[i-1][j]+1); return m[b.length][a.length]; }
  CORE.matchScore = function(query, s){
    const qn = CORE.normalize(query); if (!qn) return 0;
    const qt = CORE.tokens(qn); if (!qt.length) return 0;
    const text = CORE.normalize(CORE.schoolText(s));
    const name = CORE.normalize(s.name), city = CORE.normalize(s.city), country = CORE.normalize(s.country), type = CORE.normalize(s.type);
    const programs = CORE.normalize((s.programs||[]).join(' ')), diplomas = CORE.normalize((s.diplomas||[]).join(' '));
    let score = 0, matched = 0;
    if (text.includes(qn) || name.includes(qn)) score += 18;
    for (const t of qt){
      let hit = 0;
      if (name.includes(t)) hit = Math.max(hit, 10);
      if (programs.includes(t)) hit = Math.max(hit, 9);
      if (diplomas.includes(t)) hit = Math.max(hit, 7);
      if (city.includes(t) || country.includes(t)) hit = Math.max(hit, 8);
      if (type.includes(t)) hit = Math.max(hit, 4);
      if (!hit && text.includes(t)) hit = 5;
      if (!hit && t.length>=4){
        const words = text.split(' ');
        for (const w of words){ if (!w) continue; if (w.startsWith(t) || t.startsWith(w)) { hit=4; break; } if (Math.abs(w.length-t.length)<=2 && lev(w,t)<=1) { hit=3; break; } }
      }
      if (hit){ score += hit; matched++; }
    }
    if (matched === qt.length) score += 12; else if (matched>0) score += matched;
    return score;
  };

  CORE.search = function(schools, opts){
    opts = opts || {};
    const q = String(opts.query||'').trim();
    const field = String(opts.field||'').trim();
    const combined = [q, field].filter(Boolean).join(' ');
    let list = (schools||[]).filter(s=>{
      if (opts.country && String(s.country||'') !== opts.country) return false;
      if (opts.city && String(s.city||'') !== opts.city) return false;
      if (opts.diploma && !(s.diplomas||[]).includes(opts.diploma)) return false;
      if (opts.type && String(s.type||'') !== opts.type) return false;
      if (opts.budgetKnownOnly) { const fees=s.feesByLevel||[]; const has=fees.some(f=>f && f.verified===true && !(f.registrationFeeEstimate||f.tuitionFeeEstimate) && (f.tuitionFee!=null||f.registrationFee!=null)); if (!has) return false; }
      if (opts.budgetMax) { const fees=s.feesByLevel||[]; const vals=fees.map(f=>Number(f&&f.tuitionFee)).filter(n=>Number.isFinite(n)&&n>0); if (!vals.length || Math.min.apply(null,vals) > Number(opts.budgetMax)) return false; }
      if (opts.onlyIds && opts.onlyIds.length) return opts.onlyIds.includes(Number(s.id));
      return true;
    });
    if (combined) {
      const scored = list.map(s=>({s,score:CORE.matchScore(combined,s)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score || String(a.s.name).localeCompare(String(b.s.name)));
      list = scored.map(x=>x.s);
    } else {
      list = list.slice().sort((a,b)=>String(a.name).localeCompare(String(b.name)));
    }
    return list;
  };

  CORE.pickRelevant = function(schools, question, limit){
    limit = limit || 12;
    const scored = (schools||[]).map(s=>({s,score:CORE.matchScore(question,s)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,limit);
    return scored.length ? scored.map(x=>x.s) : (schools||[]).slice(0, Math.min(limit,8));
  };
})();
