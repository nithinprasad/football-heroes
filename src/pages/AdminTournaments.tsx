import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import tournamentService from '../services/tournament.service';
import { Tournament, TournamentFormat } from '../types';

function AdminTournaments() {
  const { userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    format: 'LEAGUE' as TournamentFormat,
    teamSize: 11,
    location: '',
    startDate: '',
    endDate: '',
    numberOfGroups: 2,
  });
  const [saving, setSaving] = useState(false);

  // Check if user is admin
  const isAdmin = userProfile?.roles.includes('admin');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    loadTournaments();
  }, [isAdmin]);

  const loadTournaments = async () => {
    setLoading(true);
    try {
      const data = await tournamentService.getAllTournaments();
      setTournaments(data);
    } catch (error) {
      console.error('Error loading tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await tournamentService.createTournament(userProfile!.id, {
        name: formData.name,
        format: formData.format,
        teamSize: formData.teamSize,
        location: formData.location,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        numberOfGroups: formData.format === 'LEAGUE_KNOCKOUT' ? formData.numberOfGroups : undefined,
      });

      // Reset form
      setFormData({
        name: '',
        format: 'LEAGUE',
        teamSize: 11,
        location: '',
        startDate: '',
        endDate: '',
        numberOfGroups: 2,
      });
      setShowCreateForm(false);
      loadTournaments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create tournament', 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateFixtures = async (tournamentId: string) => {
    const confirmed = await toast.confirm(
      'Generate fixtures for this tournament? This cannot be undone.',
      'Generate Fixtures'
    );
    if (!confirmed) {
      return;
    }

    try {
      await tournamentService.generateFixtures(tournamentId);
      toast.success('Fixtures generated successfully!', 'Success!');
      loadTournaments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate fixtures', 'Error');
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/dashboard" className="text-2xl font-bold text-green-600">
            ⚽ Football Heroes - Admin
          </Link>
          <button
            onClick={signOut}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Manage Tournaments</h1>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            {showCreateForm ? 'Cancel' : '+ Create Tournament'}
          </button>
        </div>

        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Create New Tournament</h2>
            <form onSubmit={handleCreateTournament} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tournament Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Format *
                  </label>
                  <select
                    value={formData.format}
                    onChange={(e) =>
                      setFormData({ ...formData, format: e.target.value as TournamentFormat })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="LEAGUE">League (Round Robin)</option>
                    <option value="KNOCKOUT">Knockout</option>
                    <option value="LEAGUE_KNOCKOUT">League + Knockout</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Size *
                  </label>
                  <select
                    value={formData.teamSize}
                    onChange={(e) =>
                      setFormData({ ...formData, teamSize: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="5">5-a-side</option>
                    <option value="7">7-a-side</option>
                    <option value="11">11-a-side</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {formData.format === 'LEAGUE_KNOCKOUT' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Groups
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="8"
                      value={formData.numberOfGroups}
                      onChange={(e) =>
                        setFormData({ ...formData, numberOfGroups: parseInt(e.target.value) })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400"
              >
                {saving ? 'Creating...' : 'Create Tournament'}
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {tournaments.map((tournament) => (
              <div key={tournament.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{tournament.name}</h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>📍 {tournament.location}</p>
                      <p>🏆 {tournament.format.replace('_', ' + ')}</p>
                      <p>👥 {tournament.teamIds.length} teams ({tournament.teamSize}-a-side)</p>
                      <p>
                        Status:{' '}
                        <span className="font-medium text-green-600">{tournament.status}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2">
                    <Link
                      to={`/tournaments/${tournament.id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 text-center"
                    >
                      View
                    </Link>
                    {tournament.status === 'UPCOMING' && tournament.teamIds.length >= 2 && (
                      <button
                        onClick={() => handleGenerateFixtures(tournament.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                      >
                        Generate Fixtures
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminTournaments;
