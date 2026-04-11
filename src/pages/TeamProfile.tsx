import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import teamService from '../services/team.service';
import userService from '../services/user.service';
import matchService from '../services/match.service';
import { Team, User, Match } from '../types';
import Header from '../components/Header';

function TeamProfile() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<User[]>([]);
  const [captain, setCaptain] = useState<User | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [form, setForm] = useState<string[]>([]);
  const [stats, setStats] = useState({
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    if (id) {
      loadTeamData();
    }
  }, [id]);

  const loadTeamData = async () => {
    try {
      const teamData = await teamService.getTeamById(id!);
      if (!teamData) {
        setLoading(false);
        return;
      }

      setTeam(teamData);

      // Check if current user is the manager
      if (currentUser && teamData.managerId === currentUser.uid) {
        setIsManager(true);
      }

      // Load players
      const playersData = await Promise.all(
        teamData.playerIds.map((playerId) => userService.getUserById(playerId))
      );
      const validPlayers = playersData.filter((p) => p !== null) as User[];
      setPlayers(validPlayers);

      // Load captain
      const captainData = await userService.getUserById(teamData.captainId);
      setCaptain(captainData);

      // Load matches
      const matchesData = await matchService.getMatchesByTeam(id!);
      setMatches(matchesData);

      // Calculate stats and form
      const completedMatches = matchesData.filter((m) => m.status === 'COMPLETED');
      let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
      const formArray: string[] = [];

      completedMatches.slice().reverse().forEach((match) => {
        const isHome = match.homeTeamId === id;
        const teamScore = isHome ? match.score.home : match.score.away;
        const opponentScore = isHome ? match.score.away : match.score.home;

        goalsFor += teamScore;
        goalsAgainst += opponentScore;

        if (teamScore > opponentScore) {
          wins++;
          formArray.push('W');
        } else if (teamScore < opponentScore) {
          losses++;
          formArray.push('L');
        } else {
          draws++;
          formArray.push('D');
        }
      });

      setStats({
        played: completedMatches.length,
        wins,
        draws,
        losses,
        goalsFor,
        goalsAgainst,
      });
      setForm(formArray.slice(-5).reverse()); // Last 5 matches
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: any) => {
    const d = date instanceof Date ? date : new Date(date.seconds * 1000);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getFormBadge = (result: string) => {
    if (result === 'W') {
      return <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-green-500 flex items-center justify-center text-white font-bold text-sm md:text-base">W</div>;
    }
    if (result === 'D') {
      return <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-yellow-500 flex items-center justify-center text-white font-bold text-sm md:text-base">D</div>;
    }
    return <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-red-500 flex items-center justify-center text-white font-bold text-sm md:text-base">L</div>;
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      SCHEDULED: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Upcoming' },
      ONGOING: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: '🔴 LIVE' },
      COMPLETED: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30', label: 'Finished' },
    };
    const badge = badges[status] || badges.SCHEDULED;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading team profile...</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 opacity-30">⚽</div>
          <p className="text-slate-400 mb-4 text-lg">Team not found</p>
          <Link to="/tournaments" className="text-green-400 hover:text-green-300 font-medium">
            ← Back to Tournaments
          </Link>
        </div>
      </div>
    );
  }

  const winRate = stats.played > 0 ? ((stats.wins / stats.played) * 100).toFixed(0) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation */}
      <Header />

      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Team Header */}
        <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 backdrop-blur-xl rounded-3xl border border-white/10 p-6 md:p-10 mb-6 md:mb-8 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Team Logo */}
            <div className="w-32 h-32 md:w-40 md:h-40 bg-slate-800/50 rounded-3xl flex items-center justify-center p-6 border-4 border-white/10">
              {team.logoURL ? (
                <img src={team.logoURL} alt={team.name} className="w-full h-full object-contain" />
              ) : (
                <span className="text-6xl md:text-7xl">⚽</span>
              )}
            </div>

            {/* Team Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-black text-white mb-4">{team.name}</h1>

              {/* Form */}
              {form.length > 0 && (
                <div className="flex items-center gap-2 justify-center md:justify-start mb-6">
                  <span className="text-slate-400 text-sm font-medium">Form:</span>
                  {form.map((result, idx) => (
                    <div key={idx}>{getFormBadge(result)}</div>
                  ))}
                </div>
              )}

              {/* Captain */}
              {captain && (
                <div className="mb-4">
                  <span className="text-slate-400 text-sm">Captain: </span>
                  <span className="text-white font-bold">{captain.name}</span>
                </div>
              )}

              <p className="text-slate-400 text-sm md:text-base">
                {players.length} Players • {matches.length} Matches
              </p>

              {/* Manage Team Button (Manager Only) */}
              {isManager && (
                <div className="mt-6">
                  <Link
                    to={`/teams/${id}/manage`}
                    className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-bold hover:from-purple-600 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/20"
                  >
                    ⚙️ Manage Team
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-6 text-center">
            <div className="text-3xl md:text-4xl font-black text-white mb-1">{stats.played}</div>
            <div className="text-xs md:text-sm text-slate-400">Played</div>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl rounded-2xl border border-green-500/20 p-4 md:p-6 text-center">
            <div className="text-3xl md:text-4xl font-black text-green-400 mb-1">{stats.wins}</div>
            <div className="text-xs md:text-sm text-slate-400">Wins</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-xl rounded-2xl border border-yellow-500/20 p-4 md:p-6 text-center">
            <div className="text-3xl md:text-4xl font-black text-yellow-400 mb-1">{stats.draws}</div>
            <div className="text-xs md:text-sm text-slate-400">Draws</div>
          </div>
          <div className="bg-gradient-to-br from-red-500/10 to-pink-500/10 backdrop-blur-xl rounded-2xl border border-red-500/20 p-4 md:p-6 text-center">
            <div className="text-3xl md:text-4xl font-black text-red-400 mb-1">{stats.losses}</div>
            <div className="text-xs md:text-sm text-slate-400">Losses</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-6 text-center">
            <div className="text-3xl md:text-4xl font-black text-blue-400 mb-1">{stats.goalsFor}</div>
            <div className="text-xs md:text-sm text-slate-400">Goals For</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-6 text-center">
            <div className="text-3xl md:text-4xl font-black text-purple-400 mb-1">{winRate}%</div>
            <div className="text-xs md:text-sm text-slate-400">Win Rate</div>
          </div>
        </div>

        {/* Players Section */}
        <div className="mb-6 md:mb-8">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h2 className="text-2xl md:text-3xl font-black text-white">👥 Squad</h2>
            <span className="text-slate-400 text-sm md:text-base">{players.length} Players</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {players.map((player) => (
              <Link
                key={player.id}
                to={`/users/${player.id}`}
                className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-6 hover:bg-slate-800/70 hover:border-green-500/30 transition-all"
              >
                {/* Player Photo */}
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-white/20 mx-auto mb-3">
                  {player.photoURL ? (
                    <img src={player.photoURL} alt={player.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl md:text-4xl">👤</span>
                  )}
                </div>

                {/* Player Info */}
                <div className="text-center">
                  <div className="font-bold text-white mb-1 text-sm md:text-base line-clamp-1">{player.name}</div>
                  {player.jerseyNumber && (
                    <div className="text-2xl md:text-3xl font-black text-green-400 mb-1">#{player.jerseyNumber}</div>
                  )}
                  {player.position && (
                    <div className="text-xs text-slate-400 mb-2">
                      {player.position === 'Goalkeeper' && '🧤'}
                      {player.position === 'Defender' && '🛡️'}
                      {player.position === 'Midfielder' && '⚡'}
                      {player.position === 'Forward' && '⚽'}
                      {' '}{player.position}
                    </div>
                  )}
                  {player.id === team.captainId && (
                    <div className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-yellow-400 text-xs font-bold">
                      Captain
                    </div>
                  )}

                  {/* Player Stats */}
                  <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-3 gap-1 text-xs">
                    <div>
                      <div className="font-bold text-white">{player.statistics?.goals || 0}</div>
                      <div className="text-slate-500">Goals</div>
                    </div>
                    <div>
                      <div className="font-bold text-white">{player.statistics?.assists || 0}</div>
                      <div className="text-slate-500">Assists</div>
                    </div>
                    <div>
                      <div className="font-bold text-white">{player.statistics?.matches || 0}</div>
                      <div className="text-slate-500">Games</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Matches */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-black text-white mb-4 md:mb-6">⚽ Recent Matches</h2>

          {matches.length > 0 ? (
            <div className="space-y-3 md:space-y-4">
              {matches.slice(0, 10).map((match) => {
                const isHome = match.homeTeamId === id;
                const teamScore = isHome ? match.score.home : match.score.away;
                const opponentScore = isHome ? match.score.away : match.score.home;
                const opponentId = isHome ? match.awayTeamId : match.homeTeamId;

                let resultColor = 'text-slate-400';
                if (match.status === 'COMPLETED') {
                  if (teamScore > opponentScore) resultColor = 'text-green-400';
                  else if (teamScore < opponentScore) resultColor = 'text-red-400';
                  else resultColor = 'text-yellow-400';
                }

                return (
                  <div
                    key={match.id}
                    className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-6 hover:bg-slate-800/70 transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        {getStatusBadge(match.status)}
                        <span className="text-xs md:text-sm text-slate-400">
                          {formatDate(match.matchDate)} • {match.venue}
                        </span>
                      </div>
                      <span className="text-xs md:text-sm text-slate-400">{isHome ? 'Home' : 'Away'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-bold text-white text-sm md:text-base">{team.name}</div>
                      </div>

                      <div className={`px-4 md:px-8 text-2xl md:text-3xl font-black ${resultColor}`}>
                        {match.status === 'COMPLETED' || match.status === 'ONGOING'
                          ? `${teamScore} - ${opponentScore}`
                          : 'vs'}
                      </div>

                      <div className="flex-1 text-right">
                        <div className="font-bold text-white text-sm md:text-base">Opponent</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-slate-800/30 backdrop-blur-xl rounded-3xl border border-white/10 p-8 md:p-12 text-center">
              <div className="text-6xl mb-4 opacity-30">⚽</div>
              <p className="text-slate-400 text-sm md:text-base">No matches yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeamProfile;
