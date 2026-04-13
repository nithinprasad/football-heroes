import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import teamService from '../services/team.service';
import userService from '../services/user.service';
import matchService from '../services/match.service';
import { Team, User, Position } from '../types';
import Header from '../components/Header';

interface PlayerAssignment {
  player: User;
  team: 'home' | 'away';
  status: 'starting' | 'sub' | 'notPlaying';
  position?: Position;
}

interface LocationState {
  homeTeamId: string;
  awayTeamId: string;
  matchDate: string;
  venue: string;
  matchDuration: number;
}

function FriendlyMatchSetup() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const toast = useToast();

  const state = location.state as LocationState;

  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<PlayerAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Team size selection
  const [teamSize, setTeamSize] = useState(11);

  // Guest player state
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPosition, setGuestPosition] = useState<Position>('Forward');
  const [guestTeam, setGuestTeam] = useState<'home' | 'away'>('home');
  const [guestStatus, setGuestStatus] = useState<'starting' | 'sub' | 'notPlaying'>('notPlaying');

  useEffect(() => {
    if (!state || !state.homeTeamId || !state.awayTeamId) {
      toast.error('Missing match details', 'Error');
      navigate('/create-match');
      return;
    }
    loadTeamsData();
  }, []);

  const loadTeamsData = async () => {
    try {
      setLoading(true);
      const [homeTeamData, awayTeamData] = await Promise.all([
        teamService.getTeamById(state.homeTeamId),
        teamService.getTeamById(state.awayTeamId),
      ]);

      if (!homeTeamData || !awayTeamData) {
        toast.error('Teams not found', 'Error');
        navigate('/create-match');
        return;
      }

      setHomeTeam(homeTeamData);
      setAwayTeam(awayTeamData);

      // Load all players from both teams
      const allPlayerIds = [
        ...(homeTeamData.playerIds || []),
        ...(awayTeamData.playerIds || []),
      ];
      const uniquePlayerIds = Array.from(new Set(allPlayerIds));

      if (uniquePlayerIds.length > 0) {
        const playersData = await Promise.all(
          uniquePlayerIds.map((playerId) => userService.getUserById(playerId))
        );
        const validPlayers = playersData.filter((p) => p !== null) as User[];
        setPlayers(validPlayers);

        // Initialize assignments - home team players to home, away team players to away, all not playing
        const initialAssignments: PlayerAssignment[] = [];
        homeTeamData.playerIds.forEach((playerId) => {
          const player = validPlayers.find((p) => p.id === playerId);
          if (player) {
            initialAssignments.push({
              player,
              team: 'home',
              status: 'notPlaying',
            });
          }
        });
        awayTeamData.playerIds.forEach((playerId) => {
          const player = validPlayers.find((p) => p.id === playerId);
          if (player && !initialAssignments.find((a) => a.player.id === playerId)) {
            initialAssignments.push({
              player,
              team: 'away',
              status: 'notPlaying',
            });
          }
        });
        setAssignments(initialAssignments);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
      toast.error('Failed to load teams data', 'Error');
      navigate('/create-match');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPlayer = (playerId: string, newTeam: 'home' | 'away', newStatus: 'starting' | 'sub' | 'notPlaying') => {
    setAssignments((prev) =>
      prev.map((assignment) =>
        assignment.player.id === playerId
          ? { ...assignment, team: newTeam, status: newStatus }
          : assignment
      )
    );
  };

  const handleUpdatePosition = (playerId: string, newPosition: Position) => {
    setAssignments((prev) =>
      prev.map((assignment) =>
        assignment.player.id === playerId
          ? { ...assignment, position: newPosition }
          : assignment
      )
    );
  };

  const handleAddGuest = () => {
    if (!guestName.trim()) {
      toast.warning('Please enter guest player name', 'Name Required');
      return;
    }

    const guestPlayer: User = {
      id: `guest_${Date.now()}_${guestName.trim().replace(/\s+/g, '_')}`,
      name: guestName.trim(),
      mobileNumber: '',
      position: guestPosition,
      roles: ['player'],
      teamIds: [],
      statistics: {
        matches: 0,
        goals: 0,
        assists: 0,
        cleanSheets: 0,
        yellowCards: 0,
        redCards: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newAssignment: PlayerAssignment = {
      player: guestPlayer,
      team: guestTeam,
      status: guestStatus,
      position: guestPosition,
    };

    setAssignments((prev) => [...prev, newAssignment]);
    setPlayers((prev) => [...prev, guestPlayer]);

    toast.success(`Guest player "${guestName}" added!`, 'Success');

    // Reset and close modal
    setGuestName('');
    setGuestPosition('Forward');
    setGuestTeam('home');
    setGuestStatus('notPlaying');
    setShowGuestModal(false);
  };

  const handleRemoveGuest = (playerId: string) => {
    if (!playerId.startsWith('guest_')) return;

    setAssignments((prev) => prev.filter((a) => a.player.id !== playerId));
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));

    toast.success('Guest player removed', 'Success');
  };

  const handleStartMatch = async () => {
    const homeStarting = assignments.filter((a) => a.team === 'home' && a.status === 'starting');
    const homeSubs = assignments.filter((a) => a.team === 'home' && a.status === 'sub');
    const homeNotPlaying = assignments.filter((a) => a.team === 'home' && a.status === 'notPlaying');
    const awayStarting = assignments.filter((a) => a.team === 'away' && a.status === 'starting');
    const awaySubs = assignments.filter((a) => a.team === 'away' && a.status === 'sub');
    const awayNotPlaying = assignments.filter((a) => a.team === 'away' && a.status === 'notPlaying');

    // Validation
    if (homeStarting.length === 0 || awayStarting.length === 0) {
      toast.warning('Both teams must have at least one starting player', 'Invalid Teams');
      return;
    }

    const confirmed = await toast.confirm(
      `Start friendly match?\n${homeTeam?.name}: ${homeStarting.length} starters + ${homeSubs.length} subs\n${awayTeam?.name}: ${awayStarting.length} starters + ${awaySubs.length} subs`,
      'Start Friendly Match'
    );

    if (!confirmed) return;

    try {
      setCreating(true);

      // Build position overrides map
      const playerPositions: { [playerId: string]: Position } = {};
      assignments.forEach((assignment) => {
        if (assignment.position) {
          playerPositions[assignment.player.id] = assignment.position;
        }
      });

      // Extract guest players
      const guestPlayers = players.filter((p) => p.id.startsWith('guest_'));

      // Create friendly match
      const matchId = await matchService.createStandaloneMatch({
        homeTeamId: state.homeTeamId,
        awayTeamId: state.awayTeamId,
        venue: state.venue,
        matchDate: new Date(state.matchDate),
        matchDuration: state.matchDuration,
        createdBy: currentUser!.uid,
        teamSize,
        // Lineup data
        homeStarting: homeStarting.map((a) => a.player.id),
        homeSubs: homeSubs.map((a) => a.player.id),
        homeNotPlaying: homeNotPlaying.map((a) => a.player.id),
        awayStarting: awayStarting.map((a) => a.player.id),
        awaySubs: awaySubs.map((a) => a.player.id),
        awayNotPlaying: awayNotPlaying.map((a) => a.player.id),
        // Position overrides
        playerPositions: Object.keys(playerPositions).length > 0 ? playerPositions : undefined,
        // Guest players
        guestPlayers: guestPlayers.length > 0 ? guestPlayers : undefined,
      });

      toast.success('Match created successfully!', 'Match Started');
      navigate(`/matches/${matchId}/score`);
    } catch (error) {
      console.error('Error creating match:', error);
      toast.error('Failed to create match', 'Error');
    } finally {
      setCreating(false);
    }
  };

  const homeStarting = assignments.filter((a) => a.team === 'home' && a.status === 'starting');
  const homeSubs = assignments.filter((a) => a.team === 'home' && a.status === 'sub');
  const homeNotPlaying = assignments.filter((a) => a.team === 'home' && a.status === 'notPlaying');
  const awayStarting = assignments.filter((a) => a.team === 'away' && a.status === 'starting');
  const awaySubs = assignments.filter((a) => a.team === 'away' && a.status === 'sub');
  const awayNotPlaying = assignments.filter((a) => a.team === 'away' && a.status === 'notPlaying');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading teams...</p>
        </div>
      </div>
    );
  }

  if (!homeTeam || !awayTeam) return null;

  // Determine which players are common (in both teams)
  const commonPlayerIds = homeTeam.playerIds.filter(id => awayTeam.playerIds.includes(id));

  const renderPlayerCard = (assignment: PlayerAssignment, isHomeTeam: boolean) => {
    const { player } = assignment;
    const currentPosition = assignment.position || player.position;
    const teamColor = isHomeTeam ? 'green' : 'blue';
    const otherTeam = isHomeTeam ? 'away' : 'home';

    // Check if player can be moved between teams
    const isGuest = player.id.startsWith('guest_');
    const isCommonPlayer = commonPlayerIds.includes(player.id);
    const canSwitchTeam = isGuest || isCommonPlayer;

    return (
      <div key={player.id} className={`p-2 ${assignment.status === 'starting' ? `bg-${teamColor}-500/10 border-${teamColor}-500/20` : assignment.status === 'sub' ? 'bg-slate-800/50 border-white/10' : 'bg-slate-900/30 border-white/5'} rounded-lg border`}>
        <div className="flex items-center gap-2">
          {/* Player Photo */}
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-white/20 flex-shrink-0">
            {player.photoURL ? (
              <img src={player.photoURL} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg">👤</span>
            )}
          </div>

          {/* Player Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className={`${assignment.status === 'notPlaying' ? 'text-slate-400' : 'text-white'} font-bold text-sm truncate`}>{player.name}</p>
              {isGuest && (
                <span className="px-1.5 py-0.5 bg-purple-500/20 border border-purple-500/40 rounded text-purple-400 text-[10px] font-bold">GUEST</span>
              )}
            </div>
            <select
              value={currentPosition || 'Forward'}
              onChange={(e) => handleUpdatePosition(player.id, e.target.value as Position)}
              className={`text-xs ${assignment.status === 'notPlaying' ? 'bg-slate-900 text-slate-500' : 'bg-slate-800 text-slate-300'} border border-white/10 rounded px-1 py-0.5 mt-1`}
              onClick={(e) => e.stopPropagation()}
            >
              <option value="Goalkeeper">🧤 GK</option>
              <option value="Defender">🛡️ DEF</option>
              <option value="Midfielder">⚡ MID</option>
              <option value="Forward">⚽ FWD</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-1 flex-wrap">
            {isGuest && (
              <button onClick={() => handleRemoveGuest(player.id)} className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs" title="Remove Guest">🗑</button>
            )}
            {assignment.status !== 'starting' && (
              <button onClick={() => handleAssignPlayer(player.id, assignment.team, 'starting')} className={`px-2 py-1 bg-${teamColor}-500/20 text-${teamColor}-400 rounded text-xs`} title="To Starting">⭐</button>
            )}
            {assignment.status !== 'sub' && (
              <button onClick={() => handleAssignPlayer(player.id, assignment.team, 'sub')} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs" title="To Subs">Sub</button>
            )}
            {assignment.status !== 'notPlaying' && (
              <button onClick={() => handleAssignPlayer(player.id, assignment.team, 'notPlaying')} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs" title="Not Playing">×</button>
            )}
            {canSwitchTeam && (
              <button onClick={() => handleAssignPlayer(player.id, otherTeam, assignment.status)} className={`px-2 py-1 bg-${isHomeTeam ? 'blue' : 'green'}-500/20 text-${isHomeTeam ? 'blue' : 'green'}-400 rounded text-xs`} title={`To ${isHomeTeam ? 'Away' : 'Home'}`}>→</button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/create-match')}
            className="text-green-400 hover:text-green-300 font-medium mb-4 inline-block"
          >
            ← Back
          </button>
          <h1 className="text-4xl font-black text-white mb-2">Friendly Match Setup</h1>
          <p className="text-slate-400">{homeTeam.name} vs {awayTeam.name}</p>
          <p className="text-slate-500 text-sm">📍 {state.venue} • ⏱️ {state.matchDuration} min</p>
        </div>

        {/* Match Details */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black text-white">Match Details</h2>
            <button
              onClick={() => setShowGuestModal(true)}
              className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-xl font-medium hover:bg-purple-500/30 transition-all flex items-center gap-2"
            >
              <span className="text-lg">➕</span>
              Add Guest Player
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Team Size *</label>
              <select
                value={teamSize}
                onChange={(e) => setTeamSize(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-slate-900 border border-white/10 rounded-xl text-white"
              >
                <option value="5">5-a-side</option>
                <option value="6">6-a-side</option>
                <option value="7">7-a-side</option>
                <option value="9">9-a-side</option>
                <option value="11">11-a-side</option>
              </select>
            </div>
          </div>
        </div>

        {/* Team Lineups */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Home Team */}
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl rounded-3xl border border-green-500/30 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-green-400">{homeTeam.name} (Home)</h3>
              <span className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-green-400 text-sm font-bold">
                {homeStarting.length + homeSubs.length + homeNotPlaying.length} players
              </span>
            </div>

            {/* Starting XI */}
            <div className="mb-4">
              <h4 className="text-sm font-bold text-green-300 mb-2">Starting XI ({homeStarting.length}/{teamSize})</h4>
              <div className="space-y-2 min-h-[100px]">
                {homeStarting.map((assignment) => renderPlayerCard(assignment, true))}
                {homeStarting.length === 0 && <p className="text-slate-500 text-sm italic text-center py-4">No starters</p>}
              </div>
            </div>

            {/* Substitutes */}
            <div className="mb-4">
              <h4 className="text-sm font-bold text-green-300 mb-2">Substitutes ({homeSubs.length})</h4>
              <div className="space-y-2 min-h-[60px]">
                {homeSubs.map((assignment) => renderPlayerCard(assignment, true))}
                {homeSubs.length === 0 && <p className="text-slate-500 text-sm italic text-center py-2">No substitutes</p>}
              </div>
            </div>

            {/* Not Playing */}
            <div>
              <h4 className="text-sm font-bold text-slate-400 mb-2">Not Playing ({homeNotPlaying.length})</h4>
              <div className="space-y-2 min-h-[60px]">
                {homeNotPlaying.map((assignment) => renderPlayerCard(assignment, true))}
                {homeNotPlaying.length === 0 && <p className="text-slate-500 text-sm italic text-center py-2">All players assigned</p>}
              </div>
            </div>
          </div>

          {/* Away Team */}
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl rounded-3xl border border-blue-500/30 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-blue-400">{awayTeam.name} (Away)</h3>
              <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-400 text-sm font-bold">
                {awayStarting.length + awaySubs.length + awayNotPlaying.length} players
              </span>
            </div>

            {/* Starting XI */}
            <div className="mb-4">
              <h4 className="text-sm font-bold text-blue-300 mb-2">Starting XI ({awayStarting.length}/{teamSize})</h4>
              <div className="space-y-2 min-h-[100px]">
                {awayStarting.map((assignment) => renderPlayerCard(assignment, false))}
                {awayStarting.length === 0 && <p className="text-slate-500 text-sm italic text-center py-4">No starters</p>}
              </div>
            </div>

            {/* Substitutes */}
            <div className="mb-4">
              <h4 className="text-sm font-bold text-blue-300 mb-2">Substitutes ({awaySubs.length})</h4>
              <div className="space-y-2 min-h-[60px]">
                {awaySubs.map((assignment) => renderPlayerCard(assignment, false))}
                {awaySubs.length === 0 && <p className="text-slate-500 text-sm italic text-center py-2">No substitutes</p>}
              </div>
            </div>

            {/* Not Playing */}
            <div>
              <h4 className="text-sm font-bold text-slate-400 mb-2">Not Playing ({awayNotPlaying.length})</h4>
              <div className="space-y-2 min-h-[60px]">
                {awayNotPlaying.map((assignment) => renderPlayerCard(assignment, false))}
                {awayNotPlaying.length === 0 && <p className="text-slate-500 text-sm italic text-center py-2">All players assigned</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/create-match')}
            className="px-6 py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleStartMatch}
            disabled={creating || homeStarting.length === 0 || awayStarting.length === 0}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Creating...
              </>
            ) : (
              <>
                ⚽ Start Match
              </>
            )}
          </button>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <p className="text-sm text-slate-300">
            <strong className="text-blue-400">💡 Tip:</strong> Set up both teams' lineups before starting. You can add guest players if someone is joining who isn't on either roster.
          </p>
        </div>
      </div>

      {/* Guest Player Modal */}
      {showGuestModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-3xl border border-white/10 shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-2xl font-black text-white mb-4">Add Guest Player</h3>
            <p className="text-slate-400 text-sm mb-6">Add a guest player who isn't part of either team roster.</p>

            <div className="space-y-4">
              {/* Guest Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Guest Name *</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-white/10 rounded-xl text-white"
                  placeholder="Enter guest player name"
                  autoFocus
                />
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Position *</label>
                <select
                  value={guestPosition}
                  onChange={(e) => setGuestPosition(e.target.value as Position)}
                  className="w-full px-4 py-2 bg-slate-900 border border-white/10 rounded-xl text-white"
                >
                  <option value="Goalkeeper">🧤 Goalkeeper</option>
                  <option value="Defender">🛡️ Defender</option>
                  <option value="Midfielder">⚡ Midfielder</option>
                  <option value="Forward">⚽ Forward</option>
                </select>
              </div>

              {/* Team Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Team *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGuestTeam('home')}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${
                      guestTeam === 'home'
                        ? 'bg-green-500/20 border-2 border-green-500 text-green-400'
                        : 'bg-slate-900 border border-white/10 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {homeTeam.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuestTeam('away')}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${
                      guestTeam === 'away'
                        ? 'bg-blue-500/20 border-2 border-blue-500 text-blue-400'
                        : 'bg-slate-900 border border-white/10 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {awayTeam.name}
                  </button>
                </div>
              </div>

              {/* Status Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Status *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setGuestStatus('starting')}
                    className={`px-3 py-2 rounded-xl font-medium text-sm transition-all ${
                      guestStatus === 'starting'
                        ? 'bg-green-500/20 border-2 border-green-500 text-green-400'
                        : 'bg-slate-900 border border-white/10 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    Starting
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuestStatus('sub')}
                    className={`px-3 py-2 rounded-xl font-medium text-sm transition-all ${
                      guestStatus === 'sub'
                        ? 'bg-yellow-500/20 border-2 border-yellow-500 text-yellow-400'
                        : 'bg-slate-900 border border-white/10 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    Sub
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuestStatus('notPlaying')}
                    className={`px-3 py-2 rounded-xl font-medium text-sm transition-all ${
                      guestStatus === 'notPlaying'
                        ? 'bg-slate-500/20 border-2 border-slate-500 text-slate-400'
                        : 'bg-slate-900 border border-white/10 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    Not Playing
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowGuestModal(false);
                  setGuestName('');
                  setGuestPosition('Forward');
                  setGuestTeam('home');
                  setGuestStatus('notPlaying');
                }}
                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddGuest}
                disabled={!guestName.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-bold hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Add Guest
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FriendlyMatchSetup;
