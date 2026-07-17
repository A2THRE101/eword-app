const VERSION = "1.1.0";
const STORAGE_KEY = "eword-loans-v2";

const today = new Date();
const isoDate = (offsetDays) => {
  const date = new Date(today);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

const seedLoans = [
  {
    id: "loan-demo-1",
    direction: "lent",
    person: "Азамат",
    amount: 12000,
    paid: 4000,
    dueDate: isoDate(7),
    status: "active",
    note: "Бронь билетов",
    createdAt: Date.now() - 172800000,
  },
  {
    id: "loan-demo-2",
    direction: "borrowed",
    person: "Мурад",
    amount: 5000,
    paid: 0,
    dueDate: isoDate(-2),
    status: "active",
    note: "Наличные до зарплаты",
    createdAt: Date.now() - 86400000,
  },
  {
    id: "loan-demo-3",
    direction: "lent",
    person: "Руслан",
    amount: 3000,
    paid: 0,
    dueDate: "",
    status: "pending",
    note: "Ожидает подтверждения перевода",
    createdAt: Date.now() - 3600000,
  },
];

const state = {
  loans: loadLoans(),
  filter: "all",
  paymentTargetId: null,
};

const nodes = {
  totalOutstanding: document.querySelector("#totalOutstanding"),
  totalReceivable: document.querySelector("#totalReceivable"),
  totalPayable: document.querySelector("#totalPayable"),
  totalOverdue: document.querySelector("#totalOverdue"),
  loanForm: document.querySelector("#loanForm"),
  loanList: document.querySelector("#loanList"),
  emptyState: document.querySelector("#emptyState"),
  loanTemplate: document.querySelector("#loanTemplate"),
  resetDemo: document.querySelector("#resetDemo"),
  exportData: document.querySelector("#exportData"),
  paymentDialog: document.querySelector("#paymentDialog"),
  paymentForm: document.querySelector("#paymentForm"),
  paymentHint: document.querySelector("#paymentHint"),
  paymentAmount: document.querySelector("#paymentAmount"),
  cancelPayment: document.querySelector("#cancelPayment"),
  tabs: [...document.querySelectorAll(".tab")],
};

document.title = `Eword Loans ${VERSION}`;

nodes.loanForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(nodes.loanForm);
  const person = String(formData.get("person") || "").trim();
  const amount = Math.round(Number(formData.get("amount")));

  if (!person || !Number.isFinite(amount) || amount <= 0) return;

  state.loans.unshift({
    id: crypto.randomUUID(),
    direction: String(formData.get("direction")),
    person,
    amount,
    paid: 0,
    dueDate: String(formData.get("dueDate") || ""),
    status: String(formData.get("status")),
    note: String(formData.get("note") || "").trim(),
    createdAt: Date.now(),
  });

  nodes.loanForm.reset();
  nodes.loanForm.elements.direction.value = "lent";
  nodes.loanForm.elements.status.value = "active";
  persist();
  render();
});

nodes.loanList.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  const item = event.target.closest(".loan-item");
  if (!button || !item) return;

  const loan = state.loans.find((entry) => entry.id === item.dataset.id);
  if (!loan) return;

  if (button.dataset.action === "delete") {
    state.loans = state.loans.filter((entry) => entry.id !== loan.id);
    persist();
    render();
    return;
  }

  if (button.dataset.action === "toggle") {
    loan.status = loan.status === "closed" ? "active" : "closed";
    loan.paid = loan.status === "closed" ? loan.amount : Math.min(loan.paid, loan.amount - 1);
    persist();
    render();
    return;
  }

  if (button.dataset.action === "pay") openPaymentDialog(loan);
});

nodes.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    state.filter = tab.dataset.filter;
    render();
  });
});

nodes.resetDemo.addEventListener("click", () => {
  state.loans = seedLoans.map((loan) => ({ ...loan, id: crypto.randomUUID() }));
  persist();
  render();
});

