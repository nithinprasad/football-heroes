import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import teamService from '../services/team.service';
import { Team, TeamJoinRequest } from '../types';
import Header from '../components/Header';

function JoinTeam() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const toast = useToast();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    loadTeam();
  }, [id]);

  const loadTeam = async () => {
    if (!id) {
      toast.error('Invalid team link', 'Error');
      navigate('/teams');
      return;
    }

    try {
      setLoading(true);
      const teamData = await teamService.getTeamById(id);

      if (!teamData) {
        toast.error('Team not found', 'Error');
        navigate('/teams');
        return;
      }

      setTeam(teamData);
    } catch (error) {
      console.error('Error loading team:', error);
      toast.error('Failed to load team details', 'Error');
      navigate('/teams');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRequest = async () => {
    if (!currentUser || !userProfile) {
      // Redirect to login with return URL
      navigate(`/login?redirect=/teams/join/${id}`);
      return;
    }

    if (!team) return;

    // Check if already a member
    if (team.playerIds.includes(currentUser.uid)) {
      toast.info('You are already a member of this team', 'Info');
      navigate(`/teams/${id}`);
      return;
    }

    // Check if already requested
    const existingRequest = team.joinRequests?.find(
      (r) => r.playerId === currentUser.uid && r.status === 'PENDING'
    );

    if (existingRequest) {
      toast.info('Your join request is already pending approval', 'Info');
      return;
    }

    try {
      setRequesting(true);

      // Create join request
      const joinRequests = team.joinRequests || [];
      joinRequests.push({
        id: `${currentUser.uid}_${Date.now()}`,
        teamId: id!,
        playerId: currentUser.uid,
        playerName: userProfile.name,
        playerPhone: userProfile.mobileNumber,
        status: 'PENDING',
        createdAt: new Date(),
      });

      await teamService.updateTeam(id!, { joinRequests });

      toast.success(`Join request sent to ${team.name}!`, 'Request Sent');
      navigate(`/teams/${id}`);
    } catch (error) {
      console.error('Error sending join request:', error);
      toast.error('Failed to send join request. Please try again.', 'Error');
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-green-400/30 border-t-green-400 rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-slate-300">Loading team...</p>
          </div>
        </div>
      </>
    );
  }

  if (!team) {
    return null;
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Team Card */}
          <div className="bg-slate-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-center">
              <div className="text-6xl mb-4">⚽</div>
              <h1 className="text-3xl font-bold text-white mb-2">{team.name}</h1>
              {team.location && (
                <p className="text-green-100 flex items-center justify-center gap-2">
                  <span>📍</span>
                  {team.location}
                </p>
              )}
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span>👥</span>
                  Join This Team
                </h2>
                <p className="text-slate-300 mb-6">
                  You've been invited to join <strong className="text-white">{team.name}</strong>.
                  Click the button below to become a member of this team.
                </p>

                {/* Team Info */}
                <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-800 rounded-xl border border-white/10">
                  <div>
                    <p className="text-slate-400 text-sm">Players</p>
                    <p className="text-white font-bold text-lg">{team.playerIds.length}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Sport</p>
                    <p className="text-white font-bold text-lg capitalize">{team.sport}</p>
                  </div>
                </div>

                {currentUser && team.playerIds.includes(currentUser.uid) ? (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl mb-4">
                    <p className="text-blue-400 text-center">
                      ✓ You are already a member of this team
                    </p>
                  </div>
                ) : currentUser && team.joinRequests?.find((r) => r.playerId === currentUser.uid && r.status === 'PENDING') ? (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl mb-4">
                    <p className="text-yellow-400 text-center">
                      ⏳ Your join request is pending approval
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleJoinRequest}
                  disabled={
                    requesting ||
                    (currentUser && team.playerIds.includes(currentUser.uid)) ||
                    (currentUser && !!team.joinRequests?.find((r) => r.playerId === currentUser.uid && r.status === 'PENDING'))
                  }
                  className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
                >
                  {requesting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Sending Request...
                    </>
                  ) : currentUser && team.playerIds.includes(currentUser.uid) ? (
                    <>
                      <span>✓</span>
                      Already a Member
                    </>
                  ) : currentUser && team.joinRequests?.find((r) => r.playerId === currentUser.uid && r.status === 'PENDING') ? (
                    <>
                      <span>⏳</span>
                      Request Pending
                    </>
                  ) : !currentUser ? (
                    <>
                      <span>🔐</span>
                      Sign In to Join
                    </>
                  ) : (
                    <>
                      <span>➕</span>
                      Request to Join
                    </>
                  )}
                </button>

                <button
                  onClick={() => navigate(`/teams/${id}`)}
                  className="w-full px-6 py-3 bg-slate-800 text-slate-300 rounded-xl font-medium hover:bg-slate-700 transition-all border border-white/10"
                >
                  View Team Profile
                </button>

                <button
                  onClick={() => navigate('/teams')}
                  className="w-full px-6 py-3 text-slate-400 hover:text-white transition-colors"
                >
                  ← Back to Teams
                </button>
              </div>

              {/* Info Box */}
              <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <p className="text-sm text-slate-300">
                  <strong className="text-blue-400">💡 Note:</strong>
                  <br />
                  By joining this team, you'll be able to participate in matches, view team statistics, and stay connected with your teammates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default JoinTeam;
