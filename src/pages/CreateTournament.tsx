import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import tournamentService from '../services/tournament.service';
import { TournamentFormat } from '../types';
import LocationAutocomplete from '../components/LocationAutocomplete';
import ImageUpload from '../components/ImageUpload';
import { handleError } from '../utils/errorHandler';

function CreateTournament() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    format: 'LEAGUE' as TournamentFormat,
    teamSize: 11,
    customTeamSize: '',
    numberOfTeams: 4,
    location: '',
    startDate: '',
    endDate: '',
    numberOfGroups: 1,
    matchDuration: 90,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      navigate('/login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Use custom team size if entered, otherwise use selected
      const finalTeamSize = formData.customTeamSize
        ? parseInt(formData.customTeamSize)
        : formData.teamSize;

      if (finalTeamSize < 3 || finalTeamSize > 11) {
        throw new Error('Team size must be between 3 and 11 players');
      }

      if (formData.numberOfTeams < 2) {
        throw new Error('Tournament must have at least 2 teams');
      }

      const tournamentData: any = {
        name: formData.name,
        format: formData.format,
        teamSize: finalTeamSize,
        numberOfTeams: formData.numberOfTeams,
        location: formData.location,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        matchDuration: formData.matchDuration,
      };

      // Only include numberOfGroups if format requires it
      if (formData.format === 'LEAGUE' || formData.format === 'LEAGUE_KNOCKOUT') {
        tournamentData.numberOfGroups = formData.numberOfGroups;
      }

      const createdTournamentId = await tournamentService.createTournament(currentUser.uid, tournamentData);

      // Upload logo after tournament is created
      if (logoFile) {
        try {
          await tournamentService.uploadTournamentLogo(createdTournamentId, logoFile);
        } catch (logoError) {
          console.error('Error uploading tournament logo:', logoError);
          // Don't fail tournament creation if logo upload fails
        }
      }

      toast.success('Tournament created successfully! You are now the organizer.', 'Success!');
      navigate(`/tournaments/${createdTournamentId}`);
    } catch (err: any) {
      setError(handleError(err, 'Create Tournament'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (file: File): Promise<string> => {
    // Store file for upload after tournament creation
    setLogoFile(file);

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);

    return previewUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation */}
      <nav className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <div className="text-3xl">⚽</div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Football Heroes</h1>
          </Link>
          <Link to="/" className="text-green-400 hover:text-green-300 font-medium">
            ← Back
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-block mb-4 px-6 py-2 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-full border border-green-500/30">
              <span className="text-green-400 font-semibold">🏆 Tournament Creator</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">Create Your Tournament</h1>
            <p className="text-slate-400 text-lg">You'll become the organizer and can invite teams</p>
          </div>

          {!currentUser && (
            <div className="bg-blue-500/10 border border-blue-500/30 text-blue-300 p-5 rounded-2xl mb-8 backdrop-blur-sm">
              <span className="font-semibold">⚠️ Sign in required:</span> You need to{' '}
              <Link to="/login" className="font-bold underline hover:text-blue-200">
                sign in
              </Link>{' '}
              to create a tournament. You'll become the tournament organizer and can manage teams and matches.
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-5 rounded-2xl mb-8">
              <span className="font-semibold">❌ Error:</span> {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tournament Logo */}
              <div className="md:col-span-2">
                <ImageUpload
                  currentImageUrl={logoPreview}
                  onUpload={handleLogoUpload}
                  label="Tournament Logo (Optional)"
                  placeholder="🏆"
                />
              </div>

              {/* Tournament Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-300 mb-3">
                  Tournament Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Summer Championship 2024"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Location */}
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-300 mb-3">
                  Location *
                </label>
                <LocationAutocomplete
                  value={formData.location}
                  onChange={(value) => setFormData({ ...formData, location: value })}
                  placeholder="e.g., City Sports Complex, Mumbai"
                  required
                />
                <p className="mt-2 text-xs text-slate-400">
                  📍 Enter venue name and city (suggestions available as you type)
                </p>
              </div>

              {/* Format */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-3">
                  Tournament Format *
                </label>
                <select
                  value={formData.format}
                  onChange={(e) => setFormData({ ...formData, format: e.target.value as TournamentFormat })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                >
                  <option value="LEAGUE">League (Round Robin)</option>
                  <option value="KNOCKOUT">Knockout</option>
                  <option value="LEAGUE_KNOCKOUT">League + Knockout</option>
                </select>
              </div>

              {/* Number of Teams */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-3">
                  Number of Teams *
                </label>
                <input
                  type="number"
                  required
                  min="2"
                  max="32"
                  value={formData.numberOfTeams}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setFormData({ ...formData, numberOfTeams: isNaN(val) ? 2 : val });
                  }}
                  placeholder="4"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
                <p className="mt-1 text-xs text-slate-500">Expected number of teams (2-32)</p>
              </div>

              {/* Team Size (Preset) */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-3">
                  Team Size (Preset)
                </label>
                <select
                  value={formData.teamSize}
                  onChange={(e) => setFormData({ ...formData, teamSize: parseInt(e.target.value), customTeamSize: '' })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                >
                  <option value="5">5-a-side</option>
                  <option value="6">6-a-side</option>
                  <option value="7">7-a-side</option>
                  <option value="9">9-a-side</option>
                  <option value="11">11-a-side</option>
                </select>
              </div>

              {/* Custom Team Size */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-3">
                  Custom Team Size (Optional)
                </label>
                <input
                  type="number"
                  min="3"
                  max="11"
                  value={formData.customTeamSize}
                  onChange={(e) => setFormData({ ...formData, customTeamSize: e.target.value })}
                  placeholder="e.g., 8"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
                <p className="mt-1 text-xs text-slate-500">Override preset (3-11 players)</p>
              </div>

              {/* Match Duration */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-3">
                  Match Duration *
                </label>
                <select
                  value={formData.matchDuration}
                  onChange={(e) => setFormData({ ...formData, matchDuration: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                >
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-3">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-3">
                  End Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Number of Groups (for League formats) */}
              {(formData.format === 'LEAGUE' || formData.format === 'LEAGUE_KNOCKOUT') && (
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-3">
                    Number of Groups
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={formData.numberOfGroups}
                    onChange={(e) => setFormData({ ...formData, numberOfGroups: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-slate-500 mt-2">Leave as 1 for a single league table</p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !currentUser}
              className="w-full mt-8 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all shadow-xl shadow-green-500/20"
            >
              {loading ? 'Creating...' : '🏆 Create Tournament & Become Organizer'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateTournament;
