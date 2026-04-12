import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import Toast, { ToastType } from '../components/Toast';

interface ToastData {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, title?: string, duration?: number) => void;
  success: (message: string, title?: string, duration?: number) => void;
  error: (message: string, title?: string, duration?: number) => void;
  warning: (message: string, title?: string, duration?: number) => void;
  info: (message: string, title?: string, duration?: number) => void;
  confirm: (message: string, title?: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    title?: string;
    resolve: (value: boolean) => void;
  } | null>(null);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, title?: string, duration = 5000) => {
      const id = Math.random().toString(36).substring(7);
      setToasts((prev) => [...prev, { id, type, message, title, duration }]);
    },
    []
  );

  const success = useCallback(
    (message: string, title?: string, duration?: number) => {
      showToast('success', message, title, duration);
    },
    [showToast]
  );

  const error = useCallback(
    (message: string, title?: string, duration?: number) => {
      showToast('error', message, title, duration);
    },
    [showToast]
  );

  const warning = useCallback(
    (message: string, title?: string, duration?: number) => {
      showToast('warning', message, title, duration);
    },
    [showToast]
  );

  const info = useCallback(
    (message: string, title?: string, duration?: number) => {
      showToast('info', message, title, duration);
    },
    [showToast]
  );

  const confirm = useCallback(
    (message: string, title?: string): Promise<boolean> => {
      return new Promise((resolve) => {
        setConfirmDialog({ message, title, resolve });
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    if (confirmDialog) {
      confirmDialog.resolve(true);
      setConfirmDialog(null);
    }
  }, [confirmDialog]);

  const handleCancel = useCallback(() => {
    if (confirmDialog) {
      confirmDialog.resolve(false);
      setConfirmDialog(null);
    }
  }, [confirmDialog]);

  const value: ToastContextType = {
    showToast,
    success,
    error,
    warning,
    info,
    confirm,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <div className="pointer-events-auto">
          {toasts.map((toast) => (
            <div key={toast.id} className="mb-2">
              <Toast {...toast} onClose={removeToast} />
            </div>
          ))}
        </div>
      </div>

      {/* Confirm Dialog */}
      {confirmDialog && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]" onClick={handleCancel} />
          <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
            <div className="bg-slate-800 rounded-2xl border border-white/10 shadow-2xl max-w-md w-full p-6 animate-scale-in">
              <h3 className="text-xl font-bold text-white mb-4">
                {confirmDialog.title || 'Confirm Action'}
              </h3>
              <p className="text-slate-300 mb-6">{confirmDialog.message}</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </ToastContext.Provider>
  );
};
