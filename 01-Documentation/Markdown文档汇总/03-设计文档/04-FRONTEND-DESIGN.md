# 前端架构设计

📌 **文档概述**：本文档详细介绍了全自动家教备课平台前端的整体架构，包括 Web 端项目结构、状态管理方案、组件设计原则。采用 React 18 + TypeScript + Zustand 的现代技术栈，实现高效的数据流管理和组件复用。

⏱️ **阅读时间**：10-12 分钟  
🎯 **适用场景**：前端开发、项目初始化、组件设计、状态管理实现

## 目录

- [Web 端项目结构](#web-端项目结构)
- [状态管理方案](#状态管理方案)

---

## Web 端项目结构

```
web-frontend/
├── src/
│   ├── api/                         # API 客户端
│   │   ├── client.ts               # Axios 实例配置
│   │   ├── auth.ts                 # 认证 API
│   │   ├── student.ts              # 学生管理 API
│   │   ├── lesson.ts               # 备课 API
│   │   └── types.ts                # API 类型定义
│   ├── components/                 # 组件库
│   │   ├── common/                 # 通用组件
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Modal/
│   │   │   └── Loading/
│   │   ├── student/                # 学生相关组件
│   │   ├── lesson/                 # 备课相关组件
│   │   └── layout/                 # 布局组件
│   ├── pages/                      # 页面组件
│   │   ├── Dashboard/              # 工作台
│   │   ├── Students/               # 学生管理
│   │   │   ├── StudentList.tsx
│   │   │   ├── StudentDetail.tsx
│   │   │   └── StudentForm.tsx
│   │   ├── LessonPlan/             # 备课页面
│   │   │   ├── LessonGenerate.tsx
│   │   │   ├── LessonDetail.tsx
│   │   │   └── LessonEditor.tsx
│   │   └── Settings/               # 设置页面
│   ├── stores/                     # 状态管理 (Zustand)
│   │   ├── authStore.ts
│   │   ├── studentStore.ts
│   │   └── lessonStore.ts
│   ├── hooks/                      # 自定义 Hooks
│   │   ├── useAuth.ts
│   │   ├── useStudent.ts
│   │   └── useLesson.ts
│   ├── utils/                      # 工具函数
│   │   ├── request.ts              # 请求封装
│   │   ├── storage.ts              # 本地存储
│   │   └── format.ts               # 格式化工具
│   ├── types/                      # TypeScript 类型
│   │   ├── student.ts
│   │   ├── lesson.ts
│   │   └── api.ts
│   └── styles/                     # 样式文件
│       ├── global.css
│       └── variables.css
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## 状态管理方案

```typescript
// Zustand Store 示例 - 备课Store
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LessonState {
  currentLesson: Lesson | null;
  draftContent: Partial<LessonContent> | null;
  isGenerating: boolean;
  generationProgress: number;

  // Actions
  setCurrentLesson: (lesson: Lesson | null) => void;
  updateDraft: (content: Partial<LessonContent>) => void;
  startGeneration: () => void;
  updateProgress: (progress: number) => void;
  resetGeneration: () => void;
}

export const useLessonStore = create<LessonState>()(
  persist(
    (set) => ({
      currentLesson: null,
      draftContent: null,
      isGenerating: false,
      generationProgress: 0,

      setCurrentLesson: (lesson) => set({ currentLesson: lesson }),

      updateDraft: (content) =>
        set((state) => ({
          draftContent: { ...state.draftContent, ...content },
        })),

      startGeneration: () =>
        set({ isGenerating: true, generationProgress: 0 }),

      updateProgress: (progress) => set({ generationProgress: progress }),

      resetGeneration: () =>
        set({ isGenerating: false, generationProgress: 0 }),
    }),
    {
      name: 'lesson-storage',
      partialize: (state) => ({ draftContent: state.draftContent }),
    }
  )
);
```

---

🔗 **相关文档链接**：
- [API 接口设计](./03-API-DESIGN.md) - 前端与后端 API 的通信契约
- [系统架构设计](../design/01-ARCHITECTURE-DESIGN.md) - 前端在整体架构中的位置
- [数据库设计](./02-DATABASE-DESIGN.md) - 数据模型参考

📚 **返回导航**：[返回设计文档首页](./README.md)
