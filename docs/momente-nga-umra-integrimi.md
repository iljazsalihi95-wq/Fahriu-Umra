# Momente nga Umra — specifikim integrimi

Ky modul ruan Media API ekzistuese të Fahriu Travel dhe nuk ndryshon identitetin vizual të HTML-së origjinale.

## Të dhënat
Fushat ekzistuese: ID, Lloji, Titulli, Përshkrimi, URL, Renditja, Aktive, Banner, Viti, Shënim.
Fusha e re: Data (YYYY-MM-DD). Data mund të jetë bosh për arkivat ku nuk dihet data e saktë; mos shpik datë nga viti.
Filtrat publikë: Viti, Lloji (FOTO/VIDEO), kërkim sipas titullit dhe përshkrimit, renditje sipas datës.
Administrimi: shtim, editim, çaktivizim dhe riaktivizim. Mos fshi materialet nga arkivi gjatë çaktivizimit.

## Siguria dhe sinkronizimi
Mos ruaj fjalëkalimin e administratorit në sessionStorage. Mos e trajto përgjigjen për ID '__TEST__' si provë të autentikimit. Verifikimi duhet të bëhet nga backend me sesion të kufizuar, jo me fjalëkalim të dërguar në çdo kërkesë.
API publike duhet të japë vetëm materialet aktive. API administrative duhet të kthejë edhe joaktivet vetëm pas autentikimit.
Ruaj gjendjen e fundit publike lokalisht për shfaqje offline, por jo fjalëkalimet, tokenët apo dokumentet private.

## Probleme në HTML-në e dorëzuar
- loadMedia() përdor activeOnly=true dhe pastaj renderAdminList() lexon allItems; kështu materialet joaktive nuk mund të riaktivizohen nga lista.
- Fushat e formularit nuk përmbajnë datën e fotografimit.
- Nëse API kthen listë bosh, faqja kthehet te arkivi rezervë dhe mund të paraqesë materiale të vjetra si aktuale.
- URL-të view_archive.php të Archive.org për MP4 kërkojnë provë të veçantë për playback në pajisje.
- Përmbajtja e URL-ve të futura nga administratori duhet validuar (https) dhe event handlers të mos ndërtohen me interpolim të URL-ve.

## Verifikimi para publikimit
Testo: listimin e 2025; shtimin e 2026 me datë; filtrimin; çaktivizimin/riaktivizimin; fotografinë e plotë; videon në Android; modalin; gjendjen offline.
