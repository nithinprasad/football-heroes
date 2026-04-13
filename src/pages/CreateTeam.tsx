import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import teamService from '../services/team.service';
import { handleError } from '../utils/errorHandler';

function CreateTeam() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    logoURL: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      navigate('/login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!formData.name.trim()) {
        throw new Error('Team name is required');
      }

      const teamId = await teamService.createTeam({
        name: formData.name.trim(),
        location: formData.location.trim() || undefined,
        logoURL: formData.logoURL.trim() || undefined,
      }, currentUser.uid);

      toast.success('Team created successfully! You are now the team manager.', 'Success!');
      navigate(`/teams/${teamId}`);
    } catch (err: any) {
      setError(handleError(err, 'Create Team'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation */}
      <nav className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <div className="text-3xl">⚽</div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Football Heroes</h1>
          </Link>
          <Link to="/" className="text-green-400 hover:text-green-300 font-medium">
            ← Back
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-block mb-4 px-6 py-2 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-full border border-green-500/30">
              <span className="text-green-400 font-semibold">👥 Team Creator</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">Create Your Team</h1>
            <p className="text-slate-400 text-lg">You'll become the team manager and can add players</p>
          </div>

          {!currentUser && (
            <div className="bg-blue-500/10 border border-blue-500/30 text-blue-300 p-5 rounded-2xl mb-8 backdrop-blur-sm">
              <span className="font-semibold">⚠️ Sign in required:</span> You need to{' '}
              <Link to="/login" className="font-bold underline hover:text-blue-200">
                sign in
              </Link>{' '}
              to create a team. You'll become the team manager and can manage players and join tournaments.
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-2xl mb-8">
              <span className="font-semibold">Error:</span> {error}
            </div>
          )}

          {/* Form */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-3">
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your team name (e.g., Warriors FC)"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-slate-500 mt-2">
                  A unique Team ID will be automatically generated for searching
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-3">
                  Team Location *
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Enter team location (e.g., Mumbai, Delhi NCR)"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-slate-500 mt-2">
                  City or area where your team is based
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-3">
                  Team Logo URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.logoURL}
                  onChange={(e) => setFormData({ ...formData, logoURL: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Paste a direct link to your team logo image
                </p>
              </div>

              {/* Preview */}
              {formData.name && (
                <div className="bg-black/30 rounded-2xl p-6 border border-white/10">
                  <h3 className="text-sm font-bold text-slate-400 mb-4">Preview</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-700 rounded-2xl flex items-center justify-center overflow-hidden">
                      {formData.logoURL ? (
                        <img src={formData.logoURL} alt="Logo preview" className="w-full h-full object-contain p-2" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      ) : (
                        <span className="text-3xl">⚽</span>
                      )}
                    </div>
                    <div>
                      <div className="text-xl font-bold text-white">{formData.name}</div>
                      {formData.location && (
                        <div className="text-sm text-slate-400 flex items-center gap-1">
                          <span>📍</span>
                          {formData.location}
                        </div>
                      )}
                      <div className="text-sm text-slate-400">Team ID will be generated</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !currentUser}
                className="w-full mt-8 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all shadow-xl shadow-green-500/20"
              >
                {loading ? 'Creating Team...' : '👥 Create Team & Become Manager'}
              </button>
            </form>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center">
              <div className="text-3xl mb-2">🎯</div>
              <h3 className="font-bold text-white mb-1 text-sm">Unique Team ID</h3>
              <p className="text-xs text-slate-400">Easy to search and share</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center">
              <div className="text-3xl mb-2">⚽</div>
              <h3 className="font-bold text-white mb-1 text-sm">Join Tournaments</h3>
              <p className="text-xs text-slate-400">Compete with other teams</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center">
              <div className="text-3xl mb-2">👥</div>
              <h3 className="font-bold text-white mb-1 text-sm">Manage Players</h3>
              <p className="text-xs text-slate-400">Add and organize your squad</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateTeam;
