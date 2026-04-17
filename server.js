const crypto = require("crypto");
const path = require("path");

const express = require("express");

const {
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
} = require("./lib/db");

const app = express();
const PORT = Number(process.env.PORT || 5001);
const sessionStore = new Map();

const CATEGORIES = [
  "Food",
  "Travel",
  "Bills",
  "Shopping",
  "Health",
  "Entertainment",
  "Education",
  "Other",
];

initDb();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: false }));
app.use("/static", express.static(path.join(__dirname, "static")));

function parseCookies(cookieHeader = "") {
  return cookieHeader.split(";").reduce((acc, part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key) {
      return acc;
    }
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function createSession() {
  const id = crypto.randomUUID();
  sessionStore.set(id, {});
  return { id, data: sessionStore.get(id) };
}

function getSession(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies.spendly_sid;
  if (sessionId && sessionStore.has(sessionId)) {
    return { id: sessionId, data: sessionStore.get(sessionId) };
  }

  const session = createSession();
  res.setHeader("Set-Cookie", `spendly_sid=${session.id}; HttpOnly; Path=/; SameSite=Lax`);
  return session;
}

function addFlash(req, type, text) {
  req.session.flashes = req.session.flashes || [];
  req.session.flashes.push({ type, text });
}

function hashPassword(password) {
  const salt = crypto.randomBytes(8).toString("base64url");
  const key = crypto.scryptSync(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 256 * 1024 * 1024,
  });
  return `scrypt:32768:8:1$${salt}$${key.toString("hex")}`;
}

function verifyPassword(storedHash, password) {
  if (!storedHash || !password) {
    return false;
  }

  if (storedHash.startsWith("scrypt:")) {
    const [method, salt, digest] = storedHash.split("$");
    const [, n, r, p] = method.split(":");
    if (!salt || !digest || !n || !r || !p) {
      return false;
    }

    const key = crypto.scryptSync(password, salt, Buffer.from(digest, "hex").length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 256 * 1024 * 1024,
    });
    return crypto.timingSafeEqual(Buffer.from(digest, "hex"), key);
  }

  return false;
}

function parseDate(value) {
  if (!value) {
    return "";
  }
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(value);
  return valid ? value : "";
}

function stripSearchToken(text, pattern) {
  return text.replace(pattern, " ").replace(/\s{2,}/g, " ").trim();
}

function applyRelativeDateFilter(filters, range) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = formatDateKey(today);

  if (range === "today") {
    filters.startDate = todayKey;
    filters.endDate = todayKey;
    return;
  }

  if (range === "week") {
    filters.startDate = formatDateKey(addDays(today, -6));
    filters.endDate = todayKey;
    return;
  }

  if (range === "month") {
    filters.startDate = `${todayKey.slice(0, 8)}01`;
    filters.endDate = todayKey;
  }
}

