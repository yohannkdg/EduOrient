
const orientationForm = document.getElementById("orientationForm");
const orientationResults = document.getElementById("orientationResults");
const orientationSummary = document.getElementById("orientationSummary");
const orientationSuggestions = document.getElementById("orientationSuggestions");
const editOrientation = document.getElementById("editOrientation");

const SCHOOLS_URL = "./school.json";

let allSchools = [];
function createSchoolCard(school) {
  const isEnglish = window.EduOrientLanguage.getLanguage() === "en";

  const card = document.createElement("article");
  card.className = "school-card";

  const title = document.createElement("h3");
  title.textContent = school.name || (isEnglish ? "Unnamed institution" : "Établissement sans nom");
  card.appendChild(title);

  const details = document.createElement("p");
  details.textContent = `${school.city || ""} • ${school.type || ""}`;
  card.appendChild(details);

  if (school.image) {
    const image = document.createElement("img");
    image.src = school.image;
    image.alt = school.name || "";
    image.loading = "lazy";
    image.onerror = () => image.remove();
    card.appendChild(image);
  }

  if (school.description) {
    const description = document.createElement("p");
    description.textContent = school.description;
    card.appendChild(description);
  }

  if (Array.isArray(school.programs) && school.programs.length > 0) {
    const heading = document.createElement("h4");
    heading.textContent = isEnglish ? "Programs offered" : "Formations proposées";
    card.appendChild(heading);

    const list = document.createElement("ul");

    school.programs.slice(0, 4).forEach(program => {
      const item = document.createElement("li");
      item.textContent = program;
      list.appendChild(item);
    });

    card.appendChild(list);
  }

  if (school.website) {
    const link = document.createElement("a");
    link.href = school.website;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = isEnglish ? "Visit website" : "Visiter le site";
    card.appendChild(link);
  }

  return card;
}

 const domainKeywords = {
  numerique: [
    "informatique", "numerique", "digital", "developpement logiciel",
    "developpement web", "programmation", "genie logiciel",
    "cybersecurite", "reseaux informatiques", "systemes informatiques",
    "intelligence artificielle", "machine learning", "data science",
    "science des donnees", "big data", "base de donnees",
    "telecommunications", "systemes d'information", "web",
    "informatique de gestion", "digital business"
  ],

  sante: [
    "medecine", "sante", "pharmacie", "infirmier",
    "sciences infirmieres", "biologie", "biomedical",
    "sciences du vivant", "laboratoire", "dentaire",
    "chirurgie", "sage femme", "nutrition", "kinesitherapie",
    "physiotherapie", "sante publique", "soins"
  ],

  ingenierie: [
    "ingenierie", "ingenieur", "genie civil", "genie naval",
    "genie mecanique", "genie electrique", "genie industriel",
    "genie electronique", "genie informatique", "genie energetique",
    "construction", "energie", "mecanique", "electronique",
    "automatisme", "robotique", "mathematiques appliquees",
    "travaux publics"
  ],

  commerce: [
    "commerce", "gestion", "management", "comptabilite",
    "marketing", "finance", "banque", "entrepreneuriat",
    "ressources humaines", "logistique", "business",
    "strategie digitale", "administration des entreprises",
    "audit", "controle de gestion", "commerce international",
    "management des organisations", "gestion financiere"
  ],

  droit: [
    "droit", "juridique", "sciences juridiques",
    "sciences politiques", "relations internationales",
    "diplomatie", "administration publique",
    "droit des affaires", "droit prive", "droit public"
  ],

  education: [
    "education", "enseignement", "pedagogie",
    "formation des enseignants", "professorat",
    "sciences de l'education", "psychologie",
    "didactique", "instituteur", "education specialisee"
  ],

  arts: [
    "art", "design", "communication", "graphisme",
    "audiovisuel", "cinema", "musique", "media",
    "creation artistique", "arts plastiques",
    "design graphique", "communication visuelle",
    "architecture", "mode", "photographie"
  ],

  environnement: [
    "environnement", "agriculture", "agronomie",
    "developpement durable", "biodiversite",
    "gestion de l'eau", "foresterie",
    "ressources naturelles", "ecologie",
    "sciences environnementales", "agroalimentaire",
    "production vegetale", "production animale"
  ]
};

const levelAdvice = {
  college: "Tu es au collège : explore plusieurs domaines et renseigne-toi sur les parcours qui permettent d'y accéder.",
  lycee: "Tu es au lycée : compare les filières et les conditions d'accès aux formations après le bac.",
  bac: "Tu as le baccalauréat : vérifie les conditions d'admission et les diplômes acceptés par chaque établissement.",
  superieur: "Tu es déjà dans le supérieur : vérifie les prérequis, les équivalences et les admissions en cours de parcours.",
  reconversion: "Pour ta réorientation, vérifie les passerelles et les conditions d'admission propres à chaque formation."
};

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getSchoolText(school) {
  return normalizeText([
    school.name || "",
    school.description || "",
    school.type || "",
    school.address || "",
    ...(school.programs || []),
    ...(school.diplomas || []),
    ...(school.admission || []),
    ...(school.feesByLevel || []).map(fee => fee.level || "")
  ].join(" "));
}

