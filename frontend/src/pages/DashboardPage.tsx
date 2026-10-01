import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { Poll, User } from '../types/poll';
import { 
  LayoutDashboard, 
  PlusCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  XCircle, 
  Trash2, 
  BarChart3, 
  Radio, 
  Clock, 
  AlertTriangle,
  Lock,
  Vote,
  Sparkles,
  Tv
} from 'lucide-react';

interface DashboardPageProps {
  currentUser: User | null;
  onNavigateCreate: () => void;
  onNavigatePoll: (pollId: string, mode?: 'vote' | 'results') => void;
  onNavigatePresenter?: (pollId: string) => void;
  onOpenAuth: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  currentUser,
  onNavigateCreate,
  onNavigatePoll,
  onNavigatePresenter,
  onOpenAuth,
}) => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollVotesMap, setPollVotesMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchMyPolls = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await ApiService.getMyPolls();
      if (res.success && res.data) {
        setPolls(res.data);

        // Fetch vote counts for each poll
        const counts: Record<string, number> = {};
        await Promise.all(
          res.data.map(async (p) => {
            const resultsRes = await ApiService.getPollResults(p.pollId);
            if (resultsRes.success && resultsRes.data) {
              counts[p.pollId] = resultsRes.data.totalVotes;
            }
          })
        );
        setPollVotesMap(counts);
      }
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPolls();
  }, [currentUser]);

  const handleCopyLink = (pollId: string) => {
    const url = `${window.location.origin}/poll/${pollId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(pollId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleClosePoll = async (pollId: string) => {
    if (!confirm('Are you sure you want to close this poll? No further votes will be permitted.')) {
      return;
    }
    setActionLoadingId(pollId);
    try {
      const res = await ApiService.closePoll(pollId);
      if (res.success) {
        setPolls(polls.map(p => p.pollId === pollId ? { ...p, status: 'closed' } : p));
      }
    } catch {
      alert('Failed to close poll');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!confirm('Are you sure you want to permanently delete this poll?')) {
      return;
    }
    setActionLoadingId(pollId);
    try {
      const res = await ApiService.deletePoll(pollId);
      if (res.success) {
        setPolls(polls.filter(p => p.pollId !== pollId));
      }
    } catch {
      alert('Failed to delete poll');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Creator Dashboard Locked</h2>
        <p className="text-slate-400 text-sm mt-2">
          Please log in to manage your created polls and view live voting statistics.
        </p>
        <button
          onClick={onOpenAuth}
          className="mt-6 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow transition-all"
        >
          Sign In
        </button>
      </div>
    );
  }

  const totalPolls = polls.length;
  const activePolls = polls.filter(p => p.status === 'active').length;
  const totalVotesAcrossPolls = Object.values(pollVotesMap).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
            <span>Creator Dashboard</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Logged in as <strong className="text-white">{currentUser.name}</strong> ({currentUser.email})
          </p>
        </div>

        <button
          onClick={onNavigateCreate}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:opacity-95 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 transition-all flex items-center space-x-2 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Poll</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Polls Created</div>
          <div className="text-3xl font-extrabold text-white mt-1 font-mono">{totalPolls}</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Active Live Polls</span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 mt-1 font-mono">{activePolls}</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Total Live Votes Gathered</div>
          <div className="text-3xl font-extrabold text-indigo-400 mt-1 font-mono">{totalVotesAcrossPolls}</div>
        </div>
      </div>

      {/* My Polls Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="font-bold text-white text-base">My Polls</div>
          <span className="text-xs text-slate-400 font-mono">{polls.length} managed</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            Loading your polls...
          </div>
        ) : polls.length === 0 ? (
          <div className="p-12 text-center">
            <Vote className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <div className="text-white font-semibold">You have not created any polls yet</div>
            <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
              Create your first live poll with custom options to share with audiences and watch real-time voting.
            </p>
            <button
              onClick={onNavigateCreate}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all inline-flex items-center space-x-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Poll</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4 sm:px-6">Poll Question</th>
                  <th className="py-3.5 px-4">Created</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Total Votes</th>
                  <th className="py-3.5 px-4">Share Link</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-sm">
                {polls.map((poll) => {
                  const isClosed = poll.status === 'closed';
                  const votes = pollVotesMap[poll.pollId] || 0;
                  const isActionBusy = actionLoadingId === poll.pollId;

                  return (
                    <tr key={poll.pollId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-4 sm:px-6 font-medium text-white max-w-xs sm:max-w-md">
                        <div className="line-clamp-2">{poll.question}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          ID: {poll.pollId} • {poll.options.length} options
                        </div>
                      </td>

                      <td className="py-4 px-4 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(poll.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        {isClosed ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Closed
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>Active</span>
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className="font-mono font-bold text-white text-base">{votes}</span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <button
                          onClick={() => handleCopyLink(poll.pollId)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center space-x-1.5 transition-colors font-mono"
                          title="Copy public link"
                        >
                          {copiedId === poll.pollId ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>{copiedId === poll.pollId ? 'Copied' : `/poll/${poll.pollId.slice(0, 8)}...`}</span>
                        </button>
                      </td>

                      <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Launch Presenter Mode */}
                          <button
                            onClick={() => onNavigatePresenter ? onNavigatePresenter(poll.pollId) : onNavigatePoll(poll.pollId, 'vote')}
                            className="p-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white transition-colors border border-indigo-500/30"
                            title="Launch Full-Screen Presenter Stage Mode"
                          >
                            <Tv className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onNavigatePoll(poll.pollId, 'results')}
                            className="p-2 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 transition-colors"
                            title="View Live Results"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onNavigatePoll(poll.pollId, 'vote')}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Open Public Voting Page"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>

                          {!isClosed && (
                            <button
                              disabled={isActionBusy}
                              onClick={() => handleClosePoll(poll.pollId)}
                              className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 transition-colors"
                              title="Close Poll (Disallow further voting)"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            disabled={isActionBusy}
                            onClick={() => handleDeletePoll(poll.pollId)}
                            className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
                            title="Delete Poll"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
