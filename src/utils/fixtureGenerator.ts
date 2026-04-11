import { Match, MatchStage } from '../types';

export interface FixtureOptions {
  tournamentId: string;
  teams: string[];
  format: 'LEAGUE' | 'KNOCKOUT' | 'LEAGUE_KNOCKOUT';
  startDate: Date;
  venue: string;
  numberOfGroups?: number;
  teamsPerGroup?: number;
}

export class FixtureGenerator {
  /**
   * Generate fixtures based on tournament format
   */
  static generateFixtures(options: FixtureOptions): Match[] {
    switch (options.format) {
      case 'LEAGUE':
        return this.generateLeagueFixtures(options);
      case 'KNOCKOUT':
        return this.generateKnockoutFixtures(options);
      case 'LEAGUE_KNOCKOUT':
        return this.generateLeagueKnockoutFixtures(options);
      default:
        throw new Error('Invalid tournament format');
    }
  }

  /**
   * Generate Round Robin (League) fixtures
   * Every team plays against every other team once
   */
  private static generateLeagueFixtures(options: FixtureOptions): Match[] {
    const { teams, tournamentId, startDate, venue } = options;
    const matches: Match[] = [];
    let matchDate = new Date(startDate);
    let matchNumber = 1;

    // Round Robin algorithm
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push(this.createMatch({
          tournamentId,
          homeTeamId: teams[i],
          awayTeamId: teams[j],
          matchDate: new Date(matchDate),
          venue,
          stage: 'GROUP',
          matchNumber,
        }));

        matchNumber++;
        // Schedule next match 2 days later
        matchDate.setDate(matchDate.getDate() + 2);
      }
    }

    return matches;
  }

  /**
   * Generate Knockout (Single Elimination) fixtures
   * Handles byes for odd number of teams
   */
  private static generateKnockoutFixtures(options: FixtureOptions): Match[] {
    const { teams, tournamentId, startDate, venue } = options;
    const matches: Match[] = [];
    let matchDate = new Date(startDate);
    let matchNumber = 1;

    // Determine number of rounds needed
    const teamsCount = teams.length;
    const rounds = Math.ceil(Math.log2(teamsCount));

    // Pad teams to next power of 2 for bracket balance
    const paddedCount = Math.pow(2, rounds);
    const byes = paddedCount - teamsCount;

    // Copy teams and add null for byes
    const bracketTeams: (string | null)[] = [...teams];
    for (let i = 0; i < byes; i++) {
      bracketTeams.push(null);
    }

    // Generate first round
    const stage = this.getKnockoutStage(teamsCount);
    for (let i = 0; i < bracketTeams.length; i += 2) {
      const homeTeam = bracketTeams[i];
      const awayTeam = bracketTeams[i + 1];

      // Skip if both teams are byes
      if (!homeTeam && !awayTeam) continue;

      // If one team has a bye, they automatically advance
      if (homeTeam && !awayTeam) continue;
      if (!homeTeam && awayTeam) continue;

      matches.push(this.createMatch({
        tournamentId,
        homeTeamId: homeTeam!,
        awayTeamId: awayTeam!,
        matchDate: new Date(matchDate),
        venue,
        stage,
        matchNumber,
      }));

      matchNumber++;
    }

    return matches;
  }

  /**
   * Generate League + Knockout fixtures
   * Group stage followed by knockout rounds
   */
  private static generateLeagueKnockoutFixtures(options: FixtureOptions): Match[] {
    const { teams, tournamentId, startDate, venue, numberOfGroups = 2 } = options;
    const matches: Match[] = [];
    let matchDate = new Date(startDate);
    let matchNumber = 1;

    // Divide teams into groups
    const groups = this.divideIntoGroups(teams, numberOfGroups);

    // Generate group stage fixtures
    groups.forEach((groupTeams, groupIndex) => {
      const groupName = String.fromCharCode(65 + groupIndex); // A, B, C, etc.

      // Round robin within each group
      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
          matches.push(this.createMatch({
            tournamentId,
            homeTeamId: groupTeams[i],
            awayTeamId: groupTeams[j],
            matchDate: new Date(matchDate),
            venue,
            stage: 'GROUP',
            groupName: `Group ${groupName}`,
            matchNumber,
          }));

          matchNumber++;
          matchDate.setDate(matchDate.getDate() + 1);
        }
      }
    });

    // Add gap between group stage and knockout
    matchDate.setDate(matchDate.getDate() + 3);

    // Placeholder knockout matches
    // In reality, these would be created after group stage completion
    const qualifiedTeamsCount = numberOfGroups * 2; // Top 2 from each group
    const knockoutStage = this.getKnockoutStage(qualifiedTeamsCount);

    // Create placeholder knockout matches
    for (let i = 0; i < qualifiedTeamsCount / 2; i++) {
      matches.push(this.createMatch({
        tournamentId,
        homeTeamId: 'TBD', // To be determined
        awayTeamId: 'TBD',
        matchDate: new Date(matchDate),
        venue,
        stage: knockoutStage,
        matchNumber,
      }));

      matchNumber++;
    }

    return matches;
  }

  /**
   * Divide teams into groups evenly
   */
  private static divideIntoGroups(teams: string[], numberOfGroups: number): string[][] {
    const groups: string[][] = Array.from({ length: numberOfGroups }, () => []);

    // Distribute teams evenly across groups
    teams.forEach((team, index) => {
      groups[index % numberOfGroups].push(team);
    });

    return groups;
  }

  /**
   * Get knockout stage based on number of teams
   */
  private static getKnockoutStage(teamsCount: number): MatchStage {
    if (teamsCount <= 2) return 'FINAL';
    if (teamsCount <= 4) return 'SF'; // Semi-final
    if (teamsCount <= 8) return 'QF'; // Quarter-final
    if (teamsCount <= 16) return 'R16'; // Round of 16
    return 'R32'; // Round of 32
  }

  /**
   * Create a match object
   */
  private static createMatch(data: {
    tournamentId: string;
    homeTeamId: string;
    awayTeamId: string;
    matchDate: Date;
    venue: string;
    stage: MatchStage;
    groupName?: string;
    matchNumber: number;
  }): Match {
    const match: any = {
      id: '', // Will be set when saved to Firestore
      tournamentId: data.tournamentId,
      homeTeamId: data.homeTeamId,
      awayTeamId: data.awayTeamId,
      stage: data.stage,
      matchNumber: data.matchNumber,
      matchDate: data.matchDate,
      venue: data.venue,
      status: 'SCHEDULED',
      score: {
        home: 0,
        away: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Only include groupName if it's defined (Firestore doesn't allow undefined)
    if (data.groupName !== undefined) {
      match.groupName = data.groupName;
    }

    return match as Match;
  }

  /**
   * Calculate next knockout round matches based on results
   */
  static generateNextKnockoutRound(
    currentMatches: Match[],
    tournamentId: string,
    venue: string,
    startDate: Date
  ): Match[] {
    const winners: string[] = [];

    // Get winners from current round
    currentMatches.forEach((match) => {
      if (match.status === 'COMPLETED') {
        const winner =
          match.score.home > match.score.away
            ? match.homeTeamId
            : match.awayTeamId;
        winners.push(winner);
      }
    });

    if (winners.length === 0) {
      throw new Error('No completed matches to generate next round');
    }

    // Generate next round
    const nextStage = this.getNextStage(currentMatches[0].stage);
    const matches: Match[] = [];
    let matchNumber = 1;
    let matchDate = new Date(startDate);

    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 < winners.length) {
        matches.push(this.createMatch({
          tournamentId,
          homeTeamId: winners[i],
          awayTeamId: winners[i + 1],
          matchDate: new Date(matchDate),
          venue,
          stage: nextStage,
          matchNumber,
        }));
        matchNumber++;
        matchDate.setDate(matchDate.getDate() + 2);
      }
    }

    return matches;
  }

  /**
   * Get next knockout stage
   */
  private static getNextStage(currentStage: MatchStage): MatchStage {
    const stageOrder: MatchStage[] = ['R32', 'R16', 'QF', 'SF', 'FINAL'];
    const currentIndex = stageOrder.indexOf(currentStage);
    if (currentIndex === -1 || currentIndex === stageOrder.length - 1) {
      return 'FINAL';
    }
    return stageOrder[currentIndex + 1];
  }
}

export default FixtureGenerator;
