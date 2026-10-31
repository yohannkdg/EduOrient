let schools = [];



// ===============================
// ÉLÉMENTS DE LA PAGE
// ===============================

const searchInput = document.querySelector("#search");
const citySelect = document.querySelector("#city");
const countrySelect = document.querySelector("#country");

function getSchoolCurrency(school) {
  const country = school?.country || "Côte d'Ivoire";
  const currencies = {
    "Côte d'Ivoire": "FCFA",
    "Sénégal": "FCFA",
    "Maroc": "MAD",
    "France": "EUR",
    "Canada": "CAD",
    "Suisse": "CHF",
    "États-Unis": "USD"
  };
  return currencies[country] || "—";
}

function updateCityOptions() {
  const selectedCountry = countrySelect.value;

  const cities = [...new Set(
    schools
      .filter(school =>
        !selectedCountry ||
        (school.country || "Côte d'Ivoire") === selectedCountry
      )
      .map(school => school.city)
      .filter(Boolean)
  )].sort();

  const currentCity = citySelect.value;

  citySelect.innerHTML = '<option value="">Toutes les villes</option>';

  cities.forEach(city => {
    const option = document.createElement("option");
    option.value = city;
    option.textContent = city;
    citySelect.appendChild(option);
  });

  if (cities.includes(currentCity)) {
    citySelect.value = currentCity;
  }
}

const diplomaSelect = document.querySelector("#diploma");
const typeSelect = document.querySelector("#type");
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
console.log("Fenêtre :", schoolModal);
console.log("Zone de détails :", schoolDetails);
console.log("Bouton fermer :", closeSchoolModal);



// ===============================
// FAVORIS
// ===============================

let showOnlyFavorites = false;

let favoriteIds = JSON.parse(
  localStorage.getItem("eduorient-favorites") || "[]"
);


function saveFavorites() {
  localStorage.setItem(
    "eduorient-favorites",
    JSON.stringify(favoriteIds)
  );

  favoritesCount.textContent = favoriteIds.length;
}


function toggleFavorite(schoolId) {
  const id = Number(schoolId);

  if (favoriteIds.includes(id)) {
    favoriteIds = favoriteIds.filter(
      (favoriteId) => favoriteId !== id
    );
  } else {
    favoriteIds.push(id);
  }

  saveFavorites();
 renderSchools();
}


// ===============================
// AFFICHER LES ÉTABLISSEMENTS
// ===============================


let compareIds = [];

const compareButton = document.querySelector("#compare-button");
const compareResults = document.querySelector("#compare-results");

function updateCompareButton() {
  if (!compareButton) return;
  compareButton.textContent = `Comparer (${compareIds.length}/3)`;
  compareButton.disabled = compareIds.length < 2;
}

