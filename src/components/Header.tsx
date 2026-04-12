import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

const Header = () => {
  const { currentUser, userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowDropdown(false);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="text-3xl md:text-4xl">⚽</div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Football Heroes
            </h1>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/tournaments"
              className="text-white/90 hover:text-white transition-colors font-medium"
            >
              Tournaments
            </Link>
            <Link
              to="/teams"
              className="text-white/90 hover:text-white transition-colors font-medium"
            >
              Teams
            </Link>

            {/* User Section */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full transition-all"
                >
                  {/* User Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                    {userProfile?.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  {/* User Name (hidden on mobile) */}
                  <span className="hidden md:block text-white font-medium">
                    {userProfile?.name || userProfile?.mobileNumber || currentUser.phoneNumber || 'User'}
                  </span>
                  {/* Dropdown Arrow */}
                  <svg
                    className={`w-4 h-4 text-white/60 transition-transform ${
                      showDropdown ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowDropdown(false)}
                    />
                    {/* Menu */}
                    <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                      {/* User Info */}
                      <div className="p-4 border-b border-white/10">
                        <p className="text-white font-bold truncate">
                          {userProfile?.name || currentUser.phoneNumber || 'User'}
                        </p>
                        <p className="text-slate-400 text-sm truncate">
                          {userProfile?.mobileNumber || currentUser.phoneNumber || ''}
                        </p>
                        {userProfile?.isVerified === false && (
                          <span className="inline-block mt-2 px-2 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded text-yellow-400 text-xs">
                            Unverified
                          </span>
                        )}
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        <Link
                          to="/dashboard"
                          onClick={() => setShowDropdown(false)}
                          className="block px-4 py-2 text-white/90 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          📊 Dashboard
                        </Link>
                        <Link
                          to="/my-teams"
                          onClick={() => setShowDropdown(false)}
                          className="block px-4 py-2 text-white/90 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          👥 My Teams
                        </Link>
                        <Link
                          to="/profile"
                          onClick={() => setShowDropdown(false)}
                          className="block px-4 py-2 text-white/90 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          ⚙️ Profile Settings
                        </Link>

                        {userProfile?.roles?.includes('admin') && (
                          <>
                            <div className="border-t border-white/10 my-2" />
                            <Link
                              to="/admin/tournaments"
                              onClick={() => setShowDropdown(false)}
                              className="block px-4 py-2 text-purple-400 hover:bg-white/10 hover:text-purple-300 transition-colors font-medium"
                            >
                              👑 Admin Panel
                            </Link>
                          </>
                        )}

                        <div className="border-t border-white/10 my-2" />
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                        >
                          🚪 Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 md:px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-full font-medium shadow-lg shadow-green-500/50 transition-all text-sm md:text-base"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Hamburger Menu Button */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden flex items-center justify-center w-10 h-10 text-white hover:bg-white/10 rounded-lg transition-all"
            aria-label="Toggle menu"
          >
            {showMobileMenu ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden mt-4 pb-4 border-t border-white/10 pt-4">
            <div className="flex flex-col space-y-3">
              <Link
                to="/tournaments"
                onClick={() => setShowMobileMenu(false)}
                className="px-4 py-2 text-white/90 hover:bg-white/10 hover:text-white rounded-lg transition-colors font-medium"
              >
                🏆 Tournaments
              </Link>
              <Link
                to="/teams"
                onClick={() => setShowMobileMenu(false)}
                className="px-4 py-2 text-white/90 hover:bg-white/10 hover:text-white rounded-lg transition-colors font-medium"
              >
                👥 Teams
              </Link>

              {currentUser && (
                <>
                  <div className="border-t border-white/10 my-2" />
                  <Link
                    to="/dashboard"
                    onClick={() => setShowMobileMenu(false)}
                    className="px-4 py-2 text-white/90 hover:bg-white/10 hover:text-white rounded-lg transition-colors font-medium"
                  >
                    📊 Dashboard
                  </Link>
                  <Link
                    to="/my-teams"
                    onClick={() => setShowMobileMenu(false)}
                    className="px-4 py-2 text-white/90 hover:bg-white/10 hover:text-white rounded-lg transition-colors font-medium"
                  >
                    👥 My Teams
                  </Link>
                  <Link
                    to="/profile"
                    onClick={() => setShowMobileMenu(false)}
                    className="px-4 py-2 text-white/90 hover:bg-white/10 hover:text-white rounded-lg transition-colors font-medium"
                  >
                    ⚙️ Profile
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setShowMobileMenu(false);
                    }}
                    className="px-4 py-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors font-medium text-left"
                  >
                    🚪 Sign Out
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Header;
