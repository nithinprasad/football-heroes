import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import teamService from '../services/team.service';
import userService from '../services/user.service';
import { Team, User, TeamJoinRequest, TeamPlayerRoster } from '../types';
import Header from '../components/Header';
import ImageUpload from '../components/ImageUpload';
import AddPlayerModal from '../components/AddPlayerModal';
import { handleError } from '../utils/errorHandler';

function ManageTeam() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isManager, setIsManager] = useState(false);

  // Edit team state
  const [editingTeam, setEditingTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [savingTeam, setSavingTeam] = useState(false);

  // Add player modal
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);

  // Jersey number editing
  const [editingJersey, setEditingJersey] = useState<string | null>(null);
  const [jerseyNumbers, setJerseyNumbers] = useState<Record<string, number>>({});
  const [tempJerseyNumber, setTempJerseyNumber] = useState<number | ''>('');

  // Active tab
  const [activeTab, setActiveTab] = useState<'players' | 'requests' | 'stats'>('players');

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

      setTeam(teamData);
      setTeamName(teamData.name);

      // Check if current user is the manager
      if (currentUser && teamData.managerId === currentUser.uid) {
        setIsManager(true);
      } else {
        toast.error('You are not authorized to manage this team', 'Access Denied');
        navigate(`/teams/${id}`);
        return;
      }

      // Load players
      if (teamData.playerIds && teamData.playerIds.length > 0) {
        const playersData = await Promise.all(
          teamData.playerIds.map((playerId) => userService.getUserById(playerId))
        );
        const validPlayers = playersData.filter((p) => p !== null) as User[];
        setPlayers(validPlayers);

        // Load jersey numbers from roster
        const jerseys: Record<string, number> = {};
        validPlayers.forEach((player) => {
          const rosterEntry = teamData.roster?.find((r) => r.playerId === player.id);
          if (rosterEntry?.jerseyNumber) {
            jerseys[player.id] = rosterEntry.jerseyNumber;
          }
        });
        setJerseyNumbers(jerseys);
      }
    } catch (error) {
      toast.error(handleError(error, 'Load Team'), 'Error');
      navigate('/my-teams');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = async (playerId: string) => {
    await teamService.addPlayerToTeam(id!, playerId);
    toast.success('Player added to team successfully!', 'Success!');
    await loadTeamData();
  };

  const handleCreateAndAddPlayer = async (name: string, phone: string, dialCode: string) => {
    const fullPhoneNumber = `${dialCode}${phone}`;
    const userId = await userService.createUnverifiedUser(fullPhoneNumber, name);
    await teamService.addPlayerToTeam(id!, userId);
    toast.success(`${name} added to team successfully!`, 'Success!');
    await loadTeamData();
  };

  const handleRemovePlayer = async (playerId: string, playerName: string) => {
    if (playerId === team?.managerId) {
      toast.error('Cannot remove team manager', 'Error');
      return;
    }

    if (playerId === team?.captainId) {
      toast.error('Cannot remove team captain. Change captain first.', 'Error');
      return;
    }

    const confirmed = await toast.confirm(
      `Remove ${playerName} from the team? This will also remove all their team-specific data.`,
      'Remove Player'
    );
    if (!confirmed) {
      return;
    }

    try {
      await teamService.removePlayerFromTeam(id!, playerId);
      toast.success(`${playerName} removed from team`, 'Success!');
      await loadTeamData();
    } catch (error) {
      toast.error(handleError(error, 'Remove Player'), 'Error');
    }
  };

  const handleStartEditingJersey = (playerId: string) => {
    setEditingJersey(playerId);
    setTempJerseyNumber(jerseyNumbers[playerId] || '');
  };

  const handleCancelEditingJersey = () => {
    setEditingJersey(null);
    setTempJerseyNumber('');
  };

  const handleUpdateJerseyNumber = async (playerId: string, jerseyNumber: number | '') => {
    if (jerseyNumber === '' || jerseyNumber < 0 || jerseyNumber > 99) {
      toast.warning('Please enter a valid jersey number (0-99)', 'Invalid Number');
      return;
    }

    try {
      // Update roster
      const roster = team?.roster || [];
      const existingIndex = roster.findIndex((r) => r.playerId === playerId);

      if (existingIndex >= 0) {
        roster[existingIndex] = {
          ...roster[existingIndex],
          jerseyNumber,
        };
      } else {
        roster.push({
          playerId,
          jerseyNumber,
          joinedAt: new Date(),
        });
      }

      await teamService.updateTeam(id!, { roster });

      setJerseyNumbers({ ...jerseyNumbers, [playerId]: jerseyNumber });
      setEditingJersey(null);
      setTempJerseyNumber('');
      toast.success('Jersey number updated!', 'Success!');
    } catch (error) {
      toast.error(handleError(error, 'Update Jersey Number'), 'Error');
    }
  };

  const handleApproveJoinRequest = async (request: TeamJoinRequest) => {
    try {
      // Add player to team
      await teamService.addPlayerToTeam(id!, request.playerId);

      // Update join request status
      const updatedRequests = (team?.joinRequests || []).map((r) =>
        r.id === request.id
          ? { ...r, status: 'APPROVED' as const, reviewedAt: new Date(), reviewedBy: currentUser!.uid }
          : r
      );

      await teamService.updateTeam(id!, { joinRequests: updatedRequests });

      toast.success(`${request.playerName} added to team!`, 'Success!');
      await loadTeamData();
    } catch (error) {
      toast.error(handleError(error, 'Approve Request'), 'Error');
    }
  };

  const handleRejectJoinRequest = async (request: TeamJoinRequest) => {
    const confirmed = await toast.confirm(
      `Reject join request from ${request.playerName}?`,
      'Reject Request'
    );
    if (!confirmed) return;

    try {
      const updatedRequests = (team?.joinRequests || []).map((r) =>
        r.id === request.id
          ? { ...r, status: 'REJECTED' as const, reviewedAt: new Date(), reviewedBy: currentUser!.uid }
          : r
      );

      await teamService.updateTeam(id!, { joinRequests: updatedRequests });

      toast.success('Request rejected', 'Success!');
      await loadTeamData();
    } catch (error) {
      toast.error(handleError(error, 'Reject Request'), 'Error');
    }
  };

  const handleUpdateTeam = async () => {
    if (!teamName.trim()) {
      toast.error('Team name cannot be empty', 'Error');
      return;
    }

    try {
      setSavingTeam(true);
      await teamService.updateTeam(id!, { name: teamName });
      toast.success('Team updated successfully!', 'Success!');
      setEditingTeam(false);
      await loadTeamData();
    } catch (error) {
      toast.error(handleError(error, 'Update Team'), 'Error');
    } finally {
      setSavingTeam(false);
    }
  };

  const handleLogoUpload = async (file: File): Promise<string> => {
    try {
      const url = await teamService.uploadTeamLogo(id!, file);
      toast.success('Team logo updated!', 'Success!');
      await loadTeamData();
      return url;
    } catch (error: any) {
      throw new Error(handleError(error, 'Upload Logo'));
    }
  };

  const getPlayerTeamStats = (playerId: string) => {
    const rosterEntry = team?.roster?.find((r) => r.playerId === playerId);
    return rosterEntry?.teamStats || null;
  };

  const pendingRequests = team?.joinRequests?.filter((r) => r.status === 'PENDING') || [];

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

  if (!team || !isManager) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link to={`/teams/${id}`} className="text-green-400 hover:text-green-300 font-medium mb-4 inline-block">
            ← Back to Team
          </Link>
          <h1 className="text-4xl font-black text-white">Manage Team</h1>
          <p className="text-slate-400 mt-2">Add players, manage requests, and edit team details</p>
        </div>

        {/* Team Details Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-black text-white">Team Details</h2>
            {!editingTeam && (
              <button
                onClick={() => setEditingTeam(true)}
                className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl hover:bg-blue-500/30 transition-all"
              >
                ✏️ Edit
              </button>
            )}
          </div>

          {editingTeam ? (
            <div className="space-y-4">
              <ImageUpload
                currentImageUrl={team.logoURL}
                onUpload={handleLogoUpload}
                label="Team Logo"
                placeholder="⚽"
              />
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Team Name</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleUpdateTeam}
                  disabled={savingTeam}
                  className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50"
                >
                  {savingTeam ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setEditingTeam(false);
                    setTeamName(team.name);
                  }}
                  className="px-6 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              {team.logoURL && (
                <div className="w-16 h-16 rounded-xl bg-slate-900/50 border-2 border-white/10 overflow-hidden flex items-center justify-center">
                  <img src={team.logoURL} alt={team.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <p className="text-white text-xl font-bold">{team.name}</p>
                <p className="text-slate-400 text-sm mt-1">Team ID: {team.teamId}</p>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-white/10">
          <button
            onClick={() => setActiveTab('players')}
            className={`px-6 py-3 font-bold transition-all ${
              activeTab === 'players'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            👥 Players ({players.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-6 py-3 font-bold transition-all relative ${
              activeTab === 'requests'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📬 Join Requests
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-6 py-3 font-bold transition-all ${
              activeTab === 'stats'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📊 Team Stats
          </button>
        </div>

        {/* Players Tab */}
        {activeTab === 'players' && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-white">Players ({players.length})</h2>
              <button
                onClick={() => setShowAddPlayerModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all"
              >
                + Add Player
              </button>
            </div>

            <AddPlayerModal
              isOpen={showAddPlayerModal}
              onClose={() => setShowAddPlayerModal(false)}
              onAddPlayer={handleAddPlayer}
              onCreateAndAddPlayer={handleCreateAndAddPlayer}
              teamId={id!}
              existingPlayerIds={team?.playerIds || []}
            />

            <div className="space-y-3">
              {players.map((player) => {
                const playerJersey = jerseyNumbers[player.id];
                const isEditingThis = editingJersey === player.id;

                return (
                  <div
                    key={player.id}
                    className="p-4 bg-slate-900/50 rounded-xl border border-white/10 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white font-bold text-lg">{player.name || 'No name'}</p>
                          {player.id === team.managerId && (
                            <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded text-purple-400 text-xs font-bold">
                              Manager
                            </span>
                          )}
                          {player.id === team.captainId && (
                            <span className="px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/30 rounded text-yellow-400 text-xs font-bold">
                              Captain
                            </span>
                          )}
                          {player.isVerified === false && (
                            <span className="px-2 py-0.5 bg-orange-500/20 border border-orange-500/30 rounded text-orange-400 text-xs font-bold">
                              Unverified
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                          {player.mobileNumber && (
                            <span className="flex items-center gap-1">
                              📱 {player.mobileNumber}
                            </span>
                          )}
                          {player.position && (
                            <span className="flex items-center gap-1">
                              {player.position === 'Goalkeeper' && '🧤'}
                              {player.position === 'Defender' && '🛡️'}
                              {player.position === 'Midfielder' && '⚡'}
                              {player.position === 'Forward' && '⚽'}
                              {player.position}
                            </span>
                          )}
                        </div>

                        {/* Jersey Number */}
                        <div className="mt-2 flex items-center gap-2">
                          {player.jerseyNumber && !playerJersey && (
                            <span className="text-xs text-slate-500">
                              (Global: #{player.jerseyNumber})
                            </span>
                          )}
                          {isEditingThis ? (
                            <div className="inline-flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max="99"
                                value={tempJerseyNumber}
                                onChange={(e) => setTempJerseyNumber(e.target.value === '' ? '' : parseInt(e.target.value))}
                                placeholder="#"
                                className="w-16 px-2 py-1 bg-slate-800 border border-white/10 rounded text-white text-sm text-center"
                                autoFocus
                              />
                              <button
                                onClick={() => handleUpdateJerseyNumber(player.id, tempJerseyNumber)}
                                disabled={tempJerseyNumber === ''}
                                className="w-7 h-7 rounded bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all"
                                title="Save"
                              >
                                ✓
                              </button>
                              <button
                                onClick={handleCancelEditingJersey}
                                className="w-7 h-7 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white transition-all"
                                title="Cancel"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartEditingJersey(player.id)}
                              className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded text-sm hover:bg-blue-500/30 transition-all"
                            >
                              {playerJersey ? `#${playerJersey} Team ✏️` : '+ Set Team Jersey #'}
                            </button>
                          )}
                        </div>
                      </div>

                      {player.id !== team.managerId && player.id !== team.captainId && (
                        <button
                          onClick={() => handleRemovePlayer(player.id, player.name)}
                          className="px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30 text-sm font-medium"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {players.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">👥</div>
                  <p className="text-slate-400 text-lg">No players yet</p>
                  <p className="text-slate-500 text-sm mt-2">Add your first player to get started!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Join Requests Tab */}
        {activeTab === 'requests' && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6">
            <h2 className="text-2xl font-black text-white mb-6">Join Requests</h2>

            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 bg-slate-900/50 rounded-xl border border-yellow-500/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-white font-bold text-lg">{request.playerName}</p>
                      {request.playerPhone && (
                        <p className="text-slate-400 text-sm">📱 {request.playerPhone}</p>
                      )}
                      <p className="text-slate-500 text-xs mt-1">
                        Requested {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveJoinRequest(request)}
                        className="px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-500/30 font-medium"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleRejectJoinRequest(request)}
                        className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30 font-medium"
                      >
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {pendingRequests.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📬</div>
                  <p className="text-slate-400 text-lg">No pending requests</p>
                  <p className="text-slate-500 text-sm mt-2">
                    Players can request to join using the team join link
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Team Stats Tab */}
        {activeTab === 'stats' && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6">
            <h2 className="text-2xl font-black text-white mb-6">Team Statistics</h2>

            <div className="space-y-4">
              {players.map((player) => {
                const teamStats = getPlayerTeamStats(player.id);
                const jerseyNum = jerseyNumbers[player.id];

                return (
                  <div
                    key={player.id}
                    className="p-4 bg-slate-900/50 rounded-xl border border-white/10"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {jerseyNum && (
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 border-2 border-green-500/30 flex items-center justify-center">
                          <span className="text-green-400 font-bold">{jerseyNum}</span>
                        </div>
                      )}
                      <div>
                        <p className="text-white font-bold">{player.name}</p>
                        <p className="text-slate-400 text-sm">{player.position || 'No position'}</p>
                      </div>
                    </div>

                    {teamStats ? (
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                        <div className="text-center p-2 bg-slate-800 rounded">
                          <p className="text-slate-400 text-xs">Matches</p>
                          <p className="text-white font-bold">{teamStats.matches}</p>
                        </div>
                        <div className="text-center p-2 bg-slate-800 rounded">
                          <p className="text-slate-400 text-xs">Goals</p>
                          <p className="text-green-400 font-bold">⚽ {teamStats.goals}</p>
                        </div>
                        <div className="text-center p-2 bg-slate-800 rounded">
                          <p className="text-slate-400 text-xs">Assists</p>
                          <p className="text-blue-400 font-bold">🎯 {teamStats.assists}</p>
                        </div>
                        <div className="text-center p-2 bg-slate-800 rounded">
                          <p className="text-slate-400 text-xs">Clean Sheets</p>
                          <p className="text-cyan-400 font-bold">🧤 {teamStats.cleanSheets}</p>
                        </div>
                        <div className="text-center p-2 bg-slate-800 rounded">
                          <p className="text-slate-400 text-xs">Yellow</p>
                          <p className="text-yellow-400 font-bold">🟨 {teamStats.yellowCards}</p>
                        </div>
                        <div className="text-center p-2 bg-slate-800 rounded">
                          <p className="text-slate-400 text-xs">Red</p>
                          <p className="text-red-400 font-bold">🟥 {teamStats.redCards}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm text-center py-2">
                        No team stats yet
                      </p>
                    )}
                  </div>
                );
              })}

              {players.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📊</div>
                  <p className="text-slate-400 text-lg">No stats available</p>
                  <p className="text-slate-500 text-sm mt-2">Add players to see team statistics</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ManageTeam;
