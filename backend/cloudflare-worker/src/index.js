const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };
const limits = new Map();

function cors(env, request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s=>s.trim()).filter(Boolean);
  const ok = !origin || allowed.includes(origin) || allowed.includes('*');
  const h = {
    'Access-Control-Allow-Methods': 'POST,GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
  if (ok && origin) h['Access-Control-Allow-Origin'] = origin;
  return { ok, headers: h };
}
function json(data, status, extra) { return new Response(JSON.stringify(data), { status: status||200, headers: Object.assign({}, JSON_HEADERS, extra||{}) }); }
function rateLimit(env, request) {
  const n = Math.max(1, Number(env.RATE_LIMIT_PER_MINUTE || 12));
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'anon';
  const key = ip + ':' + Math.floor(Date.now()/60000);
  const c = (limits.get(key) || 0) + 1; limits.set(key, c);
  if (limits.size > 5000) for (const k of limits.keys()) if (!k.endsWith(':' + Math.floor(Date.now()/60000))) limits.delete(k);
  return c <= n;
}
function sanitizeText(v, max){ return String(v==null?'':v).replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max||2000); }
function pickCatalog(catalog){
  if (!Array.isArray(catalog)) return [];
  return catalog.slice(0, 20).map(function(s){ return {
    id:s.id, name:s.name, country:s.country, city:s.city, type:s.type, website:s.website,
    programs:(s.programs||[]).slice(0,8), diplomas:(s.diplomas||[]).slice(0,8),
    admission:(s.admission||[]).slice(0,4), feesByLevel:(s.feesByLevel||[]).slice(0,3)
  };});
}
async function webSearch(env, query){
  var provider = String(env.SEARCH_PROVIDER||'none');
  var key = env.SEARCH_PROVIDER_API_KEY;
  if (!key || provider==='none') return { sources: [], warning: 'web-search-not-configured' };
  var checked = new Date().toISOString().slice(0,10);
  try {
    if (provider==='tavily') {
      var r = await fetch('https://api.tavily.com/search', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ api_key:key, query:query, max_results:4 }) });
      if (!r.ok) return { sources:[], warning:'web-search-error' };
      var d = await r.json();
      return { sources:(d.results||[]).map(function(x){ return {title:x.title,url:x.url,snippet:String(x.content||'').slice(0,220),checked:checked}; }) };
    }
    if (provider==='brave') {
      var r2 = await fetch('https://api.search.brave.com/res/v1/web/search?q='+encodeURIComponent(query)+'&count=4', { headers:{'X-Subscription-Token':key,'Accept':'application/json'} });
      if (!r2.ok) return { sources:[], warning:'web-search-error' };
      var d2 = await r2.json(); var items = (((d2.web||{}).results)||[]);
      return { sources:items.map(function(x){ return {title:x.title,url:x.url,snippet:String(x.description||'').slice(0,220),checked:checked}; }) };
    }
    if (provider==='serper') {
      var r3 = await fetch('https://google.serper.dev/search', { method:'POST', headers:{'X-API-KEY':key,'content-type':'application/json'}, body: JSON.stringify({ q: query, num: 4 }) });
      if (!r3.ok) return { sources:[], warning:'web-search-error' };
      var d3 = await r3.json();
      return { sources:(d3.organic||[]).map(function(x){ return {title:x.title,url:x.link,snippet:String(x.snippet||'').slice(0,220),checked:checked}; }) };
    }
  } catch(e){ return { sources:[], warning:'web-search-error' }; }
  return { sources:[], warning:'web-search-provider-unsupported' };
}
async function callAI(env, system, user){
  var provider = String(env.AI_PROVIDER||'none');
  var key = env.AI_PROVIDER_API_KEY;
  if (!key || provider==='none') return null;
  if (provider==='anthropic') {
    var r = await fetch('https://api.anthropic.com/v1/messages', { method:'POST', headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'}, body: JSON.stringify({ model: env.AI_MODEL||'claude-3-5-haiku-latest', max_tokens: 900, system: system, messages:[{role:'user', content:user}] }) });
    if (!r.ok) throw new Error('ai-error');
    var d = await r.json(); return (d.content||[]).map(function(x){return x.text||'';}).join('\n').trim();
  }
  var base = String(env.AI_BASE_URL||'https://api.openai.com/v1').replace(/\/$/,'');
  var r2 = await fetch(base + '/chat/completions', { method:'POST', headers:{'content-type':'application/json','Authorization':'Bearer '+key}, body: JSON.stringify({ model: env.AI_MODEL||'gpt-4o-mini', temperature:0.2, messages:[{role:'system',content:system},{role:'user',content:user}] }) });
  if (!r2.ok) throw new Error('ai-error');
  var d2 = await r2.json(); return (((d2.choices||[])[0]||{}).message||{}).content || '';
}
export default {
  async fetch(request, env) {
    var c = cors(env, request);
    if (request.method === 'OPTIONS') return new Response(null, { status: c.ok?204:403, headers: c.headers });
    if (!c.ok) return json({ error:'origin-not-allowed' }, 403, c.headers);
    var url = new URL(request.url);
    if (url.pathname === '/api/health') return json({ ok:true, aiConfigured: !!env.AI_PROVIDER_API_KEY && env.AI_PROVIDER!=='none', searchConfigured: !!env.SEARCH_PROVIDER_API_KEY && env.SEARCH_PROVIDER!=='none' }, 200, c.headers);
    if (url.pathname !== '/api/chat' || request.method !== 'POST') return json({ error:'not-found' }, 404, c.headers);
    if (!rateLimit(env, request)) return json({ error:'rate-limited' }, 429, c.headers);
    var body; try { body = await request.json(); } catch(e) { return json({ error:'invalid-json' }, 400, c.headers); }
    var message = sanitizeText(body.message, 2000);
    if (!message) return json({ error:'message-required' }, 400, c.headers);
    var language = ['fr','en'].indexOf(body.language) >= 0 ? body.language : 'fr';
    var history = Array.isArray(body.history) ? body.history.slice(-8).map(function(m){ return {role:m.role==='assistant'?'assistant':'user',content:sanitizeText(m.content,1200)}; }).filter(function(m){return m.content;}) : [];
    var catalog = pickCatalog(body.catalog);
    var profile = body.profile && typeof body.profile==='object' ? body.profile : null;
    var wantWeb = /date|deadline|bourse|scholarship|admission|apply|frais|tuition|fee|concours|actualité|news|current|2026|2027/i.test(message);
    var search = wantWeb ? await webSearch(env, message + ' official') : { sources:[], warning:null };
    var system = "You are EduOrient's guidance assistant. Answer in " + (language==='en'?'English':'French') + ". Use only provided catalog data and cited web sources. Never invent fees, diplomas, deadlines, admission requirements, scholarships, or accreditation. If information is missing or unverified, say \u00AB \u00C0 confirmer aupr\u00E8s de l'\u00E9tablissement \u00BB in French or \"To be confirmed with the institution\" in English. Distinguish catalog facts from external sources. Be concise and structured.";
    var user = JSON.stringify({ message: message, profile: profile, catalog: catalog, history: history, webSources: search.sources });
    var reply = null, mode = 'not-configured';
    try { reply = await callAI(env, system, user); if (reply) mode = search.sources.length ? 'ai+web' : 'ai'; } catch(e) {}
    if (!reply) {
      reply = language==='en'
        ? 'The secure AI backend is not configured yet. I can still use the local EduOrient catalog: ask for a country, field, diploma, budget, or institution name. Fees, admissions and deadlines must be confirmed with each institution.'
        : "Le backend IA s\u00E9curis\u00E9 n'est pas encore configur\u00E9. Je peux quand m\u00EAme utiliser le catalogue local EduOrient : demande un pays, un domaine, un dipl\u00F4me, un budget ou un nom d'\u00E9tablissement. Frais, admissions et dates limites doivent \u00EAtre confirm\u00E9s aupr\u00E8s de chaque \u00E9tablissement.";
    }
    var warnings = []; if (search.warning) warnings.push(search.warning);
    return json({ reply: reply, sources: search.sources, mode: mode, warnings: warnings }, 200, c.headers);
  }
};
