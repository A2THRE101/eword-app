const VERSION = "1.0.1";
const store = window.EwordSupabaseStore;

let loans = [];
let confirmations = [];
let currentSession = null;
let currentUser = null;
let profile = null;
let authSubscription = null;

const state = {
  screen: "dashboard",
  filter: "all",
  sort: "due",
  storageMode: "offline",
  authMode: "signin",
};

const nodes = {
  phone: document.querySelector("#phoneShell"),
  authScreen: document.querySelector("#authScreen"),
  authTitle: document.querySelector("#authTitle"),
  authForm: document.querySelector("#authForm"),
  authModeButtons: [...document.querySelectorAll("[data-auth-mode]")],
  authNameField: document.querySelector("#authNameField"),
  authName: document.querySelector("#authName"),
  authEmail: document.querySelector("#authEmail"),
  authPassword: document.querySelector("#authPassword"),
  authSubmit: document.querySelector("#authSubmit"),
  authStatus: document.querySelector("#authStatus"),
  resetPasswordButton: document.querySelector("#resetPasswordButton"),
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
  confirmationEmpty: document.querySelector("#confirmationEmpty"),
  netPosition: document.querySelector("#netPosition"),
  lentTotal: document.querySelector("#lentTotal"),
  borrowedTotal: document.querySelector("#borrowedTotal"),
  overdueTotal: document.querySelector("#overdueTotal"),
  pendingCount: document.querySelector("#pendingCount"),
  timelineTotal: document.querySelector("#timelineTotal"),
  trendLinePath: document.querySelector("#trendLinePath"),
  trendLineShadow: document.querySelector("#trendLineShadow"),
  barTrack: document.querySelector("#barTrack"),
  profileAvatar: document.querySelector("#profileAvatar"),
  profileName: document.querySelector("#profileName"),
  profileEmail: document.querySelector("#profileEmail"),
  emailStatusValue: document.querySelector("#emailStatusValue"),
  mfaStatusValue: document.querySelector("#mfaStatusValue"),
  logoutButton: document.querySelector("#logoutButton"),
  supabaseStatus: document.querySelector("#supabaseStatus"),
  dataModeValue: document.querySelector("#dataModeValue"),
  supabaseProjectValue: document.querySelector("#supabaseProjectValue"),
};

document.title = `Eword Mobile ${VERSION}`;

nodes.authModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.authMode = button.dataset.authMode;
    setAuthStatus("");
    renderAuth();
  });
});

nodes.authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void submitAuthForm();
});

nodes.resetPasswordButton.addEventListener("click", () => {
  void requestPasswordReset();
});

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

nodes.logoutButton.addEventListener("click", () => {
  void signOut();
});

void initializeApp();

async function initializeApp() {
  render();

  if (!store) {
    state.storageMode = "setup";
    setAuthStatus("Supabase SDK недоступен.", true);
    setSupabaseStatus("Supabase SDK недоступен.", "error");
    render();
    return;
  }

  renderSupabasePanel();

  if (!store.isConfigured()) {
    state.storageMode = "setup";
    setAuthStatus("Backend не настроен: добавьте Supabase publishable key в сборку приложения.", true);
    setSupabaseStatus("Public key не добавлен в сборку.", "setup");
    setAuthFormEnabled(false);
    render();
    return;
  }

  authSubscription = store.onAuthStateChange((_event, session) => {
    void applySession(session, { sync: true });
  });

  try {
    const session = await store.getSession();
    await applySession(session, { sync: true });
  } catch (error) {
    state.storageMode = "error";
    setAuthStatus(error.message, true);
    render();
  }
}

async function applySession(session, { sync = false } = {}) {
  currentSession = session;
  currentUser = session?.user || null;

  if (!currentSession) {
    profile = null;
    loans = [];
    confirmations = [];
    state.storageMode = store?.isConfigured?.() ? "offline" : "setup";
    nodes.syncState.textContent = "Войдите для синхронизации";
    render();
    return;
  }

  setAuthStatus("");
  if (sync) await syncData();
  render();
}

