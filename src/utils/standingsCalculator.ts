import { Match, TeamStanding, TournamentStandings } from '../types';

export class StandingsCalculator {
  /**
   * Calculate tournament standings from matches
   */
  static calculateStandings(
    matches: Match[],
    pointsForWin: number = 3,
    pointsForDraw: number = 1,
    pointsForLoss: number = 0
  ): TournamentStandings {
    const completedMatches = matches.filter((m) => m.status === 'COMPLETED');

    // Check if this is a group stage tournament
    const hasGroups = completedMatches.some((m) => m.groupName);

    if (hasGroups) {
      return this.calculateGroupStandings(
        completedMatches,
        pointsForWin,
        pointsForDraw,
        pointsForLoss
      );
    } else {
      return this.calculateOverallStandings(
        completedMatches,
        pointsForWin,
        pointsForDraw,
        pointsForLoss
      );
    }
  }

  /**
   * Calculate overall standings (no groups)
   */
  private static calculateOverallStandings(
    matches: Match[],
    pointsForWin: number,
    pointsForDraw: number,
    pointsForLoss: number
  ): TournamentStandings {
    const teamStats = new Map<string, TeamStanding>();

    // Process each match
    matches.forEach((match) => {
      this.processMatch(
        match,
        teamStats,
        pointsForWin,
        pointsForDraw,
        pointsForLoss
      );
    });

    // Sort standings
    const overallStandings = this.sortStandings(Array.from(teamStats.values()));

    return {
      tournamentId: matches[0]?.tournamentId || '',
      overallStandings,
    };
  }

  /**
   * Calculate group standings
   */
  private static calculateGroupStandings(
    matches: Match[],
    pointsForWin: number,
    pointsForDraw: number,
    pointsForLoss: number
  ): TournamentStandings {
    const groupStandings: { [groupName: string]: TeamStanding[] } = {};
    const groupTeamStats = new Map<string, Map<string, TeamStanding>>();

    // Initialize groups
    matches.forEach((match) => {
      if (match.groupName && !groupTeamStats.has(match.groupName)) {
        groupTeamStats.set(match.groupName, new Map());
      }
    });

    // Process each match
    matches.forEach((match) => {
      if (match.groupName) {
        const groupStats = groupTeamStats.get(match.groupName)!;
        this.processMatch(
          match,
          groupStats,
          pointsForWin,
          pointsForDraw,
          pointsForLoss
        );
      }
    });

    // Sort each group's standings
    groupTeamStats.forEach((teamStats, groupName) => {
      groupStandings[groupName] = this.sortStandings(
        Array.from(teamStats.values())
      );
    });

    return {
      tournamentId: matches[0]?.tournamentId || '',
      groupStandings,
    };
  }

  /**
   * Process a single match and update team statistics
   */
  private static processMatch(
    match: Match,
    teamStats: Map<string, TeamStanding>,
    pointsForWin: number,
    pointsForDraw: number,
    pointsForLoss: number
  ): void {
    const homeTeamId = match.homeTeamId;
    const awayTeamId = match.awayTeamId;

    // Initialize team stats if not exists
    if (!teamStats.has(homeTeamId)) {
      teamStats.set(homeTeamId, this.initializeTeamStanding(homeTeamId));
    }
    if (!teamStats.has(awayTeamId)) {
      teamStats.set(awayTeamId, this.initializeTeamStanding(awayTeamId));
    }

    const homeTeam = teamStats.get(homeTeamId)!;
    const awayTeam = teamStats.get(awayTeamId)!;

    // Update matches played
    homeTeam.matchesPlayed++;
    awayTeam.matchesPlayed++;

    // Update goals
    homeTeam.goalsFor += match.score.home;
    homeTeam.goalsAgainst += match.score.away;
    awayTeam.goalsFor += match.score.away;
    awayTeam.goalsAgainst += match.score.home;

    // Determine result and update stats
    if (match.score.home > match.score.away) {
      // Home team wins
      homeTeam.wins++;
      homeTeam.points += pointsForWin;
      awayTeam.losses++;
      awayTeam.points += pointsForLoss;
    } else if (match.score.home < match.score.away) {
      // Away team wins
      awayTeam.wins++;
      awayTeam.points += pointsForWin;
      homeTeam.losses++;
      homeTeam.points += pointsForLoss;
    } else {
      // Draw
      homeTeam.draws++;
      homeTeam.points += pointsForDraw;
      awayTeam.draws++;
      awayTeam.points += pointsForDraw;
    }

    // Update goal difference
    homeTeam.goalDifference = homeTeam.goalsFor - homeTeam.goalsAgainst;
    awayTeam.goalDifference = awayTeam.goalsFor - awayTeam.goalsAgainst;
  }

  /**
   * Initialize a team standing
   */
  private static initializeTeamStanding(teamId: string): TeamStanding {
    return {
      teamId,
      teamName: '', // Will be populated with team name later
      matchesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      position: 0,
    };
  }

  /**
   * Sort standings by points, goal difference, and goals scored
   */
  private static sortStandings(standings: TeamStanding[]): TeamStanding[] {
    const sorted = standings.sort((a, b) => {
      // First by points
      if (b.points !== a.points) {
        return b.points - a.points;
      }

      // Then by goal difference
      if (b.goalDifference !== a.goalDifference) {
        return b.goalDifference - a.goalDifference;
      }

      // Then by goals scored
      if (b.goalsFor !== a.goalsFor) {
        return b.goalsFor - a.goalsFor;
      }

      // Then by wins
      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }

      // Finally alphabetically by team name
      return a.teamName.localeCompare(b.teamName);
    });

    // Assign positions
    sorted.forEach((team, index) => {
      team.position = index + 1;
    });

    return sorted;
  }

  /**
   * Get top teams from group standings (for knockout qualification)
   */
  static getTopTeamsFromGroups(
    groupStandings: { [groupName: string]: TeamStanding[] },
    teamsPerGroup: number = 2
  ): string[] {
    const qualifiedTeams: string[] = [];

    Object.values(groupStandings).forEach((standings) => {
      standings
        .slice(0, teamsPerGroup)
        .forEach((team) => qualifiedTeams.push(team.teamId));
    });

    return qualifiedTeams;
  }

  /**
   * Calculate head-to-head record between two teams
   */
  static calculateHeadToHead(
    teamAId: string,
    teamBId: string,
    matches: Match[]
  ): {
    teamAWins: number;
    teamBWins: number;
    draws: number;
    teamAGoals: number;
    teamBGoals: number;
  } {
    const h2hMatches = matches.filter(
      (m) =>
        m.status === 'COMPLETED' &&
        ((m.homeTeamId === teamAId && m.awayTeamId === teamBId) ||
          (m.homeTeamId === teamBId && m.awayTeamId === teamAId))
    );

    let teamAWins = 0;
    let teamBWins = 0;
    let draws = 0;
    let teamAGoals = 0;
    let teamBGoals = 0;

    h2hMatches.forEach((match) => {
      if (match.homeTeamId === teamAId) {
        teamAGoals += match.score.home;
        teamBGoals += match.score.away;

        if (match.score.home > match.score.away) teamAWins++;
        else if (match.score.home < match.score.away) teamBWins++;
        else draws++;
      } else {
        teamAGoals += match.score.away;
        teamBGoals += match.score.home;

        if (match.score.away > match.score.home) teamAWins++;
        else if (match.score.away < match.score.home) teamBWins++;
        else draws++;
      }
    });

    return { teamAWins, teamBWins, draws, teamAGoals, teamBGoals };
  }
}

export default StandingsCalculator;
