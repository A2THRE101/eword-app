const VERSION = "1.0.1";
const store = window.EwordSupabaseStore;

const seedLoans = [
  {
    id: "loan-1",
    person: "Азамат",
    direction: "lent",
    amountKopecks: 1200000,
    paidKopecks: 400000,
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
    dueDate: "2026-07-11",
    status: "closed",
    note: "Закрыто двумя сторонами",
    createdAt: "2026-06-20",
    confirmedByOther: true,
  },
];

const seedConfirmations = [
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

let loans = seedLoans.map(cloneRecord);
let confirmations = seedConfirmations.map(cloneRecord);

const state = {
  screen: "dashboard",
  filter: "all",
  sort: "due",
  storageMode: "demo",
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
  supabaseUrl: document.querySelector("#supabaseUrl"),
  supabaseKey: document.querySelector("#supabaseKey"),
  supabaseConnectButton: document.querySelector("#supabaseConnectButton"),
  supabaseDisconnectButton: document.querySelector("#supabaseDisconnectButton"),
  supabaseStatus: document.querySelector("#supabaseStatus"),
  dataModeValue: document.querySelector("#dataModeValue"),
};

document.title = `Eword Mobile ${VERSION}`;

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

nodes.entryAmount.addEventListener("input", () => {
  const cursorAtEnd = nodes.entryAmount.selectionStart === nodes.entryAmount.value.length;
  nodes.entryAmount.value = formatAmountInput(nodes.entryAmount.value);
  if (cursorAtEnd) {
    nodes.entryAmount.setSelectionRange(nodes.entryAmount.value.length, nodes.entryAmount.value.length);
  }
});

nodes.syncButton.addEventListener("click", () => {
  void syncData({ manual: true });
});

nodes.confirmationList.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  const row = event.target.closest(".confirm-row");
  if (!button || !row) return;

  void resolveConfirmation(row, button.dataset.action);
});

nodes.entryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void createEntry();
});

nodes.supabaseConnectButton?.addEventListener("click", () => {
  void connectSupabase();
});

nodes.supabaseDisconnectButton?.addEventListener("click", () => {
  void disconnectSupabase();
});

initializeSupabasePanel();
render();
void syncData();

function setScreen(screen) {
  state.screen = screen;
  render();
}

function render() {
  renderScreen();
  renderDashboard();
  renderDebtTimeline();
  renderJournal();
  renderConfirmations();
  renderSupabasePanel();
}

