import React, { useState, useEffect } from 'react';
import { ApiService, realTimeBroadcast } from '../services/api';
import { Poll, PollResults, OptionResult } from '../types/poll';
import { 
  SplitSquareVertical, 
  X, 
  Radio, 
  Zap, 
  CheckCircle2, 
  Trophy, 
  Activity, 
  RotateCcw,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface MultiClientSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MultiClientSimulator: React.FC<MultiClientSimulatorProps> = ({
  isOpen,
  onClose,
}) => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [selectedPollId, setSelectedPollId] = useState<string>('poll_lang_2026');
  const [pollResults, setPollResults] = useState<PollResults | null>(null);
  
  // Independent simulation states for 3 clients
  const [browserAVoted, setBrowserAVoted] = useState<string | null>(null);
  const [browserBVoted, setBrowserBVoted] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<any>(null);
  const [flashUpdate, setFlashUpdate] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    const load = async () => {
      const res = await ApiService.getPolls();
      if (res.success && res.data && res.data.length > 0) {
        setPolls(res.data);
        const targetId = res.data[0].pollId;
        setSelectedPollId(targetId);
        const rRes = await ApiService.getPollResults(targetId);
        if (rRes.success) setPollResults(rRes.data || null);
      }
    };
    load();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !selectedPollId) return;

    ApiService.getPollResults(selectedPollId).then(res => {
      if (res.success) setPollResults(res.data || null);
    });

    if (!realTimeBroadcast) return;
    const handleMsg = (e: MessageEvent) => {
      if (e.data?.type === 'VOTE_UPDATE' && e.data.event?.pollId === selectedPollId) {
        setPollResults(e.data.results);
        setLastEvent(e.data.event);
        setFlashUpdate(true);
        setTimeout(() => setFlashUpdate(false), 1200);
      }
    };

    realTimeBroadcast?.addEventListener('message', handleMsg);
    return () => realTimeBroadcast?.removeEventListener('message', handleMsg);
  }, [isOpen, selectedPollId]);

  if (!isOpen) return null;

  const currentPoll = polls.find(p => p.pollId === selectedPollId);

  const handleSimulatedVote = async (browserLabel: 'A' | 'B', optionId: string) => {
    const simVoterId = `sim_voter_${browserLabel}_${Date.now()}`;
    const res = await ApiService.vote(selectedPollId, optionId, simVoterId);
    if (res.success && res.data) {
      setPollResults(res.data);
      if (browserLabel === 'A') setBrowserAVoted(optionId);
      if (browserLabel === 'B') setBrowserBVoted(optionId);
      setFlashUpdate(true);
      setTimeout(() => setFlashUpdate(false), 1200);
    }
  };

  const handleResetSimulator = () => {
    setBrowserAVoted(null);
    setBrowserBVoted(null);
    setLastEvent(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <SplitSquareVertical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Section 27 Acceptance Test Studio</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                  MULTI-CLIENT VERIFIER
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulates Browser A, Browser B, and Browser C connected simultaneously to Go WebSockets & Redis Pub/Sub.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleResetSimulator}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Votes</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Redis Pub/Sub Banner */}
        <div className="px-6 py-2.5 bg-slate-950 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center space-x-2">
            <Zap className={`w-4 h-4 ${flashUpdate ? 'text-amber-400 animate-bounce' : 'text-slate-600'}`} />
            <span className="text-slate-400">Redis Channel:</span>
            <span className="text-amber-400 font-bold">poll:{selectedPollId}:updates</span>
            {lastEvent && (
              <span className="text-emerald-400 ml-2 animate-pulse">
                → Event Broadcasted to WebSocket clients! Total: {lastEvent.totalVotes}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Target Poll:</span>
            <select
              value={selectedPollId}
              onChange={(e) => setSelectedPollId(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
            >
              {polls.map(p => (
                <option key={p.pollId} value={p.pollId}>{p.question.slice(0, 45)}...</option>
              ))}
            </select>
          </div>
        </div>

        {/* 3 Simulators Split View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* WINDOW A: VOTER 1 */}
          <div className="bg-slate-950/70 border border-indigo-500/30 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                  <span className="font-bold text-sm text-white">Browser A (Voter 1)</span>
                </div>
                <span className="text-[11px] font-mono text-indigo-400">/poll/{selectedPollId.slice(0, 8)}</span>
              </div>

              <div className="text-xs font-semibold text-slate-300 mb-3 leading-snug">
                {currentPoll?.question}
              </div>

              <div className="space-y-2">
                {currentPoll?.options.map(opt => {
                  const hasSelected = browserAVoted === opt.optionId;
                  return (
                    <button
                      key={opt.optionId}
                      onClick={() => handleSimulatedVote('A', opt.optionId)}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between ${
                        hasSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="truncate">{opt.text}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-white">
                        Vote A
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Status: <strong className={browserAVoted ? 'text-indigo-400' : 'text-slate-400'}>{browserAVoted ? 'Vote Cast' : 'Selecting...'}</strong></span>
              <span className="font-mono text-emerald-400">● WS Connected</span>
            </div>
          </div>

          {/* WINDOW B: VOTER 2 */}
          <div className="bg-slate-950/70 border border-violet-500/30 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-violet-500"></div>
                  <span className="font-bold text-sm text-white">Browser B (Voter 2)</span>
                </div>
                <span className="text-[11px] font-mono text-violet-400">/poll/{selectedPollId.slice(0, 8)}</span>
              </div>

              <div className="text-xs font-semibold text-slate-300 mb-3 leading-snug">
                {currentPoll?.question}
              </div>

              <div className="space-y-2">
                {currentPoll?.options.map(opt => {
                  const hasSelected = browserBVoted === opt.optionId;
                  return (
                    <button
                      key={opt.optionId}
                      onClick={() => handleSimulatedVote('B', opt.optionId)}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between ${
                        hasSelected
                          ? 'bg-violet-600/20 border-violet-500 text-white font-bold'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="truncate">{opt.text}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-white">
                        Vote B
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Status: <strong className={browserBVoted ? 'text-violet-400' : 'text-slate-400'}>{browserBVoted ? 'Vote Cast' : 'Selecting...'}</strong></span>
              <span className="font-mono text-emerald-400">● WS Connected</span>
            </div>
          </div>

          {/* WINDOW C: AUDIENCE LIVE RESULTS OBSERVER */}
          <div className={`bg-slate-950/70 border rounded-2xl p-4 flex flex-col justify-between shadow-lg transition-all ${
            flashUpdate ? 'border-emerald-400 ring-2 ring-emerald-500/20' : 'border-emerald-500/30'
          }`}>
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="font-bold text-sm text-white">Browser C (Audience Live)</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  ● LIVE RESULTS
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                <span className="font-semibold text-white truncate max-w-[160px]">{currentPoll?.question}</span>
                <span className="font-mono font-bold text-emerald-400">Total: {pollResults?.totalVotes || 0}</span>
              </div>

              <div className="space-y-2.5">
                {pollResults?.results.map((res: OptionResult) => (
                  <div key={res.optionId} className="p-2 rounded-xl bg-slate-900 border border-slate-800 relative overflow-hidden">
                    <div
                      className="absolute top-0 left-0 bottom-0 bg-emerald-500/15 rounded-xl transition-all duration-500 ease-out"
                      style={{ width: `${res.percentage}%` }}
                    />
                    <div className="relative z-10 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200 truncate">{res.text}</span>
                      <div className="flex items-center space-x-2 font-mono">
                        <span className="text-slate-400 text-[11px]">{res.count}v</span>
                        <span className="font-bold text-white text-xs">{res.percentage}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-emerald-400 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Activity className="w-3.5 h-3.5" />
                <span>Zero page refresh updates</span>
              </span>
              <span className="font-mono text-slate-500">Atomic Redis Sync</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
