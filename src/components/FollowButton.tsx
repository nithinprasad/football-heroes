import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import followService from '../services/follow.service';

interface FollowButtonProps {
  userId: string;
  userName: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

const FollowButton = ({ userId, userName, onFollowChange }: FollowButtonProps) => {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkFollowStatus();
  }, [currentUser, userId]);

  const checkFollowStatus = async () => {
    if (!currentUser || currentUser.uid === userId) {
      setChecking(false);
      return;
    }

    try {
      const following = await followService.isFollowing(currentUser.uid, userId);
      setIsFollowing(following);
    } catch (error) {
      console.error('Error checking follow status:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser) {
      toast.error('Please sign in to follow users');
      return;
    }

    if (currentUser.uid === userId) {
      return;
    }

    setLoading(true);
    try {
      if (isFollowing) {
        await followService.unfollowUser(currentUser.uid, userId);
        setIsFollowing(false);
        toast.success(`Unfollowed ${userName}`);
        onFollowChange?.(false);
      } else {
        await followService.followUser(currentUser.uid, userId);
        setIsFollowing(true);
        toast.success(`Following ${userName}`);
        onFollowChange?.(true);
      }
    } catch (error: any) {
      console.error('Error toggling follow:', error);
      toast.error(error.message || 'Failed to update follow status');
    } finally {
      setLoading(false);
    }
  };

  // Don't show button if viewing own profile
  if (!currentUser || currentUser.uid === userId) {
    return null;
  }

  if (checking) {
    return (
      <div className="w-24 h-10 bg-slate-700/50 animate-pulse rounded-full"></div>
    );
  }

  return (
    <button
      onClick={handleFollowToggle}
      disabled={loading}
      className={`px-6 py-2 rounded-full font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        isFollowing
          ? 'bg-slate-700/50 text-white hover:bg-slate-700 border border-white/20'
          : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/30'
      }`}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          {isFollowing ? 'Unfollowing...' : 'Following...'}
        </span>
      ) : (
        <>{isFollowing ? 'Following' : '+ Follow'}</>
      )}
    </button>
  );
};

export default FollowButton;