function renderScreen() {
  const titles = {
    dashboard: "Дашборд",
    journal: "Журнал",
    confirmations: "Подтверждения",
    create: "Новая запись",
    profile: "Профиль",
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

  nodes.netPosition.textContent = formatMoney(lent - borrowed);
  nodes.lentTotal.textContent = formatMoney(lent);
  nodes.borrowedTotal.textContent = formatMoney(borrowed);
  nodes.overdueTotal.textContent = formatMoney(overdue);
  nodes.pendingCount.textContent = String(pending);
}

function renderDebtTimeline() {
  const points = buildDebtTimeline(loans.filter((loan) => loan.status !== "closed"));
  const total = points.at(-1)?.positionKopecks ?? 0;

  nodes.timelineTotal.textContent = formatMoney(total);
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
  column.title = `${point.label}: изменение ${formatMoney(point.deltaKopecks)}, позиция ${formatMoney(point.positionKopecks)}`;

  const bar = document.createElement("i");
  bar.style.height = `${Math.max(14, Math.round((Math.abs(point.deltaKopecks) / maxDelta) * 82))}px`;

  const amount = document.createElement("strong");
  amount.textContent = formatCompactMoney(point.deltaKopecks);

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

function renderSupabasePanel() {
  if (!nodes.dataModeValue || !nodes.supabaseStatus) return;

  nodes.dataModeValue.textContent = state.storageMode === "supabase" ? "Supabase" : "Демо";
  nodes.supabaseStatus.classList.toggle("error", state.storageMode === "error");
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
  avatar.textContent = loan.person.slice(0, 1);
  title.textContent = loan.person;
  note.textContent = loan.note;
  meta.textContent = buildMeta(loan, mode);
  amount.textContent = formatMoney(getRemainingKopecks(loan));
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

async function createEntry() {
  const person = nodes.entryPerson.value.trim();
  const amountKopecks = parseAmountToKopecks(nodes.entryAmount.value);
  const issueDate = nodes.entryIssueDate.value;
  const dueDate = nodes.entryDueDate.value;
  const note = nodes.entryNote.value.trim();

  if (!person || !issueDate || !dueDate || !note || !Number.isInteger(amountKopecks) || amountKopecks <= 0) {
    nodes.entryStatus.textContent = "Заполните все обязательные поля.";
    return;
  }

  const draftLoan = {
    id: `loan-${Date.now()}`,
    person,
    direction: nodes.entryDirection.value,
    amountKopecks,
    paidKopecks: 0,
    dueDate,
    status: "pending",
    note,
    createdAt: issueDate,
    confirmedByOther: false,
  };

  const draftConfirmation = {
    id: `confirm-${Date.now()}`,
    type: "Новый займ",
    title: `${person} подтверждает ${formatMoney(amountKopecks)}`,
    description: "Запись создана вручную и ожидает подтверждения второй стороны.",
  };

  try {
    nodes.entryStatus.textContent = isSupabaseReady() ? "Сохраняю в Supabase..." : "Сохраняю в демо-режиме...";

    if (isSupabaseReady()) {
      const savedLoan = await store.createDebtRecord(draftLoan);
      const savedConfirmation = await store.createConfirmation({
        ...draftConfirmation,
        relatedDebtRecordId: savedLoan.id,
      });
      loans.unshift(savedLoan);
      confirmations.unshift(savedConfirmation);
      nodes.syncState.textContent = "Синхронизировано с Supabase";
    } else {
      loans.unshift(draftLoan);
      confirmations.unshift(draftConfirmation);
      nodes.syncState.textContent = "Демо-режим";
    }

    nodes.entryForm.reset();
    nodes.entryStatus.textContent = "Запись создана и добавлена в журнал.";
    state.filter = "all";
    state.sort = "created";
    nodes.sortSelect.value = "created";
    setScreen("journal");
  } catch (error) {
    nodes.entryStatus.textContent = `Supabase: ${error.message}`;
  }
}

async function resolveConfirmation(row, action) {
  const id = row.dataset.id;
  row.classList.add(action === "approve" ? "approved" : "declined");

  try {
    if (isSupabaseReady()) {
      await store.updateConfirmationStatus(id, action === "approve" ? "approved" : "declined");
    }
    confirmations = confirmations.filter((item) => item.id !== id);
    window.setTimeout(() => {
      render();
    }, 220);
  } catch (error) {
    row.classList.remove("approved", "declined");
    nodes.supabaseStatus.textContent = `Supabase: ${error.message}`;
    nodes.supabaseStatus.classList.add("error");
  }
}

async function connectSupabase() {
  if (!store) {
    setSupabaseStatus("Supabase SDK недоступен.", "error");
    return;
  }

  const url = nodes.supabaseUrl.value.trim();
  const key = nodes.supabaseKey.value.trim();
  if (!url || !key) {
    setSupabaseStatus("Укажите Project URL и Public key.", "error");
    return;
  }

  store.saveConfig({ url, key });
  await syncData({ manual: true });
}

async function disconnectSupabase() {
  if (store) {
    await store.signOut();
    store.clearConfig();
  }

  loans = seedLoans.map(cloneRecord);
  confirmations = seedConfirmations.map(cloneRecord);
  state.storageMode = "demo";
  nodes.syncState.textContent = "Демо-режим";
  setSupabaseStatus("Отключено. Используются демо-данные.", "demo");
  render();
}

async function syncData({ manual = false } = {}) {
  setSyncBusy(true);

  if (!isSupabaseConfigured()) {
    state.storageMode = "demo";
    nodes.syncState.textContent = manual ? "Демо-режим обновлен" : "Демо-режим";
    setSupabaseStatus("Демо-данные в памяти браузера.", "demo");
    setSyncBusy(false);
    render();
    return;
  }

  try {
    setSupabaseStatus("Подключение...", "pending");
    await store.ensureSession();
    const [remoteLoans, remoteConfirmations] = await Promise.all([
      store.loadDebtRecords(),
      store.loadConfirmations(),
    ]);

    loans = remoteLoans;
    confirmations = remoteConfirmations;
    state.storageMode = "supabase";
    nodes.syncState.textContent = "Синхронизировано с Supabase";
    setSupabaseStatus("Supabase подключен.", "supabase");
  } catch (error) {
    state.storageMode = "error";
    nodes.syncState.textContent = "Демо-режим";
    setSupabaseStatus(`Supabase: ${error.message}`, "error");
  } finally {
    setSyncBusy(false);
    render();
  }
}

function initializeSupabasePanel() {
  if (!store) {
    setSupabaseStatus("Supabase SDK недоступен.", "error");
    return;
  }

  const config = store.getConfig();
  if (config?.url) nodes.supabaseUrl.value = config.url;
  if (config?.key) nodes.supabaseKey.value = config.key;
}

function isSupabaseConfigured() {
  return Boolean(store?.isConfigured());
}

function isSupabaseReady() {
  return state.storageMode === "supabase" && isSupabaseConfigured();
}

function setSupabaseStatus(message, mode) {
  state.storageMode = mode === "supabase" ? "supabase" : mode === "error" ? "error" : state.storageMode;
  if (!nodes.supabaseStatus) return;
  nodes.supabaseStatus.textContent = message;
  nodes.supabaseStatus.classList.toggle("error", mode === "error");
}

function setSyncBusy(isBusy) {
  nodes.syncButton.classList.toggle("spinning", isBusy);
  nodes.syncButton.disabled = isBusy;
  if (nodes.supabaseConnectButton) nodes.supabaseConnectButton.disabled = isBusy;
}

function cloneRecord(record) {
  return { ...record };
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

function formatMoney(kopecks) {
  const sign = kopecks < 0 ? "- " : "";
  const rubles = Math.abs(kopecks) / 100;
  return `${sign}${new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rubles)} ₽`;
}

function formatCompactMoney(kopecks) {
  const sign = kopecks < 0 ? "-" : kopecks > 0 ? "+" : "";
  const rubles = Math.abs(kopecks) / 100;
  if (rubles >= 1000000) return `${sign}${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(rubles / 1000000)} млн ₽`;
  if (rubles >= 1000) return `${sign}${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(rubles / 1000)} тыс ₽`;
  return `${sign}${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(rubles)} ₽`;
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
