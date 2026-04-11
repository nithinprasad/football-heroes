import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tournaments from './pages/Tournaments';
import TournamentDetail from './pages/TournamentDetail';
import Profile from './pages/Profile';
import AdminTournaments from './pages/AdminTournaments';

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
      <Route path="/" element={<Navigate to="/tournaments" />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <AppRoutes />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