function matchesCountry(school, selectedCountry) {
  if (
    !selectedCountry ||
    selectedCountry === "Pas encore décidé" ||
    selectedCountry === "Autre pays"
  ) {
    return true;
  }

  const address = normalizeText(school.address);
  const country = normalizeText(selectedCountry);

  return address.includes(country);
}


function matchesLevel(school, level) {
  // Le niveau ne doit pas exclure une école
  // lorsque ses informations sont incomplètes.
  return true;
}

function findMatchingSchools(interest, country, level) {
  const keywords = domainKeywords[interest] || [];

  if (keywords.length === 0) {
    return [];
  }

  return allSchools
    .map(school => {
      const programs = normalizeText(
        (school.programs || []).join(" ")
      );

      const diplomas = normalizeText(
        (school.diplomas || []).join(" ")
      );

      const name = normalizeText(school.name || "");
      const description = normalizeText(school.description || "");

      let score = 0;
      const matchedPrograms = [];

      keywords.forEach(keyword => {
        const term = normalizeText(keyword);

        if (!term) return;

        if (programs.includes(term)) {
          score += 5;
          matchedPrograms.push(keyword);
        } else if (diplomas.includes(term)) {
          score += 3;
        } else if (name.includes(term)) {
          score += 2;
        } else if (description.includes(term)) {
          score += 1;
        }
      });

      return {
        school,
        score,
        matchedPrograms
      };
    })
    .filter(result =>
      result.score > 0 &&
      matchesCountry(result.school, country) &&
      matchesLevel(result.school, level)
    )
    .sort((a, b) => b.score - a.score)
    .map(result => result.school);
}

async function loadSchools() {
  try {
    const response = await fetch(SCHOOLS_URL);

    if (!response.ok) {
      throw new Error("Impossible de charger school.json");
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Le catalogue ne contient pas une liste valide.");
    }

    allSchools = data;
    console.log("Nombre total d'établissements :", data.length);
    console.log("Catalogue chargé pour Mon orientation :", allSchools.length);
  } catch (error) {
    console.error("Erreur de chargement du catalogue :", error);
    allSchools = [];
  }
}

