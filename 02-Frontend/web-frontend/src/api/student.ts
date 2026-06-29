import axiosInstance from './client';
import type {
  Student,
  StudentProfile,
  StudentWeakPoint,
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

  // ========== 学生薄弱知识点（阶段 2b-1） ==========
  getWeakPoints: async (studentId: number): Promise<StudentWeakPoint[]> => {
    const response = await axiosInstance.get(`/students/${studentId}/weak-points`);
    return response.data?.data ?? [];
  },

  createWeakPoint: async (studentId: number, data: {
    subject: string;
    knowledgePoint: string;
    masteryLevel: string;
    notes?: string;
  }): Promise<StudentWeakPoint> => {
    const response = await axiosInstance.post(`/students/${studentId}/weak-points`, data);
    return response.data?.data;
  },

  updateWeakPoint: async (studentId: number, id: number, data: {
    knowledgePoint?: string;
    masteryLevel?: string;
    notes?: string;
  }): Promise<StudentWeakPoint> => {
    const response = await axiosInstance.put(`/students/${studentId}/weak-points/${id}`, data);
    return response.data?.data;
  },

  deleteWeakPoint: async (studentId: number, id: number): Promise<void> => {
    await axiosInstance.delete(`/students/${studentId}/weak-points/${id}`);
  },
};
