import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import tournamentService from '../services/tournament.service';
import matchService from '../services/match.service';
import teamService from '../services/team.service';
import userService from '../services/user.service';
import tournamentJoinRequestService from '../services/tournamentJoinRequest.service';
import { Tournament, Match, Team, User } from '../types';
import StandingsCalculator from '../utils/standingsCalculator';
import JoinTournamentModal from '../components/JoinTournamentModal';
import ManageTeamsModal from '../components/ManageTeamsModal';
import ImageUpload from '../components/ImageUpload';
import { handleError } from '../utils/errorHandler';

function TournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const toast = useToast();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<{ [key: string]: Team }>({});
  const [standings, setStandings] = useState<any>(null);
  const [topScorers, setTopScorers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'fixtures' | 'standings' | 'stats' | 'teams'>('fixtures');
  const [loading, setLoading] = useState(true);
  const [canScore, setCanScore] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [editingLogo, setEditingLogo] = useState(false);

  useEffect(() => {
    if (id) {
      loadTournamentData();
    }
  }, [id, currentUser, userProfile]);

  const loadTournamentData = async () => {
    try {
      const [tournamentData, matchesData] = await Promise.all([
        tournamentService.getTournamentById(id!),
        matchService.getMatchesByTournament(id!),
      ]);

      setTournament(tournamentData);
      setMatches(matchesData);

      // Check if user can score and is organizer
      if (currentUser && tournamentData) {
        const userIsOrganizer = tournamentData.organizerIds.includes(currentUser.uid);
        const isScorer = tournamentData.scorerIds?.includes(currentUser.uid);
        const isAdmin = userProfile?.roles?.includes('admin');
        const finalIsOrganizer = userIsOrganizer || isAdmin || false;

        console.log('👤 User access check:', {
          userId: currentUser.uid,
          userIsOrganizer,
          isAdmin,
          finalIsOrganizer,
          organizerIds: tournamentData.organizerIds
        });

        setIsOrganizer(finalIsOrganizer);
        setCanScore(userIsOrganizer || isScorer || isAdmin || false);

        // Load pending requests count if organizer
        if (finalIsOrganizer) {
          const count = await tournamentJoinRequestService.getPendingRequestsCount(id!);
          console.log('📋 Pending join requests count:', count);
          setPendingRequestsCount(count);
        }
      }

      if (tournamentData) {
        // Load teams
        const teamsData = await teamService.getTeamsByIds(tournamentData.teamIds);
        const teamsMap: { [key: string]: Team } = {};
        teamsData.forEach((team) => {
          teamsMap[team.id] = team;
        });
        setTeams(teamsMap);

        // Calculate standings
        const completedMatches = matchesData.filter((m) => m.status === 'COMPLETED');
        if (completedMatches.length > 0) {
          const standingsData = StandingsCalculator.calculateStandings(
            completedMatches,
            tournamentData.pointsForWin,
            tournamentData.pointsForDraw,
            tournamentData.pointsForLoss
          );
          setStandings(standingsData);

          // Calculate top scorers from match stats
          const scorersMap: any = {};
          completedMatches.forEach((match) => {
            match.playerStats?.forEach((stat) => {
              if (!scorersMap[stat.playerId]) {
                scorersMap[stat.playerId] = { goals: 0, assists: 0, matches: 0 };
              }
              scorersMap[stat.playerId].goals += stat.goals;
              scorersMap[stat.playerId].assists += stat.assists;
              scorersMap[stat.playerId].matches += 1;
            });
          });

          const scorersArray = Object.entries(scorersMap)
            .map(([playerId, stats]: [string, any]) => ({ playerId, ...stats }))
            .sort((a, b) => b.goals - a.goals)
            .slice(0, 5);

          // Load player details
          const playersData = await Promise.all(
            scorersArray.map(async (scorer) => {
              const user = await userService.getUserById(scorer.playerId);
              return { ...scorer, playerName: user?.name || 'Unknown', photoURL: user?.photoURL };
            })
          );

          setTopScorers(playersData);
        }
      }
    } catch (error) {
      console.error('Error loading tournament:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: any) => {
    const d = date instanceof Date ? date : new Date(date.seconds * 1000);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateTime = (date: any) => {
    const d = date instanceof Date ? date : new Date(date.seconds * 1000);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleLogoUpload = async (file: File): Promise<string> => {
    try {
      const url = await tournamentService.uploadTournamentLogo(id!, file);
      toast.success('Tournament logo updated!', 'Success!');
      await loadTournamentData();
      setEditingLogo(false);
      return url;
    } catch (error: any) {
      throw new Error(handleError(error, 'Upload Logo'));
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      SCHEDULED: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Upcoming', pulse: false },
      ONGOING: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: '🔴 LIVE', pulse: true },
      COMPLETED: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30', label: 'Finished', pulse: false },
    };
    const badge = badges[status] || badges.SCHEDULED;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border} ${badge.pulse ? 'animate-pulse' : ''}`}>
        {badge.label}
      </span>
    );
  };

  const getTournamentStatusBadge = (status: string) => {
    const badges: any = {
      UPCOMING: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
      ONGOING: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
      COMPLETED: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
    };
    const badge = badges[status] || badges.UPCOMING;
    return (
      <span className={`px-4 py-1 rounded-full text-sm font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
        {status}
      </span>
    );
  };

  const groupMatchesByStage = (matches: Match[]) => {
    const grouped: { [key: string]: Match[] } = {};
    matches.forEach((match) => {
      const key = match.groupName || match.stage;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(match);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading tournament...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 opacity-30">🏆</div>
          <p className="text-slate-400 mb-4 text-lg">Tournament not found</p>
          <Link to="/tournaments" className="text-green-400 hover:text-green-300 font-medium">
            ← Back to Tournaments
          </Link>
        </div>
      </div>
    );
  }

  const groupedMatches = groupMatchesByStage(matches);
  const liveMatches = matches.filter((m) => m.status === 'ONGOING');
  const upcomingMatches = matches.filter((m) => m.status === 'SCHEDULED');
  const champion = standings?.overallStandings?.[0] || standings?.groupStandings?.[Object.keys(standings.groupStandings)[0]]?.[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation */}
      <nav className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Link to="/tournaments" className="text-green-400 hover:text-green-300 font-medium text-sm md:text-base">
            ← Back to Tournaments
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Tournament Header */}
        <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 backdrop-blur-xl rounded-3xl border border-white/10 p-6 md:p-10 mb-6 md:mb-8 shadow-2xl">
          {editingLogo && isOrganizer ? (
            <div className="mb-6 pb-6 border-b border-white/10">
              <ImageUpload
                currentImageUrl={tournament.logoURL}
                onUpload={handleLogoUpload}
                label="Tournament Logo"
                placeholder="🏆"
              />
              <button
                onClick={() => setEditingLogo(false)}
                className="mt-3 px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 text-sm"
              >
                Cancel
              </button>
            </div>
          ) : null}

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Logo */}
            <div className="relative">
              {tournament.logoURL ? (
                <img src={tournament.logoURL} alt={tournament.name} className="w-24 h-24 md:w-32 md:h-32 object-contain rounded-2xl bg-white/5 p-4" />
              ) : (
                <div className="w-24 h-24 md:w-32 md:h-32 bg-slate-800/50 rounded-2xl flex items-center justify-center text-5xl md:text-6xl">
                  🏆
                </div>
              )}
              {isOrganizer && !editingLogo && (
                <button
                  onClick={() => setEditingLogo(true)}
                  className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white text-sm shadow-lg transition-all"
                  title="Edit logo"
                >
                  ✏️
                </button>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                {getTournamentStatusBadge(tournament.status)}
                <span className="px-4 py-1 bg-white/10 backdrop-blur-sm text-white rounded-full text-sm font-medium border border-white/20">
                  {tournament.format.replace('_', ' + ')}
                </span>
                <span className="px-4 py-1 bg-white/10 backdrop-blur-sm text-white rounded-full text-sm font-medium border border-white/20">
                  {tournament.teamSize}-a-side
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white mb-4">{tournament.name}</h1>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-xs md:text-sm text-slate-300">
                <div>
                  <span className="block text-slate-500 mb-1">📍 Location</span>
                  <span className="font-medium">{tournament.location}</span>
                </div>
                <div>
                  <span className="block text-slate-500 mb-1">📅 Dates</span>
                  <span className="font-medium">{formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}</span>
                </div>
                <div>
                  <span className="block text-slate-500 mb-1">👥 Teams</span>
                  <span className="font-medium text-green-400 text-lg md:text-xl">{tournament.teamIds.length}</span>
                </div>
                <div>
                  <span className="block text-slate-500 mb-1">⚽ Matches</span>
                  <span className="font-medium text-blue-400 text-lg md:text-xl">{matches.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Share & Invite Section */}
          <div className="mt-6 pt-6 border-t border-white/10 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1">
              {tournament.inviteCode && (
                <div>
                  <span className="text-slate-400 text-sm block mb-2">🔗 Invite Code for Teams:</span>
                  <div className="flex items-center gap-3">
                    <code className="px-4 py-2 bg-black/30 rounded-lg text-green-400 font-mono text-xl md:text-2xl font-bold tracking-wider border border-green-500/30">
                      {tournament.inviteCode}
                    </code>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                const url = `${window.location.origin}/tournaments/${tournament.id}`;
                navigator.clipboard.writeText(url);
                toast.success('Tournament link copied to clipboard!', 'Copied!');
              }}
              className="px-6 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 rounded-xl font-bold transition-all flex items-center gap-2"
            >
              <span>📋</span>
              <span>Share Tournament</span>
            </button>
            {!isOrganizer && currentUser && (
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <span>🎯</span>
                <span>Join Tournament</span>
              </button>
            )}
          </div>

          {/* Organizer Controls */}
          {isOrganizer && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-400 text-sm font-bold">
                  ⚙️ Organizer Access
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={async () => {
                    if (confirm('Generate fixtures for all teams? This will create matches based on the tournament format.')) {
                      try {
                        await tournamentService.generateFixtures(tournament.id);
                        toast.success('Fixtures generated successfully!', 'Success!');
                        loadTournamentData();
                      } catch (error: any) {
                        toast.error(error.message || 'Failed to generate fixtures', 'Error');
                      }
                    }
                  }}
                  className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 rounded-lg font-medium transition-all text-sm"
                >
                  📅 Generate Fixtures
                </button>
                <button
                  onClick={() => setShowManageModal(true)}
                  className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-400 rounded-lg font-medium transition-all text-sm relative"
                >
                  👥 Manage Teams
                  {pendingRequestsCount > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full min-w-[20px] text-center">
                      {pendingRequestsCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    toast.info('Tournament settings feature coming soon!', 'Coming Soon');
                  }}
                  className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-400 rounded-lg font-medium transition-all text-sm"
                >
                  ⚙️ Settings
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Champion Banner */}
        {tournament.status === 'COMPLETED' && champion && (
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-xl rounded-3xl border border-yellow-500/30 p-6 md:p-8 mb-6 md:mb-8 text-center shadow-2xl">
            <div className="text-5xl md:text-6xl mb-3">🏆</div>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-2">Champions</h2>
            <div className="text-xl md:text-2xl font-bold text-yellow-400">
              {teams[champion.teamId]?.name || 'Champion'}
            </div>
            <p className="text-slate-400 mt-2 text-sm md:text-base">{champion.points} points • {champion.wins} wins</p>
          </div>
        )}

        {/* Live Matches Alert */}
        {liveMatches.length > 0 && (
          <div className="bg-green-500/10 backdrop-blur-xl rounded-2xl border border-green-500/30 p-4 md:p-6 mb-6 md:mb-8 animate-pulse">
            <div className="flex items-center gap-3 text-green-400 font-bold text-sm md:text-base">
              <span className="text-xl md:text-2xl">🔴</span>
              <span>{liveMatches.length} match{liveMatches.length !== 1 ? 'es' : ''} currently live!</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 md:gap-3 mb-6 md:mb-8 overflow-x-auto pb-2">
          {['fixtures', 'standings', 'stats', 'teams'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold whitespace-nowrap transition-all text-sm md:text-base capitalize ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                  : 'bg-slate-800/50 backdrop-blur-xl text-slate-300 border border-white/10 hover:bg-slate-800/70'
              }`}
            >
              {tab === 'fixtures' && '📅 '}
              {tab === 'standings' && '📊 '}
              {tab === 'stats' && '⚡ '}
              {tab === 'teams' && '👥 '}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'fixtures' && (
          <div className="space-y-6 md:space-y-8">
            {matches.length === 0 ? (
              <div className="bg-slate-800/30 backdrop-blur-xl rounded-3xl border border-white/10 p-8 md:p-12 text-center">
                <div className="text-6xl mb-4 opacity-30">⚽</div>
                <p className="text-slate-400 text-sm md:text-base">No matches scheduled yet</p>
              </div>
            ) : (
              Object.entries(groupedMatches).map(([group, groupMatches]) => (
                <div key={group}>
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-4">{group}</h3>
                  <div className="space-y-3 md:space-y-4">
                    {groupMatches.map((match) => (
                      <div
                        key={match.id}
                        className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-6 hover:bg-slate-800/70 transition-all"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                          <span className="text-xs md:text-sm text-slate-400">
                            {formatDateTime(match.matchDate)} • 📍 {match.venue}
                          </span>
                          {getStatusBadge(match.status)}
                        </div>

                        <div className="flex items-center justify-between mb-4">
                          <div className="flex-1 text-center md:text-left">
                            <div className="text-base md:text-lg font-bold text-white">
                              {teams[match.homeTeamId]?.name || 'TBD'}
                            </div>
                          </div>

                          <div className="px-4 md:px-8">
                            {match.status === 'COMPLETED' || match.status === 'ONGOING' ? (
                              <div className="text-3xl md:text-4xl font-black text-white">
                                {match.score.home} - {match.score.away}
                              </div>
                            ) : (
                              <div className="text-2xl text-slate-500 font-bold">vs</div>
                            )}
                          </div>

                          <div className="flex-1 text-center md:text-right">
                            <div className="text-base md:text-lg font-bold text-white">
                              {teams[match.awayTeamId]?.name || 'TBD'}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className={`pt-4 border-t border-white/10 ${canScore && match.status !== 'COMPLETED' ? 'flex gap-3 justify-center' : 'text-center'}`}>
                          {canScore && match.status !== 'COMPLETED' && (
                            <button
                              onClick={() => navigate(`/matches/${match.id}/score`)}
                              className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/20 text-sm"
                            >
                              {match.status === 'ONGOING' ? '🔴 Continue Scoring' : '▶️ Start Match'}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              const url = `${window.location.origin}/tournaments/${tournament.id}`;
                              navigator.clipboard.writeText(url);
                              toast.success('Match link copied! Share it for live score updates.', 'Copied!');
                            }}
                            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 rounded-xl font-medium transition-all text-sm"
                          >
                            📋 Share
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'standings' && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden">
            {!standings ? (
              <div className="p-8 md:p-12 text-center text-slate-400">
                <div className="text-6xl mb-4 opacity-30">📊</div>
                <p className="text-sm md:text-base">Standings will appear after matches are completed</p>
              </div>
            ) : standings.groupStandings ? (
              <div className="p-4 md:p-6 space-y-6 md:space-y-8">
                {Object.entries(standings.groupStandings).map(([groupName, groupData]: [string, any]) => (
                  <div key={groupName}>
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-4">{groupName}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs md:text-sm">
                        <thead className="bg-slate-900/50">
                          <tr className="text-slate-400">
                            <th className="px-3 md:px-4 py-2 md:py-3 text-left font-bold">Pos</th>
                            <th className="px-3 md:px-4 py-2 md:py-3 text-left font-bold">Team</th>
                            <th className="px-2 md:px-3 py-2 md:py-3 text-center font-bold">P</th>
                            <th className="px-2 md:px-3 py-2 md:py-3 text-center font-bold">W</th>
                            <th className="px-2 md:px-3 py-2 md:py-3 text-center font-bold">D</th>
                            <th className="px-2 md:px-3 py-2 md:py-3 text-center font-bold">L</th>
                            <th className="px-2 md:px-3 py-2 md:py-3 text-center font-bold">GF</th>
                            <th className="px-2 md:px-3 py-2 md:py-3 text-center font-bold">GA</th>
                            <th className="px-2 md:px-3 py-2 md:py-3 text-center font-bold">GD</th>
                            <th className="px-3 md:px-4 py-2 md:py-3 text-center font-bold text-green-400">Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupData.map((standing: any, idx: number) => (
                            <tr
                              key={standing.teamId}
                              className={`border-t border-white/5 hover:bg-slate-900/30 transition-colors ${
                                idx === 0 ? 'bg-green-500/5' : ''
                              }`}
                            >
                              <td className="px-3 md:px-4 py-3 font-bold text-white">{standing.position}</td>
                              <td className="px-3 md:px-4 py-3 font-medium text-white">
                                <Link to={`/teams/${standing.teamId}`} className="hover:text-green-400 transition-colors">
                                  {teams[standing.teamId]?.name || standing.teamId}
                                </Link>
                              </td>
                              <td className="px-2 md:px-3 py-3 text-center text-slate-300">{standing.matchesPlayed}</td>
                              <td className="px-2 md:px-3 py-3 text-center text-green-400">{standing.wins}</td>
                              <td className="px-2 md:px-3 py-3 text-center text-yellow-400">{standing.draws}</td>
                              <td className="px-2 md:px-3 py-3 text-center text-red-400">{standing.losses}</td>
                              <td className="px-2 md:px-3 py-3 text-center text-slate-300">{standing.goalsFor}</td>
                              <td className="px-2 md:px-3 py-3 text-center text-slate-300">{standing.goalsAgainst}</td>
                              <td className="px-2 md:px-3 py-3 text-center text-slate-300">{standing.goalDifference > 0 ? '+' : ''}{standing.goalDifference}</td>
                              <td className="px-3 md:px-4 py-3 text-center font-black text-green-400 text-base md:text-lg">{standing.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : standings.overallStandings ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs md:text-sm">
                  <thead className="bg-slate-900/50">
                    <tr className="text-slate-400">
                      <th className="px-3 md:px-4 py-2 md:py-3 text-left font-bold">Pos</th>
                      <th className="px-3 md:px-4 py-2 md:py-3 text-left font-bold">Team</th>
                      <th className="px-2 md:px-3 py-2 md:py-3 text-center font-bold">P</th>
                      <th className="px-2 md:px-3 py-2 md:py-3 text-center font-bold">W</th>
                      <th className="px-2 md:px-3 py-2 md:py-3 text-center font-bold">D</th>
                      <th className="px-2 md:px-3 py-2 md:py-3 text-center font-bold">L</th>
                      <th className="px-2 md:px-3 py-2 md:py-3 text-center font-bold">GF</th>
                      <th className="px-2 md:px-3 py-2 md:py-3 text-center font-bold">GA</th>
                      <th className="px-2 md:px-3 py-2 md:py-3 text-center font-bold">GD</th>
                      <th className="px-3 md:px-4 py-2 md:py-3 text-center font-bold text-green-400">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.overallStandings.map((standing: any, idx: number) => (
                      <tr
                        key={standing.teamId}
                        className={`border-t border-white/5 hover:bg-slate-900/30 transition-colors ${
                          idx === 0 ? 'bg-green-500/5' : ''
                        }`}
                      >
                        <td className="px-3 md:px-4 py-3 font-bold text-white">{standing.position}</td>
                        <td className="px-3 md:px-4 py-3 font-medium text-white">
                          <Link to={`/teams/${standing.teamId}`} className="hover:text-green-400 transition-colors">
                            {teams[standing.teamId]?.name || standing.teamId}
                          </Link>
                        </td>
                        <td className="px-2 md:px-3 py-3 text-center text-slate-300">{standing.matchesPlayed}</td>
                        <td className="px-2 md:px-3 py-3 text-center text-green-400">{standing.wins}</td>
                        <td className="px-2 md:px-3 py-3 text-center text-yellow-400">{standing.draws}</td>
                        <td className="px-2 md:px-3 py-3 text-center text-red-400">{standing.losses}</td>
                        <td className="px-2 md:px-3 py-3 text-center text-slate-300">{standing.goalsFor}</td>
                        <td className="px-2 md:px-3 py-3 text-center text-slate-300">{standing.goalsAgainst}</td>
                        <td className="px-2 md:px-3 py-3 text-center text-slate-300">{standing.goalDifference > 0 ? '+' : ''}{standing.goalDifference}</td>
                        <td className="px-3 md:px-4 py-3 text-center font-black text-green-400 text-base md:text-lg">{standing.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6 md:space-y-8">
            {/* Top Scorers */}
            <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 backdrop-blur-xl rounded-3xl border border-red-500/20 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-3xl md:text-4xl">⚽</div>
                <h3 className="text-2xl md:text-3xl font-bold text-white">Top Scorers</h3>
              </div>

              {topScorers.length > 0 ? (
                <div className="space-y-3 md:space-y-4">
                  {topScorers.map((player, index) => (
                    <Link
                      key={player.playerId}
                      to={`/users/${player.playerId}`}
                      className="flex items-center gap-4 bg-black/30 rounded-2xl p-4 hover:bg-black/40 transition-all"
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
                        <div className="font-bold text-white text-sm md:text-base">{player.playerName}</div>
                        <div className="text-xs text-slate-400">{player.matches} matches</div>
                      </div>

                      <div className="text-right">
                        <div className="text-3xl md:text-4xl font-black text-red-400">{player.goals}</div>
                        <div className="text-xs text-slate-400">{player.assists} assists</div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p className="text-sm md:text-base">No statistics available yet</p>
                </div>
              )}
            </div>

            {/* Tournament Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-6 text-center">
                <div className="text-3xl md:text-4xl font-black text-green-400 mb-2">{matches.filter(m => m.status === 'COMPLETED').length}</div>
                <div className="text-xs md:text-sm text-slate-400">Completed Matches</div>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-6 text-center">
                <div className="text-3xl md:text-4xl font-black text-blue-400 mb-2">{upcomingMatches.length}</div>
                <div className="text-xs md:text-sm text-slate-400">Upcoming Matches</div>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-6 text-center">
                <div className="text-3xl md:text-4xl font-black text-red-400 mb-2">
                  {matches.filter(m => m.status === 'COMPLETED').reduce((sum, m) => sum + m.score.home + m.score.away, 0)}
                </div>
                <div className="text-xs md:text-sm text-slate-400">Total Goals</div>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-6 text-center">
                <div className="text-3xl md:text-4xl font-black text-purple-400 mb-2">
                  {matches.filter(m => m.status === 'COMPLETED').length > 0
                    ? (matches.filter(m => m.status === 'COMPLETED').reduce((sum, m) => sum + m.score.home + m.score.away, 0) / matches.filter(m => m.status === 'COMPLETED').length).toFixed(1)
                    : '0'}
                </div>
                <div className="text-xs md:text-sm text-slate-400">Goals per Match</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {tournament.teamIds.map((teamId) => {
              const team = teams[teamId];
              if (!team) return null;

              const teamStanding = standings?.overallStandings?.find((s: any) => s.teamId === teamId) ||
                                   Object.values(standings?.groupStandings || {}).flat().find((s: any) => s.teamId === teamId);

              return (
                <Link
                  key={teamId}
                  to={`/teams/${teamId}`}
                  className="group bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:bg-slate-800/70 hover:border-green-500/30 transition-all"
                >
                  {/* Team Logo */}
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-700/50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    {team.logoURL ? (
                      <img src={team.logoURL} alt={team.name} className="w-full h-full object-contain p-2" />
                    ) : (
                      <span className="text-3xl md:text-4xl">⚽</span>
                    )}
                  </div>

                  <h4 className="text-lg md:text-xl font-bold text-white mb-2 group-hover:text-green-400 transition-colors">{team.name}</h4>
                  <p className="text-xs md:text-sm text-slate-400 mb-4">{team.playerIds.length} players</p>

                  {teamStanding && (
                    <div className="pt-4 border-t border-white/10 grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <div className="text-lg font-bold text-green-400">{teamStanding.points}</div>
                        <div className="text-slate-500">Points</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-white">{teamStanding.wins}-{teamStanding.draws}-{teamStanding.losses}</div>
                        <div className="text-slate-500">W-D-L</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-blue-400">{teamStanding.position}</div>
                        <div className="text-slate-500">Position</div>
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showJoinModal && tournament && (
        <JoinTournamentModal
          tournamentId={tournament.id}
          tournamentName={tournament.name}
          inviteCode={tournament.inviteCode || ''}
          onClose={() => setShowJoinModal(false)}
          onSuccess={() => {
            loadTournamentData();
          }}
        />
      )}

      {showManageModal && tournament && (
        <ManageTeamsModal
          tournamentId={tournament.id}
          onClose={() => setShowManageModal(false)}
          onUpdate={() => {
            loadTournamentData();
          }}
        />
      )}
    </div>
  );
}

export default TournamentDetail;