function renderComparison() {
  if (!compareResults) return;
  const selected = compareIds
    .map(id => schools.find(school => Number(school.id) === Number(id)))
    .filter(Boolean);

  if (selected.length < 2) {
    compareResults.hidden = true;
    compareResults.innerHTML = "";
    return;
  }

  const cell = (value) => value == null || value === "" ? "Non renseigné" : value;
  const feesText = (school) => {
    const fees = Array.isArray(school.feesByLevel) ? school.feesByLevel : [];
    if (!fees.length) return "Tarifs non renseignés";
    return fees.map(fee => {
      const currency = fee.currency || getSchoolCurrency(school);
      const inscription = fee.registrationFee == null
        ? "Non communiqué"
        : `${Number(fee.registrationFee).toLocaleString("fr-FR")} ${currency}`;
      const tuition = fee.tuitionFee == null
        ? "Non communiqué"
        : `${Number(fee.tuitionFee).toLocaleString("fr-FR")} ${currency}`;
      const estimate = fee.registrationFeeEstimate || fee.tuitionFeeEstimate || fee.verified === false;
      return `<div class="compare-fee">
        <strong>${cell(fee.level)}</strong>
        <p>Inscription : ${inscription}</p>
        <p>Scolarité : ${tuition}</p>
        <small>${estimate ? "Estimation indicative — à confirmer" : "Tarif publié / vérifié"}</small>
      </div>`;
    }).join("");
  };

  const rows = [
    ["Pays / ville", s => `${cell(s.country || "Côte d'Ivoire")} / ${cell(s.city)}`],
    ["Type", s => cell(s.type)],
    ["Diplômes", s => (s.diplomas || []).join(", ") || "Non renseigné"],
    ["Formations", s => (s.programs || []).join(", ") || "Non renseigné"],
    ["Frais", feesText],
    ["Site officiel", s => s.website
      ? `<a href="${s.website}" target="_blank" rel="noopener noreferrer">Visiter le site</a>`
      : "Non renseigné"],
    ["Adresse", s => cell(s.address)],
    ["Téléphone", s => cell(s.phone)]
  ];

  compareResults.innerHTML = `
    <div class="compare-results-heading">
      <h3>Résultat de la comparaison</h3>
      <button type="button" id="close-comparison" class="reset-button">Fermer</button>
    </div>
    <div class="compare-table-wrap">
      <table class="compare-table">
        <thead><tr><th>Critères</th>${selected.map(s => `<th>${cell(s.name)}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.map(([label, getter]) => `
            <tr><th>${label}</th>${selected.map(s => `<td>${getter(s)}</td>`).join("")}</tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    <p class="compare-note">Les estimations ne sont pas des tarifs officiels. Vérifie les informations auprès de chaque établissement.</p>
  `;
  compareResults.hidden = false;
  document.querySelector("#close-comparison")?.addEventListener("click", () => {
    compareResults.hidden = true;
  });
}

if (schoolList) {
  schoolList.addEventListener("change", (event) => {
    const checkbox = event.target.closest(".compare-checkbox");
    if (!checkbox) return;
    const id = Number(checkbox.dataset.compareId);
    if (checkbox.checked) {
      if (compareIds.length >= 3) {
        checkbox.checked = false;
        alert("Tu peux comparer 3 établissements au maximum.");
        return;
      }
      if (!compareIds.includes(id)) compareIds.push(id);
    } else {
      compareIds = compareIds.filter(value => value !== id);
    }
    updateCompareButton();
  });
}

compareButton?.addEventListener("click", renderComparison);
// ===============================
// FILTRES TRANSMIS PAR MON ORIENTATION
// ===============================

const orientationParams = new URLSearchParams(window.location.search);

const orientationActive =
  orientationParams.get("orientation") === "true";

const orientationInterest = orientationParams.get("interest") || "";
const orientationCountry = orientationParams.get("country") || "";
const orientationLevel = orientationParams.get("level") || "";

function normalizeOrientationText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const orientationKeywords = {
  numerique: [
    "informatique", "numerique", "digital", "developpement",
    "programmation", "cybersecurite", "reseaux", "intelligence artificielle",
    "data", "donnees", "logiciel", "systeme informatique", "web"
  ],
  sante: [
    "medecine", "sante", "pharmacie", "infirmier", "biologie",
    "sciences du vivant", "laboratoire", "dentaire", "soins"
  ],
  ingenierie: [
    "ingenierie", "ingenieur", "genie", "electronique", "energie",
    "mecanique", "informatique industrielle", "mathematiques",
    "technologie", "construction"
  ],
  commerce: [
    "commerce", "gestion", "management", "comptabilite", "marketing",
    "finance", "entrepreneuriat", "ressources humaines", "logistique",
    "business", "strategie digitale"
  ],
  droit: [
    "droit", "juridique", "sciences politiques", "relations internationales",
    "diplomatie", "administration publique"
  ],
  education: [
    "education", "enseignement", "pedagogie", "formation",
    "psychologie", "professorat"
  ],
  arts: [
    "art", "design", "communication", "graphisme", "audiovisuel",
    "cinema", "musique", "media", "creation"
  ],
  environnement: [
    "environnement", "agriculture", "agronomie", "developpement durable",
    "biodiversite", "eau", "foresterie", "ressources naturelles"
  ]
};

function matchesOrientation(school) {
  if (!orientationActive) return true;

  const params = new URLSearchParams(window.location.search);
  const schoolIds = params.get("schoolIds");

  if (schoolIds !== null) {
    const selectedIds = schoolIds
      .split(",")
      .map(id => id.trim());

    return selectedIds.includes(String(school.id));
  }

  // Vérifier le domaine choisi
  const keywords = orientationKeywords[orientationInterest] || [];

  const schoolText = normalizeOrientationText([
    school.name || "",
    school.description || "",
    ...(school.programs || []),
    ...(school.diplomas || [])
  ].join(" "));

  const matchesInterest =
    orientationInterest === "aucun" ||
    keywords.some(keyword =>
      schoolText.includes(normalizeOrientationText(keyword))
    );

  // Vérifier le pays choisi
  const selectedCountry = normalizeOrientationText(orientationCountry);
  const schoolCountry = normalizeOrientationText(
    `${school.country || ""} ${school.address || ""}`
  );

  const matchesOrientationCountry =
    !selectedCountry ||
    selectedCountry === "pas encore decide" ||
    selectedCountry === "autre pays" ||
    schoolCountry.includes(selectedCountry);

  // Vérifier le niveau d'études
  const diplomas = normalizeOrientationText(
    (school.diplomas || []).join(" ")
  );

  const programs = normalizeOrientationText(
    (school.programs || []).join(" ")
  );

  let matchesOrientationLevel = true;

  if (orientationLevel === "bac") {
    matchesOrientationLevel =
      diplomas.includes("bac") ||
      diplomas.includes("baccalaureat") ||
      programs.includes("bachelor") ||
      programs.includes("licence");
  }

  if (orientationLevel === "superieur") {
    matchesOrientationLevel =
      programs.includes("master") ||
      programs.includes("doctorat") ||
      programs.includes("bac+") ||
      programs.includes("licence");
  }

  return (
    matchesInterest &&
    matchesOrientationCountry &&
    matchesOrientationLevel
  );
}
function renderSchools() {
  const query = searchInput.value.trim().toLowerCase();
  const city = citySelect.value;
  const country = countrySelect.value;
  const diploma = diplomaSelect.value;
  const type = typeSelect.value;
  console.log("Nombre d'établissements chargés :", schools.length);
console.log("Favoris uniquement :", showOnlyFavorites);

  const filteredSchools = schools.filter((school) => {

    const searchableText = [
      school.name,
      school.city,
      school.type,
      ...school.programs,
      ...school.diplomas
    ]
      .join(" ")
      .toLowerCase();

    const matchesQuery =
      searchableText.includes(query);

    const matchesCity =
      !city || school.city === city;
      const schoolCountry = school.country || "Côte d'Ivoire";

const matchesCountry =
  !country || schoolCountry === country;

    const matchesDiploma =
      !diploma || school.diplomas.includes(diploma);

    const matchesType =
      !type || school.type === type;

    const matchesFavorite =
      !showOnlyFavorites ||
      favoriteIds.includes(school.id);
      const matchesOrientationCriteria =
  matchesOrientation(school);

 return (
  matchesQuery &&
  matchesCity &&
  matchesCountry &&
  matchesDiploma &&
  matchesType &&
  matchesFavorite &&
  matchesOrientationCriteria
);
  });


  resultsCount.textContent =
    `${filteredSchools.length} établissement(s) trouvé(s)`;


  listTitle.textContent =
    showOnlyFavorites
      ? "Mes établissements favoris"
      : "Les établissements";


  if (filteredSchools.length === 0) {

    schoolList.innerHTML = `
      <div class="empty-state">
        <h3>Aucun établissement trouvé</h3>
        <p>
          Essaie d'autres mots-clés ou modifie les filtres.
        </p>
      </div>
    `;

    return;
  }


  schoolList.innerHTML = filteredSchools
    .map((school) => {

      const isFavorite =
        favoriteIds.includes(school.id);
        const fees = Array.isArray(school.feesByLevel)
  ? school.feesByLevel
  : [];

      return `
        <article class="school-card">
        
${school.image ? `
  <img
    class="school-image"
    src="${school.image}"
    alt="Photo de ${school.name}"
    onerror="this.style.display='none'"
  >
` : ""}


          <div class="school-top">

            

            <button
              class="favorite-button ${
                isFavorite ? "is-favorite" : ""
              }"
              data-favorite-id="${school.id}"
              aria-label="Ajouter ou retirer des favoris"
            >
              ${isFavorite ? "❤️" : "♡"}
            </button>

            <span class="school-type">
              ${school.type}
            </span>

            <label class="compare-choice">
              <input
                type="checkbox"
                class="compare-checkbox"
                data-compare-id="${school.id}"
                ${compareIds.includes(Number(school.id)) ? "checked" : ""}
              >
              Comparer
            </label>

          </div>


          <h3>
            ${school.name}
          </h3>


          <p class="school-city">
            📍 ${school.city}, ${school.country || "Côte d'Ivoire"}
          </p>


          <p class="school-description">
            ${school.description}
          </p>


          <div class="tags">

            ${school.diplomas
              .map(
                (item) =>
                  `<span class="tag">${item}</span>`
              )
              .join("")}

          </div>


          <div class="tags">

            ${school.programs
              .map(
                (item) =>
                  `<span class="tag">${item}</span>`
              )
              .join("")}

          </div>


          <div class="school-bottom">

            <div class="school-fees">

  <small>Frais de scolarité</small>

  ${
   
fees.length === 0
  ? "<p>Tarifs à confirmer</p>"
  : fees.map((fee) => `
      <div class="fee-item">
        <strong>${fee.level || "Niveau non précisé"}</strong>

        <p>
          ${
            fee.tuitionFee == null
              ? "Frais de scolarité : à confirmer"
              : "Frais de scolarité : " +
                Number(fee.tuitionFee).toLocaleString("fr-FR") +
                " " + (fee.currency || getSchoolCurrency(school))
          }
        </p>

        ${
          fee.registrationFee != null
            ? `<p>Frais d'inscription : ${
                Number(fee.registrationFee).toLocaleString("fr-FR")
              } ${fee.currency || getSchoolCurrency(school)}</p>`
            : ""
        }

        ${
          fee.totalPayable != null
            ? `<p>Total indiqué : ${
                Number(fee.totalPayable).toLocaleString("fr-FR")
              } ${fee.currency || getSchoolCurrency(school)}</p>`
            : ""
        }

        ${
          fee.period
            ? `<small>Période : ${fee.period}</small>`
            : ""
        }

        ${
          fee.academicYear
            ? `<small>Année scolaire ou universitaire : ${fee.academicYear}</small>`
            : ""
        }

        ${
          fee.verified === false
            ? "<p><small>Montant à vérifier auprès de l'établissement.</small></p>"
            : ""
        }
      </div>
    `).join("")

  }

</div>


            <button
              class="details-button"
              data-school-id="${school.id}"
            >
              Voir la fiche →
            </button>

          </div>

        </article>
      `;
    })
    .join("");
}


// ===============================
// INITIALISATION
// ===============================

saveFavorites();

schoolCount.textContent = schools.length;


// ===============================
// FILTRES
// ===============================

function resetFilters() {

  searchInput.value = "";
  citySelect.value = "";
  countrySelect.value = "";
  diplomaSelect.value = "";
  typeSelect.value = "";

  renderSchools();
}


searchInput.addEventListener(
  "input",
  renderSchools
);

citySelect.addEventListener(
  "change",
  renderSchools
);
countrySelect.addEventListener("change", () => {
  updateCityOptions();
  renderSchools();
});

diplomaSelect.addEventListener(
  "change",
  renderSchools
);

typeSelect.addEventListener(
  "change",
  renderSchools
);

resetButton.addEventListener(
  "click",
  resetFilters
);


function renderSchoolFees(school) {
  const fees = Array.isArray(school.feesByLevel) ? school.feesByLevel : [];
  if (!fees.length) {
    return `<p>Tarifs non renseignés pour le moment. Contactez l'établissement pour obtenir une grille officielle.</p>`;
  }

  return fees.map((fee) => {
    const currency = fee.currency || getSchoolCurrency(school);
    const registration = fee.registrationFee == null
      ? "Non communiqué"
      : `${Number(fee.registrationFee).toLocaleString("fr-FR")} ${currency}`;
    const tuition = fee.tuitionFee == null
      ? "Non communiqué"
      : `${Number(fee.tuitionFee).toLocaleString("fr-FR")} ${currency}`;
    const estimated = fee.registrationFeeEstimate || fee.tuitionFeeEstimate || fee.verified === false;
    const label = estimated
      ? `<p class="fee-status fee-estimated">⚠️ Estimation indicative — à confirmer auprès de l'établissement.</p>`
      : `<p class="fee-status fee-verified">✓ Tarif publié / vérifié</p>`;
    const source = fee.source && /^https?:\/\//i.test(fee.source)
      ? `<a href="${fee.source}" target="_blank" rel="noopener noreferrer">Consulter la source</a>`
      : "";
    return `
      <div class="fee-card">
        <h4>${fee.level || "Niveau non précisé"}</h4>
        <p><strong>Année :</strong> ${fee.academicYear || "Non précisée"}</p>
        <p><strong>Frais d'inscription :</strong> ${registration}</p>
        <p><strong>Frais de scolarité :</strong> ${tuition}</p>
        <p><strong>Période :</strong> ${fee.period || "À confirmer"}</p>
        ${label}
        ${fee.status ? `<p>${fee.status}</p>` : ""}
        ${source}
      </div>
    `;
  }).join("");
}

function openSchoolModal(schoolId) {
  const school = schools.find(
    (item) => item.id === Number(schoolId)
  );

  if (!school) return;

  schoolDetails.innerHTML = `
    <h2 class="school-detail-title">${school.name}</h2>

    <div class="school-detail-badges">
      <span class="school-detail-badge">${school.type}</span>
      <span class="school-detail-badge">${school.city}</span>
    </div>

    <div class="school-detail-section">
      <h3>À propos de l'établissement</h3>
      <p>${school.description || "Description non renseignée."}</p>
    </div>

    <div class="school-detail-section">
      <h3>Formations proposées</h3>
      <ul>
        ${(school.programs || []).map(item => `<li>${item}</li>`).join("") || "<li>Informations non renseignées.</li>"}
      </ul>
    </div>

    <div class="school-detail-section">
      <h3>Diplômes concernés</h3>
      <ul>
        ${(school.diplomas || []).map(item => `<li>${item}</li>`).join("") || "<li>Informations non renseignées.</li>"}
      </ul>
    </div>

    <div class="school-detail-section">
      <h3>Conditions d'admission</h3>
      <ul>
        ${(school.admission || []).map(item => `<li>${item}</li>`).join("") || "<li>À confirmer auprès de l'établissement.</li>"}
      </ul>
    </div>

    <div class="school-detail-section">
      <h3>Frais d'inscription et de scolarité</h3>
      ${renderSchoolFees(school)}
    </div>

    <div class="school-detail-section">
      <h3>Adresse et contact</h3>
      <p>${school.address || "Adresse non renseignée."}</p>
      <p>${school.phone || "Téléphone non renseigné."}</p>
    </div>

    <div class="school-detail-actions">
    <button
  type="button"
  id="modalFavoriteButton"
>
  ♡ Ajouter aux favoris
</button>
      <a
        href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent((school.address || school.city) + ', ' + (school.country || "Côte d'Ivoire"))}"
        target="_blank"
        rel="noopener noreferrer"
      >
        📍 Voir l'itinéraire
      </a>
    </div>
  `;

  schoolModal.hidden = false;
schoolModal.style.display = "flex";
const modalFavoriteButton = document.querySelector("#modalFavoriteButton");

function updateModalFavoriteButton() {
  modalFavoriteButton.textContent = favoriteIds.includes(school.id)
    ? "❤️ Retirer des favoris"
    : "♡ Ajouter aux favoris";
}

updateModalFavoriteButton();

modalFavoriteButton.addEventListener("click", () => {
  toggleFavorite(school.id);
  updateModalFavoriteButton();
});
}


function closeSchoolDetailsModal() {
  schoolModal.hidden = true;
  schoolModal.style.display = "none";
}

closeSchoolModal.addEventListener("click", closeSchoolDetailsModal);

schoolModal.addEventListener("click", (event) => {
  if (event.target === schoolModal) {
    closeSchoolDetailsModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !schoolModal.hidden) {
    closeSchoolDetailsModal();
  }
});




// ===============================
// FICHE D'UN ÉTABLISSEMENT
// ===============================

function showSchoolDetails(schoolId) {


  const school = schools.find(
    (item) => item.id === Number(schoolId)
  );

  if (!school) return;


  schoolList.hidden = true;
  detailsPage.hidden = false;


  detailsContent.innerHTML = `

    <div class="detail-header">

      <span class="school-type">
        ${school.type}
      </span>

      <h2>
        ${school.name}
      </h2>

      <p>
        📍 ${school.city}, ${school.country || "Côte d'Ivoire"}
      </p>

      <p class="detail-description">
        ${school.description}
      </p>

    </div>


    <div class="detail-section">

      <h3>
        Formations proposées
      </h3>

      <div class="tags">

        ${school.programs
          .map(
            (program) =>
              `<span class="tag">${program}</span>`
          )
          .join("")}

      </div>

    </div>


    <div class="detail-section">

      <h3>
        Diplômes concernés
      </h3>

      <div class="tags">

        ${school.diplomas
          .map(
            (diploma) =>
              `<span class="tag">${diploma}</span>`
          )
          .join("")}

      </div>

    </div>


    <div class="detail-section">

      <h3>
        Conditions d'admission
      </h3>

      <ul class="detail-list">

        ${school.admission
          .map(
            (item) =>
              `<li>${item}</li>`
          )
          .join("")}

      </ul>

    </div>


    <div class="detail-section">

      <h3>
        Frais de scolarité
      </h3>

      <p>

        ${
          school.price === null
            ? "Montant non renseigné : à confirmer auprès de l'établissement."
            : school.price.toLocaleString("fr-FR") +
              " " + getSchoolCurrency(school)
        }

      </p>

    </div>


    <div class="detail-section">

      <h3>Adresse et contact</h3>

      <p>${school.address}</p>

      <p>
        ${school.phone || "Téléphone non renseigné"}
      </p>

    </div>

    <div class="detail-actions">

      <button
        class="favorite-detail-button"
        data-detail-favorite="${school.id}"
      >
        ${
          favoriteIds.includes(school.id)
            ? "❤️ Retirer des favoris"
            : "♡ Ajouter aux favoris"
        }
      </button>

      <a
        class="route-button"
        href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(school.address + ', ' + school.city + ', Côte d’Ivoire')}"
        target="_blank"
        rel="noopener noreferrer"
      >
        📍 Voir l'itinéraire
      </a>

    </div>

  `;

   
  


  detailsPage.scrollIntoView({
    behavior: "smooth"
  });
 
detailsContent.querySelector(
  "[data-detail-favorite]"
).addEventListener("click", () => {
  toggleFavorite(school.id);
  showSchoolDetails(school.id);
});

}


// ===============================
// CLICS SUR LES ÉTABLISSEMENTS
// ===============================

schoolList.addEventListener(
  "click",
  (event) => {

    const favoriteButton =
      event.target.closest(
        "[data-favorite-id]"
      );


    if (favoriteButton) {

      toggleFavorite(
        favoriteButton.dataset.favoriteId
      );

      return;
    }


    const detailsButton =
      event.target.closest(
        "[data-school-id]"
      );


    if (detailsButton) {
  openSchoolModal(
    detailsButton.dataset.schoolId
  );
}

  }
);


// ===============================
// BOUTON FAVORIS
// ===============================

showFavoritesButton.addEventListener(
  "click",
  () => {

    showOnlyFavorites =
      !showOnlyFavorites;


    showFavoritesButton.classList.toggle(
      "is-active",
      showOnlyFavorites
    );


    renderSchools();

  }
);


// ===============================
// RETOUR À LA LISTE
// ===============================

backButton.addEventListener(
  "click",
  () => {

    detailsPage.hidden = true;

    schoolList.hidden = false;

    schoolList.scrollIntoView({
      behavior: "smooth"
    });

  }
);


// ===============================
// AFFICHAGE INITIAL
// ===============================


fetch("./school.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error("Impossible de charger school.json");
    }

    return response.json();
  })
  .then((data) => {
    console.log("Nombre d'établissements reçus :", data.length);

    schools = data;
    schoolCount.textContent = schools.length;

    renderSchools();
  })
  .catch((error) => {
    console.error("Erreur de chargement :", error);

    schoolList.innerHTML = `
      <div class="empty-state">
        <h3>Chargement impossible</h3>
        <p>Vérifie le fichier school.json.</p>
      </div>
    `;
  });

  
 // Enregistrement du Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then((registration) => {
        console.log(
          "Service Worker activé avec succès :",
          registration.scope
        );
      })
      .catch((error) => {
        console.error("Erreur Service Worker :", error);
      });
  });
}