function interpretSmartSearch(filters) {
  let smartQuery = filters.q;

  if (!smartQuery) {
    return filters;
  }

  const dateRules = [
    { pattern: /\b(last|this)\s+week(?:'s)?\b/i, range: "week" },
    { pattern: /\bthis\s+month\b/i, range: "month" },
    { pattern: /\btoday'?s?\b/i, range: "today" },
  ];

  dateRules.forEach((rule) => {
    if (rule.pattern.test(smartQuery)) {
      applyRelativeDateFilter(filters, rule.range);
      smartQuery = stripSearchToken(smartQuery, rule.pattern);
    }
  });

  const amountRules = [
    { pattern: /(?:>=|>|above|over|more than)\s*₹?\$?€?\s*(\d+(?:\.\d+)?)/i, key: "minAmount" },
    { pattern: /(?:<=|<|below|under|less than)\s*₹?\$?€?\s*(\d+(?:\.\d+)?)/i, key: "maxAmount" },
  ];

  amountRules.forEach((rule) => {
    const match = smartQuery.match(rule.pattern);
    if (!match) {
      return;
    }

    const amount = Number.parseFloat(match[1]);
    if (Number.isFinite(amount) && amount >= 0 && filters[rule.key] === "") {
      filters[rule.key] = Number(amount.toFixed(2));
    }
    smartQuery = stripSearchToken(smartQuery, rule.pattern);
  });

  CATEGORIES.forEach((category) => {
    const pattern = new RegExp(`\\b${category.toLowerCase()}\\b`, "i");
    if (pattern.test(smartQuery) && !filters.categories.includes(category)) {
      filters.categories.push(category);
      smartQuery = stripSearchToken(smartQuery, pattern);
    }
  });

  filters.q = smartQuery.replace(/\b(show|expenses|expense|spend|spending|for|in)\b/gi, " ").replace(/\s{2,}/g, " ").trim();
  return filters;
}

function sanitizeFilters(query) {
  const requestedCategories = []
    .concat(query.categories || [])
    .concat(query.category || [])
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  const categorySet = [...new Set(requestedCategories.filter((category) => CATEGORIES.includes(category)))];
  const minAmount = Number.parseFloat(String(query.min_amount || "").trim());
  const maxAmount = Number.parseFloat(String(query.max_amount || "").trim());

  const filters = {
    q: String(query.q || "").trim(),
    categories: categorySet,
    category: categorySet[0] || "",
    startDate: parseDate(String(query.start_date || "").trim()),
    endDate: parseDate(String(query.end_date || "").trim()),
    minAmount: Number.isFinite(minAmount) && minAmount >= 0 ? Number(minAmount.toFixed(2)) : "",
    maxAmount: Number.isFinite(maxAmount) && maxAmount >= 0 ? Number(maxAmount.toFixed(2)) : "",
  };

  if (
    typeof filters.minAmount === "number"
    && typeof filters.maxAmount === "number"
    && filters.minAmount > filters.maxAmount
  ) {
    const temp = filters.minAmount;
    filters.minAmount = filters.maxAmount;
    filters.maxAmount = temp;
  }

  return interpretSmartSearch(filters);
}

function parseQuickAdd(body) {
  const input = String(body.quick_entry || "").trim();

  if (!input) {
    return { error: "Quick add needs something like '₹200 Food' or '450 Travel cab'." };
  }

  const amountMatch = input.match(/(?:₹|\$|€)?\s*(\d+(?:\.\d+)?)/);
  if (!amountMatch) {
    return { error: "Include an amount in your quick add entry." };
  }

  const amount = Number.parseFloat(amountMatch[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Quick add amount must be greater than zero." };
  }

  const category = CATEGORIES.find((item) => new RegExp(`\\b${item}\\b`, "i").test(input));
  if (!category) {
    return { error: `Choose a category in the quick add text: ${CATEGORIES.join(", ")}.` };
  }

  const normalized = input
    .replace(amountMatch[0], " ")
    .replace(new RegExp(`\\b${category}\\b`, "i"), " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  const tokens = normalized.split(/\s+/).filter(Boolean);
  const title = tokens.length ? tokens.slice(0, 3).join(" ") : `${category} expense`;
  const notes = normalized;

  return {
    payload: {
      title: title.charAt(0).toUpperCase() + title.slice(1),
      category,
      amount: Number(amount.toFixed(2)),
      expenseDate: formatDateKey(new Date()),
      notes,
    },
  };
}

function parseExpenseForm(body) {
  const title = String(body.title || "").trim();
  const category = String(body.category || "").trim();
  const amountText = String(body.amount || "").trim();
  const expenseDate = parseDate(String(body.expense_date || "").trim());
  const notes = String(body.notes || "").trim();

  if (!title || !category || !amountText || !expenseDate) {
    return { error: "Title, category, amount, and date are required." };
  }

  if (!CATEGORIES.includes(category)) {
    return { error: "Please choose a valid category." };
  }

  const amount = Number.parseFloat(amountText);
  if (!Number.isFinite(amount)) {
    return { error: "Amount must be a valid number." };
  }

  if (amount <= 0) {
    return { error: "Amount must be greater than zero." };
  }

  return {
    payload: {
      title,
      category,
      amount: Number(amount.toFixed(2)),
      expenseDate,
      notes,
    },
  };
}

function parseRecurringForm(body) {
  const title = String(body.title || "").trim();
  const category = String(body.category || "").trim();
  const amountText = String(body.amount || "").trim();
  const frequency = String(body.frequency || "").trim();
  const startDate = parseDate(String(body.start_date || "").trim());
  const endDate = parseDate(String(body.end_date || "").trim());
  const notes = String(body.notes || "").trim();
  const isActive = body.is_active ? 1 : 0;

  const validFrequencies = ["daily", "weekly", "monthly", "yearly"];
  
  if (!title || !category || !amountText || !frequency || !startDate) {
    return { error: "Title, category, amount, frequency, and start date are required." };
  }

  if (!CATEGORIES.includes(category)) {
    return { error: "Please choose a valid category." };
  }

  if (!validFrequencies.includes(frequency)) {
    return { error: "Please choose a valid frequency." };
  }

  if (endDate && endDate < startDate) {
    return { error: "End date must be after start date." };
  }

  const amount = Number.parseFloat(amountText);
  if (!Number.isFinite(amount)) {
    return { error: "Amount must be a valid number." };
  }

  if (amount <= 0) {
    return { error: "Amount must be greater than zero." };
  }

  return {
    payload: {
      title,
      category,
      amount: Number(amount.toFixed(2)),
      frequency,
      start_date: startDate,
      end_date: endDate,
      notes,
      is_active: isActive,
    },
  };
}

function getGreetingForHour(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 17) {
    return "Good afternoon";
  }
  return "Good evening";
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function diffDays(start, end) {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  return Math.round((endDate - startDate) / 86400000);
}

function getDailyTotals(expenses) {
  return expenses.reduce((acc, expense) => {
    const key = expense.expense_date;
    acc[key] = (acc[key] || 0) + Number(expense.amount || 0);
    return acc;
  }, {});
}

function buildWeeklyComparison(expenses) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentStart = addDays(today, -6);
  const previousStart = addDays(today, -13);
  const previousEnd = addDays(today, -7);

  let currentTotal = 0;
  let previousTotal = 0;

  expenses.forEach((expense) => {
    const expenseDate = new Date(`${expense.expense_date}T00:00:00`);
    if (expenseDate >= currentStart && expenseDate <= today) {
      currentTotal += Number(expense.amount || 0);
    } else if (expenseDate >= previousStart && expenseDate <= previousEnd) {
      previousTotal += Number(expense.amount || 0);
    }
  });

  return { currentTotal, previousTotal };
}

function buildTodayStats(dailyTotals) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = formatDateKey(today);
  const yesterdayKey = formatDateKey(addDays(today, -1));
  const todaySpend = Number(dailyTotals[todayKey] || 0);
  const yesterdaySpend = Number(dailyTotals[yesterdayKey] || 0);
  const delta = todaySpend - yesterdaySpend;
  const deltaPct = yesterdaySpend > 0 ? Math.round((delta / yesterdaySpend) * 100) : null;

  return {
    todaySpend,
    yesterdaySpend,
    delta,
    deltaPct,
    hasLoggedToday: todaySpend > 0,
  };
}

function buildWeeklySummary(dailyTotals) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(today, -index);
    const key = formatDateKey(day);
    return {
      key,
      label: day.toLocaleDateString("en-US", { weekday: "short" }),
      total: Number(dailyTotals[key] || 0),
    };
  }).reverse();

  const highestDay = rows.reduce((best, row) => (row.total > best.total ? row : best), rows[0] || { label: "-", total: 0 });
  const nonZeroRows = rows.filter((row) => row.total > 0);
  const lowestDay = nonZeroRows.reduce((best, row) => (row.total < best.total ? row : best), nonZeroRows[0] || { label: "-", total: 0 });

  return {
    total: rows.reduce((sum, row) => sum + row.total, 0),
    highestDay,
    lowestDay,
    rows,
  };
}

