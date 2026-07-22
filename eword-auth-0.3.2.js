(() => {
  const AUTH_USERS_KEY = "eword_auth_users_v1";
  const AUTH_SESSION_KEY = "eword_auth_session_v1";
  const APP_VERSION = "0.3.2";

  const authMemoryStore = new Map();
  let authStorage;
  let authMode = "login";
  let authReady = false;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAuth);
  } else {
    initAuth();
  }

  function initAuth() {
    if (authReady) return;

    const nodes = getAuthNodes();
    if (!nodes) return;

    authReady = true;
    authStorage = createAuthStorage(nodes);

    seedDemoUser();
    renderAuthMode(nodes);
    restoreSession(nodes);

    nodes.authModeToggle.addEventListener("click", () => {
      authMode = authMode === "login" ? "register" : "login";
      setAuthStatus(nodes, "");
      renderAuthMode(nodes);
    });

    nodes.authForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (authMode === "login") {
        loginUser(nodes);
        return;
      }
      registerUser(nodes);
    });

    nodes.authSubmit.addEventListener("click", () => {
      setAuthStatus(nodes, "");
    });

    nodes.logoutButton.addEventListener("click", () => {
      clearSession();
      nodes.authPassword.value = "";
      showAuth(nodes, "Вы вышли из аккаунта.");
    });
  }

  function getAuthNodes() {
    const nodes = {
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

    return Object.values(nodes).every(Boolean) ? nodes : null;
  }

  function restoreSession(nodes) {
    const session = readSession();
    const user = session ? findUser(session.login) : null;

    if (!user) {
      showAuth(nodes, "Можно войти как murad / 1234 или создать аккаунт.");
      return;
    }

    showApp(nodes, user);
  }

  function loginUser(nodes) {
    const login = normalizeLogin(nodes.authLogin.value);
    const password = nodes.authPassword.value;
    const user = findUser(login);

    if (!user || user.passwordHash !== hashDemoPassword(password)) {
      showAuth(nodes, "Неверный логин или пароль.");
      return;
    }

    saveSession(user.login);
    showApp(nodes, user);
  }

  function registerUser(nodes) {
    const name = nodes.authName.value.trim();
    const login = normalizeLogin(nodes.authLogin.value);
    const password = nodes.authPassword.value;

    if (!name || !login || password.length < 4) {
      showAuth(nodes, "Введите имя, логин и пароль минимум из 4 символов.");
      return;
    }

    const users = readUsers();
    if (users.some((user) => user.login === login)) {
      showAuth(nodes, "Такой логин уже существует.");
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
    showApp(nodes, user);
  }

  function showApp(nodes, user) {
    document.title = `Eword Mobile Preview ${APP_VERSION}`;
    nodes.authScreen.classList.add("auth-locked");
    nodes.appShell.classList.remove("app-locked");
    nodes.authScreen.hidden = true;
    nodes.appShell.hidden = false;
    nodes.authScreen.style.setProperty("display", "none", "important");
    nodes.appShell.style.setProperty("display", "grid", "important");
    setAuthStatus(nodes, "");
    nodes.profileDisplayName.textContent = user.name;
    nodes.profileAuthInfo.textContent = `Вход выполнен: ${user.login}`;
    window.scrollTo(0, 0);
  }

  function showAuth(nodes, message = "") {
    nodes.appShell.classList.add("app-locked");
    nodes.authScreen.classList.remove("auth-locked");
    nodes.appShell.hidden = true;
    nodes.authScreen.hidden = false;
    nodes.appShell.style.setProperty("display", "none", "important");
    nodes.authScreen.style.setProperty("display", "grid", "important");
    setAuthStatus(nodes, message, message.includes("создан"));
  }

  function setAuthStatus(nodes, message, isSuccess = false) {
    nodes.authStatus.textContent = message;
    nodes.authStatus.classList.toggle("success", isSuccess);
  }

  function renderAuthMode(nodes) {
    const isRegister = authMode === "register";
    nodes.authTitle.textContent = isRegister ? "Создать аккаунт" : "Вход";
    nodes.authSubmit.textContent = isRegister ? "Создать аккаунт" : "Войти";
    nodes.authModeToggle.textContent = isRegister ? "У меня уже есть аккаунт" : "Создать аккаунт";
    nodes.authNameField.classList.toggle("hidden", !isRegister);
    nodes.authPassword.autocomplete = isRegister ? "new-password" : "current-password";
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

  function createAuthStorage(nodes) {
    try {
      const probeKey = "eword_auth_storage_probe";
      window.localStorage.setItem(probeKey, "1");
      window.localStorage.removeItem(probeKey);
      return window.localStorage;
    } catch {
      setTimeout(() => {
        setAuthStatus(nodes, "Браузер не разрешил постоянное хранение. Вход работает только до закрытия вкладки.");
      }, 0);

      return {
        getItem: (key) => authMemoryStore.get(key) ?? null,
        setItem: (key, value) => authMemoryStore.set(key, value),
        removeItem: (key) => authMemoryStore.delete(key),
      };
    }
  }
})();
