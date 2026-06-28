export interface HomeworkAnalysisRecord {
  id: number;
  wrongQuestions: string;
  errorAnalysis: string;
  knowledgePoints: string;
  suggestions: string;
  pdfUrl?: string;
  createdAt: string;
}

export interface HomeworkAnalyzeRequest {
  images: File[];
}
