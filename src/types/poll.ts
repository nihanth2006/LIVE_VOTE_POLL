export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface PollOption {
  optionId: string;
  text: string;
}

export interface Poll {
  pollId: string;
  creatorId: string;
  creatorName?: string;
  question: string;
  options: PollOption[];
  status: 'active' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface OptionResult {
  optionId: string;
  text: string;
  count: number;
  percentage: number;
}

export interface PollResults {
  pollId: string;
  question: string;
  status: 'active' | 'closed';
  totalVotes: number;
  results: OptionResult[];
  updatedAt: string;
}

export interface VoteEvent {
  pollId: string;
  optionId: string;
  count: number;
  totalVotes: number;
  timestamp: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
