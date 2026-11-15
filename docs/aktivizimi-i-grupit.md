# Aktivizimi i grupit privat

## Gjendja e integrimit

Faqja e publikuar në Netlify përdor një variant tjetër të ballinës. Ajo ka formularin e interesimit, funksionin Plotësimi dhe një lidhje me Apps Script. Dega e integrimit shton zonën private, kurse ballina e publikuar dhe Apps Script mbeten në përdorim derisa burimi i tyre të bashkohet e të testohet me këtë degë.

## Cloudflare dhe Netlify

- Në Worker-in ekzistues shto lidhjen D1 me emrin `DB`. Apliko migrimin `worker/migrations/0001_group.sql` fillimisht në një databazë prove. Para migrimit në databazën e përdorur bëj eksportin e saj.
- Vendos origjinën e Netlify në `ALLOWED_ORIGINS`. Për prova shto edhe origjinën e saktë të deploy preview.
- Vendos `FAHRIU_WORKER_ORIGIN` në Netlify te variablat e funksioneve, me origjinën HTTPS të Worker-it.
- Testo fillimisht deploy preview, me përdorues sintetikë. Verifiko formularin ekzistues të interesimit dhe Plotësimi në versionin që do të publikohet.
- Verifiko që `/api/group/session` pa kod jep 401 përmes Netlify. 503 tregon që lidhja me Worker-in ose databazën nuk është gati.

## Anëtarësia

Përdor një kod kriptografik unik prej 32 bajtesh të përfaqësuar me 64 karaktere hex për secilin pjesëmarrës të konfirmuar. Ruaj vetëm SHA-256 të kodit te `travel_members.token_hash`. Përdor të njëjtin identifikues të grupit për anëtarët. Shpërndaje kodin individual përmes një kanali privat dhe mos e vendos në URL. Çaktivizimi bëhet me `active = 0`. Rolet janë `organizer`, `guide` dhe `member`. Administrimi i kodeve bëhet në D1 derisa të ndërtohet ndërfaqja për anëtarësinë.

## AppCreator24 dhe Android

Pas verifikimit në Netlify, lidhi rubrikat origjinale të AppCreator24 me `/grupi.html#chat`, `#meeting`, `#program` dhe `#notice`, duke ruajtur ID-të e tyre. Android i GitHub ridrejton rubrikat private në të njëjtën faqe HTTPS. Kodi personal qëndron në memorien e faqes deri në dalje ose ringarkim. Të dhënat private nuk futen në cache offline.

## Testet

`node --test worker/test/group.test.js` me Node 24 verifikon rrjedhën e Worker-it me skemën SQLite të migrimit, me përdorues prove. Deploy-i, WebView dhe njoftimet në pajisje kontrollohen pasi të lidhen shërbimet reale.
