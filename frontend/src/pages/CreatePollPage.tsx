import React, { useState } from 'react';
import { ApiService } from '../services/api';
import { User } from '../types/poll';
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  ArrowRight, 
  AlertCircle, 
  HelpCircle, 
  Share2, 
  Check, 
  Radio, 
  Lock 
} from 'lucide-react';

interface CreatePollPageProps {
  currentUser: User | null;
  onPollCreated: (pollId: string) => void;
  onOpenAuth: () => void;
}

export const CreatePollPage: React.FC<CreatePollPageProps> = ({
  currentUser,
  onPollCreated,
  onOpenAuth,
}) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>([
    'Go (Goroutines & High Concurrency)',
    'TypeScript / Node.js (Async I/O)',
    'Python (FastAPI / Celery)',
    'Rust (Actix-web / Tokio)',
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddOption = () => {
    if (options.length >= 10) return;
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, val: string) => {
    const updated = [...options];
    updated[index] = val;
    setOptions(updated);
  };

  const handleQuickTemplate = (templateType: 'languages' | 'frameworks' | 'databases') => {
    if (templateType === 'languages') {
      setQuestion('Which backend language is your team betting on for 2026?');
      setOptions(['Go', 'Rust', 'TypeScript', 'Java', 'Python']);
    } else if (templateType === 'frameworks') {
      setQuestion('Which high-throughput web framework delivers the best DX and latency?');
      setOptions(['Gin (Go)', 'Fiber (Go)', 'Express (Node)', 'FastAPI (Python)', 'Axum (Rust)']);
    } else {
      setQuestion('What is your primary cache/message-broker layer?');
      setOptions(['Redis (Pub/Sub & Hashes)', 'Dragonfly', 'NATS Streaming', 'Kafka']);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (!question.trim() || question.trim().length < 5) {
      setError('Question must be at least 5 characters long.');
      return;
    }

    const clean = options.map(o => o.trim()).filter(Boolean);
    if (clean.length < 2) {
      setError('Please provide at least 2 non-empty options.');
      return;
    }

    const uniqueOptions = new Set(clean.map(o => o.toLowerCase()));
    if (uniqueOptions.size !== clean.length) {
      setError('Duplicate options detected. Each option must be distinct.');
      return;
    }

    setLoading(true);
    try {
      const res = await ApiService.createPoll(question, clean);
      if (res.success && res.data) {
        onPollCreated(res.data.pollId);
      } else {
        setError(res.message || 'Failed to create poll.');
      }
    } catch (err: any) {
      setError(err?.message || 'Server error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Authentication Required</h2>
        <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
          As required by the assignment security guidelines, unauthenticated users cannot create or manage polls. Please log in or sign up to continue.
        </p>
        <button
          onClick={onOpenAuth}
          className="mt-6 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all inline-flex items-center space-x-2"
        >
          <span>Log In or Sign Up</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>Real-Time Broadcast Engine</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Create a New Live Poll</h1>
        <p className="text-slate-400 text-sm mt-1">
          Each poll generates a shareable public URL with real-time Redis Pub/Sub vote tracking.
        </p>
      </div>

      {/* Quick Templates */}
      <div className="mb-6 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Quick Sample Templates</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleQuickTemplate('languages')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition-colors"
          >
            Backend Languages
          </button>
          <button
            type="button"
            onClick={() => handleQuickTemplate('frameworks')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition-colors"
          >
            Go/Web Frameworks
          </button>
          <button
            type="button"
            onClick={() => handleQuickTemplate('databases')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition-colors"
          >
            Caches & Brokers
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Poll Form */}
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        {/* Question */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Poll Question
            </label>
            <span className="text-xs text-slate-500 font-mono">
              {question.length}/300
            </span>
          </div>
          <textarea
            required
            rows={2}
            maxLength={300}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Which programming language do you prefer for high-throughput services?"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>

        {/* Options */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Poll Options (Min 2, Max 10)
            </label>
            <span className="text-xs text-slate-400 font-mono">
              {options.length} options defined
            </span>
          </div>

          <div className="space-y-3">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <span className="w-6 text-center text-xs font-mono font-bold text-slate-500">
                  {idx + 1}.
                </span>
                <input
                  type="text"
                  required
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveOption(idx)}
                  disabled={options.length <= 2}
                  className="p-2.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                  title="Remove Option"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {options.length < 10 && (
            <button
              type="button"
              onClick={handleAddOption}
              className="mt-3 px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-dashed border-slate-700 hover:border-slate-600 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center space-x-2"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Add Another Option</span>
            </button>
          )}
        </div>

        {/* Backend Validation Summary Card */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-400 space-y-1">
          <div className="font-semibold text-slate-300">Enforced Backend Validation Rules:</div>
          <ul className="list-disc list-inside space-y-0.5 font-mono text-[11px] text-slate-400">
            <li>Question length: 5 - 300 characters</li>
            <li>Option count: 2 - 10 unique non-empty strings</li>
            <li>Stable option ID assignment (e.g. opt_1_xyz)</li>
            <li>Redis Hash key initialized: <span className="text-amber-400">poll:{"{pollId}"}:votes</span></li>
          </ul>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white font-bold text-sm shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <span>Publish Poll & Generate Live Link</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
