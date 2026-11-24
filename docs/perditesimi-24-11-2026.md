# Fahriu Travel · 24 nëntor 2026

Burimi i plotë i faqes ekzistuese ruhet në `integrations/netlify/`; i njëjti material përdoret në `web/` për paketën Android. Netlify i projektit ekzistues publikohet manualisht, jo automatikisht nga GitHub.

- Chat privat me miratim ekzistues, tekst/audio (60 sekonda, 1 MiB), IndexedDB për audio dhe radhë offline me UUID e konfirmim serveri. Regjistrimi kërkon HTTPS dhe leje mikrofoni; WebView pa mbështetje mund të përdorë skedar ose shfletues.
- Backend Apps Script: `integrations/apps-script/chat-audio.gs` zëvendëson funksionet e chatit; `chat_audio` shtohet te doPost. Ruajtja me pjesë në Chat_Audio përdor lejet ekzistuese të Sheets, pa dosje audio publike. API lejon lexim vetëm për grupin e anëtarit të miratuar.
- Udhëzuesi real me22 hapa ruan fotografitë/progresin dhe shton dua me burime e numëruesit.
- Vizitat origjinale të tri qyteteve ruhen. Faqja e re e GPS shton9 vende, kërkim, largësi ajrore, renditje dhe navigim me kërkesë të përdoruesit. Vendndodhja nuk dërgohet në serverin e grupit.
- Lista publike lexon Umregjitë nga API dhe ruhet offline. Simer Halili u shtua në Sheet si personi24; emrat nuk janë hardcoded në burim.
- Njoftimet lexojnë burimin real. Njoftimet e shfletuesit funksionojnë gjatë hapjes së faqes; Web Push për aplikacion të mbyllur kërkon konfigurim tjetër. AppCreator ka kanalin e vet ekzistues të njoftimeve.

Kontrolle: sintaksa e skripteve; teste të chatit offline dhe ack; izolimi i grupeve/approval/idempotency/validimi audio në backend; numëruesit;22 hapa; filtrat e vizitave; mapimi i njoftimeve. Mikrofoni/GPS/WebView kërkojnë provë në telefon real.

## Mikrofoni · korrigjimi

Chati regjistron vetëm nga mikrofoni: Fol me mikrofon → Ndalo → dëgjo → Dërgo mesazhin zanor. Zgjedhësi i skedarëve audio u hoq. Android kërkon RECORD_AUDIO vetëm kur shtypet mikrofoni, pranon vetëm AUDIO_CAPTURE nga origjina e paketuar dhe ngarkon faqet lokale nga WebViewAssetLoader HTTPS që regjistrimi të jetë i disponueshëm edhe pa internet. Kamera dhe origjinat e jashtme nuk marrin leje.

`node tests/chat-microphone.cjs` kontrollon refuzimin/riprovimin e lejes, shmangien e regjistrimeve të dyfishta, ndaljen/lirimin e mikrofonit, parapamjen, radhën offline dhe heqjen e regjistrimit. Prova në mikrofon fizik mbetet në telefon.
