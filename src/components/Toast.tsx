import { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const Toast = ({ id, type, title, message, duration = 5000, onClose }: ToastProps) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <span className="text-2xl">✓</span>;
      case 'error':
        return <span className="text-2xl">✕</span>;
      case 'warning':
        return <span className="text-2xl">⚠</span>;
      case 'info':
        return <span className="text-2xl">ℹ</span>;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400';
      case 'error':
        return 'bg-gradient-to-r from-red-500/20 to-rose-500/20 border-red-500/30 text-red-400';
      case 'warning':
        return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/30 text-yellow-400';
      case 'info':
        return 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400';
    }
  };

  return (
    <div
      className={`
        ${getStyles()}
        backdrop-blur-xl border rounded-lg p-4 shadow-2xl
        animate-slide-in-right
        max-w-md w-full
        flex items-start gap-3
      `}
    >
      <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        {title && <p className="font-bold text-sm mb-1">{title}</p>}
        <p className="text-sm text-white/90">{message}</p>
      </div>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 text-white/60 hover:text-white transition-colors text-xl leading-none"
      >
        ×
      </button>
    </div>
  );
};

export default Toast;
