# Spendly

Spendly is an expense-tracking web app built as a server-rendered Node.js application. The active app path in this repository is `server.js` + `views/*.ejs` + `lib/db.js`.

## What actually runs

- Backend: Express
- Frontend: EJS templates, static CSS, vanilla JS, Chart.js
- Database: SQLite via `better-sqlite3`
- Auth: cookie-backed session store persisted to `spendly-sessions.json`

There are some older Python/Flask and experimental files in the repo, but they are not the current runtime path for the app.

## Project structure

```text
.
├── server.js                # Main app entrypoint
├── lib/db.js                # SQLite schema + queries used by the live app
├── views/                   # EJS pages and partials
├── static/                  # Main frontend assets
├── public/                  # Additional CSS/JS assets
├── spendly.db               # SQLite database
└── spendly-sessions.json    # Simple persisted session store
```

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm start
```

3. Open:

```text
http://127.0.0.1:5002
```

## Health check

After starting the server, you can verify it with:

```bash
curl http://127.0.0.1:5002/health
```

## Main routes

- `/` landing page
- `/register` create account
- `/login` sign in
- `/dashboard` main workspace
- `/expenses` expense management
- `/analytics` charts and trends
- `/budgets` budget overview
- `/recurring` recurring expenses
- `/profile`, `/settings`, `/notifications`

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
PORT=5002
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
docker run -p 5002:5002 spendly
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
