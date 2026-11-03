# Programi LIVE — arkitektura e integrimit

## Funksionet
- Ballina: kartë me aktivitetin e ardhshëm, njoftimin urgjent dhe hyrje te Programi LIVE.
- Programi: orari i grupit, zona kohore **Asia/Riyadh**, ditët, vendtakimet, harta, statusi i ndryshimeve.
- Chat: dhoma sipas grupit, mesazhe tekstuale, mesazhe të fiksuara nga administratori, moderim dhe autorizim sipas anëtarësisë.
- Offline: cache e aplikacionit dhe e programit të fundit të sinkronizuar; ruajtje lokale e mesazheve në radhë deri kur të kthehet interneti.
- Siguria: autentikim real në backend, jo fjalëkalim i shkruar në HTML. Anëtarët shohin vetëm grupin e tyre.

## Kufizimet e offline
PWA mund të hapë faqet e cache-uara dhe të lexojë programin e fundit. Ndryshimet e administratorit dhe mesazhet e përdoruesve të tjerë nuk shfaqen derisa të rikthehet rrjeti. Mesazhet offline duhet të shfaqen qartë si **Në pritje**, jo **Dërguar**.

## API e propozuar
- GET /api/groups/:groupId/program
- POST /api/groups/:groupId/program (admin)
- GET /api/groups/:groupId/messages?cursor=...
- POST /api/groups/:groupId/messages (member)
- GET /api/groups/:groupId/notice
- PUT /api/groups/:groupId/notice (admin)

Cloudflare D1 për programin dhe chat-in, Cloudflare Worker për autentikim, role, validim dhe API. Për chat pothuajse real-time përdor polling ose Durable Objects/WebSockets nëse konfigurohen.

## Modeli i të dhënave
program_events: id, group_id, starts_at_utc, timezone, title, description, category, priority, location_name, maps_url, updated_at, deleted_at.
group_messages: id, group_id, sender_id, body, created_at, client_message_id, status.
group_notices: id, group_id, body, priority, updated_at.
group_members: group_id, user_id, role, active.

## Rregulla implementimi
- Importo të dhënat ekzistuese të localStorage me konfirmim; mos i fshi automatikisht.
- Të gjitha oraret e udhëtimit shfaqen sipas Mekës/Medinës, me shënim të qartë të zonës kohore.
- Offline queue përdor client_message_id unik për të shmangur dërgimet e dyfishta.
- Ruaj statusin e sinkronizimit dhe kohën e përditësimit të fundit.
- Mos përdor password të fortëkoduar (HTML ekzistues ka ADMIN_PASS).
- Nuk duhet pretenduar se chat-i është LIVE derisa API dhe autentikimi të jenë implementuar e testuar.

## Gjendja
Kjo është specifikimi i implementimit. Chat-i, D1, PWA offline dhe lidhja me ballinën nuk janë aktivizuar ende.
