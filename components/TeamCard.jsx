import React, { useState, useEffect } from 'react';
import { FaUsers, FaUserPlus, FaEdit, FaTrash } from 'react-icons/fa';

const TeamCard = ({ team, onInviteMember, onEditTeam }) => {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);

  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ teamId: team._id, email, role })
      });
      
      if (response.ok) {
        setEmail('');
        setShowInviteForm(false);
        // Show success message
        alert('Invitation sent successfully!');
      } else {
        alert('Failed to send invitation');
      }
    } catch (error) {
      alert('Error sending invitation');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (memberRole) => {
    switch (memberRole) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'team_lead': return 'bg-blue-100 text-blue-800';
      case 'member': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="card-hover-lift glass-morphism rounded-3xl p-8 border-white/30 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <FaUsers className="text-purple-600 text-2xl" />
          <span className="gradient-text bg-clip-text text-transparent">Team Members</span>
        </h3>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-300 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <FaUserPlus className="mr-2" />
            Invite Members
          </button>
          {onEditTeam && (
            <button 
              onClick={() => onEditTeam(team)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-300 text-sm font-medium"
            >
              <FaEdit className="mr-2" />
              Edit Team
            </button>
          )}
        </div>
      </div>

      {showInviteForm && (
        <div className="mb-6 p-6 bg-white/50 rounded-xl border border-white/30">
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter email address"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="member">Member</option>
                <option value="team_lead">Team Lead</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-all duration-300 text-sm font-medium"
              >
                {loading ? 'Sending...' : 'Send Invitation'}
              </button>
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all duration-300 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {team.members?.map((member) => (
          <div key={member._id} className="group relative">
            <div className="card-hover-lift glass-morphism rounded-2xl p-6 border-white/30 transition-all duration-300">
              <div className="absolute top-4 right-4">
                <div className={`w-3 h-3 ${getStatusColor(member.status)} rounded-full pulse-dot`}></div>
              </div>
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow-xl">
                    {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010-1.414 1.414l-8-8a1 1 0 00-1.414-1.414L10.586 3.586a1 1 0 00-1.414-1.414l-8 8a1 1 0 001.414 1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-bold text-gray-800">{member.name}</h4>
                    <span className={`px-3 py-1 ${getRoleColor(member.role)} text-xs font-medium rounded-full`}>
                      {member.role.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{member.description || 'Team member'}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{member.email}</span>
                    <span>•</span>
                    <span>Joined {new Date(member.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {team.members?.length || 0} members • {team.members?.filter(m => m.status === 'active').length || 0} online
        </div>
        <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
          View All Members →
        </button>
      </div>
    </div>
  );
};

export default TeamCard;
