const VERSION = "0.2.9";
const OWNER_NAME = "Мурад";

const currencyMeta = {
  RUB: { title: "Рубли", symbol: "₽", fractionDigits: 2 },
  AED: { title: "Дирхамы", symbol: "AED", fractionDigits: 2 },
  USD: { title: "Доллары", symbol: "$", fractionDigits: 2 },
};

const loans = [
  {
    id: "loan-1",
    person: "Азамат",
    direction: "lent",
    amountKopecks: 1200000,
    paidKopecks: 400000,
    currency: "RUB",
    dueDate: "2026-07-22",
    status: "active",
    note: "Бронь билетов",
    createdAt: "2026-07-12",
    confirmedByOther: true,
  },
  {
    id: "loan-2",
    person: "Мурад",
    direction: "borrowed",
    amountKopecks: 500000,
    paidKopecks: 0,
    currency: "RUB",
    dueDate: "2026-07-16",
    status: "overdue",
    note: "Наличные до зарплаты",
    createdAt: "2026-07-10",
    confirmedByOther: true,
  },
  {
    id: "loan-3",
    person: "Руслан",
    direction: "lent",
    amountKopecks: 300000,
    paidKopecks: 0,
    currency: "RUB",
    dueDate: "2026-07-27",
    status: "pending",
    note: "Ждет подтверждения перевода",
    createdAt: "2026-07-17",
    confirmedByOther: false,
  },
  {
    id: "loan-4",
    person: "Сабина",
    direction: "borrowed",
    amountKopecks: 1800000,
    paidKopecks: 900000,
    currency: "RUB",
    dueDate: "2026-08-02",
    status: "active",
    note: "Оплата ремонта",
    createdAt: "2026-07-01",
    confirmedByOther: true,
  },
  {
    id: "loan-5",
    person: "Тимур",
    direction: "lent",
    amountKopecks: 700000,
    paidKopecks: 700000,
    currency: "RUB",
    dueDate: "2026-07-11",
    status: "closed",
    note: "Закрыто двумя сторонами",
    createdAt: "2026-06-20",
    confirmedByOther: true,
  },
];

const manualLedgerEvents = [
  {
    id: "event-aed-1",
    person: "Азамат",
    from: "me",
    to: "person",
    amountMinor: 100000,
    currency: "AED",
    type: "loan",
    date: "2026-07-10",
    note: "Наличные в дирхамах",
  },
];

const confirmations = [
  {
    id: "confirm-1",
    type: "Новый займ",
    title: "Руслан подтверждает 3 000 ₽",
    description: "Вы указали, что дали деньги. Вторая сторона еще не согласовала запись.",
  },
  {
    id: "confirm-2",
    type: "Платеж",
    title: "Азамат внес 4 000 ₽",
    description: "Платеж ожидает вашего подтверждения перед изменением остатка.",
  },
];

const state = {
  screen: "dashboard",
  previousScreen: "dashboard",
  selectedPerson: "Азамат",
  filter: "all",
  sort: "due",
};

const nodes = {
  screenTitle: document.querySelector("#screenTitle"),
  syncButton: document.querySelector("#syncButton"),
  syncState: document.querySelector("#syncState"),
  screens: [...document.querySelectorAll(".screen")],
  navButtons: [...document.querySelectorAll("[data-screen-target]")],
  filterButtons: [...document.querySelectorAll("[data-filter]")],
  metricButtons: [...document.querySelectorAll("[data-open-filter]")],
  sortSelect: document.querySelector("#sortSelect"),
  entryForm: document.querySelector("#entryForm"),
  entryDirection: document.querySelector("#entryDirection"),
  entryPerson: document.querySelector("#entryPerson"),
  entryAmount: document.querySelector("#entryAmount"),
  entryIssueDate: document.querySelector("#entryIssueDate"),
  entryDueDate: document.querySelector("#entryDueDate"),
  entryNote: document.querySelector("#entryNote"),
  entryStatus: document.querySelector("#entryStatus"),
  loanTemplate: document.querySelector("#loanRowTemplate"),
  confirmationTemplate: document.querySelector("#confirmationTemplate"),
  journalList: document.querySelector("#journalList"),
  journalEmpty: document.querySelector("#journalEmpty"),
  confirmationList: document.querySelector("#confirmationList"),
  netPosition: document.querySelector("#netPosition"),
  lentTotal: document.querySelector("#lentTotal"),
  borrowedTotal: document.querySelector("#borrowedTotal"),
  overdueTotal: document.querySelector("#overdueTotal"),
  pendingCount: document.querySelector("#pendingCount"),
  timelineTotal: document.querySelector("#timelineTotal"),
  trendLinePath: document.querySelector("#trendLinePath"),
  trendLineShadow: document.querySelector("#trendLineShadow"),
  barTrack: document.querySelector("#barTrack"),
  backToJournal: document.querySelector("#backToJournal"),
  personOwnerName: document.querySelector("#personOwnerName"),
  personCounterpartyName: document.querySelector("#personCounterpartyName"),
  personBalance: document.querySelector("#personBalance"),
  ledgerGroups: document.querySelector("#ledgerGroups"),
  ledgerEmpty: document.querySelector("#ledgerEmpty"),
};

