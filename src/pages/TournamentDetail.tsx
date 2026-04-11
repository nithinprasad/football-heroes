import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import tournamentService from '../services/tournament.service';
import matchService from '../services/match.service';
import teamService from '../services/team.service';
import { Tournament, Match, Team } from '../types';
import StandingsCalculator from '../utils/standingsCalculator';

function TournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<{ [key: string]: Team }>({});
  const [standings, setStandings] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'matches' | 'standings'>('matches');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadTournamentData();
    }
  }, [id]);

  const loadTournamentData = async () => {
    try {
      const [tournamentData, matchesData] = await Promise.all([
        tournamentService.getTournamentById(id!),
        matchService.getMatchesByTournament(id!),
      ]);

      setTournament(tournamentData);
      setMatches(matchesData);

      // Load teams
      if (tournamentData) {
        const teamsData = await teamService.getTeamsByIds(tournamentData.teamIds);
        const teamsMap: { [key: string]: Team } = {};
        teamsData.forEach((team) => {
          teamsMap[team.id] = team;
        });
        setTeams(teamsMap);

        // Calculate standings
        const completedMatches = matchesData.filter((m) => m.status === 'COMPLETED');
        if (completedMatches.length > 0) {
          const standingsData = StandingsCalculator.calculateStandings(
            completedMatches,
            tournamentData.pointsForWin,
            tournamentData.pointsForDraw,
            tournamentData.pointsForLoss
          );
          setStandings(standingsData);
        }
      }
    } catch (error) {
      console.error('Error loading tournament:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: any) => {
    const d = date instanceof Date ? date : new Date(date.seconds * 1000);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getMatchStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Scheduled</span>;
      case 'ONGOING':
        return <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded animate-pulse">● LIVE</span>;
      case 'COMPLETED':
        return <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">Completed</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Tournament not found</p>
          <Link to="/tournaments" className="text-green-600 hover:underline">
            ← Back to Tournaments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Link to="/tournaments" className="text-green-600 hover:text-green-700">
            ← Back to Tournaments
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Tournament Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{tournament.name}</h1>
              <div className="flex flex-wrap gap-2">
                <span className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full">
                  {tournament.status}
                </span>
                <span className="text-sm bg-gray-100 text-gray-800 px-3 py-1 rounded-full">
                  {tournament.format.replace('_', ' + ')}
                </span>
                <span className="text-sm bg-gray-100 text-gray-800 px-3 py-1 rounded-full">
                  {tournament.teamSize}-a-side
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">📍 Location:</span> {tournament.location}
            </div>
            <div>
              <span className="font-medium">📅 Start:</span> {formatDate(tournament.startDate)}
            </div>
            <div>
              <span className="font-medium">📅 End:</span> {formatDate(tournament.endDate)}
            </div>
            <div>
              <span className="font-medium">👥 Teams:</span> {tournament.teamIds.length}
            </div>
            <div>
              <span className="font-medium">⚽ Matches:</span> {matches.length}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setActiveTab('matches')}
            className={`px-6 py-3 rounded-lg font-medium ${
              activeTab === 'matches'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Matches & Live Scores
          </button>
          <button
            onClick={() => setActiveTab('standings')}
            className={`px-6 py-3 rounded-lg font-medium ${
              activeTab === 'standings'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Standings
          </button>
        </div>

        {/* Content */}
        {activeTab === 'matches' ? (
          <div className="space-y-4">
            {matches.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 text-center text-gray-600">
                No matches scheduled yet
              </div>
            ) : (
              matches.map((match) => (
                <div key={match.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-gray-500">
                      {match.stage} {match.groupName && `- ${match.groupName}`}
                    </span>
                    {getMatchStatusBadge(match.status)}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-center">
                      <div className="text-lg font-bold text-gray-900">
                        {teams[match.homeTeamId]?.name || 'TBD'}
                      </div>
                    </div>

                    <div className="px-8">
                      {match.status === 'COMPLETED' || match.status === 'ONGOING' ? (
                        <div className="text-3xl font-bold text-gray-900">
                          {match.score.home} - {match.score.away}
                        </div>
                      ) : (
                        <div className="text-gray-400">vs</div>
                      )}
                    </div>

                    <div className="flex-1 text-center">
                      <div className="text-lg font-bold text-gray-900">
                        {teams[match.awayTeamId]?.name || 'TBD'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-gray-500 text-center">
                    📅 {formatDate(match.matchDate)} • 📍 {match.venue}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {!standings ? (
              <div className="p-6 text-center text-gray-600">
                No standings available yet. Matches need to be completed first.
              </div>
            ) : standings.groupStandings ? (
              <div className="p-6 space-y-6">
                {Object.entries(standings.groupStandings).map(([groupName, groupData]: [string, any]) => (
                  <div key={groupName}>
                    <h3 className="text-xl font-bold mb-3">{groupName}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left">Pos</th>
                            <th className="px-4 py-2 text-left">Team</th>
                            <th className="px-4 py-2 text-center">P</th>
                            <th className="px-4 py-2 text-center">W</th>
                            <th className="px-4 py-2 text-center">D</th>
                            <th className="px-4 py-2 text-center">L</th>
                            <th className="px-4 py-2 text-center">GF</th>
                            <th className="px-4 py-2 text-center">GA</th>
                            <th className="px-4 py-2 text-center">GD</th>
                            <th className="px-4 py-2 text-center font-bold">Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupData.map((standing: any) => (
                            <tr key={standing.teamId} className="border-t hover:bg-gray-50">
                              <td className="px-4 py-2">{standing.position}</td>
                              <td className="px-4 py-2 font-medium">
                                {teams[standing.teamId]?.name || standing.teamId}
                              </td>
                              <td className="px-4 py-2 text-center">{standing.matchesPlayed}</td>
                              <td className="px-4 py-2 text-center">{standing.wins}</td>
                              <td className="px-4 py-2 text-center">{standing.draws}</td>
                              <td className="px-4 py-2 text-center">{standing.losses}</td>
                              <td className="px-4 py-2 text-center">{standing.goalsFor}</td>
                              <td className="px-4 py-2 text-center">{standing.goalsAgainst}</td>
                              <td className="px-4 py-2 text-center">{standing.goalDifference}</td>
                              <td className="px-4 py-2 text-center font-bold">{standing.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : standings.overallStandings ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Pos</th>
                      <th className="px-4 py-2 text-left">Team</th>
                      <th className="px-4 py-2 text-center">P</th>
                      <th className="px-4 py-2 text-center">W</th>
                      <th className="px-4 py-2 text-center">D</th>
                      <th className="px-4 py-2 text-center">L</th>
                      <th className="px-4 py-2 text-center">GF</th>
                      <th className="px-4 py-2 text-center">GA</th>
                      <th className="px-4 py-2 text-center">GD</th>
                      <th className="px-4 py-2 text-center font-bold">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.overallStandings.map((standing: any) => (
                      <tr key={standing.teamId} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2">{standing.position}</td>
                        <td className="px-4 py-2 font-medium">
                          {teams[standing.teamId]?.name || standing.teamId}
                        </td>
                        <td className="px-4 py-2 text-center">{standing.matchesPlayed}</td>
                        <td className="px-4 py-2 text-center">{standing.wins}</td>
                        <td className="px-4 py-2 text-center">{standing.draws}</td>
                        <td className="px-4 py-2 text-center">{standing.losses}</td>
                        <td className="px-4 py-2 text-center">{standing.goalsFor}</td>
                        <td className="px-4 py-2 text-center">{standing.goalsAgainst}</td>
                        <td className="px-4 py-2 text-center">{standing.goalDifference}</td>
                        <td className="px-4 py-2 text-center font-bold">{standing.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export default TournamentDetail;
