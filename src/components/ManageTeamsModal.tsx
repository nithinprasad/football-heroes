import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import tournamentService from '../services/tournament.service';
import tournamentJoinRequestService from '../services/tournamentJoinRequest.service';
import teamService from '../services/team.service';
import userService from '../services/user.service';
import { TournamentJoinRequest, Team } from '../types';

interface ManageTeamsModalProps {
  tournamentId: string;
  onClose: () => void;
  onUpdate: () => void;
}

const ManageTeamsModal = ({ tournamentId, onClose, onUpdate }: ManageTeamsModalProps) => {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'requests' | 'add'>('requests');
  const [joinRequests, setJoinRequests] = useState<TournamentJoinRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Add team states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [managerPhone, setManagerPhone] = useState('');
  const [managerName, setManagerName] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);

  const loadJoinRequests = async () => {
    try {
      setLoadingRequests(true);
      const requests = await tournamentJoinRequestService.getRequestsByTournament(tournamentId);
      setJoinRequests(requests);
      console.log('📋 Loaded join requests:', requests.length, 'total,', requests.filter(r => r.status === 'PENDING').length, 'pending');
    } catch (error) {
      console.error('Error loading join requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleSearchTeams = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const teams = await teamService.searchTeams(searchQuery);
      setSearchResults(teams);
    } catch (error) {
      toast.error('Failed to search teams', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: TournamentJoinRequest) => {
    if (!currentUser) return;

    setProcessing(request.id);
    try {
      // Add team to tournament
      await tournamentService.addTeamToTournament(tournamentId, request.teamId);

      // Update request status
      await tournamentJoinRequestService.approveRequest(request.id, currentUser.uid);

      toast.success(`${request.teamName} has been added to the tournament!`, 'Team Approved');
      loadJoinRequests();
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve request', 'Error');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (request: TournamentJoinRequest) => {
    if (!currentUser) return;

    setProcessing(request.id);
    try {
      await tournamentJoinRequestService.rejectRequest(request.id, currentUser.uid);
      toast.info(`Request from ${request.teamName} has been rejected`, 'Request Rejected');
      loadJoinRequests();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject request', 'Error');
    } finally {
      setProcessing(null);
    }
  };

  useEffect(() => {
    loadJoinRequests();
  }, [tournamentId]);

  // Auto-search as user types (with debounce)
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        handleSearchTeams();
      } else {
        setSearchResults([]);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const handleAddExistingTeam = async () => {
    if (!selectedTeam) {
      toast.error('Please select a team', 'Error');
      return;
    }

    // If team already has a manager, we don't need phone number
    const needsManager = !selectedTeam.managerId;

    if (needsManager && !managerPhone.trim()) {
      toast.error('Please enter manager phone number for this team', 'Error');
      return;
    }

    setCreatingTeam(true);
    try {
      // If team doesn't have a manager, create/assign one
      if (needsManager) {
        const managerId = await userService.createUnverifiedUser(
          managerPhone,
          managerName.trim() || undefined
        );
        await teamService.updateTeam(selectedTeam.id, { managerId });
      }

      // Add team to tournament
      await tournamentService.addTeamToTournament(tournamentId, selectedTeam.id);

      toast.success(`${selectedTeam.name} added to tournament!`, 'Team Added');
      setSelectedTeam(null);
      setManagerPhone('');
      setManagerName('');
      setSearchQuery('');
      setSearchResults([]);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add team', 'Error');
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleCreateNewTeam = async (teamName: string) => {
    if (!teamName.trim() || !managerPhone.trim()) {
      toast.error('Please enter team name and manager phone number', 'Error');
      return;
    }

    setCreatingTeam(true);
    try {
      // Create or get unverified manager profile
      const managerId = await userService.createUnverifiedUser(
        managerPhone,
        managerName.trim() || undefined
      );

      // Create team
      const teamId = await teamService.createTeam(
        {
          name: teamName.trim(),
        },
        managerId
      );

      // Add team to tournament
      await tournamentService.addTeamToTournament(tournamentId, teamId);

      toast.success(`${teamName} created and added to tournament!`, 'Team Created');
      setManagerPhone('');
      setManagerName('');
      setSearchQuery('');
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create team', 'Error');
    } finally {
      setCreatingTeam(false);
    }
  };

  const pendingRequests = joinRequests.filter((req) => req.status === 'PENDING');

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 border border-white/10 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">Manage Teams</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 px-6 py-4 font-medium transition-colors relative ${
              activeTab === 'requests'
                ? 'text-green-400 bg-green-500/10'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Join Requests
            {pendingRequests.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'add'
                ? 'text-green-400 bg-green-500/10'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Add Team
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'requests' ? (
            <div className="space-y-4">
              {loadingRequests ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                  <p className="text-slate-400">Loading join requests...</p>
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-slate-400 text-lg">No pending join requests</p>
                </div>
              ) : (
                pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-white font-bold text-lg mb-1">{request.teamName}</h3>
                        <p className="text-slate-400 text-sm mb-2">
                          Requested by: {request.requestedByName}
                        </p>
                        {request.message && (
                          <p className="text-white/80 text-sm bg-white/5 p-3 rounded-lg">
                            "{request.message}"
                          </p>
                        )}
                        <p className="text-slate-500 text-xs mt-2">
                          {new Date(request.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(request)}
                          disabled={processing === request.id}
                          className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 rounded-lg font-medium transition-all text-sm disabled:opacity-50"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => handleReject(request)}
                          disabled={processing === request.id}
                          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg font-medium transition-all text-sm disabled:opacity-50"
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {joinRequests.filter((req) => req.status !== 'PENDING').length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h3 className="text-white/60 font-medium mb-3">Reviewed Requests</h3>
                  <div className="space-y-2">
                    {joinRequests
                      .filter((req) => req.status !== 'PENDING')
                      .map((request) => (
                        <div
                          key={request.id}
                          className="p-3 bg-white/5 border border-white/10 rounded-lg text-sm"
                        >
                          <span className="text-white font-medium">{request.teamName}</span>
                          <span
                            className={`ml-3 px-2 py-0.5 rounded-full text-xs ${
                              request.status === 'APPROVED'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {request.status}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Search or Create Team */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Search Existing Team or Create New
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type team name or ID... (searches automatically)"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-green-500/50"
                  />
                  {loading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                    </div>
                  )}
                </div>
                {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
                  <p className="text-slate-500 text-xs mt-1">Type at least 2 characters to search</p>
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div>
                  <p className="text-slate-400 text-sm mb-3">Select an existing team:</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {searchResults.map((team) => (
                      <button
                        key={team.id}
                        onClick={() => setSelectedTeam(team)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedTeam?.id === team.id
                            ? 'bg-green-500/20 border-green-500/30 text-green-400'
                            : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                        }`}
                      >
                        <div className="font-medium">{team.name}</div>
                        {team.teamId && (
                          <div className="text-xs text-white/60 mt-1">{team.teamId}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Or Create New Team */}
              {searchQuery && searchResults.length === 0 && !loading && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <p className="text-blue-400 text-sm mb-3">
                    No team found. Create "{searchQuery}" as a new team?
                  </p>
                </div>
              )}

              {/* Manager Details - Only show if team needs a manager */}
              {(!selectedTeam || !selectedTeam.managerId || !searchQuery) && (
                <div className="space-y-4">
                  {selectedTeam && selectedTeam.managerId ? (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                      <p className="text-green-400 text-sm">
                        ✓ This team already has a manager. No need to assign one.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Manager Phone Number {!selectedTeam || searchQuery ? '*' : ''}
                        </label>
                        <input
                          type="tel"
                          value={managerPhone}
                          onChange={(e) => setManagerPhone(e.target.value)}
                          placeholder="+1234567890"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-green-500/50"
                        />
                        <p className="text-slate-500 text-xs mt-1">
                          {selectedTeam
                            ? 'This team needs a manager assigned'
                            : "If this person hasn't signed up yet, we'll create an unverified profile for them"}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Manager Name (Optional)
                        </label>
                        <input
                          type="text"
                          value={managerName}
                          onChange={(e) => setManagerName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-green-500/50"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Add Team Button */}
              <button
                onClick={() =>
                  selectedTeam
                    ? handleAddExistingTeam()
                    : searchQuery
                    ? handleCreateNewTeam(searchQuery)
                    : null
                }
                disabled={
                  creatingTeam ||
                  (!selectedTeam && !searchQuery) ||
                  (selectedTeam && !selectedTeam.managerId && !managerPhone.trim()) ||
                  (!selectedTeam && searchQuery && !managerPhone.trim())
                }
                className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingTeam
                  ? 'Adding Team...'
                  : selectedTeam
                  ? `Add ${selectedTeam.name} to Tournament`
                  : searchQuery
                  ? `Create & Add "${searchQuery}"`
                  : 'Enter Team Name or Search'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageTeamsModal;
