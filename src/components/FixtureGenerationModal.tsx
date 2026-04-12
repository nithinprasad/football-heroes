import { useState } from 'react';
import { FixtureScheduling } from '../utils/fixtureGenerator';

interface FixtureGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (scheduling: FixtureScheduling) => void;
  tournamentFormat: 'LEAGUE' | 'KNOCKOUT' | 'LEAGUE_KNOCKOUT';
}

function FixtureGenerationModal({
  isOpen,
  onClose,
  onGenerate,
  tournamentFormat,
}: FixtureGenerationModalProps) {
  const [daysBetweenMatches, setDaysBetweenMatches] = useState(2);
  const [restDaysBetweenRounds, setRestDaysBetweenRounds] = useState(3);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      daysBetweenMatches,
      restDaysBetweenRounds,
    });
    onClose();
  };

  const getFormatDescription = () => {
    switch (tournamentFormat) {
      case 'LEAGUE':
        return 'Round-robin format: Every team plays every other team once';
      case 'KNOCKOUT':
        return 'Single elimination: Losers are immediately eliminated';
      case 'LEAGUE_KNOCKOUT':
        return 'Group stage followed by knockout rounds';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Generate Fixtures</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Format:</strong> {tournamentFormat}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            {getFormatDescription()}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Days Between Matches */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Days Between Matches
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={daysBetweenMatches}
                onChange={(e) => setDaysBetweenMatches(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {daysBetweenMatches === 0
                  ? 'Matches scheduled on the same day (continuous tournament)'
                  : daysBetweenMatches === 1
                  ? 'Matches scheduled on consecutive days'
                  : `${daysBetweenMatches} days gap between each match`}
              </p>
            </div>

            {/* Rest Days Between Rounds (only for LEAGUE_KNOCKOUT) */}
            {tournamentFormat === 'LEAGUE_KNOCKOUT' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rest Days Between Stages
                </label>
                <input
                  type="number"
                  min="0"
                  max="14"
                  value={restDaysBetweenRounds}
                  onChange={(e) => setRestDaysBetweenRounds(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Gap between group stage and knockout rounds
                </p>
              </div>
            )}

            {/* Examples */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs font-medium text-gray-700 mb-2">Examples:</p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• <strong>0 days:</strong> Single-day tournament</li>
                <li>• <strong>1 day:</strong> Weekend tournament (Sat/Sun)</li>
                <li>• <strong>7 days:</strong> Weekly matches</li>
                <li>• <strong>14 days:</strong> Bi-weekly matches</li>
              </ul>
            </div>
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
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Generate Fixtures
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FixtureGenerationModal;