function buildVelocity(monthlySpend, monthlyBudget) {
  const today = new Date();
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dailyRate = dayOfMonth ? monthlySpend / dayOfMonth : 0;
  const projectedTotal = dailyRate * daysInMonth;
  const remainingBudget = monthlyBudget ? monthlyBudget - monthlySpend : 0;
  const runwayDays = dailyRate > 0 && monthlyBudget > 0 && remainingBudget > 0
    ? Math.floor(remainingBudget / dailyRate)
    : null;

  return {
    dailyRate,
    projectedTotal,
    runwayDays,
    daysInMonth,
    dayOfMonth,
  };
}

function buildEntryProgress(totalCount, target = 5) {
  return {
    totalCount,
    target,
    complete: totalCount >= target,
    remaining: Math.max(target - totalCount, 0),
    percent: Math.min(100, Math.round((Math.min(totalCount, target) / target) * 100)),
  };
}

function buildCategoryTrends(expenses) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentStart = addDays(today, -6);
  const previousStart = addDays(today, -13);
  const previousEnd = addDays(today, -7);
  const buckets = {};

  expenses.forEach((expense) => {
    const category = expense.category;
    const amount = Number(expense.amount || 0);
    const expenseDate = new Date(`${expense.expense_date}T00:00:00`);

    buckets[category] = buckets[category] || { category, current: 0, previous: 0 };

    if (expenseDate >= currentStart && expenseDate <= today) {
      buckets[category].current += amount;
    } else if (expenseDate >= previousStart && expenseDate <= previousEnd) {
      buckets[category].previous += amount;
    }
  });

  return Object.values(buckets)
    .map((row) => {
      const delta = row.current - row.previous;
      const pct = row.previous > 0 ? Math.round((delta / row.previous) * 100) : null;
      return {
        ...row,
        delta,
        pct,
        direction: delta >= 0 ? "up" : "down",
      };
    })
    .filter((row) => row.current > 0 || row.previous > 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

function buildWeeklyChartRows(recentWeeks) {
  return recentWeeks
    .filter((row) => row.week_key && row.week_start)
    .reverse()
    .map((row) => {
      const weekStart = new Date(`${row.week_start}T00:00:00`);
      return {
        label: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        total: Number(row.total || 0),
      };
    });
}

function buildLinePath(rows, width, height) {
  if (!rows.length) {
    return "";
  }

  const maxValue = Math.max(...rows.map((row) => row.total), 1);
  const stepX = rows.length > 1 ? width / (rows.length - 1) : width / 2;

  return rows
    .map((row, index) => {
      const x = rows.length > 1 ? index * stepX : width / 2;
      const y = height - (row.total / maxValue) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildLinePoints(rows, width, height) {
  if (!rows.length) {
    return [];
  }

  const maxValue = Math.max(...rows.map((row) => row.total), 1);
  const stepX = rows.length > 1 ? width / (rows.length - 1) : width / 2;

  return rows.map((row, index) => {
    const x = rows.length > 1 ? index * stepX : width / 2;
    const y = height - (row.total / maxValue) * height;
    return { ...row, x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
  });
}

function buildPieChart(categoryRows) {
  const palette = ["#1a472a", "#c17f24", "#3f6d73", "#9b5d47", "#7d6c9c"];
  let currentAngle = 0;

  const segments = categoryRows.map((row, index) => {
    const start = currentAngle;
    const end = start + row.percentage;
    currentAngle = end;
    return {
      ...row,
      color: palette[index % palette.length],
      start,
      end,
    };
  });

  const gradient = segments.length
    ? `conic-gradient(${segments.map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`).join(", ")})`
    : "";

  return { segments, gradient };
}

function buildBudgetAlert(monthlyBudget, monthlySpend) {
  if (!monthlyBudget) {
    return null;
  }

  const usage = monthlyBudget ? (monthlySpend / monthlyBudget) * 100 : 0;
  const roundedUsage = Math.round(usage);

  if (usage >= 100) {
    return {
      tier: "danger",
      label: "Budget exceeded",
      message: `You've crossed your monthly budget by ₹${Math.abs(monthlyBudget - monthlySpend).toFixed(2)}.`,
    };
  }

  if (usage >= 80) {
    return {
      tier: "warning",
      label: "Approaching budget limit",
      message: `${roundedUsage}% of your budget is already used. Keep the next few spends tight.`,
    };
  }

  if (usage >= 50) {
    return {
      tier: "watch",
      label: "Budget checkpoint",
      message: `You have used ${roundedUsage}% of your budget so far this month.`,
    };
  }

  return {
    tier: "safe",
    label: "Budget on track",
    message: `Only ${roundedUsage}% of your monthly budget is used right now.`,
  };
}

