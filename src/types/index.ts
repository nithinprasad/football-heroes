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
  achievements?: string[]; // List of achievements
  isVerified?: boolean; // true if user signed up, false if created by manager
  createdAt: Date;
  updatedAt: Date;
}

// Team Types
export interface TeamPlayerRoster {
  playerId: string;
  jerseyNumber?: number; // Team-specific jersey number
  teamStats?: UserStats; // Stats specific to this team
  joinedAt: Date;
}

export interface TeamJoinRequest {
  id: string;
  teamId: string;
  playerId: string;
  playerName: string; // Denormalized for display
  playerPhone?: string;
  status: JoinRequestStatus;
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string; // Manager who approved/rejected
}

export interface Team {
  id: string;
  teamId?: string; // Unique, user-friendly identifier (e.g., "WARRIORS-A7B3") - optional for backward compatibility
  name: string;
  sport?: string; // Sport type (football, cricket, etc.)
  location?: string; // Team location
  managerId?: string; // User who created/manages the team - optional for backward compatibility
  captainId: string;
  playerIds: string[];
  roster?: TeamPlayerRoster[]; // Detailed player roster with team-specific data
  joinRequests?: TeamJoinRequest[]; // Pending join requests
  logoURL?: string;
  createdAt: Date;
  updatedAt?: Date;
}

// Tournament Types
export type TournamentFormat = 'LEAGUE' | 'KNOCKOUT' | 'LEAGUE_KNOCKOUT';
export type TournamentStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED';

export interface Tournament {
  id: string;
  name: string;
  format: TournamentFormat;
  teamSize: number; // 5, 6, 7, 9, 11, etc.
  numberOfTeams?: number; // Expected number of teams
  startDate: Date;
  endDate: Date;
  location: string;
  status: TournamentStatus;
  numberOfGroups?: number;
  pointsForWin: number; // default 3
  pointsForDraw: number; // default 1
  pointsForLoss: number; // default 0
  matchDuration: number; // default 90 minutes (or 60, 45, 30)
  createdBy: string;
  organizerIds: string[]; // Multiple organizers who can manage the tournament
  scorerIds?: string[]; // Users who can score matches
  logoURL?: string; // Tournament logo
  homeTeamId?: string; // Home team for the tournament
  teamIds: string[];
  inviteCode?: string; // Code for teams to join
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
  ownGoals?: number; // Own goals scored
  cleanSheet?: boolean; // for goalkeepers
  events?: MatchEvent[]; // Timeline of events for this player
}

export interface MatchEvent {
  type: 'goal' | 'assist' | 'yellow' | 'red' | 'owngoal';
  timestamp: Date; // When the event occurred
  minute?: number; // Match minute when event occurred
  assistedBy?: string; // Player ID who assisted (for goal events)
}

export interface Match {
  id: string;
  tournamentId?: string; // Optional for standalone matches
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
  createdBy?: string; // For standalone matches
  matchDuration?: number; // in minutes (defaults to tournament setting)
  extraTimeDuration?: number; // Extra time duration in minutes for knockout matches (typically 30 mins)
  currentTime?: number; // current match time in seconds
  halfTimeReached?: boolean; // whether halftime has been reached
  startedBy?: string; // user who started the match
  startedAt?: Date; // when match was started
  manOfTheMatch?: string; // Player ID of man of the match
  playerRatings?: { [playerId: string]: number }; // Player ratings (1-10)
  isInternalMatch?: boolean; // True if this is a team scrimmage/internal match
  internalTeamA?: string[]; // Player IDs assigned to Team A (for internal matches)
  internalTeamB?: string[]; // Player IDs assigned to Team B (for internal matches)
  matchName?: string; // Custom name for internal/standalone matches
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

// Tournament Join Request Types
export type JoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface TournamentJoinRequest {
  id: string;
  tournamentId: string;
  teamId: string;
  teamName: string; // Denormalized for easy display
  requestedBy: string; // User ID who made the request
  requestedByName: string; // Denormalized for easy display
  status: JoinRequestStatus;
  message?: string; // Optional message from team
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string; // Organizer who approved/rejected
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
  photoURL?: string;
  teamId: string;
  teamName: string;
  goals: number;
  matches: number;
}

export interface TopAssist {
  playerId: string;
  playerName: string;
  photoURL?: string;
  teamId: string;
  teamName: string;
  assists: number;
  matches: number;
}

export interface TopGoalkeeper {
  playerId: string;
  playerName: string;
  photoURL?: string;
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
  numberOfTeams?: number;
  startDate: Date;
  endDate: Date;
  location: string;
  numberOfGroups?: number;
  matchDuration?: number;
  organizerIds?: string[];
  logoURL?: string;
  homeTeamId?: string;
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
