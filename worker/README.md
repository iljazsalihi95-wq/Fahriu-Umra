# Fahriu Umra Worker — API foundation

Routes:
- GET /health — public health check
- POST /api/ai/chat — AI guide (requires approved Origin, Cloudflare rate limiter and OPENAI_API_KEY)

Cloudflare configuration:
1. Connect this worker directory to the existing Cloudflare deployment. **Do not create a second worker by accident.** Check the current worker name and adjust wrangler.toml to match before deploying.
2. Set secret `OPENAI_API_KEY`.
3. Set variable `ALLOWED_ORIGINS` to the exact deployed PWA/AppCreator web origin(s), comma-separated.
4. Confirm the rate limiter binding is supported and configured.
5. Run `npm install`, `npm run check`, then deploy and test. Nothing here has been deployed or live-tested yet.

Security: Origin validation is **not authentication**. This AI endpoint must gain authenticated sessions and abuse controls before public production release. Never store or expose personal pilgrim data in public GitHub. Chat, media, group location, bookings and administration are **not implemented** by this starter.