function buildHealthBreakdown(monthlyBudget, monthlySpend, weeklyComparison, velocity) {
  const budgetUsage = monthlyBudget > 0 ? (monthlySpend / monthlyBudget) * 100 : 0;
  const budgetControl = monthlyBudget > 0
    ? Math.max(0, Math.min(100, Math.round(100 - Math.max(budgetUsage - 55, 0) * 1.4)))
    : 72;
  const consistency = weeklyComparison.previousTotal > 0
    ? Math.max(0, Math.min(100, Math.round(100 - Math.abs(((weeklyComparison.currentTotal - weeklyComparison.previousTotal) / weeklyComparison.previousTotal) * 100))))
    : 74;
  const savingsRate = monthlyBudget > 0
    ? Math.max(0, Math.min(100, Math.round(((Math.max(monthlyBudget - velocity.projectedTotal, 0)) / monthlyBudget) * 100)))
    : 60;
  const score = Math.round((budgetControl + consistency + savingsRate) / 3);

  return {
    score,
    items: [
      { label: "Budget control", value: budgetControl },
      { label: "Spending consistency", value: consistency },
      { label: "Savings rate", value: savingsRate },
    ],
  };
}

function buildAdvisorMessages({ monthlyBudget, velocity, categoryTrends, weeklySummary, todayStats }) {
  const messages = [];

  if (monthlyBudget > 0 && velocity.projectedTotal > monthlyBudget) {
    messages.push(`Reduce discretionary spending by ₹${Math.ceil((velocity.projectedTotal - monthlyBudget) / 4)} this week to get back on budget pace.`);
  } else if (monthlyBudget > 0) {
    messages.push(`You're pacing below budget. Protect at least ₹${Math.max(monthlyBudget - velocity.projectedTotal, 0).toFixed(0)} as potential savings this month.`);
  }

  if (categoryTrends[0] && categoryTrends[0].delta > 0) {
    messages.push(`${categoryTrends[0].category} is your fastest-rising category this week. Review the last few entries there first.`);
  }

  if (weeklySummary.highestDay && weeklySummary.highestDay.total > 0) {
    messages.push(`${weeklySummary.highestDay.label} was your highest spend day this week at ₹${weeklySummary.highestDay.total.toFixed(0)}.`);
  }

  if (!todayStats.hasLoggedToday) {
    messages.push("You haven't logged anything today. Add today's spending to keep the forecasts reliable.");
  }

  return messages.slice(0, 3);
}

function buildInsightCards({ monthlyBudget, monthlySpend, weeklyComparison, categoryRows, healthScore, velocity, todayStats }) {
  const cards = [];

  if (weeklyComparison.previousTotal > 0) {
    const change = ((weeklyComparison.currentTotal - weeklyComparison.previousTotal) / weeklyComparison.previousTotal) * 100;
    const direction = change >= 0 ? "more" : "less";
    cards.push({
      label: "Weekly movement",
      value: `${Math.abs(Math.round(change))}% ${direction}`,
      detail: `Compared with the previous 7 days, you spent ₹${Math.abs(weeklyComparison.currentTotal - weeklyComparison.previousTotal).toFixed(2)} ${direction === "more" ? "more" : "less"}.`,
    });
  } else {
    cards.push({
      label: "Weekly movement",
      value: "Building baseline",
      detail: "Add a few more days of expenses and Spendly will compare your spending pace week to week.",
    });
  }

  cards.push({
    label: "Today's spending",
    value: `₹${todayStats.todaySpend.toFixed(0)}`,
    detail: todayStats.deltaPct === null
      ? "Spendly will compare today against yesterday once you build a short daily history."
      : `${todayStats.delta >= 0 ? "Up" : "Down"} ${Math.abs(todayStats.deltaPct)}% compared with yesterday.`,
  });

  cards.push({
    label: "Top category",
    value: categoryRows[0] ? categoryRows[0].category : "No category yet",
    detail: categoryRows[0]
      ? `${categoryRows[0].percentage}% of your filtered spending is going to ${categoryRows[0].category}.`
      : "Your strongest category pattern appears once you log a few expenses.",
  });

  if (monthlyBudget > 0) {
    const projectedDelta = velocity.projectedTotal - monthlyBudget;

    cards.push({
      label: "Budget forecast",
      value: projectedDelta > 0 ? `+₹${projectedDelta.toFixed(0)}` : `₹${Math.abs(projectedDelta).toFixed(0)} spare`,
      detail: projectedDelta > 0
        ? `At this pace, you're likely to exceed your budget by ₹${projectedDelta.toFixed(2)} this month.`
        : `At this pace, you're likely to stay under budget by ₹${Math.abs(projectedDelta).toFixed(2)} this month.`,
    });
  } else {
    cards.push({
      label: "Budget forecast",
      value: "Set a budget",
      detail: "Once you set a monthly budget, Spendly will warn you before you overshoot it.",
    });
  }

  cards.push({
    label: "Financial health score",
    value: `${healthScore}/100`,
    detail: healthScore >= 75
      ? "Your spending pattern looks steady right now."
      : "A tighter budget pace or more balanced category mix can improve this score.",
  });

  return cards;
}

