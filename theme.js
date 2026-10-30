
const themeToggle = document.getElementById("theme-toggle");
const savedTheme = localStorage.getItem("eduorient-theme");

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);

  if (themeToggle) {
    const darkMode = theme === "dark";
    themeToggle.textContent = darkMode ? "☀️" : "🌙";
    themeToggle.setAttribute(
      "aria-label",
      darkMode ? "Activer le mode clair" : "Activer le mode sombre"
    );
  }
}

// Appliquer le thème enregistré
applyTheme(savedTheme || "light");

// Changer de thème au clic
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const currentTheme =
      document.documentElement.getAttribute("data-theme");

    const newTheme = currentTheme === "dark" ? "light" : "dark";

    localStorage.setItem("eduorient-theme", newTheme);
    applyTheme(newTheme);
  });
}
