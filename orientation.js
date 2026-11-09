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

  function textOf(school) {
    var parts = [school.name, school.city, school.country, school.type, school.address, school.description, school.website];
    (school.programs || []).forEach(function (p) { parts.push(p); });
    (school.diplomas || []).forEach(function (p) { parts.push(p); });
    (school.levels || []).forEach(function (p) { parts.push(p); });
    (school.admission || []).forEach(function (p) { parts.push(p); });
    (school.feesByLevel || []).forEach(function (f) { if (f) parts.push(f.level, f.period); });
    if (school.verification && school.verification.note) parts.push(school.verification.note);
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
    var n = normalize(selected);
    var sc = normalize(school.country || "");
    var sa = normalize(school.address || "");
    return !!sc && (sc.indexOf(n) >= 0 || n.indexOf(sc) >= 0 || sa.indexOf(n) >= 0);
  }

  function levelProfile(level) {
    var map = {
      college: { label: "Collège", tags: ["college", "secondaire", "lycee", "post bac", "baccalaureat", "orientation"], note: "Au collège, concentre-toi sur les matières que tu aimes et les métiers qui t’intriguent. Les établissements supérieurs seront utiles plus tard, selon ton parcours." },
      lycee: { label: "Lycée", tags: ["lycee", "baccalaureat", "bac", "post bac", "bts", "but", "dut", "licence", "bachelor", "prepa", "professionnel"], note: "Au lycée, tu peux explorer des formations post-bac : BTS, BUT/DUT, licence, bachelor, écoles spécialisées ou formations professionnelles, selon les prérequis." },
      bac: { label: "Baccalauréat / préparation", tags: ["baccalaureat", "bac", "licence", "bachelor", "bts", "but", "dut", "prepa", "ingenieur", "medecine", "droit", "superieur"], note: "Après le baccalauréat, les voies dépendent du pays, des prérequis et des admissions. Vérifie toujours les conditions officielles." },
      bac1: { label: "Bac+1", tags: ["licence", "bachelor", "bts", "but", "dut", "premiere annee", "superieur", "reorientation"], note: "En Bac+1, tu peux consolider ton choix, te réorienter ou chercher une formation plus adaptée." },
      bac2: { label: "Bac+2 / BTS / BUT", tags: ["bts", "but", "dut", "licence professionnelle", "licence", "bachelor", "alternance", "poursuite"], note: "Avec un Bac+2 ou équivalent, vérifie les passerelles, admissions parallèles, licences professionnelles ou bachelors." },
      licence: { label: "Licence / bachelor / Bac+3", tags: ["master", "mba", "ingenieur", "licence", "bachelor", "specialisation", "professionnel"], note: "Après un Bac+3 ou équivalent, tu peux viser un master, une spécialisation ou l’insertion professionnelle selon le domaine." },
      master: { label: "Master / Bac+4/5", tags: ["master", "mba", "doctorat", "phd", "specialise", "recherche", "executif"], note: "Avec un niveau master, regarde les spécialisations, MBA, doctorat ou certifications selon ton objectif." },
      pro: { label: "Vie active / formation pro", tags: ["formation continue", "professionnel", "certificat", "executif", "alternance", "master", "mba"], note: "En activité ou en formation professionnelle, privilégie les parcours compatibles avec ton expérience, les prérequis et la reconnaissance visée." },
      reconversion: { label: "Réorientation", tags: ["formation continue", "professionnel", "certificat", "licence", "master", "alternance", "reconversion", "adulte"], note: "En réorientation, vérifie les passerelles, admissions parallèles, VAE, prérequis et formats compatibles avec ta situation." },
      superieur: { label: "Études supérieures", tags: ["licence", "bachelor", "master", "mba", "doctorat", "specialise"], note: "Précise ton niveau pour affiner les passerelles et diplômes accessibles." }
    };
    return map[level] || { label: "Niveau à préciser", tags: [], note: "Tu peux explorer librement ; vérifie les prérequis propres à chaque formation." };
  }

  function diplomaTerms(goal) {
    var n = normalize(goal);
    var map = {
      "baccalaureat": ["baccalaureat", "bac"],
      "bts": ["bts", "brevet de technicien superieur"],
      "but dut": ["but", "dut", "bachelor universitaire de technologie", "diplome universitaire de technologie"],
      "licence": ["licence"],
      "bachelor": ["bachelor"],
      "licence professionnelle": ["licence professionnelle", "licence pro"],
      "master": ["master"],
      "mba": ["mba", "master of business administration"],
      "doctorat": ["doctorat", "phd", "doctorate"],
      "ingenieur": ["ingenieur", "engineering", "genie"],
      "formation professionnelle": ["formation professionnelle", "professionnel", "certificat", "technique", "metier"],
      "alternance": ["alternance", "apprentissage", "professionnalisant"]
    };
    return map[n] || (n ? [n] : []);
  }

  function fieldConfig() {
    return (OD().fieldGuides) || {};
  }

  function termsForInterest(interest) {
    var base = {
      numerique: ["informatique", "numerique", "digital", "developpement", "logiciel", "programmation", "web", "cybersecurite", "reseau", "systeme d information", "intelligence artificielle", "data", "donnee", "cloud", "genie logiciel", "multimedia"],
      sante: ["medecine", "sante", "pharmacie", "infirm", "sage femme", "dentaire", "odont", "kine", "biomedical", "biologie", "sante publique", "nutrition", "laboratoire", "paramedical", "soins"],
      ingenierie: ["ingenieur", "ingenierie", "genie", "mecanique", "electrique", "electronique", "energie", "civil", "btp", "industriel", "robotique", "automatisme", "maintenance", "materiaux", "batiment", "travaux publics"],
      commerce: ["commerce", "gestion", "management", "marketing", "finance", "comptabilite", "audit", "banque", "entrepreneuriat", "ressources humaines", "business", "economie", "vente"],
      droit: ["droit", "juridique", "science politique", "relation internationale", "administration publique", "justice", "gouvernance", "notariat"],
      education: ["education", "enseignement", "pedagogie", "formation des enseignants", "sciences de l education", "didactique"],
      arts: ["art", "design", "graph", "communication", "journal", "audiovisuel", "cinema", "musique", "mode", "architecture", "urbanisme", "culture", "media", "publicite"],
      environnement: ["environnement", "agriculture", "agronom", "developpement durable", "ecolog", "eau", "foret", "climat", "agroalimentaire", "ressources naturelles"],
      tourisme: ["tourisme", "hotellerie", "restauration", "voyage", "loisir", "hospitality", "accueil"],
      transport: ["transport", "logistique", "supply chain", "chaine d approvisionnement", "mobilite", "portuaire", "douane"],
      sciences: ["mathematique", "physique", "chimie", "science", "statistique", "biologie", "geologie", "recherche"],
      langues: ["lettre", "langue", "linguistique", "traduction", "interpret", "litterature", "francais", "anglais", "civilisation"],
      social: ["sociolog", "psycholog", "histoire", "geograph", "anthropolog", "philosoph", "sciences humaines", "sciences sociales", "travail social"]
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
    var cur = f.currency || "devise locale";
    var est = f.registrationFeeEstimate || f.tuitionFeeEstimate || f.verified === false;
    var val = f.tuitionFee != null ? Number(f.tuitionFee).toLocaleString("fr-FR") + " " + cur : "à confirmer";
    return (est ? "Estimation indicative : " : "Scolarité : ") + val + " — à vérifier.";
  }

  function scoreSchool(school, ctx) {
    if (!school || !countryMatch(school, ctx.country)) return null;
    var txt = textOf(school);
    var ptxt = programsText(school);
    var dtxt = diplomasText(school);
    var interestTerms = termsForInterest(ctx.interest);
    var specialtyTerms = splitTerms(ctx.specialty);
    var subjectTerms = splitTerms(ctx.subjects);
    var careerTerms = splitTerms(ctx.careerGoal);
    var diplomaWanted = diplomaTerms(ctx.diplomaGoal);
    var reasons = [];
    var fieldScore = 0;
    var specScore = 0;
    var matchedPrograms = [];
    var exploring = isUndecided(ctx.interest) || ctx.interest === "aucun";

    if (!exploring) {
      var fieldHits = containsAny(ptxt, interestTerms);
      if (fieldHits.length) { fieldScore += 8 + Math.min(fieldHits.length, 4); matchedPrograms = matchedPrograms.concat(fieldHits); }
      var broadHits = containsAny(txt, interestTerms);
      if (broadHits.length && !fieldHits.length) { fieldScore += 4 + Math.min(broadHits.length, 3); }
      if (!fieldScore) return null;
      reasons.push("Domaine compatible : " + (fieldHits.length ? "correspondance trouvée dans les formations enregistrées." : "correspondance générale dans les informations disponibles, à vérifier."));
    } else {
      fieldScore = 1;
      reasons.push("Mode exploration : suggestions variées à comparer.");
    }

    if (specialtyTerms.length) {
      var specProg = containsAny(ptxt, specialtyTerms);
      var specTxt = containsAny(txt, specialtyTerms);
      if (specProg.length) { specScore += 12; matchedPrograms = matchedPrograms.concat(specProg); reasons.push("Spécialité recherchée présente dans les formations enregistrées : " + specProg.slice(0, 3).join(", ") + "."); }
      else if (specTxt.length) { specScore += 5; reasons.push("Spécialité mentionnée dans les informations disponibles : à vérifier dans les programmes détaillés."); }
      else { reasons.push("Spécialité « " + ctx.specialty + " » non trouvée explicitement dans la base pour cet établissement : vérifier directement auprès de l’établissement."); }
    }

    if (subjectTerms.length) {
      var subHits = containsAny(txt, subjectTerms);
      if (subHits.length) { fieldScore += Math.min(subHits.length, 3); reasons.push("Lien possible avec les matières indiquées : " + subHits.slice(0, 3).join(", ") + "."); }
    }

    if (careerTerms.length) {
      var carHits = containsAny(txt, careerTerms);
      if (carHits.length) { fieldScore += 4; reasons.push("Lien possible avec le métier recherché dans les informations disponibles."); }
    }

    var diplomaScore = 0;
    if (diplomaWanted.length) {
      var dipHits = containsAny(dtxt + " " + ptxt + " " + txt, diplomaWanted);
      if (dipHits.length) { diplomaScore += 5; reasons.push("Type de diplôme/formation recherché mentionné dans les données disponibles : à confirmer."); }
      else { reasons.push("Diplôme/formation visé non explicitement confirmé dans la fiche : à vérifier."); }
    }

    var lp = levelProfile(ctx.level);
    var levelHits = containsAny(txt, lp.tags || []);
    var lScore = levelHits.length ? Math.min(levelHits.length, 4) : 0;
    reasons.push(lScore ? "Niveau indiqué : des éléments compatibles apparaissent, sous réserve des prérequis." : "Compatibilité avec ton niveau : à vérifier (admission, prérequis, passerelles).");

    var tScore = 0;
    if (ctx.prefType && !isUndecided(ctx.prefType)) {
      tScore = normalize(school.type) === normalize(ctx.prefType) ? 3 : -1;
      if (tScore > 0) reasons.push("Type d’établissement correspondant à ta préférence.");
    }

    var bScore = 0;
    var fees = Array.isArray(school.feesByLevel) ? school.feesByLevel : [];
    var hasPublished = fees.some(function (f) { return f && f.verified === true && !(f.registrationFeeEstimate || f.tuitionFeeEstimate) && (f.tuitionFee != null || f.registrationFee != null); });
    var hasAnyFee = fees.some(function (f) { return f && (f.tuitionFee != null || f.registrationFee != null); });
    if (ctx.budget === "known") { bScore = hasPublished ? 4 : -2; if (hasPublished) reasons.push("Tarifs publiés/vérifiés disponibles dans la fiche."); }
    else if (ctx.budget === "limite") { if (normalize(school.type).indexOf("public") >= 0) { bScore = 3; reasons.push("Établissement public : potentiellement plus accessible, frais à confirmer."); } else if (hasAnyFee && !hasPublished) { bScore = 0; reasons.push("Budget : tarifs indicatifs seulement, à vérifier."); } }
    else if (ctx.budget && ctx.budget !== "inconnu") { bScore = hasAnyFee ? 1 : 0; }

    var total = fieldScore + specScore + diplomaScore + lScore + tScore + bScore;
    var fit = total >= 14 ? "adapte" : (total >= 8 ? "proche" : "a verifier");
    var limits = [];
    if (specialtyTerms.length && specScore < 6) limits.push("spécialité non confirmée dans la fiche");
    if (!lScore) limits.push("niveau/prérequis à vérifier");
    if (!hasPublished) limits.push(fees.length ? "tarifs à confirmer" : "tarifs non renseignés");
    if (school.verification && school.verification.verified === false) limits.push("informations à vérifier");
    return { school: school, total: total, fit: fit, reasons: uniq(reasons).slice(0, 5), limits: uniq(limits).slice(0, 4), matchedPrograms: uniq(matchedPrograms).slice(0, 6), specScore: specScore, levelProfile: lp };
  }

  function fitLabel(fit) {
    if (fit === "adapte") return "Piste adaptée";
    if (fit === "proche") return "Piste proche";
    return "Piste à vérifier";
  }

  function createSchoolCard(result, ctx) {
    var school = result.school;
    var card = document.createElement("article");
    card.className = "school-card orientation-school-card";
    var imgSrc = getSchoolImage(school);
    if (!imgSrc) card.classList.add("no-image");
    var programs = (school.programs || []).slice(0, 3).join(" ; ") || "Formations à vérifier";
    var meta = [school.city, school.country].filter(Boolean).join(" · ") + (school.type ? " · " + school.type : "");
    var link = school.website ? '<a class="mini-link" href="' + attr(school.website) + '" target="_blank" rel="noopener noreferrer">Site officiel</a>' : "";
    var detail = '<a class="mini-link" href="index.html?school=' + encodeURIComponent(String(school.id)) + '#ecoles">Voir la fiche</a>';
    var limits = result.limits.length ? '<p class="school-fee-summary"><strong>Limites / à vérifier :</strong> ' + esc(result.limits.join(" · ")) + '.</p>' : '';
    var imgStatus = (window.EduOrientCore && window.EduOrientCore.imageStatusHtml) ? window.EduOrientCore.imageStatusHtml(school) : '';
    var img = imgSrc ? '<img class="school-card-image" src="' + attr(imgSrc) + '" alt="' + attr("Photo de " + school.name) + '" loading="lazy" onerror="this.remove();this.closest(\'.school-card\')&&this.closest(\'.school-card\').classList.add(\'no-image\');">' + imgStatus : '';
    card.innerHTML = img +
      '<div class="school-card-body">' +
      '<p class="ori-muted"><strong>' + esc(fitLabel(result.fit)) + '</strong></p>' +
      '<h3>' + esc(school.name) + '</h3>' +
      '<p class="school-meta">' + esc(meta) + '</p>' +
      '<p class="school-programs"><strong>Formations enregistrées (extrait) :</strong> ' + esc(programs) + '</p>' +
      '<p class="school-fee-summary"><strong>Budget :</strong> ' + esc(feeSummary(school)) + '</p>' +
      '<p class="school-reason"><strong>Pourquoi cette suggestion :</strong> ' + esc(result.reasons.join(" ")) + '</p>' +
      limits +
      '<div class="school-card-actions">' + detail + link + '</div></div>';
    return card;
  }

  function renderGuidedPath(ctx, results) {
    var box = document.getElementById("orientationPath");
    if (!box) return;
    var show = isUndecided(ctx.interest) || !results.length;
    box.hidden = !show;
    if (!show) { box.innerHTML = ""; return; }
    var guide = (fieldConfig()[ctx.interest] || fieldConfig().aucun || { studies: ["explorer plusieurs domaines"], careers: [] });
    box.innerHTML =
      '<div class="ori-path-step"><strong>Ce que tu peux explorer</strong>' + esc((guide.studies || []).join(", ")) + '</div>' +
      '<div class="ori-path-step"><strong>Compétences utiles</strong>' + esc((guide.skills || ["curiosité", "ouverture"]).join(", ")) + '</div>' +
      '<div class="ori-path-step"><strong>Prochaine étape</strong>Choisis 1–2 domaines ou métiers, puis compare les formations réellement proposées dans la base.</div>' +
      '<div class="ori-path-step"><strong>Important</strong>Si un domaine te plaît, vérifie les prérequis, admissions, équivalences et frais auprès des établissements.</div>';
  }

  function renderResults(ctx) {
    var resultsEl = document.getElementById("orientationResults");
    var summary = document.getElementById("orientationSummary");
    var suggestions = document.getElementById("orientationSuggestions");
    var status = document.getElementById("orientationStatus");
    if (!resultsEl || !summary || !suggestions) return;
    suggestions.innerHTML = "";
    if (!allSchools.length) {
      summary.textContent = "Les données des établissements n’ont pas pu être chargées pour le moment. Réessaie ou vérifie ta connexion.";
      resultsEl.hidden = false;
      return;
    }
    if (status) status.textContent = "Analyse des établissements en cours…";
    var scored = allSchools.map(function (s) { return scoreSchool(s, ctx); }).filter(Boolean).sort(function (a, b) { return b.total - a.total || b.specScore - a.specScore || a.school.name.localeCompare(b.school.name, "fr"); });

    var wantedSpec = splitTerms(ctx.specialty).length > 0;
    var exactSpec = wantedSpec ? scored.filter(function (r) { return r.specScore >= 6; }) : scored;
    var close = wantedSpec ? scored.filter(function (r) { return r.specScore < 6; }) : [];
    var list = (wantedSpec ? exactSpec : scored).slice(0, 24);
    var lp = levelProfile(ctx.level);
    var parts = [];
    parts.push(lp.note);
    if (!isUndecided(ctx.country)) parts.push("Pays sélectionné : " + ctx.country + ".");
    if (ctx.diplomaGoal) parts.push("Diplôme/formation visé : " + ctx.diplomaGoal + " (à confirmer selon le pays).");
    if (wantedSpec) parts.push(exactSpec.length ? (exactSpec.length + " établissement(s) correspondent explicitement à la spécialité recherchée dans les données disponibles.") : "Aucune correspondance explicite trouvée pour la spécialité dans les données actuelles ; EduOrient propose des pistes proches sans inventer de formation.");
    else parts.push(scored.length ? (scored.length + " piste(s) identifiée(s) à partir des informations disponibles.") : "Aucune correspondance précise trouvée. Élargis le pays, retire la spécialité ou choisis « Je ne sais pas encore » pour explorer.");
    summary.textContent = parts.join(" ");

    renderGuidedPath(ctx, list.length ? list : close.slice(0, 12));

    if (!list.length && close.length) {
      var note = document.createElement("div");
      note.className = "orientation-specialty-note";
      note.innerHTML = "<strong>Suggestions proches :</strong> la spécialité n’a pas été trouvée explicitement. Les établissements ci-dessous sont liés au domaine général ; vérifie les formations exactes auprès de chaque établissement.";
      suggestions.appendChild(note);
      close.slice(0, 12).forEach(function (r) { suggestions.appendChild(createSchoolCard(r, ctx)); });
    } else if (!list.length) {
      var empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML = "<p>Aucune piste fiable avec ces critères. Essaie un domaine plus large, un autre pays, ou retire les contraintes. Si une information manque, EduOrient ne l’invente pas.</p>";
      suggestions.appendChild(empty);
    } else {
      list.forEach(function (r) { suggestions.appendChild(createSchoolCard(r, ctx)); });
    }

    var link = document.querySelector(".orientation-link");
    if (link) {
      var params = new URLSearchParams({ orientation: "true", interest: ctx.interest || "", specialty: ctx.specialty || "", country: ctx.country || "", level: ctx.level || "", budget: ctx.budget || "", type: ctx.prefType || "", diplomaGoal: ctx.diplomaGoal || "" });
      var src = (wantedSpec ? (exactSpec.length ? exactSpec : close) : scored).slice(0, 60);
      if (src.length) params.set("schoolIds", src.map(function (r) { return r.school.id; }).join(","));
      link.href = "index.html?" + params.toString() + "#ecoles";
    }
    resultsEl.hidden = false;
    if (status) status.textContent = "";
    resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderDefinitions(tab) {
    var grid = document.getElementById("definitionsGrid");
    if (!grid) return;
    var defs = (OD().definitions && OD().definitions[tab]) || [];
    grid.innerHTML = defs.map(function (d) {
      return '<article class="ori-card"><h3>' + esc(d.term) + '</h3><p>' + esc(d.def) + '</p><p><strong>Exemple :</strong> ' + esc(d.ex) + '</p><p><strong>À quoi ça sert :</strong> ' + esc(d.use) + '</p><p class="ori-muted"><strong>À vérifier :</strong> ' + esc(d.note) + '</p></article>';
    }).join("");
  }

  function findSchoolsForCareer(career) {
    var keywords = (career.keywords || []).concat([career.name || ""]).map(normalize).filter(function (k) { return k.length >= 3; });
    return allSchools.map(function (s) {
      var p = programsText(s); var t = textOf(s);
      var score = 0; var hits = [];
      keywords.forEach(function (k) { if (p.indexOf(k) >= 0) { score += 5; hits.push(k); } else if (t.indexOf(k) >= 0) { score += 2; if (hits.length < 4) hits.push(k); } });
      if (career.sector === "sante" && /medec|pharm|sante|infirm|soin|biolog/i.test(t)) score += 1;
      return score > 0 ? { school: s, score: score, hits: uniq(hits).slice(0, 4) } : null;
    }).filter(Boolean).sort(function (a, b) { return b.score - a.score; }).slice(0, 8);
  }

  function renderCareerDetail(career) {
    var box = document.getElementById("careerDetail");
    if (!box) return;
    var matches = findSchoolsForCareer(career);
    var schoolsHtml = matches.length ? ('<h4>Établissements dans la base pouvant proposer des formations proches</h4><p class="ori-muted">Présence indicative basée sur les formations/données enregistrées dans EduOrient. Vérifie toujours le programme exact, l’admission et la reconnaissance.</p><div class="ori-grid">' + matches.map(function (m) {
      var img = getSchoolImage(m.school);
      return '<article class="ori-card">' + (img ? '<img class="school-card-image" src="' + attr(img) + '" alt="" loading="lazy" style="height:120px;border-radius:10px" onerror="this.remove()">' : '') +
        '<h4>' + esc(m.school.name) + '</h4><p>' + esc([m.school.city, m.school.country].filter(Boolean).join(" · ")) + '</p>' +
        '<p><strong>Pourquoi ce lien :</strong> formations/données proches de « ' + esc(m.hits.join(", ") || career.name) + ' ». À vérifier.</p>' +
        (m.school.website ? '<p><a class="mini-link" href="' + attr(m.school.website) + '" target="_blank" rel="noopener noreferrer">Site officiel</a></p>' : '') + '</article>';
    }).join("") + '</div>') : '<p class="ori-muted">Aucun établissement ne correspond explicitement à ce métier dans les données actuellement enregistrées. Cela ne signifie pas qu’il n’existe pas de formations : élargis ta recherche dans la base ou vérifie auprès des établissements.</p>';
    box.hidden = false;
    box.innerHTML = '<h3>' + esc(career.name) + '</h3>' +
      '<p>' + esc(career.def) + '</p>' +
      '<div class="ori-meta">' +
      '<p><strong>Missions principales :</strong> ' + esc((career.missions || []).join(" · ")) + '.</p>' +
      '<p><strong>Compétences utiles :</strong> ' + esc((career.skills || []).join(" · ")) + '.</p>' +
      '<p><strong>Matières utiles :</strong> ' + esc((career.subjects || []).join(" · ")) + '.</p>' +
      '<p><strong>Études/formations possibles :</strong> ' + esc((career.studies || []).join(" · ")) + '.</p>' +
      '<p><strong>Diplômes souvent associés :</strong> ' + esc((career.degrees || []).join(" · ")) + '.</p>' +
      '<p><strong>Où on peut travailler :</strong> ' + esc((career.workplaces || []).join(" · ")) + '.</p>' +
      '<p><strong>Évolution possible :</strong> ' + esc(career.evolution || "À vérifier selon le parcours.") + '</p>' +
      '<p class="ori-muted"><strong>Important :</strong> formations, admissions et reconnaissance varient selon les pays. ' + esc(career.caution || "Vérifie les exigences officielles avant de choisir.") + '</p></div>' + schoolsHtml;
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function renderCareers(sector) {
    var grid = document.getElementById("careersGrid");
    if (!grid) return;
    var careers = (OD().careers || []).filter(function (c) { return !sector || sector === "all" || c.sector === sector; });
    grid.innerHTML = careers.map(function (c) {
      return '<article class="ori-card"><h3>' + esc(c.name) + '</h3><p>' + esc(c.def) + '</p><p class="ori-muted"><strong>Études possibles :</strong> ' + esc((c.studies || []).slice(0, 2).join(" · ")) + '</p><button class="inline-link" type="button" data-career-id="' + attr(c.id) + '">Voir le métier et les pistes d’études →</button></article>';
    }).join("");
    grid.querySelectorAll("[data-career-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var career = (OD().careers || []).find(function (c) { return c.id === btn.getAttribute("data-career-id"); });
        if (career) renderCareerDetail(career);
      });
    });
  }

  function renderCareerFilters() {
    var box = document.getElementById("careerFilters");
    if (!box) return;
    var sectors = [{ id: "all", label: "Tous" }].concat(OD().sectors || []);
    box.innerHTML = sectors.map(function (s, i) { return '<button class="ori-chip' + (i === 0 ? ' is-active' : '') + '" type="button" data-sector="' + attr(s.id) + '">' + esc(s.label) + '</button>'; }).join("");
    box.querySelectorAll("[data-sector]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        box.querySelectorAll(".ori-chip").forEach(function (b) { b.classList.remove("is-active"); });
        btn.classList.add("is-active");
        renderCareers(btn.getAttribute("data-sector"));
      });
    });
  }

  function populateCountries() {
    var sel = document.getElementById("studyCountry");
    if (!sel) return;
    var keep = {};
    Array.prototype.forEach.call(sel.options, function (o) { if (o.value) keep[normalize(o.value)] = true; });
    uniq(allSchools.map(function (s) { return s.country; }).filter(Boolean)).sort(function (a, b) { return a.localeCompare(b, "fr"); }).forEach(function (c) {
      if (!keep[normalize(c)]) { var o = document.createElement("option"); o.value = c; o.textContent = c; sel.appendChild(o); }
    });
  }

  function formContext() {
    return {
      level: (document.getElementById("studyLevel") || {}).value || "",
      interest: (document.getElementById("interest") || {}).value || "",
      specialty: (document.getElementById("specialty") || {}).value || "",
      diplomaGoal: (document.getElementById("diplomaGoal") || {}).value || "",
      subjects: (document.getElementById("subjects") || {}).value || "",
      careerGoal: (document.getElementById("careerGoal") || {}).value || "",
      country: (document.getElementById("studyCountry") || {}).value || "",
      prefType: (document.getElementById("institutionType") || {}).value || "",
      budget: (document.getElementById("budget") || {}).value || "inconnu",
      studyMode: (document.getElementById("studyMode") || {}).value || ""
    };
  }

  async function loadSchools() {
    try {
      var core = window.EduOrientCore;
      if (core && typeof core.loadSchools === "function") { allSchools = await core.loadSchools(); return; }
      var res = await fetch(SCHOOLS_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      var data = await res.json();
      allSchools = Array.isArray(data) ? data : [];
    } catch (e) { console.error("Chargement school.json", e); allSchools = []; }
  }

  function initStatic() {
    renderDefinitions("diplomas");
    renderCareerFilters();
    renderCareers("all");
    document.querySelectorAll("[data-def-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll("[data-def-tab]").forEach(function (b) { b.classList.remove("is-active"); b.setAttribute("aria-selected", "false"); });
        btn.classList.add("is-active"); btn.setAttribute("aria-selected", "true");
        renderDefinitions(btn.getAttribute("data-def-tab"));
      });
    });
  }

  document.addEventListener("DOMContentLoaded", async function () {
    initStatic();
    var form = document.getElementById("orientationForm");
    var results = document.getElementById("orientationResults");
    var edit = document.getElementById("editOrientation");
    var explore = document.getElementById("startExplore");
    if (!form) return;
    await loadSchools();
    populateCountries();
    form.addEventListener("reset", function () { if (results) results.hidden = true; var p = document.getElementById("orientationPath"); if (p) p.hidden = true; });
    if (edit) edit.addEventListener("click", function () { if (results) results.hidden = true; form.scrollIntoView({ behavior: "smooth", block: "start" }); });
    if (explore) explore.addEventListener("click", function () {
      var i = document.getElementById("interest"); if (i) i.value = "aucun";
      var c = document.getElementById("studyCountry"); if (c) c.value = "";
      renderResults(formContext());
      var g = document.getElementById("guidedPanel"); if (g) g.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    form.addEventListener("submit", function (e) { e.preventDefault(); renderResults(formContext()); });
    var params = new URLSearchParams(location.search);
    ["studyLevel","interest","specialty","diplomaGoal","subjects","careerGoal","studyCountry","institutionType","budget","studyMode"].forEach(function (k) {
      var el = document.getElementById(k === "studyCountry" ? "studyCountry" : k); var v = params.get(k) || params.get(k === "studyLevel" ? "level" : k === "institutionType" ? "type" : k);
      if (el && v && (el.tagName === "INPUT" || Array.prototype.some.call(el.options || [], function (o) { return o.value === v; }))) el.value = v;
    });
  });
})();
