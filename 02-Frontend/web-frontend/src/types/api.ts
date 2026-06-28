export * from './auth';
export * from './student';
export * from './lesson';

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
  requestId?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedRequest {
  page?: number;
  pageSize?: number;
}

export interface ListQueryParams extends PaginatedRequest {
  keyword?: string;
  status?: string;
  grade?: string;
  subject?: string;
  mode?: string;
}

export interface WebSocketMessage<T = any> {
  type: string;
  data: T;
  timestamp: number;
}
