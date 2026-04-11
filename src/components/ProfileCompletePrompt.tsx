import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProfileCompletePromptProps {
  onClose: () => void;
}

function ProfileCompletePrompt({ onClose }: ProfileCompletePromptProps) {
  const { userProfile } = useAuth();

  const isProfileIncomplete = !userProfile?.name || !userProfile?.position;

  if (!isProfileIncomplete) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl border border-white/10 shadow-2xl p-6 md:p-8 max-w-md w-full animate-scale-up">
        {/* Icon */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">👤</div>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-2">Complete Your Profile</h2>
          <p className="text-slate-400 text-sm md:text-base">
            Help your teammates recognize you by completing your profile
          </p>
        </div>

        {/* Missing fields */}
        <div className="bg-slate-900/50 rounded-2xl p-4 mb-6 border border-white/10">
          <p className="text-slate-300 text-sm mb-3">Missing information:</p>
          <div className="space-y-2">
            {!userProfile?.name && (
              <div className="flex items-center gap-2 text-yellow-400 text-sm">
                <span>⚠️</span>
                <span>Your name</span>
              </div>
            )}
            {!userProfile?.position && (
              <div className="flex items-center gap-2 text-yellow-400 text-sm">
                <span>⚠️</span>
                <span>Playing position</span>
              </div>
            )}
            {!userProfile?.jerseyNumber && (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <span>ℹ️</span>
                <span>Jersey number (optional)</span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <Link
            to="/profile"
            className="block w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-bold text-center hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/20"
          >
            Complete Profile Now
          </Link>
          <button
            onClick={onClose}
            className="w-full py-3 text-slate-400 hover:text-white text-sm transition-colors"
          >
            Remind me later
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfileCompletePrompt;
