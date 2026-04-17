const express = require('express');
const router = express.Router();

// Import controllers
const AuthController = require('../controllers/authController');
const TeamController = require('../controllers/teamController');
const ExpenseController = require('../controllers/expenseController');
const ActivityController = require('../controllers/activityController');

// Middleware
const { requireAuth, requireRole } = require('../middleware/auth');

// AUTH ROUTES
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
router.post('/auth/logout', AuthController.logout);
router.get('/auth/me', AuthController.getCurrentUser);

// TEAM ROUTES
router.post('/team/create', requireAuth, requireRole(['admin', 'team_lead']), TeamController.createTeam);
router.get('/team/:teamId', requireAuth, TeamController.getTeam);
router.post('/team/:teamId/invite', requireAuth, requireRole(['admin', 'team_lead']), TeamController.inviteMember);
router.put('/team/:teamId/budget', requireAuth, requireRole(['admin', 'team_lead']), TeamController.updateBudget);
router.delete('/team/:teamId/members/:memberId', requireAuth, requireRole(['admin', 'team_lead']), TeamController.removeMember);
router.get('/team/:teamId/stats', requireAuth, TeamController.getTeamStats);

// EXPENSE ROUTES
router.post('/expenses/add', requireAuth, requireRole(['admin', 'team_lead', 'member']), ExpenseController.addExpense);
router.get('/expenses/team/:teamId', requireAuth, requireRole(['admin', 'team_lead', 'member']), ExpenseController.getTeamExpenses);
router.put('/expenses/:expenseId', requireAuth, requireRole(['admin', 'team_lead', 'member']), ExpenseController.updateExpense);
router.delete('/expenses/:expenseId', requireAuth, requireRole(['admin', 'team_lead', 'member']), ExpenseController.deleteExpense);
router.get('/expenses/:expenseId', requireAuth, requireRole(['admin', 'team_lead', 'member']), ExpenseController.getExpenseById);
router.get('/expenses/team/:teamId/analytics', requireAuth, requireRole(['admin', 'team_lead', 'member']), ExpenseController.getExpenseAnalytics);

// ACTIVITY ROUTES
router.get('/activity/:teamId', requireAuth, requireRole(['admin', 'team_lead', 'member']), ActivityController.getTeamActivities);
router.get('/activity/:teamId/type/:type', requireAuth, requireRole(['admin', 'team_lead', 'member']), ActivityController.getActivitiesByType);
router.post('/activity/create', requireAuth, requireRole(['admin', 'team_lead', 'member']), ActivityController.createActivity);
router.get('/activity/:teamId/feed', requireAuth, requireRole(['admin', 'team_lead', 'member']), ActivityController.getActivityFeed);

// HEALTH CHECK
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /auth/register': 'Register new user',
        'POST /auth/login': 'User login',
        'POST /auth/logout': 'User logout',
        'GET /auth/me': 'Get current user'
      },
      team: {
        'POST /team/create': 'Create new team',
        'GET /team/:teamId': 'Get team details',
        'POST /team/:teamId/invite': 'Invite team member',
        'PUT /team/:teamId/budget': 'Update team budget',
        'DELETE /team/:teamId/members/:memberId': 'Remove team member',
        'GET /team/:teamId/stats': 'Get team statistics'
      },
      expenses: {
        'POST /expenses/add': 'Add new expense',
        'GET /expenses/team/:teamId': 'Get team expenses',
        'PUT /expenses/:expenseId': 'Update expense',
        'DELETE /expenses/:expenseId': 'Delete expense',
        'GET /expenses/:expenseId': 'Get expense by ID',
        'GET /expenses/team/:teamId/analytics': 'Get expense analytics'
      },
      activities: {
        'GET /activity/:teamId': 'Get team activities',
        'GET /activity/:teamId/type/:type': 'Get activities by type',
        'POST /activity/create': 'Create custom activity',
        'GET /activity/:teamId/feed': 'Get activity feed'
      }
    }
  });
});

module.exports = router;
