import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { Team, TeamFormData } from '../types';
import userService from './user.service';

class TeamService {
  private teamsCollection = collection(db, 'teams');

  /**
   * Create a new team
   */
  async createTeam(
    captainId: string,
    teamData: TeamFormData
  ): Promise<string> {
    try {
      const teamRef = doc(this.teamsCollection);
      const team: Team = {
        id: teamRef.id,
        name: teamData.name,
        captainId,
        playerIds: [captainId], // Captain is automatically a player
        logoURL: teamData.logoURL,
        createdAt: serverTimestamp() as any,
      };

      await setDoc(teamRef, team);

      // Add team to captain's team list
      await userService.addTeamToUser(captainId, teamRef.id);

      return teamRef.id;
    } catch (error) {
      console.error('Error creating team:', error);
      throw new Error('Failed to create team');
    }
  }

  /**
   * Get team by ID
   */
  async getTeamById(teamId: string): Promise<Team | null> {
    try {
      const teamRef = doc(db, 'teams', teamId);
      const teamSnap = await getDoc(teamRef);

      if (teamSnap.exists()) {
        return { ...teamSnap.data(), id: teamSnap.id } as Team;
      }

      return null;
    } catch (error) {
      console.error('Error fetching team:', error);
      return null;
    }
  }

  /**
   * Get multiple teams by IDs
   */
  async getTeamsByIds(teamIds: string[]): Promise<Team[]> {
    try {
      const teams: Team[] = [];

      for (const teamId of teamIds) {
        const team = await this.getTeamById(teamId);
        if (team) {
          teams.push(team);
        }
      }

      return teams;
    } catch (error) {
      console.error('Error fetching teams:', error);
      return [];
    }
  }

  /**
   * Get teams by captain
   */
  async getTeamsByCaptain(captainId: string): Promise<Team[]> {
    try {
      const q = query(this.teamsCollection, where('captainId', '==', captainId));
      const querySnapshot = await getDocs(q);

      const teams: Team[] = [];
      querySnapshot.forEach((doc) => {
        teams.push({ ...doc.data(), id: doc.id } as Team);
      });

      return teams;
    } catch (error) {
      console.error('Error fetching captain teams:', error);
      return [];
    }
  }

  /**
   * Update team
   */
  async updateTeam(teamId: string, data: Partial<Team>): Promise<void> {
    try {
      const teamRef = doc(db, 'teams', teamId);
      await updateDoc(teamRef, data);
    } catch (error) {
      console.error('Error updating team:', error);
      throw new Error('Failed to update team');
    }
  }

  /**
   * Delete team
   */
  async deleteTeam(teamId: string): Promise<void> {
    try {
      const team = await this.getTeamById(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      // Remove team from all players' team lists
      for (const playerId of team.playerIds) {
        await userService.removeTeamFromUser(playerId, teamId);
      }

      const teamRef = doc(db, 'teams', teamId);
      await deleteDoc(teamRef);
    } catch (error) {
      console.error('Error deleting team:', error);
      throw new Error('Failed to delete team');
    }
  }

  /**
   * Add player to team
   */
  async addPlayerToTeam(teamId: string, playerId: string): Promise<void> {
    try {
      const team = await this.getTeamById(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      if (!team.playerIds.includes(playerId)) {
        await this.updateTeam(teamId, {
          playerIds: [...team.playerIds, playerId],
        });

        await userService.addTeamToUser(playerId, teamId);
      }
    } catch (error) {
      console.error('Error adding player to team:', error);
      throw new Error('Failed to add player to team');
    }
  }

  /**
   * Remove player from team
   */
  async removePlayerFromTeam(teamId: string, playerId: string): Promise<void> {
    try {
      const team = await this.getTeamById(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      // Prevent removing the captain
      if (team.captainId === playerId) {
        throw new Error('Cannot remove captain from team. Assign a new captain first.');
      }

      await this.updateTeam(teamId, {
        playerIds: team.playerIds.filter((id) => id !== playerId),
      });

      await userService.removeTeamFromUser(playerId, teamId);
    } catch (error) {
      console.error('Error removing player from team:', error);
      throw new Error('Failed to remove player from team');
    }
  }

  /**
   * Change team captain
   */
  async changeCaptain(teamId: string, newCaptainId: string): Promise<void> {
    try {
      const team = await this.getTeamById(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      if (!team.playerIds.includes(newCaptainId)) {
        throw new Error('New captain must be a member of the team');
      }

      await this.updateTeam(teamId, {
        captainId: newCaptainId,
      });
    } catch (error) {
      console.error('Error changing captain:', error);
      throw new Error('Failed to change captain');
    }
  }

  /**
   * Upload team logo
   */
  async uploadTeamLogo(teamId: string, file: File): Promise<string> {
    try {
      const storageRef = ref(storage, `teams/${teamId}/logo.jpg`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      await this.updateTeam(teamId, { logoURL: downloadURL });

      return downloadURL;
    } catch (error) {
      console.error('Error uploading team logo:', error);
      throw new Error('Failed to upload team logo');
    }
  }

  /**
   * Get all teams
   */
  async getAllTeams(): Promise<Team[]> {
    try {
      const querySnapshot = await getDocs(this.teamsCollection);
      const teams: Team[] = [];

      querySnapshot.forEach((doc) => {
        teams.push({ ...doc.data(), id: doc.id } as Team);
      });

      return teams;
    } catch (error) {
      console.error('Error fetching all teams:', error);
      return [];
    }
  }

  /**
   * Search teams by name
   */
  async searchTeamsByName(searchTerm: string): Promise<Team[]> {
    try {
      const querySnapshot = await getDocs(this.teamsCollection);
      const teams: Team[] = [];

      querySnapshot.forEach((doc) => {
        const team = { ...doc.data(), id: doc.id } as Team;
        if (team.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          teams.push(team);
        }
      });

      return teams;
    } catch (error) {
      console.error('Error searching teams:', error);
      return [];
    }
  }
}

export default new TeamService();
