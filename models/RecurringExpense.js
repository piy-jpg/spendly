const { randomUUID } = require("crypto");

class RecurringExpense {
  constructor(recurringData = {}) {
    this._id = recurringData._id || randomUUID();
    this.teamId = recurringData.teamId || '';
    this.title = recurringData.title || '';
    this.amount = recurringData.amount || 0;
    this.category = recurringData.category || 'Other';
    this.frequency = recurringData.frequency || 'monthly';
    this.startDate = recurringData.startDate || new Date().toISOString().split('T')[0];
    this.endDate = recurringData.endDate || null;
    this.nextDate = recurringData.nextDate || new Date().toISOString().split('T')[0];
    this.isActive = recurringData.isActive !== false;
    this.description = recurringData.description || '';
    this.createdBy = recurringData.createdBy || '';
    this.createdAt = recurringData.createdAt || new Date().toISOString();
    this.updatedAt = recurringData.updatedAt || new Date().toISOString();
  }

  // Validation
  validate() {
    const errors = [];
    const validCategories = ['Food', 'Travel', 'Bills', 'Shopping', 'Health', 'Entertainment', 'Education', 'Other'];
    const validFrequencies = ['daily', 'weekly', 'monthly', 'yearly'];
    
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
    
    if (!validFrequencies.includes(this.frequency)) {
      errors.push('Frequency must be one of: ' + validFrequencies.join(', '));
    }
    
    if (!this.startDate || !this.isValidDate(this.startDate)) {
      errors.push('Valid start date is required');
    }
    
    if (this.endDate && !this.isValidDate(this.endDate)) {
      errors.push('Valid end date is required');
    }
    
    if (this.endDate && new Date(this.endDate) <= new Date(this.startDate)) {
      errors.push('End date must be after start date');
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

  // Calculate next occurrence date
  calculateNextDate() {
    if (!this.isActive) return null;
    
    const currentDate = new Date(this.nextDate);
    let nextDate = new Date(currentDate);
    
    switch (this.frequency) {
      case 'daily':
        nextDate.setDate(currentDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(currentDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(currentDate.getMonth() + 1);
        break;
      case 'yearly':
        nextDate.setFullYear(currentDate.getFullYear() + 1);
        break;
    }
    
    // Check if end date is reached
    if (this.endDate && nextDate > new Date(this.endDate)) {
      return null;
    }
    
    return nextDate.toISOString().split('T')[0];
  }

  // Check if expense should be generated today
  shouldGenerateToday() {
    if (!this.isActive) return false;
    
    const today = new Date().toISOString().split('T')[0];
    const nextDate = this.nextDate;
    
    return today >= nextDate;
  }

  // Sanitize recurring expense data for output
  toJSON() {
    return {
      _id: this._id,
      teamId: this.teamId,
      title: this.title,
      amount: this.amount,
      category: this.category,
      frequency: this.frequency,
      startDate: this.startDate,
      endDate: this.endDate,
      nextDate: this.nextDate,
      isActive: this.isActive,
      description: this.description,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Static methods
  static create(recurringData) {
    const recurringExpense = new RecurringExpense(recurringData);
    const validation = recurringExpense.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    return recurringExpense;
  }

  // Get all recurring expenses for a team
  static getForTeam(teamId, activeOnly = true) {
    // This would typically query the database
    // For now, return empty array - will be implemented in database layer
    return [];
  }

  // Generate expense from recurring expense
  static generateExpense(recurringExpense) {
    const Expense = require('./Expense');
    
    return Expense.create({
      teamId: recurringExpense.teamId,
      amount: recurringExpense.amount,
      category: recurringExpense.category,
      title: recurringExpense.title,
      description: `Automatically generated from recurring expense: ${recurringExpense.title}`,
      createdBy: recurringExpense.createdBy,
      date: new Date().toISOString().split('T')[0]
    });
  }

  // Update next dates for all recurring expenses
  static updateNextDates(recurringExpenses) {
    return recurringExpenses.map(expense => {
      const nextDate = expense.calculateNextDate();
      return {
        ...expense,
        nextDate,
        isActive: nextDate !== null
      };
    });
  }
}

module.exports = RecurringExpense;
