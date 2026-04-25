import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase';
import authService from '../services/auth.service';
import { Position } from '../types';
import { handleError } from '../utils/errorHandler';

interface ProfileSetupProps {
  userId: string;
  mobileNumber: string;
  onComplete: () => void;
  onSkip?: () => void;
}

function ProfileSetup({ userId, mobileNumber, onComplete, onSkip }: ProfileSetupProps) {
  const [formData, setFormData] = useState({
    name: '',
    position: 'Forward' as Position,
    jerseyNumber: 1,
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (): Promise<string | undefined> => {
    if (!photoFile) return undefined;

    const storageRef = ref(storage, `profile-photos/${userId}`);
    await uploadBytes(storageRef, photoFile);
    const photoURL = await getDownloadURL(storageRef);
    return photoURL;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let photoURL: string | undefined;

      if (photoFile) {
        photoURL = await uploadPhoto();
      }

      await authService.updateUserProfile(userId, {
        name: formData.name,
        position: formData.position,
        jerseyNumber: formData.jerseyNumber,
        photoURL,
        mobileNumber,
        roles: ['player'],
      });

      onComplete();
    } catch (err: any) {
      setError(handleError(err, 'Profile Setup'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 md:p-10">
          <div className="text-center mb-8">
            <img
              src="/icon-192.png"
              alt="Football Heroes"
              className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 rounded-2xl shadow-2xl"
            />
            <h2 className="text-3xl md:text-4xl font-black text-white mb-2">
              {onSkip ? 'Complete Your Profile' : 'Welcome! Set Up Your Profile'}
            </h2>
            <p className="text-slate-400 text-sm md:text-base">
              {onSkip ? 'Tell us about yourself to get started' : 'Please complete your profile to continue'}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-2xl mb-6 text-sm md:text-base">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo Upload */}
            <div className="text-center">
              <label className="block text-sm font-bold text-slate-300 mb-4">
                Profile Photo (Optional)
              </label>
              <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border-4 border-white/20 shadow-lg">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-6xl">👤</span>
                  )}
                </div>
                <label className="cursor-pointer">
                  <span className="px-6 py-2 bg-white/10 backdrop-blur-sm text-white rounded-full font-medium hover:bg-white/20 transition-all border border-white/20 inline-block text-sm md:text-base">
                    Choose Photo
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-3">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your name"
                className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm md:text-base"
              />
            </div>

            {/* Position */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-3">
                Position *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(['Goalkeeper', 'Defender', 'Midfielder', 'Forward'] as Position[]).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setFormData({ ...formData, position: pos })}
                    className={`py-3 px-4 rounded-xl font-medium transition-all text-sm md:text-base ${
                      formData.position === pos
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                        : 'bg-slate-900/50 text-slate-300 border border-white/10 hover:bg-slate-900/70'
                    }`}
                  >
                    {pos === 'Goalkeeper' && '🧤'}
                    {pos === 'Defender' && '🛡️'}
                    {pos === 'Midfielder' && '⚡'}
                    {pos === 'Forward' && '⚽'}
                    <div className="mt-1 text-xs md:text-sm">{pos}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Jersey Number */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-3">
                Jersey Number *
              </label>
              <input
                type="number"
                required
                min="1"
                max="99"
                value={formData.jerseyNumber}
                onChange={(e) => setFormData({ ...formData, jerseyNumber: parseInt(e.target.value) })}
                placeholder="10"
                className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm md:text-base"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-base md:text-lg hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all shadow-xl shadow-green-500/20"
            >
              {loading ? 'Setting up...' : '🚀 Complete Setup'}
            </button>

            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="w-full text-slate-400 hover:text-white py-3 text-sm md:text-base transition-colors"
              >
                Skip for now →
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default ProfileSetup;
