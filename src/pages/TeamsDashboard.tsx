import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import teamService from '../services/team.service';
import { Team } from '../types';

function TeamsDashboard() {
  const { userProfile, currentUser } = useAuth();
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [managedTeams, setManagedTeams] = useState<Team[]>([]);
  const [captainTeams, setCaptainTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      loadTeamsData();
    }
  }, [currentUser]);

  const loadTeamsData = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);

      // Get user's teams from profile
      const teamIds = userProfile?.teamIds || [];

      if (teamIds.length > 0) {
        const teams = await teamService.getTeamsByIds(teamIds);
        setMyTeams(teams);

        // Filter teams where user is manager
        const managed = teams.filter(team => team.managerId === currentUser.uid);
        setManagedTeams(managed);

        // Filter teams where user is captain
        const captain = teams.filter(team => team.captainId === currentUser.uid);
        setCaptainTeams(captain);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
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
          <div className="flex gap-3 md:gap-4 items-center">
            <Link to="/dashboard" className="text-white/80 hover:text-white text-sm md:text-base">
              Dashboard
            </Link>
            <Link to="/tournaments" className="text-white/80 hover:text-white text-sm md:text-base">
              Tournaments
            </Link>
            <Link to="/teams" className="text-white/80 hover:text-white text-sm md:text-base">
              Browse Teams
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-2">👥 My Teams</h1>
            <p className="text-slate-400 text-base md:text-lg">Manage your football teams</p>
          </div>
          <Link
            to="/create-team"
            className="px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-xl shadow-green-500/30 text-sm md:text-base"
          >
            + Create New Team
          </Link>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl rounded-3xl border border-green-500/20 p-6 md:p-8 text-center">
            <div className="text-5xl md:text-6xl font-black text-green-400 mb-2">{myTeams.length}</div>
            <div className="text-slate-300 font-medium">Total Teams</div>
          </div>
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl rounded-3xl border border-blue-500/20 p-6 md:p-8 text-center">
            <div className="text-5xl md:text-6xl font-black text-blue-400 mb-2">{managedTeams.length}</div>
            <div className="text-slate-300 font-medium">Teams I Manage</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-xl rounded-3xl border border-yellow-500/20 p-6 md:p-8 text-center">
            <div className="text-5xl md:text-6xl font-black text-yellow-400 mb-2">{captainTeams.length}</div>
            <div className="text-slate-300 font-medium">Teams I Captain</div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 md:py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-6 text-slate-400 text-sm md:text-base">Loading teams...</p>
          </div>
        ) : myTeams.length === 0 ? (
          <div className="text-center py-12 md:py-20">
            <div className="bg-slate-800/30 backdrop-blur-xl rounded-3xl border border-white/10 p-8 md:p-12 max-w-md mx-auto">
              <div className="text-6xl md:text-7xl mb-4 opacity-30">👥</div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">No teams yet</h3>
              <p className="text-slate-400 mb-6 text-sm md:text-base">
                Create your first team to get started!
              </p>
              <Link
                to="/create-team"
                className="inline-block px-6 md:px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full font-bold hover:from-green-600 hover:to-emerald-700 transition-all text-sm md:text-base"
              >
                Create Team
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Teams I Manage */}
            {managedTeams.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl md:text-3xl font-black text-white mb-4 md:mb-6">🔧 Teams I Manage</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {managedTeams.map((team) => (
                    <div
                      key={team.id}
                      className="group bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl rounded-3xl border border-green-500/20 hover:border-green-500/40 transition-all shadow-xl hover:shadow-2xl hover:shadow-green-500/20"
                    >
                      <Link to={`/teams/${team.id}`} className="block p-6">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-700/50 rounded-2xl flex items-center justify-center">
                            {team.logoURL ? (
                              <img src={team.logoURL} alt={team.name} className="w-full h-full object-contain p-2" />
                            ) : (
                              <span className="text-3xl md:text-4xl">⚽</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-white group-hover:text-green-400 transition-colors line-clamp-1">
                              {team.name}
                            </h3>
                            {team.teamId && (
                              <code className="text-xs text-green-400 font-mono">{team.teamId}</code>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2 text-sm mb-4">
                          <div className="flex items-center gap-2 text-slate-400">
                            <span>👥</span>
                            <span>{team.playerIds.length} player{team.playerIds.length !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-green-400 text-xs font-bold">
                              Manager
                            </span>
                            {team.captainId === currentUser?.uid && (
                              <span className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-yellow-400 text-xs font-bold">
                                Captain
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>

                      {/* Quick Actions */}
                      <div className="px-6 pb-6 pt-2 border-t border-white/10 flex gap-2">
                        <Link
                          to={`/teams/${team.id}/manage`}
                          className="flex-1 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-white rounded-xl text-xs font-medium transition-all text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          ⚙️ Manage
                        </Link>
                        <Link
                          to={`/teams/${team.id}/internal-match`}
                          className="flex-1 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-400 rounded-xl text-xs font-bold transition-all text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          ⚔️ Internal
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Teams I Captain (but don't manage) */}
            {captainTeams.filter(t => t.managerId !== currentUser?.uid).length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl md:text-3xl font-black text-white mb-4 md:mb-6">⭐ Teams I Captain</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {captainTeams.filter(t => t.managerId !== currentUser?.uid).map((team) => (
                    <div
                      key={team.id}
                      className="group bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-xl rounded-3xl border border-yellow-500/20 hover:border-yellow-500/40 transition-all shadow-xl hover:shadow-2xl hover:shadow-yellow-500/20"
                    >
                      <Link to={`/teams/${team.id}`} className="block p-6">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-700/50 rounded-2xl flex items-center justify-center">
                            {team.logoURL ? (
                              <img src={team.logoURL} alt={team.name} className="w-full h-full object-contain p-2" />
                            ) : (
                              <span className="text-3xl md:text-4xl">⚽</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-white group-hover:text-yellow-400 transition-colors line-clamp-1">
                              {team.name}
                            </h3>
                            {team.teamId && (
                              <code className="text-xs text-yellow-400 font-mono">{team.teamId}</code>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2 text-sm mb-4">
                          <div className="flex items-center gap-2 text-slate-400">
                            <span>👥</span>
                            <span>{team.playerIds.length} player{team.playerIds.length !== 1 ? 's' : ''}</span>
                          </div>
                          <span className="inline-block px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-yellow-400 text-xs font-bold">
                            Captain
                          </span>
                        </div>
                      </Link>

                      {/* Quick Actions */}
                      <div className="px-6 pb-6 pt-2 border-t border-white/10">
                        <Link
                          to={`/teams/${team.id}/internal-match`}
                          className="block px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-400 rounded-xl text-xs font-bold transition-all text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          ⚔️ Start Internal Match
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Other Teams I'm Part Of */}
            {myTeams.filter(t => t.managerId !== currentUser?.uid && t.captainId !== currentUser?.uid).length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl md:text-3xl font-black text-white mb-4 md:mb-6">⚽ Other Teams</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {myTeams.filter(t => t.managerId !== currentUser?.uid && t.captainId !== currentUser?.uid).map((team) => (
                    <Link
                      key={team.id}
                      to={`/teams/${team.id}`}
                      className="group bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 p-6 hover:bg-slate-800/70 hover:border-blue-500/30 transition-all shadow-xl"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-700/50 rounded-2xl flex items-center justify-center">
                          {team.logoURL ? (
                            <img src={team.logoURL} alt={team.name} className="w-full h-full object-contain p-2" />
                          ) : (
                            <span className="text-3xl md:text-4xl">⚽</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                            {team.name}
                          </h3>
                          {team.teamId && (
                            <code className="text-xs text-blue-400 font-mono">{team.teamId}</code>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-slate-400">
                          <span>👥</span>
                          <span>{team.playerIds.length} player{team.playerIds.length !== 1 ? 's' : ''}</span>
                        </div>
                        <span className="inline-block px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-400 text-xs font-bold">
                          Player
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default TeamsDashboard;
