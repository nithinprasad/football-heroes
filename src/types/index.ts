// User Types
export type UserRole = 'player' | 'captain' | 'admin';
export type Position = 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward';

export interface UserStats {
  matches: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
}

export interface User {
  id: string;
  name: string;
  mobileNumber: string;
  photoURL?: string;
  position?: Position;
  jerseyNumber?: number;
  roles: UserRole[];
  teamIds: string[];
  statistics: UserStats;
  createdAt: Date;
  updatedAt: Date;
}

// Team Types
export interface Team {
  id: string;
  name: string;
  captainId: string;
  playerIds: string[];
  logoURL?: string;
  createdAt: Date;
}

// Tournament Types
export type TournamentFormat = 'LEAGUE' | 'KNOCKOUT' | 'LEAGUE_KNOCKOUT';
export type TournamentStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED';

export interface Tournament {
  id: string;
  name: string;
  format: TournamentFormat;
  teamSize: number; // 5, 7, 11, etc.
  startDate: Date;
  endDate: Date;
  location: string;
  status: TournamentStatus;
  numberOfGroups?: number;
  pointsForWin: number; // default 3
  pointsForDraw: number; // default 1
  pointsForLoss: number; // default 0
  createdBy: string;
  teamIds: string[];
  createdAt: Date;
}

// Match Types
export type MatchStage = 'GROUP' | 'QF' | 'SF' | 'FINAL' | 'R16' | 'R32';
export type MatchStatus = 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export interface MatchScore {
  home: number;
  away: number;
}

export interface PlayerMatchStats {
  playerId: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  cleanSheet?: boolean; // for goalkeepers
}

export interface Match {
  id: string;
  tournamentId: string;
  homeTeamId: string;
  awayTeamId: string;
  stage: MatchStage;
  groupName?: string; // e.g., 'Group A', 'Group B'
  matchNumber?: number;
  matchDate: Date;
  venue: string;
  status: MatchStatus;
  score: MatchScore;
  playerStats?: PlayerMatchStats[];
  createdAt: Date;
  updatedAt: Date;
}

// Invitation Types
export type InvitationType = 'TEAM' | 'TOURNAMENT';
export type InvitationRole = 'PLAYER' | 'CAPTAIN';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export interface Invitation {
  id: string;
  type: InvitationType;
  mobileNumber: string;
  userId: string | null; // null if user doesn't exist yet
  teamId?: string | null;
  tournamentId?: string | null;
  role: InvitationRole;
  status: InvitationStatus;
  inviteCode: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
  updatedAt?: Date;
}

// Standings Types
export interface TeamStanding {
  teamId: string;
  teamName: string;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position: number;
}

export interface TournamentStandings {
  tournamentId: string;
  groupStandings?: { [groupName: string]: TeamStanding[] };
  overallStandings?: TeamStanding[];
}

// Leaderboard Types
export interface TopScorer {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  goals: number;
  matches: number;
}

export interface TopAssist {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  assists: number;
  matches: number;
}

export interface TopGoalkeeper {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  cleanSheets: number;
  matches: number;
  goalsConceded: number;
}

// Form Input Types
export interface SignupFormData {
  name: string;
  mobileNumber: string;
}

export interface ProfileFormData {
  name: string;
  position: Position;
  jerseyNumber: number;
  photoURL?: string;
}

export interface TeamFormData {
  name: string;
  logoURL?: string;
}

export interface TournamentFormData {
  name: string;
  format: TournamentFormat;
  teamSize: number;
  startDate: Date;
  endDate: Date;
  location: string;
  numberOfGroups?: number;
}

export interface InvitePlayerFormData {
  mobileNumber: string;
  role: InvitationRole;
}

export interface MatchResultFormData {
  homeScore: number;
  awayScore: number;
  playerStats: PlayerMatchStats[];
}
