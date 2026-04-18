const { randomUUID } = require("crypto");

class Expense {
  constructor(expenseData = {}) {
    this._id = expenseData._id || randomUUID();
    this.teamId = expenseData.teamId || '';
    this.amount = expenseData.amount || 0;
    this.category = expenseData.category || 'Other';
    this.title = expenseData.title || '';
    this.description = expenseData.description || '';
    this.createdBy = expenseData.createdBy || '';
    this.date = expenseData.date || new Date().toISOString().split('T')[0];
    this.createdAt = expenseData.createdAt || new Date().toISOString();
    this.updatedAt = expenseData.updatedAt || new Date().toISOString();
  }

  // Validation
  validate() {
    const errors = [];
    const validCategories = ['Food', 'Travel', 'Bills', 'Shopping', 'Health', 'Entertainment', 'Education', 'Other'];
    
    if (!this.teamId) {
      errors.push('Team ID is required');
    }
    
    if (!this.amount || isNaN(this.amount) || this.amount <= 0) {
      errors.push('Amount must be a positive number');
    }
    
    if (!validCategories.includes(this.category)) {
      errors.push('Category must be one of: ' + validCategories.join(', '));
    }
    
    if (!this.title || this.title.trim().length < 2) {
      errors.push('Title must be at least 2 characters');
    }
    
    if (!this.date || !this.isValidDate(this.date)) {
      errors.push('Valid date is required');
    }
    
    if (!this.createdBy) {
      errors.push('Created by user ID is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  // Check if user can edit this expense
  canUserEdit(userId, userRole) {
    // Admin and Team Lead can edit any expense
    if (['admin', 'team_lead'].includes(userRole)) {
      return true;
    }
    
    // Members can only edit their own expenses
    return this.createdBy === userId;
  }

  // Check if user can delete this expense
  canUserDelete(userId, userRole) {
    // Admin and Team Lead can delete any expense
    if (['admin', 'team_lead'].includes(userRole)) {
      return true;
    }
    
    // Members can only delete their own expenses
    return this.createdBy === userId;
  }

  // Sanitize expense data for output
  toJSON() {
    return {
      _id: this._id,
      teamId: this.teamId,
      amount: this.amount,
      category: this.category,
      title: this.title,
      description: this.description,
      createdBy: this.createdBy,
      date: this.date,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Static methods
  static create(expenseData) {
    const expense = new Expense(expenseData);
    const validation = expense.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    return expense;
  }

  // Calculate category totals for analytics
  static getCategoryTotals(expenses) {
    const totals = {};
    const validCategories = ['Food', 'Travel', 'Bills', 'Shopping', 'Health', 'Entertainment', 'Education', 'Other'];
    
    validCategories.forEach(category => {
      totals[category] = expenses
        .filter(exp => exp.category === category)
        .reduce((sum, exp) => sum + exp.amount, 0);
    });
    
    return totals;
  }

  // Calculate monthly spending
  static getMonthlySpending(expenses, year, month) {
    return expenses
      .filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getFullYear() === year && expDate.getMonth() + 1 === month;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);
  }

  // Get recent expenses (last 7 days)
  static getRecentExpenses(expenses, days = 7) {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return expenses
      .filter(exp => new Date(exp.date) >= cutoffDate)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }
}

module.exports = Expense;
