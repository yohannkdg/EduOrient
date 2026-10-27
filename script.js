let schools = [];


// ===============================
// ÉLÉMENTS DE LA PAGE
// ===============================

const searchInput = document.querySelector("#search");
const citySelect = document.querySelector("#city");
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

function renderSchools() {
  const query = searchInput.value.trim().toLowerCase();
  const city = citySelect.value;
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

    const matchesDiploma =
      !diploma || school.diplomas.includes(diploma);

    const matchesType =
      !type || school.type === type;

    const matchesFavorite =
      !showOnlyFavorites ||
      favoriteIds.includes(school.id);

    return (
      matchesQuery &&
      matchesCity &&
      matchesDiploma &&
      matchesType &&
      matchesFavorite
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

          </div>


          <h3>
            ${school.name}
          </h3>


          <p class="school-city">
            📍 ${school.city}, Côte d'Ivoire
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
                " FCFA"
          }
        </p>

        ${
          fee.registrationFee != null
            ? `<p>Frais d'inscription : ${
                Number(fee.registrationFee).toLocaleString("fr-FR")
              } FCFA</p>`
            : ""
        }

        ${
          fee.totalPayable != null
            ? `<p>Total indiqué : ${
                Number(fee.totalPayable).toLocaleString("fr-FR")
              } FCFA</p>`
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
      <h3>Frais de scolarité</h3>
      <p>${
        school.price == null
          ? "Montant non renseigné : à vérifier auprès de l'établissement."
          : Number(school.price).toLocaleString("fr-FR") + " FCFA"
      }</p>
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
        href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent((school.address || school.city) + ', Côte d’Ivoire')}"
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
        📍 ${school.city}, Côte d'Ivoire
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
              " FCFA"
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

