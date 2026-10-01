import React, { useState, useEffect } from 'react';
import { ApiService, realTimeBroadcast } from '../services/api';
import { Poll, PollResults, OptionResult } from '../types/poll';
import { getVoterId, resetVoterId } from '../utils/voter';
import { QRCodeCard } from '../components/QRCodeCard';
import { 
  Radio, 
  CheckCircle2, 
  Share2, 
  Copy, 
  ExternalLink, 
  Activity, 
  Users, 
  RefreshCw, 
  AlertCircle, 
  Check, 
  Sparkles,
  Trophy,
  Zap,
  Info,
  Layers,
  Tv
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PollVotePageProps {
  pollId: string;
  initialMode?: 'vote' | 'results';
  onNavigateHome: () => void;
  onNavigatePresenter?: (pollId: string) => void;
  onOpenArchitecture?: () => void;
}

export const PollVotePage: React.FC<PollVotePageProps> = ({
  pollId,
  initialMode = 'vote',
  onNavigateHome,
  onNavigatePresenter,
  onOpenArchitecture,
}) => {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [results, setResults] = useState<PollResults | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [voterId, setVoterId] = useState<string>(getVoterId());
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [voting, setVoting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState<boolean>(true);
  const [recentLiveVoteEvent, setRecentLiveVoteEvent] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'vote' | 'results'>(initialMode);

  // Load initial poll data and results from REST API
  const fetchPollData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [pollRes, resultsRes] = await Promise.all([
        ApiService.getPollById(pollId),
        ApiService.getPollResults(pollId),
      ]);

      if (!pollRes.success || !pollRes.data) {
        setError(pollRes.message || 'Poll not found.');
        return;
      }

      setPoll(pollRes.data);
      if (resultsRes.success && resultsRes.data) {
        setResults(resultsRes.data);
      }

      const voted = ApiService.hasUserVoted(pollId, voterId);
      setHasVoted(voted);
      if (voted || initialMode === 'results') {
        setViewMode('results');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch poll');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPollData();
  }, [pollId, voterId]);

  // Subscribe to real-time events (WebSocket / Redis Pub/Sub broadcast)
  useEffect(() => {
    if (!realTimeBroadcast) return;

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'VOTE_UPDATE' && data.event && data.event.pollId === pollId) {
        // Real-time update received from Redis Pub/Sub
        setResults(data.results);
        setRecentLiveVoteEvent(`Vote recorded for ${data.event.optionId} • New total: ${data.event.totalVotes}`);

        // Clear indicator after 3 seconds
        setTimeout(() => {
          setRecentLiveVoteEvent(null);
        }, 3000);
      } else if (data.type === 'POLL_STATUS_CHANGE' && data.pollId === pollId) {
        setPoll(prev => prev ? { ...prev, status: data.status } : null);
        setResults(prev => prev ? { ...prev, status: data.status } : null);
      }
    };

    realTimeBroadcast.addEventListener('message', handleMessage);

    // Keep WebSocket live status
    setWsConnected(true);

    return () => {
      realTimeBroadcast?.removeEventListener('message', handleMessage);
    };
  }, [pollId]);

  const handleVoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOptionId) {
      setError('Please select an option to vote.');
      return;
    }
    if (!poll || poll.status === 'closed') {
      setError('This poll is closed.');
      return;
    }

    setVoting(true);
    setError(null);

    try {
      const res = await ApiService.vote(pollId, selectedOptionId, voterId);
      if (res.success && res.data) {
        setResults(res.data);
        setHasVoted(true);
        setViewMode('results');
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
          });
        } catch {
          // ignore confetti errors
        }
      } else {
        setError(res.message || 'Voting failed');
      }
    } catch (err: any) {
      setError(err?.message || 'Server voting error');
    } finally {
      setVoting(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/poll/${pollId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleResetVoterSession = () => {
    const newId = resetVoterId();
    setVoterId(newId);
    setHasVoted(false);
    setSelectedOptionId(null);
    setViewMode('vote');
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <div className="text-slate-400 text-sm font-medium">Fetching poll and Redis live state...</div>
      </div>
    );
  }

  if (error && !poll) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Poll Not Found (404)</h2>
        <p className="text-slate-400 text-sm mt-2">{error}</p>
        <button
          onClick={onNavigateHome}
          className="mt-6 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition-colors"
        >
          Return to Polls
        </button>
      </div>
    );
  }

  const isClosed = poll?.status === 'closed';
  const totalVotes = results?.totalVotes || 0;

  // Find leading option
  let maxVotes = -1;
  results?.results.forEach(r => {
    if (r.count > maxVotes) maxVotes = r.count;
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Top Banner / Live Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center space-x-2">
          {/* Pulsing LIVE WebSocket Badge as requested in Section 16 */}
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse-live"></span>
            <span>● LIVE</span>
          </div>

          <span className="text-xs text-slate-400 font-mono">
            ws://.../ws/polls/{pollId.slice(0, 10)}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Toggle between Vote and Live Results view */}
          <div className="p-0.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center text-xs">
            <button
              onClick={() => setViewMode('vote')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === 'vote'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Vote
            </button>
            <button
              onClick={() => setViewMode('results')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
                viewMode === 'results'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Live Results</span>
            </button>
          </div>

          {/* Presenter Mode button */}
          <button
            onClick={() => onNavigatePresenter ? onNavigatePresenter(pollId) : window.location.assign(`/poll/${pollId}/present`)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-1.5 active:scale-95"
            title="Open stage presenter mode for projectors and live audiences"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Presenter Mode</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors flex items-center space-x-1.5 text-xs font-semibold"
            title="Copy Shareable Public Link"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Real-time incoming event toast badge */}
      {recentLiveVoteEvent && (
        <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-emerald-400 animate-bounce" />
            <span>Redis Pub/Sub Event: {recentLiveVoteEvent}</span>
          </div>
          <span className="text-[10px] text-emerald-500 uppercase tracking-wider font-bold">Real-time sync</span>
        </div>
      )}

      {/* Main Poll Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Status watermark / glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Question Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-2">
            <span>Public Poll</span>
            {isClosed && (
              <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400">
                Closed
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
            {poll?.question}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-3 font-mono">
            <div className="flex items-center space-x-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Total votes: <strong className="text-white font-bold">{totalVotes}</strong></span>
            </div>
            {poll?.creatorName && (
              <div>Created by: <span className="text-slate-300">{poll.creatorName}</span></div>
            )}
            <div>Status: <span className={isClosed ? 'text-rose-400' : 'text-emerald-400'}>{isClosed ? 'Closed' : 'Active'}</span></div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* MODE 1: VOTING INTERFACE */}
        {viewMode === 'vote' && (
          <form onSubmit={handleVoteSubmit} className="space-y-4">
            {hasVoted && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>You have already cast a vote from this voter session. Duplicate votes are prevented.</span>
                </div>
                <button
                  type="button"
                  onClick={handleResetVoterSession}
                  className="underline hover:text-white font-semibold flex-shrink-0 ml-2"
                >
                  Test Another Session
                </button>
              </div>
            )}

            <div className="space-y-2.5">
              {poll?.options.map((opt) => {
                const isSelected = selectedOptionId === opt.optionId;
                return (
                  <label
                    key={opt.optionId}
                    className={`block relative p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500 ring-2 ring-indigo-500/30 text-white'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-200 hover:bg-slate-950'
                    } ${isClosed ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected ? 'border-indigo-400 bg-indigo-500' : 'border-slate-700 bg-slate-900'
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                        </div>
                        <span className="text-sm sm:text-base font-medium">{opt.text}</span>
                      </div>
                      <input
                        type="radio"
                        name="poll_option"
                        value={opt.optionId}
                        disabled={isClosed}
                        checked={isSelected}
                        onChange={() => setSelectedOptionId(opt.optionId)}
                        className="sr-only"
                      />
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="submit"
                disabled={voting || isClosed || !selectedOptionId}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:opacity-95 text-white font-bold text-sm shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {voting ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Vote</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setViewMode('results')}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
              >
                View Live Results Only
              </button>
            </div>
          </form>
        )}

        {/* MODE 2: LIVE RESULTS VIEW */}
        {viewMode === 'results' && (
          <div className="space-y-4">
            <div className="space-y-3">
              {results?.results.map((opt: OptionResult) => {
                const isWinner = maxVotes > 0 && opt.count === maxVotes;
                return (
                  <div
                    key={opt.optionId}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 relative overflow-hidden"
                  >
                    {/* Background Progress Bar with Smooth Transition */}
                    <div
                      className={`absolute top-0 left-0 bottom-0 transition-all duration-700 ease-out rounded-2xl opacity-20 ${
                        isWinner ? 'bg-emerald-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${opt.percentage}%` }}
                    />

                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        {isWinner && (
                          <Trophy className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        )}
                        <span className="text-sm sm:text-base font-semibold text-white">
                          {opt.text}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-right">
                        <span className="text-xs text-slate-400 font-mono">
                          {opt.count} {opt.count === 1 ? 'vote' : 'votes'}
                        </span>
                        <span className="text-sm font-extrabold text-white font-mono min-w-[50px]">
                          {opt.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Linear progress bar fill */}
                    <div className="w-full bg-slate-800/80 h-1.5 rounded-full mt-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          isWinner ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-indigo-500 to-violet-500'
                        }`}
                        style={{ width: `${opt.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom summary bar */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Updates live via Redis Pub/Sub WebSocket stream</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleResetVoterSession}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
                  title="Generates a new voter session ID so you can vote again from this device"
                >
                  Cast Another Vote (New Session)
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-medium transition-colors flex items-center space-x-1"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Poll</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feature 1: Scan to Vote Section */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
            <div className="text-center sm:text-left">
              <div className="inline-flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
                <span>Scan to Vote</span>
              </div>
              <h4 className="text-base font-bold text-white">Join Poll from your Phone</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Point your smartphone camera at the QR code to open the public voting page instantly. Download the code for slides or share with attendees.
              </p>
            </div>

            <div className="flex-shrink-0">
              <QRCodeCard
                pollId={pollId}
                question={poll?.question}
                size={160}
                compact={false}
                theme="dark"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Technical Architecture Info Box */}
      <div className="mt-8 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-indigo-300 font-semibold uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            <span>Real-Time Engine Details (Go + Redis)</span>
          </div>
          {onOpenArchitecture && (
            <button
              onClick={onOpenArchitecture}
              className="text-indigo-400 hover:underline font-semibold"
            >
              Inspect Go Code & Redis Flow →
            </button>
          )}
        </div>
        <p className="leading-relaxed">
          When a vote is submitted to <code className="text-amber-300">POST /api/polls/:id/vote</code>, the Go/Gin backend validates the payload, executes an atomic <code className="text-emerald-300">HINCRBY poll:{pollId}:votes [optionId] 1</code>, and issues <code className="text-indigo-300">PUBLISH poll:{pollId}:updates</code>. Connected WebSocket clients receive the event instantaneously without any database read contention or polling.
        </p>
      </div>
    </div>
  );
};
