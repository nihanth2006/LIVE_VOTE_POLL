import { Poll, PollResults, User, AuthResponse, ApiResponse } from '../types/poll';

const STORAGE_KEYS = {
  USERS: 'livepoll_users',
  POLLS: 'livepoll_polls',
  VOTES: 'livepoll_redis_votes', // Redis Hash simulation: poll:{pollId}:votes
  VOTER_RECORDS: 'livepoll_voters', // To enforce duplicate vote prevention
  AUTH_TOKEN: 'livepoll_jwt_token',
  CURRENT_USER: 'livepoll_current_user',
  EVENTS_LOG: 'livepoll_redis_events',
};

// Seed initial realistic polls if empty
function initializeStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    const defaultUser: User = {
      id: 'usr_demo_101',
      name: 'Alex Rivera (Go & Distributed Systems)',
      email: 'alex.rivera@example.com',
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([
      {
        ...defaultUser,
        passwordHash: '$2a$10$demoHashedPasswordGoBcryptSample1234567890',
      }
    ]));
  }

  if (!localStorage.getItem(STORAGE_KEYS.POLLS)) {
    const initialPolls: Poll[] = [
      {
        pollId: 'poll_lang_2026',
        creatorId: 'usr_demo_101',
        creatorName: 'Alex Rivera',
        question: 'Which programming language do you prefer for production microservices?',
        options: [
          { optionId: 'opt_go', text: 'Go' },
          { optionId: 'opt_python', text: 'Python' },
          { optionId: 'opt_ts', text: 'TypeScript / Node.js' },
          { optionId: 'opt_rust', text: 'Rust' },
          { optionId: 'opt_java', text: 'Java' },
        ],
        status: 'active',
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        pollId: 'poll_db_cache',
        creatorId: 'usr_demo_101',
        creatorName: 'Alex Rivera',
        question: 'What is your primary cache & real-time message broker of choice?',
        options: [
          { optionId: 'opt_redis', text: 'Redis (In-Memory + Pub/Sub)' },
          { optionId: 'opt_dragonfly', text: 'Dragonfly' },
          { optionId: 'opt_nats', text: 'NATS' },
          { optionId: 'opt_kafka', text: 'Apache Kafka' },
        ],
        status: 'active',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
      {
        pollId: 'poll_arch_2026',
        creatorId: 'usr_demo_101',
        creatorName: 'Alex Rivera',
        question: 'Which architecture pattern best suits low-latency live polling?',
        options: [
          { optionId: 'opt_redis_ws', text: 'WebSockets + Redis Pub/Sub + Atomic HINCRBY' },
          { optionId: 'opt_long_polling', text: 'HTTP Long Polling' },
          { optionId: 'opt_sse', text: 'Server-Sent Events (SSE)' },
          { optionId: 'opt_db_poll', text: 'Periodic SQL/Mongo Polling' },
        ],
        status: 'active',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      }
    ];

    localStorage.setItem(STORAGE_KEYS.POLLS, JSON.stringify(initialPolls));

    // Seed Redis atomic hash vote counts: poll:{pollId}:votes
    const initialVotes: Record<string, Record<string, number>> = {
      'poll_lang_2026': {
        'opt_go': 142,
        'opt_python': 95,
        'opt_ts': 61,
        'opt_rust': 48,
        'opt_java': 24,
      },
      'poll_db_cache': {
        'opt_redis': 188,
        'opt_dragonfly': 32,
        'opt_nats': 28,
        'opt_kafka': 45,
      },
      'poll_arch_2026': {
        'opt_redis_ws': 210,
        'opt_long_polling': 12,
        'opt_sse': 34,
        'opt_db_poll': 8,
      }
    };
    localStorage.setItem(STORAGE_KEYS.VOTES, JSON.stringify(initialVotes));
  }
}

initializeStorage();

// BroadcastChannel for cross-tab multi-window instant WebSocket / Redis Pub/Sub simulation
export const realTimeBroadcast = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('redis_live_polling_channel')
  : null;

