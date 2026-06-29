import axiosInstance from './client';
import type { HomeworkAnalysisRecord } from '@/types/homework';
import type { ApiResponse } from '@/types/api';

export const homeworkApi = {
  analyzeHomework: async (images: File[], studentId?: number): Promise<HomeworkAnalysisRecord> => {
    const formData = new FormData();
    images.forEach((image) => {
      formData.append('images', image);
    });
    if (studentId) {
      formData.append('studentId', String(studentId));
    }

    const response = await axiosInstance.post<ApiResponse<HomeworkAnalysisRecord>>('/homework/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  },

  savePdfUrl: async (id: number, pdfUrl: string): Promise<HomeworkAnalysisRecord> => {
    const response = await axiosInstance.post<ApiResponse<HomeworkAnalysisRecord>>(`/homework/${id}/save-pdf`, { pdfUrl });
    return response.data.data;
  },
};
