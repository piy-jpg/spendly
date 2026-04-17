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

    CREATE TABLE IF NOT EXISTS recurring_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
      start_date TEXT NOT NULL,
      end_date TEXT,
      last_generated TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

function getSpendingTrends(userId, months = 6) {
  return db
    .prepare(`
      SELECT
        strftime('%Y-%m', expense_date) AS month,
        SUM(amount) AS total_spent,
        COUNT(*) AS transaction_count,
        AVG(amount) AS avg_transaction
      FROM expenses
      WHERE user_id = ?
        AND expense_date >= date('now', '-${months} months')
      GROUP BY month
      ORDER BY month ASC
    `)
    .all(userId);
}

function getCategoryBreakdown(userId, months = 3) {
  return db
    .prepare(`
      SELECT
        category,
        SUM(amount) AS total_spent,
        COUNT(*) AS transaction_count,
        ROUND((SUM(amount) * 100.0 / (SELECT SUM(amount) FROM expenses WHERE user_id = ? AND expense_date >= date('now', '-${months} months'))), 2) AS percentage
      FROM expenses
      WHERE user_id = ?
        AND expense_date >= date('now', '-${months} months')
      GROUP BY category
      ORDER BY total_spent DESC
    `)
    .all(userId, userId);
}

function getDailySpendingPattern(userId, days = 30) {
  return db
    .prepare(`
      SELECT
        strftime('%w', expense_date) AS day_of_week,
        CASE strftime('%w', expense_date)
          WHEN '0' THEN 'Sunday'
          WHEN '1' THEN 'Monday'
          WHEN '2' THEN 'Tuesday'
          WHEN '3' THEN 'Wednesday'
          WHEN '4' THEN 'Thursday'
          WHEN '5' THEN 'Friday'
          WHEN '6' THEN 'Saturday'
        END AS day_name,
        SUM(amount) AS total_spent,
        COUNT(*) AS transaction_count
      FROM expenses
      WHERE user_id = ?
        AND expense_date >= date('now', '-${days} days')
      GROUP BY day_of_week, day_name
      ORDER BY day_of_week
    `)
    .all(userId);
}

function getMonthlyComparison(userId) {
  return db
    .prepare(`
      SELECT
        strftime('%Y-%m', expense_date) AS month,
        category,
        SUM(amount) AS amount
      FROM expenses
      WHERE user_id = ?
        AND expense_date >= date('now', '-12 months')
      GROUP BY month, category
      ORDER BY month DESC, amount DESC
    `)
    .all(userId);
}

function createRecurringExpense(userId, title, category, amount, frequency, startDate, endDate, notes) {
  const result = db
    .prepare(`
      INSERT INTO recurring_expenses (user_id, title, category, amount, frequency, start_date, end_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(userId, title, category, amount, frequency, startDate, endDate, notes);
  return result.lastInsertRowid;
}

function getRecurringExpensesForUser(userId, activeOnly = true) {
  let query = "SELECT * FROM recurring_expenses WHERE user_id = ?";
  const params = [userId];
  
  if (activeOnly) {
    query += " AND is_active = 1";
  }
  
  query += " ORDER BY created_at DESC";
  
  return db.prepare(query).all(...params);
}

function getRecurringExpenseById(id, userId) {
  return db
    .prepare("SELECT * FROM recurring_expenses WHERE id = ? AND user_id = ?")
    .get(id, userId);
}

function updateRecurringExpense(id, userId, title, category, amount, frequency, startDate, endDate, notes, isActive) {
  return db
    .prepare(`
      UPDATE recurring_expenses 
      SET title = ?, category = ?, amount = ?, frequency = ?, start_date = ?, end_date = ?, notes = ?, is_active = ?
      WHERE id = ? AND user_id = ?
    `)
    .run(title, category, amount, frequency, startDate, endDate, notes, isActive, id, userId);
}

function deleteRecurringExpense(id, userId) {
  return db
    .prepare("DELETE FROM recurring_expenses WHERE id = ? AND user_id = ?")
    .run(id, userId);
}

function generateRecurringExpenses() {
  const today = new Date().toISOString().split('T')[0];
  const recurringExpenses = db
    .prepare(`
      SELECT * FROM recurring_expenses 
      WHERE is_active = 1 
        AND (last_generated IS NULL OR last_generated < ?)
        AND (end_date IS NULL OR end_date >= ?)
    `)
    .all(today, today);

  const generatedExpenses = [];
  
  for (const recurring of recurringExpenses) {
    const lastGenerated = recurring.last_generated || recurring.start_date;
    const nextDate = calculateNextDate(lastGenerated, recurring.frequency);
    
    if (nextDate <= today) {
      // Create the expense
      const expenseResult = db
        .prepare(`
          INSERT INTO expenses (user_id, title, category, amount, expense_date, notes)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        .run(
          recurring.user_id,
          recurring.title,
          recurring.category,
          recurring.amount,
          nextDate,
          recurring.notes ? `Recurring: ${recurring.notes}` : 'Recurring expense'
        );
      
      // Update last_generated
      db
        .prepare("UPDATE recurring_expenses SET last_generated = ? WHERE id = ?")
        .run(nextDate, recurring.id);
      
      generatedExpenses.push({
        expenseId: expenseResult.lastInsertRowid,
        recurringId: recurring.id,
        date: nextDate,
        title: recurring.title
      });
    }
  }
  
  return generatedExpenses;
}

function calculateNextDate(lastDate, frequency) {
  const date = new Date(lastDate);
  
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  
  return date.toISOString().split('T')[0];
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
  getSpendingTrends,
  getCategoryBreakdown,
  getDailySpendingPattern,
  getMonthlyComparison,
  createRecurringExpense,
  getRecurringExpensesForUser,
  getRecurringExpenseById,
  updateRecurringExpense,
  deleteRecurringExpense,
  generateRecurringExpenses,
};
