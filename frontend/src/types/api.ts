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

// Dashboard types
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

export interface DashboardData {
  stats: StatCard[];
  recent_activities: ActivityItem[];
}

// Search types
export interface SearchResult {
  id: string;
  title: string;
  type: 'pdf' | 'docx' | 'txt' | 'pptx';
  content: string;
  author: string;
  date: string;
  tags: string[];
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  took: number;
}

export interface SearchRequest {
  query: string;
  type_filter?: string;
  limit?: number;
  offset?: number;
}


