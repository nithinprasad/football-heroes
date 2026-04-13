import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import tournamentService from '../services/tournament.service';
import matchService from '../services/match.service';
import teamService from '../services/team.service';
import { Tournament, Match, Team } from '../types';
import Header from '../components/Header';
import ProfileCompletePrompt from '../components/ProfileCompletePrompt';

function Dashboard() {
  const { userProfile, signOut, currentUser, updateProfile } = useAuth();
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [matchTeams, setMatchTeams] = useState<Record<string, Team>>({});
  const [loading, setLoading] = useState(true);
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadDashboardData();

      // Check if profile is incomplete and show prompt
      if (userProfile && (!userProfile.name || !userProfile.position)) {
        setShowProfilePrompt(true);
      }

      // Auto-sync mobile number from Firebase Auth if missing in Firestore profile
      if (userProfile && !userProfile.mobileNumber && currentUser.phoneNumber) {
        console.log('📱 Auto-syncing mobile number from Firebase Auth:', currentUser.phoneNumber);
        updateProfile({
          mobileNumber: currentUser.phoneNumber,
        }).then(() => {
          console.log('✅ Mobile number auto-synced and UI updated');
        }).catch((error) => {
          console.error('❌ Error auto-syncing mobile number:', error);
        });
      }
    }
  }, [currentUser, userProfile]);

  const loadDashboardData = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);

      // Get tournaments where user is organizer
      const tournaments = await tournamentService.getTournamentsByOrganizer(currentUser.uid);
      setMyTournaments(tournaments.slice(0, 5)); // Show last 5

      // Get user's teams from profile
      const teamIds = userProfile?.teamIds || [];

      // Load teams
      if (teamIds.length > 0) {
        const teamsData = await teamService.getTeamsByIds(teamIds);
        setMyTeams(teamsData);
      }

      // Get matches for user's teams
      if (teamIds.length > 0) {
        const matchPromises = teamIds.map((teamId) => matchService.getMatchesByTeam(teamId));
        const allMatches = await Promise.all(matchPromises);
        const flatMatches = allMatches.flat();

        // Remove duplicates by match ID
        const uniqueMatches = Array.from(
          new Map(flatMatches.map((match) => [match.id, match])).values()
        );

        // Sort by date descending and take last 10
        const sortedMatches = uniqueMatches.sort((a, b) => {
          const dateA = a.matchDate instanceof Date ? a.matchDate.getTime() : new Date((a.matchDate as any).seconds * 1000).getTime();
          const dateB = b.matchDate instanceof Date ? b.matchDate.getTime() : new Date((b.matchDate as any).seconds * 1000).getTime();
          return dateB - dateA;
        });

        const topMatches = sortedMatches.slice(0, 10);
        setRecentMatches(topMatches);

        // Load team data for matches
        const teamIdsToLoad = new Set<string>();
        topMatches.forEach((match) => {
          teamIdsToLoad.add(match.homeTeamId);
          teamIdsToLoad.add(match.awayTeamId);
        });

        const teamsData = await teamService.getTeamsByIds(Array.from(teamIdsToLoad));
        const teamsMap: Record<string, Team> = {};
        teamsData.forEach((team) => {
          teamsMap[team.id!] = team;
        });
        setMatchTeams(teamsMap);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'TBD';
    const d = date instanceof Date ? date : new Date(date.seconds * 1000);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (date: any) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date.seconds * 1000);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      SCHEDULED: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Upcoming' },
      ONGOING: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: 'Live' },
      COMPLETED: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30', label: 'Finished' },
    };
    const badge = badges[status] || badges.SCHEDULED;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Profile Complete Prompt */}
      {showProfilePrompt && (
        <ProfileCompletePrompt onClose={() => setShowProfilePrompt(false)} />
      )}
      {/* Navigation */}
      <Header />

      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Quick Actions - Mobile Horizontal Scroll, Desktop Grid */}
        <div className="mb-6 md:mb-8">
          <h3 className="text-2xl md:text-3xl font-black text-white mb-4 px-1">⚡ Quick Actions</h3>

          {/* Mobile: Horizontal Scroll */}
          <div className="md:hidden overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            <div className="flex gap-3 min-w-max">
              <Link
                to="/create-tournament"
                className="flex-shrink-0 w-48 bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-5 active:scale-95 transition-all"
              >
                <div className="text-4xl mb-3">🏆</div>
                <h4 className="text-white font-bold text-base mb-1">Create Tournament</h4>
                <p className="text-slate-400 text-xs">Organize full tournament</p>
              </Link>

              <Link
                to="/create-team"
                className="flex-shrink-0 w-48 bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl rounded-2xl border border-green-500/20 p-5 active:scale-95 transition-all"
              >
                <div className="text-4xl mb-3">👥</div>
                <h4 className="text-white font-bold text-base mb-1">Create Team</h4>
                <p className="text-slate-400 text-xs">Build your squad</p>
              </Link>

              <Link
                to="/create-match"
                className="flex-shrink-0 w-48 bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-xl rounded-2xl border border-orange-500/20 p-5 active:scale-95 transition-all"
              >
                <div className="text-4xl mb-3">⚽</div>
                <h4 className="text-white font-bold text-base mb-1">Quick Match</h4>
                <p className="text-slate-400 text-xs">Start match now</p>
              </Link>
            </div>
          </div>

          {/* Desktop: Grid */}
          <div className="hidden md:grid grid-cols-3 gap-4">
            <Link
              to="/create-tournament"
              className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6 hover:border-purple-500/40 hover:scale-105 transition-all group"
            >
              <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">🏆</div>
              <h4 className="text-white font-bold text-xl mb-2">Create Tournament</h4>
              <p className="text-slate-400 text-sm">Organize a full tournament with multiple teams</p>
            </Link>

            <Link
              to="/create-team"
              className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl rounded-2xl border border-green-500/20 p-6 hover:border-green-500/40 hover:scale-105 transition-all group"
            >
              <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">👥</div>
              <h4 className="text-white font-bold text-xl mb-2">Create Team</h4>
              <p className="text-slate-400 text-sm">Build your squad and invite players</p>
            </Link>

            <Link
              to="/create-match"
              className="bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-xl rounded-2xl border border-orange-500/20 p-6 hover:border-orange-500/40 hover:scale-105 transition-all group"
            >
              <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">⚽</div>
              <h4 className="text-white font-bold text-xl mb-2">Quick Match</h4>
              <p className="text-slate-400 text-sm">Start a friendly match right now</p>
            </Link>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl rounded-3xl border border-green-500/20 p-6 md:p-8 mb-6 md:mb-8 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Profile Photo */}
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border-4 border-green-500/30 shadow-xl flex-shrink-0">
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt={userProfile.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl md:text-6xl">👤</span>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-2">{userProfile?.name || 'Player'}</h2>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-4">
                {userProfile?.position && (
                  <span className="px-4 py-1 bg-white/10 backdrop-blur-sm text-white rounded-full text-sm font-medium border border-white/20">
                    {userProfile.position === 'Goalkeeper' && '🧤'}
                    {userProfile.position === 'Defender' && '🛡️'}
                    {userProfile.position === 'Midfielder' && '⚡'}
                    {userProfile.position === 'Forward' && '⚽'}
                    {' '}{userProfile.position}
                  </span>
                )}
                {userProfile?.jerseyNumber && (
                  <span className="px-4 py-1 bg-white/10 backdrop-blur-sm text-white rounded-full text-sm font-medium border border-white/20">
                    #{userProfile.jerseyNumber}
                  </span>
                )}
              </div>
              <Link
                to="/profile"
                className="inline-block px-6 py-2 bg-white/10 backdrop-blur-sm text-white rounded-full font-medium hover:bg-white/20 transition-all border border-white/20 text-sm md:text-base"
              >
                Edit Profile
              </Link>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        {userProfile?.statistics && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-6 md:mb-8">
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-6 text-center hover:bg-slate-800/70 transition-all">
              <div className="text-3xl md:text-4xl font-black text-white mb-1">{userProfile.statistics.matches}</div>
              <div className="text-xs md:text-sm text-slate-400">Matches</div>
            </div>
            <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 backdrop-blur-xl rounded-2xl border border-red-500/20 p-4 md:p-6 text-center hover:border-red-500/40 transition-all">
              <div className="text-3xl md:text-4xl font-black text-red-400 mb-1">{userProfile.statistics.goals}</div>
              <div className="text-xs md:text-sm text-slate-400">Goals</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl rounded-2xl border border-blue-500/20 p-4 md:p-6 text-center hover:border-blue-500/40 transition-all">
              <div className="text-3xl md:text-4xl font-black text-blue-400 mb-1">{userProfile.statistics.assists}</div>
              <div className="text-xs md:text-sm text-slate-400">Assists</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-xl rounded-2xl border border-yellow-500/20 p-4 md:p-6 text-center hover:border-yellow-500/40 transition-all">
              <div className="text-3xl md:text-4xl font-black text-yellow-400 mb-1">{userProfile.statistics.yellowCards}</div>
              <div className="text-xs md:text-sm text-slate-400">Yellow</div>
            </div>
            <div className="bg-gradient-to-br from-red-500/10 to-pink-500/10 backdrop-blur-xl rounded-2xl border border-red-500/20 p-4 md:p-6 text-center hover:border-red-500/40 transition-all">
              <div className="text-3xl md:text-4xl font-black text-red-400 mb-1">{userProfile.statistics.redCards}</div>
              <div className="text-xs md:text-sm text-slate-400">Red</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-4 md:p-6 text-center hover:border-purple-500/40 transition-all">
              <div className="text-3xl md:text-4xl font-black text-purple-400 mb-1">{userProfile.statistics.cleanSheets}</div>
              <div className="text-xs md:text-sm text-slate-400">Clean Sheets</div>
            </div>
          </div>
        )}

        {/* My Tournaments Section */}
        <div className="mb-6 md:mb-8">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h3 className="text-2xl md:text-3xl font-black text-white">🏆 My Tournaments</h3>
            <Link to="/tournaments" className="text-green-400 hover:text-green-300 text-sm md:text-base font-medium">
              View All →
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
              <p className="mt-4 text-slate-400">Loading...</p>
            </div>
          ) : myTournaments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {myTournaments.map((tournament) => (
                <Link
                  key={tournament.id}
                  to={`/tournaments/${tournament.id}`}
                  className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-6 hover:bg-slate-800/70 hover:border-green-500/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-bold text-white text-base md:text-lg">{tournament.name}</h4>
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                      tournament.status === 'UPCOMING' ? 'bg-blue-500/20 text-blue-400' :
                      tournament.status === 'ONGOING' ? 'bg-green-500/20 text-green-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {tournament.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs md:text-sm mb-2">📍 {tournament.location}</p>
                  <p className="text-slate-400 text-xs md:text-sm">
                    🗓️ {formatDate(tournament.startDate)}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-white/10 p-8 md:p-12 text-center">
              <div className="text-5xl md:text-6xl mb-4 opacity-30">🏆</div>
              <p className="text-slate-400 mb-4 text-sm md:text-base">You're not organizing any tournaments yet</p>
              <Link
                to="/create-tournament"
                className="inline-block px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full font-bold hover:from-green-600 hover:to-emerald-700 transition-all text-sm md:text-base"
              >
                Create Tournament
              </Link>
            </div>
          )}
        </div>

        {/* My Teams Section */}
        <div className="mb-6 md:mb-8">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h3 className="text-2xl md:text-3xl font-black text-white">👥 My Teams</h3>
            <Link to="/my-teams" className="text-green-400 hover:text-green-300 text-sm md:text-base font-medium">
              Manage Teams →
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
              <p className="mt-4 text-slate-400">Loading...</p>
            </div>
          ) : myTeams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {myTeams.map((team) => (
                <Link
                  key={team.id}
                  to={`/teams/${team.id}`}
                  className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-6 hover:bg-slate-800/70 hover:border-green-500/30 transition-all"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center">
                      {team.logoURL ? (
                        <img src={team.logoURL} alt={team.name} className="w-full h-full object-contain p-2" />
                      ) : (
                        <span className="text-2xl md:text-3xl">⚽</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-white text-base md:text-lg line-clamp-1">{team.name}</h4>
                      {team.teamId && (
                        <code className="text-xs text-green-400 font-mono">{team.teamId}</code>
                      )}
                    </div>
                  </div>
                  <div className="text-slate-400 text-xs md:text-sm">
                    👥 {team.playerIds?.length || 0} player{(team.playerIds?.length || 0) !== 1 ? 's' : ''}
                    {team.captainId === currentUser?.uid && (
                      <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/30 rounded text-yellow-400 text-xs font-bold">
                        Captain
                      </span>
                    )}
                    {team.managerId === currentUser?.uid && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 text-xs font-bold">
                        Manager
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-white/10 p-8 md:p-12 text-center">
              <div className="text-5xl md:text-6xl mb-4 opacity-30">👥</div>
              <p className="text-slate-400 mb-4 text-sm md:text-base">You're not part of any teams yet</p>
              <Link
                to="/create-team"
                className="inline-block px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full font-bold hover:from-green-600 hover:to-emerald-700 transition-all text-sm md:text-base"
              >
                Create Team
              </Link>
            </div>
          )}
        </div>

        {/* Recent Matches Section */}
        <div className="mb-6 md:mb-8">
          <h3 className="text-2xl md:text-3xl font-black text-white mb-4 md:mb-6">⚽ Recent Matches</h3>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
              <p className="mt-4 text-slate-400">Loading...</p>
            </div>
          ) : recentMatches.length > 0 ? (
            <div className="space-y-3 md:space-y-4">
              {recentMatches.map((match) => (
                <Link
                  key={match.id}
                  to={`/matches/${match.id}`}
                  className="block bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-6 hover:bg-slate-800/70 hover:border-green-500/30 transition-all cursor-pointer"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusBadge(match.status)}
                        <span className="text-xs md:text-sm text-slate-400">
                          {formatDate(match.matchDate)} • {formatTime(match.matchDate)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between md:justify-start gap-4 md:gap-8">
                        <div className="text-white font-bold text-sm md:text-base truncate max-w-[100px] md:max-w-[150px]">
                          {matchTeams[match.homeTeamId]?.name || 'Team'}
                        </div>
                        <div className="flex items-center gap-3 md:gap-4">
                          <div className="text-2xl md:text-3xl font-black text-white">{match.score.home}</div>
                          <div className="text-slate-500 font-bold">-</div>
                          <div className="text-2xl md:text-3xl font-black text-white">{match.score.away}</div>
                        </div>
                        <div className="text-white font-bold text-sm md:text-base truncate max-w-[100px] md:max-w-[150px]">
                          {matchTeams[match.awayTeamId]?.name || 'Team'}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs md:text-sm text-slate-400 text-right md:text-left">
                      📍 {match.venue}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-white/10 p-8 md:p-12 text-center">
              <div className="text-5xl md:text-6xl mb-4 opacity-30">⚽</div>
              <p className="text-slate-400 text-sm md:text-base">No matches yet. Join a team to get started!</p>
            </div>
          )}
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          <Link
            to="/tournaments"
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 md:p-6 hover:bg-white/10 transition-all text-center"
          >
            <div className="text-3xl md:text-4xl mb-2">🏆</div>
            <h3 className="text-sm md:text-base font-bold text-white">Tournaments</h3>
          </Link>

          <Link
            to="/profile"
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 md:p-6 hover:bg-white/10 transition-all text-center"
          >
            <div className="text-3xl md:text-4xl mb-2">👤</div>
            <h3 className="text-sm md:text-base font-bold text-white">My Profile</h3>
          </Link>

          {userProfile?.roles?.includes('admin') && (
            <Link
              to="/admin/tournaments"
              className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-md border border-green-500/30 rounded-2xl p-4 md:p-6 hover:border-green-500/50 transition-all text-center"
            >
              <div className="text-3xl md:text-4xl mb-2">⚙️</div>
              <h3 className="text-sm md:text-base font-bold text-green-400">Admin Panel</h3>
            </Link>
          )}

          <Link
            to="/my-teams"
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 md:p-6 hover:bg-white/10 transition-all text-center"
          >
            <div className="text-3xl md:text-4xl mb-2">👥</div>
            <h3 className="text-sm md:text-base font-bold text-white">My Teams</h3>
          </Link>

          <Link
            to="/teams"
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 md:p-6 hover:bg-white/10 transition-all text-center"
          >
            <div className="text-3xl md:text-4xl mb-2">🔍</div>
            <h3 className="text-sm md:text-base font-bold text-white">Browse Teams</h3>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
