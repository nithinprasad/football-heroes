import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import matchService from '../services/match.service';
import teamService from '../services/team.service';
import userService from '../services/user.service';
import { Match, Team, User, PlayerMatchStats, MatchEvent } from '../types';
import Header from '../components/Header';
import { handleError } from '../utils/errorHandler';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

function LiveMatch() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const isDeletingRef = useRef(false);

  const [match, setMatch] = useState<Match | null>(null);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [homePlayers, setHomePlayers] = useState<User[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [playerStats, setPlayerStats] = useState<PlayerMatchStats[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [statType, setStatType] = useState<'goal' | 'assist' | 'yellow' | 'red' | 'owngoal'>('goal');
  const [guestPlayers, setGuestPlayers] = useState<{ id: string; name: string; team: 'home' | 'away' }[]>([]);
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestTeam, setGuestTeam] = useState<'home' | 'away'>('home');
  const [showRatings, setShowRatings] = useState(false);
  const [manOfTheMatch, setManOfTheMatch] = useState<string>(match?.manOfTheMatch || '');
  const [playerRatings, setPlayerRatings] = useState<{ [key: string]: number }>(match?.playerRatings || {});

  useEffect(() => {
    if (!id) return;

    // Set up real-time listener for match updates
    const matchRef = doc(db, 'matches', id);
    const unsubscribe = onSnapshot(
      matchRef,
      async (docSnapshot) => {
        if (docSnapshot.exists()) {
          const matchData = { ...docSnapshot.data(), id: docSnapshot.id } as Match;
          setMatch(matchData);
          setHomeScore(matchData.score.home);
          setAwayScore(matchData.score.away);
          setPlayerStats(matchData.playerStats || []);
          setManOfTheMatch(matchData.manOfTheMatch || '');
          setPlayerRatings(matchData.playerRatings || {});

          // Load teams and players
          try {
            const [homeTeamData, awayTeamData] = await Promise.all([
              teamService.getTeamById(matchData.homeTeamId),
              teamService.getTeamById(matchData.awayTeamId),
            ]);

            setHomeTeam(homeTeamData);
            setAwayTeam(awayTeamData);

            if (homeTeamData) {
              const homePlayersData = await userService.getUsersByIds(homeTeamData.playerIds);
              setHomePlayers(homePlayersData);
            }

            if (awayTeamData) {
              const awayPlayersData = await userService.getUsersByIds(awayTeamData.playerIds);
              setAwayPlayers(awayPlayersData);
            }

            setLoading(false);
          } catch (error) {
            toast.error(handleError(error, 'Load Match Data'), 'Error');
            setLoading(false);
          }
        } else {
          // Only show error if we're not actively deleting the match
          if (!isDeletingRef.current) {
            toast.error('Match not found', 'Error');
            navigate('/dashboard');
          }
        }
      },
      (error) => {
        toast.error(handleError(error, 'Match Listener'), 'Error');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [id, navigate, toast]);


  const startMatch = async () => {
    try {
      await matchService.updateMatchStatus(id!, 'ONGOING');
      toast.success('Match started!', 'Success!');
    } catch (error: any) {
      toast.error(handleError(error, 'Start Match'), 'Error');
    }
  };

  const addStat = async () => {
    if (!selectedPlayer) {
      toast.error('Please select a player', 'Error');
      return;
    }

    const existingStatIndex = playerStats.findIndex((s) => s.playerId === selectedPlayer);
    let updatedStats = [...playerStats];
    let newHomeScore = homeScore;
    let newAwayScore = awayScore;
    const isHomePlayer = homePlayers.some((p) => p.id === selectedPlayer) || guestPlayers.some((g) => g.id === selectedPlayer && g.team === 'home');
    const isAwayPlayer = awayPlayers.some((p) => p.id === selectedPlayer) || guestPlayers.some((g) => g.id === selectedPlayer && g.team === 'away');

    // Create event with timestamp
    const newEvent: MatchEvent = {
      type: statType,
      timestamp: new Date(),
      minute: match?.currentTime ? Math.floor(match.currentTime / 60) : undefined,
    };

    if (existingStatIndex >= 0) {
      const stat = { ...updatedStats[existingStatIndex] };
      if (statType === 'goal') {
        stat.goals += 1;
        if (isHomePlayer) {
          newHomeScore = homeScore + 1;
          setHomeScore(newHomeScore);
        } else if (isAwayPlayer) {
          newAwayScore = awayScore + 1;
          setAwayScore(newAwayScore);
        }
      } else if (statType === 'owngoal') {
        // Own goal - track it and increase opponent's score
        stat.ownGoals = (stat.ownGoals || 0) + 1;
        if (isHomePlayer) {
          newAwayScore = awayScore + 1;
          setAwayScore(newAwayScore);
        } else if (isAwayPlayer) {
          newHomeScore = homeScore + 1;
          setHomeScore(newHomeScore);
        }
      } else if (statType === 'assist') {
        stat.assists += 1;
      } else if (statType === 'yellow') {
        stat.yellowCards += 1;
      } else if (statType === 'red') {
        stat.redCards += 1;
      }

      // Add event to timeline
      stat.events = [...(stat.events || []), newEvent];
      updatedStats[existingStatIndex] = stat;
    } else {
      const newStat: PlayerMatchStats = {
        playerId: selectedPlayer,
        goals: statType === 'goal' ? 1 : 0,
        assists: statType === 'assist' ? 1 : 0,
        yellowCards: statType === 'yellow' ? 1 : 0,
        redCards: statType === 'red' ? 1 : 0,
        ownGoals: statType === 'owngoal' ? 1 : 0,
        events: [newEvent],
      };

      if (statType === 'goal') {
        if (isHomePlayer) {
          newHomeScore = homeScore + 1;
          setHomeScore(newHomeScore);
        } else if (isAwayPlayer) {
          newAwayScore = awayScore + 1;
          setAwayScore(newAwayScore);
        }
      } else if (statType === 'owngoal') {
        // Own goal - increase opponent's score
        if (isHomePlayer) {
          newAwayScore = awayScore + 1;
          setAwayScore(newAwayScore);
        } else if (isAwayPlayer) {
          newHomeScore = homeScore + 1;
          setHomeScore(newHomeScore);
        }
      }

      updatedStats.push(newStat);
    }

    setPlayerStats(updatedStats);
    setSelectedPlayer('');

    const playerName =
      [...homePlayers, ...awayPlayers].find((p) => p.id === selectedPlayer)?.name ||
      guestPlayers.find((g) => g.id === selectedPlayer)?.name ||
      'Player';
    const statLabel = {
      goal: '⚽ Goal',
      assist: '🎯 Assist',
      yellow: '🟨 Yellow Card',
      red: '🟥 Red Card',
      owngoal: '⚽ Own Goal'
    }[statType];
    toast.success(`${statLabel} recorded for ${playerName}`, 'Success!');

    // Update match score in Firestore immediately
    try {
      // If it's a goal or own goal, update the score in Firestore (but don't complete match)
      if (statType === 'goal' || statType === 'owngoal') {
        await matchService.updateMatchScore(id!, {
          homeScore: newHomeScore,
          awayScore: newAwayScore,
          playerStats: updatedStats,
        }, false); // false = don't complete the match
      } else {
        // Just update player stats without score
        await matchService.updateMatchPlayerStats(id!, updatedStats);
      }
    } catch (error) {
      console.error('Error updating match in real-time:', error);
      // Don't show error to user - stat is recorded locally
    }
  };

  const endMatch = async () => {
    const confirmed = await toast.confirm(
      'End the match and update player statistics?',
      'End Match'
    );
    if (!confirmed) {
      return;
    }

    try {
      await matchService.updateMatchScore(id!, {
        homeScore,
        awayScore,
        playerStats,
      }, true); // Explicitly pass true to complete match and update player stats

      toast.success('Match ended! Player statistics updated.', 'Success!');
    } catch (error: any) {
      toast.error(handleError(error, 'End Match'), 'Error');
    }
  };

  const deleteMatch = async () => {
    const confirmed = await toast.confirm(
      'Are you sure you want to delete this match? This action cannot be undone.',
      'Delete Match'
    );
    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      isDeletingRef.current = true; // Prevent "match not found" toast during deletion
      await matchService.deleteMatch(id!);
      toast.success('Match deleted successfully', 'Success!');
      // Use replace to prevent back navigation issues
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      toast.error(handleError(error, 'Delete Match'), 'Error');
      setLoading(false);
      isDeletingRef.current = false;
    }
  };

  const addGuestPlayer = () => {
    if (!guestName.trim()) {
      toast.error('Please enter guest player name', 'Error');
      return;
    }

    const guestId = `guest_${Date.now()}`;
    const newGuest = {
      id: guestId,
      name: guestName.trim(),
      team: guestTeam,
    };

    setGuestPlayers([...guestPlayers, newGuest]);
    toast.success(`Guest player ${guestName} added to ${guestTeam === 'home' ? homeTeam?.name : awayTeam?.name}`, 'Success!');

    setGuestName('');
    setShowAddGuest(false);
  };

  const saveRatings = async () => {
    try {
      const matchRef = doc(db, 'matches', id!);
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (manOfTheMatch) {
        updateData.manOfTheMatch = manOfTheMatch;
      }

      if (Object.keys(playerRatings).length > 0) {
        updateData.playerRatings = playerRatings;
      }

      await updateDoc(matchRef, updateData);
      toast.success('Ratings saved successfully!', 'Success!');
      setShowRatings(false);
    } catch (error) {
      toast.error(handleError(error, 'Save Ratings'), 'Error');
    }
  };

  const formatDate = (date: any) => {
    const d = date instanceof Date ? date : new Date(date.seconds * 1000);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  if (!match || !homeTeam || !awayTeam) {
    return null;
  }

  const getStatusBadge = () => {
    if (!match) return null;

    const badges: any = {
      SCHEDULED: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Scheduled' },
      ONGOING: { bg: 'bg-green-500/20', text: 'text-green-400', label: '🔴 LIVE', pulse: true },
      COMPLETED: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Completed' },
      CANCELLED: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Cancelled' },
    };
    const badge = badges[match.status] || badges.SCHEDULED;
    return (
      <span className={`px-4 py-2 rounded-full text-sm font-bold ${badge.bg} ${badge.text} ${badge.pulse ? 'animate-pulse' : ''}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Header />

      <div className="container mx-auto px-4 py-8 pb-24">
        <Link to="/dashboard" className="text-green-400 hover:text-green-300 font-medium mb-4 inline-block">
          ← Back to Dashboard
        </Link>

        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 md:p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-slate-400 text-sm mb-2">📍 {match.venue}</p>
              <p className="text-slate-400 text-sm">📅 {formatDate(match.matchDate)}</p>
            </div>
            {getStatusBadge()}
          </div>

          <div className="flex items-center justify-center gap-8 mb-6">
            <div className="text-center flex-1">
              <div className="w-20 h-20 md:w-24 md:h-24 mx-auto bg-slate-700/50 rounded-2xl flex items-center justify-center mb-3">
                {homeTeam.logoURL ? (
                  <img src={homeTeam.logoURL} alt={homeTeam.name} className="w-16 h-16 md:w-20 md:h-20 object-contain" />
                ) : (
                  <span className="text-4xl">⚽</span>
                )}
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2">{homeTeam.name}</h2>
              <div className="text-5xl md:text-6xl font-black text-green-400">{homeScore}</div>
            </div>

            <div className="text-2xl md:text-3xl text-slate-500 font-bold">VS</div>

            <div className="text-center flex-1">
              <div className="w-20 h-20 md:w-24 md:h-24 mx-auto bg-slate-700/50 rounded-2xl flex items-center justify-center mb-3">
                {awayTeam.logoURL ? (
                  <img src={awayTeam.logoURL} alt={awayTeam.name} className="w-16 h-16 md:w-20 md:h-20 object-contain" />
                ) : (
                  <span className="text-4xl">⚽</span>
                )}
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2">{awayTeam.name}</h2>
              <div className="text-5xl md:text-6xl font-black text-blue-400">{awayScore}</div>
            </div>
          </div>

          {match.createdBy === currentUser?.uid && (
            <div className="flex flex-wrap gap-3 justify-center pt-6 border-t border-white/10">
              {match.status === 'SCHEDULED' && (
                <>
                  <button
                    onClick={startMatch}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg"
                  >
                    🏁 Start Match
                  </button>
                  <button
                    onClick={deleteMatch}
                    className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-bold hover:from-gray-700 hover:to-gray-800 transition-all shadow-lg"
                  >
                    🗑️ Delete Match
                  </button>
                </>
              )}
              {match.status === 'ONGOING' && (
                <>
                  <Link
                    to={`/matches/${id}/score`}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-bold hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg"
                  >
                    ⏱️ Full Scoring Mode
                  </Link>
                  <button
                    onClick={endMatch}
                    className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-bold hover:from-red-600 hover:to-red-700 transition-all shadow-lg"
                  >
                    ⏹️ End Match
                  </button>
                </>
              )}
              {match.status === 'COMPLETED' && (
                <button
                  onClick={deleteMatch}
                  className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-bold hover:from-gray-700 hover:to-gray-800 transition-all shadow-lg"
                >
                  🗑️ Delete Match
                </button>
              )}
            </div>
          )}
        </div>

        {/* Share Match Button */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold text-white mb-2">🔗 Share Match</h3>
              <p className="text-slate-400 text-sm">Share this link with others to let them follow the match live</p>
            </div>
            <button
              onClick={() => {
                const url = window.location.href;
                navigator.clipboard.writeText(url).then(() => {
                  toast.success('Match link copied to clipboard!', 'Success!');
                });
              }}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg whitespace-nowrap"
            >
              📋 Copy Link
            </button>
          </div>
        </div>

        {match.createdBy === currentUser?.uid && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 md:p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-white">👥 Manage Players</h3>
              {!showAddGuest && (
                <button
                  onClick={() => setShowAddGuest(true)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-bold hover:from-purple-600 hover:to-purple-700 transition-all text-sm"
                >
                  + Add Guest Player
                </button>
              )}
            </div>

            {showAddGuest && (
              <div className="mb-6 p-4 bg-slate-900/50 rounded-xl border border-white/10">
                <h4 className="text-white font-bold mb-4">Add Guest Player</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Guest player name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500"
                  />
                  <select
                    value={guestTeam}
                    onChange={(e) => setGuestTeam(e.target.value as 'home' | 'away')}
                    className="px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="home">{homeTeam?.name} (Home)</option>
                    <option value="away">{awayTeam?.name} (Away)</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={addGuestPlayer}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all"
                    >
                      ✓ Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAddGuest(false);
                        setGuestName('');
                      }}
                      className="px-4 py-3 bg-gray-600 text-white rounded-xl font-bold hover:bg-gray-700 transition-all"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )}

            {guestPlayers.length > 0 && (
              <div className="mb-6">
                <h4 className="text-slate-400 text-sm font-medium mb-3">Guest Players:</h4>
                <div className="flex flex-wrap gap-2">
                  {guestPlayers.map((guest) => (
                    <div
                      key={guest.id}
                      className="px-3 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-300 text-sm flex items-center gap-2"
                    >
                      <span>{guest.name}</span>
                      <span className="text-xs text-purple-400">
                        ({guest.team === 'home' ? homeTeam?.name : awayTeam?.name})
                      </span>
                      <button
                        onClick={() => {
                          setGuestPlayers(guestPlayers.filter((g) => g.id !== guest.id));
                          toast.success('Guest player removed', 'Success!');
                        }}
                        className="text-red-400 hover:text-red-300 ml-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Team Lineups */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 md:p-8 mb-6">
          <h3 className="text-2xl font-black text-white mb-6 text-center">
            {match.isInternalMatch ? '⚔️ TEAM LINEUPS' : '📋 STARTING LINEUPS'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Home Team / Team A Lineup */}
            <div className="bg-gradient-to-br from-green-500/5 to-emerald-500/5 rounded-2xl border border-green-500/20 p-6">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-green-500/20">
                {homeTeam?.logoURL && (
                  <img src={homeTeam.logoURL} alt={homeTeam.name} className="w-10 h-10 object-contain" />
                )}
                <div>
                  <h4 className="text-xl font-black text-green-400">
                    {match.isInternalMatch ? 'Team A' : homeTeam?.name}
                  </h4>
                  {!match.isInternalMatch && homeTeam?.location && (
                    <p className="text-xs text-slate-400">📍 {homeTeam.location}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {(match.isInternalMatch && match.internalTeamA
                  ? homePlayers.filter(p => match.internalTeamA?.includes(p.id))
                  : homePlayers
                ).map((player, idx) => (
                  <Link
                    key={player.id}
                    to={`/users/${player.id}`}
                    className="flex items-center gap-3 p-3 bg-slate-900/30 hover:bg-slate-900/50 rounded-xl border border-white/5 hover:border-green-500/30 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-white/20 flex-shrink-0">
                      {player.photoURL ? (
                        <img src={player.photoURL} alt={player.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg">👤</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate group-hover:text-green-400 transition-colors">
                        {player.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {player.position} {player.jerseyNumber ? `• #${player.jerseyNumber}` : ''}
                      </p>
                    </div>
                  </Link>
                ))}

                {guestPlayers.filter(g => g.team === 'home').map((guest) => (
                  <div
                    key={guest.id}
                    className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-xl border border-purple-500/20"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">👤</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{guest.name}</p>
                      <p className="text-xs text-purple-400">Guest Player</p>
                    </div>
                  </div>
                ))}

                {(match.isInternalMatch && match.internalTeamA
                  ? homePlayers.filter(p => match.internalTeamA?.includes(p.id))
                  : homePlayers
                ).length === 0 && guestPlayers.filter(g => g.team === 'home').length === 0 && (
                  <p className="text-slate-500 text-sm italic text-center py-4">No players</p>
                )}
              </div>
            </div>

            {/* Away Team / Team B Lineup */}
            <div className="bg-gradient-to-br from-blue-500/5 to-cyan-500/5 rounded-2xl border border-blue-500/20 p-6">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-blue-500/20">
                {awayTeam?.logoURL && !match.isInternalMatch && (
                  <img src={awayTeam.logoURL} alt={awayTeam.name} className="w-10 h-10 object-contain" />
                )}
                {match.isInternalMatch && homeTeam?.logoURL && (
                  <img src={homeTeam.logoURL} alt={homeTeam.name} className="w-10 h-10 object-contain" />
                )}
                <div>
                  <h4 className="text-xl font-black text-blue-400">
                    {match.isInternalMatch ? 'Team B' : awayTeam?.name}
                  </h4>
                  {!match.isInternalMatch && awayTeam?.location && (
                    <p className="text-xs text-slate-400">📍 {awayTeam.location}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {(match.isInternalMatch && match.internalTeamB
                  ? homePlayers.filter(p => match.internalTeamB?.includes(p.id))
                  : awayPlayers
                ).map((player, idx) => (
                  <Link
                    key={player.id}
                    to={`/users/${player.id}`}
                    className="flex items-center gap-3 p-3 bg-slate-900/30 hover:bg-slate-900/50 rounded-xl border border-white/5 hover:border-blue-500/30 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-white/20 flex-shrink-0">
                      {player.photoURL ? (
                        <img src={player.photoURL} alt={player.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg">👤</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate group-hover:text-blue-400 transition-colors">
                        {player.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {player.position} {player.jerseyNumber ? `• #${player.jerseyNumber}` : ''}
                      </p>
                    </div>
                  </Link>
                ))}

                {guestPlayers.filter(g => g.team === 'away').map((guest) => (
                  <div
                    key={guest.id}
                    className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-xl border border-purple-500/20"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">👤</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{guest.name}</p>
                      <p className="text-xs text-purple-400">Guest Player</p>
                    </div>
                  </div>
                ))}

                {(match.isInternalMatch && match.internalTeamB
                  ? homePlayers.filter(p => match.internalTeamB?.includes(p.id))
                  : awayPlayers
                ).length === 0 && guestPlayers.filter(g => g.team === 'away').length === 0 && (
                  <p className="text-slate-500 text-sm italic text-center py-4">No players</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {match.status === 'ONGOING' && match.createdBy === currentUser?.uid && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 md:p-8 mb-6">
            <h3 className="text-2xl font-black text-white mb-6">⚽ Record Stats</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Stat Type</label>
                <select
                  value={statType}
                  onChange={(e) => setStatType(e.target.value as any)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-green-500"
                >
                  <option value="goal">⚽ Goal</option>
                  <option value="owngoal">⚽ Own Goal</option>
                  <option value="assist">🎯 Assist</option>
                  <option value="yellow">🟨 Yellow Card</option>
                  <option value="red">🟥 Red Card</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Player</label>
                <select
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select player</option>
                  <optgroup label={`${homeTeam.name} (Home)`}>
                    {homePlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name} {player.jerseyNumber ? `#${player.jerseyNumber}` : ''}
                      </option>
                    ))}
                    {guestPlayers.filter(g => g.team === 'home').map((guest) => (
                      <option key={guest.id} value={guest.id}>
                        {guest.name} (Guest)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={`${awayTeam.name} (Away)`}>
                    {awayPlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name} {player.jerseyNumber ? `#${player.jerseyNumber}` : ''}
                      </option>
                    ))}
                    {guestPlayers.filter(g => g.team === 'away').map((guest) => (
                      <option key={guest.id} value={guest.id}>
                        {guest.name} (Guest)
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={addStat}
                  disabled={!selectedPlayer}
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                  ✅ Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Goal Scorers - Football Scorecard Style */}
        {playerStats.filter(s => s.goals > 0).length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 md:p-8 mb-6">
            <h3 className="text-2xl font-black text-white mb-6 text-center">⚽ SCORECARD</h3>

            <div className="bg-gradient-to-r from-slate-900/80 to-slate-800/80 rounded-2xl p-6 border border-white/10">
              {/* Score Display */}
              <div className="flex items-center justify-center gap-8 mb-6 pb-6 border-b border-white/10">
                <div className="text-center">
                  <h4 className="text-lg md:text-xl font-bold text-white mb-2">{homeTeam?.name}</h4>
                  <div className="text-5xl md:text-6xl font-black text-green-400">{homeScore}</div>
                </div>
                <div className="text-2xl md:text-3xl text-slate-500 font-bold">-</div>
                <div className="text-center">
                  <h4 className="text-lg md:text-xl font-bold text-white mb-2">{awayTeam?.name}</h4>
                  <div className="text-5xl md:text-6xl font-black text-blue-400">{awayScore}</div>
                </div>
              </div>

              {/* Scorers List - Split by Team */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Home Team Scorers - Left Aligned */}
                <div className="space-y-3">
                  <h5 className="text-sm font-bold text-green-400 mb-3 pb-2 border-b border-green-500/20">
                    {homeTeam?.name} ⚽
                  </h5>
                  {playerStats
                    .filter(s => s.goals > 0 && (homePlayers.some(p => p.id === s.playerId) || guestPlayers.some(g => g.id === s.playerId && g.team === 'home')))
                    .map((stat) => {
                      const player = homePlayers.find(p => p.id === stat.playerId);
                      const guest = guestPlayers.find(g => g.id === stat.playerId);
                      const goalEvents = stat.events?.filter(e => e.type === 'goal') || [];
                      const isGuest = !!guest;

                      const scorerContent = (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">⚽</span>
                            <p className="text-white font-bold">
                              {player?.name || guest?.name}
                              {stat.goals > 1 && <span className="text-green-400 ml-1">×{stat.goals}</span>}
                            </p>
                          </div>
                          {goalEvents.length > 0 && (
                            <p className="text-green-400 text-xs ml-7">
                              {goalEvents.map((event, idx) => {
                                const eventTime = event.timestamp instanceof Date
                                  ? event.timestamp
                                  : new Date((event.timestamp as any).seconds * 1000);
                                return (
                                  <span key={idx}>
                                    {event.minute ? `${event.minute}'` : eventTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                    {idx < goalEvents.length - 1 ? ', ' : ''}
                                  </span>
                                );
                              })}
                            </p>
                          )}
                          {isGuest && (
                            <p className="text-purple-400 text-xs ml-7 italic">Guest Player</p>
                          )}
                        </>
                      );

                      return isGuest ? (
                        <div key={stat.playerId} className="p-3 bg-green-500/5 border-l-4 border-green-500/30 rounded">
                          {scorerContent}
                        </div>
                      ) : (
                        <Link
                          key={stat.playerId}
                          to={currentUser?.uid === stat.playerId ? '/profile' : `/users/${stat.playerId}`}
                          className="block p-3 bg-green-500/5 hover:bg-green-500/10 border-l-4 border-green-500/30 hover:border-green-500/50 rounded transition-all cursor-pointer"
                        >
                          {scorerContent}
                        </Link>
                      );
                    })}
                  {playerStats.filter(s => s.goals > 0 && (homePlayers.some(p => p.id === s.playerId) || guestPlayers.some(g => g.id === s.playerId && g.team === 'home'))).length === 0 && (
                    <p className="text-slate-500 text-sm italic text-center py-4">No goals yet</p>
                  )}
                </div>

                {/* Away Team Scorers - Right Aligned */}
                <div className="space-y-3">
                  <h5 className="text-sm font-bold text-blue-400 mb-3 pb-2 border-b border-blue-500/20 text-right">
                    ⚽ {awayTeam?.name}
                  </h5>
                  {playerStats
                    .filter(s => s.goals > 0 && (awayPlayers.some(p => p.id === s.playerId) || guestPlayers.some(g => g.id === s.playerId && g.team === 'away')))
                    .map((stat) => {
                      const player = awayPlayers.find(p => p.id === stat.playerId);
                      const guest = guestPlayers.find(g => g.id === stat.playerId);
                      const goalEvents = stat.events?.filter(e => e.type === 'goal') || [];
                      const isGuest = !!guest;

                      const scorerContent = (
                        <>
                          <div className="flex items-center justify-end gap-2 mb-1">
                            <p className="text-white font-bold">
                              {player?.name || guest?.name}
                              {stat.goals > 1 && <span className="text-blue-400 ml-1">×{stat.goals}</span>}
                            </p>
                            <span className="text-lg">⚽</span>
                          </div>
                          {goalEvents.length > 0 && (
                            <p className="text-blue-400 text-xs mr-7 text-right">
                              {goalEvents.map((event, idx) => {
                                const eventTime = event.timestamp instanceof Date
                                  ? event.timestamp
                                  : new Date((event.timestamp as any).seconds * 1000);
                                return (
                                  <span key={idx}>
                                    {event.minute ? `${event.minute}'` : eventTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                    {idx < goalEvents.length - 1 ? ', ' : ''}
                                  </span>
                                );
                              })}
                            </p>
                          )}
                          {isGuest && (
                            <p className="text-purple-400 text-xs mr-7 text-right italic">Guest Player</p>
                          )}
                        </>
                      );

                      return isGuest ? (
                        <div key={stat.playerId} className="p-3 bg-blue-500/5 border-r-4 border-blue-500/30 rounded">
                          {scorerContent}
                        </div>
                      ) : (
                        <Link
                          key={stat.playerId}
                          to={currentUser?.uid === stat.playerId ? '/profile' : `/users/${stat.playerId}`}
                          className="block p-3 bg-blue-500/5 hover:bg-blue-500/10 border-r-4 border-blue-500/30 hover:border-blue-500/50 rounded transition-all cursor-pointer"
                        >
                          {scorerContent}
                        </Link>
                      );
                    })}
                  {playerStats.filter(s => s.goals > 0 && (awayPlayers.some(p => p.id === s.playerId) || guestPlayers.some(g => g.id === s.playerId && g.team === 'away'))).length === 0 && (
                    <p className="text-slate-500 text-sm italic text-center py-4">No goals yet</p>
                  )}
                </div>
              </div>

              {/* Own Goals Section */}
              {playerStats.some(s => s.ownGoals && s.ownGoals > 0) && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h4 className="text-lg font-bold text-red-400 mb-4 text-center">⚽🔴 Own Goals</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Home Team Own Goals - Benefits Away Team */}
                    <div className="space-y-3">
                      {playerStats
                        .filter(s => s.ownGoals && s.ownGoals > 0 && (homePlayers.some(p => p.id === s.playerId) || guestPlayers.some(g => g.id === s.playerId && g.team === 'home')))
                        .map((stat) => {
                          const player = homePlayers.find(p => p.id === stat.playerId);
                          const guest = guestPlayers.find(g => g.id === stat.playerId);
                          const ownGoalEvents = stat.events?.filter(e => e.type === 'owngoal') || [];
                          const isGuest = !!guest;

                          const ownGoalContent = (
                            <>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">⚽🔴</span>
                                <p className="text-white font-bold">
                                  {player?.name || guest?.name}
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
                              {isGuest && (
                                <p className="text-purple-400 text-xs ml-7 italic">Guest Player</p>
                              )}
                            </>
                          );

                          return isGuest ? (
                            <div key={stat.playerId} className="p-3 bg-red-500/5 border-l-4 border-red-500/30 rounded">
                              {ownGoalContent}
                            </div>
                          ) : (
                            <Link
                              key={stat.playerId}
                              to={currentUser?.uid === stat.playerId ? '/profile' : `/users/${stat.playerId}`}
                              className="block p-3 bg-red-500/5 hover:bg-red-500/10 border-l-4 border-red-500/30 hover:border-red-500/50 rounded transition-all cursor-pointer"
                            >
                              {ownGoalContent}
                            </Link>
                          );
                        })}
                    </div>

                    {/* Away Team Own Goals - Benefits Home Team */}
                    <div className="space-y-3">
                      {playerStats
                        .filter(s => s.ownGoals && s.ownGoals > 0 && (awayPlayers.some(p => p.id === s.playerId) || guestPlayers.some(g => g.id === s.playerId && g.team === 'away')))
                        .map((stat) => {
                          const player = awayPlayers.find(p => p.id === stat.playerId);
                          const guest = guestPlayers.find(g => g.id === stat.playerId);
                          const ownGoalEvents = stat.events?.filter(e => e.type === 'owngoal') || [];
                          const isGuest = !!guest;

                          const ownGoalContent = (
                            <>
                              <div className="flex items-center justify-end gap-2 mb-1">
                                <p className="text-white font-bold">
                                  {player?.name || guest?.name}
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
                              {isGuest && (
                                <p className="text-purple-400 text-xs mr-7 text-right italic">Guest Player</p>
                              )}
                            </>
                          );

                          return isGuest ? (
                            <div key={stat.playerId} className="p-3 bg-red-500/5 border-r-4 border-red-500/30 rounded">
                              {ownGoalContent}
                            </div>
                          ) : (
                            <Link
                              key={stat.playerId}
                              to={currentUser?.uid === stat.playerId ? '/profile' : `/users/${stat.playerId}`}
                              className="block p-3 bg-red-500/5 hover:bg-red-500/10 border-r-4 border-red-500/30 hover:border-red-500/50 rounded transition-all cursor-pointer"
                            >
                              {ownGoalContent}
                            </Link>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Match Events Timeline */}
        {playerStats.some(s => s.events && s.events.length > 0) && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 md:p-8 mb-6">
            <h3 className="text-2xl font-black text-white mb-6">📋 Match Events</h3>

            <div className="space-y-2">
              {playerStats
                .flatMap(stat => {
                  const player = [...homePlayers, ...awayPlayers].find(p => p.id === stat.playerId);
                  const guest = guestPlayers.find(g => g.id === stat.playerId);
                  const isHome = homePlayers.some(p => p.id === stat.playerId) || (guest && guest.team === 'home');
                  const team = isHome ? homeTeam : awayTeam;

                  return (stat.events || []).map(event => ({
                    ...event,
                    player: player || guest,
                    team,
                    isHome,
                    playerId: stat.playerId,
                  }));
                })
                .sort((a, b) => {
                  const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date((a.timestamp as any).seconds * 1000).getTime();
                  const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date((b.timestamp as any).seconds * 1000).getTime();
                  return timeA - timeB;
                })
                .map((event, idx) => {
                  const eventIcon = {
                    goal: '⚽',
                    assist: '🎯',
                    yellow: '🟨',
                    red: '🟥',
                    owngoal: '⚽🔴',
                  }[event.type];

                  const eventLabel = {
                    goal: 'Goal',
                    assist: 'Assist',
                    yellow: 'Yellow Card',
                    red: 'Red Card',
                    owngoal: 'Own Goal',
                  }[event.type];

                  const eventTime = event.timestamp instanceof Date
                    ? event.timestamp
                    : new Date((event.timestamp as any).seconds * 1000);
                  const timeStr = eventTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div key={`${event.playerId}-${idx}`} className={`flex items-center gap-4 p-4 bg-slate-900/50 rounded-lg border border-white/10 ${!event.isHome ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex-1 ${!event.isHome ? 'text-right' : ''}`}>
                        <p className="text-white font-bold">{event.player?.name}</p>
                        <p className="text-slate-400 text-sm">{event.team?.name}</p>
                      </div>

                      <div className="flex flex-col items-center gap-1">
                        <span className="text-2xl">{eventIcon}</span>
                        <span className="text-xs text-slate-400">{event.minute ? `${event.minute}'` : timeStr}</span>
                      </div>

                      <div className={`flex-1 ${event.isHome ? 'text-right' : ''}`}>
                        <p className="text-slate-300 text-sm font-medium">{eventLabel}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}


        {/* Man of the Match & Ratings - For Completed Matches */}
        {match.status === 'COMPLETED' && match.createdBy === currentUser?.uid && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 md:p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-white">⭐ Match Ratings</h3>
              {!showRatings && (
                <button
                  onClick={() => setShowRatings(true)}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg font-bold hover:from-yellow-600 hover:to-orange-600 transition-all text-sm"
                >
                  {match.manOfTheMatch ? 'Edit Ratings' : 'Add Ratings'}
                </button>
              )}
            </div>

            {showRatings ? (
              <div className="space-y-6">
                {/* Man of the Match */}
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-3">🏆 Man of the Match</label>
                  <select
                    value={manOfTheMatch}
                    onChange={(e) => setManOfTheMatch(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="">Select player</option>
                    <optgroup label={`${homeTeam?.name} (Home)`}>
                      {homePlayers.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={`${awayTeam?.name} (Away)`}>
                      {awayPlayers.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Player Ratings */}
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-3">Player Ratings (Optional)</label>
                  <div className="space-y-3">
                    {[...homePlayers, ...awayPlayers].map((player) => (
                      <div key={player.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                        <span className="text-white font-medium">{player.name}</span>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                            <button
                              key={rating}
                              onClick={() => setPlayerRatings({ ...playerRatings, [player.id]: rating })}
                              className={`w-8 h-8 rounded-lg font-bold transition-all ${
                                playerRatings[player.id] === rating
                                  ? 'bg-yellow-500 text-white'
                                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                              }`}
                            >
                              {rating}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={saveRatings}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all"
                  >
                    ✓ Save Ratings
                  </button>
                  <button
                    onClick={() => setShowRatings(false)}
                    className="px-6 py-3 bg-gray-600 text-white rounded-xl font-bold hover:bg-gray-700 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {match.manOfTheMatch && (
                  <div className="p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl">
                    <p className="text-yellow-400 font-bold mb-2">🏆 Man of the Match</p>
                    <p className="text-white text-lg font-black">
                      {[...homePlayers, ...awayPlayers].find(p => p.id === match.manOfTheMatch)?.name || 'Unknown Player'}
                    </p>
                  </div>
                )}
                {!match.manOfTheMatch && (
                  <p className="text-slate-400 text-sm italic">No ratings added yet</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Disciplinary Cards Section */}
        {playerStats.some(s => s.yellowCards > 0 || s.redCards > 0) && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 md:p-8 mb-6">
            <h3 className="text-2xl font-black text-white mb-6">🟨🟥 Disciplinary Actions</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {playerStats
                .filter(s => s.yellowCards > 0 || s.redCards > 0)
                .map((stat) => {
                  const player = [...homePlayers, ...awayPlayers].find((p) => p.id === stat.playerId);
                  const guest = guestPlayers.find((g) => g.id === stat.playerId);
                  const isHome = homePlayers.some((p) => p.id === stat.playerId) || (guest && guest.team === 'home');
                  const team = isHome ? homeTeam : awayTeam;

                  return (
                    <div key={stat.playerId} className="p-4 bg-slate-900/50 rounded-xl border border-white/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-bold">
                            {player?.name || guest?.name || 'Unknown Player'}
                            {guest && <span className="text-purple-400 text-sm ml-2">(Guest)</span>}
                          </p>
                          <p className="text-slate-400 text-sm">{team?.name}</p>
                        </div>
                        <div className="flex gap-2">
                          {stat.yellowCards > 0 && (
                            <div className="flex items-center gap-1 px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg">
                              <span className="text-lg">🟨</span>
                              <span className="font-bold">×{stat.yellowCards}</span>
                            </div>
                          )}
                          {stat.redCards > 0 && (
                            <div className="flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-400 rounded-lg">
                              <span className="text-lg">🟥</span>
                              <span className="font-bold">×{stat.redCards}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom Score Bar */}
      {match.status === 'ONGOING' && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/20 py-3 px-4 z-50">
          <div className="container mx-auto flex items-center justify-between max-w-4xl">
            <div className="flex items-center gap-3 flex-1">
              {homeTeam?.logoURL && (
                <img src={homeTeam.logoURL} alt={homeTeam.name} className="w-8 h-8 object-contain" />
              )}
              <span className="text-white font-bold truncate">{homeTeam?.name}</span>
            </div>

            <div className="flex items-center gap-4 px-6">
              <div className="text-3xl font-black text-green-400">{homeScore}</div>
              <div className="text-xl text-slate-500 font-bold">-</div>
              <div className="text-3xl font-black text-blue-400">{awayScore}</div>
            </div>

            <div className="flex items-center gap-3 flex-1 justify-end">
              <span className="text-white font-bold truncate">{awayTeam?.name}</span>
              {awayTeam?.logoURL && (
                <img src={awayTeam.logoURL} alt={awayTeam.name} className="w-8 h-8 object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveMatch;
