export interface Student {
  id: number;
  tutorId: number;
  name: string;
  gender?: string;
  age?: number;
  grade: string;
  school?: string;
  currentSubject?: string;
  weakSubjects?: string;
  learningBasics?: string;
  studyHabits?: string;
  personality?: string;
  photoUrl?: string;
  parentName?: string;
  parentContact?: string;
  status: 'active' | 'paused' | 'finished';
  tags?: string;
  remark?: string;
  midtermTarget?: number;
  knowledgeMastery?: number;
  homeworkCompletion?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfile {
  id: number;
  studentId: number;
  academicLevel: 'excellent' | 'good' | 'medium' | 'weak';
  weakSubjects: string[];
  weakKnowledge: string[];
  studyHabits: {
    focusDuration: number;
    homeworkCompletion: 'good' | 'medium' | 'poor';
    noteTaking: 'good' | 'medium' | 'poor';
  };
  personality: {
    introverted: boolean;
    active: boolean;
    cautious: boolean;
    description?: string;
  };
  specialNeeds?: string;
  goals: {
    shortTerm: string;
    mediumTerm: string;
    longTerm: string;
    priority: 'score' | 'interest' | 'habit';
  };
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic';
  attentionLevel?: 'high' | 'medium' | 'low';
}

export interface TeachingGoal {
  id: number;
  studentId: number;
  goalType: 'short' | 'medium' | 'long';
  targetScore?: number;
  targetDate?: string;
  description: string;
  priority: 'high' | 'normal' | 'low';
  status: 'pending' | 'achieved' | 'abandoned';
  achievedAt?: string;
  createdAt: string;
}

export interface CreateStudentRequest {
  name: string;
  gender?: string;
  age?: number;
  grade: string;
  school?: string;
  currentSubject: string;
  weakSubjects?: string;
  learningBasics?: string;
  studyHabits?: string;
  personality?: string;
  photoUrl?: string;
  parentName?: string;
  parentContact?: string;
  tags?: string;
  remark?: string;
  midtermTarget?: number;
  knowledgeMastery?: number;
  homeworkCompletion?: number;
}

export interface UpdateStudentRequest extends Partial<CreateStudentRequest> {
  status?: 'active' | 'paused' | 'finished';
}

// 学生薄弱知识点（阶段 2b-1）
export interface StudentWeakPoint {
  id: number;
  studentId: number;
  subject: string;
  knowledgePoint: string;
  masteryLevel: 'WEAK' | 'MEDIUM' | 'STRONG';
  source: 'ERROR_ANALYSIS' | 'MANUAL';
  sourceId?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
