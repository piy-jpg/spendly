import React, { useState, useEffect } from 'react';
import { 
  FaPlus, 
  FaMoneyBillWave, 
  FaCalendarAlt, 
  FaUserPlus, 
  FaSync, 
  FaRobot, 
  FaFilter,
  FaClock,
  FaUser,
  FaTag
} from 'react-icons/fa';

const ActivityFeed = ({ teamId, currentUserId }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchActivities();
  }, [teamId]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/activity/${teamId}${filter !== 'all' ? `?type=${filter}` : ''}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    const icons = {
      expense_added: <FaMoneyBillWave className="text-green-500" />,
      expense_updated: <FaMoneyBillWave className="text-blue-500" />,
      expense_deleted: <FaMoneyBillWave className="text-red-500" />,
      member_joined: <FaUserPlus className="text-purple-500" />,
      member_left: <FaUserPlus className="text-gray-500" />,
      budget_updated: <FaCalendarAlt className="text-orange-500" />,
      recurring_created: <FaSync className="text-indigo-500" />,
      recurring_generated: <FaRobot className="text-cyan-500" />
    };
    return icons[type] || <FaPlus className="text-gray-500" />;
  };

  const getActivityColor = (type) => {
    const colors = {
      expense_added: 'bg-green-100 text-green-800',
      expense_updated: 'bg-blue-100 text-blue-800',
      expense_deleted: 'bg-red-100 text-red-800',
      member_joined: 'bg-purple-100 text-purple-800',
      member_left: 'bg-gray-100 text-gray-800',
      budget_updated: 'bg-orange-100 text-orange-800',
      recurring_created: 'bg-indigo-100 text-indigo-800',
      recurring_generated: 'bg-cyan-100 text-cyan-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleCreateActivity = async (e) => {
    e.preventDefault();
    const { type, message, metadata } = e.target.elements;
    
    try {
      const response = await fetch('/api/activity/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          type: type.value,
          message: message.value,
          metadata: metadata ? JSON.parse(metadata.value) : null
        })
      });
      
      if (response.ok) {
        setShowCreateForm(false);
        fetchActivities(); // Refresh activities
      }
    } catch (error) {
      alert('Error creating activity');
    }
  };

  const filteredActivities = activities.filter(activity => 
    filter === 'all' ? true : activity.type === filter
  );

  return (
    <div className="card-hover-lift glass-morphism rounded-3xl p-8 border-white/30">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <FaFilter className="text-purple-600 text-2xl" />
          <span className="gradient-text bg-clip-text text-transparent">Activity Feed</span>
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-all duration-300 text-sm font-medium"
          >
            <option value="all">All Activities</option>
            <option value="expense_added">Expenses Added</option>
            <option value="expense_updated">Expenses Updated</option>
            <option value="member_joined">Members Joined</option>
            <option value="budget_updated">Budget Updates</option>
            <option value="recurring_created">Recurring Created</option>
            <option value="recurring_generated">Recurring Generated</option>
          </select>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-300 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <FaPlus className="mr-2" />
            Create Activity
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="mb-6 p-6 bg-white/50 rounded-xl border border-white/30">
          <form onSubmit={handleCreateActivity} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Activity Type</label>
              <select name="type" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" required>
                <option value="">Select type...</option>
                <option value="expense_added">Expense Added</option>
                <option value="expense_updated">Expense Updated</option>
                <option value="member_joined">Member Joined</option>
                <option value="budget_updated">Budget Updated</option>
                <option value="recurring_created">Recurring Created</option>
                <option value="recurring_generated">Recurring Generated</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
              <textarea
                name="message"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows="3"
                placeholder="Enter activity message..."
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-300 text-sm font-medium"
              >
                Create Activity
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all duration-300 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredActivities.map((activity) => (
            <div key={activity._id} className="group relative">
              <div className="card-hover-lift glass-morphism rounded-2xl p-6 border-white/30 transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white shadow-lg">
                      {getActivityIcon(activity.type)}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-lg font-bold text-gray-800 capitalize">
                        {activity.type.replace('_', ' ')}
                      </h4>
                      <span className={`px-3 py-1 ${getActivityColor(activity.type)} text-xs font-medium rounded-full`}>
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-2">{activity.message}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <FaUser className="w-4 h-4" />
                        <span>{activity.userId === currentUserId ? 'You' : 'Team Member'}</span>
                        <span className="mx-2">•</span>
                        <FaClock className="w-4 h-4" />
                        <span>{formatTimestamp(activity.timestamp)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full hover:bg-blue-200 transition-all duration-300">
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 text-center">
        <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-xl hover:from-purple-700 hover:to-purple-900 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:scale-105">
          Load More Activities
        </button>
      </div>
    </div>
  );
};

export default ActivityFeed;
