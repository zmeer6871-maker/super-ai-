# Super AI — VERSION 3

Production-ready starter for "Super AI" — an AI chat web application.

Features included in this repo:
- Backend (TypeScript, Express) with provider abstraction and /api/chat endpoint
- Frontend (React + Vite + TypeScript) with mobile-first responsive UI
- Local chat history (frontend localStorage + backend file storage)
- Image attachment UI and voice input UI (browser-based)
- Pricing and Settings pages (UI only)
- Provider abstraction that gracefully handles missing API keys

Important
- Do NOT put API keys into the repo. Use environment variables.
- The server will start even if no AI provider is configured; it returns a clear 503 error for chat requests when the provider is unavailable.

See server/ and client/ directories for setup and start instructions.
