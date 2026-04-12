import { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import userService from '../services/user.service';
import { User } from '../types';
import { countryCodes, detectUserCountry, CountryCode } from '../utils/countryCodes';

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPlayer: (playerId: string) => Promise<void>;
  onCreateAndAddPlayer: (name: string, phone: string, countryCode: string) => Promise<void>;
  teamId: string;
  existingPlayerIds: string[];
}

function AddPlayerModal({
  isOpen,
  onClose,
  onAddPlayer,
  onCreateAndAddPlayer,
  existingPlayerIds,
}: AddPlayerModalProps) {
  const toast = useToast();
  const [searchMethod, setSearchMethod] = useState<'name' | 'phone' | 'link'>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [countryCode, setCountryCode] = useState<CountryCode>(detectUserCountry());

  // Create new player state
  const [creatingNew, setCreatingNew] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPhone, setNewPlayerPhone] = useState('');

  // Join link state
  const [joinLinkCopied, setJoinLinkCopied] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;

    try {
      setSearching(true);
      setCreatingNew(false);

      let results: User[] = [];

      if (searchMethod === 'phone') {
        const digitsOnly = searchQuery.replace(/\D/g, '');
        if (digitsOnly.length < 8) {
          toast.warning('Please enter at least 8 digits', 'Invalid Phone');
          setSearching(false);
          return;
        }

        // Search with full number including country code
        const fullPhone = `${countryCode.dialCode}${digitsOnly}`;
        results = await userService.searchUsers(fullPhone);

        if (results.length === 0) {
          setCreatingNew(true);
          setNewPlayerPhone(digitsOnly);
          setNewPlayerName('');
        }
      } else {
        // Name search
        results = await userService.searchUsers(searchQuery);

        if (results.length === 0) {
          setCreatingNew(true);
          setNewPlayerName(searchQuery.trim());
          setNewPlayerPhone('');
        }
      }

      // Filter out existing players
      const availablePlayers = results.filter(
        (user) => !existingPlayerIds.includes(user.id)
      );

      setSearchResults(availablePlayers);

      if (availablePlayers.length === 0 && results.length > 0) {
        toast.info('All matching players are already in this team', 'Info');
      }
    } catch (error) {
      console.error('Error searching:', error);
      toast.error('Failed to search players', 'Error');
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.trim().length >= 2 && searchMethod !== 'link') {
        handleSearch();
      } else {
        setSearchResults([]);
        setCreatingNew(false);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery, searchMethod]);

  const handleAddExisting = async (playerId: string) => {
    try {
      setAdding(true);
      await onAddPlayer(playerId);
      setSearchQuery('');
      setSearchResults([]);
      onClose();
    } catch (error) {
      console.error('Error adding player:', error);
    } finally {
      setAdding(false);
    }
  };

  const handleCreateNew = async () => {
    if (!newPlayerName.trim() || !newPlayerPhone.trim()) {
      toast.warning('Please enter both name and phone number', 'Missing Information');
      return;
    }

    try {
      setAdding(true);
      await onCreateAndAddPlayer(newPlayerName, newPlayerPhone, countryCode.dialCode);
      setSearchQuery('');
      setNewPlayerName('');
      setNewPlayerPhone('');
      setCreatingNew(false);
      onClose();
    } catch (error) {
      console.error('Error creating player:', error);
    } finally {
      setAdding(false);
    }
  };

  const handleCopyJoinLink = () => {
    // Join link will be implemented with team join route
    const joinLink = `${window.location.origin}/teams/join/${window.location.pathname.split('/')[2]}`;
    navigator.clipboard.writeText(joinLink).then(() => {
      setJoinLinkCopied(true);
      toast.success('Join link copied to clipboard!', 'Success');
      setTimeout(() => setJoinLinkCopied(false), 3000);
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
        <div className="bg-slate-900 rounded-2xl border border-white/10 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-slate-900 border-b border-white/10 p-6 flex justify-between items-center">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>👥</span>
              Add Player to Team
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6">
            {/* Method Tabs */}
            <div className="flex gap-2 mb-6 border-b border-white/10">
              <button
                onClick={() => {
                  setSearchMethod('name');
                  setSearchQuery('');
                  setSearchResults([]);
                  setCreatingNew(false);
                }}
                className={`px-4 py-2 font-medium transition-all ${
                  searchMethod === 'name'
                    ? 'text-green-400 border-b-2 border-green-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                👤 Search by Name
              </button>
              <button
                onClick={() => {
                  setSearchMethod('phone');
                  setSearchQuery('');
                  setSearchResults([]);
                  setCreatingNew(false);
                }}
                className={`px-4 py-2 font-medium transition-all ${
                  searchMethod === 'phone'
                    ? 'text-green-400 border-b-2 border-green-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📱 Search by Phone
              </button>
              <button
                onClick={() => {
                  setSearchMethod('link');
                  setSearchResults([]);
                  setCreatingNew(false);
                }}
                className={`px-4 py-2 font-medium transition-all ${
                  searchMethod === 'link'
                    ? 'text-green-400 border-b-2 border-green-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🔗 Share Join Link
              </button>
            </div>

            {/* Search by Name */}
            {searchMethod === 'name' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Player Name
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g., John Doe"
                  className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500"
                  autoFocus
                />
                {searching && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-blue-400">
                    <div className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
                    Searching...
                  </div>
                )}
              </div>
            )}

            {/* Search by Phone */}
            {searchMethod === 'phone' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Phone Number
                </label>
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
                  <input
                    type="tel"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    className="flex-1 px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500"
                    autoFocus
                  />
                </div>
                {searching && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-blue-400">
                    <div className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
                    Searching...
                  </div>
                )}
              </div>
            )}

            {/* Share Join Link */}
            {searchMethod === 'link' && (
              <div className="space-y-4">
                <div className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="text-4xl">🔗</div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-white mb-2">Share Team Join Link</h4>
                      <p className="text-slate-300 text-sm">
                        Players can use this link to request to join your team. You'll receive a notification to approve or reject their request.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCopyJoinLink}
                    className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {joinLinkCopied ? (
                      <>
                        <span>✓</span>
                        Link Copied!
                      </>
                    ) : (
                      <>
                        <span>📋</span>
                        Copy Join Link
                      </>
                    )}
                  </button>
                </div>
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <p className="text-sm text-slate-300">
                    <strong className="text-blue-400">💡 How it works:</strong>
                    <br />
                    1. Share the join link with players
                    <br />
                    2. Players click the link and request to join
                    <br />
                    3. You'll see pending requests in the team management page
                    <br />
                    4. Approve or reject requests as needed
                  </p>
                </div>
              </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-6 space-y-3">
                <p className="text-sm font-medium text-green-400">
                  ✓ {searchResults.length} player{searchResults.length !== 1 ? 's' : ''} found
                </p>
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-slate-800 rounded-xl border border-white/10"
                  >
                    <div className="flex-1">
                      <p className="text-white font-bold">{user.name || 'No name'}</p>
                      <p className="text-slate-400 text-sm">{user.mobileNumber}</p>
                      {user.position && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                          {user.position}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleAddExisting(user.id)}
                      disabled={adding}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-all disabled:opacity-50"
                    >
                      {adding ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Create New Player */}
            {creatingNew && (
              <div className="mt-6 p-6 bg-blue-500/10 border border-blue-500/30 rounded-2xl">
                <p className="text-blue-400 font-bold mb-4">
                  Player not found. Create new profile:
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Name *</label>
                    <input
                      type="text"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      placeholder="Player name"
                      className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Phone Number *</label>
                    <div className="flex gap-2">
                      <select
                        value={countryCode.dialCode}
                        onChange={(e) => {
                          const selected = countryCodes.find((c) => c.dialCode === e.target.value);
                          if (selected) setCountryCode(selected);
                        }}
                        className="w-32 px-3 py-3 bg-slate-800 border border-white/10 rounded-xl text-white text-sm"
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
                        className="flex-1 px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleCreateNew}
                    disabled={adding || !newPlayerName.trim() || !newPlayerPhone.trim()}
                    className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-all"
                  >
                    {adding ? 'Creating...' : 'Create & Add Player'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default AddPlayerModal;
