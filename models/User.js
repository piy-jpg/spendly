const { randomUUID } = require("crypto");

class User {
  constructor(userData = {}) {
    this._id = userData._id || randomUUID();
    this.name = userData.name || '';
    this.email = userData.email || '';
    this.password = userData.password || '';
    this.role = userData.role || 'member';
    this.teamId = userData.teamId || null;
    this.createdAt = userData.createdAt || new Date().toISOString();
    this.updatedAt = userData.updatedAt || new Date().toISOString();
  }

  // Validation
  validate() {
    const errors = [];
    
    if (!this.name || this.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    }
    
    if (!this.email || !this.isValidEmail(this.email)) {
      errors.push('Valid email is required');
    }
    
    if (!this.password || this.password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }
    
    if (!['admin', 'team_lead', 'member'].includes(this.role)) {
      errors.push('Role must be admin, team_lead, or member');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Role-based permissions
  getPermissions() {
    const permissions = {
      admin: [
        'invite_members',
        'remove_members', 
        'update_team_settings',
        'manage_budget',
        'view_all_expenses',
        'add_expenses',
        'edit_expenses',
        'delete_expenses',
        'view_analytics',
        'manage_recurring'
      ],
      team_lead: [
        'invite_members',
        'manage_budget',
        'view_all_expenses',
        'add_expenses',
        'edit_expenses',
        'delete_expenses',
        'view_analytics',
        'manage_recurring'
      ],
      member: [
        'view_team_expenses',
        'add_expenses',
        'edit_own_expenses',
        'delete_own_expenses',
        'view_analytics'
      ]
    };
    
    return permissions[this.role] || [];
  }

  // Check if user has specific permission
  hasPermission(permission) {
    return this.getPermissions().includes(permission);
  }

  // Sanitize user data for output
  toJSON() {
    return {
      _id: this._id,
      name: this.name,
      email: this.email,
      role: this.role,
      teamId: this.teamId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Static methods
  static create(userData) {
    const user = new User(userData);
    const validation = user.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    return user;
  }

  static hashPassword(password) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  static comparePassword(password, hashedPassword) {
    const crypto = require('crypto');
    const hashedInput = crypto.createHash('sha256').update(password).digest('hex');
    return hashedInput === hashedPassword;
  }
}

module.exports = User;
