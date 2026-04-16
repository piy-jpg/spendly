const path = require("path");
const Database = require("better-sqlite3");

const databasePath = path.join(process.cwd(), "spendly.db");
const db = new Database(databasePath);

db.pragma("foreign_keys = ON");

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      expense_date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS budgets (
      user_id INTEGER PRIMARY KEY,
      monthly_budget REAL NOT NULL CHECK(monthly_budget >= 0),
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

function getUserByEmail(email) {
  return db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(String(email || "").trim().toLowerCase());
}

function getUserById(id) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
}

function createUser(name, email, passwordHash) {
  const result = db
    .prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
    .run(name, String(email || "").trim().toLowerCase(), passwordHash);
  return result.lastInsertRowid;
}

function buildExpenseFilterSql(userId, filters = {}) {
  const clauses = ["user_id = ?"];
  const params = [userId];

  const search = String(filters.q || "").trim().toLowerCase();
  if (search) {
    clauses.push(`(
      LOWER(title) LIKE ?
      OR LOWER(COALESCE(notes, '')) LIKE ?
      OR LOWER(category) LIKE ?
      OR CAST(amount AS TEXT) LIKE ?
      OR expense_date LIKE ?
    )`);
    const like = `%${search}%`;
    params.push(like, like, like, like, like);
  }

  const categories = Array.isArray(filters.categories)
    ? filters.categories.map((category) => String(category || "").trim()).filter(Boolean)
    : [];
  const singleCategory = String(filters.category || "").trim();
  const resolvedCategories = categories.length ? categories : (singleCategory ? [singleCategory] : []);

  if (resolvedCategories.length === 1) {
    clauses.push("category = ?");
    params.push(resolvedCategories[0]);
  } else if (resolvedCategories.length > 1) {
    clauses.push(`category IN (${resolvedCategories.map(() => "?").join(", ")})`);
    params.push(...resolvedCategories);
  }

  const startDate = String(filters.startDate || "").trim();
  if (startDate) {
    clauses.push("expense_date >= ?");
    params.push(startDate);
  }

  const endDate = String(filters.endDate || "").trim();
  if (endDate) {
    clauses.push("expense_date <= ?");
    params.push(endDate);
  }

  const minAmount = Number(filters.minAmount);
  if (Number.isFinite(minAmount) && minAmount >= 0) {
    clauses.push("amount >= ?");
    params.push(minAmount);
  }

  const maxAmount = Number(filters.maxAmount);
  if (Number.isFinite(maxAmount) && maxAmount >= 0) {
    clauses.push("amount <= ?");
    params.push(maxAmount);
  }

  return {
    whereClause: clauses.join(" AND "),
    params,
  };
}

function getExpensesForUser(userId, filters = {}) {
  const { whereClause, params } = buildExpenseFilterSql(userId, filters);
  return db
    .prepare(`
      SELECT *
      FROM expenses
      WHERE ${whereClause}
      ORDER BY expense_date DESC, created_at DESC, id DESC
    `)
    .all(...params);
}

function getExpenseById(expenseId, userId) {
  return db
    .prepare("SELECT * FROM expenses WHERE id = ? AND user_id = ?")
    .get(expenseId, userId);
}

function createExpense(userId, title, category, amount, expenseDate, notes) {
  return db
    .prepare(`
      INSERT INTO expenses (user_id, title, category, amount, expense_date, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(userId, title, category, amount, expenseDate, notes || "");
}

function updateExpense(expenseId, userId, title, category, amount, expenseDate, notes) {
  return db
    .prepare(`
      UPDATE expenses
      SET title = ?, category = ?, amount = ?, expense_date = ?, notes = ?
      WHERE id = ? AND user_id = ?
    `)
    .run(title, category, amount, expenseDate, notes || "", expenseId, userId);
}

function deleteExpense(expenseId, userId) {
  return db
    .prepare("DELETE FROM expenses WHERE id = ? AND user_id = ?")
    .run(expenseId, userId);
}

function getExpenseSummary(userId, filters = {}) {
  const { whereClause, params } = buildExpenseFilterSql(userId, filters);

  const totals = db
    .prepare(`
      SELECT
        COUNT(*) AS total_count,
        COALESCE(SUM(amount), 0) AS total_amount,
        COALESCE(MAX(expense_date), '') AS latest_date,
        COALESCE(AVG(amount), 0) AS average_amount,
        COALESCE(MAX(amount), 0) AS max_amount
      FROM expenses
      WHERE ${whereClause}
    `)
    .get(...params);

  const categories = db
    .prepare(`
      SELECT category, SUM(amount) AS total
      FROM expenses
      WHERE ${whereClause}
      GROUP BY category
      ORDER BY total DESC, category ASC
      LIMIT 5
    `)
    .all(...params);

  const monthlyTotal = db
    .prepare(`
      SELECT COALESCE(SUM(amount), 0) AS monthly_total
      FROM expenses
      WHERE user_id = ? AND strftime('%Y-%m', expense_date) = strftime('%Y-%m', 'now', 'localtime')
    `)
    .get(userId);

  const recentMonths = db
    .prepare(`
      SELECT strftime('%Y-%m', expense_date) AS month_key, SUM(amount) AS total
      FROM expenses
      WHERE user_id = ?
      GROUP BY month_key
      ORDER BY month_key DESC
      LIMIT 6
    `)
    .all(userId);

  const recentWeeks = db
    .prepare(`
      SELECT
        strftime('%Y-%W', expense_date) AS week_key,
        MIN(expense_date) AS week_start,
        SUM(amount) AS total
      FROM expenses
      WHERE user_id = ?
      GROUP BY week_key
      ORDER BY week_key DESC
      LIMIT 4
    `)
    .all(userId);

  return { totals, categories, monthlyTotal, recentMonths, recentWeeks };
}

function getBudgetForUser(userId) {
  return db.prepare("SELECT monthly_budget FROM budgets WHERE user_id = ?").get(userId);
}

function upsertBudget(userId, monthlyBudget) {
  return db
    .prepare(`
      INSERT INTO budgets (user_id, monthly_budget, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        monthly_budget = excluded.monthly_budget,
        updated_at = CURRENT_TIMESTAMP
    `)
    .run(userId, monthlyBudget);
}

module.exports = {
  initDb,
  getUserByEmail,
  getUserById,
  createUser,
  getExpensesForUser,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
  getBudgetForUser,
  upsertBudget,
};
