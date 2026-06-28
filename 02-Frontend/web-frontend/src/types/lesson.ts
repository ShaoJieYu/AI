/**
 * 备课相关类型定义
 * 字段与后端 LessonPlan / LessonContent 模型严格对齐
 */

// 备课模式（对齐后端 generateType 字段）
export type LessonMode = 'new_lesson' | 'exercise' | 'review' | 'remedial' | 'advanced' | 'preview';

// 备课状态（对齐后端 status 字段）
export type LessonStatus = 'generating' | 'completed' | 'failed';

// 备课内容类型（五段式）
export type LessonContentType =
  | 'core_definition'      // 教材核心原文
  | 'teaching_analysis'    // 教学深度剖析
  | 'mistake_warnings'     // 易错点拨
  | 'score_boosting'       // 提分技巧
  | 'example_derivation';  // 经典例题推导

/**
 * 备课计划（对齐后端 LessonPlan 模型）
 */
export interface LessonPlan {
  id: number;
  tutorId: number;
  studentId: number | null;
  title: string;
  subject: string;
  grade: string | null;
  teachingGoal: string;        // 教学目标（前端表单字段名为 topic）
  difficulty: string;          // 难度文字描述：基础 / 中等 / 提高
  estimatedDuration: string;   // 预计时长（字符串形式存储，如 "60"）
  status: LessonStatus;
  generateType: LessonMode;    // 备课模式（前端表单字段名为 mode）
  aiModel: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 备课内容条目（对齐后端 LessonContent 模型）
 * 一个 LessonPlan 对应多条 LessonContent，按 sortOrder 升序展示
 */
export interface LessonContent {
  id: number;
  lessonPlanId: number;
  contentType: LessonContentType;
  title: string;
  content: string;             // Markdown 格式文本，支持 LaTeX 公式
  sortOrder: number;
  metadata: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 生成备课请求（对齐后端 LessonGenerateRequest DTO）
 * 注意：表单字段名与 LessonPlan 字段名不同，后端会做映射
 */
export interface GenerateLessonRequest {
  studentId: number | null;
  subject: string;
  topic: string;               // 教学目标 → 后端 teachingGoal
  mode: LessonMode;            // 备课模式 → 后端 generateType
  duration: number;            // 课程时长（分钟）→ 后端 estimatedDuration
  difficulty: number;          // 难度星级 1-5 → 后端 difficulty 字符串
  customRequirements?: string; // 教学备注与教材信息
}

export interface LessonProgress {
  lessonId: number;
  status: LessonStatus;
  progress: number;
  stage: 'analyzing' | 'generating' | 'reviewing';
  message: string;
  estimatedTime?: number;
}

export interface LessonFeedback {
  id: number;
  lessonId: number;
  userId: number;
  rating: number;
  accuracyRating?: number;
  usefulnessRating?: number;
  feedback?: string;
  improvementSuggestions?: string;
  createdAt: string;
}

// 备课模式中文标签
export const LESSON_MODE_LABELS: Record<LessonMode, string> = {
  new_lesson: '新课讲解',
  exercise: '习题讲解',
  review: '考前复习',
  remedial: '查漏补缺',
  advanced: '培优拔高',
  preview: '假期预习',
};

// 备课状态中文标签
export const LESSON_STATUS_LABELS: Record<LessonStatus, string> = {
  generating: '生成中',
  completed: '已完成',
  failed: '生成失败',
};

// 五段式内容类型 → 中文标题
export const LESSON_CONTENT_TYPE_LABELS: Record<LessonContentType, string> = {
  core_definition: '教材核心原文',
  teaching_analysis: '教学深度剖析',
  mistake_warnings: '易错点拨',
  score_boosting: '提分技巧',
  example_derivation: '经典例题推导',
};

// 五段式内容类型 → 标签颜色（Ant Design Tag color）
export const LESSON_CONTENT_TYPE_COLORS: Record<LessonContentType, string> = {
  core_definition: 'blue',
  teaching_analysis: 'cyan',
  mistake_warnings: 'red',
  score_boosting: 'orange',
  example_derivation: 'purple',
};

// 五段式内容类型 → 图标颜色（用于详情页分区图标着色）
export const LESSON_CONTENT_TYPE_ICON_COLORS: Record<LessonContentType, string> = {
  core_definition: '#1677ff',
  teaching_analysis: '#08979c',
  mistake_warnings: '#cf1322',
  score_boosting: '#d46b08',
  example_derivation: '#722ed1',
};

// 五段式默认排序
export const LESSON_CONTENT_TYPE_ORDER: LessonContentType[] = [
  'core_definition',
  'teaching_analysis',
  'mistake_warnings',
  'score_boosting',
  'example_derivation',
];

export const GRADE_OPTIONS = [
  '小一', '小二', '小三', '小四', '小五', '小六',
  '初一', '初二', '初三',
  '高一', '高二', '高三',
];

export const SUBJECT_OPTIONS = [
  '语文', '数学', '英语',
  '物理', '化学', '生物',
  '政治', '历史', '地理',
];
