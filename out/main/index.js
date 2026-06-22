"use strict";
const electron = require("electron");
const path = require("node:path");
const Store = require("electron-store");
const Database = require("better-sqlite3");
const fs = require("node:fs");
const dateFns = require("date-fns");
const DB_DIR = electron.app?.getPath ? electron.app.getPath("userData") : path.resolve(".");
fs.mkdirSync(DB_DIR, { recursive: true });
const DB_PATH = path.join(DB_DIR, "finanza.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      amount_eur REAL NOT NULL DEFAULT 0,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      category TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      currency TEXT DEFAULT 'EUR',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'EUR',
      billing_cycle TEXT NOT NULL CHECK(billing_cycle IN ('weekly', 'monthly', 'quarterly', 'yearly')),
      category TEXT NOT NULL,
      next_billing_date TEXT NOT NULL,
      color TEXT DEFAULT '#6366f1',
      icon TEXT DEFAULT 'credit-card',
      is_active INTEGER DEFAULT 1,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS budget (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      monthly_limit REAL NOT NULL,
      month TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL DEFAULT 0,
      target_date TEXT,
      color TEXT DEFAULT '#10b981',
      icon TEXT DEFAULT 'target',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  const columns = db.prepare(`SELECT name FROM pragma_table_info('transactions')`).all();
  if (!columns.some((c) => c.name === "amount_eur")) {
    db.exec(`ALTER TABLE transactions ADD COLUMN amount_eur REAL NOT NULL DEFAULT 0`);
    db.exec(`UPDATE transactions SET amount_eur = amount WHERE amount_eur = 0`);
  }
  const defaults = {
    base_currency: "EUR",
    locale: "it-IT",
    theme: "light",
    starting_balance: "0",
    username: "Utente"
  };
  const insertSetting = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
  for (const [key, value] of Object.entries(defaults)) {
    insertSetting.run(key, value);
  }
}
initSchema();
function closeDb() {
  db.close();
}
function getSetting(key) {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? row.value : void 0;
}
function getAllSettings() {
  const rows = db.prepare("SELECT key, value FROM settings").all();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
function setSetting(key, value) {
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
}
function getTransactions(filters = {}) {
  const conditions = [];
  const params = [];
  if (filters.type && filters.type !== "all") {
    conditions.push("type = ?");
    params.push(filters.type);
  }
  if (filters.category && filters.category !== "all") {
    conditions.push("category = ?");
    params.push(filters.category);
  }
  if (filters.month) {
    conditions.push("strftime('%Y-%m', date) = ?");
    params.push(filters.month);
  }
  if (filters.search) {
    conditions.push("(description LIKE ? OR category LIKE ?)");
    const q = `%${filters.search}%`;
    params.push(q, q);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filters.limit !== void 0 ? "LIMIT ?" : "";
  const offset = filters.offset !== void 0 ? "OFFSET ?" : "";
  if (filters.limit !== void 0) params.push(filters.limit);
  if (filters.offset !== void 0) params.push(filters.offset);
  const sql = `SELECT * FROM transactions ${where} ORDER BY date DESC, id DESC ${limit} ${offset}`;
  return db.prepare(sql).all(...params);
}
function addTransaction(data) {
  const res = db.prepare(
    `INSERT INTO transactions (amount, amount_eur, type, category, description, date, currency)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    data.amount,
    data.amount_eur,
    data.type,
    data.category,
    data.description ?? "",
    data.date,
    data.currency ?? "EUR"
  );
  return { id: Number(res.lastInsertRowid) };
}
function updateTransaction(id, data) {
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(data)) {
    if (value !== void 0) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }
  if (!fields.length) return;
  values.push(id);
  db.prepare(`UPDATE transactions SET ${fields.join(", ")} WHERE id = ?`).run(...values);
}
function deleteTransaction(id) {
  db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
}
function getRecentTransactions(limit) {
  return db.prepare("SELECT * FROM transactions ORDER BY date DESC, id DESC LIMIT ?").all(limit);
}
function getTransactionMonths() {
  const rows = db.prepare("SELECT DISTINCT strftime('%Y-%m', date) AS month FROM transactions ORDER BY month DESC").all();
  return rows.map((r) => r.month);
}
function getMonthlyTotals(month) {
  const row = db.prepare(
    `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount_eur ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_eur ELSE 0 END), 0) AS expense
      FROM transactions
      WHERE strftime('%Y-%m', date) = ?`
  ).get(month);
  return row;
}
function getSpendingByCategory(month) {
  return db.prepare(
    `SELECT category, SUM(amount_eur) AS amount
       FROM transactions
       WHERE type = 'expense' AND strftime('%Y-%m', date) = ?
       GROUP BY category
       ORDER BY amount DESC`
  ).all(month);
}
function getBalanceTrend(months = 6) {
  const starting = Number(getSetting("starting_balance") ?? "0");
  const rows = db.prepare(
    `SELECT strftime('%Y-%m', date) AS month,
        SUM(CASE WHEN type = 'income' THEN amount_eur ELSE -amount_eur END) AS net
      FROM transactions
      WHERE date >= date('now', '-${months} months', 'start of month')
      GROUP BY month
      ORDER BY month ASC`
  ).all();
  let balance = starting;
  return rows.map((r) => {
    balance += r.net;
    return { month: r.month, balance };
  });
}
function getIncomeExpenseHistory(months = 12) {
  return db.prepare(
    `SELECT strftime('%Y-%m', date) AS month,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount_eur ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_eur ELSE 0 END), 0) AS expense
      FROM transactions
      WHERE date >= date('now', '-${months} months', 'start of month')
      GROUP BY month
      ORDER BY month ASC`
  ).all();
}
function getCategoryTrend(months = 12) {
  return db.prepare(
    `SELECT strftime('%Y-%m', date) AS month, category, SUM(amount_eur) AS amount
      FROM transactions
      WHERE type = 'expense' AND date >= date('now', '-${months} months', 'start of month')
      GROUP BY month, category
      ORDER BY month ASC, amount DESC`
  ).all();
}
function getCategorySummary(fromDate, toDate) {
  return db.prepare(
    `SELECT category,
        SUM(amount_eur) AS amount,
        COUNT(*) AS count,
        AVG(amount_eur) AS avg
      FROM transactions
      WHERE type = 'expense' AND date >= ? AND date <= ?
      GROUP BY category
      ORDER BY amount DESC`
  ).all(fromDate, toDate);
}
function getSubscriptions() {
  return db.prepare("SELECT * FROM subscriptions ORDER BY next_billing_date ASC").all();
}
function addSubscription(data) {
  const res = db.prepare(
    `INSERT INTO subscriptions
       (name, amount, currency, billing_cycle, category, next_billing_date, color, icon, is_active, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    data.name,
    data.amount,
    data.currency ?? "EUR",
    data.billing_cycle,
    data.category,
    data.next_billing_date,
    data.color ?? "#6366f1",
    data.icon ?? "credit-card",
    data.is_active ?? 1,
    data.notes ?? ""
  );
  return { id: Number(res.lastInsertRowid) };
}
function updateSubscription(id, data) {
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(data)) {
    if (value !== void 0) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }
  if (!fields.length) return;
  values.push(id);
  db.prepare(`UPDATE subscriptions SET ${fields.join(", ")} WHERE id = ?`).run(...values);
}
function deleteSubscription(id) {
  db.prepare("DELETE FROM subscriptions WHERE id = ?").run(id);
}
function getActiveSubscriptions() {
  return db.prepare("SELECT * FROM subscriptions WHERE is_active = 1 ORDER BY next_billing_date ASC").all();
}
function getBudget(month) {
  return db.prepare("SELECT * FROM budget WHERE month = ?").all(month);
}
function setBudget(data) {
  const existing = db.prepare("SELECT id FROM budget WHERE category = ? AND month = ?").get(data.category, data.month);
  if (existing) {
    db.prepare("UPDATE budget SET monthly_limit = ? WHERE id = ?").run(data.monthly_limit, existing.id);
    return { id: existing.id };
  }
  const res = db.prepare("INSERT INTO budget (category, monthly_limit, month) VALUES (?, ?, ?)").run(data.category, data.monthly_limit, data.month);
  return { id: Number(res.lastInsertRowid) };
}
function deleteBudget(id) {
  db.prepare("DELETE FROM budget WHERE id = ?").run(id);
}
function getBudgetWithSpending(month) {
  const budgets = getBudget(month);
  const spentMap = /* @__PURE__ */ new Map();
  const rows = db.prepare(
    `SELECT category, SUM(amount_eur) AS spent
       FROM transactions
       WHERE type = 'expense' AND strftime('%Y-%m', date) = ?
       GROUP BY category`
  ).all(month);
  for (const r of rows) spentMap.set(r.category, r.spent);
  return budgets.map((b) => ({ budget: b, spent: spentMap.get(b.category) ?? 0 }));
}
function getGoals() {
  return db.prepare("SELECT * FROM goals ORDER BY created_at ASC").all();
}
function addGoal(data) {
  const res = db.prepare(
    `INSERT INTO goals (name, target_amount, current_amount, target_date, color, icon, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    data.name,
    data.target_amount,
    data.current_amount ?? 0,
    data.target_date ?? null,
    data.color ?? "#10b981",
    data.icon ?? "target",
    data.notes ?? ""
  );
  return { id: Number(res.lastInsertRowid) };
}
function updateGoal(id, data) {
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(data)) {
    if (value !== void 0) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }
  if (!fields.length) return;
  values.push(id);
  db.prepare(`UPDATE goals SET ${fields.join(", ")} WHERE id = ?`).run(...values);
}
function deleteGoal(id) {
  db.prepare("DELETE FROM goals WHERE id = ?").run(id);
}
function exportBackup() {
  return {
    transactions: db.prepare("SELECT * FROM transactions").all(),
    subscriptions: db.prepare("SELECT * FROM subscriptions").all(),
    budget: db.prepare("SELECT * FROM budget").all(),
    goals: db.prepare("SELECT * FROM goals").all(),
    settings: getAllSettings()
  };
}
function importBackup(data) {
  db.transaction(() => {
    db.exec("DELETE FROM transactions");
    db.exec("DELETE FROM subscriptions");
    db.exec("DELETE FROM budget");
    db.exec("DELETE FROM goals");
    const insertTx = db.prepare(
      `INSERT INTO transactions (id, amount, amount_eur, type, category, description, date, currency, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const t of data.transactions) {
      insertTx.run(
        t.id,
        t.amount,
        t.amount_eur ?? t.amount,
        t.type,
        t.category,
        t.description ?? "",
        t.date,
        t.currency ?? "EUR",
        t.created_at
      );
    }
    const insertSub = db.prepare(
      `INSERT INTO subscriptions (id, name, amount, currency, billing_cycle, category, next_billing_date, color, icon, is_active, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const s of data.subscriptions) {
      insertSub.run(
        s.id,
        s.name,
        s.amount,
        s.currency ?? "EUR",
        s.billing_cycle,
        s.category,
        s.next_billing_date,
        s.color ?? "#6366f1",
        s.icon ?? "credit-card",
        s.is_active ?? 1,
        s.notes ?? "",
        s.created_at
      );
    }
    const insertBudget = db.prepare(
      "INSERT INTO budget (id, category, monthly_limit, month, created_at) VALUES (?, ?, ?, ?, ?)"
    );
    for (const b of data.budget) {
      insertBudget.run(b.id, b.category, b.monthly_limit, b.month, b.created_at);
    }
    const insertGoal = db.prepare(
      "INSERT INTO goals (id, name, target_amount, current_amount, target_date, color, icon, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    for (const g of data.goals) {
      insertGoal.run(
        g.id,
        g.name,
        g.target_amount,
        g.current_amount ?? 0,
        g.target_date ?? null,
        g.color ?? "#10b981",
        g.icon ?? "target",
        g.notes ?? "",
        g.created_at
      );
    }
    for (const [key, value] of Object.entries(data.settings)) {
      setSetting(key, value);
    }
  })();
}
function resetData() {
  db.transaction(() => {
    db.exec("DELETE FROM transactions");
    db.exec("DELETE FROM subscriptions");
    db.exec("DELETE FROM budget");
    db.exec("DELETE FROM goals");
    db.exec("DELETE FROM settings");
    initSchema();
  })();
}
function registerTransactionIpc() {
  electron.ipcMain.handle("transactions:get", (_event, filters) => {
    try {
      return getTransactions(filters);
    } catch (e) {
      console.error("transactions:get error", e);
      throw e;
    }
  });
  electron.ipcMain.handle("transactions:add", (_event, data) => {
    try {
      return addTransaction(data);
    } catch (e) {
      console.error("transactions:add error", e);
      throw e;
    }
  });
  electron.ipcMain.handle(
    "transactions:update",
    (_event, id, data) => {
      try {
        updateTransaction(id, data);
      } catch (e) {
        console.error("transactions:update error", e);
        throw e;
      }
    }
  );
  electron.ipcMain.handle("transactions:delete", (_event, id) => {
    try {
      deleteTransaction(id);
    } catch (e) {
      console.error("transactions:delete error", e);
      throw e;
    }
  });
  electron.ipcMain.handle("transactions:getMonths", () => {
    try {
      return getTransactionMonths();
    } catch (e) {
      console.error("transactions:getMonths error", e);
      throw e;
    }
  });
}
function registerSubscriptionIpc() {
  electron.ipcMain.handle("subscriptions:get", () => {
    try {
      return getSubscriptions();
    } catch (e) {
      console.error("subscriptions:get error", e);
      throw e;
    }
  });
  electron.ipcMain.handle("subscriptions:add", (_event, data) => {
    try {
      return addSubscription(data);
    } catch (e) {
      console.error("subscriptions:add error", e);
      throw e;
    }
  });
  electron.ipcMain.handle(
    "subscriptions:update",
    (_event, id, data) => {
      try {
        updateSubscription(id, data);
      } catch (e) {
        console.error("subscriptions:update error", e);
        throw e;
      }
    }
  );
  electron.ipcMain.handle("subscriptions:delete", (_event, id) => {
    try {
      deleteSubscription(id);
    } catch (e) {
      console.error("subscriptions:delete error", e);
      throw e;
    }
  });
}
function registerBudgetIpc() {
  electron.ipcMain.handle("budget:get", (_event, month) => {
    try {
      return getBudgetWithSpending(month);
    } catch (e) {
      console.error("budget:get error", e);
      throw e;
    }
  });
  electron.ipcMain.handle(
    "budget:set",
    (_event, data) => {
      try {
        return setBudget(data);
      } catch (e) {
        console.error("budget:set error", e);
        throw e;
      }
    }
  );
  electron.ipcMain.handle("budget:delete", (_event, id) => {
    try {
      deleteBudget(id);
    } catch (e) {
      console.error("budget:delete error", e);
      throw e;
    }
  });
}
function registerGoalIpc() {
  electron.ipcMain.handle("goals:get", () => {
    try {
      return getGoals();
    } catch (e) {
      console.error("goals:get error", e);
      throw e;
    }
  });
  electron.ipcMain.handle("goals:add", (_event, data) => {
    try {
      return addGoal(data);
    } catch (e) {
      console.error("goals:add error", e);
      throw e;
    }
  });
  electron.ipcMain.handle(
    "goals:update",
    (_event, id, data) => {
      try {
        updateGoal(id, data);
      } catch (e) {
        console.error("goals:update error", e);
        throw e;
      }
    }
  );
  electron.ipcMain.handle("goals:delete", (_event, id) => {
    try {
      deleteGoal(id);
    } catch (e) {
      console.error("goals:delete error", e);
      throw e;
    }
  });
}
function registerSettingsIpc() {
  electron.ipcMain.handle("settings:get", (_event, key) => {
    try {
      return getSetting(key);
    } catch (e) {
      console.error("settings:get error", e);
      throw e;
    }
  });
  electron.ipcMain.handle("settings:set", (_event, key, value) => {
    try {
      setSetting(key, value);
      if (key === "theme") {
        electron.nativeTheme.themeSource = value;
      }
    } catch (e) {
      console.error("settings:set error", e);
      throw e;
    }
  });
  electron.ipcMain.handle("settings:getAll", () => {
    try {
      return getAllSettings();
    } catch (e) {
      console.error("settings:getAll error", e);
      throw e;
    }
  });
}
const rateCache = /* @__PURE__ */ new Map();
const RATE_TTL = 30 * 60 * 1e3;
function getMainWindow() {
  return electron.BrowserWindow.getAllWindows()[0];
}
function toMonthly(amount, cycle) {
  switch (cycle) {
    case "weekly":
      return amount * 4;
    case "quarterly":
      return amount / 3;
    case "yearly":
      return amount / 12;
    default:
      return amount;
  }
}
function registerSystemIpc() {
  electron.ipcMain.handle("dialog:showSave", async (_event, options) => {
    const win = getMainWindow();
    if (!win) return null;
    const result = await electron.dialog.showSaveDialog(win, {
      title: options.title,
      defaultPath: options.defaultPath,
      filters: options.filters
    });
    return result.canceled ? null : result.filePath;
  });
  electron.ipcMain.handle("dialog:showOpen", async (_event, options) => {
    const win = getMainWindow();
    if (!win) return null;
    const result = await electron.dialog.showOpenDialog(win, {
      title: options.title,
      filters: options.filters,
      properties: ["openFile"]
    });
    return result.canceled || !result.filePaths.length ? null : result.filePaths[0];
  });
  electron.ipcMain.handle("currency:getRate", async (_event, from, to) => {
    try {
      if (from === to) return { rate: 1, date: dateFns.format(/* @__PURE__ */ new Date(), "yyyy-MM-dd") };
      const cacheKey = `${from}-${to}`;
      const cached = rateCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < RATE_TTL) {
        return { rate: cached.rate, date: cached.date };
      }
      const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const rate = data.rates[to];
      if (rate === void 0) throw new Error("Tasso non disponibile");
      rateCache.set(cacheKey, { rate, date: data.date, timestamp: Date.now() });
      return { rate, date: data.date };
    } catch (e) {
      console.error("currency:getRate error", e);
      return { rate: null, error: "Impossibile ottenere il tasso di cambio" };
    }
  });
  electron.ipcMain.handle("backup:export", () => {
    try {
      return exportBackup();
    } catch (e) {
      console.error("backup:export error", e);
      throw e;
    }
  });
  electron.ipcMain.handle("backup:import", (_event, data) => {
    try {
      importBackup(data);
    } catch (e) {
      console.error("backup:import error", e);
      throw e;
    }
  });
  electron.ipcMain.handle("backup:save", async () => {
    const win = getMainWindow();
    if (!win) return;
    const result = await electron.dialog.showSaveDialog(win, {
      defaultPath: `finanza-backup-${dateFns.format(/* @__PURE__ */ new Date(), "yyyy-MM-dd")}.json`,
      filters: [{ name: "JSON", extensions: ["json"] }]
    });
    if (result.canceled || !result.filePath) return;
    try {
      const data = exportBackup();
      fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.error("backup:save error", e);
      throw e;
    }
  });
  electron.ipcMain.handle("backup:load", async () => {
    const win = getMainWindow();
    if (!win) return;
    const result = await electron.dialog.showOpenDialog(win, {
      filters: [{ name: "JSON", extensions: ["json"] }],
      properties: ["openFile"]
    });
    if (result.canceled || !result.filePaths.length) return;
    try {
      const raw = fs.readFileSync(result.filePaths[0], "utf-8");
      const data = JSON.parse(raw);
      importBackup(data);
    } catch (e) {
      console.error("backup:load error", e);
      throw e;
    }
  });
  electron.ipcMain.handle("data:reset", () => {
    try {
      resetData();
      const theme = getSetting("theme") ?? "light";
      electron.nativeTheme.themeSource = theme;
    } catch (e) {
      console.error("data:reset error", e);
      throw e;
    }
  });
  electron.ipcMain.handle("csv:export", async (_event, rows) => {
    const win = getMainWindow();
    if (!win) return;
    const result = await electron.dialog.showSaveDialog(win, {
      defaultPath: `transazioni-${dateFns.format(/* @__PURE__ */ new Date(), "yyyy-MM-dd")}.csv`,
      filters: [{ name: "CSV", extensions: ["csv"] }]
    });
    if (result.canceled || !result.filePath) return;
    const headers = ["id", "date", "type", "category", "description", "amount", "currency", "amount_eur"];
    const lines = [
      headers.join(","),
      ...rows.map(
        (r) => [
          r.id,
          r.date,
          r.type,
          `"${r.category}"`,
          `"${(r.description ?? "").replace(/"/g, '""')}"`,
          r.amount,
          r.currency,
          r.amount_eur
        ].join(",")
      )
    ];
    fs.writeFileSync(result.filePath, lines.join("\n"), "utf-8");
  });
  electron.ipcMain.handle("dashboard:summary", (_event, month) => {
    try {
      const starting = Number(getSetting("starting_balance") ?? "0");
      const totals = getMonthlyTotals(month);
      const subs = getActiveSubscriptions();
      const monthlySubscriptionCost = subs.reduce((sum, s) => sum + toMonthly(s.amount, s.billing_cycle), 0);
      return {
        balance: starting + totals.income - totals.expense,
        income: totals.income,
        expense: totals.expense,
        subscriptions: monthlySubscriptionCost,
        upcoming: subs.slice(0, 3),
        recent: getRecentTransactions(5),
        trend: getBalanceTrend(6),
        spendingByCategory: getSpendingByCategory(month)
      };
    } catch (e) {
      console.error("dashboard:summary error", e);
      throw e;
    }
  });
  electron.ipcMain.handle("reports:summary", (_event, from, to) => {
    try {
      return {
        categorySummary: getCategorySummary(from, to),
        incomeExpense: getIncomeExpenseHistory(12),
        categoryTrend: getCategoryTrend(12)
      };
    } catch (e) {
      console.error("reports:summary error", e);
      throw e;
    }
  });
}
const store = new Store();
let mainWindow = null;
function createWindow() {
  const bounds = store.get("windowBounds", { width: 1280, height: 800 });
  mainWindow = new electron.BrowserWindow({
    ...bounds,
    minWidth: 900,
    minHeight: 600,
    title: "Finanza Personale",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  const devUrl = process.env["ELECTRON_RENDERER_URL"];
  if (!electron.app.isPackaged && devUrl) {
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  mainWindow.on("close", () => {
    if (mainWindow) {
      store.set("windowBounds", mainWindow.getBounds());
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
function applyTheme() {
  const theme = getSetting("theme") ?? "light";
  electron.nativeTheme.themeSource = theme;
}
function advanceBillingDate(dateStr, cycle) {
  const date = dateFns.parseISO(dateStr);
  let next = date;
  switch (cycle) {
    case "weekly":
      next = dateFns.addWeeks(date, 1);
      break;
    case "monthly":
      next = dateFns.addMonths(date, 1);
      break;
    case "quarterly":
      next = dateFns.addQuarters(date, 1);
      break;
    case "yearly":
      next = dateFns.addYears(date, 1);
      break;
  }
  return dateFns.format(next, "yyyy-MM-dd");
}
function updateSubscriptionDates() {
  const today = dateFns.startOfDay(/* @__PURE__ */ new Date());
  const subs = getActiveSubscriptions();
  for (const sub of subs) {
    let next = dateFns.parseISO(sub.next_billing_date);
    let changed = false;
    while (dateFns.isBefore(next, today)) {
      next = dateFns.parseISO(advanceBillingDate(dateFns.format(next, "yyyy-MM-dd"), sub.billing_cycle));
      changed = true;
    }
    if (changed) {
      updateSubscription(sub.id, { next_billing_date: dateFns.format(next, "yyyy-MM-dd") });
    }
  }
}
function notifyUpcomingRenewals() {
  const today = dateFns.startOfDay(/* @__PURE__ */ new Date());
  const subs = getActiveSubscriptions().filter((s) => {
    const next = dateFns.parseISO(s.next_billing_date);
    const diff = (next.getTime() - today.getTime()) / (1e3 * 60 * 60 * 24);
    return diff >= 0 && diff <= 3;
  });
  for (const sub of subs) {
    new electron.Notification({
      title: "Rinnovo in arrivo",
      body: `${sub.name} si rinnova il ${sub.next_billing_date}`
    }).show();
  }
}
function registerIpc() {
  registerTransactionIpc();
  registerSubscriptionIpc();
  registerBudgetIpc();
  registerGoalIpc();
  registerSettingsIpc();
  registerSystemIpc();
}
electron.app.whenReady().then(() => {
  applyTheme();
  updateSubscriptionDates();
  registerIpc();
  createWindow();
  notifyUpcomingRenewals();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    closeDb();
    electron.app.quit();
  }
});
electron.app.on("before-quit", () => {
  closeDb();
});
