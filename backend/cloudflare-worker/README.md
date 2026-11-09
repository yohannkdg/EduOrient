# EduOrient AI Backend (Cloudflare Worker)

Secure backend for the EduOrient assistant. The public GitHub Pages frontend must never contain AI/search API keys.

## Endpoints
- POST /api/chat body: { message, history?, language?, catalog?, profile? }
  - validates input, applies CORS allowlist and simple rate limiting
  - calls configured LLM provider only when AI_PROVIDER_API_KEY is set
  - can call configured web search provider only when SEARCH_PROVIDER_API_KEY is set
  - returns { reply, sources?, mode, warnings? }
- GET /api/health

## Secrets (never commit)
Use wrangler secret put:
- AI_PROVIDER_API_KEY
- SEARCH_PROVIDER_API_KEY (optional unless live web search is required)
- ALLOWED_ORIGINS (recommended override)

## Optional variables (wrangler.toml / dashboard)
- AI_PROVIDER = openai-compatible | openai | nthropic | 
one
- AI_MODEL (default gpt-4o-mini for OpenAI-compatible)
- AI_BASE_URL for OpenAI-compatible providers
- SEARCH_PROVIDER = 	avily | rave | serper | 
one
- RATE_LIMIT_PER_MINUTE (default 12)

## Deploy
`ash
npm i -g wrangler
cd backend/cloudflare-worker
npm install
wrangler login
wrangler secret put AI_PROVIDER_API_KEY
# optional: wrangler secret put SEARCH_PROVIDER_API_KEY
wrangler deploy
`

Set the frontend assistant config to the deployed worker URL, e.g. https://<worker>.workers.dev/api/chat.
If secrets/providers are missing, the worker responds safely with mode:"not-configured" and the frontend uses local catalog guidance.