document.title = `Eword Mobile Preview ${VERSION}`;

nodes.navButtons.forEach((button) => {
  button.addEventListener("click", () => setScreen(button.dataset.screenTarget));
});

nodes.metricButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.openFilter;
    setScreen("journal");
  });
});

nodes.filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    render();
  });
});

nodes.sortSelect.addEventListener("change", () => {
  state.sort = nodes.sortSelect.value;
  render();
});

nodes.journalList.addEventListener("click", (event) => {
  const row = event.target.closest(".loan-row");
  if (!row?.dataset.person) return;
  openPersonLedger(row.dataset.person);
});

nodes.backToJournal.addEventListener("click", () => setScreen(state.previousScreen || "journal"));

nodes.entryAmount.addEventListener("input", () => {
  const cursorAtEnd = nodes.entryAmount.selectionStart === nodes.entryAmount.value.length;
  nodes.entryAmount.value = formatAmountInput(nodes.entryAmount.value);
  if (cursorAtEnd) {
    nodes.entryAmount.setSelectionRange(nodes.entryAmount.value.length, nodes.entryAmount.value.length);
  }
});

nodes.syncButton.addEventListener("click", () => {
  nodes.syncButton.classList.add("spinning");
  nodes.syncState.textContent = "Синхронизация...";
  window.setTimeout(() => {
    nodes.syncButton.classList.remove("spinning");
    nodes.syncState.textContent = "Синхронизировано только что";
  }, 650);
});

nodes.confirmationList.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  const row = event.target.closest(".confirm-row");
  if (!button || !row) return;

  row.classList.add(button.dataset.action === "approve" ? "approved" : "declined");
  window.setTimeout(() => row.remove(), 220);
});

nodes.entryForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const person = nodes.entryPerson.value.trim();
  const amountKopecks = parseAmountToKopecks(nodes.entryAmount.value);
  const issueDate = nodes.entryIssueDate.value;
  const dueDate = nodes.entryDueDate.value;
  const note = nodes.entryNote.value.trim();

  if (!person || !issueDate || !dueDate || !note || !Number.isInteger(amountKopecks) || amountKopecks <= 0) {
    nodes.entryStatus.textContent = "Заполните все обязательные поля.";
    return;
  }

  const loan = {
    id: `loan-${Date.now()}`,
    person,
    direction: nodes.entryDirection.value,
    amountKopecks,
    paidKopecks: 0,
    currency: "RUB",
    dueDate,
    status: "pending",
    note,
    createdAt: issueDate,
    confirmedByOther: false,
  };

  loans.unshift(loan);
  confirmations.unshift({
    id: `confirm-${Date.now()}`,
    type: "Новый займ",
    title: `${person} подтверждает ${formatMoney(amountKopecks, "RUB")}`,
    description: "Запись создана вручную и ожидает подтверждения второй стороны.",
  });

  nodes.entryForm.reset();
  nodes.entryStatus.textContent = "Запись создана и добавлена в журнал.";
  state.filter = "all";
  state.sort = "created";
  nodes.sortSelect.value = "created";
  setScreen("journal");
});

render();

function setScreen(screen) {
  state.screen = screen;
  render();
}

function openPersonLedger(person) {
  state.selectedPerson = person;
  state.previousScreen = state.screen === "person" ? state.previousScreen : state.screen;
  setScreen("person");
}

function render() {
  renderScreen();
  renderDashboard();
  renderDebtTimeline();
  renderJournal();
  renderConfirmations();
  renderPersonLedger();
}

function renderScreen() {
  const titles = {
    dashboard: "Дашборд",
    journal: "Журнал",
    confirmations: "Подтверждения",
    create: "Новая запись",
    profile: "Профиль",
    person: state.selectedPerson,
  };

  nodes.screenTitle.textContent = titles[state.screen];
  nodes.screens.forEach((screen) => screen.classList.toggle("active", screen.dataset.screen === state.screen));
  nodes.navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.screenTarget === state.screen);
  });
  nodes.filterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === state.filter);
  });
}

