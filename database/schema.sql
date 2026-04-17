-- SPENDLY TEAM MANAGEMENT DATABASE SCHEMA
-- Clean Architecture: User → Team → Expenses → Activities → Roles

-- USERS TABLE
CREATE TABLE users (
  _id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'team_lead', 'member')),
  teamId TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teamId) REFERENCES teams(_id) ON DELETE SET NULL
);

-- TEAMS TABLE
CREATE TABLE teams (
  _id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  createdBy TEXT NOT NULL,
  budget REAL DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (createdBy) REFERENCES users(_id) ON DELETE CASCADE
);

-- EXPENSES TABLE
CREATE TABLE expenses (
  _id TEXT PRIMARY KEY,
  teamId TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Food', 'Travel', 'Bills', 'Shopping', 'Health', 'Entertainment', 'Education', 'Other')),
  title TEXT NOT NULL,
  description TEXT,
  createdBy TEXT NOT NULL,
  date DATE NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teamId) REFERENCES teams(_id) ON DELETE CASCADE,
  FOREIGN KEY (createdBy) REFERENCES users(_id) ON DELETE CASCADE
);

-- ACTIVITIES TABLE (FOR RECENT ACTIVITIES UI)
CREATE TABLE activities (
  _id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('expense_added', 'expense_updated', 'expense_deleted', 'member_joined', 'member_left', 'budget_updated', 'recurring_created', 'recurring_generated')),
  message TEXT NOT NULL,
  userId TEXT,
  teamId TEXT NOT NULL,
  metadata TEXT, -- JSON for additional data
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(_id) ON DELETE SET NULL,
  FOREIGN KEY (teamId) REFERENCES teams(_id) ON DELETE CASCADE
);

-- RECURRING EXPENSES TABLE
CREATE TABLE recurring_expenses (
  _id TEXT PRIMARY KEY,
  teamId TEXT NOT NULL,
  title TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Food', 'Travel', 'Bills', 'Shopping', 'Health', 'Entertainment', 'Education', 'Other')),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  startDate DATE NOT NULL,
  endDate DATE,
  nextDate DATE NOT NULL,
  isActive BOOLEAN DEFAULT 1,
  description TEXT,
  createdBy TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teamId) REFERENCES teams(_id) ON DELETE CASCADE,
  FOREIGN KEY (createdBy) REFERENCES users(_id) ON DELETE CASCADE
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_team ON users(teamId);
CREATE INDEX idx_teams_createdBy ON teams(createdBy);
CREATE INDEX idx_expenses_team ON expenses(teamId);
CREATE INDEX idx_expenses_createdBy ON expenses(createdBy);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_activities_team ON activities(teamId);
CREATE INDEX idx_activities_user ON activities(userId);
CREATE INDEX idx_activities_timestamp ON activities(timestamp);
CREATE INDEX idx_recurring_team ON recurring_expenses(teamId);
CREATE INDEX idx_recurring_nextDate ON recurring_expenses(nextDate);
