const Activity = require('../models/Activity');

class ActivityController {
  // Get activities for team
  static async getTeamActivities(req, res) {
    try {
      const { teamId } = req.params;
      const userId = req.session.userId;
      const { limit = 20, type } = req.query;
      
      if (!teamId) {
        return res.status(400).json({ 
          error: 'Team ID is required' 
        });
      }

      // Check if user has permission
      const user = { role: req.session.userRole };
      if (!user.hasPermission('view_analytics')) {
        return res.status(403).json({ 
          error: 'Insufficient permissions to view activities' 
        });
      }

      // Mock activities data (in real app, this would query database)
      const activities = [
        Activity.expenseAdded('exp1', userId, teamId, 'Team Lunch - ₹1,200'),
        Activity.expenseUpdated('exp2', userId, teamId, 'Software License updated'),
        Activity.memberJoined('user3', teamId, 'Carol Davis'),
        Activity.budgetUpdated('user1', teamId, 50000, 55000),
        Activity.recurringCreated('rec1', userId, teamId, 'Office Rent'),
        Activity.recurringGenerated('rec1', teamId, 'Office Rent', 20000)
      ];

      // Apply filters
      let filteredActivities = activities;
      
      if (type) {
        filteredActivities = Activity.getActivitiesByType(activities, type);
      }

      const recentActivities = Activity.getRecentActivities(filteredActivities, limit);

      res.status(200).json({
        activities: recentActivities.map(act => act.toJSON()),
        pagination: {
          limit: parseInt(limit),
          total: filteredActivities.length
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get activities by type
  static async getActivitiesByType(req, res) {
    try {
      const { teamId, type } = req.params;
      const userId = req.session.userId;
      
      if (!teamId || !type) {
        return res.status(400).json({ 
          error: 'Team ID and type are required' 
        });
      }

      // Check if user has permission
      const user = { role: req.session.userRole };
      if (!user.hasPermission('view_analytics')) {
        return res.status(403).json({ 
          error: 'Insufficient permissions to view activities' 
        });
      }

      // Mock activities data
      const activities = [
        Activity.expenseAdded('exp1', userId, teamId, 'Team Lunch - ₹1,200'),
        Activity.expenseUpdated('exp2', userId, teamId, 'Software License updated'),
        Activity.memberJoined('user3', teamId, 'Carol Davis'),
        Activity.budgetUpdated('user1', teamId, 50000, 55000),
        Activity.recurringCreated('rec1', userId, teamId, 'Office Rent'),
        Activity.recurringGenerated('rec1', teamId, 'Office Rent', 20000)
      ];

      const filteredActivities = Activity.getActivitiesByType(activities, type);

      res.status(200).json({
        activities: filteredActivities.map(act => act.toJSON()),
        type,
        total: filteredActivities.length
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Create custom activity
  static async createActivity(req, res) {
    try {
      const { type, message, metadata } = req.body;
      const userId = req.session.userId;
      const teamId = req.session.teamId;
      
      if (!type || !message) {
        return res.status(400).json({ 
          error: 'Type and message are required' 
        });
      }

      // Check if user has permission
      const user = { role: req.session.userRole };
      if (!user.hasPermission('view_analytics')) {
        return res.status(403).json({ 
          error: 'Insufficient permissions to create activities' 
        });
      }

      const activity = Activity.create({
        type,
        message,
        userId,
        teamId,
        metadata: metadata ? JSON.stringify(metadata) : null
      });

      res.status(201).json({
        message: 'Activity created successfully',
        activity: activity.toJSON()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get activity feed with real-time updates
  static async getActivityFeed(req, res) {
    try {
      const { teamId } = req.params;
      const userId = req.session.userId;
      
      if (!teamId) {
        return res.status(400).json({ 
          error: 'Team ID is required' 
        });
      }

      // Check if user has permission
      const user = { role: req.session.userRole };
      if (!user.hasPermission('view_analytics')) {
        return res.status(403).json({ 
          error: 'Insufficient permissions to view activity feed' 
        });
      }

      // Mock activities data with rich metadata
      const activities = [
        Activity.expenseAdded('exp1', userId, teamId, 'Team Lunch at Downtown Restaurant', {
          amount: 1200,
          category: 'Food',
          location: 'Downtown Restaurant',
          participants: ['John Doe', 'Alice Smith', 'Bob Johnson']
        }),
        Activity.expenseUpdated('exp2', userId, teamId, 'Software License renewed for another year', {
          amount: 5000,
          category: 'Software',
          previousAmount: 4500,
          newAmount: 5000
        }),
        Activity.memberJoined('user3', teamId, 'Carol Davis joined the team as Senior Developer', {
          role: 'Developer',
          experience: '5+ years',
          previousCompany: 'Tech Corp'
        }),
        Activity.budgetUpdated('user1', teamId, 50000, 55000, {
          percentage: 10,
          reason: 'Q4 marketing campaign budget increase',
          approvedBy: 'John Doe'
        }),
        Activity.recurringCreated('rec1', userId, teamId, 'Monthly Office Rent setup', {
          amount: 20000,
          frequency: 'monthly',
          startDate: '2026-01-01',
          autoGenerate: true
        }),
        Activity.recurringGenerated('rec1', teamId, 'Office Rent automatically generated', 20000, {
          amount: 20000,
          category: 'Bills',
          frequency: 'monthly',
          nextDate: '2026-05-01'
        })
      ];

      const recentActivities = Activity.getRecentActivities(activities, 50);

      res.status(200).json({
        activities: recentActivities.map(act => act.toJSON()),
        summary: {
          total: activities.length,
          today: activities.filter(act => {
            const actDate = new Date(act.timestamp);
            const today = new Date();
            return actDate.toDateString() === today.toDateString();
          }).length,
          thisWeek: activities.filter(act => {
            const actDate = new Date(act.timestamp);
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return actDate >= weekAgo;
          }).length
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = ActivityController;