nodes.exportData.addEventListener("click", () => {
  const payload = {
    app: "Eword Loans",
    version: VERSION,
    exportedAt: new Date().toISOString(),
    loans: state.loans,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `eword-loans-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

nodes.cancelPayment.addEventListener("click", () => nodes.paymentDialog.close());

nodes.paymentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const loan = state.loans.find((entry) => entry.id === state.paymentTargetId);
  const payment = Math.round(Number(nodes.paymentAmount.value));
  if (!loan || !Number.isFinite(payment) || payment <= 0) return;

  loan.paid = Math.min(loan.amount, loan.paid + payment);
  if (loan.paid >= loan.amount) loan.status = "closed";
  persist();
  nodes.paymentDialog.close();
  render();
});

render();

function loadLoans() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedLoans.map((loan) => ({ ...loan, id: crypto.randomUUID() }));

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeLoan) : seedLoans;
  } catch {
    return seedLoans;
  }
}

function normalizeLoan(loan) {
  return {
    id: loan.id || crypto.randomUUID(),
    direction: loan.direction === "borrowed" ? "borrowed" : "lent",
    person: String(loan.person || "Без имени"),
    amount: Math.max(1, Math.round(Number(loan.amount) || 0)),
    paid: Math.max(0, Math.round(Number(loan.paid) || 0)),
    dueDate: String(loan.dueDate || ""),
    status: ["active", "pending", "closed"].includes(loan.status) ? loan.status : "active",
    note: String(loan.note || ""),
    createdAt: Number(loan.createdAt) || Date.now(),
  };
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.loans));
}

function render() {
  const totals = calculateTotals();
  nodes.totalOutstanding.textContent = formatMoney(totals.outstanding);
  nodes.totalReceivable.textContent = formatMoney(totals.receivable);
  nodes.totalPayable.textContent = formatMoney(totals.payable);
  nodes.totalOverdue.textContent = formatMoney(totals.overdue);

  nodes.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.filter === state.filter));

  const visibleLoans = state.loans
    .filter(matchesFilter)
    .sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a)) || b.createdAt - a.createdAt);

  nodes.loanList.replaceChildren(...visibleLoans.map(renderLoan));
  nodes.emptyState.classList.toggle("visible", visibleLoans.length === 0);
}

function calculateTotals() {
  return state.loans.reduce(
    (totals, loan) => {
      const remaining = getRemaining(loan);
      if (loan.status === "closed") return totals;

      totals.outstanding += remaining;
      if (loan.direction === "lent") totals.receivable += remaining;
      if (loan.direction === "borrowed") totals.payable += remaining;
      if (isOverdue(loan)) totals.overdue += remaining;
      return totals;
    },
    { outstanding: 0, receivable: 0, payable: 0, overdue: 0 },
  );
}

function matchesFilter(loan) {
  if (state.filter === "all") return true;
  if (state.filter === "overdue") return isOverdue(loan);
  return loan.direction === state.filter;
}

function renderLoan(loan) {
  const fragment = nodes.loanTemplate.content.cloneNode(true);
  const item = fragment.querySelector(".loan-item");
  const avatar = fragment.querySelector(".avatar");
  const title = fragment.querySelector("h3");
  const note = fragment.querySelector("p");
  const meta = fragment.querySelector(".meta-line");
  const amount = fragment.querySelector(".loan-side strong");
  const status = fragment.querySelector(".status-pill");
  const progress = fragment.querySelector(".progress-track span");
  const payButton = fragment.querySelector('[data-action="pay"]');
  const toggle = fragment.querySelector('[data-action="toggle"]');

  const remaining = getRemaining(loan);
  const progressValue = Math.round((loan.paid / loan.amount) * 100);
  const overdue = isOverdue(loan);

  item.dataset.id = loan.id;
  item.classList.toggle("overdue", overdue);
  avatar.textContent = loan.person.slice(0, 1).toUpperCase();
  title.textContent = loan.person;
  note.textContent = loan.note || "Без комментария";
  meta.textContent = buildMeta(loan);
  amount.textContent = formatMoney(remaining);
  status.textContent = getStatusLabel(loan, overdue);
  status.className = `status-pill ${overdue ? "overdue" : loan.status}`;
  progress.style.width = `${Math.min(100, progressValue)}%`;
  payButton.disabled = loan.status === "closed";
  toggle.textContent = loan.status === "closed" ? "Открыть" : "Закрыть";

  return fragment;
}

function openPaymentDialog(loan) {
  state.paymentTargetId = loan.id;
  nodes.paymentHint.textContent = `${loan.person}: остаток ${formatMoney(getRemaining(loan))}`;
  nodes.paymentAmount.value = getRemaining(loan);
  nodes.paymentAmount.max = getRemaining(loan);
  nodes.paymentDialog.showModal();
  nodes.paymentAmount.focus();
}

function buildMeta(loan) {
  const direction = loan.direction === "lent" ? "Мне должны" : "Я должен";
  const paid = loan.paid > 0 ? `оплачено ${formatMoney(loan.paid)}` : "платежей нет";
  const due = loan.dueDate ? `срок ${formatDate(loan.dueDate)}` : "без срока";
  return `${direction} · ${paid} · ${due}`;
}

function getStatusLabel(loan, overdue) {
  if (loan.status === "closed") return "Закрыт";
  if (overdue) return "Просрочен";
  if (loan.status === "pending") return "Ожидает";
  return "Активен";
}

function getRemaining(loan) {
  return Math.max(0, loan.amount - loan.paid);
}

function isOverdue(loan) {
  if (loan.status === "closed" || !loan.dueDate) return false;
  const due = new Date(`${loan.dueDate}T23:59:59`);
  return due.getTime() < Date.now();
}

function formatMoney(value) {
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value)} ₽`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" }).format(new Date(value));
}
