const SCHOOLS_URL = "./school.json";
const PROVISIONAL_IMAGE = "images/provisional-school.svg";
let allSchools = [];

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textOf(school) {
  const parts = [school.name, school.city, school.country, school.type, school.address, school.description,
    ...(school.programs || []), ...(school.diplomas || []), ...(school.levels || []),
    ...(school.admission || []), ...((school.feesByLevel || []).map(f => f.level))];
  return normalize(parts.join(" "));
}

function countryMatch(school, selected) {
  if (!selected) return true;
  const n = normalize(selected);
  if (["pas encore decide","autre pays","tous","all","other","undecided","je ne sais pas encore"].includes(n)) return true;
  const sc = normalize(school.country || "");
  const sa = normalize(school.address || "");
  return sc.includes(n) || n.includes(sc) || sa.includes(n);
}

function levelProfile(level) {
  const map = {
    college: { tags: ["college","6eme","5eme","4eme","3eme","cepe","bepc","secondaire","general"], note: "Profil collège : établissements secondaires et parcours préparatoires." },
    lycee: { tags: ["lycee","seconde","premiere","terminale","bac","baccalaureat","bts","dut","but","licence","prepa","post-bac"], note: "Profil lycée : formations post-bac et préparation aux études supérieures." },
    bac: { tags: ["bac","baccalaureat","licence","bachelor","bts","dut","but","prepa","grande ecole","ingenieur","medecine","droit","superieur"], note: "Profil baccalauréat : formations supérieures accessibles selon conditions d’admission." },
    superieur: { tags: ["master","mba","doctorat","phd","bac+3","bac+4","bac+5","specialise","ingenieur","licence","bachelor","formation continue"], note: "Profil études supérieures : poursuite d’études, spécialisation ou réorientation." },
    reconversion: { tags: ["formation continue","certificat","bts","licence","master","professionnel","executif","adulte","alternance","reconversion"], note: "Profil réorientation : vérifiez les passerelles, VAE, admissions parallèles et prérequis." }
  };
  return map[level] || { tags: [], note: "" };
}

function levelScore(school, level) {
  if (!level) return 0;
  const p = levelProfile(level); const t = textOf(school); let score = 0;
  p.tags.forEach(tag => { if (t.includes(normalize(tag))) score += 2; });
  return score;
}

function budgetScore(school, budget) {
  if (!budget || budget === "inconnu") return { score: 0, note: "" };
  const fees = Array.isArray(school.feesByLevel) ? school.feesByLevel : [];
  const hasPublished = fees.some(f => f && (f.verified === true || !(f.registrationFeeEstimate || f.tuitionFeeEstimate)) && (f.tuitionFee != null || f.registrationFee != null));
  const hasAny = fees.some(f => f && (f.tuitionFee != null || f.registrationFee != null));
  if (budget === "limite") {
    if (normalize(school.type).includes("public")) return { score: 4, note: "Établissement public : peut être plus accessible, à confirmer." };
    if (hasAny && !hasPublished) return { score: 1, note: "Tarifs estimatifs uniquement : à vérifier." };
    return { score: 0, note: "" };
  }
  if (budget === "known") return { score: hasPublished ? 4 : -1, note: hasPublished ? "Tarifs publiés/vérifiés disponibles." : "" };
  return { score: hasAny ? 1 : 0, note: "" };
}

function typeScore(school, prefType) { if (!prefType) return 0; return normalize(school.type) === normalize(prefType) ? 3 : 0; }

