const CONTACTS_STORAGE_KEY = "eword.contacts.v1";

const defaultContactNames = [...new Set(loans.map((loan) => loan.person))];
let savedContacts = loadContacts();

const profileScreen = document.querySelector("#profileScreen");
const updateLog = profileScreen?.querySelector(".update-log");

if (profileScreen) {
  const section = document.createElement("section");
  section.className = "contacts-panel";
  section.setAttribute("aria-label", "Контакты");
  section.innerHTML = `
    <div class="contacts-head">
      <div>
        <h2>Контакты</h2>
        <p>Люди, с которыми ведутся расчеты</p>
      </div>
      <button class="contacts-add" id="contactAddButton" type="button" aria-label="Добавить контакт">+</button>
    </div>
    <form class="contact-form" id="contactForm" hidden>
      <label>Имя<input id="contactName" type="text" placeholder="Имя" autocomplete="name" required /></label>
      <label>Телефон<input id="contactPhone" type="tel" placeholder="+971 50 123 4567" autocomplete="tel" /></label>
      <label>Email<input id="contactEmail" type="email" placeholder="name@example.com" autocomplete="email" /></label>
      <div class="contact-form-actions">
        <button class="contact-cancel" id="contactCancelButton" type="button">Отмена</button>
        <button class="contact-save" type="submit">Сохранить</button>
      </div>
    </form>
    <div class="contacts-list" id="contactsList"></div>
    <p class="contacts-empty" id="contactsEmpty" hidden>Контактов пока нет.</p>
  `;
  profileScreen.insertBefore(section, updateLog || null);

  const addButton = section.querySelector("#contactAddButton");
  const form = section.querySelector("#contactForm");
  const cancelButton = section.querySelector("#contactCancelButton");
  const list = section.querySelector("#contactsList");
  const empty = section.querySelector("#contactsEmpty");
  const nameInput = section.querySelector("#contactName");
  const phoneInput = section.querySelector("#contactPhone");
  const emailInput = section.querySelector("#contactEmail");

  addButton.addEventListener("click", () => {
    form.hidden = !form.hidden;
    if (!form.hidden) nameInput.focus();
  });

  cancelButton.addEventListener("click", () => {
    form.reset();
    form.hidden = true;
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const email = emailInput.value.trim();
    if (!name) return;

    const existing = savedContacts.find((contact) => normalize(contact.name) === normalize(name));
    if (existing) {
      existing.name = name;
      existing.phone = phone;
      existing.email = email;
    } else {
      savedContacts.push({ id: `contact-${Date.now()}`, name, phone, email });
    }

    saveContacts();
    form.reset();
    form.hidden = true;
    renderContacts();
  });

  list.addEventListener("click", (event) => {
    const ledgerButton = event.target.closest("[data-contact-ledger]");
    if (!ledgerButton) return;
    openPersonLedger(ledgerButton.dataset.contactLedger);
  });

  renderContacts();

  function renderContacts() {
    const contacts = buildContactView();
    list.replaceChildren(...contacts.map(renderContactCard));
    empty.hidden = contacts.length > 0;
  }
}

function buildContactView() {
  const byName = new Map();
  savedContacts.forEach((contact) => byName.set(normalize(contact.name), { ...contact }));

  defaultContactNames.forEach((name) => {
    const key = normalize(name);
    if (!byName.has(key)) byName.set(key, { id: `derived-${key}`, name, phone: "", email: "" });
  });

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

function renderContactCard(contact) {
  const card = document.createElement("article");
  card.className = "contact-card";
  const initials = contact.name.trim().slice(0, 1).toUpperCase() || "?";
  const personLoans = loans.filter((loan) => normalize(loan.person) === normalize(contact.name) && loan.status !== "closed");
  const net = personLoans.reduce((total, loan) => {
    const remaining = Math.max(0, loan.amountKopecks - (loan.paidKopecks || 0));
    return total + (loan.direction === "lent" ? remaining : -remaining);
  }, 0);
  const balanceText = net === 0 ? "0 ₽" : formatMoney(net, "RUB");
  const balanceLabel = net > 0 ? "Должен вам" : net < 0 ? "Вы должны" : "Баланс";

  card.innerHTML = `
    <div class="contact-card-top">
      <div class="contact-avatar">${escapeHtml(initials)}</div>
      <div class="contact-main">
        <h3>${escapeHtml(contact.name)}</h3>
        <div class="contact-meta">
          <span>${contact.phone ? escapeHtml(contact.phone) : "Телефон не указан"}</span>
          <span>${contact.email ? escapeHtml(contact.email) : "Email не указан"}</span>
        </div>
      </div>
    </div>
    <div class="contact-balance"><span>${balanceLabel}</span><strong class="${net > 0 ? "positive" : net < 0 ? "negative" : ""}">${escapeHtml(balanceText)}</strong></div>
    <div class="contact-actions">
      ${contact.phone ? `<a class="contact-link" href="tel:${escapeAttribute(contact.phone)}">Позвонить</a>` : ""}
      <button class="contact-ledger" type="button" data-contact-ledger="${escapeAttribute(contact.name)}">Открыть сверку</button>
    </div>
  `;
  return card;
}

function loadContacts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CONTACTS_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.name === "string") : [];
  } catch {
    return [];
  }
}

function saveContacts() {
  localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(savedContacts));
}

function normalize(value) {
  return String(value || "").trim().toLocaleLowerCase("ru");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
