const copy = {
  sq: {
    title: "Më njoftoni për Umren e ardhshme", firstName: "Emri", lastName: "Mbiemri",
    contact: "Shkruaj telefonin ose emailin.", phone: "Telefoni / WhatsApp", email: "Emaili",
    city: "Qyteti", send: "Dërgo interesimin", sent: "Interesimi u regjistrua.",
    failed: "Ruajtja e interesimit nuk u konfirmua. Provo përsëri."
  },
  de: {
    title: "Über die nächste Umra informieren", firstName: "Vorname", lastName: "Nachname",
    contact: "Bitte gib eine Telefonnummer oder E-Mail-Adresse an.", phone: "Telefon / WhatsApp",
    email: "E-Mail", city: "Ort", send: "Interesse anmelden", sent: "Dein Interesse wurde erfasst.",
    failed: "Die Speicherung wurde nicht bestätigt. Bitte versuche es erneut."
  }
};
const form = document.getElementById("interest");
const language = document.getElementById("language");
const result = document.getElementById("result");
let lang = localStorage.getItem("fahriu_language") === "de" ? "de" : "sq";
let status = "";

function render() {
  document.documentElement.lang = lang;
  language.textContent = lang === "sq" ? "Deutsch" : "Shqip";
  document.querySelectorAll("[data-text]").forEach(element => {
    element.textContent = copy[lang][element.dataset.text];
  });
  result.textContent = status ? copy[lang][status] : "";
}

language.onclick = () => {
  lang = lang === "sq" ? "de" : "sq";
  localStorage.setItem("fahriu_language", lang);
  render();
};

form.onsubmit = async event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  if (!data.phone.trim() && !data.email.trim()) {
    status = "contact";
    render();
    form.elements.phone.focus();
    return;
  }
  const submit = event.submitter;
  submit.disabled = true;
  status = "";
  render();
  try {
    const response = await fetch("/api/interest", {
      method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(data)
    });
    if (!response.ok || (await response.json()).ok !== true) throw new Error("Unconfirmed submission");
    form.reset();
    status = "sent";
  } catch {
    status = "failed";
  } finally {
    submit.disabled = false;
    render();
  }
};
render();