async function submitAuthForm() {
  if (!store?.isConfigured?.()) {
    setAuthStatus("Backend не настроен для входа.", true);
    return;
  }

  const email = nodes.authEmail.value.trim();
  const password = nodes.authPassword.value;
  const displayName = nodes.authName.value.trim();

  if (!isValidEmail(email)) {
    setAuthStatus("Введите email в поле логина.", true);
    return;
  }

  if (password.length < 8) {
    setAuthStatus("Пароль должен быть минимум 8 символов.", true);
    return;
  }

  if (state.authMode === "signup" && displayName.length < 2) {
    setAuthStatus("Введите имя для профиля.", true);
    return;
  }

  try {
    setAuthBusy(true);
    setAuthStatus(state.authMode === "signin" ? "Входим..." : "Создаем аккаунт...");

    if (state.authMode === "signin") {
      const data = await store.signIn(email, password);
      await applySession(data.session, { sync: true });
      return;
    }

    const data = await store.signUp({ email, password, displayName });
    if (data.session) {
      await applySession(data.session, { sync: true });
      return;
    }

    setAuthStatus("Аккаунт создан. Когда включим подтверждение email, здесь нужно будет открыть письмо и подтвердить вход.");
  } catch (error) {
    setAuthStatus(error.message, true);
  } finally {
    setAuthBusy(false);
  }
}

async function requestPasswordReset() {
  if (!store?.isConfigured?.()) {
    setAuthStatus("Backend не настроен для сброса пароля.", true);
    return;
  }

  const email = nodes.authEmail.value.trim();
  if (!isValidEmail(email)) {
    setAuthStatus("Введите email в поле логина, потом нажмите сброс пароля.", true);
    return;
  }

  try {
    setAuthBusy(true);
    await store.resetPassword(email);
    setAuthStatus("Если SMTP включен, Supabase отправит письмо для сброса пароля.");
  } catch (error) {
    setAuthStatus(error.message, true);
  } finally {
    setAuthBusy(false);
  }
}

async function signOut() {
  try {
    setSyncBusy(true);
    if (authSubscription) authSubscription;
    await store.signOut();
    await applySession(null);
  } catch (error) {
    setSupabaseStatus(error.message, "error");
  } finally {
    setSyncBusy(false);
  }
}

function setScreen(screen) {
  if (!currentSession) return;
  state.screen = screen;
  if (screen === "create") primeCreateDates();
  render();
}

function render() {
  renderAuth();
  renderScreen();
  renderDashboard();
  renderDebtTimeline();
  renderJournal();
  renderConfirmations();
  renderProfile();
  renderSupabasePanel();
}

function renderAuth() {
  const requiresAuth = !currentSession;
  nodes.phone.classList.toggle("auth-required", requiresAuth);
  nodes.authTitle.textContent = state.authMode === "signin" ? "Вход" : "Регистрация";
  nodes.authNameField.classList.toggle("visible", state.authMode === "signup");
  nodes.authSubmit.textContent = state.authMode === "signin" ? "Войти" : "Создать аккаунт";
  nodes.resetPasswordButton.classList.toggle("hidden", state.authMode !== "signin");
  nodes.authModeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.authMode === state.authMode);
  });
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
  const activeLoans = loans.filter((loan) => loan.status !== "closed" && loan.status !== "canceled");
  const lent = sum(activeLoans.filter((loan) => loan.direction === "lent"));
  const borrowed = sum(activeLoans.filter((loan) => loan.direction === "borrowed"));
  const overdue = sum(activeLoans.filter((loan) => loan.status === "overdue"));
  const pending = loans.filter((loan) => loan.status === "pending_confirmation").length + confirmations.length;

  nodes.netPosition.textContent = formatMoney(lent - borrowed);
  nodes.lentTotal.textContent = formatMoney(lent);
  nodes.borrowedTotal.textContent = formatMoney(borrowed);
  nodes.overdueTotal.textContent = formatMoney(overdue);
  nodes.pendingCount.textContent = String(pending);
}

