import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import tournamentService from '../services/tournament.service';
import tournamentJoinRequestService from '../services/tournamentJoinRequest.service';
import teamService from '../services/team.service';
import { Team } from '../types';

interface JoinTournamentModalProps {
  tournamentId: string;
  tournamentName: string;
  inviteCode: string;
  onClose: () => void;
  onSuccess: () => void;
}

const JoinTournamentModal = ({
  tournamentId,
  tournamentName,
  inviteCode,
  onClose,
  onSuccess,
}: JoinTournamentModalProps) => {
  const { currentUser, userProfile } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (userProfile) {
      loadMyTeams();
    }
  }, [userProfile]);

  const loadMyTeams = async () => {
    if (!userProfile) return;

    try {
      // Ensure teamIds exists and is an array
      const teamIds = Array.isArray(userProfile.teamIds) ? userProfile.teamIds : [];
      if (teamIds.length === 0) {
        setMyTeams([]);
        return;
      }

      const teams = await teamService.getTeamsByIds(teamIds);
      // Filter teams where user is manager or captain
      const managedTeams = teams.filter(
        (team) => team.managerId === currentUser?.uid || team.captainId === currentUser?.uid
      );
      setMyTeams(managedTeams);
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser || !userProfile) {
      toast.error('Please login to join tournaments', 'Error');
      return;
    }

    if (enteredCode.trim().toUpperCase() !== inviteCode.toUpperCase()) {
      toast.error('Invalid invite code', 'Error');
      return;
    }

    if (!selectedTeamId) {
      toast.error('Please select a team', 'Error');
      return;
    }

    setLoading(true);

    try {
      const team = myTeams.find((t) => t.id === selectedTeamId);
      if (!team) {
        throw new Error('Team not found');
      }

      await tournamentJoinRequestService.createJoinRequest(
        tournamentId,
        selectedTeamId,
        team.name,
        currentUser.uid,
        userProfile.name,
        message.trim()
      );

      toast.success(
        'Join request submitted! The organizer will review your request.',
        'Request Sent!'
      );
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit join request', 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Join Tournament</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <p className="text-blue-400 font-medium mb-1">Tournament</p>
          <p className="text-white text-lg font-bold">{tournamentName}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Invite Code */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Enter Invite Code
            </label>
            <input
              type="text"
              value={enteredCode}
              onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-green-500/50 font-mono text-lg tracking-wider"
              required
            />
          </div>

          {/* Team Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Select Your Team
            </label>
            {myTeams.length === 0 ? (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <p className="text-yellow-400 text-sm">
                  You need to be a manager or captain of a team to join tournaments.
                </p>
              </div>
            ) : (
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-green-500/50"
                required
              >
                <option value="">Choose a team...</option>
                {myTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} {team.teamId ? `(${team.teamId})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Optional Message */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell the organizer why your team should join..."
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-green-500/50 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || myTeams.length === 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinTournamentModal;
