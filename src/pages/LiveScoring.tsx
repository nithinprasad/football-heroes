import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import matchService from '../services/match.service';
import tournamentService from '../services/tournament.service';
import teamService from '../services/team.service';
import userService from '../services/user.service';
import { Match, Tournament, Team, User, PlayerMatchStats } from '../types';

function LiveScoring() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const toast = useToast();
  const [match, setMatch] = useState<Match | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [homePlayers, setHomePlayers] = useState<User[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<User[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isHalfTime, setIsHalfTime] = useState(false);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Assist selection modal state
  const [showAssistModal, setShowAssistModal] = useState(false);
  const [goalScorerId, setGoalScorerId] = useState<string | null>(null);
  const [goalScorerTeam, setGoalScorerTeam] = useState<'home' | 'away' | null>(null);

  // Substitution modal state
  const [showSubModal, setShowSubModal] = useState(false);
  const [subTeam, setSubTeam] = useState<'home' | 'away' | null>(null);
  const [playerOut, setPlayerOut] = useState<string | null>(null);
  const [playerIn, setPlayerIn] = useState<string | null>(null);

  useEffect(() => {
    if (id && currentUser) {
      loadMatchData();
    }
  }, [id, currentUser]);

  useEffect(() => {
    if (isRunning && !isHalfTime) {
      intervalRef.current = setInterval(() => {
        setCurrentTime((prev) => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isHalfTime]);

  const loadMatchData = async () => {
    try {
      const matchData = await matchService.getMatchById(id!);
      if (!matchData) {
        toast.error('Match not found', 'Error');
        navigate('/tournaments');
        return;
      }

      setMatch(matchData);
      setCurrentTime(matchData.currentTime || 0);
      setIsRunning(matchData.status === 'ONGOING');
      setIsHalfTime(matchData.halfTimeReached || false);

      // Load tournament and check permissions
      if (matchData.tournamentId) {
        const tournamentData = await tournamentService.getTournamentById(matchData.tournamentId);
        setTournament(tournamentData);

        // Check if user can manage (organizer or scorer)
        const isOrganizer = tournamentData?.organizerIds.includes(currentUser!.uid);
        const isScorer = tournamentData?.scorerIds?.includes(currentUser!.uid);
        const isAdmin = userProfile?.roles?.includes('admin');
        setCanManage(isOrganizer || isScorer || isAdmin || false);
      } else {
        // For standalone matches, check if user is the creator
        const isCreator = matchData.createdBy === currentUser?.uid;
        const isAdmin = userProfile?.roles?.includes('admin');
        setCanManage(isCreator || isAdmin || false);
        console.log('⚽ Standalone match permission check:', {
          isCreator,
          isAdmin,
          canManage: isCreator || isAdmin || false,
          createdBy: matchData.createdBy,
          currentUserId: currentUser?.uid,
        });
      }

      // Load teams and players
      const [home, away] = await Promise.all([
        teamService.getTeamById(matchData.homeTeamId),
        teamService.getTeamById(matchData.awayTeamId),
      ]);

      setHomeTeam(home);
      setAwayTeam(away);

      if (home) {
        // For internal matches, use internalTeamA, otherwise use home team playerIds
        const playerIds = matchData.isInternalMatch && matchData.internalTeamA
          ? matchData.internalTeamA
          : home.playerIds;
        const players = await Promise.all(playerIds.map((pid) => userService.getUserById(pid)));
        setHomePlayers(players.filter((p) => p !== null) as User[]);
      }

      if (away) {
        // For internal matches, use internalTeamB, otherwise use away team playerIds
        const playerIds = matchData.isInternalMatch && matchData.internalTeamB
          ? matchData.internalTeamB
          : away.playerIds;
        const players = await Promise.all(playerIds.map((pid) => userService.getUserById(pid)));
        setAwayPlayers(players.filter((p) => p !== null) as User[]);
      }
    } catch (error) {
      console.error('Error loading match:', error);
    } finally {
      setLoading(false);
    }
  };

  const startMatch = async () => {
    if (!match || !canManage) return;

    // Check if any other match is ongoing in this tournament
    if (tournament) {
      const tournamentMatches = await matchService.getMatchesByTournament(tournament.id);
      const ongoingMatch = tournamentMatches.find((m) => m.status === 'ONGOING' && m.id !== match.id);
      if (ongoingMatch) {
        toast.warning('Another match is already ongoing. Please complete it first.', 'Warning');
        return;
      }
    }

    try {
      await matchService.updateMatchStatus(id!, 'ONGOING');
      setMatch({ ...match, status: 'ONGOING', startedBy: currentUser!.uid, startedAt: new Date() });
      setIsRunning(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to start match', 'Error');
    }
  };

  const pauseMatch = () => {
    setIsRunning(false);
  };

  const resumeMatch = () => {
    if (!isHalfTime) {
      setIsRunning(true);
    }
  };

  const toggleHalfTime = () => {
    setIsHalfTime(!isHalfTime);
    if (!isHalfTime) {
      setIsRunning(false);
    }
  };

  const endMatch = async () => {
    if (!match || !canManage) return;

    const confirmed = await toast.confirm(
      'Are you sure you want to end this match? This will update all player statistics.',
      'End Match'
    );
    if (!confirmed) return;

    try {
      // Use updateMatchScore with completeMatch=true to update player career stats
      await matchService.updateMatchScore(id!, {
        homeScore: match.score.home,
        awayScore: match.score.away,
        playerStats: match.playerStats || [],
      }, true); // true = complete the match and update player stats

      toast.success('Match completed! Player statistics updated.', 'Success!');

      // Navigate to appropriate page
      if (match.tournamentId) {
        navigate(`/tournaments/${match.tournamentId}`);
      } else {
        navigate(`/matches/${id}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to end match', 'Error');
    }
  };

  const addPlayerEvent = async (playerId: string, eventType: 'goal' | 'assist' | 'yellowCard' | 'redCard' | 'owngoal') => {
    if (!match || !canManage) return;

    // For goals, show assist selection modal
    if (eventType === 'goal') {
      const isHomePlayer = homePlayers.some(p => p.id === playerId);
      const isAwayPlayer = awayPlayers.some(p => p.id === playerId);
      setGoalScorerId(playerId);
      setGoalScorerTeam(isHomePlayer ? 'home' : isAwayPlayer ? 'away' : null);
      setShowAssistModal(true);
      return;
    }

    // For other events, proceed normally
    await recordPlayerEvent(playerId, eventType);
  };

  const recordPlayerEvent = async (playerId: string, eventType: 'goal' | 'assist' | 'yellowCard' | 'redCard' | 'owngoal', assistedBy?: string) => {
    if (!match || !canManage) return;

    const playerStats = match.playerStats || [];
    const existingStatIndex = playerStats.findIndex((ps) => ps.playerId === playerId);

    // Determine if player is home or away
    const isHomePlayer = homePlayers.some(p => p.id === playerId);
    const isAwayPlayer = awayPlayers.some(p => p.id === playerId);

    // Calculate match minute
    const matchMinute = Math.floor(currentTime / 60);

    let updatedStats: PlayerMatchStats[];
    let newScore = { ...match.score };

    if (existingStatIndex >= 0) {
      updatedStats = [...playerStats];
      const stat = { ...updatedStats[existingStatIndex] };

      // Initialize events array if it doesn't exist
      if (!stat.events) stat.events = [];

      if (eventType === 'goal') {
        stat.goals += 1;
        // Add goal event with timing and optional assist
        const goalEvent: any = {
          type: 'goal',
          timestamp: new Date(),
          minute: matchMinute,
        };
        if (assistedBy) {
          goalEvent.assistedBy = assistedBy;
        }
        stat.events.push(goalEvent);

        // Update score
        if (isHomePlayer) newScore.home += 1;
        else if (isAwayPlayer) newScore.away += 1;
      } else if (eventType === 'owngoal') {
        stat.ownGoals = (stat.ownGoals || 0) + 1;
        stat.events.push({
          type: 'owngoal',
          timestamp: new Date(),
          minute: matchMinute,
        });
        // Own goal - increase opponent's score
        if (isHomePlayer) newScore.away += 1;
        else if (isAwayPlayer) newScore.home += 1;
      } else if (eventType === 'assist') {
        stat.assists += 1;
        stat.events.push({
          type: 'assist',
          timestamp: new Date(),
          minute: matchMinute,
        });
      } else if (eventType === 'yellowCard') {
        stat.yellowCards += 1;
        stat.events.push({
          type: 'yellow',
          timestamp: new Date(),
          minute: matchMinute,
        });
      } else if (eventType === 'redCard') {
        stat.redCards += 1;
        stat.events.push({
          type: 'red',
          timestamp: new Date(),
          minute: matchMinute,
        });
      }
      updatedStats[existingStatIndex] = stat;
    } else {
      const newStat: PlayerMatchStats = {
        playerId,
        goals: eventType === 'goal' ? 1 : 0,
        assists: eventType === 'assist' ? 1 : 0,
        yellowCards: eventType === 'yellowCard' ? 1 : 0,
        redCards: eventType === 'redCard' ? 1 : 0,
        ownGoals: eventType === 'owngoal' ? 1 : 0,
        events: [],
      };

      // Add event with timing
      if (eventType === 'goal') {
        const goalEvent: any = {
          type: 'goal',
          timestamp: new Date(),
          minute: matchMinute,
        };
        if (assistedBy) {
          goalEvent.assistedBy = assistedBy;
        }
        newStat.events!.push(goalEvent);

        // Update score
        if (isHomePlayer) newScore.home += 1;
        else if (isAwayPlayer) newScore.away += 1;
      } else if (eventType === 'owngoal') {
        newStat.events!.push({
          type: 'owngoal',
          timestamp: new Date(),
          minute: matchMinute,
        });
        if (isHomePlayer) newScore.away += 1;
        else if (isAwayPlayer) newScore.home += 1;
      } else if (eventType === 'assist') {
        newStat.events!.push({
          type: 'assist',
          timestamp: new Date(),
          minute: matchMinute,
        });
      } else if (eventType === 'yellowCard') {
        newStat.events!.push({
          type: 'yellow',
          timestamp: new Date(),
          minute: matchMinute,
        });
      } else if (eventType === 'redCard') {
        newStat.events!.push({
          type: 'red',
          timestamp: new Date(),
          minute: matchMinute,
        });
      }

      updatedStats = [...playerStats, newStat];
    }

    try {
      // Update both player stats and score if it's a goal or own goal
      if (eventType === 'goal' || eventType === 'owngoal') {
        await matchService.updateMatchScore(id!, {
          homeScore: newScore.home,
          awayScore: newScore.away,
          playerStats: updatedStats,
        }, false); // false = don't complete the match
        setMatch({ ...match, playerStats: updatedStats, score: newScore });
        toast.success(`${eventType === 'goal' ? 'Goal' : 'Own Goal'} recorded!`, 'Success!');
      } else {
        await matchService.updateMatchPlayerStats(id!, updatedStats);
        setMatch({ ...match, playerStats: updatedStats });
        toast.success(`${eventType === 'assist' ? 'Assist' : eventType === 'yellowCard' ? 'Yellow Card' : 'Red Card'} recorded!`, 'Success!');
      }
    } catch (error) {
      console.error('Error adding player event:', error);
      toast.error('Failed to record event', 'Error');
    }
  };

  const handleAssistSelection = async (assistPlayerId: string | null) => {
    if (!goalScorerId) return;

    // Record the goal with optional assist
    await recordPlayerEvent(goalScorerId, 'goal', assistPlayerId || undefined);

    // If an assist was selected, also record it for the assisting player
    if (assistPlayerId && goalScorerId !== assistPlayerId) {
      await recordPlayerEvent(assistPlayerId, 'assist');
    }

    // Close modal
    setShowAssistModal(false);
    setGoalScorerId(null);
    setGoalScorerTeam(null);
  };

  const openSubModal = (team: 'home' | 'away') => {
    setSubTeam(team);
    setPlayerOut(null);
    setPlayerIn(null);
    setShowSubModal(true);
  };

  const handleSubstitution = async () => {
    if (!match || !canManage || !subTeam || !playerOut || !playerIn) return;

    const matchMinute = Math.floor(currentTime / 60);

    try {
      // Update the lineup
      const updatedMatch = { ...match };

      if (subTeam === 'home') {
        updatedMatch.homeStarting = updatedMatch.homeStarting?.filter(id => id !== playerOut) || [];
        updatedMatch.homeStarting.push(playerIn);
        updatedMatch.homeSubs = updatedMatch.homeSubs?.filter(id => id !== playerIn) || [];
        updatedMatch.homeSubs.push(playerOut);
      } else {
        updatedMatch.awayStarting = updatedMatch.awayStarting?.filter(id => id !== playerOut) || [];
        updatedMatch.awayStarting.push(playerIn);
        updatedMatch.awaySubs = updatedMatch.awaySubs?.filter(id => id !== playerIn) || [];
        updatedMatch.awaySubs.push(playerOut);
      }

      // Add substitution event
      const substitution = {
        minute: matchMinute,
        playerOut,
        playerIn,
        team: subTeam,
        timestamp: new Date(),
      };

      updatedMatch.substitutions = [...(updatedMatch.substitutions || []), substitution];

      // Update in Firestore
      await matchService.updateMatchPlayerStats(id!, updatedMatch.playerStats || []);

      // Also update the lineup and substitutions
      const matchRef = await import('firebase/firestore').then(m => m.doc);
      const db = await import('../services/firebase').then(m => m.db);
      const docRef = matchRef(db, 'matches', id!);
      await import('firebase/firestore').then(m => m.updateDoc(docRef, {
        homeStarting: updatedMatch.homeStarting,
        homeSubs: updatedMatch.homeSubs,
        awayStarting: updatedMatch.awayStarting,
        awaySubs: updatedMatch.awaySubs,
        substitutions: updatedMatch.substitutions,
        updatedAt: new Date(),
      }));

      setMatch(updatedMatch);
      toast.success('Substitution recorded!', 'Success!');

      // Close modal
      setShowSubModal(false);
      setSubTeam(null);
      setPlayerOut(null);
      setPlayerIn(null);
    } catch (error) {
      console.error('Error recording substitution:', error);
      toast.error('Failed to record substitution', 'Error');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading match...</p>
        </div>
      </div>
    );
  }

  if (!match || !canManage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 opacity-30">🚫</div>
          <p className="text-white text-xl mb-2">Access Denied</p>
          <p className="text-slate-400 mb-6">You don't have permission to score this match</p>
          <Link to="/tournaments" className="text-green-400 hover:text-green-300 font-medium">
            ← Back to Tournaments
          </Link>
        </div>
      </div>
    );
  }

  const matchDuration = match.matchDuration || tournament?.matchDuration || 90;
  const halfTime = matchDuration / 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation */}
      <nav className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to={`/tournaments/${match.tournamentId}`} className="text-green-400 hover:text-green-300 font-medium">
            ← Back to Tournament
          </Link>
          {match.status === 'COMPLETED' && (
            <span className="px-4 py-2 bg-slate-500/20 text-slate-400 rounded-full text-sm font-bold border border-slate-500/30">
              Match Completed
            </span>
          )}
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Timer Display */}
        <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-xl rounded-3xl border border-red-500/30 p-8 mb-8 text-center shadow-2xl">
          <div className="text-7xl font-black text-white mb-2">{formatTime(currentTime)}</div>
          <div className="text-slate-400 text-lg">
            {isHalfTime ? '⏸️ Half Time' : isRunning ? '🔴 LIVE' : '⏸️ Paused'} • Match Duration: {matchDuration} mins
          </div>
        </div>

        {/* Score Display */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 p-8 mb-8 shadow-2xl">
          <div className="grid grid-cols-3 gap-8 items-center">
            {/* Home Team */}
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-4">{homeTeam?.name || 'Home'}</h3>
              <div className="text-7xl font-black text-green-400">{match.score.home}</div>
            </div>

            {/* VS */}
            <div className="text-center">
              <div className="text-4xl text-slate-500 font-bold">VS</div>
            </div>

            {/* Away Team */}
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-4">{awayTeam?.name || 'Away'}</h3>
              <div className="text-7xl font-black text-blue-400">{match.score.away}</div>
            </div>
          </div>
        </div>

        {/* Match Controls */}
        {match.status !== 'COMPLETED' && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 p-6 mb-8">
            <div className="flex flex-wrap gap-4 justify-center">
              {match.status === 'SCHEDULED' && (
                <button
                  onClick={startMatch}
                  className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 shadow-lg"
                >
                  ▶️ Start Match
                </button>
              )}

              {match.status === 'ONGOING' && (
                <>
                  {isRunning && !isHalfTime ? (
                    <button
                      onClick={pauseMatch}
                      className="px-8 py-4 bg-yellow-500/20 text-yellow-400 rounded-xl font-bold hover:bg-yellow-500/30 border border-yellow-500/30"
                    >
                      ⏸️ Pause
                    </button>
                  ) : (
                    !isHalfTime && (
                      <button
                        onClick={resumeMatch}
                        className="px-8 py-4 bg-green-500/20 text-green-400 rounded-xl font-bold hover:bg-green-500/30 border border-green-500/30"
                      >
                        ▶️ Resume
                      </button>
                    )
                  )}

                  <button
                    onClick={toggleHalfTime}
                    className="px-8 py-4 bg-blue-500/20 text-blue-400 rounded-xl font-bold hover:bg-blue-500/30 border border-blue-500/30"
                  >
                    {isHalfTime ? '▶️ End Half Time' : '⏸️ Half Time'}
                  </button>

                  <button
                    onClick={endMatch}
                    className="px-8 py-4 bg-red-500/20 text-red-400 rounded-xl font-bold hover:bg-red-500/30 border border-red-500/30"
                  >
                    ⏹️ End Match
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Goal Scorers */}
        {match.playerStats && match.playerStats.filter(s => s.goals > 0).length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 md:p-8 mb-8">
            <h3 className="text-2xl font-black text-white mb-6 text-center">⚽ SCORERS</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Home Team Scorers */}
              <div className="space-y-3">
                <h5 className="text-sm font-bold text-green-400 mb-3 pb-2 border-b border-green-500/20">
                  {homeTeam?.name} ⚽
                </h5>
                {match.playerStats
                  .filter(s => s.goals > 0 && homePlayers.some(p => p.id === s.playerId))
                  .map((stat) => {
                    const player = homePlayers.find(p => p.id === stat.playerId);
                    const goalEvents = stat.events?.filter(e => e.type === 'goal') || [];

                    return (
                      <Link
                        key={stat.playerId}
                        to={currentUser?.uid === stat.playerId ? '/profile' : `/users/${stat.playerId}`}
                        className="block p-3 bg-green-500/5 hover:bg-green-500/10 border-l-4 border-green-500/30 hover:border-green-500/50 rounded transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">⚽</span>
                          <p className="text-white font-bold">
                            {player?.name}
                            {stat.goals > 1 && <span className="text-green-400 ml-1">×{stat.goals}</span>}
                          </p>
                        </div>
                        {goalEvents.length > 0 && (
                          <div className="text-green-400 text-xs ml-7 space-y-1">
                            {goalEvents.map((event, idx) => {
                              const assistPlayer = event.assistedBy
                                ? [...homePlayers, ...awayPlayers].find(p => p.id === event.assistedBy)
                                : null;
                              return (
                                <div key={idx}>
                                  {event.minute !== undefined && <span className="font-bold">{event.minute}'</span>}
                                  {assistPlayer && (
                                    <span className="text-blue-400 ml-1">(Assist: {assistPlayer.name})</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                {match.playerStats.filter(s => s.goals > 0 && homePlayers.some(p => p.id === s.playerId)).length === 0 && (
                  <p className="text-slate-500 text-sm italic text-center py-4">No goals yet</p>
                )}
              </div>

              {/* Away Team Scorers */}
              <div className="space-y-3">
                <h5 className="text-sm font-bold text-blue-400 mb-3 pb-2 border-b border-blue-500/20 text-right">
                  ⚽ {awayTeam?.name}
                </h5>
                {match.playerStats
                  .filter(s => s.goals > 0 && awayPlayers.some(p => p.id === s.playerId))
                  .map((stat) => {
                    const player = awayPlayers.find(p => p.id === stat.playerId);
                    const goalEvents = stat.events?.filter(e => e.type === 'goal') || [];

                    return (
                      <Link
                        key={stat.playerId}
                        to={currentUser?.uid === stat.playerId ? '/profile' : `/users/${stat.playerId}`}
                        className="block p-3 bg-blue-500/5 hover:bg-blue-500/10 border-r-4 border-blue-500/30 hover:border-blue-500/50 rounded transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-end gap-2 mb-1">
                          <p className="text-white font-bold">
                            {player?.name}
                            {stat.goals > 1 && <span className="text-blue-400 ml-1">×{stat.goals}</span>}
                          </p>
                          <span className="text-lg">⚽</span>
                        </div>
                        {goalEvents.length > 0 && (
                          <div className="text-blue-400 text-xs mr-7 text-right space-y-1">
                            {goalEvents.map((event, idx) => {
                              const assistPlayer = event.assistedBy
                                ? [...homePlayers, ...awayPlayers].find(p => p.id === event.assistedBy)
                                : null;
                              return (
                                <div key={idx}>
                                  {event.minute !== undefined && <span className="font-bold">{event.minute}'</span>}
                                  {assistPlayer && (
                                    <span className="text-green-400 ml-1">(Assist: {assistPlayer.name})</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                {match.playerStats.filter(s => s.goals > 0 && awayPlayers.some(p => p.id === s.playerId)).length === 0 && (
                  <p className="text-slate-500 text-sm italic text-center py-4">No goals yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Own Goals Section */}
        {match.playerStats && match.playerStats.filter(s => s.ownGoals && s.ownGoals > 0).length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 md:p-8 mb-8">
            <h3 className="text-2xl font-black text-white mb-6 text-center">⚽🔴 OWN GOALS</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Home Team Own Goals */}
              <div className="space-y-3">
                <h5 className="text-sm font-bold text-red-400 mb-3 pb-2 border-b border-red-500/20">
                  {homeTeam?.name} ⚽🔴
                </h5>
                {match.playerStats
                  .filter(s => s.ownGoals && s.ownGoals > 0 && homePlayers.some(p => p.id === s.playerId))
                  .map((stat) => {
                    const player = homePlayers.find(p => p.id === stat.playerId);
                    const ownGoalEvents = stat.events?.filter(e => e.type === 'owngoal') || [];

                    return (
                      <Link
                        key={stat.playerId}
                        to={currentUser?.uid === stat.playerId ? '/profile' : `/users/${stat.playerId}`}
                        className="block p-3 bg-red-500/5 hover:bg-red-500/10 border-l-4 border-red-500/30 hover:border-red-500/50 rounded transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">⚽🔴</span>
                          <p className="text-white font-bold">
                            {player?.name}
                            {stat.ownGoals && stat.ownGoals > 1 && <span className="text-red-400 ml-1">×{stat.ownGoals}</span>}
                          </p>
                        </div>
                        {ownGoalEvents.length > 0 && (
                          <p className="text-red-400 text-xs ml-7">
                            {ownGoalEvents.map((event, idx) => {
                              const eventTime = event.timestamp instanceof Date
                                ? event.timestamp
                                : new Date((event.timestamp as any).seconds * 1000);
                              return (
                                <span key={idx}>
                                  {event.minute ? `${event.minute}'` : eventTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                  {idx < ownGoalEvents.length - 1 ? ', ' : ''}
                                </span>
                              );
                            })}
                          </p>
                        )}
                      </Link>
                    );
                  })}
                {match.playerStats.filter(s => s.ownGoals && s.ownGoals > 0 && homePlayers.some(p => p.id === s.playerId)).length === 0 && (
                  <p className="text-slate-500 text-sm italic text-center py-4">No own goals</p>
                )}
              </div>

              {/* Away Team Own Goals */}
              <div className="space-y-3">
                <h5 className="text-sm font-bold text-red-400 mb-3 pb-2 border-b border-red-500/20 text-right">
                  ⚽🔴 {awayTeam?.name}
                </h5>
                {match.playerStats
                  .filter(s => s.ownGoals && s.ownGoals > 0 && awayPlayers.some(p => p.id === s.playerId))
                  .map((stat) => {
                    const player = awayPlayers.find(p => p.id === stat.playerId);
                    const ownGoalEvents = stat.events?.filter(e => e.type === 'owngoal') || [];

                    return (
                      <Link
                        key={stat.playerId}
                        to={currentUser?.uid === stat.playerId ? '/profile' : `/users/${stat.playerId}`}
                        className="block p-3 bg-red-500/5 hover:bg-red-500/10 border-r-4 border-red-500/30 hover:border-red-500/50 rounded transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-end gap-2 mb-1">
                          <p className="text-white font-bold">
                            {player?.name}
                            {stat.ownGoals && stat.ownGoals > 1 && <span className="text-red-400 ml-1">×{stat.ownGoals}</span>}
                          </p>
                          <span className="text-lg">⚽🔴</span>
                        </div>
                        {ownGoalEvents.length > 0 && (
                          <p className="text-red-400 text-xs mr-7 text-right">
                            {ownGoalEvents.map((event, idx) => {
                              const eventTime = event.timestamp instanceof Date
                                ? event.timestamp
                                : new Date((event.timestamp as any).seconds * 1000);
                              return (
                                <span key={idx}>
                                  {event.minute ? `${event.minute}'` : eventTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                  {idx < ownGoalEvents.length - 1 ? ', ' : ''}
                                </span>
                              );
                            })}
                          </p>
                        )}
                      </Link>
                    );
                  })}
                {match.playerStats.filter(s => s.ownGoals && s.ownGoals > 0 && awayPlayers.some(p => p.id === s.playerId)).length === 0 && (
                  <p className="text-slate-500 text-sm italic text-center py-4">No own goals</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Substitutions Section */}
        {match.substitutions && match.substitutions.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 md:p-8 mb-8">
            <h3 className="text-2xl font-black text-white mb-6 text-center">🔄 SUBSTITUTIONS</h3>

            <div className="space-y-4">
              {match.substitutions.map((sub, idx) => {
                const playerOutData = [...homePlayers, ...awayPlayers].find(p => p.id === sub.playerOut);
                const playerInData = [...homePlayers, ...awayPlayers].find(p => p.id === sub.playerIn);
                const teamName = sub.team === 'home'
                  ? (match.isInternalMatch ? 'Team A' : homeTeam?.name)
                  : (match.isInternalMatch ? 'Team B' : awayTeam?.name);

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border ${
                      sub.team === 'home'
                        ? 'bg-green-500/5 border-green-500/20'
                        : 'bg-blue-500/5 border-blue-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🔄</span>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">{teamName}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-red-400 font-bold">⬇️ {playerOutData?.name || 'Unknown'}</span>
                            <span className="text-slate-500">→</span>
                            <span className="text-green-400 font-bold">⬆️ {playerInData?.name || 'Unknown'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-white">{sub.minute}'</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Player Actions */}
        {match.status !== 'COMPLETED' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Home Team Players */}
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl rounded-3xl border border-green-500/20 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">
                  {match.isInternalMatch ? 'Team A' : homeTeam?.name} Players
                </h3>
                {match.homeSubs && match.homeSubs.length > 0 && (
                  <button
                    onClick={() => openSubModal('home')}
                    className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl font-bold hover:bg-blue-500/30 border border-blue-500/30 text-sm"
                  >
                    🔄 Make Substitution
                  </button>
                )}
              </div>

              {/* Starting XI */}
              {match.homeStarting && match.homeStarting.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-green-400 mb-3">
                    ⭐ Starting XI ({match.homeStarting.length}/{match.teamSize || 11})
                  </h4>
                  <div className="space-y-3">
                    {homePlayers.filter(p => match.homeStarting?.includes(p.id)).map((player) => {
                      const stats = match.playerStats?.find((ps) => ps.playerId === player.id);
                      const position = match.playerPositions?.[player.id] || stats?.position || player.position;
                      return (
                        <div key={player.id} className="bg-green-500/5 border border-green-500/20 rounded-2xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-white/20">
                                {player.photoURL ? (
                                  <img src={player.photoURL} alt={player.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span>👤</span>
                                )}
                              </div>
                              <div>
                                <Link to={`/users/${player.id}`} className="font-bold text-white hover:text-green-400 transition-colors">
                                  {player.name}
                                </Link>
                                <div className="text-xs text-slate-400">
                                  {player.jerseyNumber && `#${player.jerseyNumber} • `}{position}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-slate-400">
                              ⚽ {stats?.goals || 0} 🎯 {stats?.assists || 0} 🟨 {stats?.yellowCards || 0} 🟥 {stats?.redCards || 0} ⚽🔴 {stats?.ownGoals || 0}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => addPlayerEvent(player.id, 'goal')}
                              className="flex-1 min-w-[80px] px-3 py-2 bg-green-500/20 text-green-400 rounded-lg font-bold hover:bg-green-500/30 border border-green-500/30 text-sm"
                            >
                              ⚽ Goal
                            </button>
                            <button
                              onClick={() => addPlayerEvent(player.id, 'owngoal')}
                              className="flex-1 min-w-[80px] px-3 py-2 bg-orange-500/20 text-orange-400 rounded-lg font-bold hover:bg-orange-500/30 border border-orange-500/30 text-sm"
                            >
                              ⚽🔴 OG
                            </button>
                            <button
                              onClick={() => addPlayerEvent(player.id, 'assist')}
                              className="flex-1 min-w-[80px] px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg font-bold hover:bg-blue-500/30 border border-blue-500/30 text-sm"
                            >
                              🎯 Assist
                            </button>
                            <button
                              onClick={() => addPlayerEvent(player.id, 'yellowCard')}
                              className="px-3 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg font-bold hover:bg-yellow-500/30 border border-yellow-500/30 text-sm"
                            >
                              🟨
                            </button>
                            <button
                              onClick={() => addPlayerEvent(player.id, 'redCard')}
                              className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg font-bold hover:bg-red-500/30 border border-red-500/30 text-sm"
                            >
                              🟥
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Substitutes */}
              {match.homeSubs && match.homeSubs.length > 0 && (
                <div>
                  <h4 className="text-lg font-bold text-slate-400 mb-3">
                    🔄 Substitutes ({match.homeSubs.length})
                  </h4>
                  <div className="space-y-3">
                    {homePlayers.filter(p => match.homeSubs?.includes(p.id)).map((player) => {
                      const stats = match.playerStats?.find((ps) => ps.playerId === player.id);
                      const position = match.playerPositions?.[player.id] || stats?.position || player.position;
                      return (
                        <div key={player.id} className="bg-black/30 rounded-2xl p-4 opacity-80">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-white/20">
                                {player.photoURL ? (
                                  <img src={player.photoURL} alt={player.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span>👤</span>
                                )}
                              </div>
                              <div>
                                <Link to={`/users/${player.id}`} className="font-bold text-white hover:text-green-400 transition-colors">
                                  {player.name}
                                </Link>
                                <div className="text-xs text-slate-400">
                                  {player.jerseyNumber && `#${player.jerseyNumber} • `}{position}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-slate-400">
                              ⚽ {stats?.goals || 0} 🎯 {stats?.assists || 0} 🟨 {stats?.yellowCards || 0} 🟥 {stats?.redCards || 0} ⚽🔴 {stats?.ownGoals || 0}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => addPlayerEvent(player.id, 'goal')}
                              className="flex-1 min-w-[80px] px-3 py-2 bg-green-500/20 text-green-400 rounded-lg font-bold hover:bg-green-500/30 border border-green-500/30 text-sm"
                            >
                              ⚽ Goal
                            </button>
                            <button
                              onClick={() => addPlayerEvent(player.id, 'owngoal')}
                              className="flex-1 min-w-[80px] px-3 py-2 bg-orange-500/20 text-orange-400 rounded-lg font-bold hover:bg-orange-500/30 border border-orange-500/30 text-sm"
                            >
                              ⚽🔴 OG
                            </button>
                            <button
                              onClick={() => addPlayerEvent(player.id, 'assist')}
                              className="flex-1 min-w-[80px] px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg font-bold hover:bg-blue-500/30 border border-blue-500/30 text-sm"
                            >
                              🎯 Assist
                            </button>
                            <button
                              onClick={() => addPlayerEvent(player.id, 'yellowCard')}
                              className="px-3 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg font-bold hover:bg-yellow-500/30 border border-yellow-500/30 text-sm"
                            >
                              🟨
                            </button>
                            <button
                              onClick={() => addPlayerEvent(player.id, 'redCard')}
                              className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg font-bold hover:bg-red-500/30 border border-red-500/30 text-sm"
                            >
                              🟥
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Fallback: Show all players if no lineup data */}
              {(!match.homeStarting || match.homeStarting.length === 0) && (
                <div className="space-y-3">
                  {homePlayers.map((player) => {
                    const stats = match.playerStats?.find((ps) => ps.playerId === player.id);
                    const position = match.playerPositions?.[player.id] || stats?.position || player.position;
                    return (
                      <div key={player.id} className="bg-black/30 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-white/20">
                              {player.photoURL ? (
                                <img src={player.photoURL} alt={player.name} className="w-full h-full object-cover" />
                              ) : (
                                <span>👤</span>
                              )}
                            </div>
                            <div>
                              <Link to={`/users/${player.id}`} className="font-bold text-white hover:text-green-400 transition-colors">
                                {player.name}
                              </Link>
                              <div className="text-xs text-slate-400">
                                {player.jerseyNumber && `#${player.jerseyNumber} • `}{position}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-slate-400">
                            ⚽ {stats?.goals || 0} 🎯 {stats?.assists || 0} 🟨 {stats?.yellowCards || 0} 🟥 {stats?.redCards || 0} ⚽🔴 {stats?.ownGoals || 0}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => addPlayerEvent(player.id, 'goal')}
                            className="flex-1 min-w-[80px] px-3 py-2 bg-green-500/20 text-green-400 rounded-lg font-bold hover:bg-green-500/30 border border-green-500/30 text-sm"
                          >
                            ⚽ Goal
                          </button>
                          <button
                            onClick={() => addPlayerEvent(player.id, 'owngoal')}
                            className="flex-1 min-w-[80px] px-3 py-2 bg-orange-500/20 text-orange-400 rounded-lg font-bold hover:bg-orange-500/30 border border-orange-500/30 text-sm"
                          >
                            ⚽🔴 OG
                          </button>
                          <button
                            onClick={() => addPlayerEvent(player.id, 'assist')}
                            className="flex-1 min-w-[80px] px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg font-bold hover:bg-blue-500/30 border border-blue-500/30 text-sm"
                          >
                            🎯 Assist
                          </button>
                          <button
                            onClick={() => addPlayerEvent(player.id, 'yellowCard')}
                            className="px-3 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg font-bold hover:bg-yellow-500/30 border border-yellow-500/30 text-sm"
                          >
                            🟨
                          </button>
                          <button
                            onClick={() => addPlayerEvent(player.id, 'redCard')}
                            className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg font-bold hover:bg-red-500/30 border border-red-500/30 text-sm"
                          >
                            🟥
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Away Team Players */}
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl rounded-3xl border border-blue-500/20 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">
                  {match.isInternalMatch ? 'Team B' : awayTeam?.name} Players
                </h3>
                {match.awaySubs && match.awaySubs.length > 0 && (
                  <button
                    onClick={() => openSubModal('away')}
                    className="px-4 py-2 bg-green-500/20 text-green-400 rounded-xl font-bold hover:bg-green-500/30 border border-green-500/30 text-sm"
                  >
                    🔄 Make Substitution
                  </button>
                )}
              </div>

              {/* Starting XI */}
              {match.awayStarting && match.awayStarting.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-blue-400 mb-3">
                    ⭐ Starting XI ({match.awayStarting.length}/{match.teamSize || 11})
                  </h4>
                  <div className="space-y-3">
                    {awayPlayers.filter(p => match.awayStarting?.includes(p.id)).map((player) => {
                      const stats = match.playerStats?.find((ps) => ps.playerId === player.id);
                      const position = match.playerPositions?.[player.id] || stats?.position || player.position;
                      return (
                        <div key={player.id} className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-white/20">
                                {player.photoURL ? (
                                  <img src={player.photoURL} alt={player.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span>👤</span>
                                )}
                              </div>
                              <div>
                                <Link to={`/users/${player.id}`} className="font-bold text-white hover:text-green-400 transition-colors">
                                  {player.name}
                                </Link>
                                <div className="text-xs text-slate-400">
                                  {player.jerseyNumber && `#${player.jerseyNumber} • `}{position}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-slate-400">
                              ⚽ {stats?.goals || 0} 🎯 {stats?.assists || 0} 🟨 {stats?.yellowCards || 0} 🟥 {stats?.redCards || 0} ⚽🔴 {stats?.ownGoals || 0}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => addPlayerEvent(player.id, 'goal')}
                              className="flex-1 min-w-[80px] px-3 py-2 bg-green-500/20 text-green-400 rounded-lg font-bold hover:bg-green-500/30 border border-green-500/30 text-sm"
                            >
                              ⚽ Goal
                            </button>
                            <button
                              onClick={() => addPlayerEvent(player.id, 'owngoal')}
                              className="flex-1 min-w-[80px] px-3 py-2 bg-orange-500/20 text-orange-400 rounded-lg font-bold hover:bg-orange-500/30 border border-orange-500/30 text-sm"
                            >
                              ⚽🔴 OG
                            </button>
                            <button
                              onClick={() => addPlayerEvent(player.id, 'assist')}
                              className="flex-1 min-w-[80px] px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg font-bold hover:bg-blue-500/30 border border-blue-500/30 text-sm"
                            >
                              🎯 Assist
                            </button>
                            <button
                              onClick={() => addPlayerEvent(player.id, 'yellowCard')}
                              className="px-3 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg font-bold hover:bg-yellow-500/30 border border-yellow-500/30 text-sm"
                            >
                              🟨
                            </button>
                            <button
                              onClick={() => addPlayerEvent(player.id, 'redCard')}
                              className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg font-bold hover:bg-red-500/30 border border-red-500/30 text-sm"
                            >
                              🟥
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Substitutes */}
              {match.awaySubs && match.awaySubs.length > 0 && (
                <div>
                  <h4 className="text-lg font-bold text-slate-400 mb-3">
                    🔄 Substitutes ({match.awaySubs.length})
                  </h4>
                  <div className="space-y-3">
                    {awayPlayers.filter(p => match.awaySubs?.includes(p.id)).map((player) => {
                      const stats = match.playerStats?.find((ps) => ps.playerId === player.id);
                      const position = match.playerPositions?.[player.id] || stats?.position || player.position;
                      return (
                        <div key={player.id} className="bg-black/30 rounded-2xl p-4 opacity-80">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-white/20">
                                {player.photoURL ? (
                                  <img src={player.photoURL} alt={player.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span>👤</span>
                                )}
                              </div>
                              <div>
                                <Link to={`/users/${player.id}`} className="font-bold text-white hover:text-green-400 transition-colors">
                                  {player.name}
                                </Link>
                                <div className="text-xs text-slate-400">
                                  {player.jerseyNumber && `#${player.jerseyNumber} • `}{position}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-slate-400">
                              ⚽ {stats?.goals || 0} 🎯 {stats?.assists || 0} 🟨 {stats?.yellowCards || 0} 🟥 {stats?.redCards || 0} ⚽🔴 {stats?.ownGoals || 0}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => addPlayerEvent(player.id, 'goal')}
                              className="flex-1 min-w-[80px] px-3 py-2 bg-green-500/20 text-green-400 rounded-lg font-bold hover:bg-green-500/30 border border-green-500/30 text-sm"
                            >
                              ⚽ Goal
                            </button>
                            <button
                              onClick={() => addPlayerEvent(player.id, 'owngoal')}
                              className="flex-1 min-w-[80px] px-3 py-2 bg-orange-500/20 text-orange-400 rounded-lg font-bold hover:bg-orange-500/30 border border-orange-500/30 text-sm"
                            >
                              ⚽🔴 OG
                            </button>
                            <button
                              onClick={() => addPlayerEvent(player.id, 'assist')}
                              className="flex-1 min-w-[80px] px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg font-bold hover:bg-blue-500/30 border border-blue-500/30 text-sm"
                            >
                              🎯 Assist
                            </button>
                            <button
                              onClick={() => addPlayerEvent(player.id, 'yellowCard')}
                              className="px-3 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg font-bold hover:bg-yellow-500/30 border border-yellow-500/30 text-sm"
                            >
                              🟨
                            </button>
                            <button
                              onClick={() => addPlayerEvent(player.id, 'redCard')}
                              className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg font-bold hover:bg-red-500/30 border border-red-500/30 text-sm"
                            >
                              🟥
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Fallback: Show all players if no lineup data */}
              {(!match.awayStarting || match.awayStarting.length === 0) && (
                <div className="space-y-3">
                  {awayPlayers.map((player) => {
                    const stats = match.playerStats?.find((ps) => ps.playerId === player.id);
                    const position = match.playerPositions?.[player.id] || stats?.position || player.position;
                    return (
                      <div key={player.id} className="bg-black/30 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-white/20">
                              {player.photoURL ? (
                                <img src={player.photoURL} alt={player.name} className="w-full h-full object-cover" />
                              ) : (
                                <span>👤</span>
                              )}
                            </div>
                            <div>
                              <Link to={`/users/${player.id}`} className="font-bold text-white hover:text-green-400 transition-colors">
                                {player.name}
                              </Link>
                              <div className="text-xs text-slate-400">
                                {player.jerseyNumber && `#${player.jerseyNumber} • `}{position}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-slate-400">
                            ⚽ {stats?.goals || 0} 🎯 {stats?.assists || 0} 🟨 {stats?.yellowCards || 0} 🟥 {stats?.redCards || 0} ⚽🔴 {stats?.ownGoals || 0}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => addPlayerEvent(player.id, 'goal')}
                            className="flex-1 min-w-[80px] px-3 py-2 bg-green-500/20 text-green-400 rounded-lg font-bold hover:bg-green-500/30 border border-green-500/30 text-sm"
                          >
                            ⚽ Goal
                          </button>
                          <button
                            onClick={() => addPlayerEvent(player.id, 'owngoal')}
                            className="flex-1 min-w-[80px] px-3 py-2 bg-orange-500/20 text-orange-400 rounded-lg font-bold hover:bg-orange-500/30 border border-orange-500/30 text-sm"
                          >
                            ⚽🔴 OG
                          </button>
                          <button
                            onClick={() => addPlayerEvent(player.id, 'assist')}
                            className="flex-1 min-w-[80px] px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg font-bold hover:bg-blue-500/30 border border-blue-500/30 text-sm"
                          >
                            🎯 Assist
                          </button>
                          <button
                            onClick={() => addPlayerEvent(player.id, 'yellowCard')}
                            className="px-3 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg font-bold hover:bg-yellow-500/30 border border-yellow-500/30 text-sm"
                          >
                            🟨
                          </button>
                          <button
                            onClick={() => addPlayerEvent(player.id, 'redCard')}
                            className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg font-bold hover:bg-red-500/30 border border-red-500/30 text-sm"
                          >
                            🟥
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Assist Selection Modal */}
        {showAssistModal && goalScorerId && goalScorerTeam && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-3xl border border-white/10 max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
              <h3 className="text-2xl font-black text-white mb-4 text-center">Who Assisted?</h3>
              <p className="text-slate-400 text-center mb-6">
                Select the player who provided the assist, or skip if unassisted
              </p>

              <div className="space-y-2 mb-6">
                {(goalScorerTeam === 'home' ? homePlayers : awayPlayers)
                  .filter(p => p.id !== goalScorerId) // Exclude the goal scorer
                  .map((player) => (
                    <button
                      key={player.id}
                      onClick={() => handleAssistSelection(player.id)}
                      className="w-full p-4 bg-slate-900/50 hover:bg-blue-500/20 border border-white/10 hover:border-blue-500/30 rounded-xl transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-white/20">
                          {player.photoURL ? (
                            <img src={player.photoURL} alt={player.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>👤</span>
                          )}
                        </div>
                        <div>
                          <p className="text-white font-bold">{player.name}</p>
                          <p className="text-xs text-slate-400">#{player.jerseyNumber} • {player.position}</p>
                        </div>
                      </div>
                    </button>
                  ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleAssistSelection(null)}
                  className="flex-1 px-6 py-3 bg-green-500/20 text-green-400 rounded-xl font-bold hover:bg-green-500/30 border border-green-500/30 transition-all"
                >
                  No Assist
                </button>
                <button
                  onClick={() => {
                    setShowAssistModal(false);
                    setGoalScorerId(null);
                    setGoalScorerTeam(null);
                  }}
                  className="px-6 py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Substitution Modal */}
        {showSubModal && subTeam && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-3xl border border-white/10 max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
              <h3 className="text-2xl font-black text-white mb-4 text-center">🔄 Make Substitution</h3>
              <p className="text-slate-400 text-center mb-6">
                Select a player to take off and a player to bring on
              </p>

              {/* Player going OFF */}
              <div className="mb-6">
                <h4 className="text-lg font-bold text-red-400 mb-3">⬇️ Player Coming OFF (from Starting XI)</h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {(subTeam === 'home'
                    ? homePlayers.filter(p => match.homeStarting?.includes(p.id))
                    : awayPlayers.filter(p => match.awayStarting?.includes(p.id))
                  ).map((player) => (
                    <button
                      key={player.id}
                      onClick={() => setPlayerOut(player.id)}
                      className={`w-full p-4 border rounded-xl transition-all text-left ${
                        playerOut === player.id
                          ? 'bg-red-500/20 border-red-500/50'
                          : 'bg-slate-900/50 hover:bg-red-500/10 border-white/10 hover:border-red-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-white/20">
                          {player.photoURL ? (
                            <img src={player.photoURL} alt={player.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>👤</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-bold">{player.name}</p>
                          <p className="text-xs text-slate-400">
                            {player.jerseyNumber && `#${player.jerseyNumber} • `}
                            {match.playerPositions?.[player.id] || player.position}
                          </p>
                        </div>
                        {playerOut === player.id && (
                          <span className="text-red-400 font-bold">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Player coming ON */}
              <div className="mb-6">
                <h4 className="text-lg font-bold text-green-400 mb-3">⬆️ Player Coming ON (from Substitutes)</h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {(subTeam === 'home'
                    ? homePlayers.filter(p => match.homeSubs?.includes(p.id))
                    : awayPlayers.filter(p => match.awaySubs?.includes(p.id))
                  ).map((player) => (
                    <button
                      key={player.id}
                      onClick={() => setPlayerIn(player.id)}
                      className={`w-full p-4 border rounded-xl transition-all text-left ${
                        playerIn === player.id
                          ? 'bg-green-500/20 border-green-500/50'
                          : 'bg-slate-900/50 hover:bg-green-500/10 border-white/10 hover:border-green-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-white/20">
                          {player.photoURL ? (
                            <img src={player.photoURL} alt={player.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>👤</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-bold">{player.name}</p>
                          <p className="text-xs text-slate-400">
                            {player.jerseyNumber && `#${player.jerseyNumber} • `}
                            {match.playerPositions?.[player.id] || player.position}
                          </p>
                        </div>
                        {playerIn === player.id && (
                          <span className="text-green-400 font-bold">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              {playerOut && playerIn && (
                <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <p className="text-center text-white font-bold">
                    <span className="text-red-400">{homePlayers.concat(awayPlayers).find(p => p.id === playerOut)?.name}</span>
                    {' ⬇️ '}
                    <span className="text-blue-400">→</span>
                    {' ⬆️ '}
                    <span className="text-green-400">{homePlayers.concat(awayPlayers).find(p => p.id === playerIn)?.name}</span>
                  </p>
                  <p className="text-center text-slate-400 text-sm mt-1">
                    Minute {Math.floor(currentTime / 60)}'
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleSubstitution}
                  disabled={!playerOut || !playerIn}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Confirm Substitution
                </button>
                <button
                  onClick={() => {
                    setShowSubModal(false);
                    setSubTeam(null);
                    setPlayerOut(null);
                    setPlayerIn(null);
                  }}
                  className="px-6 py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LiveScoring;
