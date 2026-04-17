# 🚀 Spendly - Team Expense Management System

A comprehensive team expense management platform with real-time collaboration, role-based permissions, and beautiful modern UI.

## ✨ Features

### 🏗️ Core Architecture
- **User → Team → Expenses → Activities → Roles**
- Clean separation of concerns with MVC pattern
- Role-based access control (Admin, Team Lead, Member)
- Real-time activity logging and notifications

### 🎯 Key Features
- **Team Management**: Create teams, invite members, manage roles
- **Expense Tracking**: Full CRUD operations with categories and analytics
- **Budget Monitoring**: Real-time budget tracking with health scoring
- **Activity Timeline**: Rich activity feed with metadata and filtering
- **Recurring Expenses**: Automated expense generation with flexible frequencies
- **Analytics Dashboard**: Comprehensive spending patterns and insights
- **Modern UI**: Glass morphism design with animations and micro-interactions

### 🔐 Security & Permissions
- **Admin**: Full control over all features
- **Team Lead**: Manage members, expenses, and budget
- **Member**: Add/view own expenses and analytics

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **SQLite** with better-sqlite3
- **Session-based Authentication**
- **RESTful API** with comprehensive endpoints

### Frontend
- **React** with modern hooks
- **Tailwind CSS** for responsive design
- **Glass Morphism** UI with animations
- **Chart.js** for data visualization

### Database
- **Normalized Schema** with proper relationships
- **Indexes** for performance optimization
- **Foreign Keys** for data integrity

## 📁 Project Structure

```
spendly/
├── database/
│   └── schema.sql              # Database schema and structure
├── models/                     # Data models and business logic
│   ├── User.js                # User model with permissions
│   ├── Team.js                # Team model with health scoring
│   ├── Expense.js             # Expense model with validation
│   ├── Activity.js            # Activity logging model
│   └── RecurringExpense.js   # Recurring expense automation
├── controllers/                 # API controllers
│   ├── authController.js       # Authentication logic
│   ├── teamController.js       # Team management
│   ├── expenseController.js    # Expense operations
│   └── activityController.js  # Activity feed management
├── routes/                     # API routes
│   └── index.js              # Main router with all endpoints
├── components/                  # React components
│   ├── TeamCard.jsx           # Team member management
│   ├── ActivityFeed.jsx       # Real-time activity feed
│   ├── ExpenseList.jsx        # Expense listing and filtering
│   └── QuickActions.jsx       # Quick action buttons
├── views/                       # EJS templates
│   ├── dashboard.ejs          # Main team dashboard
│   ├── analytics.ejs          # Analytics and charts
│   ├── recurring-form.ejs      # Recurring expense setup
│   └── partials/              # Reusable components
└── server.js                    # Main server file
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/piy-jpg/spendly.git
cd spendly
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up database**
```bash
# Run database schema
sqlite3 spendly.db < database/schema.sql
```

4. **Start the server**
```bash
npm start
```

5. **Access the application**
```
http://localhost:5001
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Team Management
- `POST /api/team/create` - Create new team
- `GET /api/team/:id` - Get team details
- `POST /api/team/:id/invite` - Invite team member
- `PUT /api/team/:id/budget` - Update team budget
- `DELETE /api/team/:id/members/:memberId` - Remove team member
- `GET /api/team/:id/stats` - Get team statistics

### Expense Management
- `POST /api/expenses/add` - Add new expense
- `GET /api/expenses/team/:teamId` - Get team expenses
- `PUT /api/expenses/:expenseId` - Update expense
- `DELETE /api/expenses/:expenseId` - Delete expense
- `GET /api/expenses/:expenseId` - Get expense by ID
- `GET /api/expenses/team/:teamId/analytics` - Get expense analytics

### Activity Feed
- `GET /api/activity/:teamId` - Get team activities
- `GET /api/activity/:teamId/type/:type` - Get activities by type
- `POST /api/activity/create` - Create custom activity
- `GET /api/activity/:teamId/feed` - Get activity feed

## 🎨 UI Components

### Team Dashboard
- **Glass Morphism Design**: Modern, beautiful interface
- **Real-time Updates**: Live activity feed and notifications
- **Interactive Charts**: Spending trends and analytics
- **Responsive Layout**: Mobile-friendly design

### Key Components
- **TeamCard.jsx**: Member management with invite functionality
- **ActivityFeed.jsx**: Real-time activity timeline with filtering
- **ExpenseList.jsx**: Expense listing with search and pagination
- **QuickActions.jsx**: Quick action buttons for common tasks

## 🔧 Configuration

### Environment Variables
```env
NODE_ENV=development
PORT=5001
SESSION_SECRET=your-secret-key
DB_PATH=./spendly.db
```

### Database Configuration
The system uses SQLite with the following tables:
- `users` - User accounts and roles
- `teams` - Team information and budgets
- `expenses` - Expense records with categories
- `activities` - Activity logging for timeline
- `recurring_expenses` - Automated recurring expenses

## 📈 Health Score Calculation

The team health score is calculated based on:
- **Budget Consistency**: -20 points if over budget
- **Expense Regularity**: +10 points for regular entries
- **Team Activity**: +10 points for active team

Score ranges from 0-100, with higher scores indicating healthier financial management.

## 🔄 Recurring Expenses

The system supports automated recurring expenses with:
- **Frequencies**: Daily, Weekly, Monthly, Yearly
- **Auto-generation**: Automatic expense creation
- **Activity logging**: All generated expenses create activities
- **Flexible scheduling**: Start and end dates support

## 🎯 Role-Based Permissions

### Admin
- Full control over all features
- Manage teams and users
- System administration

### Team Lead
- Manage team members
- Update team budget
- View and manage all expenses
- Create recurring expenses

### Member
- Add own expenses
- View team expenses
- Access analytics
- Edit own expenses only

## 🌟 Unique Features

### Real-time Activity Logging
Every action creates an activity entry:
- Expense additions/updates/deletions
- Member joins/leaves
- Budget updates
- Recurring expense operations

### Smart Budget Tracking
- Real-time budget usage calculation
- Automatic notifications at 80% usage
- Visual status indicators
- Historical tracking

### Rich Metadata Support
Activities include rich metadata for:
- Expense details and participants
- User information and roles
- Budget change reasons
- Recurring expense schedules

## 🚀 Deployment

### Production Setup
1. Set environment variables
2. Build production assets
3. Set up reverse proxy (nginx)
4. Configure SSL certificate
5. Deploy to cloud provider

### Docker Support
```bash
docker build -t spendly .
docker run -p 5001:5001 spendly
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Chart.js** for beautiful data visualization
- **Tailwind CSS** for modern styling
- **Font Awesome** for beautiful icons
- **Glass Morphism** design inspiration

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the API endpoints

---

**Spendly** - Making team expense management beautiful, efficient, and collaborative! 🚀