function renderDashboard() {
  const activeLoans = loans.filter((loan) => loan.status !== "closed");
  const lent = sum(activeLoans.filter((loan) => loan.direction === "lent"));
  const borrowed = sum(activeLoans.filter((loan) => loan.direction === "borrowed"));
  const overdue = sum(activeLoans.filter((loan) => loan.status === "overdue"));
  const pending = loans.filter((loan) => loan.status === "pending").length + confirmations.length;

  nodes.netPosition.textContent = formatMoney(lent - borrowed, "RUB");
  nodes.lentTotal.textContent = formatMoney(lent, "RUB");
  nodes.borrowedTotal.textContent = formatMoney(borrowed, "RUB");
  nodes.overdueTotal.textContent = formatMoney(overdue, "RUB");
  nodes.pendingCount.textContent = String(pending);
}

function renderDebtTimeline() {
  const points = buildDebtTimeline(loans.filter((loan) => loan.status !== "closed"));
  const total = points.at(-1)?.positionKopecks ?? 0;

  nodes.timelineTotal.textContent = formatMoney(total, "RUB");
  nodes.timelineTotal.classList.toggle("negative", total < 0);
  nodes.timelineTotal.classList.toggle("positive", total > 0);

  if (points.length === 0) {
    nodes.barTrack.replaceChildren();
    nodes.trendLinePath.setAttribute("points", "");
    nodes.trendLineShadow.setAttribute("points", "");
    return;
  }

  const maxDelta = Math.max(...points.map((point) => Math.abs(point.deltaKopecks)), 1);
  const lineValues = points.map((point) => point.positionKopecks);
  const minValue = Math.min(0, ...lineValues);
  const maxValue = Math.max(0, ...lineValues);
  const valueRange = maxValue - minValue || 1;
  const linePoints = points.map((point, index) => {
    const x = points.length === 1 ? 150 : (index / (points.length - 1)) * 300;
    const y = 124 - ((point.positionKopecks - minValue) / valueRange) * 112;
    return `${roundChartNumber(x)},${roundChartNumber(y)}`;
  }).join(" ");

  nodes.trendLinePath.setAttribute("points", linePoints);
  nodes.trendLineShadow.setAttribute("points", linePoints);
  nodes.barTrack.style.gridTemplateColumns = `repeat(${points.length}, minmax(0, 1fr))`;
  nodes.barTrack.replaceChildren(...points.map((point) => renderTimelineColumn(point, maxDelta)));
}

function renderTimelineColumn(point, maxDelta) {
  const column = document.createElement("div");
  column.className = `bar-column ${point.deltaKopecks < 0 ? "negative" : point.deltaKopecks > 0 ? "positive" : "zero"}`;
  column.title = `${point.label}: изменение ${formatMoney(point.deltaKopecks, "RUB")}, позиция ${formatMoney(point.positionKopecks, "RUB")}`;

  const bar = document.createElement("i");
  bar.style.height = `${Math.max(14, Math.round((Math.abs(point.deltaKopecks) / maxDelta) * 82))}px`;

  const amount = document.createElement("strong");
  amount.textContent = formatCompactMoney(point.deltaKopecks, "RUB");

  const label = document.createElement("span");
  label.textContent = point.shortLabel;

  column.append(bar, amount, label);
  return column;
}

function buildDebtTimeline(items) {
  const byMonth = new Map();

  items.forEach((loan) => {
    if (!loan.dueDate) return;

    const date = parseDate(loan.dueDate);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const current = byMonth.get(key) ?? { date, deltaKopecks: 0 };
    const signedAmount = loan.direction === "lent" ? getRemainingKopecks(loan) : -getRemainingKopecks(loan);
    current.deltaKopecks += signedAmount;
    byMonth.set(key, current);
  });

  let positionKopecks = 0;
  return [...byMonth.values()]
    .sort((a, b) => a.date - b.date)
    .map((point) => {
      positionKopecks += point.deltaKopecks;
      return {
        ...point,
        positionKopecks,
        label: formatMonth(point.date, "long"),
        shortLabel: formatMonth(point.date, "short"),
      };
    });
}

