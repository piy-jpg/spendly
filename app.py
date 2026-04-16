import csv
import io
import sqlite3
from datetime import datetime
from functools import wraps

from flask import (
    Flask,
    abort,
    flash,
    g,
    make_response,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from werkzeug.security import check_password_hash

from database.db import (
    create_expense,
    create_user,
    delete_expense as delete_expense_record,
    get_budget_for_user,
    get_expense_by_id,
    get_expense_summary,
    get_expenses_for_user,
    get_user_by_email,
    get_user_by_id,
    init_db,
    seed_db,
    update_expense,
    upsert_budget,
)

app = Flask(__name__)
app.secret_key = "dev-secret-key"

CATEGORIES = [
    "Food",
    "Travel",
    "Bills",
    "Shopping",
    "Health",
    "Entertainment",
    "Education",
    "Other",
]

with app.app_context():
    init_db()
    seed_db()


def login_required(view):
    @wraps(view)
    def wrapped_view(*args, **kwargs):
        if g.user is None:
            flash("Please sign in to continue.", "error")
            return redirect(url_for("login"))
        return view(*args, **kwargs)

    return wrapped_view


@app.before_request
def load_current_user():
    user_id = session.get("user_id")
    g.user = get_user_by_id(user_id) if user_id else None


@app.context_processor
def inject_globals():
    return {"categories": CATEGORIES}


def parse_date(value):
    if not value:
        return None
    try:
        datetime.strptime(value, "%Y-%m-%d")
        return value
    except ValueError:
        return None


def parse_expense_form():
    title = request.form.get("title", "").strip()
    category = request.form.get("category", "").strip()
    amount_text = request.form.get("amount", "").strip()
    expense_date = request.form.get("expense_date", "").strip()
    notes = request.form.get("notes", "").strip()

    if not title or not category or not amount_text or not expense_date:
        return None, "Title, category, amount, and date are required."

    if category not in CATEGORIES:
        return None, "Please choose a valid category."

    try:
        amount = round(float(amount_text), 2)
    except ValueError:
        return None, "Amount must be a valid number."

    if amount <= 0:
        return None, "Amount must be greater than zero."

    if not parse_date(expense_date):
        return None, "Please enter a valid date."

    payload = {
        "title": title,
        "category": category,
        "amount": amount,
        "expense_date": expense_date,
        "notes": notes,
    }
    return payload, None


def get_dashboard_filters():
    filters = {
        "q": request.args.get("q", "").strip(),
        "category": request.args.get("category", "").strip(),
        "start_date": request.args.get("start_date", "").strip(),
        "end_date": request.args.get("end_date", "").strip(),
    }

    if filters["category"] and filters["category"] not in CATEGORIES:
        filters["category"] = ""

    if filters["start_date"] and not parse_date(filters["start_date"]):
        filters["start_date"] = ""
    if filters["end_date"] and not parse_date(filters["end_date"]):
        filters["end_date"] = ""

    return filters


def dashboard_context(filters=None):
    filters = filters or {}
    expenses = get_expenses_for_user(g.user["id"], filters)
    summary, category_totals, monthly_total_row, recent_months = get_expense_summary(g.user["id"], filters)
    budget_row = get_budget_for_user(g.user["id"])

    total_amount = float(summary["total_amount"] or 0)
    average_amount = float(summary["average_amount"] or 0)
    max_amount = float(summary["max_amount"] or 0)
    monthly_spend = float(monthly_total_row["monthly_total"] or 0)
    monthly_budget = float(budget_row["monthly_budget"]) if budget_row else 0
    remaining_budget = monthly_budget - monthly_spend if monthly_budget else 0
    budget_used_pct = round((monthly_spend / monthly_budget) * 100) if monthly_budget else 0

    category_rows = []
    for row in category_totals:
        category_total = float(row["total"])
        percentage = round((category_total / total_amount) * 100) if total_amount else 0
        category_rows.append(
            {
                "category": row["category"],
                "total": category_total,
                "percentage": percentage,
            }
        )

    trend_rows = []
    for row in recent_months:
        if not row["month_key"]:
            continue
        label = datetime.strptime(row["month_key"], "%Y-%m").strftime("%b %Y")
        trend_rows.append({"label": label, "total": float(row["total"] or 0)})

    trend_rows.reverse()

    return {
        "expenses": expenses,
        "summary": summary,
        "category_rows": category_rows,
        "total_amount": total_amount,
        "average_amount": average_amount,
        "max_amount": max_amount,
        "filters": filters,
        "monthly_spend": monthly_spend,
        "monthly_budget": monthly_budget,
        "remaining_budget": remaining_budget,
        "budget_used_pct": budget_used_pct,
        "trend_rows": trend_rows,
        "has_active_filters": any(filters.values()),
    }


@app.route("/")
def landing():
    if g.user:
        return redirect(url_for("dashboard"))
    return render_template("landing.html")


@app.route("/dashboard")
@login_required
def dashboard():
    return render_template("dashboard.html", **dashboard_context(get_dashboard_filters()))


@app.route("/budget", methods=["POST"])
@login_required
def update_budget():
    budget_text = request.form.get("monthly_budget", "").strip()
    try:
        monthly_budget = round(float(budget_text), 2)
    except ValueError:
        flash("Monthly budget must be a valid number.", "error")
        return redirect(url_for("dashboard"))

    if monthly_budget < 0:
        flash("Monthly budget cannot be negative.", "error")
        return redirect(url_for("dashboard"))

    upsert_budget(g.user["id"], monthly_budget)
    flash("Monthly budget updated.", "success")
    return redirect(url_for("dashboard"))


@app.route("/expenses/export")
@login_required
def export_expenses():
    filters = get_dashboard_filters()
    expenses = get_expenses_for_user(g.user["id"], filters)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Title", "Category", "Amount", "Date", "Notes"])
    for expense in expenses:
        writer.writerow(
            [
                expense["title"],
                expense["category"],
                f'{float(expense["amount"]):.2f}',
                expense["expense_date"],
                expense["notes"] or "",
            ]
        )

    response = make_response(output.getvalue())
    response.headers["Content-Type"] = "text/csv; charset=utf-8"
    response.headers["Content-Disposition"] = 'attachment; filename="spendly-expenses.csv"'
    return response


@app.route("/register", methods=["GET", "POST"])
def register():
    if g.user:
        return redirect(url_for("dashboard"))

    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        confirm_password = request.form.get("confirm_password", "")

        if not all([name, email, password, confirm_password]):
            flash("All fields are required.", "error")
            return render_template("register.html")

        if "@" not in email:
            flash("Please enter a valid email address.", "error")
            return render_template("register.html")

        if len(password) < 8:
            flash("Password must be at least 8 characters.", "error")
            return render_template("register.html")

        if password != confirm_password:
            flash("Passwords do not match.", "error")
            return render_template("register.html")

        try:
            user_id = create_user(name, email, password)
        except sqlite3.IntegrityError:
            flash("Email already registered.", "error")
            return render_template("register.html")

        session["user_id"] = user_id
        flash("Account created successfully.", "success")
        return redirect(url_for("dashboard"))

    return render_template("register.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if g.user:
        return redirect(url_for("dashboard"))

    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        user = get_user_by_email(email)
        if not user or not check_password_hash(user["password_hash"], password):
            flash("Invalid email or password.", "error")
            return render_template("login.html")

        session["user_id"] = user["id"]
        flash("Welcome back!", "success")
        return redirect(url_for("dashboard"))

    return render_template("login.html")


@app.route("/terms")
def terms():
    return render_template("terms.html")


@app.route("/privacy")
def privacy():
    return render_template("privacy.html")


@app.route("/logout")
def logout():
    session.clear()
    flash("You have been logged out.", "success")
    return redirect(url_for("landing"))


@app.route("/profile")
@login_required
def profile():
    summary, _, monthly_total_row, _ = get_expense_summary(g.user["id"])
    budget_row = get_budget_for_user(g.user["id"])
    return render_template(
        "profile.html",
        summary=summary,
        monthly_budget=float(budget_row["monthly_budget"]) if budget_row else 0,
        monthly_spend=float(monthly_total_row["monthly_total"] or 0),
    )


@app.route("/expenses/add", methods=["GET", "POST"])
@login_required
def add_expense():
    if request.method == "POST":
        payload, error = parse_expense_form()
        if error:
            flash(error, "error")
            return render_template("expense_form.html", form_mode="add", expense=request.form)

        create_expense(g.user["id"], **payload)
        flash("Expense added successfully.", "success")
        return redirect(url_for("dashboard"))

    return render_template("expense_form.html", form_mode="add", expense=None)


@app.route("/expenses/<int:id>/edit", methods=["GET", "POST"])
@login_required
def edit_expense(id):
    expense = get_expense_by_id(id, g.user["id"])
    if expense is None:
        abort(404)

    if request.method == "POST":
        payload, error = parse_expense_form()
        if error:
            flash(error, "error")
            return render_template(
                "expense_form.html",
                form_mode="edit",
                expense=request.form,
                expense_id=id,
            )

        update_expense(id, g.user["id"], **payload)
        flash("Expense updated successfully.", "success")
        return redirect(url_for("dashboard"))

    return render_template("expense_form.html", form_mode="edit", expense=expense, expense_id=id)


@app.route("/expenses/<int:id>/delete", methods=["GET", "POST"])
@login_required
def delete_expense(id):
    expense = get_expense_by_id(id, g.user["id"])
    if expense is None:
        abort(404)

    if request.method == "POST":
        delete_expense_record(id, g.user["id"])
        flash("Expense deleted.", "success")
        return redirect(url_for("dashboard"))

    return render_template("delete_expense.html", expense=expense)


if __name__ == "__main__":
    app.run(debug=True, port=5001)
