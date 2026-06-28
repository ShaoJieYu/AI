import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LessonPlan, LessonContent, LessonProgress } from '@/types/lesson';

interface LessonState {
  currentLesson: LessonPlan | null;
  lessons: LessonPlan[];
  draftContent: Partial<LessonContent> | null;
  isGenerating: boolean;
  generationProgress: LessonProgress | null;
  total: number;

  setCurrentLesson: (lesson: LessonPlan | null) => void;
  setLessons: (lessons: LessonPlan[], total: number) => void;
  setDraftContent: (content: Partial<LessonContent> | null) => void;
  updateDraft: (content: Partial<LessonContent>) => void;
  startGeneration: () => void;
  updateProgress: (progress: LessonProgress) => void;
  resetGeneration: () => void;
  addLesson: (lesson: LessonPlan) => void;
  updateLesson: (id: number, lesson: Partial<LessonPlan>) => void;
  removeLesson: (id: number) => void;
}

export const useLessonStore = create<LessonState>()(
  persist(
    (set) => ({
      currentLesson: null,
      lessons: [],
      draftContent: null,
      isGenerating: false,
      generationProgress: null,
      total: 0,

      setCurrentLesson: (lesson) => set({ currentLesson: lesson }),

      setLessons: (lessons, total) => set({ lessons, total }),

      setDraftContent: (content) => set({ draftContent: content }),

      updateDraft: (content) =>
        set((state) => ({
          draftContent: state.draftContent
            ? { ...state.draftContent, ...content }
            : content,
        })),

      startGeneration: () =>
        set({ isGenerating: true, generationProgress: null }),

      updateProgress: (progress) =>
        set({ generationProgress: progress, isGenerating: progress.status === 'generating' }),

      resetGeneration: () =>
        set({ isGenerating: false, generationProgress: null }),

      addLesson: (lesson) =>
        set((state) => ({
          lessons: [lesson, ...state.lessons],
          total: state.total + 1,
        })),

      updateLesson: (id, lessonData) =>
        set((state) => ({
          lessons: state.lessons.map((l) =>
            l.id === id ? { ...l, ...lessonData } : l
          ),
          currentLesson:
            state.currentLesson?.id === id
              ? { ...state.currentLesson, ...lessonData }
              : state.currentLesson,
        })),

      removeLesson: (id) =>
        set((state) => ({
          lessons: state.lessons.filter((l) => l.id !== id),
          total: state.total - 1,
          currentLesson:
            state.currentLesson?.id === id ? null : state.currentLesson,
        })),
    }),
    {
      name: 'lesson-storage',
      partialize: (state) => ({
        draftContent: state.draftContent,
      }),
    }
  )
);
