const VERSION = "0.2.0";

const loans = [
  {
    id: "loan-1",
    person: "Азамат",
    direction: "lent",
    amount: 12000,
    paid: 4000,
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
    amount: 5000,
    paid: 0,
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
    amount: 3000,
    paid: 0,
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
    amount: 18000,
    paid: 9000,
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
    amount: 7000,
    paid: 7000,
    dueDate: "2026-07-11",
    status: "closed",
    note: "Закрыто двумя сторонами",
    createdAt: "2026-06-20",
    confirmedByOther: true,
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
  loanTemplate: document.querySelector("#loanRowTemplate"),
  confirmationTemplate: document.querySelector("#confirmationTemplate"),
  actionList: document.querySelector("#actionList"),
  journalList: document.querySelector("#journalList"),
  journalEmpty: document.querySelector("#journalEmpty"),
  confirmationList: document.querySelector("#confirmationList"),
  netPosition: document.querySelector("#netPosition"),
  lentTotal: document.querySelector("#lentTotal"),
  borrowedTotal: document.querySelector("#borrowedTotal"),
  overdueTotal: document.querySelector("#overdueTotal"),
  pendingCount: document.querySelector("#pendingCount"),
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

render();

function setScreen(screen) {
  state.screen = screen;
  render();
}

function render() {
  renderScreen();
  renderDashboard();
  renderJournal();
  renderConfirmations();
}

function renderScreen() {
  const titles = {
    dashboard: "Дашборд",
    journal: "Журнал",
    confirmations: "Подтверждения",
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

  const actions = loans
    .filter((loan) => loan.status === "overdue" || loan.status === "pending" || getDaysLeft(loan) <= 7)
    .sort((a, b) => statusWeight(a) - statusWeight(b))
    .slice(0, 3);

  nodes.actionList.replaceChildren(...actions.map((loan) => renderLoanRow(loan, "action")));
}

function renderJournal() {
  const filtered = loans.filter((loan) => {
    if (state.filter === "all") return true;
    if (state.filter === "pending") return loan.status === "pending";
    if (state.filter === "closed") return loan.status === "closed";
    if (state.filter === "overdue") return loan.status === "overdue";
    return loan.direction === state.filter;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (state.sort === "amount") return getRemaining(b) - getRemaining(a);
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
  amount.textContent = formatMoney(getRemaining(loan));
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

function buildMeta(loan, mode) {
  const side = loan.direction === "lent" ? "Я дал" : "Я взял";
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
  return items.reduce((total, loan) => total + getRemaining(loan), 0);
}

function getRemaining(loan) {
  return Math.max(0, loan.amount - loan.paid);
}

function getDaysLeft(loan) {
  if (!loan.dueDate) return 999;
  const diff = new Date(`${loan.dueDate}T23:59:59`) - new Date();
  return Math.ceil(diff / 86400000);
}

function formatMoney(value) {
  const sign = value < 0 ? "- " : "";
  return `${sign}${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.abs(value))} ₽`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" }).format(new Date(value));
}