function renderDebtTimeline() {
  const points = buildDebtTimeline(loans.filter((loan) => loan.status !== "closed" && loan.status !== "canceled"));
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
    if (state.filter === "pending") return loan.status === "pending_confirmation";
    if (state.filter === "closed") return loan.status === "closed";
    if (state.filter === "overdue") return loan.status === "overdue";
    return loan.direction === state.filter;
  });

  const sorted = filtered.slice().sort((a, b) => {
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
  nodes.confirmationEmpty.classList.toggle("visible", confirmations.length === 0);
}

function renderProfile() {
  const displayName = profile?.displayName || getUserNameFromEmail(currentUser?.email) || "Профиль";
  const email = profile?.email || currentUser?.email || "";
  const emailConfirmed = Boolean(profile?.emailConfirmedAt || currentUser?.email_confirmed_at);

  nodes.profileAvatar.textContent = displayName.slice(0, 1).toUpperCase();
  nodes.profileName.textContent = displayName;
  nodes.profileEmail.textContent = email || "Вход по email и паролю";
  nodes.emailStatusValue.textContent = emailConfirmed ? "Подтвержден" : "Не проверен";
  nodes.mfaStatusValue.textContent = profile?.mfaEnabled ? "Вкл" : "Запланировано";
}

function renderSupabasePanel() {
  if (!nodes.dataModeValue || !nodes.supabaseStatus) return;

  const labels = {
    setup: "Не настроен",
    offline: "Офлайн",
    error: "Ошибка",
    connecting: "Подключение",
    online: "Онлайн",
  };
  const config = store?.getConfig?.();

  nodes.dataModeValue.textContent = labels[state.storageMode] || "Офлайн";
  nodes.supabaseStatus.classList.toggle("error", state.storageMode === "error" || state.storageMode === "setup");
  if (nodes.supabaseProjectValue) {
    nodes.supabaseProjectValue.textContent = getProjectLabel(config?.url);
  }
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
  avatar.textContent = loan.person.slice(0, 1).toUpperCase();
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
  if (!currentSession) {
    nodes.entryStatus.textContent = "Сначала войдите в аккаунт.";
    return;
  }

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
    person,
    direction: nodes.entryDirection.value,
    amountKopecks,
    paidKopecks: 0,
    dueDate,
    status: "active",
    note,
    createdAt: issueDate,
    confirmedByOther: false,
  };

  try {
    nodes.entryStatus.textContent = "Сохраняю запись...";
    const savedLoan = await store.createDebtRecord(draftLoan);
    loans.unshift(savedLoan);
    nodes.entryForm.reset();
    nodes.entryStatus.textContent = "Запись создана и сохранена в базе.";
    state.filter = "all";
    state.sort = "created";
    nodes.sortSelect.value = "created";
    setScreen("journal");
  } catch (error) {
    nodes.entryStatus.textContent = error.message;
  }
}

async function resolveConfirmation(row, action) {
  const id = row.dataset.id;
  row.classList.add(action === "approve" ? "approved" : "declined");

  try {
    await store.updateConfirmationStatus(id, action === "approve" ? "approved" : "declined");
    confirmations = confirmations.filter((item) => item.id !== id);
    window.setTimeout(() => {
      render();
    }, 220);
  } catch (error) {
    row.classList.remove("approved", "declined");
    nodes.supabaseStatus.textContent = error.message;
    nodes.supabaseStatus.classList.add("error");
  }
}

