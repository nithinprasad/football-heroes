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
  team: 'A' | 'B' | 'bench';
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

      // Load players
      if (teamData.playerIds && teamData.playerIds.length > 0) {
        const playersData = await Promise.all(
          teamData.playerIds.map((playerId) => userService.getUserById(playerId))
        );
        const validPlayers = playersData.filter((p) => p !== null) as User[];
        setPlayers(validPlayers);

        // Initialize all players on bench
        setAssignments(
          validPlayers.map((player) => ({
            player,
            team: 'bench',
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

  const handleAssignPlayer = (playerId: string, newTeam: 'A' | 'B' | 'bench') => {
    setAssignments((prev) =>
      prev.map((assignment) =>
        assignment.player.id === playerId
          ? { ...assignment, team: newTeam }
          : assignment
      )
    );
  };

  const handleStartMatch = async () => {
    const teamAPlayers = assignments.filter((a) => a.team === 'A');
    const teamBPlayers = assignments.filter((a) => a.team === 'B');

    // Validation
    if (teamAPlayers.length === 0 || teamBPlayers.length === 0) {
      toast.warning('Both teams must have at least one player', 'Invalid Teams');
      return;
    }

    if (!matchName.trim()) {
      toast.warning('Please enter a match name', 'Match Name Required');
      return;
    }

    const confirmed = await toast.confirm(
      `Start internal match with Team A (${teamAPlayers.length} players) vs Team B (${teamBPlayers.length} players)?`,
      'Start Internal Match'
    );

    if (!confirmed) return;

    try {
      setCreating(true);

      // Create internal match (no tournament)
      const matchId = await matchService.createStandaloneMatch({
        homeTeamId: id!, // Use actual team ID
        awayTeamId: id!, // Same team
        venue: venue.trim() || 'Training Ground',
        matchDate: new Date(),
        matchDuration: duration,
        createdBy: currentUser!.uid,
        isInternalMatch: true, // Mark as internal
        internalTeamA: teamAPlayers.map((a) => a.player.id),
        internalTeamB: teamBPlayers.map((a) => a.player.id),
        matchName: matchName.trim(),
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

  const teamAPlayers = assignments.filter((a) => a.team === 'A');
  const teamBPlayers = assignments.filter((a) => a.team === 'B');
  const benchPlayers = assignments.filter((a) => a.team === 'bench');

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Match Name</label>
              <input
                type="text"
                value={matchName}
                onChange={(e) => setMatchName(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-white/10 rounded-xl text-white"
                placeholder="Internal Match"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Venue</label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-white/10 rounded-xl text-white"
                placeholder="Training Ground"
              />
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Team A */}
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl rounded-3xl border border-blue-500/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-black text-blue-400">Team A</h3>
              <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-400 text-sm font-bold">
                {teamAPlayers.length} players
              </span>
            </div>

            <div className="space-y-2 min-h-[200px]">
              {teamAPlayers.map(({ player }) => (
                <div
                  key={player.id}
                  className="p-3 bg-slate-900/50 rounded-xl border border-white/10 group hover:border-blue-500/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-white font-bold text-sm">{player.name}</p>
                      <p className="text-slate-400 text-xs">{player.position}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleAssignPlayer(player.id, 'B')}
                        className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30"
                        title="Move to Team B"
                      >
                        →B
                      </button>
                      <button
                        onClick={() => handleAssignPlayer(player.id, 'bench')}
                        className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs hover:bg-slate-600"
                        title="Move to Bench"
                      >
                        Bench
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {teamAPlayers.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No players assigned to Team A
                </div>
              )}
            </div>
          </div>

          {/* Bench */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-black text-white">Available Players</h3>
              <span className="px-3 py-1 bg-slate-700 rounded-full text-slate-300 text-sm font-bold">
                {benchPlayers.length} players
              </span>
            </div>

            <div className="space-y-2 min-h-[200px]">
              {benchPlayers.map(({ player }) => (
                <div
                  key={player.id}
                  className="p-3 bg-slate-900/50 rounded-xl border border-white/10 group hover:border-green-500/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-white font-bold text-sm">{player.name}</p>
                      <p className="text-slate-400 text-xs">{player.position}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleAssignPlayer(player.id, 'A')}
                        className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs hover:bg-blue-500/30"
                        title="Add to Team A"
                      >
                        A
                      </button>
                      <button
                        onClick={() => handleAssignPlayer(player.id, 'B')}
                        className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30"
                        title="Add to Team B"
                      >
                        B
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {benchPlayers.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-sm">
                  All players assigned to teams
                </div>
              )}
            </div>
          </div>

          {/* Team B */}
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl rounded-3xl border border-green-500/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-black text-green-400">Team B</h3>
              <span className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-green-400 text-sm font-bold">
                {teamBPlayers.length} players
              </span>
            </div>

            <div className="space-y-2 min-h-[200px]">
              {teamBPlayers.map(({ player }) => (
                <div
                  key={player.id}
                  className="p-3 bg-slate-900/50 rounded-xl border border-white/10 group hover:border-green-500/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-white font-bold text-sm">{player.name}</p>
                      <p className="text-slate-400 text-xs">{player.position}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleAssignPlayer(player.id, 'A')}
                        className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs hover:bg-blue-500/30"
                        title="Move to Team A"
                      >
                        A←
                      </button>
                      <button
                        onClick={() => handleAssignPlayer(player.id, 'bench')}
                        className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs hover:bg-slate-600"
                        title="Move to Bench"
                      >
                        Bench
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {teamBPlayers.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No players assigned to Team B
                </div>
              )}
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