export const ApiService = {
  // Authentication
  async signup(name: string, email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    const usersStr = localStorage.getItem(STORAGE_KEYS.USERS) || '[]';
    const users = JSON.parse(usersStr);

    if (!name || name.trim().length < 2) {
      return { success: false, message: 'Name must be at least 2 characters.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { success: false, message: 'Invalid email address.' };
    }
    if (!password || password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters.' };
    }

    if (users.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, message: 'An account with this email already exists.' };
    }

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      createdAt: new Date().toISOString(),
    };

    users.push({
      ...newUser,
      passwordHash: `$2a$10$hashed_${btoa(password)}`,
    });
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    const token = `jwt_mock_${newUser.id}_${Date.now()}`;
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(newUser));

    return {
      success: true,
      data: { token, user: newUser },
      message: 'Signup successful!',
    };
  },

  async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    const usersStr = localStorage.getItem(STORAGE_KEYS.USERS) || '[]';
    const users = JSON.parse(usersStr);

    const userRecord = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (!userRecord) {
      return { success: false, message: 'Invalid email or password.' };
    }

    const user: User = {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      createdAt: userRecord.createdAt,
    };

    const token = `jwt_mock_${user.id}_${Date.now()}`;
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));

    return {
      success: true,
      data: { token, user },
      message: 'Login successful!',
    };
  },

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  logout(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  // Poll Management
  async getPolls(): Promise<ApiResponse<Poll[]>> {
    const pollsStr = localStorage.getItem(STORAGE_KEYS.POLLS) || '[]';
    const polls: Poll[] = JSON.parse(pollsStr);
    return { success: true, data: polls };
  },

  async getMyPolls(): Promise<ApiResponse<Poll[]>> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'Unauthorized. Please login first.' };
    }
    const pollsStr = localStorage.getItem(STORAGE_KEYS.POLLS) || '[]';
    const polls: Poll[] = JSON.parse(pollsStr);
    const myPolls = polls.filter(p => p.creatorId === currentUser.id);
    return { success: true, data: myPolls };
  },

  async getPollById(pollId: string): Promise<ApiResponse<Poll>> {
    const pollsStr = localStorage.getItem(STORAGE_KEYS.POLLS) || '[]';
    const polls: Poll[] = JSON.parse(pollsStr);
    const poll = polls.find(p => p.pollId === pollId);
    if (!poll) {
      return { success: false, message: 'Poll not found.' };
    }
    return { success: true, data: poll };
  },

  async createPoll(question: string, optionTexts: string[]): Promise<ApiResponse<{ pollId: string; shareUrl: string }>> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'Unauthorized. Please login to create a poll.' };
    }

    if (!question || question.trim().length < 5) {
      return { success: false, message: 'Question must be at least 5 characters long.' };
    }
    if (question.trim().length > 300) {
      return { success: false, message: 'Question exceeds maximum limit of 300 characters.' };
    }

    const cleanOptions = optionTexts.map(o => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      return { success: false, message: 'Poll must have at least 2 non-empty options.' };
    }
    if (cleanOptions.length > 10) {
      return { success: false, message: 'Poll cannot have more than 10 options.' };
    }

    const uniqueSet = new Set(cleanOptions.map(o => o.toLowerCase()));
    if (uniqueSet.size !== cleanOptions.length) {
      return { success: false, message: 'Duplicate options are not allowed.' };
    }

    const pollId = `poll_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const newPoll: Poll = {
      pollId,
      creatorId: currentUser.id,
      creatorName: currentUser.name,
      question: question.trim(),
      options: cleanOptions.map((text, idx) => ({
        optionId: `opt_${idx + 1}_${Math.random().toString(36).substring(2, 6)}`,
        text,
      })),
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const pollsStr = localStorage.getItem(STORAGE_KEYS.POLLS) || '[]';
    const polls: Poll[] = JSON.parse(pollsStr);
    polls.unshift(newPoll);
    localStorage.setItem(STORAGE_KEYS.POLLS, JSON.stringify(polls));

    // Initialize Redis vote hash for this poll: poll:{pollId}:votes
    const votesStr = localStorage.getItem(STORAGE_KEYS.VOTES) || '{}';
    const votes = JSON.parse(votesStr);
    votes[pollId] = {};
    newPoll.options.forEach(opt => {
      votes[pollId][opt.optionId] = 0;
    });
    localStorage.setItem(STORAGE_KEYS.VOTES, JSON.stringify(votes));

    return {
      success: true,
      data: {
        pollId,
        shareUrl: `/poll/${pollId}`,
      },
      message: 'Poll created successfully!',
    };
  },

  async closePoll(pollId: string): Promise<ApiResponse<Poll>> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'Unauthorized.' };
    }

    const pollsStr = localStorage.getItem(STORAGE_KEYS.POLLS) || '[]';
    const polls: Poll[] = JSON.parse(pollsStr);
    const index = polls.findIndex(p => p.pollId === pollId);

    if (index === -1) {
      return { success: false, message: 'Poll not found.' };
    }
    if (polls[index].creatorId !== currentUser.id) {
      return { success: false, message: 'Forbidden. You are not the creator of this poll.' };
    }

    polls[index].status = 'closed';
    polls[index].updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.POLLS, JSON.stringify(polls));

    // Publish Redis event for poll close
    if (realTimeBroadcast) {
      realTimeBroadcast.postMessage({
        type: 'POLL_STATUS_CHANGE',
        pollId,
        status: 'closed',
      });
    }

    return { success: true, data: polls[index], message: 'Poll closed successfully.' };
  },

  async deletePoll(pollId: string): Promise<ApiResponse<boolean>> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'Unauthorized.' };
    }

    const pollsStr = localStorage.getItem(STORAGE_KEYS.POLLS) || '[]';
    let polls: Poll[] = JSON.parse(pollsStr);
    const poll = polls.find(p => p.pollId === pollId);

    if (!poll) {
      return { success: false, message: 'Poll not found.' };
    }
    if (poll.creatorId !== currentUser.id) {
      return { success: false, message: 'Forbidden. You cannot delete someone else\'s poll.' };
    }

    polls = polls.filter(p => p.pollId !== pollId);
    localStorage.setItem(STORAGE_KEYS.POLLS, JSON.stringify(polls));

    // Remove from Redis votes
    const votesStr = localStorage.getItem(STORAGE_KEYS.VOTES) || '{}';
    const votes = JSON.parse(votesStr);
    delete votes[pollId];
    localStorage.setItem(STORAGE_KEYS.VOTES, JSON.stringify(votes));

    return { success: true, data: true, message: 'Poll deleted.' };
  },

  // Results & Real-Time Voting (Simulating Go + Redis HINCRBY + Redis Pub/Sub)
  async getPollResults(pollId: string): Promise<ApiResponse<PollResults>> {
    const pollsStr = localStorage.getItem(STORAGE_KEYS.POLLS) || '[]';
    const polls: Poll[] = JSON.parse(pollsStr);
    const poll = polls.find(p => p.pollId === pollId);

    if (!poll) {
      return { success: false, message: 'Poll not found.' };
    }

    const votesStr = localStorage.getItem(STORAGE_KEYS.VOTES) || '{}';
    const allVotes = JSON.parse(votesStr);
    const pollVotes: Record<string, number> = allVotes[pollId] || {};

    let totalVotes = 0;
    poll.options.forEach(opt => {
      totalVotes += pollVotes[opt.optionId] || 0;
    });

    const results = poll.options.map(opt => {
      const count = pollVotes[opt.optionId] || 0;
      const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 1000) / 10 : 0;
      return {
        optionId: opt.optionId,
        text: opt.text,
        count,
        percentage,
      };
    });

    return {
      success: true,
      data: {
        pollId: poll.pollId,
        question: poll.question,
        status: poll.status,
        totalVotes,
        results,
        updatedAt: poll.updatedAt,
      },
    };
  },

  hasUserVoted(pollId: string, voterId: string): boolean {
    const voterStr = localStorage.getItem(STORAGE_KEYS.VOTER_RECORDS) || '{}';
    const records = JSON.parse(voterStr);
    return Boolean(records[`${pollId}:${voterId}`]);
  },

  async vote(pollId: string, optionId: string, voterId: string): Promise<ApiResponse<PollResults>> {
    const pollsStr = localStorage.getItem(STORAGE_KEYS.POLLS) || '[]';
    const polls: Poll[] = JSON.parse(pollsStr);
    const poll = polls.find(p => p.pollId === pollId);

    if (!poll) {
      return { success: false, message: 'Poll not found (404).' };
    }
    if (poll.status === 'closed') {
      return { success: false, message: 'This poll is closed. No further votes are accepted.' };
    }

    const validOption = poll.options.find(o => o.optionId === optionId);
    if (!validOption) {
      return { success: false, message: 'Invalid option selected.' };
    }

    // Check duplicate vote
    if (this.hasUserVoted(pollId, voterId)) {
      return {
        success: false,
        message: 'You have already voted in this poll. Duplicate votes are rejected by server policy.',
      };
    }

    // Atomic Redis HINCRBY simulation:
    // HINCRBY poll:{pollId}:votes optionId 1
    const votesStr = localStorage.getItem(STORAGE_KEYS.VOTES) || '{}';
    const allVotes = JSON.parse(votesStr);
    if (!allVotes[pollId]) allVotes[pollId] = {};
    const currentCount = (allVotes[pollId][optionId] || 0) + 1;
    allVotes[pollId][optionId] = currentCount;
    localStorage.setItem(STORAGE_KEYS.VOTES, JSON.stringify(allVotes));

    // Record voter
    const voterStr = localStorage.getItem(STORAGE_KEYS.VOTER_RECORDS) || '{}';
    const records = JSON.parse(voterStr);
    records[`${pollId}:${voterId}`] = {
      optionId,
      votedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.VOTER_RECORDS, JSON.stringify(records));

    // Calculate updated total
    let totalVotes = 0;
    poll.options.forEach(opt => {
      totalVotes += allVotes[pollId][opt.optionId] || 0;
    });

    const results = poll.options.map(opt => {
      const count = allVotes[pollId][opt.optionId] || 0;
      const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 1000) / 10 : 0;
      return {
        optionId: opt.optionId,
        text: opt.text,
        count,
        percentage,
      };
    });

    const updatedPollResults: PollResults = {
      pollId: poll.pollId,
      question: poll.question,
      status: poll.status,
      totalVotes,
      results,
      updatedAt: new Date().toISOString(),
    };

    // Log Redis event for inspection
    const redisEvent = {
      channel: `poll:${pollId}:updates`,
      redisCommand: `HINCRBY poll:${pollId}:votes ${optionId} 1`,
      payload: {
        pollId,
        optionId,
        count: currentCount,
        totalVotes,
        timestamp: new Date().toISOString(),
      },
    };

    const logsStr = localStorage.getItem(STORAGE_KEYS.EVENTS_LOG) || '[]';
    const logs = JSON.parse(logsStr);
    logs.unshift(redisEvent);
    if (logs.length > 50) logs.pop();
    localStorage.setItem(STORAGE_KEYS.EVENTS_LOG, JSON.stringify(logs));

    // PUBLISH Redis event -> WebSockets broadcast
    if (realTimeBroadcast) {
      realTimeBroadcast.postMessage({
        type: 'VOTE_UPDATE',
        event: redisEvent.payload,
        results: updatedPollResults,
      });
    }

    return {
      success: true,
      data: updatedPollResults,
      message: 'Vote recorded successfully!',
    };
  },

  getRecentRedisEvents() {
    const logsStr = localStorage.getItem(STORAGE_KEYS.EVENTS_LOG) || '[]';
    return JSON.parse(logsStr);
  }
};
