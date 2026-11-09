(function () {
  "use strict";
  var SCHOOLS_URL = "./school.json";
  var allSchools = [];
  var OD = function () { return window.OrientationData || {}; };

  function getSchoolImage(school) {
    if (!school) return "";
    var core = window.EduOrientCore;
    if (core && typeof core.displayImage === "function") return core.displayImage(school) || "";
    var img = String((school.displayImage || school.image || "")).trim();
    if (!img || /provisional|placeholder|generic/i.test(img)) return "";
    return img;
  }
  function normalize(value) {
    var core = window.EduOrientCore;
    if (core && typeof core.normalize === "function") return core.normalize(value);
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9+\s]/g, " ").replace(/\s+/g, " ").trim();
  }
  function esc(v) { return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function attr(v) { return esc(v).replace(/'/g, "&#39;"); }
  function uniq(arr) { var s = {}; var out = []; (arr || []).forEach(function (x) { var k = normalize(x); if (k && !s[k]) { s[k] = true; out.push(x); } }); return out; }
  function setBlock(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html || ""; }
  function details(title, body, open) { return '<details class="ori-details"' + (open ? ' open' : '') + '><summary>' + esc(title) + '</summary><div class="ori-details-body">' + body + '</div></details>'; }

  function textOf(school) {
    var parts = [school.name, school.city, school.country, school.type, school.address, school.description, school.website];
    (school.programs || []).forEach(function (p) { parts.push(p); });
    (school.diplomas || []).forEach(function (p) { parts.push(p); });
    (school.admission || []).forEach(function (p) { parts.push(p); });
    (school.feesByLevel || []).forEach(function (f) { if (f) parts.push(f.level, f.period); });
    return normalize(parts.join(" "));
  }
  function programsText(school) { return normalize((school.programs || []).join(" | ")); }
  function diplomasText(school) { return normalize((school.diplomas || []).join(" | ")); }
  function isUndecided(v) {
    var n = normalize(v);
    return !n || ["pas encore decide", "je ne sais pas encore", "je ne sais pas", "autre pays", "tous", "all", "other", "undecided", "aucun", "explorer", "je veux explorer plusieurs domaines", "public ou prive je ne sais pas"].indexOf(n) >= 0;
  }
  function countryMatch(school, selected) {
    if (isUndecided(selected)) return true;
    var n = normalize(selected); var sc = normalize(school.country || ""); var sa = normalize(school.address || "");
    return !!sc && (sc.indexOf(n) >= 0 || n.indexOf(sc) >= 0 || sa.indexOf(n) >= 0);
  }
  function levelProfile(level) {
    var map = {
      college: { label: "Collège", tags: ["college","secondaire","lycee","post bac","baccalaureat","orientation"], note: "Au collège, concentre-toi sur les matières que tu aimes et les métiers qui t’intriguent." },
      lycee: { label: "Lycée", tags: ["lycee","baccalaureat","bac","post bac","bts","but","dut","licence","bachelor","prepa","professionnel"], note: "Au lycée, tu peux explorer des formations post-bac : BTS, BUT/DUT, licence, bachelor, écoles spécialisées ou formations professionnelles, selon les prérequis." },
      bac: { label: "Baccalauréat / préparation", tags: ["baccalaureat","bac","licence","bachelor","bts","but","dut","prepa","ingenieur","medecine","droit","superieur"], note: "Après le baccalauréat, les voies dépendent du pays, des prérequis et des admissions. Vérifie toujours les conditions officielles." },
      bac1: { label: "Bac+1", tags: ["licence","bachelor","bts","but","dut","premiere annee","superieur","reorientation"], note: "En Bac+1, tu peux consolider ton choix, te réorienter ou chercher une formation plus adaptée." },
      bac2: { label: "Bac+2 / BTS / BUT", tags: ["bts","but","dut","licence professionnelle","licence","bachelor","alternance","poursuite"], note: "Avec un Bac+2 ou équivalent, vérifie les passerelles, admissions parallèles, licences professionnelles ou bachelors." },
      licence: { label: "Licence / bachelor / Bac+3", tags: ["master","mba","ingenieur","licence","bachelor","specialisation","professionnel"], note: "Après un Bac+3 ou équivalent, tu peux viser un master, une spécialisation ou l’insertion professionnelle selon le domaine." },
      master: { label: "Master / Bac+4/5", tags: ["master","mba","doctorat","phd","specialise","recherche","executif"], note: "Avec un niveau master, regarde les spécialisations, MBA, doctorat ou certifications selon ton objectif." },
      pro: { label: "Vie active / formation pro", tags: ["formation continue","professionnel","certificat","executif","alternance","master","mba"], note: "Privilégie les parcours compatibles avec ton expérience, les prérequis et la reconnaissance visée." },
      reconversion: { label: "Réorientation", tags: ["formation continue","professionnel","certificat","licence","master","alternance","reconversion","adulte"], note: "Vérifie les passerelles, admissions parallèles, VAE, prérequis et formats compatibles avec ta situation." }
    };
    return map[level] || { label: "Niveau à préciser", tags: [], note: "Tu peux explorer librement ; vérifie les prérequis propres à chaque formation." };
  }
  function diplomaTerms(goal) {
    var n = normalize(goal);
    var map = {"baccalaureat":["baccalaureat","bac"],"bts":["bts"],"but dut":["but","dut"],"licence":["licence"],"bachelor":["bachelor"],"licence professionnelle":["licence professionnelle","licence pro"],"master":["master"],"mba":["mba"],"doctorat":["doctorat","phd"],"ingenieur":["ingenieur","genie"],"formation professionnelle":["formation professionnelle","professionnel","certificat","technique"],"alternance":["alternance","apprentissage"]};
    return map[n] || (n ? [n] : []);
  }
  function termsForInterest(interest) {
    var base = {
      numerique:["informatique","numerique","digital","developpement","logiciel","programmation","web","cybersecurite","reseau","intelligence artificielle","data","donnee","cloud","genie logiciel"],
      sante:["medecine","sante","pharmacie","infirm","sage femme","dentaire","kine","biomedical","biologie","sante publique","nutrition","soins","paramedical"],
      ingenierie:["ingenieur","ingenierie","genie","mecanique","electrique","electronique","energie","civil","btp","industriel","robotique","maintenance","materiaux","batiment"],
      commerce:["commerce","gestion","management","marketing","finance","comptabilite","audit","banque","entrepreneuriat","ressources humaines","economie","vente","business"],
      droit:["droit","juridique","science politique","relation internationale","administration publique","justice","gouvernance"],
      education:["education","enseignement","pedagogie","formation des enseignants","sciences de l education"],
      arts:["art","design","graph","communication","journal","audiovisuel","cinema","musique","mode","architecture","urbanisme","media","publicite"],
      environnement:["environnement","agriculture","agronom","developpement durable","ecolog","eau","foret","climat","agroalimentaire"],
      tourisme:["tourisme","hotellerie","restauration","voyage","loisir","hospitality","accueil"],
      transport:["transport","logistique","supply chain","chaine d approvisionnement","mobilite","portuaire"],
      sciences:["mathematique","physique","chimie","science","statistique","biologie","geologie","recherche"],
      langues:["lettre","langue","linguistique","traduction","interpret","litterature","francais","anglais"],
      social:["sociolog","psycholog","histoire","geograph","anthropolog","philosoph","sciences humaines","sciences sociales","travail social"]
    };
    return base[interest] || [];
  }
  function splitTerms(value) { return normalize(value).split(/[,/;]|\s+et\s+|\s+/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length >= 3; }); }
  function containsAny(text, terms) { var found = []; (terms || []).forEach(function (t) { if (t && text.indexOf(normalize(t)) >= 0) found.push(t); }); return uniq(found); }
  function feeSummary(school) {
    var core = window.EduOrientCore;
    if (core && typeof core.feeSummary === "function") return core.feeSummary(school, "fr");
    var fees = Array.isArray(school.feesByLevel) ? school.feesByLevel : [];
    if (!fees.length) return "Tarifs non renseignés — à vérifier auprès de l’établissement.";
    var f = fees.find(function (x) { return x && x.tuitionFee != null; }) || fees[0];
    var cur = f.currency || "devise locale"; var est = f.registrationFeeEstimate || f.tuitionFeeEstimate || f.verified === false;
    var val = f.tuitionFee != null ? Number(f.tuitionFee).toLocaleString("fr-FR") + " " + cur : "à confirmer";
    return (est ? "Estimation indicative : " : "Scolarité : ") + val + " — à vérifier.";
  }

  function scoreSchool(school, ctx) {
    if (!school || !countryMatch(school, ctx.country)) return null;
    var txt = textOf(school), ptxt = programsText(school), dtxt = diplomasText(school);
    var interestTerms = termsForInterest(ctx.interest), specialtyTerms = splitTerms(ctx.specialty), subjectTerms = splitTerms(ctx.subjects), careerTerms = splitTerms(ctx.careerGoal), diplomaWanted = diplomaTerms(ctx.diplomaGoal);
    var reasons = [], fieldScore = 0, specScore = 0, matchedPrograms = [], exploring = isUndecided(ctx.interest) || ctx.interest === "aucun";
    if (!exploring) {
      var fieldHits = containsAny(ptxt, interestTerms);
      if (fieldHits.length) { fieldScore += 8 + Math.min(fieldHits.length, 4); matchedPrograms = matchedPrograms.concat(fieldHits); }
      var broadHits = containsAny(txt, interestTerms);
      if (broadHits.length && !fieldHits.length) fieldScore += 4 + Math.min(broadHits.length, 3);
      if (!fieldScore) return null;
      reasons.push("Domaine compatible : " + (fieldHits.length ? "formations enregistrées proches." : "informations générales à vérifier."));
    } else { fieldScore = 1; reasons.push("Mode exploration : suggestions variées à comparer."); }
    if (specialtyTerms.length) {
      var specProg = containsAny(ptxt, specialtyTerms), specTxt = containsAny(txt, specialtyTerms);
      if (specProg.length) { specScore += 12; matchedPrograms = matchedPrograms.concat(specProg); reasons.push("Spécialité trouvée dans les formations enregistrées : " + specProg.slice(0,3).join(", ") + "."); }
      else if (specTxt.length) { specScore += 5; reasons.push("Spécialité mentionnée de manière générale : à vérifier."); }
      else reasons.push("Spécialité « " + ctx.specialty + " » non confirmée dans la fiche.");
    }
    if (subjectTerms.length) { var subHits = containsAny(txt, subjectTerms); if (subHits.length) { fieldScore += Math.min(subHits.length,3); reasons.push("Lien possible avec les matières indiquées."); } }
    if (careerTerms.length) { var carHits = containsAny(txt, careerTerms); if (carHits.length) { fieldScore += 4; reasons.push("Lien possible avec le métier recherché (à vérifier)."); } }
    var diplomaScore = 0;
    if (diplomaWanted.length) { var dipHits = containsAny(dtxt + " " + ptxt + " " + txt, diplomaWanted); if (dipHits.length) { diplomaScore += 5; reasons.push("Diplôme/formation visé mentionné (à confirmer)."); } else reasons.push("Diplôme visé non explicitement confirmé."); }
    var lp = levelProfile(ctx.level), levelHits = containsAny(txt, lp.tags || []), lScore = levelHits.length ? Math.min(levelHits.length,4) : 0;
    reasons.push(lScore ? "Niveau : éléments compatibles, prérequis à vérifier." : "Niveau/prérequis à vérifier.");
    var tScore = 0;
    if (ctx.prefType && !isUndecided(ctx.prefType)) { tScore = normalize(school.type) === normalize(ctx.prefType) ? 3 : -1; if (tScore > 0) reasons.push("Type d’établissement correspondant."); }
    var bScore = 0, fees = Array.isArray(school.feesByLevel) ? school.feesByLevel : [];
    var hasPublished = fees.some(function (f) { return f && f.verified === true && !(f.registrationFeeEstimate || f.tuitionFeeEstimate) && (f.tuitionFee != null || f.registrationFee != null); });
    var hasAnyFee = fees.some(function (f) { return f && (f.tuitionFee != null || f.registrationFee != null); });
    if (ctx.budget === "known") bScore = hasPublished ? 4 : -2;
    else if (ctx.budget === "limite") { if (normalize(school.type).indexOf("public") >= 0) bScore = 3; }
    else if (ctx.budget && ctx.budget !== "inconnu") bScore = hasAnyFee ? 1 : 0;
    var fit = (fieldScore + specScore + diplomaScore + lScore + tScore + bScore) >= 14 ? "adapte" : ((fieldScore + specScore + diplomaScore + lScore + tScore + bScore) >= 8 ? "proche" : "a verifier");
    var limits = [];
    if (specialtyTerms.length && specScore < 6) limits.push("spécialité non confirmée");
    if (!lScore) limits.push("niveau/prérequis à vérifier");
    if (!hasPublished) limits.push(fees.length ? "tarifs à confirmer" : "tarifs non renseignés");
    if (school.verification && school.verification.verified === false) limits.push("informations à vérifier");
    return { school: school, total: fieldScore + specScore + diplomaScore + lScore + tScore + bScore, fit: fit, reasons: uniq(reasons).slice(0,5), limits: uniq(limits).slice(0,4), specScore: specScore, levelProfile: lp };
  }
  function fitLabel(fit) { return fit === "adapte" ? "Piste adaptée" : (fit === "proche" ? "Piste proche" : "Piste à vérifier"); }

  function createSchoolCard(result) {
    var school = result.school, card = document.createElement("article");
    card.className = "school-card orientation-school-card";
    var imgSrc = getSchoolImage(school);
    if (!imgSrc) card.classList.add("no-image");
    var programs = (school.programs || []).slice(0, 3).join(" ; ") || "Formations à vérifier";
    var meta = [school.city, school.country].filter(Boolean).join(" · ") + (school.type ? " · " + school.type : "");
    var link = school.website ? '<a class="mini-link" href="' + attr(school.website) + '" target="_blank" rel="noopener noreferrer">Site officiel</a>' : "";
    var detail = '<a class="mini-link" href="index.html?school=' + encodeURIComponent(String(school.id)) + '#ecoles">Voir la fiche</a>';
    var limits = result.limits.length ? '<p class="school-fee-summary"><strong>À vérifier :</strong> ' + esc(result.limits.join(" · ")) + '.</p>' : '';
    var img = imgSrc ? '<img class="school-card-image" src="' + attr(imgSrc) + '" alt="' + attr("Photo de " + school.name) + '" loading="lazy" onerror="this.remove();this.closest(\'.school-card\')&&this.closest(\'.school-card\').classList.add(\'no-image\');">' : '';
    card.innerHTML = img + '<div class="school-card-body"><p class="ori-muted"><strong>' + esc(fitLabel(result.fit)) + '</strong></p><h3>' + esc(school.name) + '</h3><p class="school-meta">' + esc(meta) + '</p><p class="school-programs"><strong>Formations (extrait) :</strong> ' + esc(programs) + '</p><p class="school-fee-summary"><strong>Budget :</strong> ' + esc(feeSummary(school)) + '</p><p class="school-reason"><strong>Pourquoi :</strong> ' + esc(result.reasons.join(" ")) + '</p>' + limits + '<div class="school-card-actions">' + detail + link + '</div></div>';
    return card;
  }

  function resolveGuides(ctx) {
    var guides = OD().fieldGuides || {};
    var out = [];
    if (ctx.interest && !isUndecided(ctx.interest) && ctx.interest !== "aucun" && guides[ctx.interest]) out.push(guides[ctx.interest]);
    if (!out.length && (isUndecided(ctx.interest) || ctx.interest === "aucun")) {
      if (ctx.careerGoal) {
        var cg = normalize(ctx.careerGoal);
        (OD().careers || []).forEach(function (c) { if (normalize(c.name).indexOf(cg) >= 0 || cg.indexOf(normalize(c.name).split(" ")[0]) >= 0) { var g = guides[c.interest]; if (g && out.indexOf(g) < 0) out.push(g); } });
      }
      if (!out.length) Object.keys(guides).slice(0, 3).forEach(function (k) { if (k !== "aucun") out.push(guides[k]); });
      if (!out.length && guides.aucun) out.push(guides.aucun);
    }
    if (!out.length && guides.aucun) out.push(guides.aucun);
    return uniq(out).slice(0, 3);
  }

  function resolveCareers(ctx, guides) {
    var careers = OD().careers || [];
    var wanted = normalize(ctx.careerGoal);
    var selected = [];
    if (wanted) careers.forEach(function (c) { var n = normalize(c.name); if (n.indexOf(wanted) >= 0 || wanted.indexOf(n.split(" ")[0]) >= 0 || (c.keywords||[]).some(function(k){ return wanted.indexOf(normalize(k))>=0; })) selected.push(c); });
    if (!selected.length) {
      var ints = {}; guides.forEach(function(g){ ints[g.interest] = true; });
      if (ctx.interest && !isUndecided(ctx.interest) && ctx.interest !== "aucun") ints[ctx.interest] = true;
      careers.forEach(function(c){ if (ints[c.interest] && selected.length < 8) selected.push(c); });
    }
    if (!selected.length) careers.slice(0,6).forEach(function(c){ selected.push(c); });
    return uniq(selected).slice(0, 8);
  }

  function findSchoolsForCareer(career) {
    var keywords = (career.keywords || []).concat([career.name || ""]).map(normalize).filter(function (k) { return k.length >= 3; });
    return allSchools.map(function (s) {
      var p = programsText(s), t = textOf(s), score = 0, hits = [];
      keywords.forEach(function (k) { if (p.indexOf(k) >= 0) { score += 5; hits.push(k); } else if (t.indexOf(k) >= 0) { score += 2; if (hits.length < 4) hits.push(k); } });
      return score > 0 ? { school: s, score: score, hits: uniq(hits).slice(0, 4) } : null;
    }).filter(Boolean).sort(function (a, b) { return b.score - a.score; }).slice(0, 4);
  }

  function renderProfile(ctx, lp) {
    var rows = [
      ["Niveau actuel", lp.label || "À préciser"],
      ["Domaine recherché", (OD().fieldGuides && OD().fieldGuides[ctx.interest] && OD().fieldGuides[ctx.interest].label) || (isUndecided(ctx.interest) ? "À explorer" : ctx.interest)],
      ["Spécialité/filière précise", ctx.specialty || "Non précisée"],
      ["Diplôme/formation visé(e)", ctx.diplomaGoal || "Je ne sais pas encore"],
      ["Matières appréciées", ctx.subjects || "Non précisées"],
      ["Métier d’intérêt", ctx.careerGoal || "Non précisé"],
      ["Pays souhaité", ctx.country || "Je ne sais pas encore"],
      ["Type d’établissement", ctx.prefType || "Public ou privé / à préciser"],
      ["Budget", ctx.budget && ctx.budget !== "inconnu" ? ctx.budget : "À préciser"],
      ["Préférence pratique", ctx.studyMode || "À préciser"]
    ];
    return '<section class="ori-result-card"><h3>1. Résumé de ton profil</h3><div class="ori-meta">' + rows.map(function(r){ return '<p><strong>' + esc(r[0]) + ' :</strong> ' + esc(r[1]) + '</p>'; }).join('') + '</div><p class="ori-muted">' + esc(lp.note) + '</p></section>';
  }

  function renderField(guides, ctx) {
    if (!guides.length) return '<section class="ori-result-card"><h3>2. Filière ou domaine recommandé</h3><p>Aucun domaine précis n’a été identifié. Utilise les pistes ci-dessous pour explorer plusieurs options.</p></section>';
    var body = guides.map(function(g){
      return '<div class="ori-subcard"><h4>' + esc(g.label) + '</h4><p>' + esc(g.def) + '</p>' + details('Ce qu’on y apprend', '<ul>' + (g.learn||[]).map(function(x){return '<li>'+esc(x)+'</li>';}).join('') + '</ul>', true) + details('Compétences développées', '<p>' + esc((g.skills||[]).join(' · ')) + '</p>') + details('Secteurs utiles', '<p>' + esc((g.sectors||[]).join(' · ')) + '</p>') + '</div>';
    }).join('');
    var note = (isUndecided(ctx.interest) || ctx.interest === "aucun") ? '<p class="ori-muted">Tu n’as pas choisi de domaine précis : EduOrient te propose plusieurs pistes à comparer.</p>' : '';
    return '<section class="ori-result-card"><h3>2. Filière ou domaine recommandé</h3><h3 style="margin-top:-4px">Comprendre la filière qui t’intéresse</h3>' + note + body + '</section>';
  }

  function renderSubjects(guides) {
    if (!guides.length) return '';
    var body = guides.map(function(g){
      return '<div class="ori-subcard"><h4>' + esc(g.label) + '</h4><p><strong>Matières principales :</strong> ' + esc((g.subjects||[]).join(' · ') || 'À préciser selon le programme.') + '</p><p><strong>Spécialisations possibles :</strong> ' + esc((g.specs||[]).join(' · ') || 'À vérifier selon les établissements.') + '</p></div>';
    }).join('');
    return '<section class="ori-result-card"><h3>4. Matières et spécialisations</h3>' + body + '</section>';
  }

  function renderDegrees(guides, ctx) {
    if (!guides.length) return '';
    var body = guides.map(function(g){
      return '<div class="ori-subcard"><h4>' + esc(g.label) + '</h4><p><strong>Diplômes accessibles / souvent associés :</strong> ' + esc((g.degrees||[]).join(' · ')) + '</p><p><strong>Niveaux d’études :</strong> ' + esc((g.levels||[]).join(' · ')) + '</p><p><strong>Formations/studies possibles :</strong> ' + esc((g.studies||[]).join(' · ')) + '</p></div>';
    }).join('');
    var extra = ctx.diplomaGoal ? '<p><strong>Diplôme visé indiqué :</strong> ' + esc(ctx.diplomaGoal) + ' — l’accès dépend du pays, des prérequis et de la reconnaissance du diplôme.</p>' : '';
    return '<section class="ori-result-card"><h3>5. Diplômes et niveaux d’études</h3>' + extra + body + '<p class="ori-muted">Les intitulés (BTS, BUT, licence, bachelor, master, ingénieur…) et leurs équivalences varient selon les pays.</p></section>';
  }

  function renderCareersBlock(careers) {
    if (!careers.length) return '<section class="ori-result-card"><h3>6. Métiers et débouchés possibles</h3><p>Aucune fiche métier précise n’a pu être associée. Essaie d’indiquer un domaine, une matière ou un métier pour obtenir des suggestions plus ciblées.</p></section>';
    var body = careers.map(function(c){
      var inner = '<p>' + esc(c.def) + '</p>' +
        '<p><strong>Missions principales :</strong> ' + esc((c.missions||[]).join(' · ')) + '</p>' +
        '<p><strong>Compétences nécessaires :</strong> ' + esc((c.skills||[]).join(' · ')) + '</p>' +
        '<p><strong>Formations/diplômes généralement associés :</strong> ' + esc((c.studies||[]).join(' · ')) + (c.degrees && c.degrees.length ? ' — ' + esc(c.degrees.join(' · ')) : '') + '</p>' +
        '<p><strong>Secteurs d’activité :</strong> ' + esc((c.workplaces||[]).join(' · ')) + '</p>' +
        '<p><strong>Évolution professionnelle :</strong> ' + esc(c.evolution || 'Variable selon le parcours et le pays.') + '</p>' +
        (c.caution ? '<p class="ori-muted"><strong>Attention :</strong> ' + esc(c.caution) + '</p>' : '');
      return details(c.name, inner, careers.length <= 2);
    }).join('');
    return '<section class="ori-result-card"><h3>6. Métiers et débouchés possibles</h3><p>Métiers associés aux réponses du questionnaire (à adapter selon le pays et le niveau d’études) :</p>' + body + '</section>';
  }

  function renderPathways(careers) {
    if (!careers.length) return '';
    var body = careers.slice(0,5).map(function(c){
      var matches = findSchoolsForCareer(c);
      var mHtml = matches.length ? '<p><strong>Établissements potentiellement liés (base EduOrient) :</strong> ' + matches.map(function(m){ return esc(m.school.name) + ' (' + esc([m.school.city,m.school.country].filter(Boolean).join(', ')) + ')'; }).join(' ; ') + '. <span class="ori-muted">Correspondance indicative, à vérifier.</span></p>' : '<p class="ori-muted">Aucun établissement explicitement associé dans la base pour ce métier précis ; élargis ta recherche ou vérifie les formations des fiches établissements.</p>';
      return '<div class="ori-subcard"><h4>' + esc(c.name) + '</h4><p><strong>Formations d’accès possibles :</strong> ' + esc((c.studies||[]).join(' · ')) + '</p>' + mHtml + '</div>';
    }).join('');
    return '<section class="ori-result-card"><h3>7. Formations permettant d’accéder à ces métiers</h3>' + body + '</section>';
  }

  function renderSchoolsBlock(scored, wantedSpec, exactSpec, close) {
    var list = (wantedSpec ? (exactSpec.length ? exactSpec : close) : scored).slice(0, 24);
    var msg = '';
    if (wantedSpec && !exactSpec.length && close.length) msg = '<div class="orientation-specialty-note"><strong>Spécialité non trouvée explicitement :</strong> suggestions liées au domaine général. Vérifie les formations exactes auprès de chaque établissement.</div>';
    if (!list.length) msg += '<div class="empty-state"><p>Aucune correspondance précise dans la base actuelle. Élargis le pays, choisis un domaine plus large, retire la spécialité ou consulte les fiches établissements. Les informations manquantes doivent être vérifiées.</p></div>';
    return '<section class="ori-result-card"><h3>8. Établissements adaptés au profil</h3><div id="orientationSummary"></div>' + msg + '<div id="orientationPath" class="ori-path" hidden></div><div id="orientationSuggestions" class="orientation-suggestions"></div></section>';
  }

  function renderAdvice(ctx, scored) {
    var tips = [];
    tips.push("Compare plusieurs établissements : formations réelles, admissions, coûts, reconnaissance du diplôme et localisation.");
    tips.push("Contacte les établissements (site officiel, service admissions) pour confirmer les programmes, dates, prérequis et frais.");
    if (isUndecided(ctx.interest) || ctx.interest === "aucun") tips.push("Si tu hésites, choisis 2 domaines à explorer, puis compare les métiers et les matières associées.");
    if (ctx.careerGoal) tips.push("Pour le métier visé (« " + ctx.careerGoal + " »), vérifie si la profession est réglementée dans le pays concerné.");
    if (ctx.specialty) tips.push("La spécialité recherchée doit être confirmée dans le programme officiel de l’établissement (contenu, diplôme, stage/alternance).");
    if (!isUndecided(ctx.country)) tips.push("Étudier à l’étranger peut demander des équivalences, visas, assurance et preuves de langue : vérifie tôt.");
    tips.push("Utilise les fiches métiers et la rubrique « Comprendre les études » sur cette page pour approfondir.");
    return '<section class="ori-result-card"><h3>9. Conseils personnalisés</h3><ul class="ori-advice">' + tips.map(function(t){ return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></section>';
  }

  function renderResults(ctx) {
    var resultsEl = document.getElementById("orientationResults");
    var status = document.getElementById("orientationStatus");
    if (!resultsEl) return;
    try {
      if (!allSchools.length) {
        setBlock('orientationProfile','<p>Les données des établissements ne sont pas encore disponibles. Réessaie ou vérifie ta connexion.</p>');
        resultsEl.hidden = false; resultsEl.scrollIntoView({behavior:"smooth",block:"start"}); return;
      }
      if (status) status.textContent = "Analyse en cours…";
      var lp = levelProfile(ctx.level);
      var scored = allSchools.map(function (s) { return scoreSchool(s, ctx); }).filter(Boolean).sort(function (a, b) { return b.total - a.total || b.specScore - a.specScore || a.school.name.localeCompare(b.school.name, "fr"); });
      var wantedSpec = splitTerms(ctx.specialty).length > 0;
      var exactSpec = wantedSpec ? scored.filter(function (r) { return r.specScore >= 6; }) : scored;
      var close = wantedSpec ? scored.filter(function (r) { return r.specScore < 6; }) : [];
      var guides = resolveGuides(ctx);
      var careers = resolveCareers(ctx, guides);

      setBlock('orientationProfile', renderProfile(ctx, lp));
      setBlock('orientationField', renderField(guides, ctx));
      setBlock('orientationSubjects', renderSubjects(guides));
      setBlock('orientationDegrees', renderDegrees(guides, ctx));
      setBlock('orientationCareers', renderCareersBlock(careers));
      setBlock('orientationPathways', renderPathways(careers));
      setBlock('orientationSchools', renderSchoolsBlock(scored, wantedSpec, exactSpec, close));
      setBlock('orientationAdvice', renderAdvice(ctx, scored));

      var summary = document.getElementById('orientationSummary');
      var suggestions = document.getElementById('orientationSuggestions');
      var path = document.getElementById('orientationPath');
      if (path) path.hidden = true;
      if (summary) {
        var parts = [lp.note];
        if (!isUndecided(ctx.country)) parts.push("Pays : " + ctx.country + ".");
        if (wantedSpec) parts.push(exactSpec.length ? exactSpec.length + " établissement(s) correspondent explicitement à la spécialité recherchée." : "Aucune correspondance explicite pour la spécialité ; suggestions proches proposées.");
        else parts.push(scored.length ? scored.length + " piste(s) identifiée(s)." : "Aucune correspondance précise ; élargis les critères.");
        summary.textContent = parts.join(' ');
      }
      if (suggestions) {
        suggestions.innerHTML = '';
        var list = (wantedSpec ? (exactSpec.length ? exactSpec : close) : scored).slice(0, 24);
        list.forEach(function (r) { suggestions.appendChild(createSchoolCard(r)); });
      }
      var link = document.querySelector('.orientation-link');
      if (link) {
        try {
          var params = new URLSearchParams({ orientation: "true", interest: ctx.interest || "", specialty: ctx.specialty || "", country: ctx.country || "", level: ctx.level || "", budget: ctx.budget || "", type: ctx.prefType || "", diplomaGoal: ctx.diplomaGoal || "" });
          var src = (wantedSpec ? (exactSpec.length ? exactSpec : close) : scored).slice(0, 60);
          if (src.length) params.set('schoolIds', src.map(function (r) { return r.school.id; }).join(','));
          link.href = 'index.html?' + params.toString() + '#ecoles';
        } catch (_e) {
          link.href = 'index.html#ecoles';
        }
      }
      resultsEl.hidden = false;
      if (status) status.textContent = "";
      resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      console.error("Orientation render error", e);
      setBlock('orientationProfile','<div class="empty-state"><p>Une erreur est survenue lors de l’affichage des résultats. Réessaie ou recharge la page. Détail : ' + esc(e && e.message ? e.message : String(e)) + '</p></div>');
      resultsEl.hidden = false;
      if (status) status.textContent = "";
    }
  }

  // Static reference panels (kept)
  function renderDefinitions(tab) {
    var grid = document.getElementById("definitionsGrid"); if (!grid) return;
    var defs = (OD().definitions && OD().definitions[tab]) || [];
    grid.innerHTML = defs.map(function (d) { return '<article class="ori-card"><h3>' + esc(d.term) + '</h3><p>' + esc(d.def) + '</p><p><strong>Exemple :</strong> ' + esc(d.ex) + '</p><p><strong>À quoi ça sert :</strong> ' + esc(d.use) + '</p><p class="ori-muted"><strong>À vérifier :</strong> ' + esc(d.note) + '</p></article>'; }).join("");
  }
  function renderCareerDetail(career) {
    var box = document.getElementById("careerDetail"); if (!box) return;
    var matches = findSchoolsForCareer(career);
    var schoolsHtml = matches.length ? ('<h4>Établissements potentiellement liés (base)</h4><div class="ori-grid">' + matches.map(function (m) { var img = getSchoolImage(m.school); return '<article class="ori-card">' + (img ? '<img class="school-card-image" src="' + attr(img) + '" alt="" loading="lazy" style="height:120px;border-radius:10px" onerror="this.remove()">' : '') + '<h4>' + esc(m.school.name) + '</h4><p>' + esc([m.school.city, m.school.country].filter(Boolean).join(" · ")) + '</p><p class="ori-muted">Correspondance indicative : ' + esc((m.hits||[]).join(', ') || career.name) + '. À vérifier.</p></article>'; }).join("") + '</div>') : '<p class="ori-muted">Aucune correspondance explicite dans les données actuelles. Vérifie les fiches établissements.</p>';
    box.hidden = false;
    box.innerHTML = '<h3>' + esc(career.name) + '</h3><p>' + esc(career.def) + '</p><div class="ori-meta"><p><strong>Missions :</strong> ' + esc((career.missions||[]).join(' · ')) + '</p><p><strong>Compétences :</strong> ' + esc((career.skills||[]).join(' · ')) + '</p><p><strong>Matières utiles :</strong> ' + esc((career.subjects||[]).join(' · ')) + '</p><p><strong>Études possibles :</strong> ' + esc((career.studies||[]).join(' · ')) + '</p><p><strong>Diplômes associés :</strong> ' + esc((career.degrees||[]).join(' · ')) + '</p><p><strong>Où travailler :</strong> ' + esc((career.workplaces||[]).join(' · ')) + '</p><p><strong>Évolution :</strong> ' + esc(career.evolution || '') + '</p>' + (career.caution ? '<p class="ori-muted"><strong>Attention :</strong> ' + esc(career.caution) + '</p>' : '') + '</div>' + schoolsHtml;
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function renderCareers(sector) {
    var grid = document.getElementById("careersGrid"); if (!grid) return;
    var careers = (OD().careers || []).filter(function (c) { return !sector || sector === "all" || c.sector === sector; });
    grid.innerHTML = careers.map(function (c) { return '<article class="ori-card"><h3>' + esc(c.name) + '</h3><p>' + esc(c.def) + '</p><p class="ori-muted"><strong>Études possibles :</strong> ' + esc((c.studies||[]).slice(0,2).join(' · ')) + '</p><button class="inline-link" type="button" data-career-id="' + attr(c.id) + '">Voir la fiche métier →</button></article>'; }).join("");
    grid.querySelectorAll("[data-career-id]").forEach(function (btn) { btn.addEventListener("click", function () { var career = (OD().careers || []).find(function (c) { return c.id === btn.getAttribute("data-career-id"); }); if (career) renderCareerDetail(career); }); });
  }
  function renderCareerFilters() {
    var box = document.getElementById("careerFilters"); if (!box) return;
    var sectors = [{ id: "all", label: "Tous" }].concat(OD().sectors || []);
    box.innerHTML = sectors.map(function (s, i) { return '<button class="ori-chip' + (i === 0 ? ' is-active' : '') + '" type="button" data-sector="' + attr(s.id) + '">' + esc(s.label) + '</button>'; }).join("");
    box.querySelectorAll("[data-sector]").forEach(function (btn) { btn.addEventListener("click", function () { box.querySelectorAll(".ori-chip").forEach(function (b) { b.classList.remove("is-active"); }); btn.classList.add("is-active"); renderCareers(btn.getAttribute("data-sector")); }); });
  }
  function populateCountries() {
    var sel = document.getElementById("studyCountry"); if (!sel) return; var keep = {};
    Array.prototype.forEach.call(sel.options, function (o) { if (o.value) keep[normalize(o.value)] = true; });
    uniq(allSchools.map(function (s) { return s.country; }).filter(Boolean)).sort(function (a, b) { return a.localeCompare(b, "fr"); }).forEach(function (c) { if (!keep[normalize(c)]) { var o = document.createElement("option"); o.value = c; o.textContent = c; sel.appendChild(o); } });
  }
  function formContext() {
    return {
      level: (document.getElementById("studyLevel")||{}).value || "",
      interest: (document.getElementById("interest")||{}).value || "",
      specialty: (document.getElementById("specialty")||{}).value || "",
      diplomaGoal: (document.getElementById("diplomaGoal")||{}).value || "",
      subjects: (document.getElementById("subjects")||{}).value || "",
      careerGoal: (document.getElementById("careerGoal")||{}).value || "",
      country: (document.getElementById("studyCountry")||{}).value || "",
      prefType: (document.getElementById("institutionType")||{}).value || "",
      budget: (document.getElementById("budget")||{}).value || "inconnu",
      studyMode: (document.getElementById("studyMode")||{}).value || ""
    };
  }
  async function loadSchools() {
    try {
      var core = window.EduOrientCore;
      if (core && typeof core.loadSchools === "function") { allSchools = await core.loadSchools(); return; }
      var res = await fetch(SCHOOLS_URL, { cache: "no-store" }); if (!res.ok) throw new Error("HTTP " + res.status);
      var data = await res.json(); allSchools = Array.isArray(data) ? data : [];
    } catch (e) { console.error("Chargement school.json", e); allSchools = []; }
  }
  function initStatic() {
    renderDefinitions("diplomas"); renderCareerFilters(); renderCareers("all");
    document.querySelectorAll("[data-def-tab]").forEach(function (btn) { btn.addEventListener("click", function () { document.querySelectorAll("[data-def-tab]").forEach(function (b) { b.classList.remove("is-active"); b.setAttribute("aria-selected", "false"); }); btn.classList.add("is-active"); btn.setAttribute("aria-selected", "true"); renderDefinitions(btn.getAttribute("data-def-tab")); }); });
  }

  document.addEventListener("DOMContentLoaded", async function () {
    initStatic();
    var form = document.getElementById("orientationForm"), results = document.getElementById("orientationResults"), edit = document.getElementById("editOrientation"), explore = document.getElementById("startExplore");
    if (!form) return;
    await loadSchools(); populateCountries();
    form.addEventListener("reset", function () { if (results) results.hidden = true; ['orientationProfile','orientationField','orientationSubjects','orientationDegrees','orientationCareers','orientationPathways','orientationSchools','orientationAdvice'].forEach(function(id){ setBlock(id,''); }); });
    if (edit) edit.addEventListener("click", function () { if (results) results.hidden = true; form.scrollIntoView({ behavior: "smooth", block: "start" }); });
    if (explore) explore.addEventListener("click", function () { var i = document.getElementById("interest"); if (i) i.value = "aucun"; renderResults(formContext()); });
    form.addEventListener("submit", function (e) { e.preventDefault(); renderResults(formContext()); });
  });
})();
