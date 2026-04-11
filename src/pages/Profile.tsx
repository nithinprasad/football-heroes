import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Position } from '../types';

function Profile() {
  const { userProfile, updateProfile, signOut } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: userProfile?.name || '',
    position: (userProfile?.position || 'Forward') as Position,
    jerseyNumber: userProfile?.jerseyNumber || 0,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await updateProfile(formData);
      setMessage('Profile updated successfully!');
      setEditing(false);
    } catch (error: any) {
      setMessage(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/dashboard" className="text-2xl font-bold text-green-600">
            ⚽ Football Heroes
          </Link>
          <button
            onClick={signOut}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Edit Profile
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          {!editing ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Name</label>
                <p className="text-lg font-medium">{userProfile?.name || 'Not set'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Mobile Number
                </label>
                <p className="text-lg font-medium">{userProfile?.mobileNumber}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Position</label>
                <p className="text-lg font-medium">{userProfile?.position || 'Not set'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Jersey Number
                </label>
                <p className="text-lg font-medium">
                  {userProfile?.jerseyNumber ? `#${userProfile.jerseyNumber}` : 'Not set'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Roles</label>
                <div className="flex flex-wrap gap-2">
                  {userProfile?.roles.map((role) => (
                    <span
                      key={role}
                      className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="position"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Position *
                </label>
                <select
                  id="position"
                  required
                  value={formData.position}
                  onChange={(e) =>
                    setFormData({ ...formData, position: e.target.value as Position })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="Goalkeeper">Goalkeeper</option>
                  <option value="Defender">Defender</option>
                  <option value="Midfielder">Midfielder</option>
                  <option value="Forward">Forward</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="jerseyNumber"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Jersey Number
                </label>
                <input
                  id="jerseyNumber"
                  type="number"
                  min="0"
                  max="99"
                  value={formData.jerseyNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, jerseyNumber: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {message && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    message.includes('success')
                      ? 'bg-green-50 text-green-600'
                      : 'bg-red-50 text-red-600'
                  }`}
                >
                  {message}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      name: userProfile?.name || '',
                      position: (userProfile?.position || 'Forward') as Position,
                      jerseyNumber: userProfile?.jerseyNumber || 0,
                    });
                    setMessage('');
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Statistics */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-bold mb-4">Career Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                {userProfile?.statistics.matches || 0}
              </div>
              <div className="text-sm text-gray-600">Matches</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                {userProfile?.statistics.goals || 0}
              </div>
              <div className="text-sm text-gray-600">Goals</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                {userProfile?.statistics.assists || 0}
              </div>
              <div className="text-sm text-gray-600">Assists</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-yellow-600">
                {userProfile?.statistics.yellowCards || 0}
              </div>
              <div className="text-sm text-gray-600">Yellow Cards</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-red-600">
                {userProfile?.statistics.redCards || 0}
              </div>
              <div className="text-sm text-gray-600">Red Cards</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">
                {userProfile?.statistics.cleanSheets || 0}
              </div>
              <div className="text-sm text-gray-600">Clean Sheets</div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Link
            to="/dashboard"
            className="inline-block text-green-600 hover:text-green-700 font-medium"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Profile;
