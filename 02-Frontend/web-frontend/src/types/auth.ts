export interface User {
  id: number;
  usernameId?: number; // Maybe? No, backend has id.
  username: string;
  realName: string;
  phone: string;
  email?: string;
  avatar?: string;
  subjects?: string;
  teachingYears?: string;
  role: number;
  status: number;
  createdAt: string;
}

export interface LoginRequest {
  phone: string;
  code?: string;
  password?: string;
  type: 'sms' | 'password';
}

export interface LoginResponse {
  token: string;
  userId: number;
  username: string;
  realName: string;
  role: number;
  avatar?: string;
}

export interface RegisterRequest {
  username: string;
  password?: string;
  realName: string;
  phone: string;
  code: string;
  subjects?: string;
  teachingYears?: string;
}
