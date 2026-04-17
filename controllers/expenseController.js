const Expense = require('../models/Expense');
const Activity = require('../models/Activity');

class ExpenseController {
  // Add new expense
  static async addExpense(req, res) {
    try {
      const { teamId, amount, category, title, description, date } = req.body;
      const userId = req.session.userId;
      
      // Validate input
      if (!teamId || !amount || !category || !title) {
        return res.status(400).json({ 
          error: 'Team ID, amount, category, and title are required' 
        });
      }

      // Check if user has permission
      const user = { role: req.session.userRole };
      if (!user.hasPermission('add_expenses')) {
        return res.status(403).json({ 
          error: 'Insufficient permissions to add expenses' 
        });
      }

      // Create expense
      const expense = Expense.create({
        teamId,
        amount: parseFloat(amount),
        category,
        title,
        description: description || '',
        createdBy: userId,
        date: date || new Date().toISOString().split('T')[0]
      });

      // Create activity
      Activity.expenseAdded(expense._id, userId, teamId, `${title} - ₹${amount}`);

      res.status(201).json({
        message: 'Expense added successfully',
        expense: expense.toJSON()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get expenses for team
  static async getTeamExpenses(req, res) {
    try {
      const { teamId } = req.params;
      const userId = req.session.userId;
      const { 
        category, 
        startDate, 
        endDate, 
        minAmount, 
        maxAmount,
        page = 1,
        limit = 50 
      } = req.query;
      
      if (!teamId) {
        return res.status(400).json({ 
          error: 'Team ID is required' 
        });
      }

      // Check if user has permission
      const user = { role: req.session.userRole };
      if (!user.hasPermission('view_team_expenses')) {
        return res.status(403).json({ 
          error: 'Insufficient permissions to view expenses' 
        });
      }

      // Mock expenses data (in real app, this would query database)
      const expenses = [
        Expense.create({
          teamId,
          amount: 1200,
          category: 'Food',
          title: 'Team Lunch',
          description: 'Team lunch at Downtown Restaurant',
          createdBy: userId,
          date: new Date().toISOString().split('T')[0]
        }),
        Expense.create({
          teamId,
          amount: 5000,
          category: 'Software',
          title: 'Software License',
          description: 'Annual subscription for development tools',
          createdBy: 'user1',
          date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }),
        Expense.create({
          teamId,
          amount: 3500,
          category: 'Travel',
          title: 'Business Trip',
          description: 'Client meeting travel expenses',
          createdBy: 'user2',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }),
        Expense.create({
          teamId,
          amount: 800,
          category: 'Supplies',
          title: 'Office Supplies',
          description: 'Stationery and printer ink',
          createdBy: userId,
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        })
      ];

      // Apply filters
      let filteredExpenses = expenses;
      
      if (category) {
        filteredExpenses = filteredExpenses.filter(exp => exp.category === category);
      }
      
      if (startDate) {
        filteredExpenses = filteredExpenses.filter(exp => exp.date >= startDate);
      }
      
      if (endDate) {
        filteredExpenses = filteredExpenses.filter(exp => exp.date <= endDate);
      }
      
      if (minAmount) {
        filteredExpenses = filteredExpenses.filter(exp => exp.amount >= parseFloat(minAmount));
      }
      
      if (maxAmount) {
        filteredExpenses = filteredExpenses.filter(exp => exp.amount <= parseFloat(maxAmount));
      }

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const paginatedExpenses = filteredExpenses.slice(startIndex, startIndex + limit);

      res.status(200).json({
        expenses: paginatedExpenses.map(exp => exp.toJSON()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredExpenses.length,
          pages: Math.ceil(filteredExpenses.length / limit)
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Update expense
  static async updateExpense(req, res) {
    try {
      const { expenseId } = req.params;
      const { amount, category, title, description } = req.body;
      const userId = req.session.userId;
      
      if (!expenseId) {
        return res.status(400).json({ 
          error: 'Expense ID is required' 
        });
      }

      // Get existing expense (in real app, this would query database)
      const existingExpense = Expense.create({
        _id: expenseId,
        teamId: 'team123',
        amount: 1200,
        category: 'Food',
        title: 'Team Lunch',
        createdBy: userId,
        date: new Date().toISOString().split('T')[0]
      });

      // Check if user can edit this expense
      if (!existingExpense.canUserEdit(userId, req.session.userRole)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions to edit this expense' 
        });
      }

      // Update expense
      if (amount) existingExpense.amount = parseFloat(amount);
      if (category) existingExpense.category = category;
      if (title) existingExpense.title = title;
      if (description) existingExpense.description = description;

      // Create activity
      Activity.expenseUpdated(expenseId, userId, existingExpense.teamId, `${title} updated`);

      res.status(200).json({
        message: 'Expense updated successfully',
        expense: existingExpense.toJSON()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Delete expense
  static async deleteExpense(req, res) {
    try {
      const { expenseId } = req.params;
      const userId = req.session.userId;
      
      if (!expenseId) {
        return res.status(400).json({ 
          error: 'Expense ID is required' 
        });
      }

      // Get existing expense (in real app, this would query database)
      const existingExpense = Expense.create({
        _id: expenseId,
        teamId: 'team123',
        amount: 1200,
        category: 'Food',
        title: 'Team Lunch',
        createdBy: userId,
        date: new Date().toISOString().split('T')[0]
      });

      // Check if user can delete this expense
      if (!existingExpense.canUserDelete(userId, req.session.userRole)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions to delete this expense' 
        });
      }

      // Create activity
      Activity.expenseDeleted(expenseId, userId, existingExpense.teamId, `${existingExpense.title} deleted`);

      res.status(200).json({
        message: 'Expense deleted successfully'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get expense by ID
  static async getExpenseById(req, res) {
    try {
      const { expenseId } = req.params;
      const userId = req.session.userId;
      
      if (!expenseId) {
        return res.status(400).json({ 
          error: 'Expense ID is required' 
        });
      }

      // Get expense (in real app, this would query database)
      const expense = Expense.create({
        _id: expenseId,
        teamId: 'team123',
        amount: 1200,
        category: 'Food',
        title: 'Team Lunch',
        description: 'Team lunch at Downtown Restaurant',
        createdBy: userId,
        date: new Date().toISOString().split('T')[0]
      });

      res.status(200).json({
        expense: expense.toJSON()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get expense analytics
  static async getExpenseAnalytics(req, res) {
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
          error: 'Insufficient permissions to view analytics' 
        });
      }

      // Mock expenses data
      const expenses = [
        Expense.create({ teamId, amount: 1200, category: 'Food', title: 'Lunch', createdBy: userId, date: new Date().toISOString().split('T')[0] }),
        Expense.create({ teamId, amount: 5000, category: 'Software', title: 'License', createdBy: userId, date: new Date().toISOString().split('T')[0] }),
        Expense.create({ teamId, amount: 3500, category: 'Travel', title: 'Trip', createdBy: userId, date: new Date().toISOString().split('T')[0] }),
        Expense.create({ teamId, amount: 800, category: 'Supplies', title: 'Office', createdBy: userId, date: new Date().toISOString().split('T')[0] })
      ];

      const categoryTotals = Expense.getCategoryTotals(expenses);
      const monthlySpending = Expense.getMonthlySpending(expenses, 2026, 4);
      const recentExpenses = Expense.getRecentExpenses(expenses, 30);

      res.status(200).json({
        analytics: {
          categoryTotals,
          monthlySpending,
          recentExpenses: recentExpenses.length,
          totalExpenses: expenses.reduce((sum, exp) => sum + exp.amount, 0)
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = ExpenseController;
