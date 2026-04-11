import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import tournamentService from '../services/tournament.service';
import { Tournament } from '../types';

function Tournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'UPCOMING' | 'ONGOING' | 'COMPLETED'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTournaments();
  }, [filter]);

  const loadTournaments = async () => {
    setLoading(true);
    try {
      let data: Tournament[];
      if (filter === 'ALL') {
        data = await tournamentService.getAllTournaments();
      } else {
        data = await tournamentService.getTournamentsByStatus(filter);
      }
      setTournaments(data);
    } catch (error) {
      console.error('Error loading tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UPCOMING':
        return 'bg-blue-100 text-blue-800';
      case 'ONGOING':
        return 'bg-green-100 text-green-800';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: any) => {
    const d = date instanceof Date ? date : new Date(date.seconds * 1000);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="text-2xl font-bold text-green-600">
            ⚽ Football Heroes
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Tournaments</h1>
          <Link
            to="/login"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Sign In
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-2 mb-6 overflow-x-auto">
          {['ALL', 'UPCOMING', 'ONGOING', 'COMPLETED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status as any)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
                filter === status
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Tournaments Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading tournaments...</p>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600">No tournaments found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <Link
                key={tournament.id}
                to={`/tournaments/${tournament.id}`}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-bold text-gray-900">{tournament.name}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                        tournament.status
                      )}`}
                    >
                      {tournament.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <span className="font-medium mr-2">📍</span>
                      {tournament.location}
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium mr-2">📅</span>
                      {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium mr-2">🏆</span>
                      {tournament.format.replace('_', ' + ')}
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium mr-2">👥</span>
                      {tournament.teamIds.length} teams ({tournament.teamSize}-a-side)
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-6 py-3 text-sm text-green-600 font-medium">
                  View Details →
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Tournaments;
