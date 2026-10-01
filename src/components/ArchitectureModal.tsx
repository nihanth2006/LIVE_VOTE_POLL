import React, { useState } from 'react';
import { X, Layers, Database, Cpu, Radio, Shield, Code, CheckCircle, Terminal } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'decisions' | 'api' | 'go_code'>('architecture');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">System Architecture & Technical Decisions</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Go (Gin) + MongoDB + Redis Pub/Sub + WebSockets + React Architecture
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="px-6 py-2 border-b border-slate-800 bg-slate-950 flex items-center space-x-2 text-xs">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'architecture' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Flow & Diagram
          </button>
          <button
            onClick={() => setActiveTab('decisions')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'decisions' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Key Decisions (Redis, WS, Mongo)
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'api' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            API Specifications
          </button>
          <button
            onClick={() => setActiveTab('go_code')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'go_code' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Backend Go Code Structure
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'architecture' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-3">
                  Data Flow Diagram (Real-Time Pub/Sub)
                </div>
                <div className="font-mono text-xs text-slate-300 bg-slate-900/90 p-4 rounded-xl border border-slate-800 overflow-x-auto leading-relaxed">
{`Browser A (Voter)
       │
       │  POST /api/polls/:id/vote  { "optionId": "opt_1" }
       ▼
Go / Gin Backend Server
       │
       ├── 1. Validate JWT (optional) & voter session
       ├── 2. Validate poll status & optionId in MongoDB
       ├── 3. Execute atomic Redis command:
       │        HINCRBY poll:{pollId}:votes opt_1 1
       │
       └── 4. Publish to Redis Pub/Sub:
                PUBLISH poll:{pollId}:updates '{"pollId":"...","optionId":"opt_1","count":11}'
                     │
                     ▼
             Redis Pub/Sub Broker
                     │
                     ▼
             Go WebSocket Hub (redis.Subscribe)
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
   WebSocket A  WebSocket B  WebSocket C (Audience)
         │           │           │
         ▼           ▼           ▼
      React UI    React UI    React UI (Real-time bar & count update)`}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-indigo-400 font-bold text-xs uppercase mb-1">1. REST API (Cold Start)</div>
                  <p className="text-xs text-slate-400">
                    GET /api/polls/:id/results fetches the snapshot directly from Redis or MongoDB before opening the WebSocket.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-emerald-400 font-bold text-xs uppercase mb-1">2. WebSocket Room</div>
                  <p className="text-xs text-slate-400">
                    /ws/polls/:pollId joins clients to that poll's room channel to avoid cross-poll message pollution.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-amber-400 font-bold text-xs uppercase mb-1">3. Atomic Increments</div>
                  <p className="text-xs text-slate-400">
                    No read-modify-write races. HINCRBY performs atomic increments in sub-millisecond memory.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'decisions' && (
            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-sm text-white flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span>1. Why Redis for Counts and Real-Time?</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Traditional relational or document databases experience high write-lock contention under heavy concurrent voting spikes. Redis stores hash counters in-memory (<code className="text-emerald-300">poll:{"{pollId}"}:votes</code>). The <code className="text-emerald-300">HINCRBY</code> operation is single-threaded and atomic, allowing 100,000+ votes/sec per instance with zero locking or dirty reads.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-sm text-white flex items-center space-x-2">
                  <Radio className="w-4 h-4 text-indigo-400" />
                  <span>2. Why WebSockets + Redis Pub/Sub?</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  HTTP polling creates extreme server load (N users polling every 1 sec = N req/s). WebSockets maintain a persistent TCP connection with minimal header overhead. Redis Pub/Sub decouples multiple Go server instances behind a load balancer, allowing any node that processes a vote to broadcast to all clients across the cluster.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-sm text-white flex items-center space-x-2">
                  <Database className="w-4 h-4 text-amber-400" />
                  <span>3. Why MongoDB?</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  MongoDB provides flexible JSON document modeling for dynamic poll options, creator associations, and schema evolutions. MongoDB acts as the persistent durable store of record while Redis serves as the high-throughput cache & real-time message bus.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-sm text-white flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-rose-400" />
                  <span>4. Concurrency & Duplicate Vote Policy</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  <strong>Concurrency:</strong> Handled by Redis single-threaded execution guarantees. <code className="text-emerald-300">HINCRBY</code> is atomic.<br />
                  <strong>Duplicate Votes:</strong> Authenticated users have their user ID stored in a Redis set (<code className="text-indigo-300">poll:{"{pollId}"}:voters</code>) using <code className="text-indigo-300">SADD</code>. If <code className="text-indigo-300">SADD</code> returns 0, the vote is rejected with 409 Conflict. Anonymous voters use a secure voter cookie/session token with IP verification.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">POST</span>
                  <span className="text-white">/api/auth/signup</span>
                </div>
                <span className="text-slate-500">name, email, password (bcrypt)</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">POST</span>
                  <span className="text-white">/api/auth/login</span>
                </div>
                <span className="text-slate-500">Returns JWT token</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">POST</span>
                  <span className="text-white">/api/polls</span>
                </div>
                <span className="text-slate-500">Protected by JWT • Creates poll in Mongo + Redis</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">GET</span>
                  <span className="text-white">/api/polls/:id/results</span>
                </div>
                <span className="text-slate-500">Initial snapshot from Redis HGETALL</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">POST</span>
                  <span className="text-white">/api/polls/:id/vote</span>
                </div>
                <span className="text-slate-500">Atomic HINCRBY + PUBLISH</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold">WS</span>
                  <span className="text-white">/ws/polls/:id</span>
                </div>
                <span className="text-slate-500">WebSocket connection subscribed to poll channel</span>
              </div>
            </div>
          )}

          {activeTab === 'go_code' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
                <div className="text-indigo-400 font-bold mb-2">Backend Separation of Concerns:</div>
                <pre className="text-[11px] leading-relaxed text-slate-400">
{`live-polling/backend/
├── cmd/
│   └── api/main.go          # Entry point
├── config/                  # MongoDB & Redis configurations
├── handlers/                # HTTP & WS request handlers
│   ├── auth_handler.go      # Signup/login/me
│   ├── poll_handler.go      # Create, Vote, Results
│   └── ws_handler.go        # WebSocket upgrade & room join
├── middleware/              # Auth (JWT) & CORS
├── models/                  # Structs for Poll, Option, User, Vote
├── repository/              # Direct MongoDB queries
│   ├── user_repository.go
│   └── poll_repository.go
├── services/                # Business logic & Redis integration
│   ├── auth_service.go
│   ├── poll_service.go
│   └── redis_service.go     # HINCRBY, HGETALL, PUBLISH
├── websocket/               # Hub & Client goroutine room router
│   ├── hub.go
│   └── client.go
├── utils/                   # JWT generation & input sanitization
└── main_test.go             # Automated test suite`}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
