const User = require('../models/User');
const Team = require('../models/Team');
const Activity = require('../models/Activity');
const Expense = require('../models/Expense');

class TeamController {
  // Create new team
  static async createTeam(req, res) {
    try {
      const { name } = req.body;
      const userId = req.session.userId;
      
      if (!name || name.trim().length < 2) {
        return res.status(400).json({ 
          error: 'Team name must be at least 2 characters' 
        });
      }

      // Check if user has permission
      const user = User.create({ _id: userId, role: 'admin' });
      if (!user.hasPermission('manage_team_settings')) {
        return res.status(403).json({ 
          error: 'Insufficient permissions' 
        });
      }

      const team = Team.create({
        name,
        createdBy: userId
      });

      // Update user with team ID
      user.teamId = team._id;

      // Create activity
      Activity.memberJoined(userId, team._id, user.name);

      res.status(201).json({
        message: 'Team created successfully',
        team: team.toJSON()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get team by ID
  static async getTeam(req, res) {
    try {
      const { teamId } = req.params;
      const userId = req.session.userId;
      
      if (!teamId) {
        return res.status(400).json({ 
          error: 'Team ID is required' 
        });
      }

      // In real app, this would query database
      // For now, return mock team data
      const team = Team.create({
        _id: teamId,
        name: 'Spendly Team',
        createdBy: 'admin123',
        budget: 50000,
        createdAt: new Date().toISOString()
      });

      // Check if user is member of this team
      if (userId && user.teamId !== teamId) {
        return res.status(403).json({ 
          error: 'Access denied' 
        });
      }

      // Get team members (mock data)
      const members = [
        User.create({
          _id: 'user1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'team_lead',
          teamId: teamId
        }),
        User.create({
          _id: 'user2',
          name: 'Alice Smith',
          email: 'alice@example.com',
          role: 'member',
          teamId: teamId
        })
      ];

      res.status(200).json({
        team: team.toJSON(),
        members: members.map(m => m.toJSON())
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Invite member to team
  static async inviteMember(req, res) {
    try {
      const { teamId, email, role = 'member' } = req.body;
      const userId = req.session.userId;
      
      if (!teamId || !email) {
        return res.status(400).json({ 
          error: 'Team ID and email are required' 
        });
      }

      // Check if user has permission
      const user = User.create({ _id: userId, role: 'team_lead' });
      if (!user.hasPermission('invite_members')) {
        return res.status(403).json({ 
          error: 'Insufficient permissions' 
        });
      }

      // In real app, this would send invitation email
      // For now, create mock invited user
      const invitedUser = User.create({
        name: email.split('@')[0],
        email,
        role,
        teamId
      });

      // Create activity
      Activity.memberJoined(invitedUser._id, teamId, invitedUser.name);

      res.status(201).json({
        message: 'Invitation sent successfully',
        user: invitedUser.toJSON()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Update team budget
  static async updateBudget(req, res) {
    try {
      const { teamId, budget } = req.body;
      const userId = req.session.userId;
      
      if (!teamId || !budget || isNaN(budget)) {
        return res.status(400).json({ 
          error: 'Team ID and valid budget are required' 
        });
      }

      // Check if user has permission
      const user = User.create({ _id: userId, role: 'team_lead' });
      if (!user.hasPermission('manage_budget')) {
        return res.status(403).json({ 
          error: 'Insufficient permissions' 
        });
      }

      // Get current team
      const team = Team.create({
        _id: teamId,
        name: 'Spendly Team',
        createdBy: userId,
        budget: 50000
      });

      const oldBudget = team.budget;
      team.budget = parseFloat(budget);

      // Create activity
      Activity.budgetUpdated(userId, teamId, oldBudget, budget);

      res.status(200).json({
        message: 'Budget updated successfully',
        team: team.toJSON()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get team statistics
  static async getTeamStats(req, res) {
    try {
      const { teamId } = req.params;
      const userId = req.session.userId;
      
      if (!teamId) {
        return res.status(400).json({ 
          error: 'Team ID is required' 
        });
      }

      // Check if user is member of this team
      const user = User.create({ _id: userId, teamId });
      if (!user.teamId) {
        return res.status(403).json({ 
          error: 'Access denied' 
        });
      }

      // Get team data
      const team = Team.create({
        _id: teamId,
        name: 'Spendly Team',
        createdBy: 'admin123',
        budget: 50000
      });

      // Mock expenses data
      const expenses = [
        Expense.create({
          teamId,
          amount: 1200,
          category: 'Food',
          title: 'Team Lunch',
          createdBy: userId,
          date: new Date().toISOString().split('T')[0]
        }),
        Expense.create({
          teamId,
          amount: 5000,
          category: 'Software',
          title: 'Software License',
          createdBy: 'user1',
          date: new Date().toISOString().split('T')[0]
        })
      ];

      const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const budgetStatus = team.getBudgetStatus(totalExpenses);
      const healthScore = Team.calculateHealthScore(team, expenses, []);

      res.status(200).json({
        team: team.toJSON(),
        stats: {
          totalExpenses,
          budgetUsage: budgetStatus,
          healthScore,
          memberCount: 4,
          expenseCount: expenses.length
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Remove member from team
  static async removeMember(req, res) {
    try {
      const { teamId, memberId } = req.body;
      const userId = req.session.userId;
      
      if (!teamId || !memberId) {
        return res.status(400).json({ 
          error: 'Team ID and member ID are required' 
        });
      }

      // Check if user has permission
      const user = User.create({ _id: userId, role: 'team_lead' });
      if (!user.hasPermission('remove_members')) {
        return res.status(403).json({ 
          error: 'Insufficient permissions' 
        });
      }

      // Get member to remove
      const member = User.create({ _id: memberId, teamId });
      if (!member.teamId) {
        return res.status(404).json({ 
          error: 'Member not found' 
        });
      }

      // Remove member from team
      member.teamId = null;

      // Create activity
      Activity.memberLeft(memberId, teamId, member.name);

      res.status(200).json({
        message: 'Member removed successfully'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = TeamController;
