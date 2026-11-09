const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const messages = document.getElementById('messages');
const sendButton = document.getElementById('send-button');
const suggestions = document.getElementById('suggestions');
const statusLine = document.getElementById('assistant-status');
const cfg = window.EDUORIENT_CONFIG || {};
const API_URL = cfg.ASSISTANT_API_URL || '';
const conversationHistory = [];
let catalog = [];

function L(){ return (window.EduOrientLanguage && window.EduOrientLanguage.getLanguage && window.EduOrientLanguage.getLanguage()) || document.documentElement.lang || 'fr'; }
function T(key, fallback){ if (window.EduOrientLanguage && window.EduOrientLanguage.t) { const v = window.EduOrientLanguage.t(key); if (v && v !== key) return v; } return fallback; }
function esc(v){ return (window.EduOrientCore && window.EduOrientCore.escapeHtml ? window.EduOrientCore.escapeHtml(v) : String(v||'')); }

function addMessage(text, sender, html){
  const article = document.createElement('article');
  article.className = 'message ' + (sender === 'user' ? 'user-message' : 'assistant-message');
  if (sender !== 'user') { const avatar = document.createElement('div'); avatar.className = 'message-avatar'; avatar.textContent = 'E'; article.appendChild(avatar); }
  const content = document.createElement('div'); content.className = 'message-content';
  if (html) content.innerHTML = html; else content.textContent = text;
  article.appendChild(content); messages.appendChild(article); messages.scrollTop = messages.scrollHeight; return content;
}

function renderSources(sources){
  if (!sources || !sources.length) return '';
  const items = sources.map(s=>'<li><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title||s.url)+'</a>'+(s.checked?'<span class="source-date"> — '+esc(s.checked)+'</span>':'')+(s.snippet?'<div class="source-snippet">'+esc(s.snippet)+'</div>':'')+'</li>').join('');
  return '<div class="assistant-sources"><strong>'+esc(T('sourcesTitle', L()==='en'?'Sources':'Sources'))+'</strong><ul>'+items+'</ul></div>';
}

function renderCards(list, lang){
  if (!list || !list.length) return '';
  const C = window.EduOrientCore;
  return '<div class="assistant-cards">' + list.slice(0,6).map(s=>{
    const img = C ? C.displayImage(s) : ((s.displayImage||s.image||'').toString().trim());
    const safeImg = img && !/provisional|placeholder|generic/i.test(img) ? img : '';
    const fee = C ? C.feeSummary(s, lang) : '';
    const programs = (s.programs||[]).slice(0,3).join('; ');
    const site = s.website ? '<a href="'+esc(s.website)+'" target="_blank" rel="noopener noreferrer">'+esc(T('officialSite', lang==='en'?'Official website':'Site officiel'))+'</a>' : '';
    const imgHtml = safeImg ? '<img src="'+esc(safeImg)+'" alt="" loading="lazy" onerror="this.remove();this.closest(\'.assistant-card\')?.classList.add(\'no-image\')">' : '';
    return '<article class="assistant-card'+(safeImg?'':' no-image')+'">'+imgHtml+'<div><h4>'+esc(s.name)+'</h4><p>'+esc([s.city,s.country].filter(Boolean).join(', '))+' · '+esc(s.type||'')+'</p><p><strong>'+esc(T('programsLabel', lang==='en'?'Programs':'Formations'))+':</strong> '+esc(programs||T('toConfirm','À confirmer'))+'</p><p><strong>'+esc(T('feesLabel', lang==='en'?'Fees':'Frais'))+':</strong> '+esc(fee)+'</p><p><strong>'+esc(T('whyMatch', lang==='en'?'Why':'Pourquoi'))+':</strong> '+esc(T('catalogMatch', lang==='en'?'Matched from real catalog data.':'Correspondance basée sur les données réelles du catalogue.'))+'</p><p class="assistant-card-actions">'+site+' <a href="index.html?search='+encodeURIComponent(s.name)+'#ecoles">'+esc(T('viewCatalog', lang==='en'?'View in catalog':'Voir dans le catalogue'))+'</a></p></div></article>';
  }).join('') + '</div>';
}

function localAnswer(message, lang){
  const C = window.EduOrientCore;
  if (!C || !catalog.length) return { text: T('catalogUnavailable', lang==='en'?'The catalog is not available yet. Please try again.':'Le catalogue n’est pas encore disponible. Réessaie.'), cards:[] };
  const found = C.pickRelevant(catalog, message, 6);
  const intro = found.length
    ? (lang==='en' ? 'Here are relevant institutions from the current EduOrient catalog ('+catalog.length+' schools total). Verify fees, admissions, and deadlines with each institution.' : 'Voici des établissements pertinents issus du catalogue EduOrient actuel ('+catalog.length+' établissements au total). Vérifie les frais, admissions et dates limites auprès de chaque établissement.')
    : (lang==='en' ? 'I could not find a precise catalog match. Try a country, city, field, diploma, or institution name. Missing information must be confirmed with the institution.' : 'Je ne trouve pas de correspondance précise dans le catalogue. Essaie un pays, une ville, un domaine, un diplôme ou un nom d’établissement. Les informations manquantes doivent être confirmées auprès de l’établissement.');
  return { text:intro, cards:found };
}

async function askBackend(message, lang){
  if (!API_URL) return null;
  const relevant = (window.EduOrientCore ? window.EduOrientCore.pickRelevant(catalog, message, 12) : catalog.slice(0,12)).map(s=>({id:s.id,name:s.name,country:s.country,city:s.city,type:s.type,website:s.website,programs:(s.programs||[]).slice(0,8),diplomas:(s.diplomas||[]).slice(0,8),admission:(s.admission||[]).slice(0,4),feesByLevel:(s.feesByLevel||[]).slice(0,3)}));
  const ctrl = new AbortController(); const t = setTimeout(()=>ctrl.abort(), Number(cfg.ASSISTANT_TIMEOUT_MS||25000));
  try {
    const r = await fetch(API_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ message, language: lang, history: conversationHistory.slice(-8), catalog: relevant }), signal: ctrl.signal });
    const data = await r.json().catch(()=>({}));
    if (!r.ok) return { error: data.error || 'backend-error' };
    return data;
  } catch(e){ return { error: e.name==='AbortError'?'timeout':'network' }; }
  finally { clearTimeout(t); }
}

