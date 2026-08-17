# Super AI — VERSION 3 (UPDATED)

This branch advances the scaffold towards a production-ready platform. It adds:
- Postgres database support + migrations
- Authentication routes (email/password, email verification, password reset, phone OTP)
- Session cookie-based sessions
- Razorpay payment integration placeholders and webhook verification
- DB-backed files metadata and limits
- Admin scaffolding

Important: External providers (SMTP, Twilio, OAuth providers, Razorpay, OpenAI) require environment variables to be configured. The app will start without them but features will show a clear "not configured" message or return an explicit error.

Run migrations:
- Set DATABASE_URL in server/.env
- npm run migrate --prefix server

Then start servers (see previous README for full steps).
