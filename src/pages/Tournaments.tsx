import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import tournamentService from '../services/tournament.service';
import { Tournament } from '../types';
import Header from '../components/Header';

function Tournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [filteredTournaments, setFilteredTournaments] = useState<Tournament[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'UPCOMING' | 'ONGOING' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadTournaments();
  }, [filter]);

  useEffect(() => {
    // Filter tournaments based on search query
    if (searchQuery.trim() === '') {
      setFilteredTournaments(tournaments);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = tournaments.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.location.toLowerCase().includes(query) ||
          t.format.toLowerCase().includes(query)
      );
      setFilteredTournaments(filtered);
    }
  }, [searchQuery, tournaments]);

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
      setFilteredTournaments(data);
    } catch (error) {
      console.error('Error loading tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      UPCOMING: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', icon: '🔜' },
      ONGOING: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', icon: '🔴' },
      COMPLETED: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30', icon: '✓' },
    };
    const badge = badges[status] || badges.UPCOMING;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border} inline-flex items-center gap-1`}>
        <span>{badge.icon}</span>
        {status}
      </span>
    );
  };

  const formatDate = (date: any) => {
    const d = date instanceof Date ? date : new Date(date.seconds * 1000);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getFormatIcon = (format: string) => {
    if (format === 'LEAGUE') return '🏆';
    if (format === 'KNOCKOUT') return '⚡';
    return '🎯';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation */}
      <Header />

      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">🏆 Tournaments</h1>
          <p className="text-slate-400 text-base md:text-lg">Discover and join football tournaments near you</p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-6 md:mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search tournaments by name, location, or format..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm md:text-base"
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400">
              🔍
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 md:gap-3 mb-6 md:mb-8 overflow-x-auto pb-2">
          {['ALL', 'UPCOMING', 'ONGOING', 'COMPLETED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status as any)}
              className={`px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold whitespace-nowrap transition-all text-sm md:text-base ${
                filter === status
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                  : 'bg-slate-800/50 backdrop-blur-xl text-slate-300 border border-white/10 hover:bg-slate-800/70'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Results Count */}
        {searchQuery && (
          <div className="mb-4 text-slate-400 text-sm md:text-base">
            Found {filteredTournaments.length} tournament{filteredTournaments.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Tournaments Grid */}
        {loading ? (
          <div className="text-center py-12 md:py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-6 text-slate-400 text-sm md:text-base">Loading tournaments...</p>
          </div>
        ) : filteredTournaments.length === 0 ? (
          <div className="text-center py-12 md:py-20">
            <div className="bg-slate-800/30 backdrop-blur-xl rounded-3xl border border-white/10 p-8 md:p-12 max-w-md mx-auto">
              <div className="text-6xl md:text-7xl mb-4 opacity-30">🏆</div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">No tournaments found</h3>
              <p className="text-slate-400 mb-6 text-sm md:text-base">
                {searchQuery ? 'Try different search terms' : 'Be the first to create one!'}
              </p>
              {!searchQuery && (
                <Link
                  to="/create-tournament"
                  className="inline-block px-6 md:px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full font-bold hover:from-green-600 hover:to-emerald-700 transition-all text-sm md:text-base"
                >
                  Create Tournament
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredTournaments.map((tournament) => (
              <Link
                key={tournament.id}
                to={`/tournaments/${tournament.id}`}
                className="group bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden hover:bg-slate-800/70 hover:border-green-500/30 transition-all shadow-xl hover:shadow-2xl hover:shadow-green-500/10"
              >
                {/* Tournament Banner */}
                <div className="relative h-32 md:h-40 bg-gradient-to-br from-green-500/20 to-blue-500/20 p-4 md:p-6">
                  <div className="absolute top-4 right-4">
                    {getStatusBadge(tournament.status)}
                  </div>
                  {tournament.logoURL ? (
                    <img src={tournament.logoURL} alt={tournament.name} className="w-16 h-16 md:w-20 md:h-20 object-contain" />
                  ) : (
                    <div className="text-5xl md:text-6xl">{getFormatIcon(tournament.format)}</div>
                  )}
                </div>

                {/* Tournament Info */}
                <div className="p-4 md:p-6">
                  <h3 className="text-lg md:text-xl font-bold text-white mb-3 group-hover:text-green-400 transition-colors line-clamp-2">
                    {tournament.name}
                  </h3>

                  <div className="space-y-2 text-xs md:text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      <span>📍</span>
                      <span className="line-clamp-1">{tournament.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>📅</span>
                      <span>{formatDate(tournament.startDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{getFormatIcon(tournament.format)}</span>
                      <span>{tournament.format.replace('_', ' + ')}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-xs md:text-sm">
                    <div className="text-center">
                      <div className="text-lg md:text-xl font-bold text-green-400">{tournament.teamIds.length}</div>
                      <div className="text-slate-500">Teams</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg md:text-xl font-bold text-blue-400">{tournament.teamSize}</div>
                      <div className="text-slate-500">a-side</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg md:text-xl font-bold text-purple-400">
                        {tournament.pointsForWin}
                      </div>
                      <div className="text-slate-500">pts/win</div>
                    </div>
                  </div>

                  {/* View Button */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="text-green-400 font-bold text-center group-hover:text-green-300 transition-colors text-sm md:text-base">
                      View Details →
                    </div>
                  </div>
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