function renderJournal() {
  const filtered = loans.filter((loan) => {
    if (state.filter === "all") return true;
    if (state.filter === "pending") return loan.status === "pending";
    if (state.filter === "closed") return loan.status === "closed";
    if (state.filter === "overdue") return loan.status === "overdue";
    return loan.direction === state.filter;
  });

  const sorted = filtered.toSorted((a, b) => {
    if (state.sort === "amount") return getRemainingKopecks(b) - getRemainingKopecks(a);
    if (state.sort === "created") return new Date(b.createdAt) - new Date(a.createdAt);
    if (state.sort === "status") return statusWeight(a) - statusWeight(b);
    return new Date(a.dueDate || "2099-12-31") - new Date(b.dueDate || "2099-12-31");
  });

  nodes.journalList.replaceChildren(...sorted.map((loan) => renderLoanRow(loan, "journal")));
  nodes.journalEmpty.classList.toggle("visible", sorted.length === 0);
}

function renderConfirmations() {
  nodes.confirmationList.replaceChildren(...confirmations.map(renderConfirmation));
}

function renderPersonLedger() {
  const person = state.selectedPerson;
  const groups = groupLedgerByCurrency(getLedgerEventsForPerson(person));

  nodes.personOwnerName.textContent = OWNER_NAME;
  nodes.personCounterpartyName.textContent = person;
  nodes.personBalance.textContent = groups.length ? buildLedgerSummary(groups, person).join(" · ") : "Операций пока нет";
  nodes.ledgerGroups.replaceChildren(...groups.map((group) => renderCurrencyLedger(group, person)));
  nodes.ledgerEmpty.classList.toggle("visible", groups.length === 0);
}

function renderCurrencyLedger(group, person) {
  const section = document.createElement("section");
  section.className = "ledger-currency";

  const heading = document.createElement("h2");
  heading.textContent = getCurrencyTitle(group.currency);

  const grid = document.createElement("div");
  grid.className = "ledger-grid";
  grid.append(...group.events.map((item) => renderLedgerEntry(item)));

  const summary = document.createElement("p");
  summary.className = "ledger-total";
  summary.textContent = formatLedgerBalance(group.balanceMinor, group.currency, person);

  section.append(heading, grid, summary);
  return section;
}

function renderLedgerEntry(item) {
  const article = document.createElement("article");
  article.className = `ledger-entry ${item.from === "me" ? "from-owner" : "from-person"}`;

  const meta = document.createElement("span");
  meta.textContent = `${formatDate(item.date)} · ${getEventLabel(item.type)}`;

  const amount = document.createElement("strong");
  amount.textContent = formatMoney(item.amountMinor, item.currency);

  const note = document.createElement("p");
  note.textContent = item.note || "Без комментария";

  article.append(meta, amount, note);
  return article;
}

function renderLoanRow(loan, mode) {
  const fragment = nodes.loanTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".loan-row");
  const avatar = fragment.querySelector(".row-avatar");
  const title = fragment.querySelector("h3");
  const note = fragment.querySelector("p");
  const meta = fragment.querySelector(".row-meta");
  const amount = fragment.querySelector(".row-side strong");
  const status = fragment.querySelector(".status-pill");

  row.classList.add(loan.status);
  row.dataset.person = loan.person;
  row.setAttribute("role", "button");
  row.tabIndex = 0;
  avatar.textContent = loan.person.slice(0, 1);
  title.textContent = loan.person;
  note.textContent = loan.note;
  meta.textContent = buildMeta(loan, mode);
  amount.textContent = formatMoney(getRemainingKopecks(loan), loan.currency || "RUB");
  status.textContent = getStatusLabel(loan);
  status.className = `status-pill ${loan.status}`;

  return fragment;
}

function renderConfirmation(item) {
  const fragment = nodes.confirmationTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".confirm-row");
  row.dataset.id = item.id;
  fragment.querySelector(".request-type").textContent = item.type;
  fragment.querySelector("h3").textContent = item.title;
  fragment.querySelector("p").textContent = item.description;
  return fragment;
}

function getLedgerEventsForPerson(person) {
  return [...buildLoanLedgerEvents(), ...manualLedgerEvents]
    .filter((item) => item.person === person)
    .toSorted((a, b) => new Date(a.date) - new Date(b.date));
}

function buildLoanLedgerEvents() {
  return loans.flatMap((loan) => {
    const currency = loan.currency || "RUB";
    const events = [
      {
        id: `${loan.id}-principal`,
        person: loan.person,
        from: loan.direction === "lent" ? "me" : "person",
        to: loan.direction === "lent" ? "person" : "me",
        amountMinor: loan.amountKopecks,
        currency,
        type: "loan",
        date: loan.createdAt,
        note: loan.note,
      },
    ];

    if (loan.paidKopecks > 0) {
      events.push({
        id: `${loan.id}-repayment`,
        person: loan.person,
        from: loan.direction === "lent" ? "person" : "me",
        to: loan.direction === "lent" ? "me" : "person",
        amountMinor: loan.paidKopecks,
        currency,
        type: "repayment",
        date: loan.dueDate,
        note: "Частичный возврат",
      });
    }

    return events;
  });
}

