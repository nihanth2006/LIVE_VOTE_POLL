import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { Poll, PollResults, OptionResult } from '../types/poll';
import { usePollWebSocket } from '../hooks/usePollWebSocket';
import { useFullscreen } from '../hooks/useFullscreen';
import { QRCodeCard } from '../components/QRCodeCard';
import { 
  Maximize2, 
  Minimize2, 
  ArrowLeft, 
  Trophy, 
  Users, 
  Radio, 
  AlertCircle,
  Sparkles,
  Wifi,
  WifiOff
} from 'lucide-react';

interface PresenterModePageProps {
  pollId: string;
  onExitPresenter: () => void;
}

export const PresenterModePage: React.FC<PresenterModePageProps> = ({
  pollId,
  onExitPresenter,
}) => {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [results, setResults] = useState<PollResults | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [flashUpdate, setFlashUpdate] = useState<boolean>(false);

  const { isFullscreen, toggleFullscreen, isSupported: isFullscreenSupported } = useFullscreen();

  // Load initial poll data and snapshot results
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [pollRes, resultsRes] = await Promise.all([
          ApiService.getPollById(pollId),
          ApiService.getPollResults(pollId),
        ]);

        if (!isMounted) return;

        if (!pollRes.success || !pollRes.data) {
          setError(pollRes.message || 'Poll not found.');
          return;
        }

        setPoll(pollRes.data);
        if (resultsRes.success && resultsRes.data) {
          setResults(resultsRes.data);
        }
      } catch (err: any) {
        if (isMounted) setError(err?.message || 'Failed to load poll for presentation.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [pollId]);

  // Hook into real-time Go WebSocket / Redis Pub/Sub stream
  const { isConnected, isReconnecting } = usePollWebSocket(
    pollId,
    (updatedResults) => {
      setResults(updatedResults);
      setFlashUpdate(true);
      setTimeout(() => setFlashUpdate(false), 900);
    },
    (status) => {
      const typedStatus = (status === 'closed' ? 'closed' : 'active') as 'active' | 'closed';
      setPoll(prev => prev ? { ...prev, status: typedStatus } : null);
      setResults(prev => prev ? { ...prev, status: typedStatus } : null);
    }
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-bold tracking-tight">Initializing Stage Presenter Mode...</h2>
        <p className="text-slate-400 text-sm mt-2 font-mono">Connecting to real-time WebSocket hub</p>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white">Poll Not Found</h2>
        <p className="text-slate-400 text-sm mt-2 max-w-md">{error || 'This poll could not be loaded.'}</p>
        <button
          onClick={onExitPresenter}
          className="mt-6 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Poll</span>
        </button>
      </div>
    );
  }

  const isClosed = poll.status === 'closed';
  const totalVotes = results?.totalVotes || 0;

  // Calculate top/winning option
  let maxVotes = -1;
  results?.results.forEach(r => {
    if (r.count > maxVotes) maxVotes = r.count;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      {/* Background ambient lighting for stage contrast */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Top Stage Bar: Minimal presenter controls (Exit, Fullscreen, Live Indicators) */}
      <header className="relative z-20 px-6 sm:px-10 py-5 flex items-center justify-between border-b border-slate-900 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center space-x-4">
          {/* Back to normal voting page button */}
          <button
            onClick={onExitPresenter}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold transition-colors flex items-center space-x-2"
            title="Return to standard poll view"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit Presenter</span>
          </button>

          {/* Status Badge */}
          {isClosed ? (
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold tracking-wider uppercase">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
              <span>⚫ Poll Closed</span>
            </div>
          ) : (
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-extrabold tracking-wider uppercase animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
              <span>🔴 LIVE</span>
            </div>
          )}
        </div>

        {/* Right side: Real-time connection indicator + Fullscreen toggle */}
        <div className="flex items-center space-x-3">
          {/* WebSocket stream status */}
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-emerald-400 font-semibold">Live WebSocket</span>
              </>
            ) : isReconnecting ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="text-amber-300 font-semibold">Reconnecting...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-400 font-semibold">Offline</span>
              </>
            )}
          </div>

          {/* Fullscreen Button */}
          {isFullscreenSupported && (
            <button
              onClick={toggleFullscreen}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shadow-lg shadow-indigo-600/30 active:scale-95"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Enter Fullscreen</span>
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Main Stage Grid: Large typography and high-contrast presentation */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 sm:px-10 py-8 lg:py-12 flex flex-col justify-center">
        {/* Stage Header: Question */}
        <div className="mb-8 lg:mb-12 text-center lg:text-left">
          <div className="inline-flex items-center space-x-2 text-indigo-400 text-xs sm:text-sm font-bold uppercase tracking-widest mb-3">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Audience Live Poll</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight max-w-4xl">
            {poll.question}
          </h1>

          <div className="mt-4 flex flex-wrap items-center justify-center lg:justify-start gap-5 text-sm sm:text-base text-slate-400 font-mono">
            <div className="flex items-center space-x-2 bg-slate-900/90 px-4 py-1.5 rounded-full border border-slate-800">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>
                Total Votes: <strong className={`font-black text-white transition-colors duration-300 ${flashUpdate ? 'text-emerald-400 scale-110' : ''}`}>{totalVotes}</strong>
              </span>
            </div>

            {isClosed ? (
              <span className="text-slate-400 font-bold bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                Final Results
              </span>
            ) : (
              <span className="text-emerald-400 font-bold flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Active & Accepting Votes</span>
              </span>
            )}
          </div>
        </div>

        {/* Content Layout: Results on Left/Center, Big QR Code on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Results List (8 columns on large screens) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            {results?.results.map((opt: OptionResult) => {
              const isWinner = maxVotes > 0 && opt.count === maxVotes;
              return (
                <div
                  key={opt.optionId}
                  className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border transition-all duration-500 relative overflow-hidden ${
                    isWinner
                      ? 'bg-slate-900/90 border-emerald-500/40 shadow-xl shadow-emerald-950/20'
                      : 'bg-slate-900/60 border-slate-800/90'
                  }`}
                >
                  {/* High-visibility background fill with smooth animation */}
                  <div
                    className={`absolute top-0 left-0 bottom-0 transition-all duration-700 ease-out rounded-2xl sm:rounded-3xl ${
                      isWinner
                        ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/25'
                        : 'bg-gradient-to-r from-indigo-500/15 to-violet-500/20'
                    }`}
                    style={{ width: `${opt.percentage}%` }}
                  />

                  {/* Foreground Content */}
                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      {isWinner && (
                        <span className="p-1 rounded-lg bg-amber-400/20 text-amber-400 flex-shrink-0">
                          <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
                        </span>
                      )}
                      <span className="text-lg sm:text-2xl font-bold text-white tracking-tight">
                        {opt.text}
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 self-end sm:self-auto">
                      <span className="text-sm sm:text-base text-slate-400 font-mono">
                        {opt.count} {opt.count === 1 ? 'vote' : 'votes'}
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-white font-mono min-w-[70px] text-right">
                        {opt.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* High contrast progress bar */}
                  <div className="w-full bg-slate-950/80 h-3 rounded-full mt-4 overflow-hidden border border-slate-800/80">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        isWinner
                          ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500'
                          : 'bg-gradient-to-r from-indigo-500 via-indigo-400 to-violet-500'
                      }`}
                      style={{ width: `${opt.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Prominent QR Code Side Column (5 columns on large screens) */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col items-center lg:items-end">
            <div className="w-full max-w-sm">
              <QRCodeCard
                pollId={pollId}
                question={poll.question}
                size={230}
                theme="stage"
              />

              <div className="mt-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-center">
                <div className="text-xs text-slate-400 uppercase tracking-widest font-bold">
                  Audience Instructions
                </div>
                <p className="text-sm text-slate-300 mt-1">
                  Point your phone's camera at the QR code to open the public voting page instantly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Stage Footer: Low-distraction status */}
      <footer className="relative z-20 px-6 sm:px-10 py-4 border-t border-slate-900 bg-slate-950 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Stage Presenter Stream • Low-latency Redis Pub/Sub & WebSockets</span>
        </div>

        <div className="font-mono text-slate-400">
          Vote at: <strong className="text-white">{typeof window !== 'undefined' ? `${window.location.origin}/poll/${pollId}` : `/poll/${pollId}`}</strong>
        </div>
      </footer>
    </div>
  );
};