async function syncData({ manual = false } = {}) {
  if (!currentSession) {
    nodes.syncState.textContent = "Войдите для синхронизации";
    return;
  }

  if (!store?.isConfigured?.()) {
    state.storageMode = "setup";
    nodes.syncState.textContent = "Backend не настроен";
    setSupabaseStatus("Public key не добавлен в сборку.", "setup");
    render();
    return;
  }

  try {
    setSyncBusy(true);
    state.storageMode = "connecting";
    setSupabaseStatus("Подключение...", "connecting");

    const loadedProfile = await store.loadProfile();
    profile = loadedProfile || await store.updateProfile({
      displayName: currentUser?.user_metadata?.display_name || getUserNameFromEmail(currentUser?.email),
    });

    const [remoteLoans, remoteConfirmations] = await Promise.all([
      store.loadDebtRecords(),
      store.loadConfirmations(),
    ]);

    loans = remoteLoans;
    confirmations = remoteConfirmations;
    state.storageMode = "online";
    nodes.syncState.textContent = "Синхронизировано с Supabase";
    setSupabaseStatus(manual ? "Данные обновлены." : "Supabase подключен.", "online");
  } catch (error) {
    state.storageMode = "error";
    nodes.syncState.textContent = "Ошибка синхронизации";
    setSupabaseStatus(error.message, "error");
  } finally {
    setSyncBusy(false);
    render();
  }
}

function setAuthBusy(isBusy) {
  nodes.authSubmit.disabled = isBusy;
  nodes.resetPasswordButton.disabled = isBusy;
  nodes.authModeButtons.forEach((button) => {
    button.disabled = isBusy;
  });
}

function setAuthFormEnabled(isEnabled) {
  nodes.authSubmit.disabled = !isEnabled;
  nodes.resetPasswordButton.disabled = !isEnabled;
  nodes.authEmail.disabled = !isEnabled;
  nodes.authPassword.disabled = !isEnabled;
  nodes.authName.disabled = !isEnabled;
}

function setAuthStatus(message, isError = false) {
  nodes.authStatus.textContent = message;
  nodes.authStatus.classList.toggle("error", isError);
}

function setSupabaseStatus(message, mode) {
  const knownModes = new Set(["setup", "offline", "error", "connecting", "online"]);
  if (knownModes.has(mode)) state.storageMode = mode;
  if (!nodes.supabaseStatus) return;
  nodes.supabaseStatus.textContent = message;
  nodes.supabaseStatus.classList.toggle("error", mode === "error" || mode === "setup");
}

function setSyncBusy(isBusy) {
  nodes.syncButton.classList.toggle("spinning", isBusy);
  nodes.syncButton.disabled = isBusy;
}

function primeCreateDates() {
  const today = new Date();
  const due = new Date(today);
  due.setDate(today.getDate() + 7);
  if (!nodes.entryIssueDate.value) nodes.entryIssueDate.value = toInputDate(today);
  if (!nodes.entryDueDate.value) nodes.entryDueDate.value = toInputDate(due);
}

function buildMeta(loan, mode) {
  const side = loan.direction === "lent" ? "Я дал" : "Мне дали";
  const due = loan.dueDate ? `срок ${formatDate(loan.dueDate)}` : "без срока";
  const confirmation = loan.confirmedByOther ? "подтверждено" : "без подтверждения";
  return mode === "action" ? `${side} · ${getStatusLabel(loan)} · ${due}` : `${side} · ${due} · ${confirmation}`;
}

function getStatusLabel(loan) {
  const labels = {
    draft: "Черновик",
    active: "Активен",
    overdue: "Просрочен",
    pending_confirmation: "Ожидает",
    closed: "Закрыт",
    canceled: "Отменен",
  };
  return labels[loan.status] || "Активен";
}

function statusWeight(loan) {
  const weights = { overdue: 0, pending_confirmation: 1, active: 2, draft: 3, closed: 4, canceled: 5 };
  return weights[loan.status] ?? 6;
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

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function getUserNameFromEmail(email) {
  return String(email || "").split("@")[0] || "";
}

function getProjectLabel(value) {
  if (!value) return "Не задан";

  try {
    return new URL(value).hostname.replace(".supabase.co", "");
  } catch {
    return "Не задан";
  }
}

function toInputDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
