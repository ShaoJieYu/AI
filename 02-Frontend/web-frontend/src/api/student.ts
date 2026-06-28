import axiosInstance from './client';
import type {
  Student,
  StudentProfile,
  CreateStudentRequest,
  UpdateStudentRequest,
  TeachingGoal,
} from '@/types/student';
import type { ApiResponse, PaginatedResponse, ListQueryParams } from '@/types/api';

export const studentApi = {
  getStudents: async (params: ListQueryParams): Promise<ApiResponse<PaginatedResponse<Student>>> => {
    return axiosInstance.get('/students', { params });
  },

  getStudent: async (id: number): Promise<ApiResponse<Student>> => {
    return axiosInstance.get(`/students/${id}`);
  },

  createStudent: async (data: CreateStudentRequest): Promise<ApiResponse<Student>> => {
    return axiosInstance.post('/students', data);
  },

  updateStudent: async (id: number, data: UpdateStudentRequest): Promise<ApiResponse<Student>> => {
    return axiosInstance.put(`/students/${id}`, data);
  },

  deleteStudent: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/students/${id}`);
  },

  getStudentProfile: async (studentId: number): Promise<ApiResponse<StudentProfile>> => {
    return axiosInstance.get(`/students/${studentId}/profile`);
  },

  updateStudentProfile: async (studentId: number, data: Partial<StudentProfile>): Promise<ApiResponse<StudentProfile>> => {
    return axiosInstance.put(`/students/${studentId}/profile`, data);
  },

  getTeachingGoals: async (studentId: number): Promise<ApiResponse<TeachingGoal[]>> => {
    return axiosInstance.get(`/students/${studentId}/goals`);
  },

  createTeachingGoal: async (studentId: number, data: Omit<TeachingGoal, 'id' | 'createdAt'>): Promise<ApiResponse<TeachingGoal>> => {
    return axiosInstance.post(`/students/${studentId}/goals`, data);
  },

  updateTeachingGoal: async (studentId: number, goalId: number, data: Partial<TeachingGoal>): Promise<ApiResponse<TeachingGoal>> => {
    return axiosInstance.put(`/students/${studentId}/goals/${goalId}`, data);
  },

  deleteTeachingGoal: async (studentId: number, goalId: number): Promise<void> => {
    await axiosInstance.delete(`/students/${studentId}/goals/${goalId}`);
  },

  getDashboardStats: async (): Promise<ApiResponse<{ midtermTarget: number; knowledgeMastery: number; homeworkCompletion: number }>> => {
    return axiosInstance.get('/students/dashboard-stats');
  },
};
