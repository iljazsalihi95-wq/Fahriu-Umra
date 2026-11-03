# Nusuk Admin — Fahriu Travel

## Scope
- Open official Nusuk in a new browser tab or native app where supported. Do not embed Nusuk login in an iframe or collect Nusuk passwords.
- Offer Albanian explanation/translation of user-pasted Nusuk text via our own authenticated Cloudflare Worker AI endpoint.
- Offer optional screenshot explanation only after explicit upload and warning to redact passport numbers, visas, QR codes, booking references and personal data.
- Never claim to read live Nusuk account state, book permits, or translate Nusuk's internal pages without an authorized official API.
- Group checklist and notes must be stored in authenticated server-side storage (D1 recommended), partitioned by group and admin role; localStorage is not a multi-device backend.
- Existing HTML contains a hardcoded password and sessionStorage flag, which do not protect private data. Replace with server-side authentication before production.

## Proposed UI
1. Official Nusuk launch, with notice that the official platform handles login and bookings.
2. Translate/explain: input text, source language auto, Albanian output; preserve exact dates, names and booking status; clearly label as unofficial translation.
3. Group admin: traveler readiness and booking statuses, admin-only access, audit history.

## Worker endpoint proposal
POST /api/nusuk/translate, authenticated session, request {text:string}; return {translation:string, notes:string}. Keep OPENAI_API_KEY in Cloudflare Secret. Enforce input length and rate limits, redact PII, and avoid logging content. Endpoint is a proposal, not yet deployed.

## Validation
No official Nusuk API integration, deployment, or end-to-end test is claimed by this document.
