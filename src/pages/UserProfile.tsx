import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import userService from '../services/user.service';
import teamService from '../services/team.service';
import matchService from '../services/match.service';
import { User, Team, Match } from '../types';
import Header from '../components/Header';
import FollowButton from '../components/FollowButton';

function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadUserData();
    }
  }, [id]);

  const loadUserData = async () => {
    try {
      const userData = await userService.getUserById(id!);
      if (!userData) {
        setLoading(false);
        return;
      }

      setUser(userData);

      // Load teams
      if (userData.teamIds && userData.teamIds.length > 0) {
        const teamsData = await teamService.getTeamsByIds(userData.teamIds);
        setTeams(teamsData);

        // Load recent matches for user's teams
        const matchPromises = userData.teamIds.map((teamId) => matchService.getMatchesByTeam(teamId));
        const allMatches = await Promise.all(matchPromises);
        const flatMatches = allMatches.flat();

        // Sort and take latest 10
        const sorted = flatMatches.sort((a, b) => {
          const dateA = new Date(a.matchDate as any).getTime();
          const dateB = new Date(b.matchDate as any).getTime();
          return dateB - dateA;
        });

        setRecentMatches(sorted.slice(0, 10));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: any) => {
    const d = date instanceof Date ? date : new Date(date.seconds * 1000);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 opacity-30">👤</div>
          <p className="text-slate-400 mb-4 text-lg">User not found</p>
          <Link to="/" className="text-green-400 hover:text-green-300 font-medium">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation */}
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 backdrop-blur-xl rounded-3xl border border-white/10 p-8 mb-8 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Profile Photo */}
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border-4 border-green-500/30 shadow-xl">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-7xl">👤</span>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                <h1 className="text-4xl md:text-5xl font-black text-white">{user.name}</h1>
                <FollowButton userId={user.id} userName={user.name} onFollowChange={loadUserData} />
              </div>

              <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-4">
                {user.position && (
                  <span className="px-4 py-1 bg-white/10 backdrop-blur-sm text-white rounded-full text-sm font-medium border border-white/20">
                    {user.position === 'Goalkeeper' && '🧤'}
                    {user.position === 'Defender' && '🛡️'}
                    {user.position === 'Midfielder' && '⚡'}
                    {user.position === 'Forward' && '⚽'}
                    {' '}{user.position}
                  </span>
                )}
                {user.jerseyNumber && (
                  <span className="px-4 py-1 bg-white/10 backdrop-blur-sm text-white rounded-full text-sm font-medium border border-white/20">
                    #{user.jerseyNumber}
                  </span>
                )}
                {user.roles?.includes('captain') && (
                  <span className="px-4 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-yellow-400 text-sm font-bold">
                    Captain
                  </span>
                )}
                {user.roles?.includes('admin') && (
                  <span className="px-4 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-400 text-sm font-bold">
                    Admin
                  </span>
                )}
              </div>

              <p className="text-slate-400">
                {teams.length} Team{teams.length !== 1 ? 's' : ''} • {user.statistics?.matches || 0} Matches Played
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl rounded-2xl border border-green-500/20 p-6 text-center">
            <div className="text-4xl font-black text-green-400 mb-1">{user.statistics?.followers || 0}</div>
            <div className="text-sm text-slate-400">Followers</div>
          </div>
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-xl rounded-2xl border border-blue-500/20 p-6 text-center">
            <div className="text-4xl font-black text-blue-400 mb-1">{user.statistics?.following || 0}</div>
            <div className="text-sm text-slate-400">Following</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6 text-center">
            <div className="text-4xl font-black text-white mb-1">{user.statistics?.matches || 0}</div>
            <div className="text-sm text-slate-400">Matches</div>
          </div>
          <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 backdrop-blur-xl rounded-2xl border border-red-500/20 p-6 text-center">
            <div className="text-4xl font-black text-red-400 mb-1">{user.statistics?.goals || 0}</div>
            <div className="text-sm text-slate-400">Goals</div>
          </div>
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl rounded-2xl border border-blue-500/20 p-6 text-center">
            <div className="text-4xl font-black text-blue-400 mb-1">{user.statistics?.assists || 0}</div>
            <div className="text-sm text-slate-400">Assists</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-xl rounded-2xl border border-yellow-500/20 p-6 text-center">
            <div className="text-4xl font-black text-yellow-400 mb-1">{user.statistics?.yellowCards || 0}</div>
            <div className="text-sm text-slate-400">Yellow</div>
          </div>
          <div className="bg-gradient-to-br from-red-500/10 to-pink-500/10 backdrop-blur-xl rounded-2xl border border-red-500/20 p-6 text-center">
            <div className="text-4xl font-black text-red-400 mb-1">{user.statistics?.redCards || 0}</div>
            <div className="text-sm text-slate-400">Red</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6 text-center">
            <div className="text-4xl font-black text-purple-400 mb-1">{user.statistics?.cleanSheets || 0}</div>
            <div className="text-sm text-slate-400">Clean Sheets</div>
          </div>
        </div>

        {/* Achievements */}
        {user.achievements && user.achievements.length > 0 && (
          <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-xl rounded-3xl border border-yellow-500/20 p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-4xl">🏆</div>
              <h2 className="text-3xl font-black text-white">Achievements</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.achievements.map((achievement, index) => (
                <div key={index} className="bg-black/30 rounded-2xl p-4 flex items-center gap-3">
                  <div className="text-3xl">🎖️</div>
                  <div className="text-white font-medium">{achievement}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Teams */}
        {teams.length > 0 && (
          <div className="mb-8">
            <h2 className="text-3xl font-black text-white mb-6">👥 Teams</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => (
                <Link
                  key={team.id}
                  to={`/teams/${team.id}`}
                  className="group bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:bg-slate-800/70 hover:border-green-500/30 transition-all"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center">
                      {team.logoURL ? (
                        <img src={team.logoURL} alt={team.name} className="w-full h-full object-contain p-2" />
                      ) : (
                        <span className="text-3xl">⚽</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white group-hover:text-green-400 transition-colors">{team.name}</h3>
                      <p className="text-sm text-slate-400">{team.playerIds.length} players</p>
                    </div>
                  </div>
                  {team.captainId === user.id && (
                    <div className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-yellow-400 text-xs font-bold inline-block">
                      Captain
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent Matches */}
        {recentMatches.length > 0 && (
          <div>
            <h2 className="text-3xl font-black text-white mb-6">⚽ Recent Matches</h2>
            <div className="space-y-4">
              {recentMatches.map((match) => (
                <div
                  key={match.id}
                  className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-400">
                      {formatDate(match.matchDate)} • {match.venue}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      match.status === 'COMPLETED'
                        ? 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                        : match.status === 'ONGOING'
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    }`}>
                      {match.status}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-lg font-bold text-white">Team {match.homeTeamId.slice(0, 6)}</div>
                    <div className="text-3xl font-black text-white">
                      {match.status === 'COMPLETED' || match.status === 'ONGOING'
                        ? `${match.score.home} - ${match.score.away}`
                        : 'vs'}
                    </div>
                    <div className="text-lg font-bold text-white">Team {match.awayTeamId.slice(0, 6)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserProfile;
