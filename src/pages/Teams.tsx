import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import teamService from '../services/team.service';
import { Team } from '../types';
import Header from '../components/Header';

function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    // Filter teams based on search query and organize by membership
    if (searchQuery.trim() === '') {
      setFilteredTeams(teams);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = teams.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          (t.teamId && t.teamId.toLowerCase().includes(query)) ||
          (t.location && t.location.toLowerCase().includes(query))
      );
      setFilteredTeams(filtered);
    }
  }, [searchQuery, teams]);

  // Separate teams into "my teams" and "other teams"
  const myTeams = filteredTeams.filter((team) =>
    currentUser && team.playerIds.includes(currentUser.uid)
  );
  const otherTeams = filteredTeams.filter((team) =>
    !currentUser || !team.playerIds.includes(currentUser.uid)
  );

  const loadTeams = async () => {
    setLoading(true);
    try {
      const data = await teamService.getAllTeams();
      setTeams(data);
      setFilteredTeams(data);
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation */}
      <Header />

      <div className="container mx-auto px-4 py-6 md:py-8 pt-20">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">👥 Teams</h1>
          <p className="text-slate-400 text-base md:text-lg">Browse and join football teams</p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-6 md:mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search teams by name, location or Team ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm md:text-base"
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400">
              🔍
            </div>
          </div>
        </div>

        {/* Create Team Button */}
        <div className="flex justify-center mb-6 md:mb-8">
          <Link
            to={currentUser ? "/create-team" : "/login"}
            className="px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-xl shadow-green-500/30 text-sm md:text-base"
          >
            + Create Team
          </Link>
        </div>

        {/* Results Count */}
        {searchQuery && (
          <div className="mb-4 text-slate-400 text-sm md:text-base">
            Found {filteredTeams.length} team{filteredTeams.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Teams Sections */}
        {loading ? (
          <div className="text-center py-12 md:py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-6 text-slate-400 text-sm md:text-base">Loading teams...</p>
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="text-center py-12 md:py-20">
            <div className="bg-slate-800/30 backdrop-blur-xl rounded-3xl border border-white/10 p-8 md:p-12 max-w-md mx-auto">
              <div className="text-6xl md:text-7xl mb-4 opacity-30">👥</div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">No teams found</h3>
              <p className="text-slate-400 mb-6 text-sm md:text-base">
                {searchQuery ? 'Try different search terms' : 'Be the first to create one!'}
              </p>
              {!searchQuery && (
                <Link
                  to={currentUser ? "/create-team" : "/login"}
                  className="inline-block px-6 md:px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full font-bold hover:from-green-600 hover:to-emerald-700 transition-all text-sm md:text-base"
                >
                  Create Team
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* My Teams Section */}
            {currentUser && myTeams.length > 0 && (
              <div className="mb-10">
                <div className="mb-6">
                  <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
                    <span>⭐</span>
                    <span>My Teams</span>
                    <span className="text-lg text-slate-400 font-normal">({myTeams.length})</span>
                  </h2>
                  <p className="text-slate-400 text-sm md:text-base mt-2">Teams you're a member of</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {myTeams.map((team) => (
                    <Link
                      key={team.id}
                      to={`/teams/${team.id}`}
                      className="group bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden hover:bg-slate-800/70 hover:border-green-500/30 transition-all shadow-xl hover:shadow-2xl hover:shadow-green-500/10"
                    >
                      {/* Team Header */}
                      <div className="relative h-32 md:h-40 bg-gradient-to-br from-green-500/20 to-blue-500/20 p-4 md:p-6 flex items-center justify-center">
                        {team.logoURL ? (
                          <img src={team.logoURL} alt={team.name} className="w-20 h-20 md:w-24 md:h-24 object-contain" />
                        ) : (
                          <div className="text-6xl md:text-7xl">⚽</div>
                        )}
                      </div>

                      {/* Team Info */}
                      <div className="p-4 md:p-6">
                        <h3 className="text-lg md:text-xl font-bold text-white mb-2 group-hover:text-green-400 transition-colors line-clamp-2">
                          {team.name}
                        </h3>

                        <div className="space-y-2 text-xs md:text-sm text-slate-400 mb-4">
                          {team.location && (
                            <div className="flex items-center gap-2">
                              <span>📍</span>
                              <span className="truncate">{team.location}</span>
                            </div>
                          )}
                          {team.teamId && (
                            <div className="flex items-center gap-2">
                              <span>🆔</span>
                              <code className="px-2 py-0.5 bg-slate-700/50 rounded text-green-400 font-mono text-xs">
                                {team.teamId}
                              </code>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span>👥</span>
                            <span>{team.playerIds.length} Player{team.playerIds.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>

                        {/* View Button */}
                        <div className="pt-4 border-t border-white/10">
                          <div className="text-green-400 font-bold text-center group-hover:text-green-300 transition-colors text-sm md:text-base">
                            View Team →
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Other Teams Section */}
            {otherTeams.length > 0 && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
                    <span>🌐</span>
                    <span>{currentUser && myTeams.length > 0 ? 'Other Teams' : 'All Teams'}</span>
                    <span className="text-lg text-slate-400 font-normal">({otherTeams.length})</span>
                  </h2>
                  <p className="text-slate-400 text-sm md:text-base mt-2">
                    {currentUser && myTeams.length > 0 ? 'Discover and join more teams' : 'Browse available teams'}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {otherTeams.map((team) => (
                    <Link
                      key={team.id}
                      to={`/teams/${team.id}`}
                      className="group bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden hover:bg-slate-800/70 hover:border-green-500/30 transition-all shadow-xl hover:shadow-2xl hover:shadow-green-500/10"
                    >
                      {/* Team Header */}
                      <div className="relative h-32 md:h-40 bg-gradient-to-br from-green-500/20 to-blue-500/20 p-4 md:p-6 flex items-center justify-center">
                        {team.logoURL ? (
                          <img src={team.logoURL} alt={team.name} className="w-20 h-20 md:w-24 md:h-24 object-contain" />
                        ) : (
                          <div className="text-6xl md:text-7xl">⚽</div>
                        )}
                      </div>

                      {/* Team Info */}
                      <div className="p-4 md:p-6">
                        <h3 className="text-lg md:text-xl font-bold text-white mb-2 group-hover:text-green-400 transition-colors line-clamp-2">
                          {team.name}
                        </h3>

                        <div className="space-y-2 text-xs md:text-sm text-slate-400 mb-4">
                          {team.location && (
                            <div className="flex items-center gap-2">
                              <span>📍</span>
                              <span className="truncate">{team.location}</span>
                            </div>
                          )}
                          {team.teamId && (
                            <div className="flex items-center gap-2">
                              <span>🆔</span>
                              <code className="px-2 py-0.5 bg-slate-700/50 rounded text-green-400 font-mono text-xs">
                                {team.teamId}
                              </code>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span>👥</span>
                            <span>{team.playerIds.length} Player{team.playerIds.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>

                        {/* View Button */}
                        <div className="pt-4 border-t border-white/10">
                          <div className="text-green-400 font-bold text-center group-hover:text-green-300 transition-colors text-sm md:text-base">
                            View Team →
                          </div>
                        </div>
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

export default Teams;
