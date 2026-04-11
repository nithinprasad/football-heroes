/**
 * Mock Data Generation Script
 *
 * This script generates sample data for Football Heroes app
 * Run with: ts-node scripts/generateMockData.ts
 *
 * Or manually copy the data structure and add via Firebase Console
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

// Replace with your Firebase config
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Sample data
const mockUsers = [
  {
    name: 'John Smith',
    mobileNumber: '+1234567890',
    position: 'Forward',
    jerseyNumber: 10,
    roles: ['player'],
    statistics: { matches: 15, goals: 12, assists: 8, yellowCards: 2, redCards: 0, cleanSheets: 0 },
  },
  {
    name: 'Mike Johnson',
    mobileNumber: '+1234567891',
    position: 'Goalkeeper',
    jerseyNumber: 1,
    roles: ['player'],
    statistics: { matches: 15, goals: 0, assists: 0, yellowCards: 1, redCards: 0, cleanSheets: 8 },
  },
  {
    name: 'David Brown',
    mobileNumber: '+1234567892',
    position: 'Defender',
    jerseyNumber: 5,
    roles: ['player', 'captain'],
    statistics: { matches: 15, goals: 3, assists: 2, yellowCards: 4, redCards: 1, cleanSheets: 0 },
  },
  {
    name: 'James Wilson',
    mobileNumber: '+1234567893',
    position: 'Midfielder',
    jerseyNumber: 8,
    roles: ['player'],
    statistics: { matches: 14, goals: 7, assists: 10, yellowCards: 3, redCards: 0, cleanSheets: 0 },
  },
  {
    name: 'Robert Lee',
    mobileNumber: '+1234567894',
    position: 'Forward',
    jerseyNumber: 9,
    roles: ['player'],
    statistics: { matches: 15, goals: 15, assists: 5, yellowCards: 1, redCards: 0, cleanSheets: 0 },
  },
  {
    name: 'Admin User',
    mobileNumber: '+1234567899',
    position: 'Forward',
    jerseyNumber: 99,
    roles: ['player', 'admin'],
    statistics: { matches: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, cleanSheets: 0 },
  },
];

const mockTeams = [
  {
    name: 'Red Dragons',
    playerIds: [], // Will be filled with user IDs
    captainId: '', // Will be set
  },
  {
    name: 'Blue Eagles',
    playerIds: [],
    captainId: '',
  },
  {
    name: 'Green Panthers',
    playerIds: [],
    captainId: '',
  },
  {
    name: 'Yellow Tigers',
    playerIds: [],
    captainId: '',
  },
];

const mockTournament = {
  name: 'Summer Championship 2024',
  format: 'LEAGUE_KNOCKOUT',
  teamSize: 11,
  location: 'Central Sports Complex',
  status: 'ONGOING',
  numberOfGroups: 2,
  pointsForWin: 3,
  pointsForDraw: 1,
  pointsForLoss: 0,
  matchDuration: 90,
  teamIds: [],
  organizerIds: [],
  scorerIds: [],
  startDate: new Date('2024-06-01'),
  endDate: new Date('2024-06-30'),
};

async function generateMockData() {
  console.log('🚀 Starting mock data generation...\n');

  try {
    // Create users
    console.log('👥 Creating users...');
    const userIds: string[] = [];

    for (const userData of mockUsers) {
      const userRef = doc(collection(db, 'users'));
      await setDoc(userRef, {
        ...userData,
        id: userRef.id,
        teamIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      userIds.push(userRef.id);
      console.log(`✅ Created user: ${userData.name} (${userRef.id})`);
    }

    // Create teams
    console.log('\n👥 Creating teams...');
    const teamIds: string[] = [];

    for (let i = 0; i < mockTeams.length; i++) {
      const team = mockTeams[i];
      const teamRef = doc(collection(db, 'teams'));

      // Assign players to teams (3-4 players per team)
      const startIdx = i * 1;
      const endIdx = Math.min(startIdx + 3, userIds.length - 1); // Leave admin user out
      const teamPlayers = userIds.slice(startIdx, endIdx);

      await setDoc(teamRef, {
        ...team,
        id: teamRef.id,
        captainId: teamPlayers[0],
        playerIds: teamPlayers,
        createdAt: serverTimestamp(),
      });

      teamIds.push(teamRef.id);
      console.log(`✅ Created team: ${team.name} (${teamRef.id})`);

      // Update users with team ID
      for (const playerId of teamPlayers) {
        const userRef = doc(db, 'users', playerId);
        await setDoc(
          userRef,
          {
            teamIds: [teamRef.id],
          },
          { merge: true }
        );
      }
    }

    // Create tournament
    console.log('\n🏆 Creating tournament...');
    const tournamentRef = doc(collection(db, 'tournaments'));
    const adminId = userIds[userIds.length - 1]; // Admin user

    await setDoc(tournamentRef, {
      ...mockTournament,
      id: tournamentRef.id,
      teamIds,
      createdBy: adminId,
      organizerIds: [adminId],
      scorerIds: [adminId],
      createdAt: serverTimestamp(),
    });
    console.log(`✅ Created tournament: ${mockTournament.name} (${tournamentRef.id})`);

    // Create some sample matches
    console.log('\n⚽ Creating matches...');
    const matches = [
      {
        homeTeamId: teamIds[0],
        awayTeamId: teamIds[1],
        stage: 'GROUP',
        groupName: 'Group A',
        status: 'SCHEDULED',
      },
      {
        homeTeamId: teamIds[2],
        awayTeamId: teamIds[3],
        stage: 'GROUP',
        groupName: 'Group B',
        status: 'SCHEDULED',
      },
      {
        homeTeamId: teamIds[0],
        awayTeamId: teamIds[2],
        stage: 'GROUP',
        groupName: 'Group A',
        status: 'COMPLETED',
        score: { home: 3, away: 1 },
      },
      {
        homeTeamId: teamIds[1],
        awayTeamId: teamIds[3],
        stage: 'GROUP',
        groupName: 'Group B',
        status: 'COMPLETED',
        score: { home: 2, away: 2 },
      },
    ];

    for (const match of matches) {
      const matchRef = doc(collection(db, 'matches'));
      await setDoc(matchRef, {
        ...match,
        id: matchRef.id,
        tournamentId: tournamentRef.id,
        matchDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date in next 7 days
        venue: mockTournament.location,
        score: match.score || { home: 0, away: 0 },
        matchDuration: 90,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log(`✅ Created match: ${match.stage} - ${match.status}`);
    }

    console.log('\n✨ Mock data generation completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   Users: ${userIds.length}`);
    console.log(`   Teams: ${teamIds.length}`);
    console.log(`   Tournaments: 1`);
    console.log(`   Matches: ${matches.length}`);
    console.log(`\n🔑 Admin User ID: ${adminId}`);
    console.log('   Use this ID to log in as admin (phone: +1234567899)\n');
  } catch (error) {
    console.error('❌ Error generating mock data:', error);
    throw error;
  }
}

// Run the script
generateMockData()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });

// Export for manual use
export const manualMockData = {
  users: mockUsers,
  teams: mockTeams,
  tournament: mockTournament,
};
