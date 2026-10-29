const orientationForm = document.getElementById("orientationForm");
const orientationResults = document.getElementById("orientationResults");
const orientationSummary = document.getElementById("orientationSummary");
const orientationSuggestions = document.getElementById("orientationSuggestions");
const editOrientation = document.getElementById("editOrientation");

const pathways = {
  numerique: [
    ["Développement informatique", "Découvre la programmation, la création de sites et d'applications, ainsi que la résolution de problèmes."],
    ["Réseaux et cybersécurité", "Explore le fonctionnement des réseaux, la protection des systèmes et la sécurité des données."],
    ["Données et intelligence artificielle", "Piste à explorer si tu aimes analyser des informations, les mathématiques et les outils numériques."]
  ],
  sante: [
    ["Métiers de la santé", "Renseigne-toi sur les parcours possibles en médecine, pharmacie, soins infirmiers ou autres professions de santé selon le pays."],
    ["Biologie et sciences du vivant", "Explore les formations liées aux êtres vivants, aux laboratoires et à la recherche."],
    ["Santé publique", "Découvre les études qui portent sur la prévention et l'amélioration de la santé des populations."]
  ],
  ingenierie: [
    ["Génie et ingénierie", "Explore les formations qui conçoivent, construisent ou améliorent des systèmes et des équipements."],
    ["Énergie et électronique", "Piste possible si tu t'intéresses à l'électricité, aux circuits, aux énergies et aux technologies."],
    ["Mathématiques et sciences appliquées", "Renforce tes bases scientifiques pour garder ouvertes plusieurs voies techniques."]
  ],
  commerce: [
    ["Gestion et comptabilité", "Découvre le suivi financier, l'organisation et la gestion des activités d'une entreprise."],
    ["Marketing et communication", "Explore l'étude des besoins, la communication de marque et les stratégies commerciales."],
    ["Entrepreneuriat", "Apprends à transformer une idée en projet, à étudier un marché et à organiser une activité."]
  ],
  droit: [
    ["Droit", "Renseigne-toi sur les parcours juridiques et les conditions d'accès aux professions réglementées dans le pays visé."],
    ["Sciences politiques", "Explore les institutions, les politiques publiques et le fonctionnement des sociétés."],
    ["Relations internationales", "Découvre les études consacrées aux relations entre pays, à la coopération et aux organisations internationales."]
  ],
  education: [
    ["Enseignement", "Explore les formations qui préparent à transmettre des connaissances dans une matière ou un niveau donné."],
    ["Psychologie et accompagnement", "Renseigne-toi sur les parcours et qualifications nécessaires pour accompagner les personnes."],
    ["Formation et pédagogie", "Découvre comment concevoir des activités d'apprentissage et aider différents publics à progresser."]
  ],
  arts: [
    ["Communication et médias", "Explore la rédaction, la communication, la production de contenus et les médias numériques."],
    ["Design et création visuelle", "Piste possible si tu aimes imaginer des visuels, résoudre des problèmes créatifs et utiliser des outils graphiques."],
    ["Audiovisuel et arts", "Renseigne-toi sur les formations en image, son, cinéma, musique ou autres pratiques artistiques."]
  ],
  environnement: [
    ["Agriculture et agronomie", "Explore les productions agricoles, les sols, les cultures et les systèmes alimentaires."],
    ["Environnement", "Découvre les études sur la protection des ressources naturelles, la biodiversité et la gestion des déchets."],
    ["Eau et développement durable", "Piste à explorer autour de la gestion de l'eau, de l'énergie et des projets durables."]
  ],
  aucun: [
    ["Explorer plusieurs domaines", "Compare quelques matières que tu aimes, les activités qui te motivent et les problèmes que tu aimerais résoudre."],
    ["Faire le point sur tes points forts", "Demande à un enseignant ou à un conseiller de t'aider à repérer tes matières préférées et tes compétences."],
    ["Découvrir des métiers", "Choisis trois métiers qui t'intriguent et renseigne-toi sur leurs tâches quotidiennes et leurs formations."]
  ]
};

const levelAdvice = {
  college: "Tu es au collège : commence par explorer les matières que tu apprécies et les métiers qui t'intriguent. Garde plusieurs possibilités ouvertes.",
  lycee: "Tu es au lycée : compare les filières, les matières requises et les débouchés avant de choisir une formation.",
  bac: "Tu as le baccalauréat : compare les conditions d'admission, les dates de candidature et le contenu des formations.",
  superieur: "Tu es déjà dans le supérieur : vérifie les passerelles, les prérequis et les équivalences avant de changer de parcours.",
  reconversion: "Pour une réorientation, compare les compétences transférables, les formations courtes ou longues et les conditions d'accès."
};

orientationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const level = document.getElementById("studyLevel").value;
  const interest = document.getElementById("interest").value;
  const country = document.getElementById("studyCountry").value;
  const budget = document.getElementById("budget").value;

  const selected = pathways[interest] || pathways.aucun;
  orientationSummary.textContent = `${levelAdvice[level] || ""} Pays souhaité : ${country}. ` +
    (budget === "limite"
      ? "Avec un budget limité, examine en priorité les établissements publics, les bourses et les frais annexes."
      : budget === "modere"
      ? "Avec un budget modéré, compare les frais de scolarité et les dépenses de logement, transport et matériel."
      : budget === "flexible"
      ? "Même avec un budget flexible, compare les frais totaux et les aides financières possibles."
      : "Pour le budget, essaie ensuite d'estimer les frais de scolarité et de vie dans le pays visé.");

  orientationSuggestions.innerHTML = "";
  selected.forEach(([title, description]) => {
    const article = document.createElement("article");
    article.className = "orientation-suggestion";
    const heading = document.createElement("h3");
    heading.textContent = title;
    const paragraph = document.createElement("p");
    paragraph.textContent = description;
    article.append(heading, paragraph);
    orientationSuggestions.appendChild(article);
  });

  orientationResults.hidden = false;
  orientationResults.scrollIntoView({ behavior: "smooth", block: "start" });
});

orientationForm.addEventListener("reset", () => {
  orientationResults.hidden = true;
});

editOrientation.addEventListener("click", () => {
  orientationResults.hidden = true;
  document.getElementById("orientation-title").scrollIntoView({ behavior: "smooth", block: "start" });
});
