import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import teamService from '../services/team.service';
import userService from '../services/user.service';
import matchService from '../services/match.service';
import { Team, User } from '../types';
import Header from '../components/Header';

interface PlayerAssignment {
  player: User;
  team: 'A' | 'B';
  status: 'starting' | 'sub' | 'notPlaying';
}

function InternalMatch() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<PlayerAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Match details
  const [matchName, setMatchName] = useState('');
  const [venue, setVenue] = useState('Training Ground');
  const [duration, setDuration] = useState(90);
  const [teamSize, setTeamSize] = useState(11);
  const [location, setLocation] = useState('');

  useEffect(() => {
    if (id) {
      loadTeamData();
    }
  }, [id]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const teamData = await teamService.getTeamById(id!);

      if (!teamData) {
        toast.error('Team not found', 'Error');
        navigate('/my-teams');
        return;
      }

      // Check if user is manager
      if (currentUser && teamData.managerId !== currentUser.uid) {
        toast.error('Only team manager can start internal matches', 'Access Denied');
        navigate(`/teams/${id}`);
        return;
      }

      setTeam(teamData);
      setMatchName(`${teamData.name} - Internal Match`);
      setLocation(teamData.location || '');

      // Load players
      if (teamData.playerIds && teamData.playerIds.length > 0) {
        const playersData = await Promise.all(
          teamData.playerIds.map((playerId) => userService.getUserById(playerId))
        );
        const validPlayers = playersData.filter((p) => p !== null) as User[];
        setPlayers(validPlayers);

        // Initialize all players to Team A, not playing
        setAssignments(
          validPlayers.map((player) => ({
            player,
            team: 'A',
            status: 'notPlaying',
          }))
        );
      }
    } catch (error) {
      console.error('Error loading team:', error);
      toast.error('Failed to load team data', 'Error');
      navigate('/my-teams');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPlayer = (playerId: string, newTeam: 'A' | 'B', newStatus: 'starting' | 'sub' | 'notPlaying') => {
    setAssignments((prev) =>
      prev.map((assignment) =>
        assignment.player.id === playerId
          ? { ...assignment, team: newTeam, status: newStatus }
          : assignment
      )
    );
  };

  const handleStartMatch = async () => {
    const teamAStarting = assignments.filter((a) => a.team === 'A' && a.status === 'starting');
    const teamBStarting = assignments.filter((a) => a.team === 'B' && a.status === 'starting');
    const teamASubs = assignments.filter((a) => a.team === 'A' && a.status === 'sub');
    const teamBSubs = assignments.filter((a) => a.team === 'B' && a.status === 'sub');
    const teamANotPlaying = assignments.filter((a) => a.team === 'A' && a.status === 'notPlaying');
    const teamBNotPlaying = assignments.filter((a) => a.team === 'B' && a.status === 'notPlaying');

    // Validation
    if (teamAStarting.length === 0 || teamBStarting.length === 0) {
      toast.warning('Both teams must have at least one starting player', 'Invalid Teams');
      return;
    }

    if (!matchName.trim()) {
      toast.warning('Please enter a match name', 'Match Name Required');
      return;
    }

    if (!location.trim()) {
      toast.warning('Please enter match location', 'Location Required');
      return;
    }

    const confirmed = await toast.confirm(
      `Start internal match?\nTeam A: ${teamAStarting.length} starters + ${teamASubs.length} subs\nTeam B: ${teamBStarting.length} starters + ${teamBSubs.length} subs`,
      'Start Internal Match'
    );

    if (!confirmed) return;

    try {
      setCreating(true);

      // Create internal match (no tournament)
      const matchId = await matchService.createStandaloneMatch({
        homeTeamId: id!, // Use actual team ID
        awayTeamId: id!, // Same team
        venue: location.trim(),
        matchDate: new Date(),
        matchDuration: duration,
        createdBy: currentUser!.uid,
        isInternalMatch: true, // Mark as internal
        internalTeamA: [...teamAStarting, ...teamASubs, ...teamANotPlaying].map((a) => a.player.id),
        internalTeamB: [...teamBStarting, ...teamBSubs, ...teamBNotPlaying].map((a) => a.player.id),
        matchName: matchName.trim(),
        teamSize,
        // Lineup data
        homeStarting: teamAStarting.map((a) => a.player.id),
        homeSubs: teamASubs.map((a) => a.player.id),
        homeNotPlaying: teamANotPlaying.map((a) => a.player.id),
        awayStarting: teamBStarting.map((a) => a.player.id),
        awaySubs: teamBSubs.map((a) => a.player.id),
        awayNotPlaying: teamBNotPlaying.map((a) => a.player.id),
      });

      toast.success('Internal match created successfully!', 'Match Started');
      navigate(`/matches/${matchId}/score`);
    } catch (error) {
      console.error('Error creating internal match:', error);
      toast.error('Failed to create internal match', 'Error');
    } finally {
      setCreating(false);
    }
  };

  const teamAStarting = assignments.filter((a) => a.team === 'A' && a.status === 'starting');
  const teamASubs = assignments.filter((a) => a.team === 'A' && a.status === 'sub');
  const teamANotPlaying = assignments.filter((a) => a.team === 'A' && a.status === 'notPlaying');
  const teamBStarting = assignments.filter((a) => a.team === 'B' && a.status === 'starting');
  const teamBSubs = assignments.filter((a) => a.team === 'B' && a.status === 'sub');
  const teamBNotPlaying = assignments.filter((a) => a.team === 'B' && a.status === 'notPlaying');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading team...</p>
        </div>
      </div>
    );
  }

  if (!team) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/teams/${id}`)}
            className="text-green-400 hover:text-green-300 font-medium mb-4 inline-block"
          >
            ← Back to Team
          </button>
          <h1 className="text-4xl font-black text-white mb-2">Internal Match Setup</h1>
          <p className="text-slate-400">Split {team.name} into two teams and start a practice match</p>
        </div>

        {/* Match Details */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 mb-6">
          <h2 className="text-2xl font-black text-white mb-4">Match Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Match Name *</label>
              <input
                type="text"
                value={matchName}
                onChange={(e) => setMatchName(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-white/10 rounded-xl text-white"
                placeholder="Internal Match"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Location *</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-white/10 rounded-xl text-white"
                placeholder="Training Ground"
              />
            </div>
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
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Duration (mins)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 90)}
                min="30"
                max="120"
                className="w-full px-4 py-2 bg-slate-900 border border-white/10 rounded-xl text-white"
              />
            </div>
          </div>
        </div>

        {/* Team Assignment */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Team A Section */}
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl rounded-3xl border border-blue-500/30 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-blue-400">Team A</h3>
              <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-400 text-sm font-bold">
                {teamAStarting.length + teamASubs.length + teamANotPlaying.length} players
              </span>
            </div>

            {/* Starting XI */}
            <div className="mb-4">
              <h4 className="text-sm font-bold text-blue-300 mb-2">Starting XI ({teamAStarting.length}/{teamSize})</h4>
              <div className="space-y-2 min-h-[100px]">
                {teamAStarting.map(({ player }) => (
                  <div key={player.id} className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm truncate">{player.name}</p>
                        <p className="text-slate-400 text-xs">{player.position}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleAssignPlayer(player.id, 'A', 'sub')} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs" title="To Subs">Sub</button>
                        <button onClick={() => handleAssignPlayer(player.id, 'A', 'notPlaying')} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs" title="Not Playing">×</button>
                        <button onClick={() => handleAssignPlayer(player.id, 'B', 'starting')} className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs" title="To Team B">→B</button>
                      </div>
                    </div>
                  </div>
                ))}
                {teamAStarting.length === 0 && <p className="text-slate-500 text-sm italic text-center py-4">No starters</p>}
              </div>
            </div>

            {/* Substitutes */}
            <div className="mb-4">
              <h4 className="text-sm font-bold text-blue-300 mb-2">Substitutes ({teamASubs.length})</h4>
              <div className="space-y-2 min-h-[60px]">
                {teamASubs.map(({ player }) => (
                  <div key={player.id} className="p-2 bg-slate-800/50 rounded-lg border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm truncate">{player.name}</p>
                        <p className="text-slate-400 text-xs">{player.position}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleAssignPlayer(player.id, 'A', 'starting')} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs" title="To Starting">⭐</button>
                        <button onClick={() => handleAssignPlayer(player.id, 'A', 'notPlaying')} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs" title="Not Playing">×</button>
                        <button onClick={() => handleAssignPlayer(player.id, 'B', 'sub')} className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs" title="To Team B">→B</button>
                      </div>
                    </div>
                  </div>
                ))}
                {teamASubs.length === 0 && <p className="text-slate-500 text-sm italic text-center py-2">No substitutes</p>}
              </div>
            </div>

            {/* Not Playing */}
            <div>
              <h4 className="text-sm font-bold text-slate-400 mb-2">Not Playing ({teamANotPlaying.length})</h4>
              <div className="space-y-2 min-h-[60px]">
                {teamANotPlaying.map(({ player }) => (
                  <div key={player.id} className="p-2 bg-slate-900/30 rounded-lg border border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-400 font-bold text-sm truncate">{player.name}</p>
                        <p className="text-slate-500 text-xs">{player.position}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleAssignPlayer(player.id, 'A', 'starting')} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs" title="To Starting">⭐</button>
                        <button onClick={() => handleAssignPlayer(player.id, 'A', 'sub')} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs" title="To Subs">Sub</button>
                        <button onClick={() => handleAssignPlayer(player.id, 'B', 'notPlaying')} className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs" title="To Team B">→B</button>
                      </div>
                    </div>
                  </div>
                ))}
                {teamANotPlaying.length === 0 && <p className="text-slate-500 text-sm italic text-center py-2">All players assigned</p>}
              </div>
            </div>
          </div>

          {/* Team B Section */}
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl rounded-3xl border border-green-500/30 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-green-400">Team B</h3>
              <span className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-green-400 text-sm font-bold">
                {teamBStarting.length + teamBSubs.length + teamBNotPlaying.length} players
              </span>
            </div>

            {/* Starting XI */}
            <div className="mb-4">
              <h4 className="text-sm font-bold text-green-300 mb-2">Starting XI ({teamBStarting.length}/{teamSize})</h4>
              <div className="space-y-2 min-h-[100px]">
                {teamBStarting.map(({ player }) => (
                  <div key={player.id} className="p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm truncate">{player.name}</p>
                        <p className="text-slate-400 text-xs">{player.position}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleAssignPlayer(player.id, 'A', 'starting')} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs" title="To Team A">A←</button>
                        <button onClick={() => handleAssignPlayer(player.id, 'B', 'sub')} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs" title="To Subs">Sub</button>
                        <button onClick={() => handleAssignPlayer(player.id, 'B', 'notPlaying')} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs" title="Not Playing">×</button>
                      </div>
                    </div>
                  </div>
                ))}
                {teamBStarting.length === 0 && <p className="text-slate-500 text-sm italic text-center py-4">No starters</p>}
              </div>
            </div>

            {/* Substitutes */}
            <div className="mb-4">
              <h4 className="text-sm font-bold text-green-300 mb-2">Substitutes ({teamBSubs.length})</h4>
              <div className="space-y-2 min-h-[60px]">
                {teamBSubs.map(({ player }) => (
                  <div key={player.id} className="p-2 bg-slate-800/50 rounded-lg border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm truncate">{player.name}</p>
                        <p className="text-slate-400 text-xs">{player.position}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleAssignPlayer(player.id, 'A', 'sub')} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs" title="To Team A">A←</button>
                        <button onClick={() => handleAssignPlayer(player.id, 'B', 'starting')} className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs" title="To Starting">⭐</button>
                        <button onClick={() => handleAssignPlayer(player.id, 'B', 'notPlaying')} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs" title="Not Playing">×</button>
                      </div>
                    </div>
                  </div>
                ))}
                {teamBSubs.length === 0 && <p className="text-slate-500 text-sm italic text-center py-2">No substitutes</p>}
              </div>
            </div>

            {/* Not Playing */}
            <div>
              <h4 className="text-sm font-bold text-slate-400 mb-2">Not Playing ({teamBNotPlaying.length})</h4>
              <div className="space-y-2 min-h-[60px]">
                {teamBNotPlaying.map(({ player }) => (
                  <div key={player.id} className="p-2 bg-slate-900/30 rounded-lg border border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-400 font-bold text-sm truncate">{player.name}</p>
                        <p className="text-slate-500 text-xs">{player.position}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleAssignPlayer(player.id, 'A', 'notPlaying')} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs" title="To Team A">A←</button>
                        <button onClick={() => handleAssignPlayer(player.id, 'B', 'starting')} className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs" title="To Starting">⭐</button>
                        <button onClick={() => handleAssignPlayer(player.id, 'B', 'sub')} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs" title="To Subs">Sub</button>
                      </div>
                    </div>
                  </div>
                ))}
                {teamBNotPlaying.length === 0 && <p className="text-slate-500 text-sm italic text-center py-2">All players assigned</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate(`/teams/${id}`)}
            className="px-6 py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleStartMatch}
            disabled={creating || teamAPlayers.length === 0 || teamBPlayers.length === 0}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Creating...
              </>
            ) : (
              <>
                ⚽ Start Internal Match
              </>
            )}
          </button>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <p className="text-sm text-slate-300">
            <strong className="text-blue-400">💡 Tip:</strong> Internal matches are great for practice sessions and training.
            Assign players to Team A or Team B, then start the match to track performance and statistics.
          </p>
        </div>
      </div>
    </div>
  );
}

export default InternalMatch;
