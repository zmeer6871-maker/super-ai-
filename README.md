Updated README to remove Razorpay-specific instructions and reflect a provider-agnostic payment architecture.

Payments
- The server includes a provider-agnostic payments interface. Configure PAYMENT_PROVIDER in server/.env to load a concrete provider implementation from server/src/payments/providers/<provider>.js
- No payment provider is configured by default. The app will start and payment endpoints will return a clear "payments_not_configured" error until a provider is configured.

Subscription plans (kept):
- FREE — ₹0 — 150 messages/day
- PRO — ₹99/month — 1,000 messages/day
- ULTRA — ₹299/month — unlimited subject to fair use

Do NOT enable any provider by committing secrets to the repo. Use environment variables and provider credentials stored securely.