function groupLedgerByCurrency(events) {
  const groups = new Map();

  events.forEach((item) => {
    const group = groups.get(item.currency) ?? { currency: item.currency, events: [], balanceMinor: 0 };
    group.events.push(item);
    group.balanceMinor += item.from === "me" ? item.amountMinor : -item.amountMinor;
    groups.set(item.currency, group);
  });

  return [...groups.values()].filter((group) => group.events.length > 0);
}

function buildLedgerSummary(groups, person) {
  return groups.map((group) => formatLedgerBalance(group.balanceMinor, group.currency, person));
}

function formatLedgerBalance(balanceMinor, currency, person) {
  if (balanceMinor > 0) return `${person} должен ${OWNER_NAME} ${formatMoney(balanceMinor, currency)}`;
  if (balanceMinor < 0) return `${OWNER_NAME} должен ${person} ${formatMoney(Math.abs(balanceMinor), currency)}`;
  return `${OWNER_NAME} и ${person}: закрыто ${formatMoney(0, currency)}`;
}

function buildMeta(loan, mode) {
  const side = loan.direction === "lent" ? "Я дал" : "Мне дали";
  const due = loan.dueDate ? `срок ${formatDate(loan.dueDate)}` : "без срока";
  const confirmation = loan.confirmedByOther ? "подтверждено" : "ждет вторую сторону";
  return mode === "action" ? `${side} · ${getStatusLabel(loan)} · ${due}` : `${side} · ${due} · ${confirmation}`;
}

function getStatusLabel(loan) {
  const labels = {
    active: "Активен",
    overdue: "Просрочен",
    pending: "Ожидает",
    closed: "Закрыт",
  };
  return labels[loan.status] || "Активен";
}

function getEventLabel(type) {
  const labels = {
    loan: "Передача",
    repayment: "Возврат",
  };
  return labels[type] || "Операция";
}

function statusWeight(loan) {
  const weights = { overdue: 0, pending: 1, active: 2, closed: 3 };
  return weights[loan.status] ?? 4;
}

function sum(items) {
  return items.reduce((total, loan) => total + getRemainingKopecks(loan), 0);
}

function getRemainingKopecks(loan) {
  return Math.max(0, loan.amountKopecks - loan.paidKopecks);
}

function parseAmountToKopecks(value) {
  const normalized = value.replace(/\s/g, "").replace(".", ",");
  if (!/^\d+(,\d{0,2})?$/.test(normalized)) return Number.NaN;

  const [rubles, kopecks = ""] = normalized.split(",");
  return Number(rubles) * 100 + Number(kopecks.padEnd(2, "0"));
}

function formatAmountInput(value) {
  const normalized = value.replace(/[^\d,]/g, "");
  const [rawInteger, rawDecimal = ""] = normalized.split(",");
  const integer = rawInteger.replace(/^0+(?=\d)/, "");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const decimal = rawDecimal.slice(0, 2);

  if (normalized.includes(",")) return `${grouped || "0"},${decimal}`;
  return grouped;
}

function formatMoney(amountMinor, currency = "RUB") {
  const meta = currencyMeta[currency] || currencyMeta.RUB;
  const sign = amountMinor < 0 ? "- " : "";
  const amount = Math.abs(amountMinor) / 100;
  const value = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: meta.fractionDigits,
    maximumFractionDigits: meta.fractionDigits,
  }).format(amount);
  return currency === "RUB" ? `${sign}${value} ${meta.symbol}` : `${sign}${value} ${currency}`;
}

function formatCompactMoney(amountMinor, currency = "RUB") {
  const sign = amountMinor < 0 ? "-" : amountMinor > 0 ? "+" : "";
  const amount = Math.abs(amountMinor) / 100;
  const suffix = currency === "RUB" ? "₽" : currency;
  if (amount >= 1000000) return `${sign}${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(amount / 1000000)} млн ${suffix}`;
  if (amount >= 1000) return `${sign}${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(amount / 1000)} тыс ${suffix}`;
  return `${sign}${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(amount)} ${suffix}`;
}

function getCurrencyTitle(currency) {
  return currencyMeta[currency]?.title || currency;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" }).format(parseDate(value));
}

function formatMonth(date, monthStyle) {
  return new Intl.DateTimeFormat("ru-RU", { month: monthStyle }).format(date);
}

function parseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function roundChartNumber(value) {
  return Math.round(value * 10) / 10;
}