function fieldTerms(interest, specialty) {
  const map = {
    numerique: ["informatique","numerique","digital","developpement","logiciel","programmation","web","cybersecurite","reseau","systeme d information","intelligence artificielle","data","donnee","cloud","telecommunication","genie logiciel"],
    sante: ["medecine","sante","pharmacie","infirm","sage-femme","dentaire","odont","kine","biomedical","biologie","sante publique","nutrition","laboratoire","paramedical"],
    ingenierie: ["ingenieur","ingenierie","genie","mecanique","electrique","electronique","energie","civil","btp","industriel","robotique","automatisme","maintenance","materiaux"],
    commerce: ["commerce","gestion","management","marketing","finance","comptabilite","audit","banque","entrepreneuriat","ressources humaines","business","economie","logistique","supply chain","vente"],
    droit: ["droit","juridique","science politique","relation internationale","administration publique","notariat","justice","gouvernance"],
    education: ["education","enseignement","pedagogie","formation des enseignants","sciences de l education","professorat","didactique"],
    arts: ["art","design","graph","communication","journal","audiovisuel","cinema","musique","mode","architecture","urbanisme","culture","media","publicite"],
    environnement: ["environnement","agriculture","agronom","developpement durable","ecolog","eau","foret","climat","biodiversite","agroalimentaire","ressources naturelles"],
    tourisme: ["tourisme","hotellerie","restauration","voyage","loisir","hospitality"],
    transport: ["transport","logistique","supply chain","chaine d approvisionnement","mobilite","portuaire"],
    sciences: ["mathematique","physique","chimie","science","statistique","biologie","geologie"],
    langues: ["lettre","langue","linguistique","traduction","interpret","litterature","francais","anglais","civilisation"],
    social: ["sociolog","psycholog","histoire","geograph","anthropolog","philosoph","sciences humaines","sciences sociales","travail social"]
  };
  const base = map[interest] || [];
  const extra = normalize(specialty).split(/[,/;]|\s+/).map(s => s.trim()).filter(s => s.length >= 3);
  return [...new Set([...base, ...extra])].map(normalize);
}

