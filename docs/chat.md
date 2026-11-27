# Chati dhe programi privat i Umres

Hyrja nis te Ballina, Grupi i Umres ose Programi LIVE. Umrexhiu shkruan emrin dhe mbiemrin. Organizatori e verifikon personin me listën private të udhëtarëve dhe cakton grupin në `Chat_Anetaret` para se ta vendosë `aktiv=TRUE`. Hyrja vlen për pajisjen që bëri kërkesën. Emri i njëjtë në një pajisje tjetër kërkon verifikim të ri.

`integrations/apps-script/chat-audio.gs` zëvendëson funksionet e chatit në projektin Apps Script ekzistues. Ruaj të njëjtën adresë të prodhimit kur publikon versionin e ri. Në `doPost` mbaj veprimet `chat_join`, `chat_sync`, `chat_send` dhe `chat_audio` të drejtuara te `ftChat_`. Emrat, përmbajtja private dhe tokenët nuk vendosen në GitHub apo në skedarët statikë.

Shkruaj programin e udhëtimit në fletën private `Chat_Vizitat`, me kolonat `grupi`, `titulli`, `detajet`. Vlera e grupit duhet të përputhet me `Chat_Anetaret`. Çdo rresht mund të përmbajë datën, orën lokale, pikën e takimit dhe udhëzimet e vizitës. Organizatori duhet të plotësojë programin real dhe të heqë nga API-ja publike `pilgrims` çdo të dhënë që nuk synon të mbetet publike. Kontrollo lejet e vetë dokumentit të Sheets.

Teksti, audioja dhe fotografitë ruhen në pritje në pajisje. Audioja dhe fotografitë ruhen në IndexedDB dhe radhës i hiqen vetëm pas konfirmimit të serverit. Serveri përdor të njëjtin ID për riprovimet dhe kontrollon grupin edhe kur hapet një skedar. Media që hapet një herë ruhet lokalisht. Pajisja e miratuar mund të lexojë kopjen e fundit të programit edhe pa internet. Revokimi zbatohet në server menjëherë dhe në ndërfaqe pas sinkronizimit të pajisjes. Përdor pajisje personale për të mbajtur private kopjet offline.

## Publikimi

- Publiko së pari versionin e Apps Script. Provo me dy pajisje që fotografia, audioja dhe programi ju shfaqen vetëm anëtarëve të miratuar të të njëjtit grup.
- Përdor `integrations/netlify/` për faqet PWA dhe `web/` për paketën Android. Krahasoji me `diff -qr -x netlify.toml web integrations/netlify`. Për Netlify Drop ruaj fillimisht kopjen e deploy-it ekzistues dhe mbivendos skedarët e përditësuar që të ruhen edhe faqet që nuk ndodhen në këtë depo. Nëse Netlify lidhet me depon, përdor cilësimet e `netlify.toml` në rrënjë pasi të jenë importuar të gjithë skedarët e prodhimit.
- AppCreator24 përdor të njëjtin chat kur rubrika Web ngarkon `https://fahriu-travel-umrah.netlify.app/chat.html`. Kontrollo në telefon nëse WebView lejon kamerën, mikrofonin dhe përzgjedhjen e fotografisë. Chati përmban lidhjen për hapje në shfletues.
- Burimet e materialeve lokale janë arkivat ekzistuese `udhezuesi-i-umres` dhe `fahriu-travel-komplet-foto-video-vizita-26-08-2026` në Internet Archive, të referuara më parë nga vetë aplikacioni.
