(() => {
  const DEFAULT_SUPABASE_URL = "https://zmgxfjocqwratpwwrrqx.supabase.co";
  const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "";
  let runtimeConfig = null;
  let client = null;

  function getConfig() {
    const envConfig = window.EWORD_SUPABASE_CONFIG || {};
    return normalizeConfig(runtimeConfig || {
      url: envConfig.url || DEFAULT_SUPABASE_URL,
      key: envConfig.publishableKey || envConfig.key || DEFAULT_SUPABASE_PUBLISHABLE_KEY,
    });
  }

  function saveConfig(config) {
    runtimeConfig = normalizeConfig(config);
    client = null;
    return runtimeConfig;
  }

  function clearConfig() {
    runtimeConfig = null;
    client = null;
  }

  function normalizeConfig(config) {
    return {
      url: String(config?.url || DEFAULT_SUPABASE_URL).trim().replace(/\/+$/, ""),
      key: String(config?.key || config?.publishableKey || "").trim(),
    };
  }

  function isConfigured() {
    const config = getConfig();
    return Boolean(config?.url && config?.key);
  }

  function getClient() {
    if (client) return client;

    const config = getConfig();
    if (!config?.url || !config?.key) {
      throw new Error("Supabase не настроен для этой сборки.");
    }

    if (!window.supabase?.createClient) {
      throw new Error("Supabase SDK не загрузился.");
    }

    client = window.supabase.createClient(config.url, config.key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: "eword.auth.session",
      },
    });

    return client;
  }

  async function getSession() {
    const supabase = getClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw normalizeAuthError(error);
    return data.session;
  }

  async function getCurrentUser() {
    const supabase = getClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) throw normalizeAuthError(error);
    return data.user;
  }

  function onAuthStateChange(callback) {
    const supabase = getClient();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return () => data.subscription.unsubscribe();
  }

  async function signIn(email, password) {
    const supabase = getClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });

    if (error) throw normalizeAuthError(error);
    return data;
  }

  async function signUp({ email, password, displayName }) {
    const supabase = getClient();
    const { data, error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
      options: {
        data: {
          display_name: String(displayName || "").trim(),
        },
      },
    });

    if (error) throw normalizeAuthError(error);
    return data;
  }

  async function resetPassword(email) {
    const supabase = getClient();
    const { data, error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email));
    if (error) throw normalizeAuthError(error);
    return data;
  }

  async function signOut() {
    const supabase = getClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw normalizeAuthError(error);
  }

  async function loadProfile() {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, email, email_confirmed_at, mfa_enabled")
      .single();

    if (error) throw normalizeDataError(error);
    return mapProfileFromDb(data);
  }

  async function updateProfile(profile) {
    const supabase = getClient();
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        user_id: user.id,
        display_name: String(profile.displayName || "").trim(),
        email: user.email,
        email_confirmed_at: user.email_confirmed_at || null,
      })
      .select("user_id, display_name, email, email_confirmed_at, mfa_enabled")
      .single();

    if (error) throw normalizeDataError(error);
    return mapProfileFromDb(data);
  }

  async function loadDebtRecords() {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("debt_records")
      .select("*")
      .order("due_on", { ascending: true });

    if (error) throw normalizeDataError(error);
    return (data || []).map(mapDebtRecordFromDb);
  }

  async function createDebtRecord(loan) {
    const supabase = getClient();
    const user = await getCurrentUser();
    const payload = mapDebtRecordToDb(loan, user.id);
    const { data, error } = await supabase
      .from("debt_records")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw normalizeDataError(error);
    await createActivityEvent({
      eventType: "debt_created",
      debtRecordId: data.id,
      payload: { counterpartyName: data.counterparty_name, amountKopecks: data.amount_kopecks },
    }).catch(() => null);
    return mapDebtRecordFromDb(data);
  }

  async function loadConfirmations() {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("confirmation_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw normalizeDataError(error);
    return (data || []).map(mapConfirmationFromDb);
  }

  async function createConfirmation(confirmation) {
    const supabase = getClient();
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("confirmation_requests")
      .insert(mapConfirmationToDb(confirmation, user.id))
      .select("*")
      .single();

    if (error) throw normalizeDataError(error);
    return mapConfirmationFromDb(data);
  }

  async function updateConfirmationStatus(id, status) {
    const supabase = getClient();
    const { error } = await supabase
      .from("confirmation_requests")
      .update({ status, resolved_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw normalizeDataError(error);
  }

  async function createActivityEvent(event) {
    const supabase = getClient();
    const user = await getCurrentUser();
    const { error } = await supabase
      .from("activity_events")
      .insert({
        owner_user_id: user.id,
        debt_record_id: event.debtRecordId || null,
        payment_id: event.paymentId || null,
        event_type: event.eventType,
        payload: event.payload || {},
      });

    if (error) throw normalizeDataError(error);
  }

  function mapProfileFromDb(row) {
    return {
      userId: row.user_id,
      displayName: row.display_name || "",
      email: row.email || "",
      emailConfirmedAt: row.email_confirmed_at,
      mfaEnabled: Boolean(row.mfa_enabled),
    };
  }

  function mapDebtRecordFromDb(row) {
    return {
      id: row.id,
      person: row.counterparty_name,
      direction: row.obligation_type,
      amountKopecks: Number(row.amount_kopecks),
      paidKopecks: Number(row.paid_kopecks || 0),
      dueDate: row.due_on,
      status: row.status,
      note: row.comment,
      createdAt: row.issued_on || row.created_at,
      confirmedByOther: Boolean(row.confirmed_by_counterparty),
    };
  }

  function mapDebtRecordToDb(loan, ownerUserId) {
    return {
      owner_user_id: ownerUserId,
      counterparty_name: loan.person,
      obligation_type: loan.direction,
      issued_on: loan.createdAt,
      due_on: loan.dueDate,
      comment: loan.note,
      amount_kopecks: loan.amountKopecks,
      paid_kopecks: loan.paidKopecks || 0,
      currency: "RUB",
      status: loan.status || "active",
      confirmed_by_counterparty: Boolean(loan.confirmedByOther),
    };
  }

  function mapConfirmationFromDb(row) {
    return {
      id: row.id,
      type: getRequestKindLabel(row.request_kind),
      title: row.title,
      description: row.description,
      relatedDebtRecordId: row.debt_record_id,
      paymentId: row.payment_id,
    };
  }

  function mapConfirmationToDb(confirmation, ownerUserId) {
    return {
      owner_user_id: ownerUserId,
      debt_record_id: confirmation.relatedDebtRecordId || null,
      payment_id: confirmation.paymentId || null,
      request_kind: confirmation.kind || "debt_create",
      title: confirmation.title,
      description: confirmation.description,
      status: "pending",
    };
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function getRequestKindLabel(kind) {
    const labels = {
      debt_create: "Новый займ",
      debt_update: "Изменение",
      payment_create: "Платеж",
      debt_close: "Закрытие",
    };
    return labels[kind] || "Запрос";
  }

  function normalizeAuthError(error) {
    const message = String(error?.message || "Ошибка авторизации.");
    const lower = message.toLowerCase();

    if (lower.includes("invalid login credentials")) return new Error("Неверный логин или пароль.");
    if (lower.includes("email not confirmed")) return new Error("Email ещё не подтверждён. Проверьте письмо или временно отключите Confirm Email в Supabase Auth.");
    if (lower.includes("user already registered") || lower.includes("already registered")) return new Error("Пользователь с таким логином уже существует.");
    if (lower.includes("password") && lower.includes("weak")) return new Error("Пароль слишком слабый. Используйте минимум 8 символов.");
    if (lower.includes("invalid email")) return new Error("Введите корректный email в поле логина.");
    if (lower.includes("email rate limit")) return new Error("Слишком много email-запросов. Подождите и попробуйте снова.");

    return new Error(message);
  }

  function normalizeDataError(error) {
    const message = String(error?.message || "Ошибка базы данных.");
    const code = String(error?.code || "");

    if (code === "42501" || message.toLowerCase().includes("row-level security")) {
      return new Error("Нет доступа к записи. Проверьте RLS-политики и owner_user_id.");
    }
    if (code === "42P01") return new Error("Таблица не найдена. Выполните schema.sql в Supabase SQL Editor.");
    if (code === "23505") return new Error("Такая запись уже существует.");
    if (code === "23514") return new Error("Данные не прошли проверку схемы.");

    return new Error(message);
  }

  window.EwordSupabaseStore = {
    clearConfig,
    createActivityEvent,
    createConfirmation,
    createDebtRecord,
    getConfig,
    getCurrentUser,
    getSession,
    isConfigured,
    loadConfirmations,
    loadDebtRecords,
    loadProfile,
    onAuthStateChange,
    resetPassword,
    saveConfig,
    signIn,
    signOut,
    signUp,
    updateConfirmationStatus,
    updateProfile,
  };
})();
