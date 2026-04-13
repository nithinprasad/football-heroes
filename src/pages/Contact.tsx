import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import userService from '../services/user.service';
import messageService from '../services/message.service';
import { User, SupportMessage } from '../types';
import Header from '../components/Header';
import { handleError } from '../utils/errorHandler';

function Contact() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [myMessages, setMyMessages] = useState<SupportMessage[]>([]);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    loadUserData();
  }, [currentUser, navigate]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const userData = await userService.getUserById(currentUser!.uid);
      setUser(userData);

      // Load user's previous messages
      const messages = await messageService.getMessagesByUser(currentUser!.uid);
      setMyMessages(messages);
    } catch (error) {
      toast.error(handleError(error, 'Load User Data'), 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.warning('Please enter a title', 'Title Required');
      return;
    }

    if (!message.trim()) {
      toast.warning('Please enter your message', 'Message Required');
      return;
    }

    if (message.trim().length < 10) {
      toast.warning('Message must be at least 10 characters', 'Message Too Short');
      return;
    }

    try {
      setSubmitting(true);
      await messageService.createMessage(
        currentUser!.uid,
        user!.name,
        user!.mobileNumber,
        {
          title: title.trim(),
          message: message.trim(),
        }
      );

      toast.success('Your message has been sent! We will get back to you soon.', 'Success!');
      setTitle('');
      setMessage('');

      // Reload messages
      await loadUserData();
    } catch (error) {
      toast.error(handleError(error, 'Send Message'), 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      OPEN: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Open' },
      REPLIED: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: 'Replied' },
      CLOSED: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30', label: 'Closed' },
    };
    const badge = badges[status] || badges.OPEN;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
        {badge.label}
      </span>
    );
  };

  const formatDate = (date: any) => {
    const d = date instanceof Date ? date : new Date(date.seconds * 1000);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Header />

      <div className="container mx-auto px-4 py-6 md:py-8 max-w-5xl">
        {/* Page Header */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">📧 Contact Support</h1>
          <p className="text-slate-400 text-base md:text-lg">
            Have a question or issue? Send us a message and we'll get back to you.
          </p>
        </div>

        {/* Contact Form */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 md:p-8 mb-8">
          <h2 className="text-2xl font-black text-white mb-6">Send us a Message</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Title / Subject *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Brief description of your issue"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Message *
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                placeholder="Describe your issue or question in detail..."
                disabled={submitting}
              />
              <p className="text-xs text-slate-500 mt-2">
                {message.length} characters (minimum 10)
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Sending...' : '📤 Send Message'}
            </button>
          </form>
        </div>

        {/* My Messages */}
        {myMessages.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 md:p-8">
            <h2 className="text-2xl font-black text-white mb-6">My Messages</h2>

            <div className="space-y-4">
              {myMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="bg-slate-900/50 rounded-2xl border border-white/10 p-4 md:p-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">{msg.title}</h3>
                      <p className="text-xs text-slate-400">{formatDate(msg.createdAt)}</p>
                    </div>
                    {getStatusBadge(msg.status)}
                  </div>

                  <p className="text-slate-300 text-sm mb-4 whitespace-pre-wrap">{msg.message}</p>

                  {/* Replies */}
                  {msg.replies && msg.replies.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <h4 className="text-sm font-bold text-green-400 mb-3">Admin Replies:</h4>
                      <div className="space-y-3">
                        {msg.replies.map((reply) => (
                          <div
                            key={reply.id}
                            className="bg-green-500/10 border border-green-500/20 rounded-xl p-4"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-bold text-green-400">
                                {reply.adminName}
                              </span>
                              <span className="text-xs text-slate-500">
                                • {formatDate(reply.createdAt)}
                              </span>
                            </div>
                            <p className="text-slate-300 text-sm whitespace-pre-wrap">
                              {reply.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Contact;
