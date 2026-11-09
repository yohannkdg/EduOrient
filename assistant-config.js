window.EDUORIENT_CONFIG = Object.assign({
  // Set this to your deployed secure backend URL, e.g. https://eduorient-ai.<account>.workers.dev/api/chat
  // NEVER put API keys here. Keys belong in backend secrets only.
  ASSISTANT_API_URL: 'https://eduorient-ai.yohannkdg.workers.dev/api/chat',
  ASSISTANT_TIMEOUT_MS: 25000,
  ENABLE_WEB_SEARCH: true
}, window.EDUORIENT_CONFIG || {});
