import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Dashboard() {
  const { userProfile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-600">⚽ Football Heroes</h1>
          <button
            onClick={signOut}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Welcome, {userProfile?.name || 'Player'}!</h2>
          <p className="text-gray-600">Mobile: {userProfile?.mobileNumber}</p>

          {userProfile?.position && (
            <p className="text-gray-600">Position: {userProfile.position}</p>
          )}

          {userProfile?.roles && (
            <div className="mt-2">
              <span className="text-sm text-gray-500">Roles: </span>
              {userProfile.roles.map((role) => (
                <span
                  key={role}
                  className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded ml-1"
                >
                  {role}
                </span>
              ))}
            </div>
          )}
        </div>

        {userProfile && userProfile.statistics && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-xl font-bold mb-4">Your Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {userProfile.statistics.matches}
                </div>
                <div className="text-sm text-gray-600">Matches</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {userProfile.statistics.goals}
                </div>
                <div className="text-sm text-gray-600">Goals</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {userProfile.statistics.assists}
                </div>
                <div className="text-sm text-gray-600">Assists</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-yellow-600">
                  {userProfile.statistics.yellowCards}
                </div>
                <div className="text-sm text-gray-600">Yellow Cards</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-red-600">
                  {userProfile.statistics.redCards}
                </div>
                <div className="text-sm text-gray-600">Red Cards</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {userProfile.statistics.cleanSheets}
                </div>
                <div className="text-sm text-gray-600">Clean Sheets</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            to="/tournaments"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-bold mb-2">🏆 Tournaments</h3>
            <p className="text-gray-600 text-sm">Browse active tournaments</p>
          </Link>

          <Link
            to="/profile"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-bold mb-2">👤 My Profile</h3>
            <p className="text-gray-600 text-sm">Update your profile</p>
          </Link>

          {userProfile?.roles.includes('admin') && (
            <Link
              to="/admin/tournaments"
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-2 border-green-600"
            >
              <h3 className="text-lg font-bold mb-2 text-green-600">⚙️ Admin Panel</h3>
              <p className="text-gray-600 text-sm">Manage tournaments</p>
            </Link>
          )}

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow opacity-50 cursor-not-allowed">
            <h3 className="text-lg font-bold mb-2">👥 My Teams</h3>
            <p className="text-gray-600 text-sm">Coming soon</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow opacity-50 cursor-not-allowed">
            <h3 className="text-lg font-bold mb-2">📩 Invitations</h3>
            <p className="text-gray-600 text-sm">Coming soon</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow opacity-50 cursor-not-allowed">
            <h3 className="text-lg font-bold mb-2">🏅 Leaderboards</h3>
            <p className="text-gray-600 text-sm">Coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
