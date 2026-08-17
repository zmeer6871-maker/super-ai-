# Super AI — VERSION 3

Production-ready starter for "Super AI" — an AI chat web application.

Features included in this repo:
- Backend (TypeScript, Express) with provider abstraction and /api/chat endpoint
- Frontend (React + Vite + TypeScript) with mobile-first responsive UI
- Local chat history (frontend localStorage + backend file storage)
- Image attachment UI and voice input UI (browser-based)
- Pricing and Settings pages (UI only)
- Provider abstraction that gracefully handles missing API keys
- File upload endpoint (/api/upload) storing files under server/data/uploads and served at /uploads

Important
- Do NOT put API keys into the repo. Use environment variables.
- The server will start even if no AI provider is configured; it returns a clear 503 error for chat requests when the provider is unavailable.

Run locally
1. Clone and checkout the branch:
   - git clone https://github.com/zmeer6871-maker/super-ai-.git
   - cd super-ai-
   - git checkout v3/init
2. Install dependencies:
   - npm install --prefix server
   - npm install --prefix client
3. Configure env:
   - cp .env.example server/.env
   - Edit server/.env to set AI_PROVIDER and OPENAI_API_KEY only if you want to test a real provider.
   - Note: the server will start without an API key; /api/chat will return a 503 with a clear message when provider is not configured.
4. Start dev servers:
   - npm run dev --prefix server   (runs ts-node-dev on port from .env or 4000)
   - npm run dev --prefix client   (Vite dev server on port 3000, proxied to /api -> server)
5. Try the chat:
   - Open http://localhost:3000 and send a message; if AI_PROVIDER/openai + OPENAI_API_KEY not set, the frontend will show the provider error returned from the backend.

Notes
- Image uploads are saved to server/data/uploads and served from /uploads. This is a local storage option for development only.
- Payment integration is intentionally omitted. Integrate a payment provider and server-side entitlement checks before treating payments as authority for additional AI quotas.
