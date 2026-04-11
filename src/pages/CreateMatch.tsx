import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import matchService from '../services/match.service';
import teamService from '../services/team.service';
import { Team } from '../types';

function CreateMatch() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [homeTeamSearch, setHomeTeamSearch] = useState('');
  const [awayTeamSearch, setAwayTeamSearch] = useState('');
  const [showHomeDropdown, setShowHomeDropdown] = useState(false);
  const [showAwayDropdown, setShowAwayDropdown] = useState(false);
  const [formData, setFormData] = useState({
    homeTeamId: '',
    awayTeamId: '',
    matchDate: '',
    venue: '',
    matchDuration: 90,
  });

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      setShowHomeDropdown(false);
      setShowAwayDropdown(false);
    };

    if (showHomeDropdown || showAwayDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showHomeDropdown, showAwayDropdown]);

  const loadTeams = async () => {
    try {
      const allTeams = await teamService.getAllTeams();
      setTeams(allTeams);
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  const filteredHomeTeams = teams.filter(
    (team) =>
      team.id !== formData.awayTeamId &&
      (team.name.toLowerCase().includes(homeTeamSearch.toLowerCase()) ||
       (team.teamId && team.teamId.toLowerCase().includes(homeTeamSearch.toLowerCase())))
  );

  const filteredAwayTeams = teams.filter(
    (team) =>
      team.id !== formData.homeTeamId &&
      (team.name.toLowerCase().includes(awayTeamSearch.toLowerCase()) ||
       (team.teamId && team.teamId.toLowerCase().includes(awayTeamSearch.toLowerCase())))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      navigate('/login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!formData.homeTeamId || !formData.awayTeamId) {
        throw new Error('Please select both teams');
      }

      if (formData.homeTeamId === formData.awayTeamId) {
        throw new Error('Home and away teams must be different');
      }

      if (!formData.matchDate) {
        throw new Error('Please select match date and time');
      }

      if (!formData.venue.trim()) {
        throw new Error('Please enter match venue');
      }

      const matchId = await matchService.createStandaloneMatch({
        homeTeamId: formData.homeTeamId,
        awayTeamId: formData.awayTeamId,
        matchDate: new Date(formData.matchDate),
        venue: formData.venue.trim(),
        matchDuration: formData.matchDuration,
        createdBy: currentUser.uid,
      });

      toast.success('Match created successfully! You can now start scoring.', 'Success!');
      navigate(`/matches/${matchId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create match');
    } finally {
      setLoading(false);
    }
  };

  const getTeamDisplay = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return 'Select Team';
    return team.teamId ? `${team.name} (${team.teamId})` : team.name;
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
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-block mb-4 px-6 py-2 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-full border border-green-500/30">
              <span className="text-green-400 font-semibold">⚽ Match Creator</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">Create a Match</h1>
            <p className="text-slate-400 text-lg">Set up a standalone match between two teams</p>
          </div>

          {!currentUser && (
            <div className="bg-blue-500/10 border border-blue-500/30 text-blue-300 p-5 rounded-2xl mb-8 backdrop-blur-sm">
              <span className="font-semibold">⚠️ Sign in required:</span> You need to{' '}
              <Link to="/login" className="font-bold underline hover:text-blue-200">
                sign in
              </Link>{' '}
              to create a match.
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Home Team */}
                <div className="relative">
                  <label className="block text-sm font-bold text-slate-300 mb-3">
                    Home Team *
                  </label>
                  <input
                    type="text"
                    placeholder="Search home team..."
                    value={homeTeamSearch}
                    onChange={(e) => {
                      setHomeTeamSearch(e.target.value);
                      setShowHomeDropdown(true);
                    }}
                    onFocus={() => setShowHomeDropdown(true)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    required={!formData.homeTeamId}
                  />
                  {formData.homeTeamId && (
                    <div className="mt-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm flex items-center justify-between">
                      <span>✓ {getTeamDisplay(formData.homeTeamId)}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, homeTeamId: '' });
                          setHomeTeamSearch('');
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  {showHomeDropdown && homeTeamSearch && !formData.homeTeamId && (
                    <div className="absolute z-10 w-full mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                      {filteredHomeTeams.length > 0 ? (
                        filteredHomeTeams.map((team) => (
                          <button
                            key={team.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, homeTeamId: team.id! });
                              setHomeTeamSearch(team.name);
                              setShowHomeDropdown(false);
                            }}
                            className="w-full px-4 py-3 text-left text-white hover:bg-slate-800 transition-all border-b border-white/5 last:border-b-0"
                          >
                            {team.teamId ? `${team.name} (${team.teamId})` : team.name}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-slate-400 text-sm">No teams found</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Away Team */}
                <div className="relative">
                  <label className="block text-sm font-bold text-slate-300 mb-3">
                    Away Team *
                  </label>
                  <input
                    type="text"
                    placeholder="Search away team..."
                    value={awayTeamSearch}
                    onChange={(e) => {
                      setAwayTeamSearch(e.target.value);
                      setShowAwayDropdown(true);
                    }}
                    onFocus={() => setShowAwayDropdown(true)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    required={!formData.awayTeamId}
                  />
                  {formData.awayTeamId && (
                    <div className="mt-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-sm flex items-center justify-between">
                      <span>✓ {getTeamDisplay(formData.awayTeamId)}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, awayTeamId: '' });
                          setAwayTeamSearch('');
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  {showAwayDropdown && awayTeamSearch && !formData.awayTeamId && (
                    <div className="absolute z-10 w-full mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                      {filteredAwayTeams.length > 0 ? (
                        filteredAwayTeams.map((team) => (
                          <button
                            key={team.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, awayTeamId: team.id! });
                              setAwayTeamSearch(team.name);
                              setShowAwayDropdown(false);
                            }}
                            className="w-full px-4 py-3 text-left text-white hover:bg-slate-800 transition-all border-b border-white/5 last:border-b-0"
                          >
                            {team.teamId ? `${team.name} (${team.teamId})` : team.name}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-slate-400 text-sm">No teams found</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Match Date & Time */}
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-3">
                    Match Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.matchDate}
                    onChange={(e) => setFormData({ ...formData, matchDate: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Match Duration */}
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-3">
                    Match Duration (minutes) *
                  </label>
                  <select
                    value={formData.matchDuration}
                    onChange={(e) => setFormData({ ...formData, matchDuration: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  >
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                    <option value="90">90 minutes</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-2">
                    Or enter custom duration:
                  </p>
                  <input
                    type="number"
                    min="10"
                    max="120"
                    placeholder="Custom minutes (10-120)"
                    onChange={(e) => e.target.value && setFormData({ ...formData, matchDuration: parseInt(e.target.value) })}
                    className="w-full mt-2 px-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm"
                  />
                </div>

                {/* Venue */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-300 mb-3">
                    Venue *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    placeholder="e.g., City Sports Complex"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Match Preview */}
              {formData.homeTeamId && formData.awayTeamId && (
                <div className="bg-black/30 rounded-2xl p-6 border border-white/10">
                  <h3 className="text-sm font-bold text-slate-400 mb-4">Match Preview</h3>
                  <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                      <div className="text-xl font-bold text-white">{getTeamDisplay(formData.homeTeamId)}</div>
                      <div className="text-xs text-slate-400 mt-1">Home</div>
                    </div>
                    <div className="px-6">
                      <div className="text-3xl font-black text-slate-500">vs</div>
                    </div>
                    <div className="text-center flex-1">
                      <div className="text-xl font-bold text-white">{getTeamDisplay(formData.awayTeamId)}</div>
                      <div className="text-xs text-slate-400 mt-1">Away</div>
                    </div>
                  </div>
                  {formData.matchDate && (
                    <div className="text-center mt-4 pt-4 border-t border-white/10 text-slate-400 text-sm">
                      📅 {new Date(formData.matchDate).toLocaleString()} • ⏱️ {formData.matchDuration} min • 📍 {formData.venue || 'Venue TBD'}
                    </div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !currentUser}
                className="w-full mt-8 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all shadow-xl shadow-green-500/20"
              >
                {loading ? 'Creating Match...' : '⚽ Create Match & Start Scoring'}
              </button>
            </form>

            {/* No Teams Warning */}
            {teams.length < 2 && (
              <div className="mt-6 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 p-4 rounded-2xl">
                <span className="font-semibold">⚠️ Notice:</span> You need at least 2 teams to create a match.{' '}
                <Link to="/create-team" className="font-bold underline hover:text-yellow-200">
                  Create a team first
                </Link>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="mt-8 text-center text-slate-400 text-sm">
            <p>💡 Tip: Make sure both teams have players added before starting the match</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateMatch;
