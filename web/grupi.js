"use strict";

const strings = {
  sq: {
    heading:"Zona private e Umres", code:"Kodi personal i grupit", signIn:"Hyr", signOut:"Dil",
    chat:"Chati i grupit", meeting:"Takimet e grupit", program:"Programi LIVE", notice:"Njoftimet",
    admin:"Administrimi", message:"Mesazhi", send:"Dërgo", type:"Lloji",
    titleSq:"Titulli shqip", titleDe:"Titulli gjermanisht", detailsSq:"Udhëzimet shqip",
    detailsDe:"Udhëzimet gjermanisht", location:"Vendndodhja", date:"Data dhe ora (Arabia Saudite)",
    map:"Harta (URL HTTPS)", publish:"Ruaj", attendance:"E konfirmoj pjesëmarrjen",
    attending:"Pjesëmarrja u konfirmua", empty:"Ende nuk ka publikime këtu.",
    unavailable:"Lidhja me shërbimin e grupit nuk u realizua.", unauthorized:"Kodi i grupit është i pavlefshëm ose i çaktivizuar.",
    invalid:"Kontrollo fushat e plotësuara dhe datën.", forbidden:"Nuk ke autorizim për këtë veprim.",
    rate_limited:"Prit pak para se ta provosh përsëri.", missing:"Ky publikim nuk është më i disponueshëm.",
    organizer:"Organizator", guide:"Udhëheqës fetar", member:"Pjesëmarrës", saved:"U ruajt.",
    edit:"Ndrysho", cancel:"Anulo", remove:"Fshi", confirm:"Ta fshij përgjithmonë?",
    newMessages:"Mesazhe të reja", newUpdates:"Përditësime të reja të grupit"
  },
  de: {
    heading:"Privater Umra-Bereich", code:"Persönlicher Gruppencode", signIn:"Anmelden", signOut:"Abmelden",
    chat:"Gruppenchat", meeting:"Gruppentreffen", program:"Live-Programm", notice:"Mitteilungen",
    admin:"Verwaltung", message:"Nachricht", send:"Senden", type:"Kategorie",
    titleSq:"Albanischer Titel", titleDe:"Deutscher Titel", detailsSq:"Hinweise auf Albanisch",
    detailsDe:"Hinweise auf Deutsch", location:"Ort", date:"Datum und Uhrzeit (Saudi-Arabien)",
    map:"Karte (HTTPS-URL)", publish:"Speichern", attendance:"Teilnahme bestätigen",
    attending:"Teilnahme bestätigt", empty:"Hier gibt es noch keine Einträge.",
    unavailable:"Der Gruppendienst ist nicht erreichbar.", unauthorized:"Der Gruppencode ist ungültig oder deaktiviert.",
    invalid:"Bitte prüfe die Eingaben und das Datum.", forbidden:"Du hast keine Berechtigung für diese Aktion.",
    rate_limited:"Bitte warte kurz und versuche es erneut.", missing:"Dieser Eintrag ist nicht mehr verfügbar.",
    organizer:"Organisator", guide:"Religiöse Begleitung", member:"Teilnehmer", saved:"Gespeichert.",
    edit:"Bearbeiten", cancel:"Abbrechen", remove:"Löschen", confirm:"Dauerhaft löschen?",
    newMessages:"Neue Nachrichten", newUpdates:"Neue Gruppeninformationen"
  }
};

const byId = id => document.getElementById(id);
const publish = byId("publish");
let lang = localStorage.getItem("fahriu_language") === "de" ? "de" : "sq";
let token = "";
let session;
let messages = [];
let updates = [];
let editId;
let timer;
let generation = 0;
let lastUpdateSnapshot;
let lastMessageId;
let unread = 0;

const t = key => strings[lang][key] || strings[lang].unavailable;
const status = key => { byId("status").textContent = key ? t(key) : ""; };
const node = (tag, text) => {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
};

