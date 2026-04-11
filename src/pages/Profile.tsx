import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import teamService from '../services/team.service';
import tournamentService from '../services/tournament.service';
import matchService from '../services/match.service';
import userService from '../services/user.service';
import { Position, Team, Tournament, Match } from '../types';
import Header from '../components/Header';
import ImageUpload from '../components/ImageUpload';
import { handleError } from '../utils/errorHandler';

function Profile() {
  const { userProfile, updateProfile, currentUser } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: userProfile?.name || '',
    position: (userProfile?.position || 'Forward') as Position,
    jerseyNumber: userProfile?.jerseyNumber || 0,
  });
  const [saving, setSaving] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile) {
      loadProfileData();
    }
  }, [userProfile]);

  const loadProfileData = async () => {
    if (!userProfile) return;

    console.log('🔍 Loading profile data for user:', userProfile);
    console.log('📋 User teamIds:', userProfile.teamIds);

    try {
      setLoading(true);

      // Load user's teams
      if (userProfile.teamIds && userProfile.teamIds.length > 0) {
        console.log('✅ Loading teams for IDs:', userProfile.teamIds);
        const userTeams = await teamService.getTeamsByIds(userProfile.teamIds);
        console.log('✅ Teams loaded:', userTeams);
        setTeams(userTeams);

        // Load matches for user's teams
        const matchPromises = userProfile.teamIds.map((teamId) =>
          matchService.getMatchesByTeam(teamId)
        );
        const allMatches = await Promise.all(matchPromises);
        const flatMatches = allMatches.flat();

        // Sort by date descending and take last 5
        const sortedMatches = flatMatches
          .sort((a, b) => {
            const dateA = a.matchDate instanceof Date ? a.matchDate : new Date((a.matchDate as any).seconds * 1000);
            const dateB = b.matchDate instanceof Date ? b.matchDate : new Date((b.matchDate as any).seconds * 1000);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 5);

        setRecentMatches(sortedMatches);

        // Get unique tournament IDs from matches
        const tournamentIds = [
          ...new Set(
            flatMatches.filter((m) => m.tournamentId).map((m) => m.tournamentId!)
          ),
        ];

        // Load tournaments
        if (tournamentIds.length > 0) {
          const tournamentPromises = tournamentIds.map((id) =>
            tournamentService.getTournamentById(id)
          );
          const tournamentData = await Promise.all(tournamentPromises);
          setTournaments(tournamentData.filter((t) => t !== null) as Tournament[]);
        }
      } else {
        console.log('⚠️ No teamIds found in user profile');
      }

      // Also load tournaments where user is organizer
      if (currentUser) {
        try {
          const organizerTournaments = await tournamentService.getTournamentsByOrganizer(
            currentUser.uid
          );
          // Merge with existing tournaments (avoid duplicates)
          if (Array.isArray(organizerTournaments) && organizerTournaments.length > 0) {
            setTournaments((prev) => {
              const prevArray = Array.isArray(prev) ? prev : [];
              const existingIds = new Set(prevArray.map((t) => t.id));
              const newTournaments = organizerTournaments.filter((t) => !existingIds.has(t.id));
              return [...prevArray, ...newTournaments];
            });
          }
        } catch (err) {
          console.error('Error loading organizer tournaments:', err);
        }
      }
    } catch (error) {
      console.error('❌ Error loading profile data:', error);
    } finally {
      setLoading(false);
      console.log('✅ Profile data loading complete. Teams:', teams.length);
    }
  };

  const formatDate = (date: any) => {
    const d = date instanceof Date ? date : new Date(date.seconds * 1000);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      SCHEDULED: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Upcoming' },
      ONGOING: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: 'Live' },
      COMPLETED: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30', label: 'Finished' },
      UPCOMING: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Upcoming' },
    };
    const badge = badges[status] || badges.SCHEDULED;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
        {badge.label}
      </span>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await updateProfile(formData);
      toast.success('Profile updated successfully!', 'Success!');
      setEditing(false);
    } catch (error: any) {
      toast.error(handleError(error, 'Update Profile'), 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (file: File): Promise<string> => {
    if (!currentUser) throw new Error('Not logged in');

    try {
      const url = await userService.uploadProfilePhoto(currentUser.uid, file);
      toast.success('Profile photo updated!', 'Success!');
      return url;
    } catch (error: any) {
      throw new Error(handleError(error, 'Upload Photo'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl md:text-4xl font-black text-white">My Profile</h1>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-500/20"
            >
              Edit Profile
            </button>
          )}
        </div>

        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6">
          {!editing ? (
            <div className="space-y-6">
              {/* Profile Photo */}
              <div className="flex items-center gap-4 pb-6 border-b border-white/10">
                <div className="w-20 h-20 rounded-full bg-slate-900/50 border-2 border-white/10 overflow-hidden flex items-center justify-center">
                  {userProfile?.photoURL ? (
                    <img
                      src={userProfile.photoURL}
                      alt={userProfile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-4xl">👤</div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{userProfile?.name || 'Not set'}</h3>
                  <p className="text-slate-400 text-sm">{userProfile?.position || 'Position not set'}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Name</label>
                <p className="text-lg font-medium text-white">{userProfile?.name || 'Not set'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Mobile Number
                </label>
                <p className="text-lg font-medium text-white">{userProfile?.mobileNumber}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Position</label>
                <p className="text-lg font-medium text-white">{userProfile?.position || 'Not set'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Jersey Number
                </label>
                <p className="text-lg font-medium text-white">
                  {userProfile?.jerseyNumber ? `#${userProfile.jerseyNumber}` : 'Not set'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Roles</label>
                <div className="flex flex-wrap gap-2">
                  {userProfile?.roles && userProfile.roles.length > 0 ? (
                    userProfile.roles.map((role) => (
                      <span
                        key={role}
                        className="bg-green-500/20 border border-green-500/30 text-green-400 text-sm px-3 py-1 rounded-full font-medium"
                      >
                        {role}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 text-sm">No roles assigned</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Image Upload */}
              <ImageUpload
                currentImageUrl={userProfile?.photoURL}
                onUpload={handlePhotoUpload}
                label="Profile Photo"
                placeholder="👤"
              />

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                  Name *
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-green-500/50"
                />
              </div>

              <div>
                <label
                  htmlFor="position"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Position *
                </label>
                <select
                  id="position"
                  required
                  value={formData.position}
                  onChange={(e) =>
                    setFormData({ ...formData, position: e.target.value as Position })
                  }
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-green-500/50"
                >
                  <option value="Goalkeeper">Goalkeeper 🧤</option>
                  <option value="Defender">Defender 🛡️</option>
                  <option value="Midfielder">Midfielder ⚡</option>
                  <option value="Forward">Forward ⚽</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="jerseyNumber"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Jersey Number
                </label>
                <input
                  id="jerseyNumber"
                  type="number"
                  min="0"
                  max="99"
                  value={formData.jerseyNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, jerseyNumber: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-green-500/50"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      name: userProfile?.name || '',
                      position: (userProfile?.position || 'Forward') as Position,
                      jerseyNumber: userProfile?.jerseyNumber || 0,
                    });
                  }}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl font-medium transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Statistics */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 mt-6">
          <h2 className="text-xl md:text-2xl font-black text-white mb-6">Career Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
              <div className="text-3xl font-bold text-green-400">
                {userProfile?.statistics?.matches || 0}
              </div>
              <div className="text-sm text-slate-400 mt-1">Matches</div>
            </div>
            <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
              <div className="text-3xl font-bold text-green-400">
                {userProfile?.statistics?.goals || 0}
              </div>
              <div className="text-sm text-slate-400 mt-1">Goals</div>
            </div>
            <div className="text-center p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <div className="text-3xl font-bold text-blue-400">
                {userProfile?.statistics?.assists || 0}
              </div>
              <div className="text-sm text-slate-400 mt-1">Assists</div>
            </div>
            <div className="text-center p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <div className="text-3xl font-bold text-yellow-400">
                {userProfile?.statistics?.yellowCards || 0}
              </div>
              <div className="text-sm text-slate-400 mt-1">Yellow Cards</div>
            </div>
            <div className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="text-3xl font-bold text-red-400">
                {userProfile?.statistics?.redCards || 0}
              </div>
              <div className="text-sm text-slate-400 mt-1">Red Cards</div>
            </div>
            <div className="text-center p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <div className="text-3xl font-bold text-indigo-400">
                {userProfile?.statistics?.cleanSheets || 0}
              </div>
              <div className="text-sm text-slate-400 mt-1">Clean Sheets</div>
            </div>
          </div>
        </div>

        {/* Teams Section */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 mt-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-black text-white">My Teams</h2>
            <Link
              to="/my-teams"
              className="text-green-400 hover:text-green-300 text-sm font-medium transition-colors"
            >
              View All →
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto"></div>
            </div>
          ) : teams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.slice(0, 4).map((team) => (
                <Link
                  key={team.id}
                  to={`/teams/${team.id}`}
                  className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-green-500/30 rounded-xl transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-700/50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      {team.logoURL ? (
                        <img src={team.logoURL} alt={team.name} className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="text-2xl">⚽</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold truncate group-hover:text-green-400 transition-colors">
                        {team.name}
                      </h3>
                      <p className="text-slate-400 text-sm">{team.playerIds.length} players</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-400 mb-4">You're not part of any team yet</p>
              <Link
                to="/teams"
                className="inline-block px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 rounded-lg transition-all"
              >
                Browse Teams
              </Link>
            </div>
          )}
        </div>

        {/* Tournaments Section */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 mt-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-black text-white">My Tournaments</h2>
            <Link
              to="/tournaments"
              className="text-green-400 hover:text-green-300 text-sm font-medium transition-colors"
            >
              View All →
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto"></div>
            </div>
          ) : tournaments.length > 0 ? (
            <div className="space-y-3">
              {tournaments.slice(0, 3).map((tournament) => (
                <Link
                  key={tournament.id}
                  to={`/tournaments/${tournament.id}`}
                  className="block p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-green-500/30 rounded-xl transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold truncate mb-1">{tournament.name}</h3>
                      <p className="text-slate-400 text-sm">
                        📍 {tournament.location} • {formatDate(tournament.startDate)}
                      </p>
                    </div>
                    {getStatusBadge(tournament.status)}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-400 mb-4">Not participating in any tournaments</p>
              <Link
                to="/tournaments"
                className="inline-block px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 rounded-lg transition-all"
              >
                Browse Tournaments
              </Link>
            </div>
          )}
        </div>

        {/* Recent Matches Section */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 mt-6">
          <h2 className="text-xl md:text-2xl font-black text-white mb-6">Recent Matches</h2>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto"></div>
            </div>
          ) : recentMatches.length > 0 ? (
            <div className="space-y-3">
              {recentMatches.map((match) => (
                <div
                  key={match.id}
                  className="p-4 bg-white/5 border border-white/10 rounded-xl"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="text-center">
                        <p className="text-white font-bold text-sm truncate">Home</p>
                        {match.status === 'COMPLETED' && (
                          <p className="text-2xl font-black text-green-400">{match.score.home}</p>
                        )}
                      </div>
                      <div className="text-slate-400 text-sm">vs</div>
                      <div className="text-center">
                        <p className="text-white font-bold text-sm truncate">Away</p>
                        {match.status === 'COMPLETED' && (
                          <p className="text-2xl font-black text-green-400">{match.score.away}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(match.status)}
                      <p className="text-slate-400 text-xs mt-1">{formatDate(match.matchDate)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-400">No matches yet</p>
            </div>
          )}
        </div>

        <div className="mt-6">
          <Link
            to="/dashboard"
            className="inline-block text-green-400 hover:text-green-300 font-medium transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Profile;
