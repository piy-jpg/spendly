const { randomUUID } = require("crypto");

class Activity {
  constructor(activityData = {}) {
    this._id = activityData._id || randomUUID();
    this.type = activityData.type || '';
    this.message = activityData.message || '';
    this.userId = activityData.userId || null;
    this.teamId = activityData.teamId || '';
    this.metadata = activityData.metadata || null;
    this.timestamp = activityData.timestamp || new Date().toISOString();
  }

  // Validation
  validate() {
    const errors = [];
    const validTypes = [
      'expense_added', 'expense_updated', 'expense_deleted', 
      'member_joined', 'member_left', 'budget_updated', 
      'recurring_created', 'recurring_generated'
    ];
    
    if (!validTypes.includes(this.type)) {
      errors.push('Type must be one of: ' + validTypes.join(', '));
    }
    
    if (!this.message || this.message.trim().length < 2) {
      errors.push('Message must be at least 2 characters');
    }
    
    if (!this.teamId) {
      errors.push('Team ID is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Create different types of activities
  static expenseAdded(expenseId, userId, teamId, message = 'Expense added') {
    return new Activity({
      type: 'expense_added',
      message,
      userId,
      teamId,
      metadata: JSON.stringify({ expenseId })
    });
  }

  static expenseUpdated(expenseId, userId, teamId, message = 'Expense updated') {
    return new Activity({
      type: 'expense_updated',
      message,
      userId,
      teamId,
      metadata: JSON.stringify({ expenseId })
    });
  }

  static expenseDeleted(expenseId, userId, teamId, message = 'Expense deleted') {
    return new Activity({
      type: 'expense_deleted',
      message,
      userId,
      teamId,
      metadata: JSON.stringify({ expenseId })
    });
  }

  static memberJoined(userId, teamId, userName = 'New member') {
    return new Activity({
      type: 'member_joined',
      message: `${userName} joined the team`,
      userId,
      teamId,
      metadata: JSON.stringify({ userName })
    });
  }

  static memberLeft(userId, teamId, userName = 'Member left') {
    return new Activity({
      type: 'member_left',
      message: `${userName} left the team`,
      userId,
      teamId,
      metadata: JSON.stringify({ userName })
    });
  }

  static budgetUpdated(userId, teamId, oldBudget, newBudget) {
    return new Activity({
      type: 'budget_updated',
      message: `Budget updated from ₹${oldBudget} to ₹${newBudget}`,
      userId,
      teamId,
      metadata: JSON.stringify({ oldBudget, newBudget })
    });
  }

  static recurringCreated(recurringId, userId, teamId, title) {
    return new Activity({
      type: 'recurring_created',
      message: `Recurring expense "${title}" created`,
      userId,
      teamId,
      metadata: JSON.stringify({ recurringId, title })
    });
  }

  static recurringGenerated(recurringId, teamId, title, amount) {
    return new Activity({
      type: 'recurring_generated',
      message: `Recurring expense "${title}" generated: ₹${amount}`,
      userId: null, // System generated
      teamId,
      metadata: JSON.stringify({ recurringId, title, amount })
    });
  }

  // Sanitize activity data for output
  toJSON() {
    return {
      _id: this._id,
      type: this.type,
      message: this.message,
      userId: this.userId,
      teamId: this.teamId,
      metadata: this.metadata,
      timestamp: this.timestamp
    };
  }

  // Static methods
  static create(activityData) {
    const activity = new Activity(activityData);
    const validation = activity.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    return activity;
  }

  // Get recent activities for team
  static getRecentActivities(activities, limit = 20) {
    return activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  // Get activities by type
  static getActivitiesByType(activities, type) {
    return activities.filter(activity => activity.type === type);
  }
}

module.exports = Activity;
