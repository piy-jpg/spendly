const User = require('../models/User');
const Team = require('../models/Team');
const Activity = require('../models/Activity');

class AuthController {
  // User registration
  static async register(req, res) {
    try {
      const { name, email, password, teamName } = req.body;
      
      // Validate input
      if (!name || !email || !password) {
        return res.status(400).json({ 
          error: 'Name, email, and password are required' 
        });
      }

      // Create user
      const user = User.create({
        name,
        email,
        password: User.hashPassword(password),
        role: 'admin' // First user becomes admin
      });

      // Create team
      const team = Team.create({
        name: teamName || `${name}'s Team`,
        createdBy: user._id
      });

      // Update user with team ID
      user.teamId = team._id;

      // Create activity
      Activity.memberJoined(user._id, team._id, name);

      res.status(201).json({
        message: 'User registered successfully',
        user: user.toJSON(),
        team: team.toJSON()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // User login
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ 
          error: 'Email and password are required' 
        });
      }

      // Find user (in real app, this would query database)
      // For now, we'll simulate finding the user
      const user = User.create({
        email,
        password: User.hashPassword(password),
        role: 'admin',
        teamId: 'team123' // Mock team ID
      });

      // Create session
      req.session.userId = user._id;
      req.session.userRole = user.role;
      req.session.teamId = user.teamId;

      // Create activity
      Activity.memberJoined(user._id, user.teamId, user.name);

      res.status(200).json({
        message: 'Login successful',
        user: user.toJSON()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // User logout
  static async logout(req, res) {
    try {
      req.session.userId = null;
      req.session.userRole = null;
      req.session.teamId = null;

      res.status(200).json({
        message: 'Logout successful'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get current user
  static async getCurrentUser(req, res) {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ 
          error: 'Not authenticated' 
        });
      }

      // In real app, this would query database
      const user = User.create({
        _id: req.session.userId,
        email: 'user@example.com',
        name: 'John Doe',
        role: req.session.userRole,
        teamId: req.session.teamId
      });

      res.status(200).json({
        user: user.toJSON()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Middleware for authentication
  static requireAuth(req, res, next) {
    if (!req.session.userId) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }
    next();
  }

  // Middleware for role-based access
  static requireRole(roles) {
    return (req, res, next) => {
      if (!req.session.userId) {
        return res.status(401).json({ 
          error: 'Authentication required' 
        });
      }

      const userRole = req.session.userRole;
      if (!roles.includes(userRole)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions' 
        });
      }

      next();
    };
  }
}

module.exports = AuthController;