function buildDashboardViewModel(req) {
  const filters = sanitizeFilters(req.query);
  const expenses = getExpensesForUser(req.user.id, filters);
  const allExpenses = getExpensesForUser(req.user.id);
  const { totals, categories, monthlyTotal, recentMonths, recentWeeks } = getExpenseSummary(req.user.id, filters);
  const budget = getBudgetForUser(req.user.id);

  const totalAmount = Number(totals.total_amount || 0);
  const averageAmount = Number(totals.average_amount || 0);
  const maxAmount = Number(totals.max_amount || 0);
  const monthlySpend = Number(monthlyTotal.monthly_total || 0);
  const monthlyBudget = budget ? Number(budget.monthly_budget || 0) : 0;
  const remainingBudget = monthlyBudget ? monthlyBudget - monthlySpend : 0;
  const budgetUsedPct = monthlyBudget ? Math.round((monthlySpend / monthlyBudget) * 100) : 0;

  const categoryRows = categories.map((row) => {
    const total = Number(row.total || 0);
    const percentage = totalAmount ? Math.round((total / totalAmount) * 100) : 0;
    return { category: row.category, total, percentage };
  });

  const trendRows = recentMonths
    .filter((row) => row.month_key)
    .reverse()
    .map((row) => ({
      label: new Date(`${row.month_key}-01T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }),
      total: Number(row.total || 0),
    }));

  const dailyTotals = getDailyTotals(allExpenses);
  const weeklyComparison = buildWeeklyComparison(allExpenses);
  const weeklyChartRows = buildWeeklyChartRows(recentWeeks);
  const todayStats = buildTodayStats(dailyTotals);
  const weeklySummary = buildWeeklySummary(dailyTotals);
  const velocity = buildVelocity(monthlySpend, monthlyBudget);
  const budgetAlert = buildBudgetAlert(monthlyBudget, monthlySpend);
  const entryProgress = buildEntryProgress(Number(totals.total_count || 0));
  const categoryTrends = buildCategoryTrends(allExpenses);
  const healthBreakdown = buildHealthBreakdown(monthlyBudget, monthlySpend, weeklyComparison, velocity);
  const healthScore = healthBreakdown.score;
  const pieChart = buildPieChart(categoryRows);
  const lineChart = {
    width: 320,
    height: 120,
    path: buildLinePath(trendRows, 320, 120),
    points: buildLinePoints(trendRows, 320, 120),
  };
  const weeklyChartMax = Math.max(...weeklyChartRows.map((row) => row.total), 1);
  const insights = buildInsightCards({
    monthlyBudget,
    monthlySpend,
    weeklyComparison,
    categoryRows,
    healthScore,
    velocity,
    todayStats,
  });
  const advisorMessages = buildAdvisorMessages({
    monthlyBudget,
    velocity,
    categoryTrends,
    weeklySummary,
    todayStats,
  });
  const remainingToSave = Math.max(monthlyBudget - monthlySpend, 0);
  const savingsGoalTarget = monthlyBudget > 0 ? Math.max(Math.round(monthlyBudget * 0.25), 1000) : 5000;
  const savingsGoalSaved = Math.min(remainingToSave, savingsGoalTarget);
  const savingsGoalPct = Math.min(100, Math.round((savingsGoalSaved / savingsGoalTarget) * 100));
  const lastLoggedDate = totals.latest_date || "";
  const daysSinceLastLogged = lastLoggedDate ? diffDays(lastLoggedDate, formatDateKey(new Date())) : null;
  const timelineMessage = !lastLoggedDate
    ? "Add your first expense to start the activity timeline."
    : todayStats.hasLoggedToday
      ? "You've logged spending today. Your dashboard is fully up to date."
      : `Last expense added ${daysSinceLastLogged} day${daysSinceLastLogged === 1 ? "" : "s"} ago.`;
  const riskAlerts = [];

  if (categoryTrends[0] && categoryTrends[0].delta > 0) {
    riskAlerts.push(`Spending spike detected in ${categoryTrends[0].category}. You're up ₹${categoryTrends[0].delta.toFixed(0)} over the previous week.`);
  }
  if (monthlyBudget > 0 && velocity.projectedTotal > monthlyBudget) {
    riskAlerts.push(`At your current pace, you'll exceed budget by ₹${(velocity.projectedTotal - monthlyBudget).toFixed(0)} this month.`);
  }
  if (velocity.runwayDays !== null && velocity.runwayDays <= 5) {
    riskAlerts.push(`You may hit your budget limit in about ${Math.max(velocity.runwayDays, 0)} day${velocity.runwayDays === 1 ? "" : "s"} if this pace continues.`);
  }
  if (!todayStats.hasLoggedToday) {
    riskAlerts.push("You haven't logged anything today, so today's forecast may be understated.");
  }

  return {
    filters,
    expenses,
    summary: totals,
    totalAmount,
    averageAmount,
    maxAmount,
    monthlySpend,
    monthlyBudget,
    remainingBudget,
    budgetUsedPct,
    categoryRows,
    trendRows,
    allExpensesCount: allExpenses.length,
    weeklyChartRows,
    weeklyChartMax,
    weeklyComparison,
    todayStats,
    weeklySummary,
    velocity,
    budgetAlert,
    riskAlerts,
    healthScore,
    healthBreakdown,
    greeting: getGreetingForHour(),
    pieChart,
    lineChart,
    insights,
    entryProgress,
    categoryTrends,
    advisorMessages,
    quickAddCategories: ["Food", "Travel", "Bills"],
    savingsGoal: {
      target: savingsGoalTarget,
      saved: savingsGoalSaved,
      percent: savingsGoalPct,
    },
    timelineMessage,
    hasActiveFilters: Boolean(
      filters.q
      || filters.categories.length
      || filters.startDate
      || filters.endDate
      || filters.minAmount !== ""
      || filters.maxAmount !== ""
    ),
  };
}

function buildQuickDateFilters() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = formatDateKey(today);
  const weekStart = formatDateKey(addDays(today, -6));
  const monthStart = `${todayKey.slice(0, 8)}01`;

  return [
    { label: "Today", href: `/dashboard?start_date=${todayKey}&end_date=${todayKey}` },
    { label: "This week", href: `/dashboard?start_date=${weekStart}&end_date=${todayKey}` },
    { label: "This month", href: `/dashboard?start_date=${monthStart}&end_date=${todayKey}` },
  ];
}

function buildNavigationViewModel(user) {
  const expenses = getExpensesForUser(user.id);
  const { monthlyTotal } = getExpenseSummary(user.id);
  const budget = getBudgetForUser(user.id);
  const monthlySpend = Number(monthlyTotal.monthly_total || 0);
  const monthlyBudget = budget ? Number(budget.monthly_budget || 0) : 0;
  const dailyTotals = getDailyTotals(expenses);
  const todayStats = buildTodayStats(dailyTotals);
  const weeklyComparison = buildWeeklyComparison(expenses);
  const velocity = buildVelocity(monthlySpend, monthlyBudget);
  const categories = {};

  expenses.forEach((expense) => {
    categories[expense.category] = (categories[expense.category] || 0) + Number(expense.amount || 0);
  });

  const categoryRows = Object.entries(categories)
    .map(([category, total]) => ({ category, total, percentage: 0 }))
    .sort((a, b) => b.total - a.total);
  const healthBreakdown = buildHealthBreakdown(monthlyBudget, monthlySpend, weeklyComparison, velocity);
  const topTrend = buildCategoryTrends(expenses)[0];
  const alerts = [];

  if (monthlyBudget > 0) {
    const usage = Math.round((monthlySpend / monthlyBudget) * 100);
    if (usage >= 80) {
      alerts.push(`⚠️ ${usage}% budget used`);
    }
  }

  if (topTrend && topTrend.delta > 0) {
    alerts.push(`📊 ${topTrend.category} spending spike detected`);
  }

  if (!todayStats.hasLoggedToday) {
    alerts.push("🕒 You haven't logged anything today");
  }

  return {
    healthScore: healthBreakdown.score,
    alerts: alerts.slice(0, 3),
    quickAddCategories: ["Food", "Travel", "Bills"],
    quickDateFilters: buildQuickDateFilters(),
    quickLinks: {
      dashboard: "/dashboard",
      expenses: "/dashboard#expenses",
      reports: "/dashboard#reports",
      budget: "/dashboard#budget",
      insights: "/dashboard#insights",
      export: "/expenses/export",
    },
  };
}

function render(res, view, options = {}) {
  res.render(view, {
    title: "Spendly",
    ...options,
  });
}

app.use((req, res, next) => {
  const session = getSession(req, res);
  req.sessionId = session.id;
  req.session = session.data;
  req.user = req.session.userId ? getUserById(req.session.userId) : null;
  res.locals.currentUser = req.user;
  res.locals.path = req.path;
  res.locals.query = req.query || {};
  res.locals.todayKey = formatDateKey(new Date());
  res.locals.categories = CATEGORIES;
  res.locals.navMeta = req.user ? buildNavigationViewModel(req.user) : null;
  res.locals.flashes = req.session.flashes || [];
  req.session.flashes = [];
  next();
});

function requireAuth(req, res, next) {
  if (!req.user) {
    addFlash(req, "error", "Please sign in to continue.");
    return res.redirect("/login");
  }
  next();
}

app.get("/", (req, res) => {
  if (req.user) {
    return res.redirect("/dashboard");
  }
  return render(res, "landing", { title: "Spendly - Track Every Rupee" });
});

app.get("/dashboard", requireAuth, (req, res) => {
  return render(res, "dashboard", {
    title: "Dashboard - Spendly",
    ...buildDashboardViewModel(req),
  });
});

app.post("/budget", requireAuth, (req, res) => {
  const monthlyBudget = Number.parseFloat(String(req.body.monthly_budget || "").trim());
  if (!Number.isFinite(monthlyBudget)) {
    addFlash(req, "error", "Monthly budget must be a valid number.");
    return res.redirect("/dashboard");
  }

  if (monthlyBudget < 0) {
    addFlash(req, "error", "Monthly budget cannot be negative.");
    return res.redirect("/dashboard");
  }

  upsertBudget(req.user.id, Number(monthlyBudget.toFixed(2)));
  addFlash(req, "success", "Monthly budget updated.");
  return res.redirect("/dashboard");
});

app.get("/expenses/export", requireAuth, (req, res) => {
  const filters = sanitizeFilters(req.query);
  const expenses = getExpensesForUser(req.user.id, filters);
  const rows = [
    ["Title", "Category", "Amount", "Date", "Notes"],
    ...expenses.map((expense) => [
      expense.title,
      expense.category,
      Number(expense.amount).toFixed(2),
      expense.expense_date,
      expense.notes || "",
    ]),
  ];

  const csvText = rows
    .map((row) =>
      row
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="spendly-expenses.csv"');
  return res.send(csvText);
});

app.route("/register")
  .get((req, res) => {
    if (req.user) {
      return res.redirect("/dashboard");
    }
    return render(res, "register", { title: "Create Account - Spendly" });
  })
  .post((req, res) => {
    if (req.user) {
      return res.redirect("/dashboard");
    }

    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const confirmPassword = String(req.body.confirm_password || "");

    if (!name || !email || !password || !confirmPassword) {
      addFlash(req, "error", "All fields are required.");
      return res.redirect("/register");
    }

    if (!email.includes("@")) {
      addFlash(req, "error", "Please enter a valid email address.");
      return res.redirect("/register");
    }

    if (password.length < 8) {
      addFlash(req, "error", "Password must be at least 8 characters.");
      return res.redirect("/register");
    }

    if (password !== confirmPassword) {
      addFlash(req, "error", "Passwords do not match.");
      return res.redirect("/register");
    }

    if (getUserByEmail(email)) {
      addFlash(req, "error", "Email already registered.");
      return res.redirect("/register");
    }

    const userId = createUser(name, email, hashPassword(password));
    req.session.userId = Number(userId);
    addFlash(req, "success", "Account created successfully.");
    return res.redirect("/dashboard");
  });

app.route("/login")
  .get((req, res) => {
    if (req.user) {
      return res.redirect("/dashboard");
    }
    return render(res, "login", { title: "Sign In - Spendly" });
  })
  .post((req, res) => {
    if (req.user) {
      return res.redirect("/dashboard");
    }

    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = getUserByEmail(email);

    if (!user || !verifyPassword(user.password_hash, password)) {
      addFlash(req, "error", "Invalid email or password.");
      return res.redirect("/login");
    }

    req.session.userId = user.id;
    addFlash(req, "success", "Welcome back!");
    return res.redirect("/dashboard");
  });

app.get("/logout", (req, res) => {
  req.session.userId = null;
  addFlash(req, "success", "You have been logged out.");
  return res.redirect("/");
});

app.get("/terms", (req, res) => render(res, "terms", { title: "Terms and Conditions - Spendly" }));
app.get("/privacy", (req, res) => render(res, "privacy", { title: "Privacy Policy - Spendly" }));

app.get("/profile", requireAuth, (req, res) => {
  const { totals, monthlyTotal } = getExpenseSummary(req.user.id);
  const budget = getBudgetForUser(req.user.id);
  return render(res, "profile", {
    title: "Profile - Spendly",
    summary: totals,
    monthlyBudget: budget ? Number(budget.monthly_budget || 0) : 0,
    monthlySpend: Number(monthlyTotal.monthly_total || 0),
  });
});

app.get("/analytics", requireAuth, (req, res) => {
  const spendingTrends = getSpendingTrends(req.user.id);
  const categoryBreakdown = getCategoryBreakdown(req.user.id);
  const dailyPattern = getDailySpendingPattern(req.user.id);
  const monthlyComparison = getMonthlyComparison(req.user.id);
  
  return render(res, "analytics", {
    title: "Analytics - Spendly",
    spendingTrends,
    categoryBreakdown,
    dailyPattern,
    monthlyComparison,
  });
});

app.get("/recurring", requireAuth, (req, res) => {
  const recurringExpenses = getRecurringExpensesForUser(req.user.id);
  return render(res, "recurring-expenses", {
    title: "Recurring Expenses - Spendly",
    recurringExpenses,
  });
});

app.route("/recurring/add")
  .get(requireAuth, (req, res) => {
    return render(res, "recurring-form", {
      title: "Add Recurring Expense - Spendly",
      formMode: "add",
      recurringExpense: {
        title: "",
        category: "",
        amount: "",
        frequency: "monthly",
        start_date: new Date().toISOString().split('T')[0],
        end_date: "",
        notes: "",
        is_active: 1,
      },
    });
  })
  .post(requireAuth, (req, res) => {
    const { error, payload } = parseRecurringForm(req.body);
    if (error) {
      addFlash(req, "error", error);
      return render(res, "recurring-form", {
        title: "Add Recurring Expense - Spendly",
        formMode: "add",
        recurringExpense: payload,
      });
    }

    createRecurringExpense(
      req.user.id,
      payload.title,
      payload.category,
      payload.amount,
      payload.frequency,
      payload.start_date,
      payload.end_date || null,
      payload.notes
    );

    addFlash(req, "success", "Recurring expense created successfully!");
    return res.redirect("/recurring");
  });

app.route("/recurring/:id/edit")
  .get(requireAuth, (req, res) => {
    const recurringExpense = getRecurringExpenseById(Number(req.params.id), req.user.id);
    if (!recurringExpense) {
      addFlash(req, "error", "Recurring expense not found.");
      return res.redirect("/recurring");
    }

    return render(res, "recurring-form", {
      title: "Edit Recurring Expense - Spendly",
      formMode: "edit",
      recurringExpense: {
        ...recurringExpense,
        is_active: Number(recurringExpense.is_active),
      },
    });
  })
  .post(requireAuth, (req, res) => {
    const { error, payload } = parseRecurringForm(req.body);
    if (error) {
      addFlash(req, "error", error);
      return render(res, "recurring-form", {
        title: "Edit Recurring Expense - Spendly",
        formMode: "edit",
        recurringExpense: payload,
      });
    }

    const updated = updateRecurringExpense(
      Number(req.params.id),
      req.user.id,
      payload.title,
      payload.category,
      payload.amount,
      payload.frequency,
      payload.start_date,
      payload.end_date || null,
      payload.notes,
      payload.is_active
    );

    if (updated.changes === 0) {
      addFlash(req, "error", "Recurring expense not found or not updated.");
      return res.redirect("/recurring");
    }

    addFlash(req, "success", "Recurring expense updated successfully!");
    return res.redirect("/recurring");
  });

app.post("/recurring/:id/delete", requireAuth, (req, res) => {
  const deleted = deleteRecurringExpense(Number(req.params.id), req.user.id);
  if (deleted.changes === 0) {
    addFlash(req, "error", "Recurring expense not found.");
  } else {
    addFlash(req, "success", "Recurring expense deleted successfully!");
  }
  return res.redirect("/recurring");
});

app.post("/recurring/generate", requireAuth, (req, res) => {
  const generatedExpenses = generateRecurringExpenses();
  if (generatedExpenses.length > 0) {
    addFlash(req, "success", `Generated ${generatedExpenses.length} recurring expense(s) successfully!`);
  } else {
    addFlash(req, "info", "No recurring expenses to generate at this time.");
  }
  return res.redirect("/recurring");
});

app.route("/expenses/add")
  .get(requireAuth, (req, res) => {
    const prefillCategory = CATEGORIES.includes(String(req.query.category || "").trim())
      ? String(req.query.category || "").trim()
      : "";
    return render(res, "expense-form", {
      title: "Add Expense - Spendly",
      formMode: "add",
      expense: {
        category: prefillCategory,
        expense_date: formatDateKey(new Date()),
      },
    });
  })
  .post(requireAuth, (req, res) => {
    const { error, payload } = parseExpenseForm(req.body);
    if (error) {
      addFlash(req, "error", error);
      return render(res, "expense-form", {
        title: "Add Expense - Spendly",
        formMode: "add",
        expense: req.body,
      });
    }

    createExpense(
      req.user.id,
      payload.title,
      payload.category,
      payload.amount,
      payload.expenseDate,
      payload.notes
    );
    addFlash(req, "success", "Expense added successfully.");
    return res.redirect("/dashboard");
  });

app.post("/expenses/quick-add", requireAuth, (req, res) => {
  const { error, payload } = parseQuickAdd(req.body);
  if (error) {
    addFlash(req, "error", error);
    return res.redirect(req.get("referer") || "/dashboard");
  }

  createExpense(
    req.user.id,
    payload.title,
    payload.category,
    payload.amount,
    payload.expenseDate,
    payload.notes
  );
  addFlash(req, "success", `Quick added ₹${payload.amount.toFixed(2)} to ${payload.category}.`);
  return res.redirect("/dashboard");
});

app.route("/expenses/:id/edit")
  .get(requireAuth, (req, res) => {
    const expense = getExpenseById(Number(req.params.id), req.user.id);
    if (!expense) {
      return res.status(404).send("Expense not found");
    }

    return render(res, "expense-form", {
      title: "Edit Expense - Spendly",
      formMode: "edit",
      expense,
      expenseId: expense.id,
    });
  })
  .post(requireAuth, (req, res) => {
    const expenseId = Number(req.params.id);
    const existing = getExpenseById(expenseId, req.user.id);
    if (!existing) {
      return res.status(404).send("Expense not found");
    }

    const { error, payload } = parseExpenseForm(req.body);
    if (error) {
      addFlash(req, "error", error);
      return render(res, "expense-form", {
        title: "Edit Expense - Spendly",
        formMode: "edit",
        expense: req.body,
        expenseId,
      });
    }

    updateExpense(
      expenseId,
      req.user.id,
      payload.title,
      payload.category,
      payload.amount,
      payload.expenseDate,
      payload.notes
    );
    addFlash(req, "success", "Expense updated successfully.");
    return res.redirect("/dashboard");
  });

app.route("/expenses/:id/delete")
  .get(requireAuth, (req, res) => {
    const expense = getExpenseById(Number(req.params.id), req.user.id);
    if (!expense) {
      return res.status(404).send("Expense not found");
    }

    return render(res, "delete-expense", {
      title: "Delete Expense - Spendly",
      expense,
    });
  })
  .post(requireAuth, (req, res) => {
    const expense = getExpenseById(Number(req.params.id), req.user.id);
    if (!expense) {
      return res.status(404).send("Expense not found");
    }

    deleteExpense(expense.id, req.user.id);
    addFlash(req, "success", "Expense deleted.");
    return res.redirect("/dashboard");
  });

app.listen(PORT, () => {
  console.log(`Spendly running on http://127.0.0.1:${PORT}`);
});
