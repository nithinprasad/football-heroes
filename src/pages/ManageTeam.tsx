import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import teamService from '../services/team.service';
import userService from '../services/user.service';
import { Team, User } from '../types';
import Header from '../components/Header';
import ImageUpload from '../components/ImageUpload';
import { handleError } from '../utils/errorHandler';
import { countryCodes, detectUserCountry, CountryCode } from '../utils/countryCodes';

function ManageTeam() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isManager, setIsManager] = useState(false);

  // Edit team state
  const [editingTeam, setEditingTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [savingTeam, setSavingTeam] = useState(false);

  // Add player state
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  // Create new player state
  const [creatingNew, setCreatingNew] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode>(detectUserCountry());
  const [newPlayerPhone, setNewPlayerPhone] = useState('');

  useEffect(() => {
    if (id) {
      loadTeamData();
    }
  }, [id]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const teamData = await teamService.getTeamById(id!);

      if (!teamData) {
        toast.error('Team not found', 'Error');
        navigate('/my-teams');
        return;
      }

      setTeam(teamData);
      setTeamName(teamData.name);

      // Check if current user is the manager
      if (currentUser && teamData.managerId === currentUser.uid) {
        setIsManager(true);
      } else {
        toast.error('You are not authorized to manage this team', 'Access Denied');
        navigate(`/teams/${id}`);
        return;
      }

      // Load players
      if (teamData.playerIds && teamData.playerIds.length > 0) {
        const playersData = await Promise.all(
          teamData.playerIds.map((playerId) => userService.getUserById(playerId))
        );
        const validPlayers = playersData.filter((p) => p !== null) as User[];
        setPlayers(validPlayers);
      }
    } catch (error) {
      toast.error(handleError(error, 'Load Team'), 'Error');
      navigate('/my-teams');
    } finally {
      setLoading(false);
    }
  };

  // Search players
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        handleSearchPlayers();
      } else {
        setSearchResults([]);
        setCreatingNew(false);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const handleSearchPlayers = async () => {
    try {
      setSearching(true);

      // Determine if search query is a phone number
      const digitsOnly = searchQuery.replace(/\D/g, '');
      const isPhoneNumber = digitsOnly.length >= 8;

      // Just search with the raw query - don't prepend country code
      // The searchUsers function will handle matching with or without country codes
      const results = await userService.searchUsers(searchQuery);

      // Filter out players already in team
      const availablePlayers = results.filter(
        (user) => !team?.playerIds.includes(user.id)
      );

      setSearchResults(availablePlayers);

      // Check if there's an exact match in results
      const hasExactMatch = availablePlayers.some((user) => {
        if (isPhoneNumber) {
          const userPhone = (user.mobileNumber || '').replace(/\D/g, '');
          // Match if user's phone ends with our search digits
          return userPhone.endsWith(digitsOnly);
        } else {
          const userName = (user.name || '').toLowerCase().trim();
          const searchName = searchQuery.toLowerCase().trim();
          return userName === searchName;
        }
      });

      // Show create option if no results OR no exact match
      if (availablePlayers.length === 0 || !hasExactMatch) {
        setCreatingNew(true);

        // Auto-populate based on search query type
        if (isPhoneNumber) {
          setNewPlayerPhone(digitsOnly);
          setNewPlayerName('');
        } else {
          setNewPlayerName(searchQuery.trim());
          setNewPlayerPhone('');
        }
      } else {
        setCreatingNew(false);
      }
    } catch (error) {
      console.error('Error searching players:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleAddExistingPlayer = async (playerId: string) => {
    try {
      setAdding(true);
      console.log('🔵 Adding existing player:', playerId);

      await teamService.addPlayerToTeam(id!, playerId);
      console.log('✅ Player added to team');

      toast.success('Player added to team successfully!', 'Success!');

      setShowAddPlayer(false);
      setSearchQuery('');
      setSearchResults([]);

      // Reload team data (non-critical)
      try {
        await loadTeamData();
      } catch (reloadError) {
        console.warn('Could not reload team data, but player was added successfully:', reloadError);
      }
    } catch (error) {
      console.error('❌ Error adding player:', error);
      toast.error(handleError(error, 'Add Player'), 'Error');
    } finally {
      setAdding(false);
    }
  };

  const handleCreateAndAddPlayer = async () => {
    if (!newPlayerName.trim() || !newPlayerPhone.trim()) {
      toast.error('Please enter player name and phone number', 'Error');
      return;
    }

    try {
      setAdding(true);
      const fullPhoneNumber = `${countryCode.dialCode}${newPlayerPhone}`;

      console.log('🔵 Creating player:', newPlayerName, fullPhoneNumber);

      // Create unverified user
      const userId = await userService.createUnverifiedUser(fullPhoneNumber, newPlayerName);
      console.log('✅ User created:', userId);

      // Add to team
      await teamService.addPlayerToTeam(id!, userId);
      console.log('✅ Player added to team');

      toast.success(
        `${newPlayerName} added to team successfully!`,
        'Success!'
      );

      // Reset all form states
      setShowAddPlayer(false);
      setSearchQuery('');
      setNewPlayerName('');
      setNewPlayerPhone('');
      setSearchResults([]);
      setCreatingNew(false);
      setCreatingNew(false);

      // Reload team data (non-critical - don't fail if this errors)
      try {
        await loadTeamData();
      } catch (reloadError) {
        console.warn('Could not reload team data, but player was added successfully:', reloadError);
      }
    } catch (error) {
      console.error('❌ Error adding player:', error);
      toast.error(handleError(error, 'Create Player'), 'Error');
    } finally {
      setAdding(false);
    }
  };

  const handleRemovePlayer = async (playerId: string, playerName: string) => {
    if (playerId === team?.managerId) {
      toast.error('Cannot remove team manager', 'Error');
      return;
    }

    if (playerId === team?.captainId) {
      toast.error('Cannot remove team captain. Change captain first.', 'Error');
      return;
    }

    const confirmed = await toast.confirm(
      `Remove ${playerName} from the team?`,
      'Remove Player'
    );
    if (!confirmed) {
      return;
    }

    try {
      console.log('🔵 Removing player:', playerId, playerName);
      await teamService.removePlayerFromTeam(id!, playerId);
      console.log('✅ Player removed from team');

      toast.success(`${playerName} removed from team`, 'Success!');

      // Reload team data (non-critical)
      try {
        await loadTeamData();
      } catch (reloadError) {
        console.warn('Could not reload team data, but player was removed successfully:', reloadError);
      }
    } catch (error) {
      console.error('❌ Error removing player:', error);
      toast.error(handleError(error, 'Remove Player'), 'Error');
    }
  };

  const handleUpdateTeam = async () => {
    if (!teamName.trim()) {
      toast.error('Team name cannot be empty', 'Error');
      return;
    }

    try {
      setSavingTeam(true);
      await teamService.updateTeam(id!, { name: teamName });
      toast.success('Team updated successfully!', 'Success!');
      setEditingTeam(false);
      await loadTeamData();
    } catch (error) {
      toast.error(handleError(error, 'Update Team'), 'Error');
    } finally {
      setSavingTeam(false);
    }
  };

  const handleLogoUpload = async (file: File): Promise<string> => {
    try {
      const url = await teamService.uploadTeamLogo(id!, file);
      toast.success('Team logo updated!', 'Success!');
      await loadTeamData();
      return url;
    } catch (error: any) {
      throw new Error(handleError(error, 'Upload Logo'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading team...</p>
        </div>
      </div>
    );
  }

  if (!team || !isManager) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link to={`/teams/${id}`} className="text-green-400 hover:text-green-300 font-medium mb-4 inline-block">
            ← Back to Team
          </Link>
          <h1 className="text-4xl font-black text-white">Manage Team</h1>
          <p className="text-slate-400 mt-2">Add players, edit details, and manage your team</p>
        </div>

        {/* Team Details Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-black text-white">Team Details</h2>
            {!editingTeam && (
              <button
                onClick={() => setEditingTeam(true)}
                className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl hover:bg-blue-500/30 transition-all"
              >
                ✏️ Edit
              </button>
            )}
          </div>

          {editingTeam ? (
            <div className="space-y-4">
              <ImageUpload
                currentImageUrl={team.logoURL}
                onUpload={handleLogoUpload}
                label="Team Logo"
                placeholder="⚽"
              />
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Team Name</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleUpdateTeam}
                  disabled={savingTeam}
                  className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50"
                >
                  {savingTeam ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setEditingTeam(false);
                    setTeamName(team.name);
                  }}
                  className="px-6 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              {team.logoURL && (
                <div className="w-16 h-16 rounded-xl bg-slate-900/50 border-2 border-white/10 overflow-hidden flex items-center justify-center">
                  <img src={team.logoURL} alt={team.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <p className="text-white text-xl font-bold">{team.name}</p>
                <p className="text-slate-400 text-sm mt-1">Team ID: {team.teamId}</p>
              </div>
            </div>
          )}
        </div>

        {/* Players Section */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-white">Players ({players.length})</h2>
            <button
              onClick={() => {
                setShowAddPlayer(!showAddPlayer);
                if (showAddPlayer) {
                  // Reset all states when closing
                  setSearchQuery('');
                  setSearchResults([]);
                  setCreatingNew(false);
                  setNewPlayerName('');
                  setNewPlayerPhone('');
                }
              }}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all"
            >
              {showAddPlayer ? '✕ Cancel' : '+ Add Player'}
            </button>
          </div>

          {/* Add Player Section */}
          {showAddPlayer && (
            <div className="mb-6 p-4 md:p-6 bg-slate-900/50 rounded-2xl border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">🔍</span>
                Add Player to Team
              </h3>

              {/* Search Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Search by name or phone number
                </label>

                {/* Check if it's a phone search to show country code selector */}
                {searchQuery.replace(/\D/g, '').length >= 8 ? (
                  <div className="flex gap-2">
                    <select
                      value={countryCode.dialCode}
                      onChange={(e) => {
                        const selected = countryCodes.find((c) => c.dialCode === e.target.value);
                        if (selected) setCountryCode(selected);
                      }}
                      className="w-32 px-3 py-3 bg-slate-800 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-green-500"
                    >
                      {countryCodes.map((country) => (
                        <option key={country.code} value={country.dialCode}>
                          {country.flag} {country.dialCode}
                        </option>
                      ))}
                    </select>

                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="9876543210"
                        className="w-full px-4 py-3 pr-10 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setSearchResults([]);
                            setCreatingNew(false);
                            setNewPlayerName('');
                            setNewPlayerPhone('');
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g., John Doe or 9876543210"
                      className="w-full px-4 py-3 pr-10 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSearchResults([]);
                          setCreatingNew(false);
                          setNewPlayerName('');
                          setNewPlayerPhone('');
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}

                {searching && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-blue-400">
                    <div className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
                    Searching players...
                  </div>
                )}
                {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
                  <p className="text-xs text-slate-400 mt-2">
                    Type at least 2 characters to search
                  </p>
                )}
                {searchQuery.trim().length >= 2 && !searching && (
                  <p className="text-xs text-slate-400 mt-2">
                    {searchQuery.replace(/\D/g, '').length >= 8 ? (
                      <span className="flex items-center gap-1">
                        <span>📱</span> Searching with country code: {countryCode.flag} {countryCode.dialCode}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <span>👤</span> Searching by name
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-green-400 mb-3 flex items-center gap-2">
                    <span>✓</span>
                    {searchResults.length} player{searchResults.length !== 1 ? 's' : ''} found
                  </p>
                  <div className="space-y-2">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-800 rounded-xl border border-white/10 hover:border-green-500/30 transition-all"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold text-base truncate">
                            {user.name || 'No name'}
                          </p>
                          <p className="text-slate-400 text-sm">{user.mobileNumber}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {user.isVerified === false && (
                              <span className="inline-block px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/30 rounded text-yellow-400 text-xs font-medium">
                                ⚠ Unverified
                              </span>
                            )}
                            {user.position && (
                              <span className="inline-block px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 text-xs font-medium">
                                {user.position}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddExistingPlayer(user.id)}
                          disabled={adding}
                          className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-bold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95"
                        >
                          {adding ? (
                            <span className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              Adding...
                            </span>
                          ) : (
                            '+ Add to Team'
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Create New Player */}
              {creatingNew && searchQuery.trim().length >= 2 && (
                <div className="p-4 md:p-6 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-2xl">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="text-3xl">➕</div>
                    <div>
                      <p className="text-blue-400 font-bold text-lg mb-1">
                        {searchResults.length > 0 ? 'Not the right player?' : 'Player Not Found'}
                      </p>
                      <p className="text-slate-300 text-sm">
                        {searchResults.length > 0 ? (
                          <>Create a new profile instead</>
                        ) : newPlayerName ? (
                          <>Create new profile for <strong>"{newPlayerName}"</strong></>
                        ) : newPlayerPhone ? (
                          <>Create new profile with <strong>{newPlayerPhone}</strong></>
                        ) : (
                          <>Create a new player profile</>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Player Name *
                        {newPlayerName && (
                          <span className="ml-2 text-xs text-green-400">✓ Auto-filled</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        placeholder="Enter player's full name"
                        className={`w-full px-4 py-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 transition-all ${
                          newPlayerName ? 'border-green-500/50' : 'border-white/10'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Phone Number *
                        {newPlayerPhone && (
                          <span className="ml-2 text-xs text-green-400">✓ Auto-filled</span>
                        )}
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={countryCode.dialCode}
                          onChange={(e) => {
                            const selected = countryCodes.find((c) => c.dialCode === e.target.value);
                            if (selected) setCountryCode(selected);
                          }}
                          className="w-32 px-3 py-3 bg-slate-800 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          {countryCodes.map((country) => (
                            <option key={country.code} value={country.dialCode}>
                              {country.flag} {country.dialCode}
                            </option>
                          ))}
                        </select>

                        <input
                          type="tel"
                          value={newPlayerPhone}
                          onChange={(e) => setNewPlayerPhone(e.target.value.replace(/\D/g, ''))}
                          placeholder="9876543210"
                          className={`flex-1 px-4 py-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 transition-all ${
                            newPlayerPhone ? 'border-green-500/50' : 'border-white/10'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setCreatingNew(false);
                          setSearchQuery('');
                          setNewPlayerName('');
                          setNewPlayerPhone('');
                        }}
                        className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateAndAddPlayer}
                        disabled={adding || !newPlayerName.trim() || !newPlayerPhone.trim()}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                      >
                        {adding ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Creating...
                          </span>
                        ) : (
                          `✓ Create & Add ${newPlayerName || 'Player'}`
                        )}
                      </button>
                    </div>

                    <div className="p-3 bg-slate-800/50 rounded-lg border border-white/10">
                      <p className="text-xs text-slate-400 leading-relaxed">
                        💡 <strong className="text-slate-300">Note:</strong> Player can sign up later with this phone number. Once they verify their account, the team will automatically appear in their profile.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Players List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {players.map((player) => (
              <div
                key={player.id}
                className="p-4 bg-slate-900/50 rounded-xl border border-white/10"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-white font-bold">{player.name || 'No name'}</p>
                    <p className="text-slate-400 text-sm">{player.mobileNumber}</p>

                    {player.position && (
                      <p className="text-slate-400 text-sm mt-1">
                        {player.position === 'Goalkeeper' && '🧤'}
                        {player.position === 'Defender' && '🛡️'}
                        {player.position === 'Midfielder' && '⚡'}
                        {player.position === 'Forward' && '⚽'}
                        {' '}{player.position}
                      </p>
                    )}

                    <div className="flex gap-2 mt-2">
                      {player.id === team.managerId && (
                        <span className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-purple-400 text-xs font-bold">
                          Manager
                        </span>
                      )}
                      {player.id === team.captainId && (
                        <span className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded text-yellow-400 text-xs font-bold">
                          Captain
                        </span>
                      )}
                      {player.isVerified === false && (
                        <span className="px-2 py-1 bg-orange-500/20 border border-orange-500/30 rounded text-orange-400 text-xs font-bold">
                          Unverified
                        </span>
                      )}
                    </div>
                  </div>

                  {player.id !== team.managerId && player.id !== team.captainId && (
                    <button
                      onClick={() => handleRemovePlayer(player.id, player.name)}
                      className="px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {players.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-400">No players yet. Add your first player!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ManageTeam;
