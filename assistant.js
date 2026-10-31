
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const messages = document.getElementById("messages");
const sendButton = document.getElementById("send-button");
const suggestions = document.getElementById("suggestions");

const API_URL = "https://eduorient-ai.yohannkdg.workers.dev/api/chat";
const conversationHistory = [];

const languageAPI = window.EduOrientLanguage;

function getCurrentLanguage() {
  return languageAPI?.getLanguage() || "fr";
}

function translate(key, fallback) {
  return languageAPI?.t(key) || fallback;
}

function addMessage(text, sender) {
  const article = document.createElement("article");
  article.className = `message ${
    sender === "user" ? "user-message" : "assistant-message"
  }`;

  if (sender !== "user") {
    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = "E";
    article.appendChild(avatar);
  }

  const content = document.createElement("div");
  content.className = "message-content";
  content.textContent = text;

  article.appendChild(content);
  messages.appendChild(article);
  messages.scrollTop = messages.scrollHeight;

  return content;
}

async function sendMessage(text) {
  const message = text.trim();

  if (!message || sendButton.disabled) return;

  const language = getCurrentLanguage();

  addMessage(message, "user");

  messageInput.value = "";
  sendButton.disabled = true;
  messageInput.disabled = true;
  suggestions.hidden = true;

  const loadingMessage = addMessage(
    translate("thinking", "Je réfléchis à ta question..."),
    "assistant"
  );

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        history: conversationHistory,
        language,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          translate("error", "Une erreur est survenue pendant la demande.")
      );
    }

    loadingMessage.textContent = data.reply;

    conversationHistory.push({
      role: "user",
      content: message,
    });

    conversationHistory.push({
      role: "assistant",
      content: data.reply,
    });

    conversationHistory.splice(
      0,
      conversationHistory.length - 12
    );
  } catch (error) {
    console.error("Erreur de communication avec l'IA :", error);

    loadingMessage.textContent = translate(
      "connectionError",
      "Impossible de contacter l'assistant IA. Vérifie ta connexion Internet et réessaie."
    );
  } finally {
    sendButton.disabled = false;
    messageInput.disabled = false;
    messageInput.focus();
    messages.scrollTop = messages.scrollHeight;
  }
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(messageInput.value);
});

suggestions.addEventListener("click", (event) => {
  const button = event.target.closest(
    "button[data-question-fr], button[data-question-en]"
  );

  if (!button) return;

  const language = getCurrentLanguage();

  const question =
    language === "en"
      ? button.dataset.questionEn
      : button.dataset.questionFr;

  if (question) {
    sendMessage(question);
  }
});

messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});
