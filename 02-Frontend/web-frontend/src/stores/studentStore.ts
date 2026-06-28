import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Student } from '@/types/student';

interface StudentState {
  currentStudent: Student | null;
  students: Student[];
  total: number;

  setCurrentStudent: (student: Student | null) => void;
  setStudents: (students: Student[], total: number) => void;
  addStudent: (student: Student) => void;
  updateStudent: (id: number, student: Partial<Student>) => void;
  removeStudent: (id: number) => void;
}

export const useStudentStore = create<StudentState>()(
  persist(
    (set) => ({
      currentStudent: null,
      students: [],
      total: 0,

      setCurrentStudent: (student) => set({ currentStudent: student }),

      setStudents: (students, total) => set({ students, total }),

      addStudent: (student) =>
        set((state) => ({
          students: [student, ...state.students],
          total: state.total + 1,
        })),

      updateStudent: (id, studentData) =>
        set((state) => ({
          students: state.students.map((s) =>
            s.id === id ? { ...s, ...studentData } : s
          ),
          currentStudent:
            state.currentStudent?.id === id
              ? { ...state.currentStudent, ...studentData }
              : state.currentStudent,
        })),

      removeStudent: (id) =>
        set((state) => ({
          students: state.students.filter((s) => s.id !== id),
          total: state.total - 1,
          currentStudent:
            state.currentStudent?.id === id ? null : state.currentStudent,
        })),
    }),
    {
      name: 'student-storage',
    }
  )
);
