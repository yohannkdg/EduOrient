let schools = [];
const PROVISIONAL_IMAGE = "images/provisional-school.svg";

const searchInput = document.querySelector("#search");
const citySelect = document.querySelector("#city");
const countrySelect = document.querySelector("#country");
const fieldInput = document.querySelector("#fieldFilter");
const diplomaSelect = document.querySelector("#diploma");
const typeSelect = document.querySelector("#type");
const budgetSelect = document.querySelector("#budgetFilter");
const schoolList = document.querySelector("#school-list");
const resultsCount = document.querySelector("#results-count");
const schoolCount = document.querySelector("#school-count");
const resetButton = document.querySelector("#reset");
const showFavoritesButton = document.querySelector("#show-favorites");
const favoritesCount = document.querySelector("#favorites-count");
const listTitle = document.querySelector("#list-title");
const detailsPage = document.querySelector("#school-details");
const detailsContent = document.querySelector("#school-details-content");
const backButton = document.querySelector("#back-to-schools");
const schoolModal = document.querySelector("#schoolModal");
const schoolDetails = document.querySelector("#schoolDetails");
const closeSchoolModal = document.querySelector("#closeSchoolModal");
const compareButton = document.querySelector("#compare-button");
const compareResults = document.querySelector("#compare-results");

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(v){ return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function escapeAttr(v){ return escapeHtml(v).replace(/'/g,"&#39;"); }

function getSchoolCurrency(school) {
  const map = { "Côte d'Ivoire":"FCFA", "Sénégal":"FCFA", "Maroc":"MAD", "France":"EUR", "Canada":"CAD", "Suisse":"CHF", "États-Unis":"USD" };
  return map[school?.country] || "devise locale";
}

function getDisplayImage(school) {
  const img = (school?.displayImage || school?.image || "").trim();
  return img || PROVISIONAL_IMAGE;
}

function schoolSearchText(school) {
  return [
    school.name, school.city, school.country, school.type, school.address, school.description,
    ...(school.programs || []), ...(school.diplomas || []), ...(school.admission || []),
    ...(school.levels || [])
  ].join(" ");
}

function levenshtein(a,b){ if(a===b) return 0; if(!a.length) return b.length; if(!b.length) return a.length; const m=[]; for(let i=0;i<=b.length;i++){m[i]=[i]} for(let j=0;j<=a.length;j++){m[0][j]=j} for(let i=1;i<=b.length;i++) for(let j=1;j<=a.length;j++) m[i][j]=b[i-1]===a[j-1]?m[i-1][j-1]:Math.min(m[i-1][j-1]+1,m[i][j-1]+1,m[i-1][j]+1); return m[b.length][a.length]; }

function searchScore(query, school){
  const qn = normalize(query); if(!qn) return 0;
  const terms = qn.split(/\s+/).filter(Boolean); if(!terms.length) return 0;
  const name = normalize(school.name), city=normalize(school.country?school.city:school.city), country=normalize(school.country), type=normalize(school.type);
  const programs=normalize((school.programs||[]).join(" ")), diplomas=normalize((school.diplomas||[]).join(" "));
  const text = normalize(schoolSearchText(school));
  let score=0, matched=0;
  if (name.includes(qn)) score += 40;
  else if (text.includes(qn)) score += 18;
  for (const t of terms){
    let hit=0;
    if (name.includes(t)) hit=16;
    else if (programs.includes(t)) hit=12;
    else if (city.includes(t)||country.includes(t)) hit=11;
    else if (diplomas.includes(t)||type.includes(t)) hit=8;
    else if (text.includes(t)) hit=6;
    else if (t.length>=4){
      for (const w of text.split(/\s+/)){
        if(!w) continue;
        if(w.startsWith(t)||t.startsWith(w)){ hit=5; break; }
        if(Math.abs(w.length-t.length)<=2 && levenshtein(w,t)<=1){ hit=4; break; }
      }
    }
    if(hit){ score+=hit; matched++; }
  }
  if (matched===terms.length) score += 14;
  return score;
}

function tuitionValue(school) {
  const fees = Array.isArray(school.feesByLevel) ? school.feesByLevel : [];
  const values = fees.map(f => Number(f?.tuitionFee)).filter(n => Number.isFinite(n) && n > 0);
  return values.length ? Math.min(...values) : null;
}

function hasKnownFees(school) {
  const fees = Array.isArray(school.feesByLevel) ? school.feesByLevel : [];
  return fees.some(f => f && (f.verified === true || !(f.registrationFeeEstimate || f.tuitionFeeEstimate)) && (f.tuitionFee != null || f.registrationFee != null));
}

function populateSelect(select, values, firstLabel) {
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">${firstLabel}</option>`;
  values.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  if (values.includes(current)) select.value = current;
}

function refreshFilterOptions() {
  const selectedCountry = countrySelect?.value || "";
  const source = schools.filter(s => !selectedCountry || (s.country || "") === selectedCountry);
  const countries = [...new Set(schools.map(s => s.country).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr"));
  const cities = [...new Set(source.map(s => s.city).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr"));
  const diplomas = [...new Set(schools.flatMap(s => Array.isArray(s.diplomas) ? s.diplomas : []).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr"));
  populateSelect(countrySelect, countries, "Tous les pays");
  populateSelect(citySelect, cities, "Toutes les villes");
  populateSelect(diplomaSelect, diplomas, "Tous les diplômes");
  if (countrySelect && selectedCountry && countries.includes(selectedCountry)) countrySelect.value = selectedCountry;
}

let showOnlyFavorites = false;
let favoriteIds = JSON.parse(localStorage.getItem("eduorient-favorites") || "[]");
let compareIds = [];

function saveFavorites() {
  localStorage.setItem("eduorient-favorites", JSON.stringify(favoriteIds));
  if (favoritesCount) favoritesCount.textContent = favoriteIds.length;
}

function toggleFavorite(schoolId) {
  const id = Number(schoolId);
  if (favoriteIds.includes(id)) favoriteIds = favoriteIds.filter(v => v !== id);
  else favoriteIds.push(id);
  saveFavorites();
  renderSchools();
}

function updateCompareButton() {
  if (!compareButton) return;
  compareButton.textContent = `Comparer (${compareIds.length}/3)`;
  compareButton.disabled = compareIds.length < 2;
}

function renderComparison() {
  if (!compareResults) return;
  const selected = compareIds.map(id => schools.find(s => Number(s.id) === Number(id))).filter(Boolean);
  if (selected.length < 2) { compareResults.hidden = true; compareResults.innerHTML = ""; return; }
  const cell = v => v == null || v === "" ? "Non renseigné" : escapeHtml(Array.isArray(v)?v.join(", "):v);
  const feesText = school => {
    const fees = Array.isArray(school.feesByLevel) ? school.feesByLevel : [];
    if (!fees.length) return "Tarifs non renseignés";
    return fees.map(fee => {
      const currency = fee.currency || getSchoolCurrency(school);
      const est = fee.registrationFeeEstimate || fee.tuitionFeeEstimate || fee.verified === false;
      const ins = fee.registrationFee == null ? "Non communiqué" : Number(fee.registrationFee).toLocaleString("fr-FR")+" "+currency;
      const tui = fee.tuitionFee == null ? "Non communiqué" : Number(fee.tuitionFee).toLocaleString("fr-FR")+" "+currency;
      return `<div class="compare-fee"><strong>${escapeHtml(fee.level||"Niveau")}</strong><p>Inscription : ${ins}</p><p>Scolarité : ${tui}</p><small>${est ? "Estimation indicative — à confirmer" : "Tarif publié/vérifié"}</small></div>`;
    }).join("");
  };
  const rows = [
    ["Pays / ville", s => `${escapeHtml(s.country||"")} / ${escapeHtml(s.city||"")}`],
    ["Type", s => cell(s.type)],
    ["Formations", s => cell((s.programs||[]).slice(0,8).join(" ; "))],
    ["Diplômes", s => cell(s.diplomas)],
    ["Frais", feesText],
    ["Site officiel", s => s.website ? `<a href="${escapeAttr(s.website)}" target="_blank" rel="noopener noreferrer">Visiter</a>` : "Non renseigné"]
  ];
  compareResults.innerHTML = `
    <div class="compare-results-heading"><h3>Résultat de la comparaison</h3><button type="button" id="close-comparison" class="reset-button">Fermer</button></div>
    <div class="compare-table-wrap"><table class="compare-table"><thead><tr><th>Critères</th>${selected.map(s=>`<th>${escapeHtml(s.name)}</th>`).join("")}</tr></thead><tbody>
      ${rows.map(([label,getter])=>`<tr><th>${label}</th>${selected.map(s=>`<td>${getter(s)}</td>`).join("")}</tr>`).join("")}
    </tbody></table></div>
    <p class="compare-note">Les estimations ne sont pas des tarifs officiels. Vérifie les informations auprès de chaque établissement.</p>`;
  compareResults.hidden = false;
  document.querySelector("#close-comparison")?.addEventListener("click", () => { compareResults.hidden = true; });
}

const orientationParams = new URLSearchParams(window.location.search);
const orientationActive = orientationParams.get("orientation") === "true";
const orientationInterest = orientationParams.get("interest") || "";
const orientationSpecialty = orientationParams.get("specialty") || "";
const orientationCountry = orientationParams.get("country") || "";
const orientationLevel = orientationParams.get("level") || "";
const orientationIds = (orientationParams.get("schoolIds") || "").split(",").map(v=>v.trim()).filter(Boolean);

function matchesOrientation(school) {
  if (!orientationActive) return true;
  if (orientationIds.length) return orientationIds.includes(String(school.id));
  const t = schoolSearchText(school);
  if (orientationCountry && !["pas encore décidé","autre pays"].includes(normalize(orientationCountry))) {
    if (!normalize(school.country).includes(normalize(orientationCountry)) && !normalize(school.address).includes(normalize(orientationCountry))) return false;
  }
  if (orientationSpecialty) {
    const spec = normalize(orientationSpecialty);
    if (spec.length >= 3 && !t.includes(spec)) return false;
  }
  if (orientationInterest && orientationInterest !== "aucun") {
    const map = {
      numerique:["informatique","numerique","digital","logiciel","cybersecurite","reseau","data","web","intelligence artificielle"],
      sante:["medecine","sante","pharmacie","infirm","biologie","dentaire","sage-femme"],
      ingenierie:["ingenieur","genie","mecanique","electrique","civil","btp","energie","industriel"],
      commerce:["commerce","gestion","management","marketing","finance","comptabilite","audit","business"],
      droit:["droit","juridique","science politique","relation internationale"],
      education:["education","enseignement","pedagogie"],
      arts:["art","design","communication","journal","audiovisuel","architecture"],
      environnement:["environnement","agriculture","agronom","ecolog","durable"],
      tourisme:["tourisme","hotellerie","restauration"], transport:["transport","logistique","supply chain"],
      sciences:["mathematique","physique","chimie","science"], langues:["lettre","langue","traduction"],
      social:["sociolog","psycholog","histoire","geograph","sciences humaines","social"]
    };
    const terms = map[orientationInterest] || [];
    if (terms.length && !terms.some(term => t.includes(normalize(term)))) return false;
  }
  return true;
}

function renderSchools() {
  if (!schoolList) return;
  const query = normalize(searchInput?.value);
  const city = citySelect?.value || "";
  const country = countrySelect?.value || "";
  const diploma = diplomaSelect?.value || "";
  const type = typeSelect?.value || "";
  const field = normalize(fieldInput?.value);
  const budget = budgetSelect?.value || "";

  const qCombined = [query, field].filter(Boolean).join(" ").trim();
  let filtered = schools.filter(school => {
    if (city && school.city !== city) return false;
    if (country && (school.country || "") !== country) return false;
    if (diploma && !(school.diplomas || []).includes(diploma)) return false;
    if (type && school.type !== type) return false;
    if (budget === "known" && !hasKnownFees(school)) return false;
    if (budget && budget !== "known") {
      const max = Number(budget);
      const tuition = tuitionValue(school);
      if (tuition == null || tuition > max) return false;
    }
    if (showOnlyFavorites && !favoriteIds.includes(Number(school.id))) return false;
    if (!matchesOrientation(school)) return false;
    return true;
  });
  if (qCombined) {
    filtered = filtered.map(school => ({ school, _score: searchScore(qCombined, school) }))
      .filter(x => x._score > 0)
      .sort((a,b) => b._score - a._score || String(a.school.name).localeCompare(String(b.school.name), "fr"))
      .map(x => x.school);
  } else {
    filtered = filtered.slice().sort((a,b)=>String(a.name).localeCompare(String(b.name),"fr"));
  }

  if (resultsCount) resultsCount.textContent = `${filtered.length} établissement(s) trouvé(s)`;
  if (listTitle) listTitle.textContent = showOnlyFavorites ? "Mes établissements favoris" : (orientationActive ? "Suggestions d'orientation" : "Les établissements");

  if (!filtered.length) {
    schoolList.innerHTML = `<div class="empty-state"><h3>Aucun établissement trouvé</h3><p>Essaie d'autres mots-clés, élargis le pays ou retire un filtre. Si une information manque, elle doit être vérifiée auprès de l'établissement.</p></div>`;
    return;
  }

  schoolList.innerHTML = filtered.map(school => {
    const isFavorite = favoriteIds.includes(Number(school.id));
    const fees = Array.isArray(school.feesByLevel) ? school.feesByLevel : [];
    const img = getDisplayImage(school);
    const imageNote = /provisional-school.svg/i.test(img) ? '<small class="image-note">Image provisoire — photo officielle à confirmer</small>' : '';
    return `
      <article class="school-card">
        <img class="school-image" src="${escapeAttr(img)}" alt="Photo de ${escapeAttr(school.name)}" loading="lazy" onerror="this.onerror=null;this.src='${PROVISIONAL_IMAGE}';">
        ${imageNote}
        <div class="school-top">
          <button class="favorite-button ${isFavorite ? "is-favorite" : ""}" data-favorite-id="${school.id}" aria-label="Ajouter ou retirer des favoris" type="button">${isFavorite ? "❤️" : "♡"}</button>
          <span class="school-type">${escapeHtml(school.type || "Type à confirmer")}</span>
          <label class="compare-choice"><input type="checkbox" class="compare-checkbox" data-compare-id="${school.id}" ${compareIds.includes(Number(school.id)) ? "checked" : ""}> Comparer</label>
        </div>
        <h3>${escapeHtml(school.name)}</h3>
        <p class="school-city">📍 ${escapeHtml([school.city, school.country].filter(Boolean).join(", ") || "Localisation à confirmer")}</p>
        <p class="school-description">${escapeHtml(school.description || "Description à compléter et à vérifier.")}</p>
        <div class="tags">${(school.programs||[]).slice(0,4).map(i=>`<span class="tag">${escapeHtml(i)}</span>`).join("")}</div>
        <div class="school-bottom">
          <div class="school-fees"><small>Frais de scolarité</small><p>${escapeHtml(formatFeeSummary(school))}</p></div>
          <button class="details-button" data-school-id="${school.id}" type="button">Voir la fiche →</button>
        </div>
      </article>`;
  }).join("");
}

function formatFeeSummary(school) {
  const fees = Array.isArray(school.feesByLevel) ? school.feesByLevel : [];
  if (!fees.length) return "Tarifs non renseignés — à confirmer.";
  const f = fees.find(x => x && x.tuitionFee != null) || fees[0];
  const cur = f.currency || getSchoolCurrency(school);
  const est = f.registrationFeeEstimate || f.tuitionFeeEstimate || f.verified === false;
  const val = f.tuitionFee != null ? Number(f.tuitionFee).toLocaleString("fr-FR")+" "+cur : "à confirmer";
  return (est ? "Estimation indicative : " : "Scolarité : ")+val;
}

function renderSchoolFees(school) {
  const fees = Array.isArray(school.feesByLevel) ? school.feesByLevel : [];
  if (!fees.length) return `<p>Tarifs non renseignés pour le moment. Contactez l'établissement pour obtenir une grille officielle.</p>`;
  return fees.map(fee => {
    const currency = fee.currency || getSchoolCurrency(school);
    const reg = fee.registrationFee == null ? "Non communiqué" : Number(fee.registrationFee).toLocaleString("fr-FR")+" "+currency;
    const tui = fee.tuitionFee == null ? "Non communiqué" : Number(fee.tuitionFee).toLocaleString("fr-FR")+" "+currency;
    const est = fee.registrationFeeEstimate || fee.tuitionFeeEstimate || fee.verified === false;
    const source = fee.source && /^https?:\/\//i.test(fee.source) ? `<p><a href="${escapeAttr(fee.source)}" target="_blank" rel="noopener noreferrer">Source / site à consulter</a></p>` : "";
    return `<div class="fee-card"><h4>${escapeHtml(fee.level||"Niveau")}</h4><p><strong>Année :</strong> ${escapeHtml(fee.academicYear||"Non précisée")}</p><p><strong>Inscription :</strong> ${reg}</p><p><strong>Scolarité :</strong> ${tui}</p><p><strong>Période :</strong> ${escapeHtml(fee.period||"À confirmer")}</p><p class="${est?'fee-status fee-estimated':'fee-status fee-verified'}">${est?'⚠️ Estimation indicative — montant non confirmé par l\'établissement.':'✓ Tarif publié/vérifié selon la source indiquée.'}</p>${source}</div>`;
  }).join("");
}

function openSchoolModal(schoolId) {
  if (!schoolModal || !schoolDetails) return;
  const school = schools.find(item => Number(item.id) === Number(schoolId));
  if (!school) return;
  const img = getDisplayImage(school);
  const provisional = /provisional-school.svg/i.test(img);
  schoolDetails.innerHTML = `
    <img class="school-detail-image" src="${escapeAttr(img)}" alt="Photo de ${escapeAttr(school.name)}" onerror="this.onerror=null;this.src='${PROVISIONAL_IMAGE}';">
    ${provisional ? '<p class="image-note">Image provisoire clairement identifiée : aucune photo officielle fiable n\'a pas encore été confirmée pour cette fiche.</p>' : (school.imageSource ? '<p class="image-note">Source image : ' + escapeHtml(school.imageSource) + '</p>' : '<p class="image-note">Image du catalogue — source à confirmer.</p>')}
    <h2 class="school-detail-title">${escapeHtml(school.name)}</h2>
    <div class="school-detail-badges">
      <span class="school-detail-badge">${escapeHtml(school.type||"Type à confirmer")}</span>
      <span class="school-detail-badge">${escapeHtml([school.city, school.country].filter(Boolean).join(", "))}</span>
    </div>
    <div class="school-detail-section"><h3>Présentation</h3><p>${escapeHtml(school.description||"Description à compléter.")}</p></div>
    <div class="school-detail-section"><h3>Formations / filières proposées</h3><ul>${(school.programs||[]).map(i=>`<li>${escapeHtml(i)}</li>`).join("") || "<li>Informations à vérifier auprès de l'établissement.</li>"}</ul></div>
    <div class="school-detail-section"><h3>Diplômes accessibles</h3><ul>${(school.diplomas||[]).map(i=>`<li>${escapeHtml(i)}</li>`).join("") || "<li>Informations à vérifier.</li>"}</ul></div>
    <div class="school-detail-section"><h3>Conditions d'admission</h3><ul>${(school.admission||[]).map(i=>`<li>${escapeHtml(i)}</li>`).join("") || "<li>À vérifier auprès de l'établissement.</li>"}</ul></div>
    <div class="school-detail-section"><h3>Frais d'inscription et de scolarité</h3>${renderSchoolFees(school)}</div>
    <div class="school-detail-section"><h3>Adresse et contact</h3><p>${escapeHtml(school.address||"Adresse non renseignée.")}</p><p>${escapeHtml(school.phone||"Téléphone non renseigné.")}</p>
      ${school.website ? `<p><a href="${escapeAttr(school.website)}" target="_blank" rel="noopener noreferrer">Site officiel</a></p>` : ""}
    </div>
    <div class="school-detail-section"><h3>Fiabilité des données</h3><p>${escapeHtml(school.verification?.note || "Informations à vérifier avant toute décision.")}</p><p>Dernière vérification catalogue : ${escapeHtml(school.verification?.lastChecked || "non indiquée")}.</p></div>
    <div class="school-detail-actions">
      <button type="button" id="modalFavoriteButton">${favoriteIds.includes(Number(school.id)) ? "❤️ Retirer des favoris" : "♡ Ajouter aux favoris"}</button>
      <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent((school.address||school.city||school.name)+", "+(school.country||""))}" target="_blank" rel="noopener noreferrer">📍 Itinéraire</a>
    </div>`;
  schoolModal.hidden = false;
  schoolModal.style.display = "flex";
  document.querySelector("#modalFavoriteButton")?.addEventListener("click", () => { toggleFavorite(school.id); openSchoolModal(school.id); });
}

function closeSchoolDetailsModal() {
  if (!schoolModal) return;
  schoolModal.hidden = true;
  schoolModal.style.display = "none";
}
closeSchoolModal?.addEventListener("click", closeSchoolDetailsModal);
schoolModal?.addEventListener("click", (e) => { if (e.target === schoolModal) closeSchoolDetailsModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && schoolModal && !schoolModal.hidden) closeSchoolDetailsModal(); });

schoolList?.addEventListener("click", (event) => {
  const fav = event.target.closest("[data-favorite-id]");
  if (fav) { toggleFavorite(fav.dataset.favoriteId); return; }
  const details = event.target.closest("[data-school-id]");
  if (details) openSchoolModal(details.dataset.schoolId);
});
schoolList?.addEventListener("change", (event) => {
  const checkbox = event.target.closest(".compare-checkbox");
  if (!checkbox) return;
  const id = Number(checkbox.dataset.compareId);
  if (checkbox.checked) {
    if (compareIds.length >= 3) { checkbox.checked = false; alert("Tu peux comparer 3 établissements au maximum."); return; }
    if (!compareIds.includes(id)) compareIds.push(id);
  } else compareIds = compareIds.filter(v => v !== id);
  updateCompareButton();
});

function resetFilters() {
  if (searchInput) searchInput.value = "";
  if (countrySelect) countrySelect.value = "";
  refreshFilterOptions();
  if (citySelect) citySelect.value = "";
  if (diplomaSelect) diplomaSelect.value = "";
  if (typeSelect) typeSelect.value = "";
  if (fieldInput) fieldInput.value = "";
  if (budgetSelect) budgetSelect.value = "";
  renderSchools();
}

[searchInput, fieldInput].forEach(el => el?.addEventListener("input", function(){ renderSchools(); if(typeof renderSearchSuggestions==="function") renderSearchSuggestions(); }));
[countrySelect, citySelect, diplomaSelect, typeSelect, budgetSelect].forEach(el => el?.addEventListener("change", () => {
  if (el === countrySelect) refreshFilterOptions();
  renderSchools();
}));
resetButton?.addEventListener("click", resetFilters);
compareButton?.addEventListener("click", renderComparison);
showFavoritesButton?.addEventListener("click", () => {
  showOnlyFavorites = !showOnlyFavorites;
  showFavoritesButton.classList.toggle("is-active", showOnlyFavorites);
  renderSchools();
});
backButton?.addEventListener("click", () => { if(detailsPage) detailsPage.hidden = true; if(schoolList) schoolList.hidden = false; schoolList?.scrollIntoView({behavior:"smooth"}); });

saveFavorites();
updateCompareButton();

fetch("./school.json", { cache: "no-store" })
  .then(r => { if (!r.ok) throw new Error("Impossible de charger school.json"); return r.json(); })
  .then(data => {
    schools = Array.isArray(data) ? data : [];
    if (schoolCount) schoolCount.textContent = schools.length;
    refreshFilterOptions();
    // orientation prefill
    if (orientationActive) {
      if (countrySelect && orientationCountry && !["Pas encore décidé","Autre pays"].includes(orientationCountry)) {
        const match = [...countrySelect.options].find(o => normalize(o.value)===normalize(orientationCountry));
        if (match) countrySelect.value = match.value;
        refreshFilterOptions();
      }
      if (fieldInput && orientationSpecialty) fieldInput.value = orientationSpecialty;
      const sect = document.querySelector("#ecoles");
      sect?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    renderSchools();
  })
  .catch(error => {
    console.error("Erreur de chargement :", error);
    if (schoolList) schoolList.innerHTML = `<div class="empty-state"><h3>Chargement impossible</h3><p>Vérifie le fichier school.json.</p></div>`;
  });

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(err => console.warn("Service Worker:", err));
  });
}

const backToTopButton = document.querySelector("#back-to-top");
if (backToTopButton) {
  const update = () => backToTopButton.classList.toggle("visible", window.scrollY > 300);
  window.addEventListener("scroll", update, { passive: true });
  update();
  backToTopButton.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

(function(){
  function renderSearchSuggestions(){
    var box=document.querySelector('#search-suggestions'); if(!box||typeof searchInput==='undefined'||!searchInput) return;
    var q=(searchInput.value||'').trim(); if(q.length<2){ box.hidden=true; box.innerHTML=''; searchInput.setAttribute('aria-expanded','false'); return; }
    var items=schools.map(function(s){return {s:s,score:searchScore(q,s)};}).filter(function(x){return x.score>0;}).sort(function(a,b){return b.score-a.score;}).slice(0,8);
    if(!items.length){ box.hidden=true; box.innerHTML=''; searchInput.setAttribute('aria-expanded','false'); return; }
    box.innerHTML=items.map(function(x){var s=x.s; return '<button type="button" class="search-suggestion" data-id="'+s.id+'"><strong>'+escapeHtml(s.name)+'</strong><small>'+escapeHtml([s.city,s.country].filter(Boolean).join(', '))+'</small></button>';}).join('');
    box.hidden=false; searchInput.setAttribute('aria-expanded','true');
    box.querySelectorAll('[data-id]').forEach(function(btn){btn.addEventListener('click',function(){ if(typeof openSchoolModal==='function') openSchoolModal(btn.dataset.id); box.hidden=true; });});
  }
  // merged search suggestion listener
  document.addEventListener('click', function(e){ var box=document.querySelector('#search-suggestions'); if(box && !e.target.closest('.search-field')) box.hidden=true; });
})();
