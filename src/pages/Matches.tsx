import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Match, Team, User } from '../types';
import Header from '../components/Header';
import matchService from '../services/match.service';
import teamService from '../services/team.service';
import userService from '../services/user.service';

const Matches = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<{ [key: string]: Team }>({});
  const [users, setUsers] = useState<{ [key: string]: User }>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SCHEDULED' | 'ONGOING' | 'COMPLETED'>('ALL');

  useEffect(() => {
    loadMatches();
  }, []);

  useEffect(() => {
    filterMatches();
  }, [searchQuery, statusFilter, matches]);

  const loadMatches = async () => {
    try {
      setLoading(true);

      // Fetch all matches
      const matchesQuery = query(
        collection(db, 'matches'),
        orderBy('matchDate', 'desc')
      );
      const matchesSnapshot = await getDocs(matchesQuery);

      const matchesData: Match[] = [];
      const teamIds = new Set<string>();
      const userIds = new Set<string>();

      matchesSnapshot.forEach((doc) => {
        const match = { ...doc.data(), id: doc.id } as Match;
        matchesData.push(match);

        // Collect team IDs
        teamIds.add(match.homeTeamId);
        teamIds.add(match.awayTeamId);

        // Collect user IDs from internal matches
        if (match.isInternalMatch) {
          match.internalTeamA?.forEach(id => userIds.add(id));
          match.internalTeamB?.forEach(id => userIds.add(id));
        }

        // Collect user IDs from player stats
        match.playerStats?.forEach(stat => {
          if (!stat.playerId.startsWith('guest_')) {
            userIds.add(stat.playerId);
          }
        });
      });

      setMatches(matchesData);

      // Fetch teams
      const teamsMap: { [key: string]: Team } = {};
      await Promise.all(
        Array.from(teamIds).map(async (teamId) => {
          const team = await teamService.getTeamById(teamId);
          if (team) {
            teamsMap[teamId] = team;
            // Collect player IDs from teams
            team.playerIds.forEach(id => userIds.add(id));
          }
        })
      );
      setTeams(teamsMap);

      // Fetch users
      const usersMap: { [key: string]: User } = {};
      await Promise.all(
        Array.from(userIds).map(async (userId) => {
          const user = await userService.getUserById(userId);
          if (user) {
            usersMap[userId] = user;
          }
        })
      );
      setUsers(usersMap);

    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterMatches = () => {
    let filtered = [...matches];

    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(match => match.status === statusFilter);
    }

    // Filter by search query (player name or team name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();

      filtered = filtered.filter(match => {
        // Search in team names
        const homeTeam = teams[match.homeTeamId];
        const awayTeam = teams[match.awayTeamId];

        if (homeTeam?.name.toLowerCase().includes(query)) return true;
        if (awayTeam?.name.toLowerCase().includes(query)) return true;

        // Search in match name (for internal matches)
        if (match.matchName?.toLowerCase().includes(query)) return true;

        // Search in player names
        const allPlayerIds: string[] = [];

        if (match.isInternalMatch) {
          if (match.internalTeamA) allPlayerIds.push(...match.internalTeamA);
          if (match.internalTeamB) allPlayerIds.push(...match.internalTeamB);
        } else {
          if (homeTeam) allPlayerIds.push(...homeTeam.playerIds);
          if (awayTeam) allPlayerIds.push(...awayTeam.playerIds);
        }

        // Also search in players who have stats
        match.playerStats?.forEach(stat => {
          if (!stat.playerId.startsWith('guest_')) {
            allPlayerIds.push(stat.playerId);
          }
        });

        // Check if any player name matches
        const playerMatch = allPlayerIds.some(playerId => {
          const user = users[playerId];
          return user?.name.toLowerCase().includes(query);
        });

        return playerMatch;
      });
    }

    setFilteredMatches(filtered);
  };

  const getMatchStatusBadge = (status: string) => {
    const badges = {
      SCHEDULED: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      ONGOING: 'bg-green-500/20 text-green-300 border-green-500/40',
      COMPLETED: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
      CANCELLED: 'bg-red-500/20 text-red-300 border-red-500/40',
    };
    return badges[status as keyof typeof badges] || badges.SCHEDULED;
  };

  const formatDate = (date: any) => {
    if (!date) return 'TBD';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <Header />
        <div className="pt-20 px-4">
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto"></div>
              <p className="mt-6 text-slate-400 text-sm md:text-base">Loading matches...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Header />
      <div className="pt-20 px-4 pb-20">
        <div className="container mx-auto max-w-6xl">
          {/* Page Header */}
          <div className="text-center mb-8 md:mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
              ⚽ Matches
            </h1>
            <p className="text-slate-400 text-base md:text-lg">
              Browse all matches and search by player or team
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-8 space-y-4">
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by player name or team name..."
                  className="w-full px-6 py-4 bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm md:text-base"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400">
                  🔍
                </div>
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 flex-wrap justify-center">
              {(['ALL', 'SCHEDULED', 'ONGOING', 'COMPLETED'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 md:px-6 py-2 md:py-3 rounded-full font-bold transition-all text-sm md:text-base ${
                    statusFilter === status
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-xl shadow-green-500/30'
                      : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  {status === 'ALL' ? 'All Matches' : status.charAt(0) + status.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {/* Results Count */}
            {searchQuery && (
              <div className="text-center text-slate-400 text-sm md:text-base">
                Found {filteredMatches.length} match{filteredMatches.length !== 1 ? 'es' : ''}
              </div>
            )}
          </div>

          {/* Matches List */}
          {filteredMatches.length === 0 ? (
            <div className="text-center py-12 md:py-20">
              <div className="bg-slate-800/30 backdrop-blur-xl rounded-3xl border border-white/10 p-8 md:p-12 max-w-md mx-auto">
                <div className="text-6xl md:text-7xl mb-4 opacity-30">⚽</div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2">No matches found</h3>
                <p className="text-slate-400 text-sm md:text-base">
                  {searchQuery || statusFilter !== 'ALL'
                    ? 'Try different search terms or filters'
                    : 'No matches available yet'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 md:space-y-6">
              {filteredMatches.map((match) => {
                const homeTeam = teams[match.homeTeamId];
                const awayTeam = teams[match.awayTeamId];

                return (
                  <Link
                    key={match.id}
                    to={`/matches/${match.id}`}
                    className="block group bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden hover:bg-slate-800/70 hover:border-green-500/30 transition-all shadow-xl hover:shadow-2xl hover:shadow-green-500/10"
                  >
                    <div className="p-6 md:p-8">
                      {/* Status Badges */}
                      <div className="flex items-center gap-3 mb-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getMatchStatusBadge(match.status)}`}>
                          {match.status}
                        </span>
                        {match.isInternalMatch && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            Internal
                          </span>
                        )}
                      </div>

                      {/* Teams and Score */}
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 md:gap-6 mb-4">
                        {/* Home Team */}
                        <div className="text-center md:text-right">
                          <div className="text-white font-black text-xl md:text-2xl group-hover:text-green-400 transition-colors">
                            {match.isInternalMatch ? 'Team A' : homeTeam?.name || 'Unknown'}
                          </div>
                        </div>

                        {/* Score */}
                        <div className="flex flex-col items-center px-4 md:px-6">
                          <div className="text-3xl md:text-4xl font-black text-white bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                            {match.score.home} - {match.score.away}
                          </div>
                          {match.status === 'ONGOING' && (
                            <div className="text-xs text-green-400 font-bold mt-1 animate-pulse">
                              LIVE
                            </div>
                          )}
                        </div>

                        {/* Away Team */}
                        <div className="text-center md:text-left">
                          <div className="text-white font-black text-xl md:text-2xl group-hover:text-green-400 transition-colors">
                            {match.isInternalMatch ? 'Team B' : awayTeam?.name || 'Unknown'}
                          </div>
                        </div>
                      </div>

                      {/* Match Name for Internal Matches */}
                      {match.matchName && (
                        <div className="text-center text-slate-300 text-sm md:text-base mb-4 font-medium">
                          {match.matchName}
                        </div>
                      )}

                      {/* Date and Venue */}
                      <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm md:text-base text-slate-400 pt-4 border-t border-white/10">
                        <div className="flex items-center gap-2">
                          <span>📅</span>
                          <span>{formatDate(match.matchDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>📍</span>
                          <span>{match.venue}</span>
                        </div>
                        <div className="ml-auto text-green-400 font-bold group-hover:text-green-300 transition-colors">
                          View Details →
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Matches;
