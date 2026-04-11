import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import tournamentService from '../services/tournament.service';
import leaderboardService from '../services/leaderboard.service';
import { TournamentFormat } from '../types';
import Header from '../components/Header';

function Home() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [leaderboards, setLeaderboards] = useState<any>({ topScorers: [], topAssists: [], topGoalkeepers: [] });
  const [recentTournaments, setRecentTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    format: 'LEAGUE' as TournamentFormat,
    teamSize: 11,
    location: '',
    startDate: '',
    endDate: '',
    numberOfGroups: 1,
    matchDuration: 90,
  });

  useEffect(() => {
    loadLeaderboards();
    loadRecentTournaments();
  }, []);

  const loadLeaderboards = async () => {
    try {
      const data = await leaderboardService.getAllLeaderboards(5);
      setLeaderboards(data);
    } catch (error) {
      console.error('Error loading leaderboards:', error);
    }
  };

  const loadRecentTournaments = async () => {
    try {
      const tournaments = await tournamentService.getAllTournaments();
      // Get upcoming and ongoing tournaments, sorted by start date
      const filtered = tournaments
        .filter((t: any) => t.status === 'UPCOMING' || t.status === 'ONGOING')
        .sort((a: any, b: any) => {
          const dateA = a.startDate instanceof Date ? a.startDate : new Date(a.startDate.seconds * 1000);
          const dateB = b.startDate instanceof Date ? b.startDate : new Date(b.startDate.seconds * 1000);
          return dateA.getTime() - dateB.getTime();
        })
        .slice(0, 6);
      setRecentTournaments(filtered);
    } catch (error) {
      console.error('Error loading recent tournaments:', error);
    }
  };

  const formatDate = (date: any) => {
    const d = date instanceof Date ? date : new Date(date.seconds * 1000);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      UPCOMING: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', icon: '🔜' },
      ONGOING: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', icon: '🔴' },
    };
    const badge = badges[status] || badges.UPCOMING;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border} inline-flex items-center gap-1`}>
        <span>{badge.icon}</span>
        {status}
      </span>
    );
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const tournamentData: any = {
        name: formData.name,
        format: formData.format,
        teamSize: formData.teamSize,
        location: formData.location,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        matchDuration: formData.matchDuration,
      };

      // Only include numberOfGroups if format requires it
      if (formData.format === 'LEAGUE' || formData.format === 'LEAGUE_KNOCKOUT') {
        tournamentData.numberOfGroups = formData.numberOfGroups;
      }

      await tournamentService.createTournament(currentUser.uid, tournamentData);

      toast.success('Tournament created successfully! You are now the organizer.', 'Success!');
      setShowCreateForm(false);
      setFormData({
        name: '',
        format: 'LEAGUE',
        teamSize: 11,
        location: '',
        startDate: '',
        endDate: '',
        numberOfGroups: 1,
        matchDuration: 90,
      });
      navigate('/tournaments');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create tournament', 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation */}
      <Header />

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-green-500 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="text-center max-w-5xl mx-auto">
            <div className="inline-block mb-6 px-6 py-2 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-full border border-green-500/30 backdrop-blur-sm">
              <span className="text-green-400 font-semibold">🏆 The Ultimate Tournament Platform</span>
            </div>

            <h2 className="text-6xl md:text-7xl font-black text-white mb-6 leading-tight">
              Organize.<br />
              <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                Compete.
              </span>{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Celebrate.
              </span>
            </h2>

            <p className="text-xl md:text-2xl text-slate-300 mb-10 max-w-3xl mx-auto">
              Create professional football tournaments, track live scores, manage teams, and celebrate your champions with real-time statistics
            </p>

            <div className="flex gap-4 justify-center flex-wrap mb-12">
              <Link
                to="/tournaments"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-full font-bold text-lg hover:bg-white/20 transition-all border border-white/20 shadow-xl"
              >
                Browse Tournaments
              </Link>
              <Link
                to="/create-tournament"
                className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full font-bold text-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-xl shadow-green-500/30"
              >
                + Create Tournament
              </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
                <div className="text-4xl mb-2">🏟️</div>
                <div className="text-3xl font-bold text-white mb-1">Multiple Formats</div>
                <p className="text-slate-400">League, Knockout & Hybrid</p>
              </div>
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
                <div className="text-4xl mb-2">⚡</div>
                <div className="text-3xl font-bold text-white mb-1">Live Updates</div>
                <p className="text-slate-400">Real-time scores & standings</p>
              </div>
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
                <div className="text-4xl mb-2">👥</div>
                <div className="text-3xl font-bold text-white mb-1">Team Management</div>
                <p className="text-slate-400">Organizers control everything</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        {/* Create Tournament Form */}
        {showCreateForm && (
          <div id="tournament-form" className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-8 mb-16 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-3xl font-bold text-white mb-2">Create Your Tournament</h3>
                <p className="text-slate-400">You'll become the organizer and can invite others</p>
              </div>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-slate-400 hover:text-white text-2xl w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-all"
              >
                ✕
              </button>
            </div>

            {!currentUser && (
              <div className="bg-blue-500/10 border border-blue-500/30 text-blue-300 p-5 rounded-2xl mb-8 backdrop-blur-sm">
                <span className="font-semibold">⚠️ Sign in required:</span> You need to{' '}
                <Link to="/login" className="font-bold underline hover:text-blue-200">
                  sign in
                </Link>{' '}
                to create a tournament. You'll become the tournament organizer and can manage teams and matches.
              </div>
            )}

            <form onSubmit={handleCreateTournament} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-3">
                    Tournament Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Summer Championship 2024"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-3">
                    Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="City Sports Complex"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-3">
                    Format *
                  </label>
                  <select
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value as TournamentFormat })}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  >
                    <option value="LEAGUE">League (Round Robin)</option>
                    <option value="KNOCKOUT">Knockout</option>
                    <option value="LEAGUE_KNOCKOUT">League + Knockout</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-3">
                    Team Size *
                  </label>
                  <select
                    value={formData.teamSize}
                    onChange={(e) => setFormData({ ...formData, teamSize: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  >
                    <option value="5">5-a-side</option>
                    <option value="6">6-a-side</option>
                    <option value="7">7-a-side</option>
                    <option value="11">11-a-side</option>
                  </select>
                </div>

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
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-3">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-3">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>

                {(formData.format === 'LEAGUE' || formData.format === 'LEAGUE_KNOCKOUT') && (
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-3">
                      Number of Groups
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={formData.numberOfGroups}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setFormData({ ...formData, numberOfGroups: isNaN(val) ? 1 : val });
                      }}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-slate-500 mt-2">Leave as 1 for a single league table</p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !currentUser}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all shadow-xl shadow-green-500/20"
              >
                {loading ? 'Creating...' : '🏆 Create Tournament & Become Organizer'}
              </button>
            </form>
          </div>
        )}

        {/* Recent Tournaments Section */}
        {recentTournaments.length > 0 && (
          <div className="mb-20">
            <div className="text-center mb-12">
              <div className="inline-block mb-4 px-6 py-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full border border-blue-500/30">
                <span className="text-blue-400 font-semibold">🏆 Happening Now</span>
              </div>
              <h2 className="text-5xl font-black text-white mb-4">Upcoming Tournaments</h2>
              <p className="text-slate-400 text-lg">Join the action near you</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentTournaments.map((tournament: any) => (
                <Link
                  key={tournament.id}
                  to={`/tournaments/${tournament.id}`}
                  className="group bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden hover:bg-slate-800/70 hover:border-green-500/30 transition-all shadow-xl hover:shadow-2xl hover:shadow-green-500/10"
                >
                  {/* Tournament Banner */}
                  <div className="relative h-40 bg-gradient-to-br from-green-500/20 to-blue-500/20 p-6">
                    <div className="absolute top-4 right-4">
                      {getStatusBadge(tournament.status)}
                    </div>
                    {tournament.logoURL ? (
                      <img src={tournament.logoURL} alt={tournament.name} className="w-20 h-20 object-contain" />
                    ) : (
                      <div className="text-6xl">🏆</div>
                    )}
                  </div>

                  {/* Tournament Info */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-green-400 transition-colors line-clamp-2">
                      {tournament.name}
                    </h3>

                    <div className="space-y-2 text-sm text-slate-400">
                      <div className="flex items-center gap-2">
                        <span>📍</span>
                        <span className="line-clamp-1">{tournament.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>📅</span>
                        <span>{formatDate(tournament.startDate)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>👥</span>
                        <span>{tournament.teamIds.length} teams</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="text-green-400 font-bold text-center group-hover:text-green-300 transition-colors">
                        View Details →
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center mt-8">
              <Link
                to="/tournaments"
                className="inline-block px-8 py-3 bg-white/10 backdrop-blur-sm text-white rounded-full font-medium hover:bg-white/20 transition-all border border-white/20"
              >
                View All Tournaments →
              </Link>
            </div>
          </div>
        )}

        {/* Hall of Fame - Leaderboards Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <div className="inline-block mb-4 px-6 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full border border-yellow-500/30">
              <span className="text-yellow-400 font-semibold">🏆 Hall of Fame</span>
            </div>
            <h2 className="text-5xl font-black text-white mb-4">Top Performers</h2>
            <p className="text-slate-400 text-lg">The best players across all tournaments</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Top Scorers */}
            <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 backdrop-blur-xl rounded-3xl border border-red-500/20 p-8 shadow-2xl hover:shadow-red-500/20 transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-4xl">⚽</div>
                <h3 className="text-2xl font-bold text-white">Top Scorers</h3>
              </div>

              {leaderboards.topScorers.length > 0 ? (
                <div className="space-y-4">
                  {leaderboards.topScorers.map((player: any, index: number) => (
                    <Link
                      key={player.playerId}
                      to={`/users/${player.playerId}`}
                      className="flex items-center gap-4 bg-black/30 rounded-2xl p-4 hover:bg-black/40 transition-all border border-white/5"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-black text-lg shadow-lg">
                        {index + 1}
                      </div>

                      <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-white/20">
                        {player.photoURL ? (
                          <img src={player.photoURL} alt={player.playerName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">👤</span>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="font-bold text-white">{player.playerName || 'Unknown'}</div>
                        <div className="text-xs text-slate-400">{player.matches} matches</div>
                      </div>

                      <div className="text-3xl font-black text-red-400">{player.goals}</div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <div className="text-5xl mb-3 opacity-30">⚽</div>
                  <p>No scorers yet</p>
                </div>
              )}
            </div>

            {/* Top Assists */}
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl rounded-3xl border border-blue-500/20 p-8 shadow-2xl hover:shadow-blue-500/20 transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-4xl">🎯</div>
                <h3 className="text-2xl font-bold text-white">Top Assists</h3>
              </div>

              {leaderboards.topAssists.length > 0 ? (
                <div className="space-y-4">
                  {leaderboards.topAssists.map((player: any, index: number) => (
                    <Link
                      key={player.playerId}
                      to={`/users/${player.playerId}`}
                      className="flex items-center gap-4 bg-black/30 rounded-2xl p-4 hover:bg-black/40 transition-all border border-white/5"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 text-white font-black text-lg shadow-lg">
                        {index + 1}
                      </div>

                      <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-white/20">
                        {player.photoURL ? (
                          <img src={player.photoURL} alt={player.playerName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">👤</span>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="font-bold text-white">{player.playerName || 'Unknown'}</div>
                        <div className="text-xs text-slate-400">{player.matches} matches</div>
                      </div>

                      <div className="text-3xl font-black text-blue-400">{player.assists}</div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <div className="text-5xl mb-3 opacity-30">🎯</div>
                  <p>No assists yet</p>
                </div>
              )}
            </div>

            {/* Top Goalkeepers */}
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl rounded-3xl border border-purple-500/20 p-8 shadow-2xl hover:shadow-purple-500/20 transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-4xl">🧤</div>
                <h3 className="text-2xl font-bold text-white">Top Goalkeepers</h3>
              </div>

              {leaderboards.topGoalkeepers.length > 0 ? (
                <div className="space-y-4">
                  {leaderboards.topGoalkeepers.map((player: any, index: number) => (
                    <Link
                      key={player.playerId}
                      to={`/users/${player.playerId}`}
                      className="flex items-center gap-4 bg-black/30 rounded-2xl p-4 hover:bg-black/40 transition-all border border-white/5"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 text-white font-black text-lg shadow-lg">
                        {index + 1}
                      </div>

                      <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-white/20">
                        {player.photoURL ? (
                          <img src={player.photoURL} alt={player.playerName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">👤</span>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="font-bold text-white">{player.playerName || 'Unknown'}</div>
                        <div className="text-xs text-slate-400">{player.matches} matches</div>
                      </div>

                      <div className="text-3xl font-black text-purple-400">{player.cleanSheets}</div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <div className="text-5xl mb-3 opacity-30">🧤</div>
                  <p>No keepers yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-white mb-4">⚡ Quick Actions</h2>
            <p className="text-slate-400 text-lg">Get started with tournaments, teams, and matches</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link
              to="/teams"
              className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-md border border-blue-500/20 rounded-3xl p-8 hover:border-blue-500/40 transition-all text-center shadow-xl hover:shadow-2xl hover:shadow-blue-500/20"
            >
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-2xl font-bold text-white mb-2">Browse Teams</h3>
              <p className="text-slate-400 text-sm">Find and join football teams</p>
            </Link>

            <Link
              to={currentUser ? "/create-team" : "/login"}
              className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-md border border-green-500/20 rounded-3xl p-8 hover:border-green-500/40 transition-all text-center shadow-xl hover:shadow-2xl hover:shadow-green-500/20"
            >
              <div className="text-6xl mb-4">➕</div>
              <h3 className="text-2xl font-bold text-white mb-2">Create Team</h3>
              <p className="text-slate-400 text-sm">Start your own football team</p>
            </Link>

            <Link
              to={currentUser ? "/create-match" : "/login"}
              className="bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-md border border-orange-500/20 rounded-3xl p-8 hover:border-orange-500/40 transition-all text-center shadow-xl hover:shadow-2xl hover:shadow-orange-500/20"
            >
              <div className="text-6xl mb-4">⚽</div>
              <h3 className="text-2xl font-bold text-white mb-2">Create Match</h3>
              <p className="text-slate-400 text-sm">Set up a standalone match</p>
            </Link>

            <Link
              to="/tournaments"
              className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-md border border-purple-500/20 rounded-3xl p-8 hover:border-purple-500/40 transition-all text-center shadow-xl hover:shadow-2xl hover:shadow-purple-500/20"
            >
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-2xl font-bold text-white mb-2">All Tournaments</h3>
              <p className="text-slate-400 text-sm">Explore all tournaments</p>
            </Link>
          </div>
        </div>

        {/* Key Features Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-white mb-4">Powerful Features</h2>
            <p className="text-slate-400 text-lg">Everything you need to run professional tournaments</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all text-center">
              <div className="text-5xl mb-4">🏆</div>
              <h3 className="text-xl font-bold text-white mb-2">Multiple Organizers</h3>
              <p className="text-slate-400 text-sm">Add co-organizers to manage tournaments together</p>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all text-center">
              <div className="text-5xl mb-4">👥</div>
              <h3 className="text-xl font-bold text-white mb-2">Team Management</h3>
              <p className="text-slate-400 text-sm">Organizers have full control over teams and players</p>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all text-center">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-white mb-2">Auto Fixtures</h3>
              <p className="text-slate-400 text-sm">Automatic fixture generation and scheduling</p>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all text-center">
              <div className="text-5xl mb-4">📱</div>
              <h3 className="text-xl font-bold text-white mb-2">Real-time Updates</h3>
              <p className="text-slate-400 text-sm">Live scores, standings, and player statistics</p>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all text-center">
              <div className="text-5xl mb-4">🎨</div>
              <h3 className="text-xl font-bold text-white mb-2">Custom Branding</h3>
              <p className="text-slate-400 text-sm">Add tournament logos and team branding</p>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all text-center">
              <div className="text-5xl mb-4">🏠</div>
              <h3 className="text-xl font-bold text-white mb-2">Home Team Support</h3>
              <p className="text-slate-400 text-sm">Set home teams for your tournaments</p>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all text-center">
              <div className="text-5xl mb-4">📞</div>
              <h3 className="text-xl font-bold text-white mb-2">Phone Auth</h3>
              <p className="text-slate-400 text-sm">Secure authentication via mobile OTP</p>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all text-center">
              <div className="text-5xl mb-4">🔒</div>
              <h3 className="text-xl font-bold text-white mb-2">Role-Based Access</h3>
              <p className="text-slate-400 text-sm">Players, captains, organizers, and admins</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl rounded-3xl border border-green-500/20 p-12 text-center shadow-2xl">
          <h2 className="text-4xl font-black text-white mb-4">Ready to Get Started?</h2>
          <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
            Create your first tournament in minutes. Invite teams, generate fixtures automatically, and start tracking live scores today.
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-10 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full font-bold text-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-xl shadow-green-500/30 inline-flex items-center gap-2"
          >
            <span>🏆</span>
            <span>Create Your Tournament</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black/30 backdrop-blur-md border-t border-white/10 py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-slate-400">
          <p>&copy; 2024 Football Heroes. Built for the love of the game.</p>
        </div>
      </footer>
    </div>
  );
}

export default Home;