async function api(path, method = "GET", body) {
  try {
    const response = await fetch("/api/group/" + path, {
      method, cache:"no-store", credentials:"omit",
      headers:{Authorization:"Bearer " + token, ...(body ? {"Content-Type":"application/json"} : {})},
      body:body ? JSON.stringify(body) : undefined
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  } catch (error) {
    throw new Error(Object.hasOwn(strings[lang], error.message) ? error.message : "unavailable");
  }
}

function setLanguage() {
  document.documentElement.lang = lang;
  byId("language").textContent = lang === "sq" ? "Deutsch" : "Shqip";
  document.querySelectorAll("[data-text]").forEach(element => {
    element.textContent = t(element.dataset.text);
  });
}

function button(key, action, disabled = false) {
  const element = node("button", t(key));
  element.type = "button";
  element.disabled = disabled;
  element.onclick = () => run(action, element);
  return element;
}

function render() {
  if (!session) return;
  const requested = location.hash.slice(1);
  const organizer = session.role === "organizer";
  const view = ["meeting","program","notice"].includes(requested) || (organizer && requested === "admin")
    ? requested : "chat";
  byId("identity").textContent = session.group + " · " + session.name + " · " + t(session.role);
  byId("adminTab").hidden = !organizer;
  byId("chat").hidden = view !== "chat";
  byId("admin").hidden = view !== "admin";
  byId("updates").hidden = view === "chat" || view === "admin";
  if (view === "chat" && !document.hidden) unread = 0;
  byId("tabs").querySelectorAll("a").forEach(link => {
    const key = link.hash.slice(1);
    link.textContent = t(key) + (key === "chat" && unread ? " (" + unread + ")" : "");
    if (key === view) link.setAttribute("aria-current","page");
    else link.removeAttribute("aria-current");
  });
  if (view === "chat") {
    const rows = messages.map(message => {
      const row = node("li", "");
      row.append(node("strong", message.sender + " · " + t(message.role)),
        node("div", formatDate(message.created_at * 1000, "Asia/Riyadh")),
        node("p", message.body));
      if (organizer) row.append(button("remove", () => remove("messages", message.id)));
      return row;
    });
    byId("messages").replaceChildren(...(rows.length ? rows : [node("li", t("empty"))]));
    return;
  }
  if (view === "admin") return;
  byId("updateTitle").textContent = t(view);
  const cards = updates.filter(item => item.kind === view).map(item => {
    const card = node("article", "");
    card.append(node("h3", item["title_" + lang]), node("p", item["details_" + lang]));
    if (item.starts_at) card.append(node("p", ["Asia/Riyadh","Europe/Berlin"].map(zone =>
      formatDate(new Date(item.starts_at), zone)).join(" / ")));
    if (item.location) card.append(node("p", item.location));
    card.append(node("p", item.organizer));
    if (item.maps_url?.startsWith("https://")) {
      const link = node("a", t("map"));
      link.href = item.maps_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      const map = node("p", "");
      map.append(link);
      card.append(map);
    }
    if (view === "meeting") card.append(button(item.attending ? "attending" : "attendance", async () => {
      await api("attendance/" + item.id, "POST");
      await refresh();
    }, Boolean(item.attending)));
    if (organizer) card.append(button("edit", () => edit(item)),
      button("remove", () => remove("updates", item.id)));
    return card;
  });
  byId("items").replaceChildren(...(cards.length ? cards : [node("p", t("empty"))]));
}

function formatDate(date, timeZone) {
  return new Intl.DateTimeFormat(lang === "sq" ? "sq-AL" : "de-DE", {
    timeZone, dateStyle:"medium", timeStyle:"short"
  }).format(date) + " (" + timeZone.split("/")[1] + ")";
}

async function refresh() {
  const active = generation;
  const [chat, schedule] = await Promise.all([api("messages"), api("updates")]);
  if (active !== generation) return;
  const snapshot = JSON.stringify(schedule.items.map(({attending, ...item}) => item));
  if (lastUpdateSnapshot !== undefined && lastUpdateSnapshot !== snapshot) status("newUpdates");
  lastUpdateSnapshot = snapshot;
  if (lastMessageId !== undefined && (location.hash !== "#chat" || document.hidden)) {
    const count = chat.items.filter(item => item.id > lastMessageId).length;
    if (count) status("newMessages");
    unread += count;
  }
  lastMessageId = Math.max(lastMessageId || 0, chat.items.at(-1)?.id || 0);
  const changed = JSON.stringify(messages) !== JSON.stringify(chat.items)
    || JSON.stringify(updates) !== JSON.stringify(schedule.items);
  messages = chat.items;
  updates = schedule.items;
  if (changed) render();
}

async function poll() {
  const active = generation;
  try { await refresh(); }
  catch (error) {
    if (active !== generation) return;
    if (error.message === "unauthorized") logOut();
    status(error.message);
  }
  if (active === generation && session) timer = setTimeout(poll, 8000);
}

function logOut() {
  generation++;
  clearTimeout(timer);
  token = "";
  session = undefined;
  messages = [];
  updates = [];
  lastMessageId = undefined;
  lastUpdateSnapshot = undefined;
  unread = 0;
  resetEditor();
  byId("message").reset();
  byId("items").replaceChildren();
  byId("messages").replaceChildren();
  byId("identity").textContent = "";
  byId("private").hidden = true;
  byId("login").hidden = false;
  status();
}

async function run(action, control) {
  if (control) control.disabled = true;
  try { await action(); }
  catch (error) { status(error.message); }
  finally { if (control) control.disabled = false; }
}

function resetEditor() {
  publish.reset();
  publish.elements.kind.disabled = false;
  byId("cancelEdit").hidden = true;
  editId = undefined;
}

function edit(item) {
  resetEditor();
  editId = item.id;
  for (const key of ["kind","title_sq","title_de","details_sq","details_de","location","maps_url"]) {
    publish.elements[key].value = item[key] || "";
  }
  if (item.starts_at) {
    publish.elements.starts_at.value = new Date(Date.parse(item.starts_at) + 10800000).toISOString().slice(0,16);
  }
  publish.elements.kind.disabled = true;
  byId("cancelEdit").hidden = false;
  location.hash = "admin";
}

async function remove(type, id) {
  if (!confirm(t("confirm"))) return;
  await api(type + "/" + id, "DELETE");
  await refresh();
}

byId("login").onsubmit = event => {
  event.preventDefault();
  run(async () => {
    token = event.target.elements.token.value.trim();
    event.target.reset();
    try { session = await api("session"); }
    catch (error) { token = ""; throw error; }
    event.target.hidden = true;
    byId("private").hidden = false;
    status();
    render();
    await poll();
  }, event.submitter);
};
byId("message").onsubmit = event => {
  event.preventDefault();
  run(async () => {
    await api("messages", "POST", {body:event.target.elements.body.value});
    event.target.reset();
    await refresh();
  }, event.submitter);
};
publish.onsubmit = event => {
  event.preventDefault();
  run(async () => {
    const data = Object.fromEntries(new FormData(publish));
    data.kind = publish.elements.kind.value;
    if (data.starts_at) data.starts_at = new Date(data.starts_at + ":00+03:00").toISOString();
    await api(editId ? "updates/" + editId : "updates", editId ? "PUT" : "POST", data);
    resetEditor();
    status("saved");
    location.hash = data.kind;
    await refresh();
  }, event.submitter);
};
byId("cancelEdit").onclick = resetEditor;
byId("logout").onclick = logOut;
byId("language").onclick = () => {
  lang = lang === "sq" ? "de" : "sq";
  localStorage.setItem("fahriu_language", lang);
  setLanguage();
  render();
};
addEventListener("hashchange", render);
document.addEventListener("visibilitychange", render);
setLanguage();
