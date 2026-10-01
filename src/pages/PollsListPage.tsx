import React, { useState, useEffect } from 'react';
import { ApiService, realTimeBroadcast } from '../services/api';
import { Poll } from '../types/poll';
import { 
  Vote, 
  PlusCircle, 
  ExternalLink, 
  BarChart2, 
  Users, 
  Radio, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Terminal,
  Layers,
  SplitSquareVertical,
  Tv
} from 'lucide-react';

interface PollsListPageProps {
  onNavigatePoll: (pollId: string, mode?: 'vote' | 'results') => void;
  onNavigatePresenter?: (pollId: string) => void;
  onNavigateCreate: () => void;
  onOpenMultiClient: () => void;
  onOpenArchitecture: () => void;
}

export const PollsListPage: React.FC<PollsListPageProps> = ({
  onNavigatePoll,
  onNavigatePresenter,
  onNavigateCreate,
  onOpenMultiClient,
  onOpenArchitecture,
}) => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollVotesMap, setPollVotesMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  const loadPolls = async () => {
    try {
      const res = await ApiService.getPolls();
      if (res.success && res.data) {
        setPolls(res.data);
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
      setRecentEvents(ApiService.getRecentRedisEvents().slice(0, 4));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolls();

    if (!realTimeBroadcast) return;
    const handleLiveMsg = (e: MessageEvent) => {
      if (e.data?.type === 'VOTE_UPDATE') {
        const { event, results } = e.data;
        if (event && results) {
          setPollVotesMap(prev => ({
            ...prev,
            [event.pollId]: results.totalVotes,
          }));
          setRecentEvents(ApiService.getRecentRedisEvents().slice(0, 4));
        }
      }
    };

    realTimeBroadcast?.addEventListener('message', handleLiveMsg);
    return () => realTimeBroadcast?.removeEventListener('message', handleLiveMsg);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-4">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Zero-Refresh Live Polling with Go, Gin, Redis & MongoDB</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
          Real-Time Polling Engine with <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-indigo-400 to-violet-400">Atomic Redis Pub/Sub</span>
        </h1>
        <p className="mt-4 text-base text-slate-400 leading-relaxed">
          Create polls, distribute public shareable links, and cast votes that stream live across all connected browsers using WebSockets and atomic Redis <code className="text-emerald-300 font-mono text-xs">HINCRBY</code> operations.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onNavigateCreate}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:opacity-95 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 transition-all flex items-center space-x-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create a Poll</span>
          </button>

          <button
            onClick={onOpenMultiClient}
            className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-400 font-semibold text-sm transition-all flex items-center space-x-2 shadow-lg shadow-emerald-500/10"
          >
            <SplitSquareVertical className="w-4 h-4" />
            <span>Launch Multi-Browser Test Studio</span>
          </button>

          <button
            onClick={onOpenArchitecture}
            className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-semibold text-sm transition-all flex items-center space-x-2"
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Architecture & Source Code</span>
          </button>
        </div>
      </div>

      {/* Live Redis Pub/Sub Stream Ticker */}
      {recentEvents.length > 0 && (
        <div className="mb-10 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
            <div className="flex items-center space-x-2 text-indigo-400 font-bold uppercase tracking-wider">
              <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>Live Redis Pub/Sub Event Stream</span>
            </div>
            <span className="text-[11px] text-slate-500">Atomic HINCRBY & PUBLISH</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
            {recentEvents.map((evt, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                <span className="text-emerald-400 truncate max-w-[220px]">{evt.redisCommand || `HINCRBY ${evt.channel}`}</span>
                <span className="text-slate-500 text-[10px] ml-2 flex-shrink-0">
                  {new Date(evt.payload?.timestamp || Date.now()).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Poll Cards Grid */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Active Public Polls</h2>
          <p className="text-xs text-slate-400 mt-0.5">Click any poll to vote or observe real-time results</p>
        </div>
        <span className="text-xs text-slate-400 font-mono">{polls.length} available</span>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          Loading live polls...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {polls.map((poll) => {
            const votes = pollVotesMap[poll.pollId] || 0;
            const isClosed = poll.status === 'closed';

            return (
              <div
                key={poll.pollId}
                className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3 text-xs">
                    <span className="font-mono text-slate-500">{poll.pollId.slice(0, 14)}</span>
                    {isClosed ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        Closed
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>LIVE</span>
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-white text-base leading-snug group-hover:text-indigo-300 transition-colors">
                    {poll.question}
                  </h3>

                  <div className="mt-4 space-y-1.5">
                    {poll.options.slice(0, 4).map((opt) => (
                      <div
                        key={opt.optionId}
                        className="px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 flex items-center justify-between"
                      >
                        <span className="truncate">{opt.text}</span>
                      </div>
                    ))}
                    {poll.options.length > 4 && (
                      <div className="text-[11px] text-slate-500 text-center font-mono pt-0.5">
                        +{poll.options.length - 4} more options
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-mono">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span><strong className="text-white font-bold">{votes}</strong> votes</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onNavigatePresenter ? onNavigatePresenter(poll.pollId) : onNavigatePoll(poll.pollId, 'vote')}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 hover:text-white text-xs font-semibold transition-colors flex items-center space-x-1 border border-indigo-500/20"
                      title="Launch Stage Presenter Mode for projectors"
                    >
                      <Tv className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Stage</span>
                    </button>
                    <button
                      onClick={() => onNavigatePoll(poll.pollId, 'vote')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 hover:text-emerald-300 text-xs font-semibold transition-colors flex items-center space-x-1"
                    >
                      <Vote className="w-3.5 h-3.5" />
                      <span>Vote</span>
                    </button>
                    <button
                      onClick={() => onNavigatePoll(poll.pollId, 'results')}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 text-xs font-semibold transition-colors flex items-center space-x-1"
                    >
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span>Live Results</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
