const { randomUUID } = require("crypto");

class Team {
  constructor(teamData = {}) {
    this._id = teamData._id || randomUUID();
    this.name = teamData.name || '';
    this.createdBy = teamData.createdBy || null;
    this.budget = teamData.budget || 0;
    this.createdAt = teamData.createdAt || new Date().toISOString();
    this.updatedAt = teamData.updatedAt || new Date().toISOString();
  }

  // Validation
  validate() {
    const errors = [];
    
    if (!this.name || this.name.trim().length < 2) {
      errors.push('Team name must be at least 2 characters');
    }
    
    if (this.budget && (isNaN(this.budget) || this.budget < 0)) {
      errors.push('Budget must be a positive number');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Calculate budget usage percentage
  getBudgetUsagePercentage(totalExpenses) {
    if (this.budget <= 0) return 0;
    return Math.min(100, (totalExpenses / this.budget) * 100);
  }

  // Get budget status
  getBudgetStatus(totalExpenses) {
    const percentage = this.getBudgetUsagePercentage(totalExpenses);
    
    if (percentage >= 100) return { status: 'exceeded', color: 'red', percentage };
    if (percentage >= 80) return { status: 'warning', color: 'yellow', percentage };
    if (percentage >= 60) return { status: 'moderate', color: 'blue', percentage };
    return { status: 'healthy', color: 'green', percentage };
  }

  // Sanitize team data for output
  toJSON() {
    return {
      _id: this._id,
      name: this.name,
      createdBy: this.createdBy,
      budget: this.budget,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Static methods
  static create(teamData) {
    const team = new Team(teamData);
    const validation = team.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    return team;
  }

  // Calculate team health score
  static calculateHealthScore(team, expenses, activities) {
    let score = 100;
    
    // Budget consistency (-20 points if over budget)
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    if (totalExpenses > team.budget) {
      score -= 20;
    }
    
    // Expense regularity (+10 points for regular entries)
    const recentExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return expDate > weekAgo;
    });
    if (recentExpenses.length >= 5) {
      score += 10;
    }
    
    // Team activity (+10 points for active team)
    const recentActivities = activities.filter(act => {
      const actDate = new Date(act.timestamp);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return actDate > weekAgo;
    });
    if (recentActivities.length >= 10) {
      score += 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }
}

module.exports = Team;
