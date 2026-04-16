import sqlite3

from werkzeug.security import generate_password_hash

DATABASE = "spendly.db"


def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    with get_db() as db:
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL
            )
            """
        )
        db.execute(
            """
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
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS budgets (
                user_id INTEGER PRIMARY KEY,
                monthly_budget REAL NOT NULL CHECK(monthly_budget >= 0),
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )
        db.commit()


def seed_db():
    pass


def create_user(name, email, password):
    password_hash = generate_password_hash(password)
    with get_db() as db:
        cursor = db.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            (name, email.lower(), password_hash),
        )
        db.commit()
        return cursor.lastrowid


def get_user_by_email(email):
    with get_db() as db:
        return db.execute(
            "SELECT * FROM users WHERE email = ?",
            (email.lower(),),
        ).fetchone()


def get_user_by_id(user_id):
    with get_db() as db:
        return db.execute(
            "SELECT * FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()


def create_expense(user_id, title, category, amount, expense_date, notes):
    with get_db() as db:
        cursor = db.execute(
            """
            INSERT INTO expenses (user_id, title, category, amount, expense_date, notes)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (user_id, title, category, amount, expense_date, notes),
        )
        db.commit()
        return cursor.lastrowid


def _build_expense_filters(user_id, filters=None):
    filters = filters or {}
    clauses = ["user_id = ?"]
    params = [user_id]

    search = (filters.get("q") or "").strip()
    if search:
        clauses.append("(LOWER(title) LIKE ? OR LOWER(COALESCE(notes, '')) LIKE ?)")
        like = f"%{search.lower()}%"
        params.extend([like, like])

    category = (filters.get("category") or "").strip()
    if category:
        clauses.append("category = ?")
        params.append(category)

    start_date = (filters.get("start_date") or "").strip()
    if start_date:
        clauses.append("expense_date >= ?")
        params.append(start_date)

    end_date = (filters.get("end_date") or "").strip()
    if end_date:
        clauses.append("expense_date <= ?")
        params.append(end_date)

    return " AND ".join(clauses), params


def get_expenses_for_user(user_id, filters=None):
    where_clause, params = _build_expense_filters(user_id, filters)
    with get_db() as db:
        return db.execute(
            f"""
            SELECT *
            FROM expenses
            WHERE {where_clause}
            ORDER BY expense_date DESC, created_at DESC, id DESC
            """,
            params,
        ).fetchall()


def get_expense_by_id(expense_id, user_id):
    with get_db() as db:
        return db.execute(
            """
            SELECT *
            FROM expenses
            WHERE id = ? AND user_id = ?
            """,
            (expense_id, user_id),
        ).fetchone()


def update_expense(expense_id, user_id, title, category, amount, expense_date, notes):
    with get_db() as db:
        db.execute(
            """
            UPDATE expenses
            SET title = ?, category = ?, amount = ?, expense_date = ?, notes = ?
            WHERE id = ? AND user_id = ?
            """,
            (title, category, amount, expense_date, notes, expense_id, user_id),
        )
        db.commit()


def delete_expense(expense_id, user_id):
    with get_db() as db:
        db.execute(
            "DELETE FROM expenses WHERE id = ? AND user_id = ?",
            (expense_id, user_id),
        )
        db.commit()


def get_expense_summary(user_id, filters=None):
    where_clause, params = _build_expense_filters(user_id, filters)
    with get_db() as db:
        totals = db.execute(
            f"""
            SELECT
                COUNT(*) AS total_count,
                COALESCE(SUM(amount), 0) AS total_amount,
                COALESCE(MAX(expense_date), '') AS latest_date,
                COALESCE(AVG(amount), 0) AS average_amount,
                COALESCE(MAX(amount), 0) AS max_amount
            FROM expenses
            WHERE {where_clause}
            """,
            params,
        ).fetchone()

        categories = db.execute(
            f"""
            SELECT category, SUM(amount) AS total
            FROM expenses
            WHERE {where_clause}
            GROUP BY category
            ORDER BY total DESC, category ASC
            LIMIT 5
            """,
            params,
        ).fetchall()

        monthly_total = db.execute(
            """
            SELECT COALESCE(SUM(amount), 0) AS monthly_total
            FROM expenses
            WHERE user_id = ? AND strftime('%Y-%m', expense_date) = strftime('%Y-%m', 'now', 'localtime')
            """,
            (user_id,),
        ).fetchone()

        recent_months = db.execute(
            """
            SELECT strftime('%Y-%m', expense_date) AS month_key, SUM(amount) AS total
            FROM expenses
            WHERE user_id = ?
            GROUP BY month_key
            ORDER BY month_key DESC
            LIMIT 6
            """,
            (user_id,),
        ).fetchall()

    return totals, categories, monthly_total, recent_months


def get_budget_for_user(user_id):
    with get_db() as db:
        return db.execute(
            "SELECT monthly_budget FROM budgets WHERE user_id = ?",
            (user_id,),
        ).fetchone()


def upsert_budget(user_id, monthly_budget):
    with get_db() as db:
        db.execute(
            """
            INSERT INTO budgets (user_id, monthly_budget, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id) DO UPDATE SET
                monthly_budget = excluded.monthly_budget,
                updated_at = CURRENT_TIMESTAMP
            """,
            (user_id, monthly_budget),
        )
        db.commit()