orientationForm.addEventListener("submit", async event => {
  event.preventDefault();

  const level = document.getElementById("studyLevel").value;
  const interest = document.getElementById("interest").value;
  const country = document.getElementById("studyCountry").value;
  const budget = document.getElementById("budget").value;

  orientationSuggestions.innerHTML = "";

  orientationSummary.textContent = "Recherche des établissements dans notre catalogue...";

  orientationResults.hidden = false;
  orientationResults.scrollIntoView({ behavior: "smooth", block: "start" });

  if (allSchools.length === 0) {
    await loadSchools();
  }

  if (allSchools.length === 0) {
    orientationSummary.textContent =
      "Impossible de charger les établissements. Vérifie que school.json est bien accessible.";
    return;
  }

   const exploreLink = document.querySelector(
  '.orientation-link'
);
  

  const selectedSchools = findMatchingSchools(interest, country, level);

  if (exploreLink) {
    const params = new URLSearchParams({
      orientation: "true",
      interest: interest,
      country: country,
      level: level,
      budget: budget,
      schoolIds: selectedSchools.map(school => school.id).join(",")
    });

    exploreLink.href = `index.html?${params.toString()}#ecoles`;
  }

  



  const currentLanguage = window.EduOrientLanguage.getLanguage();
const isEnglish = currentLanguage === "en";

const levelAdviceEnglish = {
  college: "You are in middle school: explore different fields and learn about the study paths that lead to them.",
  lycee: "You are in high school: compare study paths and admission requirements for programs after graduation.",
  bac: "You have completed high school: check each institution's admission requirements and accepted qualifications.",
  superieur: "You are already in higher education: check prerequisites, equivalencies and admission requirements.",
  reconversion: "If you are changing your study path, check the available pathways and admission requirements."
};

const budgetAdvice = {
  limite: isEnglish
    ? "We will prioritize available tuition information, but all amounts must be verified."
    : "Nous allons privilégier les informations de frais disponibles, mais les montants doivent être vérifiés.",

  modere: isEnglish
    ? "Remember to compare housing, transport and other expenses too."
    : "Pense aussi à comparer les frais de logement, de transport et les autres dépenses.",

  flexible: isEnglish
    ? "Still compare total costs and possible financial assistance."
    : "Compare malgré tout les frais totaux et les aides financières possibles.",

  inconnu: isEnglish
    ? "Remember to define your budget when comparing institutions."
    : "Pense à préciser ton budget lorsque tu compareras les établissements."
};

orientationSummary.textContent =
  `${isEnglish ? (levelAdviceEnglish[level] || "") : (levelAdvice[level] || "")} ` +
  `${isEnglish ? "Preferred country: " : "Pays souhaité : "}${country}. ` +
  (budgetAdvice[budget] || "");
  const formationGuides = {
  fr: {
    numerique: {
      title: "Les métiers du numérique",
      description: "Le numérique regroupe les métiers liés à la création de logiciels, aux systèmes informatiques, aux données et aux technologies.",
      studies: "Informatique, développement web, intelligence artificielle, cybersécurité, réseaux et systèmes.",
      skills: "Logique, résolution de problèmes, créativité et curiosité technologique.",
      careers: "Développeur, analyste de données, spécialiste en cybersécurité, administrateur réseaux."
    },
    sante: {
      title: "Les métiers de la santé",
      description: "Ce domaine concerne la prévention, le diagnostic, les soins et l'amélioration de la santé des populations.",
      studies: "Médecine, pharmacie, soins infirmiers, biologie, santé publique et formations paramédicales.",
      skills: "Écoute, rigueur, sens des responsabilités et intérêt pour les sciences.",
      careers: "Médecin, pharmacien, infirmier, biologiste et professionnel de santé publique."
    },
    ingenierie: {
      title: "Les métiers de l'ingénierie",
      description: "L'ingénierie consiste à concevoir, construire, améliorer et entretenir des systèmes et des équipements.",
      studies: "Génie civil, génie électrique, mécanique, informatique, électronique et télécommunications.",
      skills: "Mathématiques, sciences, logique, organisation et travail en équipe.",
      careers: "Ingénieur en construction, ingénieur mécanique, ingénieur électrique et ingénieur informatique."
    },
    commerce: {
      title: "Les métiers du commerce et de la gestion",
      description: "Ce domaine concerne la gestion des entreprises, la vente, la finance, le marketing et l'entrepreneuriat.",
      studies: "Gestion, comptabilité, finance, marketing, commerce international et ressources humaines.",
      skills: "Communication, organisation, analyse et esprit d'initiative.",
      careers: "Gestionnaire, comptable, commercial, responsable marketing et entrepreneur."
    },
    droit: {
      title: "Les métiers du droit",
      description: "Le droit étudie les règles qui organisent la société, les institutions et les relations entre les personnes.",
      studies: "Droit privé, droit public, droit des affaires, droit international et sciences politiques.",
      skills: "Argumentation, lecture, analyse, rédaction et esprit critique.",
      careers: "Juriste, avocat, magistrat et conseiller juridique, selon les diplômes et conditions d'accès."
    },
    education: {
      title: "Les métiers de l'éducation",
      description: "Ce domaine concerne l'enseignement, la transmission des connaissances et l'accompagnement des apprenants.",
      studies: "Sciences de l'éducation, enseignement, pédagogie et formation des enseignants.",
      skills: "Pédagogie, patience, communication et organisation.",
      careers: "Enseignant, formateur, conseiller pédagogique et spécialiste de l'éducation."
    },
    arts: {
      title: "Les métiers des arts et de la création",
      description: "Ce domaine rassemble les activités artistiques, culturelles, visuelles et créatives.",
      studies: "Arts plastiques, design, graphisme, audiovisuel, cinéma, musique et communication visuelle.",
      skills: "Créativité, imagination, expression et maîtrise des outils artistiques.",
      careers: "Designer, graphiste, illustrateur, réalisateur et artiste."
    },
    environnement: {
      title: "Les métiers de l'environnement",
      description: "Ce domaine vise à protéger les ressources naturelles et à trouver des solutions aux défis environnementaux.",
      studies: "Sciences de l'environnement, écologie, agronomie, gestion des ressources naturelles et développement durable.",
      skills: "Observation, analyse scientifique, rigueur et sens de l'engagement.",
      careers: "Écologue, ingénieur environnement, agronome et chargé de développement durable."
    }
  },

  en: {
    numerique: {
      title: "Careers in Digital Technology",
      description: "Digital technology includes careers related to software development, computer systems, data and technology.",
      studies: "Computer science, web development, artificial intelligence, cybersecurity, networks and systems.",
      skills: "Logical thinking, problem-solving, creativity and technological curiosity.",
      careers: "Software developer, data analyst, cybersecurity specialist and network administrator."
    },
    sante: {
      title: "Careers in Healthcare",
      description: "This field focuses on prevention, diagnosis, treatment and improving public health.",
      studies: "Medicine, pharmacy, nursing, biology, public health and allied health programs.",
      skills: "Listening, attention to detail, responsibility and an interest in science.",
      careers: "Doctor, pharmacist, nurse, biologist and public health professional."
    },
    ingenierie: {
      title: "Careers in Engineering",
      description: "Engineering involves designing, building, improving and maintaining systems and equipment.",
      studies: "Civil, electrical, mechanical and computer engineering, electronics and telecommunications.",
      skills: "Mathematics, science, logical thinking, organization and teamwork.",
      careers: "Construction engineer, mechanical engineer, electrical engineer and computer engineer."
    },
    commerce: {
      title: "Careers in Business and Management",
      description: "This field covers business management, sales, finance, marketing and entrepreneurship.",
      studies: "Management, accounting, finance, marketing, international business and human resources.",
      skills: "Communication, organization, analysis and initiative.",
      careers: "Manager, accountant, sales professional, marketing manager and entrepreneur."
    },
    droit: {
      title: "Careers in Law",
      description: "Law studies the rules that organize society, institutions and relationships between people.",
      studies: "Private law, public law, business law, international law and political science.",
      skills: "Argumentation, reading, analysis, writing and critical thinking.",
      careers: "Legal adviser, lawyer, magistrate and legal consultant, depending on qualifications and admission requirements."
    },
    education: {
      title: "Careers in Education",
      description: "This field focuses on teaching, sharing knowledge and supporting learners.",
      studies: "Education sciences, teaching, pedagogy and teacher training.",
      skills: "Teaching skills, patience, communication and organization.",
      careers: "Teacher, trainer, educational adviser and education specialist."
    },
    arts: {
      title: "Careers in Arts and Creative Industries",
      description: "This field brings together artistic, cultural, visual and creative activities.",
      studies: "Fine arts, design, graphic design, audiovisual production, film, music and visual communication.",
      skills: "Creativity, imagination, self-expression and artistic skills.",
      careers: "Designer, graphic artist, illustrator, filmmaker and artist."
    },
    environnement: {
      title: "Careers in the Environment",
      description: "This field aims to protect natural resources and find solutions to environmental challenges.",
      studies: "Environmental science, ecology, agronomy, natural resource management and sustainable development.",
      skills: "Observation, scientific analysis, attention to detail and commitment.",
      careers: "Ecologist, environmental engineer, agronomist and sustainable development officer."
    }
  }
};

  const guide = formationGuides[isEnglish ? "en" : "fr"][interest];

  if (guide) {
    const guideSection = document.createElement("section");
    guideSection.className = "formation-guide";

    guideSection.innerHTML = `
  <h3>${guide.title}</h3>
  <p>${guide.description}</p>
  <h4>${isEnglish ? "Programs to explore" : "Formations à découvrir"}</h4>
  <p>${guide.studies}</p>
  <h4>${isEnglish ? "Useful skills" : "Compétences utiles"}</h4>
  <p>${guide.skills}</p>
  <h4>${isEnglish ? "Career opportunities" : "Débouchés professionnels"}</h4>
  <p>${guide.careers}</p>
`;

    orientationSuggestions.appendChild(guideSection);
  }

  if (interest === "aucun") {
  const message = document.createElement("p");
  message.textContent = isEnglish
    ? "You haven't chosen a field yet. Take time to explore programs and careers that interest you, then come back to search."
    : "Tu n'as pas encore choisi de domaine. Prends le temps d'explorer les formations et les métiers qui t'intéressent, puis reviens faire une recherche.";

  orientationSuggestions.appendChild(message);
  return;
}

  if (selectedSchools.length === 0) {
  const message = document.createElement("p");
  message.textContent = isEnglish
    ? "No institution matching your criteria was found in our catalogue at the moment. This does not mean none exist; our catalogue may be incomplete."
    : "Aucun établissement correspondant précisément à tes critères n'a été trouvé dans notre catalogue pour le moment. Cela ne signifie pas qu'il n'en existe pas : notre catalogue peut être incomplet.";

  orientationSuggestions.appendChild(message);
  return;
}

  const resultTitle = document.createElement("p");
 resultTitle.textContent = isEnglish
  ? `${selectedSchools.length} institution(s) found in our catalogue:`
  : `${selectedSchools.length} établissement(s) trouvé(s) dans notre catalogue :`;
  resultTitle.style.fontWeight = "700";
  orientationSuggestions.appendChild(resultTitle);

  selectedSchools.forEach(school => {
    orientationSuggestions.appendChild(createSchoolCard(school));
  });
});

orientationForm.addEventListener("reset", () => {
  orientationResults.hidden = true;
});

editOrientation.addEventListener("click", () => {
  orientationResults.hidden = true;
  document.getElementById("orientation-title").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});

loadSchools();
