# Chati i grupit

Hyrja e chatit është vendosur në qendër të pjesës së sipërme në web/index.html dhe në ballinën origjinale Netlify (integrations/netlify/index.html). Faqja chat.html, chat.js dhe chat.css është e njëjtë në të dy versionet. API përdor deployment-in ekzistues të FAHRIU_TRAVEL_MASTER_API.

Backend shton Chat_Anetaret dhe Chat_Mesazhet në Sheet-in ekzistues gjatë kërkesës së parë. Hyrjet e reja janë joaktive. Organizatori miraton anëtarin duke vendosur aktiv=TRUE dhe grupin e duhur në Chat_Anetaret. Token-i ruhet vetëm si SHA-256 në server. Emri nuk është provë identiteti; organizatori duhet të njohë personin para miratimit.

Pa internet, drafti dhe radha ruhen në pajisje. Mesazhet kanë UUID dhe serveri i pranon vetëm një herë. Radha pastrohet vetëm pas konfirmimit të serverit. API dhe mesazhet private nuk futen në cache të service worker-it. Ndryshimi i pajisjes kërkon miratim të ri.

Netlify aktualisht publikohet me Drop, jo automatikisht nga ky repository. Për përditësim duhet të ruhet i gjithë deploy-i ekzistues dhe të zëvendësohen vetëm index.html, sw.js, netlify.toml dhe tre skedarët e chatit. Versioni i plotë origjinal ka edhe faqe të tjera me kontrolle administrimi vetëm në klient; ato nuk janë sistem autentikimi për chatin dhe nuk janë importuar në GitHub.

AppCreator: rubrika Web me URL https://fahriu-travel-umrah.netlify.app/chat.html. Ballina AppCreator që ngarkohet nga Netlify merr automatikisht hyrjen e chatit; ballina me HTML të veçantë duhet të përditësohet në panel.
