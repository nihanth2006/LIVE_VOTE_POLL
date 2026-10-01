import React from 'react';
import { User } from '../types/poll';
import { 
  Vote, 
  PlusCircle, 
  LayoutDashboard, 
  Radio, 
  Terminal, 
  LogOut, 
  LogIn, 
  UserPlus, 
  Sparkles,
  Layers,
  SplitSquareVertical
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  activeView: string;
  onNavigate: (view: string, param?: string) => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onLogout: () => void;
  onOpenArchitecture: () => void;
  onOpenMultiClient: () => void;
  wsConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeView,
  onNavigate,
  onOpenAuth,
  onLogout,
  onOpenArchitecture,
  onOpenMultiClient,
  wsConnected,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('home')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-emerald-500 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Vote className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">LivePoll</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                  Go + Redis
                </span>
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                <span className="text-[11px] font-medium">{wsConnected ? 'WebSocket Live' : 'Reconnecting...'}</span>
              </div>
            </div>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => onNavigate('home')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === 'home' 
                  ? 'bg-slate-800 text-white' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              Explore Polls
            </button>

            {currentUser && (
              <button
                onClick={() => onNavigate('dashboard')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                  activeView === 'dashboard' 
                    ? 'bg-slate-800 text-white' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                <span>My Polls</span>
              </button>
            )}

            <button
              onClick={() => onNavigate('create')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeView === 'create' 
                  ? 'bg-slate-800 text-white' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>Create Poll</span>
            </button>

            {/* Acceptance Test Simulator Button */}
            <button
              onClick={onOpenMultiClient}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1.5 transition-all shadow-sm"
              title="Test Section 27: Multi-Browser Instant Live Voting"
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>Multi-Browser Test</span>
            </button>

            {/* Architecture Modal Button */}
            <button
              onClick={onOpenArchitecture}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1.5 transition-all"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Architecture & Redis</span>
            </button>
          </nav>

          {/* User actions */}
          <div className="flex items-center space-x-2">
            {currentUser ? (
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-semibold text-white leading-tight">{currentUser.name}</div>
                  <div className="text-xs text-slate-400 font-mono truncate max-w-[150px]">{currentUser.email}</div>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white text-sm shadow-md">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
                >
                  Log In
                </button>
                <button
                  onClick={() => onOpenAuth('signup')}
                  className="px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Sign Up</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
