(() => {
  const AUTH_SESSION_KEY = "eword_auth_session_v2";
  const APP_VERSION = "0.4.0";
  const API_URL = (window.EWORD_API_URL || "http://localhost:3000").replace(/\/$/, "");

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
    renderAuthMode(nodes);
    restoreSession(nodes);

    nodes.authModeToggle.addEventListener("click", () => {
      authMode = authMode === "login" ? "register" : "login";
      setAuthStatus(nodes, "");
      renderAuthMode(nodes);
    });

    nodes.authForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      nodes.authSubmit.disabled = true;
      setAuthStatus(nodes, authMode === "login" ? "Проверяем вход..." : "Создаем аккаунт...", true);

      try {
        if (authMode === "login") {
          await loginUser(nodes);
        } else {
          await registerUser(nodes);
        }
      } finally {
        nodes.authSubmit.disabled = false;
      }
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

  async function restoreSession(nodes) {
    const session = readSession();
    if (!session?.token) {
      showAuth(nodes, "Войдите в аккаунт или создайте новый.");
      return;
    }

    try {
      const data = await apiRequest("/auth/me", {
        headers: authHeaders(session.token),
      });
      saveSession(session.token, data.user);
      showApp(nodes, data.user);
    } catch {
      clearSession();
      showAuth(nodes, "Сессия истекла. Войдите снова.");
    }
  }

  async function loginUser(nodes) {
    const login = normalizeLogin(nodes.authLogin.value);
    const password = nodes.authPassword.value;

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: { login, password },
      });

      saveSession(data.token, data.user);
      showApp(nodes, data.user);
    } catch (error) {
      showAuth(nodes, authErrorMessage(error));
    }
  }

  async function registerUser(nodes) {
    const name = nodes.authName.value.trim();
    const login = normalizeLogin(nodes.authLogin.value);
    const password = nodes.authPassword.value;

    if (!name || !login || password.length < 4) {
      showAuth(nodes, "Введите имя, логин и пароль минимум из 4 символов.");
      return;
    }

    try {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: { name, login, password },
      });

      saveSession(data.token, data.user);
      showApp(nodes, data.user);
    } catch (error) {
      showAuth(nodes, authErrorMessage(error));
    }
  }

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || "API_ERROR");
      error.code = data.error;
      throw error;
    }

    return data;
  }

  function authHeaders(token) {
    return { Authorization: `Bearer ${token}` };
  }

  function authErrorMessage(error) {
    if (error.code === "INVALID_CREDENTIALS") return "Неверный логин или пароль.";
    if (error.code === "LOGIN_ALREADY_EXISTS") return "Такой логин уже существует.";
    if (error.code === "VALIDATION_ERROR") return "Проверьте имя, логин и пароль.";
    return `Backend недоступен: ${API_URL}`;
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
    setAuthStatus(nodes, message);
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

  function readSession() {
    try {
      const raw = localStorage.getItem(AUTH_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveSession(token, user) {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ token, user }));
  }

  function clearSession() {
    localStorage.removeItem(AUTH_SESSION_KEY);
  }

  function normalizeLogin(value) {
    return value.trim().toLowerCase();
  }
})();
