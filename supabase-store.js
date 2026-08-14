(() => {
  const CONFIG_KEY = "eword.supabase.config";
  const DEFAULT_SUPABASE_URL = "https://zmgxfjocqwratpwwrrqx.supabase.co";
  let client = null;

  function getConfig() {
    try {
      const value = window.localStorage.getItem(CONFIG_KEY);
      const config = value ? JSON.parse(value) : null;
      return normalizeConfig(config);
    } catch {
      return normalizeConfig(null);
    }
  }

  function saveConfig(config) {
    const normalized = normalizeConfig(config);
    window.localStorage.setItem(CONFIG_KEY, JSON.stringify(normalized));
    client = null;
    return normalized;
  }

  function clearConfig() {
    window.localStorage.removeItem(CONFIG_KEY);
    client = null;
  }

  function normalizeConfig(config) {
    return {
      url: String(config?.url || DEFAULT_SUPABASE_URL).trim().replace(/\/+$/, ""),
      key: String(config?.key || "").trim(),
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
      throw new Error("Supabase не настроен.");
    }

    if (!window.supabase?.createClient) {
      throw new Error("Supabase SDK не загрузился.");
    }

    client = window.supabase.createClient(config.url, config.key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });

    return client;
  }

  async function ensureSession() {
    const supabase = getClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (sessionData.session?.user) return sessionData.session;

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      throw new Error(`${error.message}. Проверьте, что в Supabase Auth включен Anonymous Sign-Ins.`);
    }

    return data.session;
  }

  async function loadDebtRecords() {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("debt_records")
      .select("*")
      .order("due_on", { ascending: true });

    if (error) throw error;
    return (data || []).map(mapDebtRecordFromDb);
  }

  async function createDebtRecord(loan) {
    const supabase = getClient();
    const session = await ensureSession();
    const { data, error } = await supabase
      .from("debt_records")
      .insert(mapDebtRecordToDb(loan, session.user.id))
      .select("*")
      .single();

    if (error) throw error;
    return mapDebtRecordFromDb(data);
  }

  async function loadConfirmations() {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("confirmation_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(mapConfirmationFromDb);
  }

  async function createConfirmation(confirmation) {
    const supabase = getClient();
    const session = await ensureSession();
    const { data, error } = await supabase
      .from("confirmation_requests")
      .insert(mapConfirmationToDb(confirmation, session.user.id))
      .select("*")
      .single();

    if (error) throw error;
    return mapConfirmationFromDb(data);
  }

  async function updateConfirmationStatus(id, status) {
    const supabase = getClient();
    const { error } = await supabase
      .from("confirmation_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
  }

  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
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
      confirmedByOther: Boolean(row.confirmed_by_other),
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
      status: loan.status || "pending",
      confirmed_by_other: Boolean(loan.confirmedByOther),
    };
  }

  function mapConfirmationFromDb(row) {
    return {
      id: row.id,
      type: row.request_type,
      title: row.title,
      description: row.description,
      relatedDebtRecordId: row.related_debt_record_id,
    };
  }

  function mapConfirmationToDb(confirmation, ownerUserId) {
    return {
      owner_user_id: ownerUserId,
      related_debt_record_id: confirmation.relatedDebtRecordId || null,
      request_type: confirmation.type,
      title: confirmation.title,
      description: confirmation.description,
      status: "pending",
    };
  }

  window.EwordSupabaseStore = {
    clearConfig,
    createConfirmation,
    createDebtRecord,
    ensureSession,
    getConfig,
    isConfigured,
    loadConfirmations,
    loadDebtRecords,
    saveConfig,
    signOut,
    updateConfirmationStatus,
  };
})();