async function sendMessage(text){
  const message = String(text||'').trim(); if (!message || sendButton.disabled) return;
  const lang = L();
  addMessage(message, 'user');
  messageInput.value = ''; sendButton.disabled = true; messageInput.disabled = true; if (suggestions) suggestions.hidden = true;
  const loading = addMessage('', 'assistant');
  loading.textContent = T('thinking', lang==='en'?'Thinking...':'Je réfléchis...');
  try {
    const backend = await askBackend(message, lang);
    if (backend && backend.reply && !backend.error && backend.mode !== 'not-configured') {
      loading.innerHTML = esc(backend.reply).replace(/\n/g,'<br>') + renderSources(backend.sources); 
      if (statusLine) statusLine.textContent = backend.mode==='ai+web' ? T('statusAiWeb', lang==='en'?'Secure AI backend + web search response. Verify external information.':'Réponse via backend IA sécurisé + recherche web. Vérifie les informations externes.') : T('statusAi', lang==='en'?'Secure AI backend response.':'Réponse via backend IA sécurisé.');
      conversationHistory.push({role:'user',content:message},{role:'assistant',content:backend.reply}); conversationHistory.splice(0, Math.max(0, conversationHistory.length-12));
      return;
    }
    const local = localAnswer(message, lang);
    loading.innerHTML = esc(local.text).replace(/\n/g,'<br>') + renderCards(local.cards, lang); 
    if (backend && backend.error) {
      const note = lang==='en' ? 'Secure backend unavailable ('+backend.error+'); showing local catalog results.' : 'Backend sécurisé indisponible ('+backend.error+') ; affichage des résultats du catalogue local.';
      loading.innerHTML += '<p class="assistant-note">'+esc(note)+'</p>';
    } else if (backend && backend.mode==='not-configured') {
      loading.innerHTML += '<p class="assistant-note">'+esc(T('backendNotConfigured', lang==='en'?'AI backend is not configured with secrets yet; local catalog mode is active.':'Le backend IA n’est pas encore configuré avec des secrets ; mode catalogue local actif.'))+'</p>';
    }
    if (statusLine) statusLine.textContent = T('statusLocal', lang==='en'?'Local catalog mode: uses all schools loaded from school.json. No secrets are exposed in the browser.':'Mode catalogue local : utilise toutes les écoles chargées depuis school.json. Aucun secret n’est exposé dans le navigateur.');
    conversationHistory.push({role:'user',content:message},{role:'assistant',content:local.text}); conversationHistory.splice(0, Math.max(0, conversationHistory.length-12));
  } finally {
    sendButton.disabled = false; messageInput.disabled = false; messageInput.focus(); messages.scrollTop = messages.scrollHeight;
  }
}

if (chatForm) chatForm.addEventListener('submit', e=>{ e.preventDefault(); sendMessage(messageInput.value); });
if (suggestions) suggestions.addEventListener('click', e=>{ const b=e.target.closest('button[data-question-fr],button[data-question-en]'); if(!b) return; const q = L()==='en' ? b.dataset.questionEn : b.dataset.questionFr; if(q) sendMessage(q); });
if (messageInput) messageInput.addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); chatForm.requestSubmit(); } });

(async function init(){
  if (window.EduOrientCore) catalog = await window.EduOrientCore.loadSchools();
  if (statusLine) statusLine.textContent = T('statusLocal', L()==='en'?'Local catalog mode ready ('+catalog.length+' schools).':'Mode catalogue local prêt ('+catalog.length+' établissements).');
})();
