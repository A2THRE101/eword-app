const AUTH_USERS_KEY = "eword_auth_users_v1";
const AUTH_SESSION_KEY = "eword_auth_session_v1";

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
  authNodes.authStatus.textContent = "";
  authNodes.authStatus.classList.remove("success");
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
  localStorage.removeItem(AUTH_SESSION_KEY);
  authNodes.authPassword.value = "";
  authNodes.authStatus.textContent = "Вы вышли из аккаунта.";
  authNodes.authStatus.classList.remove("success");
  showAuth();
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
  document.title = "Eword Mobile Preview 0.3.0";
  authNodes.authScreen.classList.add("auth-locked");
  authNodes.appShell.classList.remove("app-locked");
  authNodes.authStatus.textContent = "";
  authNodes.authStatus.classList.remove("success");
  authNodes.profileDisplayName.textContent = user.name;
  authNodes.profileAuthInfo.textContent = `Вход выполнен: ${user.login}`;
}

function showAuth(message = "") {
  authNodes.appShell.classList.add("app-locked");
  authNodes.authScreen.classList.remove("auth-locked");
  authNodes.authStatus.textContent = message;
  authNodes.authStatus.classList.toggle("success", message.includes("создан"));
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
  try {
    return JSON.parse(localStorage.getItem(AUTH_USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY));
  } catch {
    return null;
  }
}

function saveSession(login) {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ login, createdAt: new Date().toISOString() }));
}

function findUser(login) {
  return readUsers().find((user) => user.login === normalizeLogin(login));
}

function seedDemoUser() {
  const users = readUsers();
  if (users.some((user) => user.login === "murad")) return;

  writeUsers([
    ...users,
    {
      login: "murad",
      name: "Мурад",
      passwordHash: hashDemoPassword("1234"),
      createdAt: new Date().toISOString(),
    },
  ]);
}

function normalizeLogin(value) {
  return value.trim().toLowerCase();
}

function hashDemoPassword(value) {
  return btoa(unescape(encodeURIComponent(`eword-demo:${value}`)));
}