function escapeHtml(v){ return String(v == null ? "" : v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function escapeAttr(v){ return escapeHtml(v).replace(/\x27/g,"&#39;"); }

function scoreSchool(school, ctx) {
  const level = ctx.level, interest = ctx.interest, specialty = ctx.specialty, country = ctx.country, budget = ctx.budget, prefType = ctx.prefType;
  if (!countryMatch(school, country)) return null;
  const t = textOf(school);
  const programsText = normalize((school.programs || []).join(" "));
  const terms = fieldTerms(interest, specialty);
  let fieldScore = 0; const matched = [];
  const isExploring = !interest || interest === "aucun" || terms.length === 0;
  if (!isExploring) {
    terms.forEach(term => {
      if (!term) return;
      if (programsText.includes(term)) { fieldScore += 6; matched.push(term); }
      else if (t.includes(term)) { fieldScore += 3; if (matched.length < 8) matched.push(term); }
    });
    if (specialty) {
      const spec = normalize(specialty);
      if (spec.length >= 3) {
        if (programsText.includes(spec)) fieldScore += 10;
        else if (t.includes(spec)) fieldScore += 5;
        else return null;
      }
    }
    if (fieldScore <= 0) return null;
  } else { fieldScore = 1; }
  const lScore = levelScore(school, level);
  const b = budgetScore(school, budget);
  const total = fieldScore + lScore + b.score + typeScore(school, prefType);
  return { school, total, fieldScore, lScore, matched: Array.from(new Set(matched)).slice(0,6), budgetNote: b.note, needsVerify: (level && lScore===0) || (school.verification && school.verification.verified===false) };
}

function formatFeeSummary(school) {
  const fees = Array.isArray(school.feesByLevel) ? school.feesByLevel : [];
  if (!fees.length) return "Tarifs non renseignés.";
  const first = fees.find(f => f && f.tuitionFee != null) || fees[0];
  const cur = first.currency || "devise locale";
  const est = (first.registrationFeeEstimate || first.tuitionFeeEstimate || first.verified === false);
  const val = first.tuitionFee != null ? Number(first.tuitionFee).toLocaleString("fr-FR") + " " + cur : "à confirmer";
  return (est ? "Estimation indicative : " : "Scolarité : ") + val + " — à vérifier.";
}

function buildReason(r, ctx) {
  const reasons = [];
  if (r.matched.length) reasons.push("Formations/données en lien : " + r.matched.slice(0,4).join(", ") + ".");
  else if (ctx.interest && ctx.interest !== "aucun") reasons.push("Correspondance trouvée dans les informations de l\u2019établissement.");
  if (ctx.specialty) reasons.push("Spécialité recherchée prise en compte : \u00AB " + ctx.specialty + " \u00BB.");
  if (r.lScore > 0) reasons.push("Profil de niveau compatible selon les informations disponibles.");
  else if (ctx.level) reasons.push("Compatibilité avec le niveau : à vérifier auprès de l\u2019établissement.");
  if (r.budgetNote) reasons.push(r.budgetNote);
  if (r.needsVerify) reasons.push("Informations à confirmer auprès de l\u2019établissement.");
  return reasons.join(" ");
}

function createCard(result, ctx) {
  const school = result.school;
  const card = document.createElement("article");
  card.className = "school-card orientation-school-card";
  const imgSrc = school.displayImage || school.image || PROVISIONAL_IMAGE;
  const programs = ((school.programs || []).slice(0,3).join(" ; ")) || "À vérifier";
  const meta = [school.city, school.country].filter(Boolean).join(" · ") + " · " + (school.type || "Type à confirmer");
  const site = school.website ? '<a class="mini-link" href="' + escapeAttr(school.website) + '" target="_blank" rel="noopener noreferrer">Site officiel</a>' : "";
  card.innerHTML = '<img class="school-card-image" src="' + escapeAttr(imgSrc) + '" alt="' + escapeAttr(school.name) + '" loading="lazy" onerror="this.onerror=null;this.src=\'' + PROVISIONAL_IMAGE + '\';">'
    + '<div class="school-card-body">'
    + '<h3>' + escapeHtml(school.name) + '</h3>'
    + '<p class="school-meta">' + escapeHtml(meta) + '</p>'
    + '<p class="school-programs"><strong>Formations :</strong> ' + escapeHtml(programs) + '</p>'
    + '<p class="school-fee-summary">' + escapeHtml(formatFeeSummary(school)) + '</p>'
    + '<p class="school-reason"><strong>Pourquoi cette suggestion :</strong> ' + escapeHtml(buildReason(result, ctx)) + '</p>'
    + '<div class="school-card-actions">' + site + '</div></div>';
  return card;
}

function renderGuide(interest){
  const guides = {
    numerique:["Numérique","Explore informatique, cybersécurité, data, réseaux et systèmes d’information.","Compétences : logique, résolution de problèmes, curiosité technique."],
    sante:["Santé","Explore médecine, pharmacie, soins infirmiers, biologie et santé publique.","Vérifie les concours, quotas et conditions propres à chaque pays."],
    ingenierie:["Ingénierie","Explore génie civil, mécanique, électrique, industriel, énergie et BTP.","Compétences : mathématiques, sciences, méthode et rigueur."],
    commerce:["Commerce & gestion","Explore gestion, finance, comptabilité, audit, marketing et entrepreneuriat.","Vérifie diplômes visés, accréditations et débouchés."],
    droit:["Droit & politique","Explore droit, sciences politiques, relations internationales et administration.","Vérifie les conditions d’accès aux professions réglementées."],
    education:["Éducation","Explore enseignement, pédagogie et sciences de l’éducation.","Les parcours varient selon les systèmes nationaux."],
    arts:["Arts & communication","Explore design, communication, journalisme, audiovisuel et architecture.","Vérifie portfolios, concours ou épreuves spécifiques."],
    environnement:["Environnement & agriculture","Explore agronomie, écologie, ressources naturelles et développement durable.",""],
    tourisme:["Tourisme & hôtellerie","Explore hôtellerie, restauration, tourisme et gestion de services.",""],
    transport:["Transport & logistique","Explore logistique, supply chain, transport et mobilité.",""],
    sciences:["Sciences & mathématiques","Explore mathématiques, physique, chimie, biologie et statistiques.",""],
    langues:["Lettres & langues","Explore langues, traduction, littérature et communication interculturelle.",""],
    social:["Sciences humaines & sociales","Explore psychologie, sociologie, histoire, géographie et travail social.",""]
  };
  return guides[interest] || null;
}

async function loadSchools(){
  try {
    const res = await fetch(SCHOOLS_URL, { cache: "no-store" });
    if(!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    allSchools = Array.isArray(data) ? data : [];
  } catch(e){ console.error("Chargement school.json", e); allSchools = []; }
}

function populateCountries(){
  const sel = document.getElementById("studyCountry"); if(!sel) return;
  const keep = new Set(Array.from(sel.options).map(o=>normalize(o.value)).filter(Boolean));
  const countries = Array.from(new Set(allSchools.map(s=>s.country).filter(Boolean))).sort((a,b)=>a.localeCompare(b,"fr"));
  countries.forEach(c=>{ if(!keep.has(normalize(c))){ const o=document.createElement("option"); o.value=c; o.textContent=c; sel.appendChild(o); } });
}

document.addEventListener("DOMContentLoaded", async function () {
  const form = document.getElementById("orientationForm");
  const results = document.getElementById("orientationResults");
  const summary = document.getElementById("orientationSummary");
  const suggestions = document.getElementById("orientationSuggestions");
  const edit = document.getElementById("editOrientation");
  if(!form) return;
  await loadSchools(); populateCountries();
  form.addEventListener("reset", function () { if(results) results.hidden = true; if(suggestions) suggestions.innerHTML=""; });
  if(edit) edit.addEventListener("click", function () { if(results) results.hidden=true; form.scrollIntoView({behavior:"smooth"}); });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const ctx = {
      level: (document.getElementById("studyLevel") || {}).value || "",
      interest: (document.getElementById("interest") || {}).value || "",
      specialty: (document.getElementById("specialty") || {}).value || "",
      country: (document.getElementById("studyCountry") || {}).value || "",
      budget: (document.getElementById("budget") || {}).value || "",
      prefType: (document.getElementById("institutionType") || {}).value || ""
    };
    suggestions.innerHTML = "";
    const scored = allSchools.map(function (s) { return scoreSchool(s,ctx); }).filter(Boolean).sort(function (a,b) { return b.total-a.total || (b.fieldScore-a.fieldScore) || a.school.name.localeCompare(b.school.name,"fr"); });
    const lp = levelProfile(ctx.level);
    const guide = renderGuide(ctx.interest);
    let summaryText = (lp.note ? lp.note + " " : "") + "Pays sélectionné : " + (ctx.country || "non précisé") + ". ";
    summaryText += scored.length ? (scored.length + " établissement(s) correspondent aux critères disponibles dans la base actuelle.") : "Aucun établissement ne correspond précisément aux critères dans la base actuelle. Cela ne signifie pas qu\u2019il n\u2019en existe pas : élargis le pays, la spécialité ou vérifie l\u2019orthographe.";
    summary.textContent = summaryText;
    if (guide) {
      const g = document.createElement("section"); g.className = "orientation-guide";
      g.innerHTML = "<h3>" + escapeHtml(guide[0]) + "</h3><p>" + escapeHtml(guide[1]) + "</p>" + (guide[2] ? "<p>" + escapeHtml(guide[2]) + "</p>" : "") + "<p><em>La recommandation d\u2019établissements ci-dessous se base uniquement sur les formations réellement enregistrées dans la base de données.</em></p>";
      suggestions.appendChild(g);
    }
    if (ctx.specialty) {
      const n=document.createElement("p"); n.className="orientation-specialty-note"; n.innerHTML="<strong>Spécialité recherchée :</strong> " + escapeHtml(ctx.specialty) + ". Les établissements sans correspondance explicite ont été exclus.";
      suggestions.appendChild(n);
    }
    const top = scored.slice(0, 24);
    if (!top.length) {
      const empty=document.createElement("div"); empty.className="empty-state"; empty.innerHTML="<p>Aucun résultat fiable avec ces critères. Essaie un autre pays, un domaine plus large ou retire la spécialité. Si des données manquent, la mention \u00AB À vérifier auprès de l\u2019établissement \u00BB s\u2019applique.</p>";
      suggestions.appendChild(empty);
    } else { top.forEach(function (r) { suggestions.appendChild(createCard(r,ctx)); }); }
    const link=document.querySelector(".orientation-link");
    if(link){
      const params=new URLSearchParams({orientation:"true", interest:ctx.interest||"", specialty:ctx.specialty||"", country:ctx.country||"", level:ctx.level||"", budget:ctx.budget||"", type:ctx.prefType||""});
      if(scored.length) params.set("schoolIds", scored.map(function (r) { return r.school.id; }).join(","));
      link.href="index.html?" + params.toString() + "#ecoles";
    }
    results.hidden = false; results.scrollIntoView({behavior:"smooth", block:"start"});
  });
});
