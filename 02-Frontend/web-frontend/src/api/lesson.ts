import axiosInstance from './client';
import type {
  LessonPlan,
  LessonContent,
  GenerateLessonRequest,
  LessonProgress,
  LessonFeedback,
} from '@/types/lesson';
import type { ApiResponse, PaginatedResponse, ListQueryParams } from '@/types/api';

export const lessonApi = {
  generateLesson: async (data: GenerateLessonRequest): Promise<ApiResponse<LessonPlan>> => {
    // AI 生成五段式备课内容耗时较长（qwen-plus 生成 1800+ 字通常需 60-90 秒），
    // 默认 axios timeout 30s 会先超时导致"生成失败"误报，单独放宽到 180s
    return axiosInstance.post('/lessons/generate', data, { timeout: 180000 });
  },

  getLessonProgress: async (lessonId: number): Promise<ApiResponse<LessonProgress>> => {
    return axiosInstance.get(`/lessons/${lessonId}/progress`);
  },

  getLesson: async (id: number): Promise<ApiResponse<LessonPlan>> => {
    return axiosInstance.get(`/lessons/${id}`);
  },

  getLessonContents: async (id: number): Promise<ApiResponse<LessonContent[]>> => {
    return axiosInstance.get(`/lessons/${id}/contents`);
  },

  getLessons: async (params?: ListQueryParams): Promise<ApiResponse<PaginatedResponse<LessonPlan>>> => {
    return axiosInstance.get('/lessons', { params });
  },

  getLessonsByStudent: async (studentId: number, params?: ListQueryParams): Promise<ApiResponse<LessonPlan[]>> => {
    return axiosInstance.get(`/students/${studentId}/lessons`, { params });
  },

  updateLesson: async (id: number, data: Partial<LessonPlan>): Promise<ApiResponse<LessonPlan>> => {
    return axiosInstance.put(`/lessons/${id}`, data);
  },

  updateLessonContent: async (id: number, content: Partial<LessonContent>): Promise<ApiResponse<LessonPlan>> => {
    return axiosInstance.put(`/lessons/${id}/content`, content);
  },

  deleteLesson: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/lessons/${id}`);
  },

  saveLessonVersion: async (id: number, changeSummary?: string): Promise<ApiResponse<{ version: number }>> => {
    return axiosInstance.post(`/lessons/${id}/versions`, { changeSummary });
  },

  getLessonVersions: async (id: number): Promise<ApiResponse<any[]>> => {
    return axiosInstance.get(`/lessons/${id}/versions`);
  },

  revertToVersion: async (id: number, version: number): Promise<ApiResponse<LessonPlan>> => {
    return axiosInstance.post(`/lessons/${id}/revert`, { version });
  },

  exportLesson: async (id: number, format: 'pdf' | 'word'): Promise<Blob> => {
    return axiosInstance.get(`/lessons/${id}/export`, {
      params: { format },
      responseType: 'blob',
      // PDF 导出涉及 MathJax 渲染 + openhtmltopdf 生成，耗时较长，单独放宽到 120s
      timeout: 120000,
    });
  },

  submitFeedback: async (lessonId: number, data: Omit<LessonFeedback, 'id' | 'lessonId' | 'userId' | 'createdAt'>): Promise<ApiResponse<LessonFeedback>> => {
    return axiosInstance.post(`/lessons/${lessonId}/feedback`, data);
  },

  getFeedback: async (lessonId: number): Promise<ApiResponse<LessonFeedback[]>> => {
    return axiosInstance.get(`/lessons/${lessonId}/feedback`);
  },
};
