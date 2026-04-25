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
      SCHEDULED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      ONGOING: 'bg-green-500/20 text-green-400 border-green-500/30',
      COMPLETED: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
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
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 px-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-4 text-white/60">Loading matches...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 px-4 pb-20">
        <div className="container mx-auto max-w-6xl">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              ⚽ Matches
            </h1>
            <p className="text-white/60 text-lg">
              Browse all matches and search by player or team
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by player name or team name..."
                className="w-full px-4 py-3 pl-12 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50"
              />
              <svg
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 flex-wrap">
              {(['ALL', 'SCHEDULED', 'ONGOING', 'COMPLETED'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    statusFilter === status
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/50'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {status === 'ALL' ? 'All Matches' : status.charAt(0) + status.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {/* Results Count */}
            <div className="text-white/60">
              Showing {filteredMatches.length} of {matches.length} matches
            </div>
          </div>

          {/* Matches List */}
          {filteredMatches.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">⚽</div>
              <p className="text-white/60 text-xl">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'No matches found matching your criteria'
                  : 'No matches available'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMatches.map((match) => {
                const homeTeam = teams[match.homeTeamId];
                const awayTeam = teams[match.awayTeamId];

                return (
                  <Link
                    key={match.id}
                    to={`/matches/${match.id}`}
                    className="block bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-green-500/50 transition-all group"
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Match Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getMatchStatusBadge(match.status)}`}>
                            {match.status}
                          </span>
                          {match.isInternalMatch && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                              Internal Match
                            </span>
                          )}
                        </div>

                        {/* Teams */}
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-2">
                          {/* Home Team */}
                          <div className="text-right md:text-left">
                            <div className="text-white font-bold text-lg group-hover:text-green-400 transition-colors">
                              {match.isInternalMatch ? 'Team A' : homeTeam?.name || 'Unknown Team'}
                            </div>
                          </div>

                          {/* Score */}
                          <div className="text-center px-4">
                            <div className="text-2xl font-bold text-white">
                              {match.score.home} - {match.score.away}
                            </div>
                          </div>

                          {/* Away Team */}
                          <div className="text-left md:text-right">
                            <div className="text-white font-bold text-lg group-hover:text-green-400 transition-colors">
                              {match.isInternalMatch ? 'Team B' : awayTeam?.name || 'Unknown Team'}
                            </div>
                          </div>
                        </div>

                        {/* Match Name for Internal Matches */}
                        {match.matchName && (
                          <div className="text-white/60 text-sm mb-2">
                            {match.matchName}
                          </div>
                        )}

                        {/* Date and Venue */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                          <div className="flex items-center gap-2">
                            <span>📅</span>
                            <span>{formatDate(match.matchDate)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>📍</span>
                            <span>{match.venue}</span>
                          </div>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="text-white/40 group-hover:text-green-400 group-hover:translate-x-1 transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Matches;
