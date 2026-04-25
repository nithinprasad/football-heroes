import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Match, Team, User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import followService from '../services/follow.service';
import matchService from '../services/match.service';
import teamService from '../services/team.service';
import userService from '../services/user.service';

const MyFeed = () => {
  const { currentUser } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [followedUsers, setFollowedUsers] = useState<{ [key: string]: User }>({});
  const [teams, setTeams] = useState<{ [key: string]: Team }>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'UPCOMING' | 'ONGOING'>('ALL');

  useEffect(() => {
    if (currentUser) {
      loadFeed();
    }
  }, [currentUser, filter]);

  const loadFeed = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);

      // Get users that current user is following
      const followingIds = await followService.getFollowing(currentUser.uid);

      if (followingIds.length === 0) {
        setMatches([]);
        setLoading(false);
        return;
      }

      // Load followed users data
      const usersMap: { [key: string]: User } = {};
      await Promise.all(
        followingIds.map(async (userId) => {
          const user = await userService.getUserById(userId);
          if (user) {
            usersMap[userId] = user;
          }
        })
      );
      setFollowedUsers(usersMap);

      // Get all teams that include these followed users
      const allTeams = await teamService.getAllTeams();
      const relevantTeams = allTeams.filter(team =>
        team.playerIds.some(playerId => followingIds.includes(playerId))
      );

      // Get matches for these teams
      const matchPromises = relevantTeams.map(team =>
        matchService.getMatchesByTeam(team.id)
      );
      const matchesArrays = await Promise.all(matchPromises);

      // Flatten and deduplicate matches
      const allMatches: Match[] = [];
      const matchIds = new Set<string>();
      matchesArrays.forEach(matchArray => {
        matchArray.forEach(match => {
          if (!matchIds.has(match.id)) {
            matchIds.add(match.id);
            allMatches.push(match);
          }
        });
      });

      // Filter matches based on selected filter
      let filteredMatches = allMatches;
      if (filter === 'UPCOMING') {
        filteredMatches = allMatches.filter(m => m.status === 'SCHEDULED');
      } else if (filter === 'ONGOING') {
        filteredMatches = allMatches.filter(m => m.status === 'ONGOING');
      }

      // Sort by date
      filteredMatches.sort((a, b) => {
        const dateA = a.matchDate instanceof Date ? a.matchDate : new Date(a.matchDate as any);
        const dateB = b.matchDate instanceof Date ? b.matchDate : new Date(b.matchDate as any);
        return dateB.getTime() - dateA.getTime();
      });

      setMatches(filteredMatches);

      // Load teams for matches
      const teamIds = new Set<string>();
      filteredMatches.forEach(match => {
        teamIds.add(match.homeTeamId);
        teamIds.add(match.awayTeamId);
      });

      const teamsMap: { [key: string]: Team } = {};
      await Promise.all(
        Array.from(teamIds).map(async (teamId) => {
          const team = await teamService.getTeamById(teamId);
          if (team) {
            teamsMap[teamId] = team;
          }
        })
      );
      setTeams(teamsMap);

    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
    }
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

  const getFollowedPlayersInMatch = (match: Match): User[] => {
    const players: User[] = [];
    const homeTeam = teams[match.homeTeamId];
    const awayTeam = teams[match.awayTeamId];

    if (homeTeam) {
      homeTeam.playerIds.forEach(playerId => {
        if (followedUsers[playerId]) {
          players.push(followedUsers[playerId]);
        }
      });
    }

    if (awayTeam) {
      awayTeam.playerIds.forEach(playerId => {
        if (followedUsers[playerId]) {
          players.push(followedUsers[playerId]);
        }
      });
    }

    return players;
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 pt-20 px-4">
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto"></div>
              <p className="mt-6 text-slate-400 text-sm md:text-base">Loading your feed...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 pt-20 px-4 pb-20">
        <div className="container mx-auto max-w-6xl">
          {/* Page Header */}
          <div className="text-center mb-8 md:mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
              📢 My Feed
            </h1>
            <p className="text-slate-400 text-base md:text-lg">
              Matches from players you follow
            </p>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 flex-wrap justify-center mb-8">
            {(['ALL', 'UPCOMING', 'ONGOING'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 md:px-6 py-2 md:py-3 rounded-full font-bold transition-all text-sm md:text-base ${
                  filter === status
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-xl shadow-green-500/30'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                {status === 'ALL' ? 'All Matches' : status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Matches List */}
          {Object.keys(followedUsers).length === 0 ? (
            <div className="text-center py-12 md:py-20">
              <div className="bg-slate-800/30 backdrop-blur-xl rounded-3xl border border-white/10 p-8 md:p-12 max-w-md mx-auto">
                <div className="text-6xl md:text-7xl mb-4 opacity-30">👥</div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2">No followed players</h3>
                <p className="text-slate-400 mb-6 text-sm md:text-base">
                  Start following players to see their matches here
                </p>
                <Link
                  to="/teams"
                  className="inline-block px-6 md:px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full font-bold hover:from-green-600 hover:to-emerald-700 transition-all text-sm md:text-base"
                >
                  Browse Teams
                </Link>
              </div>
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-12 md:py-20">
              <div className="bg-slate-800/30 backdrop-blur-xl rounded-3xl border border-white/10 p-8 md:p-12 max-w-md mx-auto">
                <div className="text-6xl md:text-7xl mb-4 opacity-30">⚽</div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2">No matches found</h3>
                <p className="text-slate-400 text-sm md:text-base">
                  No {filter.toLowerCase()} matches from players you follow
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 md:space-y-6">
              {matches.map((match) => {
                const homeTeam = teams[match.homeTeamId];
                const awayTeam = teams[match.awayTeamId];
                const followedPlayers = getFollowedPlayersInMatch(match);

                return (
                  <Link
                    key={match.id}
                    to={`/matches/${match.id}`}
                    className="block group bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden hover:bg-slate-800/70 hover:border-green-500/30 transition-all shadow-xl hover:shadow-2xl hover:shadow-green-500/10"
                  >
                    <div className="p-6 md:p-8">
                      {/* Status Badges */}
                      <div className="flex items-center gap-3 mb-4 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getMatchStatusBadge(match.status)}`}>
                          {match.status}
                        </span>
                        {followedPlayers.length > 0 && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                            {followedPlayers.length} {followedPlayers.length === 1 ? 'Player' : 'Players'} you follow
                          </span>
                        )}
                      </div>

                      {/* Teams and Score */}
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 md:gap-6 mb-4">
                        {/* Home Team */}
                        <div className="text-center md:text-right">
                          <div className="text-white font-black text-xl md:text-2xl group-hover:text-green-400 transition-colors">
                            {homeTeam?.name || 'Unknown'}
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
                            {awayTeam?.name || 'Unknown'}
                          </div>
                        </div>
                      </div>

                      {/* Followed Players */}
                      {followedPlayers.length > 0 && (
                        <div className="mb-4 pb-4 border-b border-white/10">
                          <div className="flex flex-wrap gap-2">
                            {followedPlayers.map(player => (
                              <span key={player.id} className="px-2 py-1 bg-slate-700/50 rounded-full text-xs text-slate-300">
                                {player.name}
                              </span>
                            ))}
                          </div>
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
    </>
  );
};

export default MyFeed;
