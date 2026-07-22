const AUTH_USERS_KEY = "eword_auth_users_v1";
const AUTH_SESSION_KEY = "eword_auth_session_v1";
const APP_VERSION = "0.3.2";

const authMemoryStore = new Map();
const authStorage = createAuthStorage();

const authNodes = {
  authScreen: document.querySelector("#authScreen"),
  appShell: document.querySelector("#appShell"),
  authForm: document.querySelector("#authForm"),
  authTitle: document.querySelector("#authTitle"),
  authNameField: document.querySelector("#authNameField"),
  authName: document.querySelector("#authName"),
  authLogin: document.querySelector("#authLogin"),
  authPassword: document.querySelector("#authPassword"),
  authSubmit: document.querySelector("#authSubmit"),
  authModeToggle: document.querySelector("#authModeToggle"),
  authStatus: document.querySelector("#authStatus"),
  profileDisplayName: document.querySelector("#profileDisplayName"),
  profileAuthInfo: document.querySelector("#profileAuthInfo"),
  logoutButton: document.querySelector("#logoutButton"),
};

let authMode = "login";

seedDemoUser();
renderAuthMode();
restoreSession();

authNodes.authModeToggle.addEventListener("click", () => {
  authMode = authMode === "login" ? "register" : "login";
  setAuthStatus("");
  renderAuthMode();
});

authNodes.authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (authMode === "login") {
    loginUser();
    return;
  }
  registerUser();
});

authNodes.logoutButton.addEventListener("click", () => {
  clearSession();
  authNodes.authPassword.value = "";
  showAuth("Вы вышли из аккаунта.");
});

function restoreSession() {
  const session = readSession();
  const user = session ? findUser(session.login) : null;

  if (!user) {
    showAuth("Можно войти как murad / 1234 или создать аккаунт.");
    return;
  }

  showApp(user);
}

function loginUser() {
  const login = normalizeLogin(authNodes.authLogin.value);
  const password = authNodes.authPassword.value;
  const user = findUser(login);

  if (!user || user.passwordHash !== hashDemoPassword(password)) {
    showAuth("Неверный логин или пароль.");
    return;
  }

  saveSession(user.login);
  showApp(user);
}

function registerUser() {
  const name = authNodes.authName.value.trim();
  const login = normalizeLogin(authNodes.authLogin.value);
  const password = authNodes.authPassword.value;

  if (!name || !login || password.length < 4) {
    showAuth("Введите имя, логин и пароль минимум из 4 символов.");
    return;
  }

  const users = readUsers();
  if (users.some((user) => user.login === login)) {
    showAuth("Такой логин уже существует.");
    return;
  }

  const user = {
    login,
    name,
    passwordHash: hashDemoPassword(password),
    createdAt: new Date().toISOString(),
  };

  writeUsers([...users, user]);
  saveSession(user.login);
  showApp(user);
}

function showApp(user) {
  document.title = `Eword Mobile Preview ${APP_VERSION}`;
  authNodes.authScreen.classList.add("auth-locked");
  authNodes.appShell.classList.remove("app-locked");
  authNodes.authScreen.style.removeProperty("display");
  authNodes.appShell.style.removeProperty("display");
  setAuthStatus("");
  authNodes.profileDisplayName.textContent = user.name;
  authNodes.profileAuthInfo.textContent = `Вход выполнен: ${user.login}`;
}

function showAuth(message = "") {
  authNodes.appShell.classList.add("app-locked");
  authNodes.authScreen.classList.remove("auth-locked");
  authNodes.appShell.style.removeProperty("display");
  authNodes.authScreen.style.removeProperty("display");
  setAuthStatus(message, message.includes("создан"));
}

function setAuthStatus(message, isSuccess = false) {
  authNodes.authStatus.textContent = message;
  authNodes.authStatus.classList.toggle("success", isSuccess);
}

function renderAuthMode() {
  const isRegister = authMode === "register";
  authNodes.authTitle.textContent = isRegister ? "Создать аккаунт" : "Вход";
  authNodes.authSubmit.textContent = isRegister ? "Создать аккаунт" : "Войти";
  authNodes.authModeToggle.textContent = isRegister ? "У меня уже есть аккаунт" : "Создать аккаунт";
  authNodes.authNameField.classList.toggle("hidden", !isRegister);
  authNodes.authPassword.autocomplete = isRegister ? "new-password" : "current-password";
}

function readUsers() {
  return readJson(AUTH_USERS_KEY, []);
}

function writeUsers(users) {
  writeJson(AUTH_USERS_KEY, users);
}

function readSession() {
  return readJson(AUTH_SESSION_KEY, null);
}

function saveSession(login) {
  writeJson(AUTH_SESSION_KEY, { login, createdAt: new Date().toISOString() });
}

function clearSession() {
  authStorage.removeItem(AUTH_SESSION_KEY);
}

function readJson(key, fallback) {
  try {
    const raw = authStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  authStorage.setItem(key, JSON.stringify(value));
}

function findUser(login) {
  return readUsers().find((user) => user.login === normalizeLogin(login));
}

function seedDemoUser() {
  const demoUser = {
    login: "murad",
    name: "Мурад",
    passwordHash: hashDemoPassword("1234"),
    createdAt: new Date().toISOString(),
  };
  const users = readUsers().filter((user) => user.login !== demoUser.login);

  writeUsers([demoUser, ...users]);
}

function normalizeLogin(value) {
  return value.trim().toLowerCase();
}

function hashDemoPassword(value) {
  return btoa(unescape(encodeURIComponent(`eword-demo:${value}`)));
}

function createAuthStorage() {
  try {
    const probeKey = "eword_auth_storage_probe";
    window.localStorage.setItem(probeKey, "1");
    window.localStorage.removeItem(probeKey);
    return window.localStorage;
  } catch {
    setTimeout(() => {
      setAuthStatus("Браузер не разрешил постоянное хранение. Вход работает только до закрытия вкладки.");
    }, 0);

    return {
      getItem: (key) => authMemoryStore.get(key) ?? null,
      setItem: (key, value) => authMemoryStore.set(key, value),
      removeItem: (key) => authMemoryStore.delete(key),
    };
  }
}
