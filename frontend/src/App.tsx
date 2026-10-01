import React, { useState, useEffect } from 'react';
import { ApiService } from './services/api';
import { User } from './types/poll';
import { Navbar } from './components/Navbar';
import { PollsListPage } from './pages/PollsListPage';
import { PollVotePage } from './pages/PollVotePage';
import { CreatePollPage } from './pages/CreatePollPage';
import { DashboardPage } from './pages/DashboardPage';
import { AuthModal } from './components/AuthModal';
import { MultiClientSimulator } from './components/MultiClientSimulator';
import { ArchitectureModal } from './components/ArchitectureModal';
import { PresenterModePage } from './pages/PresenterModePage';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(ApiService.getCurrentUser());
  const [activeView, setActiveView] = useState<'home' | 'dashboard' | 'create' | 'poll' | 'presenter'>('home');
  const [activePollId, setActivePollId] = useState<string | null>(null);
  const [pollViewMode, setPollViewMode] = useState<'vote' | 'results'>('vote');

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [architectureOpen, setArchitectureOpen] = useState<boolean>(false);
  const [multiClientOpen, setMultiClientOpen] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState<boolean>(true);

  // Check URL pathname for deep-linking (/poll/:id or /poll/:id/present or /polls/:id/results)
  useEffect(() => {
    const handleUrlRouting = () => {
      const path = window.location.pathname;
      if (path.startsWith('/poll/') && path.includes('/present')) {
        const id = path.replace('/poll/', '').split('/')[0];
        if (id) {
          setActivePollId(id);
          setActiveView('presenter');
        }
      } else if (path.startsWith('/poll/')) {
        const id = path.replace('/poll/', '').split('/')[0];
        if (id) {
          setActivePollId(id);
          setPollViewMode('vote');
          setActiveView('poll');
        }
      } else if (path.startsWith('/polls/') && path.includes('/results')) {
        const parts = path.split('/');
        const id = parts[2];
        if (id) {
          setActivePollId(id);
          setPollViewMode('results');
          setActiveView('poll');
        }
      }
    };

    handleUrlRouting();
    window.addEventListener('popstate', handleUrlRouting);
    return () => window.removeEventListener('popstate', handleUrlRouting);
  }, []);

  const handleNavigate = (view: string, param?: string) => {
    if (view === 'poll' && param) {
      setActivePollId(param);
      setPollViewMode('vote');
      setActiveView('poll');
      window.history.pushState({}, '', `/poll/${param}`);
    } else {
      setActiveView(view as any);
      if (view === 'home') window.history.pushState({}, '', '/');
      if (view === 'dashboard') window.history.pushState({}, '', '/dashboard');
      if (view === 'create') window.history.pushState({}, '', '/create-poll');
    }
  };

  const handleOpenPoll = (pollId: string, mode: 'vote' | 'results' = 'vote') => {
    setActivePollId(pollId);
    setPollViewMode(mode);
    setActiveView('poll');
    window.history.pushState({}, '', mode === 'results' ? `/polls/${pollId}/results` : `/poll/${pollId}`);
  };

  const handleOpenPresenter = (pollId: string) => {
    setActivePollId(pollId);
    setActiveView('presenter');
    window.history.pushState({}, '', `/poll/${pollId}/present`);
  };

  const handleOpenAuth = (mode: 'login' | 'signup' = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleLogout = () => {
    ApiService.logout();
    setCurrentUser(null);
    if (activeView === 'dashboard') {
      setActiveView('home');
    }
  };

  if (activeView === 'presenter' && activePollId) {
    return (
      <PresenterModePage
        pollId={activePollId}
        onExitPresenter={() => handleOpenPoll(activePollId, 'vote')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        activeView={activeView}
        onNavigate={handleNavigate}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        onOpenArchitecture={() => setArchitectureOpen(true)}
        onOpenMultiClient={() => setMultiClientOpen(true)}
        wsConnected={wsConnected}
      />

      {/* Main Body */}
      <main className="flex-1">
        {activeView === 'home' && (
          <PollsListPage
            onNavigatePoll={handleOpenPoll}
            onNavigatePresenter={handleOpenPresenter}
            onNavigateCreate={() => handleNavigate('create')}
            onOpenMultiClient={() => setMultiClientOpen(true)}
            onOpenArchitecture={() => setArchitectureOpen(true)}
          />
        )}

        {activeView === 'create' && (
          <CreatePollPage
            currentUser={currentUser}
            onPollCreated={(newId) => handleOpenPoll(newId, 'results')}
            onOpenAuth={() => handleOpenAuth('login')}
          />
        )}

        {activeView === 'dashboard' && (
          <DashboardPage
            currentUser={currentUser}
            onNavigateCreate={() => handleNavigate('create')}
            onNavigatePoll={handleOpenPoll}
            onNavigatePresenter={handleOpenPresenter}
            onOpenAuth={() => handleOpenAuth('login')}
          />
        )}

        {activeView === 'poll' && activePollId && (
          <PollVotePage
            pollId={activePollId}
            initialMode={pollViewMode}
            onNavigateHome={() => handleNavigate('home')}
            onNavigatePresenter={handleOpenPresenter}
            onOpenArchitecture={() => setArchitectureOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Real-time engine: Go (Gin) + MongoDB + Redis Pub/Sub + WebSockets</span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setMultiClientOpen(true)}
              className="text-slate-400 hover:text-emerald-400 transition-colors"
            >
              Multi-Client Live Verifier
            </button>
            <button
              onClick={() => setArchitectureOpen(true)}
              className="text-slate-400 hover:text-indigo-400 transition-colors"
            >
              Architecture & API Specs
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(user) => setCurrentUser(user)}
      />

      <MultiClientSimulator
        isOpen={multiClientOpen}
        onClose={() => setMultiClientOpen(false)}
      />

      <ArchitectureModal
        isOpen={architectureOpen}
        onClose={() => setArchitectureOpen(false)}
      />
    </div>
  );
}
