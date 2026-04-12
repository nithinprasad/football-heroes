import { useState } from 'react';
import { MatchStage, Team } from '../types';
import { useToast } from '../contexts/ToastContext';

interface ManualMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateMatch: (matchData: {
    homeTeamId: string;
    awayTeamId: string;
    stage: MatchStage;
    groupName?: string;
    matchDate: Date;
    venue: string;
    extraTimeDuration?: number;
  }) => void;
  teams: Team[];
  defaultVenue: string;
}

function ManualMatchModal({
  isOpen,
  onClose,
  onCreateMatch,
  teams,
  defaultVenue,
}: ManualMatchModalProps) {
  const toast = useToast();
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [stage, setStage] = useState<MatchStage>('GROUP');
  const [groupName, setGroupName] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [venue, setVenue] = useState(defaultVenue);
  const [hasExtraTime, setHasExtraTime] = useState(false);
  const [extraTimeDuration, setExtraTimeDuration] = useState(30);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!matchDate || !matchTime) {
      toast.warning('Please select both date and time', 'Missing Information');
      return;
    }

    if (homeTeamId === awayTeamId) {
      toast.warning('Home and away teams must be different', 'Invalid Selection');
      return;
    }

    const dateTime = new Date(`${matchDate}T${matchTime}`);

    onCreateMatch({
      homeTeamId,
      awayTeamId,
      stage,
      groupName: stage === 'GROUP' ? groupName : undefined,
      matchDate: dateTime,
      venue,
      extraTimeDuration: hasExtraTime ? extraTimeDuration : undefined,
    });

    // Reset form
    setHomeTeamId('');
    setAwayTeamId('');
    setStage('GROUP');
    setGroupName('');
    setMatchDate('');
    setMatchTime('');
    setVenue(defaultVenue);
    setHasExtraTime(false);

    onClose();
  };

  const isKnockoutStage = ['QF', 'SF', 'FINAL', 'R16', 'R32'].includes(stage);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Add Match Manually</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Teams Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Home Team *
                </label>
                <select
                  value={homeTeamId}
                  onChange={(e) => setHomeTeamId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                  <option value="TBD">TBD (To Be Determined)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Away Team *
                </label>
                <select
                  value={awayTeamId}
                  onChange={(e) => setAwayTeamId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                  <option value="TBD">TBD (To Be Determined)</option>
                </select>
              </div>
            </div>

            {/* Match Stage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Match Stage *
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as MatchStage)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="GROUP">Group Stage</option>
                <option value="R32">Round of 32</option>
                <option value="R16">Round of 16</option>
                <option value="QF">Quarter Final</option>
                <option value="SF">Semi Final</option>
                <option value="FINAL">Final</option>
              </select>
            </div>

            {/* Group Name (only for GROUP stage) */}
            {stage === 'GROUP' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g., Group A, Pool 1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional: Leave empty for unnamed groups
                </p>
              </div>
            )}

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Match Date *
                </label>
                <input
                  type="date"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Match Time *
                </label>
                <input
                  type="time"
                  value={matchTime}
                  onChange={(e) => setMatchTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Venue */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Venue *
              </label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Extra Time (only for knockout stages) */}
            {isKnockoutStage && (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="hasExtraTime"
                    checked={hasExtraTime}
                    onChange={(e) => setHasExtraTime(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="hasExtraTime" className="ml-2 text-sm font-medium text-gray-700">
                    Include Extra Time
                  </label>
                </div>

                {hasExtraTime && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Extra Time Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="60"
                      step="5"
                      value={extraTimeDuration}
                      onChange={(e) => setExtraTimeDuration(parseInt(e.target.value) || 30)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Typical: 30 minutes (2x15 min halves)
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Add Match
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ManualMatchModal;
