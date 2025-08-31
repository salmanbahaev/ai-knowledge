/**
 * API response types and interfaces.
 */

export interface ApiResponse<T> {
  data: T;
  status: string;
  message?: string;
  timestamp: string;
}

export interface ErrorResponse {
  status: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

// Dashboard types (updated for real backend)
export interface DashboardData {
  total_documents: number;
  total_searches: number;
  total_chats: number;
  active_users: number;
}

// Legacy StatCard interface for UI compatibility
export interface StatCard {
  title: string;
  value: string;
  change: string;
  change_type: 'positive' | 'negative';
  icon: string;
}

export interface ActivityItem {
  id: string;
  action: string;
  user: string;
  time: string;
  type: 'upload' | 'search' | 'chat' | 'view';
}

// Search types (updated for real backend)
export interface SearchResponse {
  query: string;
  total_results: number;
  results: SearchResult[];
}

export interface SearchResult {
  id: string;
  title: string;
  type: 'pdf' | 'docx' | 'txt' | 'pptx';
  content: string;
  author?: string;
  date?: string;
  tags?: string[];
  score?: number;
}

export interface SearchRequest {
  query: string;
  limit?: number;
}





