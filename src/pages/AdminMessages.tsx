import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import userService from '../services/user.service';
import messageService from '../services/message.service';
import { User, SupportMessage, MessageStatus } from '../types';
import Header from '../components/Header';
import { handleError } from '../utils/errorHandler';

function AdminMessages() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [filterStatus, setFilterStatus] = useState<MessageStatus | 'ALL'>('ALL');
  const [selectedMessage, setSelectedMessage] = useState<SupportMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    loadUserAndMessages();
  }, [currentUser, navigate]);

  const loadUserAndMessages = async () => {
    try {
      setLoading(true);
      const userData = await userService.getUserById(currentUser!.uid);
      setUser(userData);

      // Check if user is admin
      if (!userData?.roles.includes('admin')) {
        toast.error('You do not have permission to access this page', 'Access Denied');
        navigate('/dashboard');
        return;
      }

      // Load all messages
      const allMessages = await messageService.getAllMessages();
      setMessages(allMessages);
    } catch (error) {
      toast.error(handleError(error, 'Load Messages'), 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (messageId: string) => {
    if (!replyText.trim()) {
      toast.warning('Please enter a reply message', 'Reply Required');
      return;
    }

    try {
      setSubmitting(true);
      await messageService.addReply(
        messageId,
        currentUser!.uid,
        user!.name,
        replyText.trim()
      );

      toast.success('Reply sent successfully', 'Success!');
      setReplyText('');

      // Reload messages
      await loadUserAndMessages();

      // Update selected message
      const updatedMessage = await messageService.getMessageById(messageId);
      setSelectedMessage(updatedMessage);
    } catch (error) {
      toast.error(handleError(error, 'Send Reply'), 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (messageId: string, status: MessageStatus) => {
    try {
      await messageService.updateMessageStatus(messageId, status);
      toast.success(`Message marked as ${status.toLowerCase()}`, 'Success!');

      // Reload messages
      await loadUserAndMessages();

      // Update selected message
      if (selectedMessage?.id === messageId) {
        const updatedMessage = await messageService.getMessageById(messageId);
        setSelectedMessage(updatedMessage);
      }
    } catch (error) {
      toast.error(handleError(error, 'Update Status'), 'Error');
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

  const filteredMessages = filterStatus === 'ALL'
    ? messages
    : messages.filter(m => m.status === filterStatus);

  const stats = {
    total: messages.length,
    open: messages.filter(m => m.status === 'OPEN').length,
    replied: messages.filter(m => m.status === 'REPLIED').length,
    closed: messages.filter(m => m.status === 'CLOSED').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Header />

      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-2">🛡️ Admin Messages</h1>
          <p className="text-slate-400 text-base md:text-lg">
            Manage and respond to user support messages
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 text-center">
            <div className="text-3xl font-black text-white mb-1">{stats.total}</div>
            <div className="text-sm text-slate-400">Total</div>
          </div>
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl rounded-2xl border border-blue-500/20 p-4 text-center">
            <div className="text-3xl font-black text-blue-400 mb-1">{stats.open}</div>
            <div className="text-sm text-slate-400">Open</div>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl rounded-2xl border border-green-500/20 p-4 text-center">
            <div className="text-3xl font-black text-green-400 mb-1">{stats.replied}</div>
            <div className="text-sm text-slate-400">Replied</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 text-center">
            <div className="text-3xl font-black text-slate-400 mb-1">{stats.closed}</div>
            <div className="text-sm text-slate-400">Closed</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {(['ALL', 'OPEN', 'REPLIED', 'CLOSED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                filterStatus === status
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Messages List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Messages Column */}
          <div className="space-y-4">
            {filteredMessages.length === 0 ? (
              <div className="bg-slate-800/30 backdrop-blur-xl rounded-3xl border border-white/10 p-8 text-center">
                <div className="text-6xl mb-4 opacity-30">📭</div>
                <p className="text-slate-400">No messages found</p>
              </div>
            ) : (
              filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => setSelectedMessage(msg)}
                  className={`bg-slate-800/50 backdrop-blur-xl rounded-2xl border p-4 md:p-6 cursor-pointer transition-all hover:bg-slate-800/70 ${
                    selectedMessage?.id === msg.id
                      ? 'border-green-500/50 ring-2 ring-green-500/20'
                      : 'border-white/10'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">{msg.title}</h3>
                      <p className="text-xs text-slate-400 mb-2">
                        From: {msg.userName} ({msg.userPhone})
                      </p>
                      <p className="text-xs text-slate-500">{formatDate(msg.createdAt)}</p>
                    </div>
                    {getStatusBadge(msg.status)}
                  </div>
                  <p className="text-slate-300 text-sm line-clamp-2">{msg.message}</p>
                  {msg.replies && msg.replies.length > 0 && (
                    <div className="mt-3 text-xs text-green-400">
                      {msg.replies.length} {msg.replies.length === 1 ? 'reply' : 'replies'}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Message Detail Column */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            {selectedMessage ? (
              <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 p-6 md:p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-white mb-2">{selectedMessage.title}</h2>
                    <p className="text-sm text-slate-400 mb-1">
                      From: <span className="text-white font-bold">{selectedMessage.userName}</span>
                    </p>
                    <p className="text-sm text-slate-400 mb-1">
                      Phone: <span className="text-white">{selectedMessage.userPhone}</span>
                    </p>
                    <p className="text-xs text-slate-500">{formatDate(selectedMessage.createdAt)}</p>
                  </div>
                  {getStatusBadge(selectedMessage.status)}
                </div>

                {/* Original Message */}
                <div className="mb-6 p-4 bg-slate-900/50 rounded-xl border border-white/10">
                  <p className="text-slate-300 whitespace-pre-wrap">{selectedMessage.message}</p>
                </div>

                {/* Status Actions */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-slate-400 mb-3">Update Status:</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleUpdateStatus(selectedMessage.id, 'OPEN')}
                      disabled={selectedMessage.status === 'OPEN'}
                      className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Mark as Open
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedMessage.id, 'CLOSED')}
                      disabled={selectedMessage.status === 'CLOSED'}
                      className="px-4 py-2 bg-slate-700 text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Mark as Closed
                    </button>
                  </div>
                </div>

                {/* Replies */}
                {selectedMessage.replies && selectedMessage.replies.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-slate-400 mb-3">Previous Replies:</h3>
                    <div className="space-y-3">
                      {selectedMessage.replies.map((reply) => (
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

                {/* Reply Form */}
                <div>
                  <h3 className="text-sm font-bold text-slate-400 mb-3">Send Reply:</h3>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none mb-3"
                    placeholder="Type your reply here..."
                    disabled={submitting}
                  />
                  <button
                    onClick={() => handleReply(selectedMessage.id)}
                    disabled={submitting || !replyText.trim()}
                    className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Sending...' : '📤 Send Reply'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/30 backdrop-blur-xl rounded-3xl border border-white/10 p-12 text-center">
                <div className="text-6xl mb-4 opacity-30">👈</div>
                <p className="text-slate-400">Select a message to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminMessages;
