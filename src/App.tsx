import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tournaments from './pages/Tournaments';
import TournamentDetail from './pages/TournamentDetail';
import CreateTournament from './pages/CreateTournament';
import Teams from './pages/Teams';
import TeamsDashboard from './pages/TeamsDashboard';
import CreateTeam from './pages/CreateTeam';
import CreateMatch from './pages/CreateMatch';
import LiveMatch from './pages/LiveMatch';
import TeamProfile from './pages/TeamProfile';
import ManageTeam from './pages/ManageTeam';
import UserProfile from './pages/UserProfile';
import LiveScoring from './pages/LiveScoring';
import Profile from './pages/Profile';
import AdminTournaments from './pages/AdminTournaments';
import JoinTeam from './pages/JoinTeam';
import InternalMatch from './pages/InternalMatch';

function PrivateRoute({ children }: { children: JSX.Element }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return currentUser ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }: { children: JSX.Element }) {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (!userProfile?.roles.includes('admin')) {
    return <Navigate to="/dashboard" />;
  }

  return children;
}

function AppRoutes() {
  const { currentUser } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/tournaments" element={<Tournaments />} />
      <Route path="/tournaments/:id" element={<TournamentDetail />} />
      <Route path="/teams" element={<Teams />} />
      <Route path="/teams/:id" element={<TeamProfile />} />
      <Route path="/teams/:id/manage" element={<PrivateRoute><ManageTeam /></PrivateRoute>} />
      <Route path="/teams/:id/internal-match" element={<PrivateRoute><InternalMatch /></PrivateRoute>} />
      <Route path="/teams/join/:id" element={<JoinTeam />} />
      <Route path="/users/:id" element={<UserProfile />} />
      <Route path="/create-tournament" element={<CreateTournament />} />
      <Route path="/create-team" element={<CreateTeam />} />
      <Route path="/create-match" element={<CreateMatch />} />

      {/* Match Routes */}
      <Route path="/matches/:id" element={<LiveMatch />} />
      <Route
        path="/matches/:id/score"
        element={
          <PrivateRoute>
            <LiveScoring />
          </PrivateRoute>
        }
      />

      {/* Auth Routes */}
      <Route path="/login" element={currentUser ? <Navigate to="/dashboard" /> : <Login />} />

      {/* Private Routes */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/my-teams"
        element={
          <PrivateRoute>
            <TeamsDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/tournaments"
        element={
          <AdminRoute>
            <AdminTournaments />
          </AdminRoute>
        }
      />

      {/* Default Route */}
      <Route path="/" element={<Home />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <div className="min-h-screen bg-gray-50">
            <AppRoutes />
          </div>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
