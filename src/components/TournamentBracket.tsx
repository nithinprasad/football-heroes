import { Match, Team } from '../types';
import { Link } from 'react-router-dom';

interface TournamentBracketProps {
  matches: Match[];
  teams: { [key: string]: Team };
}

interface BracketRound {
  stage: string;
  matches: Match[];
}

function TournamentBracket({ matches, teams }: TournamentBracketProps) {
  // Group matches by knockout stage
  const knockoutStages = ['R32', 'R16', 'QF', 'SF', 'FINAL'];
  const knockoutMatches = matches.filter((m) => knockoutStages.includes(m.stage));

  if (knockoutMatches.length === 0) {
    return (
      <div className="bg-slate-800/30 backdrop-blur-xl rounded-3xl border border-white/10 p-8 text-center">
        <div className="text-6xl mb-4 opacity-30">🏆</div>
        <p className="text-slate-400">No knockout matches yet</p>
      </div>
    );
  }

  // Organize into rounds
  const rounds: BracketRound[] = [];
  knockoutStages.forEach((stage) => {
    const stageMatches = knockoutMatches.filter((m) => m.stage === stage);
    if (stageMatches.length > 0) {
      rounds.push({
        stage: getStageLabel(stage),
        matches: stageMatches.sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0)),
      });
    }
  });

  const getTeamName = (teamId: string) => {
    if (teamId === 'TBD') return 'TBD';
    return teams[teamId]?.name || teamId;
  };

  const formatScore = (match: Match) => {
    if (match.status === 'COMPLETED') {
      return `${match.score.home} - ${match.score.away}`;
    }
    if (match.status === 'ONGOING') {
      return `${match.score.home} - ${match.score.away} (LIVE)`;
    }
    return 'vs';
  };

  const getMatchWinner = (match: Match): string | null => {
    if (match.status === 'COMPLETED') {
      if (match.score.home > match.score.away) return match.homeTeamId;
      if (match.score.away > match.score.home) return match.awayTeamId;
    }
    return null;
  };

  return (
    <div className="bg-slate-800/30 backdrop-blur-xl rounded-3xl border border-white/10 p-6 overflow-x-auto">
      <div className="flex gap-8 min-w-max">
        {rounds.map((round, roundIndex) => (
          <div key={round.stage} className="flex flex-col justify-around min-w-[280px]">
            {/* Round Header */}
            <div className="text-center mb-6 sticky top-0 bg-slate-900/50 backdrop-blur-sm py-3 rounded-lg border border-white/10">
              <h3 className="text-lg font-bold text-white">{round.stage}</h3>
              <p className="text-xs text-slate-400 mt-1">{round.matches.length} {round.matches.length === 1 ? 'match' : 'matches'}</p>
            </div>

            {/* Matches */}
            <div className="space-y-8 flex-1 flex flex-col justify-around">
              {round.matches.map((match) => {
                const winner = getMatchWinner(match);
                const isHomeWinner = winner === match.homeTeamId;
                const isAwayWinner = winner === match.awayTeamId;

                return (
                  <div
                    key={match.id}
                    className="bg-slate-900/50 rounded-xl border border-white/10 overflow-hidden hover:border-green-500/30 transition-all"
                  >
                    {/* Home Team */}
                    <div
                      className={`flex items-center justify-between p-3 border-b border-white/10 ${
                        isHomeWinner ? 'bg-green-500/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {isHomeWinner && <span className="text-green-400 text-sm">✓</span>}
                        <Link
                          to={match.homeTeamId !== 'TBD' ? `/teams/${match.homeTeamId}` : '#'}
                          className={`font-medium truncate ${
                            match.homeTeamId === 'TBD'
                              ? 'text-slate-500 pointer-events-none'
                              : isHomeWinner
                              ? 'text-green-400'
                              : 'text-white hover:text-green-400'
                          }`}
                        >
                          {getTeamName(match.homeTeamId)}
                        </Link>
                      </div>
                      {match.status !== 'SCHEDULED' && (
                        <span className={`text-lg font-bold ${isHomeWinner ? 'text-green-400' : 'text-slate-400'}`}>
                          {match.score.home}
                        </span>
                      )}
                    </div>

                    {/* Away Team */}
                    <div
                      className={`flex items-center justify-between p-3 ${
                        isAwayWinner ? 'bg-green-500/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {isAwayWinner && <span className="text-green-400 text-sm">✓</span>}
                        <Link
                          to={match.awayTeamId !== 'TBD' ? `/teams/${match.awayTeamId}` : '#'}
                          className={`font-medium truncate ${
                            match.awayTeamId === 'TBD'
                              ? 'text-slate-500 pointer-events-none'
                              : isAwayWinner
                              ? 'text-green-400'
                              : 'text-white hover:text-green-400'
                          }`}
                        >
                          {getTeamName(match.awayTeamId)}
                        </Link>
                      </div>
                      {match.status !== 'SCHEDULED' && (
                        <span className={`text-lg font-bold ${isAwayWinner ? 'text-green-400' : 'text-slate-400'}`}>
                          {match.score.away}
                        </span>
                      )}
                    </div>

                    {/* Match Status Footer */}
                    <div className="px-3 py-2 bg-slate-950/50 flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        {match.matchDate instanceof Date
                          ? match.matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : new Date((match.matchDate as any).seconds * 1000).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                      </span>
                      {match.status === 'ONGOING' && (
                        <span className="text-green-400 font-bold animate-pulse">● LIVE</span>
                      )}
                      {match.status === 'COMPLETED' && winner === null && (
                        <span className="text-yellow-400 font-bold">DRAW</span>
                      )}
                      {match.extraTimeDuration && match.status === 'SCHEDULED' && (
                        <span className="text-blue-400 text-xs">+ET</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Connection lines (visual indicator to next round) */}
            {roundIndex < rounds.length - 1 && (
              <div className="absolute right-0 top-1/2 w-8 h-0.5 bg-gradient-to-r from-white/20 to-transparent transform translate-x-full -translate-y-1/2" />
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap gap-4 justify-center text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500/10 border border-green-500/30 rounded"></div>
          <span>Winner</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-400 font-bold">● LIVE</span>
          <span>Match in progress</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-blue-400 text-xs">+ET</span>
          <span>Extra time available</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">TBD</span>
          <span>To be determined</span>
        </div>
      </div>
    </div>
  );
}

function getStageLabel(stage: string): string {
  const labels: { [key: string]: string } = {
    R32: 'Round of 32',
    R16: 'Round of 16',
    QF: 'Quarter Finals',
    SF: 'Semi Finals',
    FINAL: 'Final',
  };
  return labels[stage] || stage;
}

export default TournamentBracket;
