import axiosInstance from './client';
import type { User, LoginRequest, LoginResponse, RegisterRequest } from '@/types/auth';
import type { ApiResponse } from '@/types/api';

export const authApi = {
  sendCode: async (phone: string): Promise<void> => {
    await axiosInstance.post('/auth/send-code', { phone });
  },

  login: async (data: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    return axiosInstance.post('/auth/login', data);
  },

  register: async (data: RegisterRequest): Promise<ApiResponse<LoginResponse>> => {
    return axiosInstance.post('/auth/register', data);
  },

  logout: async (): Promise<void> => {
    await axiosInstance.post('/auth/logout');
  },

  refreshToken: async (refreshToken: string): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> => {
    return axiosInstance.post('/auth/refresh', { refreshToken });
  },

  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    return axiosInstance.get('/auth/currentUser');
  },

  updateProfile: async (data: Partial<User>): Promise<ApiResponse<User>> => {
    return axiosInstance.put('/auth/updateProfile', data);
  },

  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    await axiosInstance.post('/auth/updatePassword', {
      oldPassword,
      newPassword,
    });
  },
};
