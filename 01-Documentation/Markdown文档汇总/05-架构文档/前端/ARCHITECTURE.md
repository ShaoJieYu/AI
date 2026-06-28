# 前端架构设计

**模块**: Web 应用 | **框架**: React 18 + TypeScript + Vite | **更新**: 2026-03-25

> 本文档描述前端应用的架构设计、目录结构和最佳实践

---

## 架构概览

```
┌──────────────────────────────────────────────┐
│       浏览器 (Vite Dev Server + HMR)         │
│         http://localhost:5173                │
└──────────────────────────────────────────────┘
                      │
┌──────────────────────────────────────────────┐
│           应用层 (React Components)          │
│   ┌─────────────┐  ┌─────────────┐         │
│   │ Pages       │  │ Components  │         │
│   │ (页面组件)   │  │ (基础组件)   │         │
│   └─────────────┘  └─────────────┘         │
│          │              │                  │
│   ┌──────────────────────────┐            │
│   │  状态管理层               │            │
│   │ (Zustand + React Query) │            │
│   └──────────────────────────┘            │
│          │                                │
│   ┌──────────────────────────┐            │
│   │  数据层 (API Services)    │            │
│   │ (Axios HTTP Client)      │            │
│   └──────────────────────────┘            │
└──────────────────────────────────────────────┘
                      │
            ┌─────────┴──────────┐
            ▼                    ▼
    ┌──────────────────┐  ┌──────────────────┐
    │ 后端 API        │  │  第三方服务      │
    │ :8080           │  │ (阿里通义千问等)  │
    └──────────────────┘  └──────────────────┘
```

---

## 目录结构

```
src/
├── components/              # 可复用组件
│   ├── Layout/             # 布局组件
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   ├── Forms/              # 表单组件
│   │   ├── LoginForm.tsx
│   │   └── LessonForm.tsx
│   ├── Cards/              # 卡片组件
│   │   ├── LessonCard.tsx
│   │   └── StudentCard.tsx
│   └── Common/             # 通用组件
│       ├── Loading.tsx
│       ├── Modal.tsx
│       └── Empty.tsx
│
├── pages/                   # 页面级组件
│   ├── Dashboard.tsx        # 仪表板
│   ├── Lessons/
│   │   ├── LessonList.tsx
│   │   └── LessonDetail.tsx
│   ├── Students/
│   │   ├── StudentList.tsx
│   │   └── StudentDetail.tsx
│   └── Settings/
│       └── ProfileSettings.tsx
│
├── services/                # API 调用和业务逻辑
│   ├── api.ts              # Axios 配置和公共方法
│   ├── authService.ts      # 认证相关 API
│   ├── lessonService.ts    # 备课相关 API
│   ├── studentService.ts   # 学生管理 API
│   └── aiService.ts        # AI 服务调用
│
├── stores/                  # Zustand 状态管理
│   ├── authStore.ts        # 用户认证状态
│   ├── lessonStore.ts      # 备课数据状态
│   └── uiStore.ts          # UI 状态 (加载、模态框等)
│
├── types/                   # TypeScript 类型定义
│   ├── user.ts             # 用户相关类型
│   ├── lesson.ts           # 备课相关类型
│   ├── student.ts          # 学生相关类型
│   └── api.ts              # API 响应类型
│
├── utils/                   # 工具函数
│   ├── format.ts           # 格式化函数
│   ├── validate.ts         # 验证函数
│   ├── storage.ts          # 本地存储封装
│   └── auth.ts             # 认证工具
│
├── styles/                  # 全局样式
│   ├── globals.css         # 全局样式
│   ├── tailwind.css        # Tailwind 导入
│   └── variables.css       # CSS 变量
│
├── App.tsx                  # 主应用组件（路由定义）
├── main.tsx                 # 应用入口
└── index.css                # 入口样式
```

---

## 核心技术栈

### React 组件最佳实践

#### 函数式组件 + Hooks
```typescript
import { useEffect, useState } from 'react';

export const LessonList = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    setLoading(true);
    try {
      const data = await lessonService.getAll();
      setLessons(data);
    } finally {
      setLoading(false);
    }
  };

  return <div>{/* 渲染 */}</div>;
};
```

#### TypeScript 类型定义
```typescript
// types/lesson.ts
export interface Lesson {
  id: string;
  subject: string;
  teachingGoal: string;
  difficulty: 'easy' | 'medium' | 'hard';
  content: string;
  createdAt: Date;
}

export interface LessonRequest {
  subject: string;
  teachingGoal: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  studentInfo?: Record<string, any>;
}
```

### 状态管理 (Zustand)

#### 用户认证状态
```typescript
// stores/authStore.ts
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  
  login: async (username, password) => {
    const { user, token } = await authService.login(username, password);
    localStorage.setItem('token', token);
    set({ user, token });
  },
  
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },
}));
```

#### 使用 Zustand
```typescript
export const LoginForm = () => {
  const { login } = useAuthStore();
  
  const handleSubmit = async (values: any) => {
    await login(values.username, values.password);
    // 自动更新全局状态，组件重新渲染
  };
  
  return <Form onFinish={handleSubmit} />;
};
```

### API 客户端集成

#### Axios 配置
```typescript
// services/api.ts
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 10000,
});

// 请求拦截器 - 添加 Token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 错误处理
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Token 过期，跳转登录
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

#### API 服务封装
```typescript
// services/lessonService.ts
import { apiClient } from './api';

export const lessonService = {
  // 获取备课列表
  getAll: () => apiClient.get<Lesson[]>('/lessons'),
  
  // 获取单个备课
  getById: (id: string) => apiClient.get<Lesson>(`/lessons/${id}`),
  
  // 创建备课
  create: (data: LessonRequest) => 
    apiClient.post<Lesson>('/lessons', data),
  
  // 更新备课
  update: (id: string, data: Partial<Lesson>) =>
    apiClient.put<Lesson>(`/lessons/${id}`, data),
  
  // 删除备课
  delete: (id: string) => apiClient.delete(`/lessons/${id}`),
};
```

### UI 组件库 (Ant Design)

```typescript
import { Button, Form, Input, Select, Card, Table } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

export const LessonForm = () => {
  return (
    <Card title="新增备课">
      <Form layout="vertical">
        <Form.Item label="学科">
          <Select placeholder="请选择学科">
            <Select.Option value="math">数学</Select.Option>
            <Select.Option value="english">英语</Select.Option>
          </Select>
        </Form.Item>
        
        <Form.Item label="教学目标">
          <Input.TextArea />
        </Form.Item>
        
        <Button type="primary" htmlType="submit">
          提交
        </Button>
      </Form>
    </Card>
  );
};
```

### 样式 (Tailwind CSS)

```typescript
// 使用 Tailwind 工具类
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
  <h2 className="text-xl font-bold text-gray-800">
    {title}
  </h2>
  <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
    操作
  </button>
</div>

// 响应式设计
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {lessons.map(lesson => <LessonCard key={lesson.id} lesson={lesson} />)}
</div>
```

---

## 路由设计

```typescript
// App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';

// 保护路由
const ProtectedRoute = ({ children }) => {
  const { token } = useAuthStore();
  return token ? children : <Navigate to="/login" />;
};

export const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* 公开路由 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* 保护路由 */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        
        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};
```

---

## 性能优化

### 代码分割
```typescript
import { lazy, Suspense } from 'react';

const LessonDetail = lazy(() => import('./pages/LessonDetail'));

<Routes>
  <Route
    path="/lessons/:id"
    element={
      <Suspense fallback={<Loading />}>
        <LessonDetail />
      </Suspense>
    }
  />
</Routes>
```

### 状态优化
```typescript
// 避免不必要的重新渲染
import { useShallow } from 'zustand/react/shallow';

const { user, token } = useAuthStore(
  useShallow(state => ({ user: state.user, token: state.token }))
);
```

### 记忆化
```typescript
import { useMemo, useCallback } from 'react';

const LessonList = ({ lessons }) => {
  // 记忆化计算
  const groupedLessons = useMemo(() => {
    return lessons.reduce((acc, lesson) => {
      // 分组逻辑
      return acc;
    }, {});
  }, [lessons]);
  
  // 记忆化回调
  const handleDelete = useCallback((id) => {
    lessonService.delete(id);
  }, []);
  
  return <div>{/* 渲染 */}</div>;
};
```

---

## 开发流程

### 添加新页面
1. 在 `pages/` 创建页面组件
2. 在 `App.tsx` 添加路由
3. 在 `stores/` 添加必要的状态
4. 在 `services/` 添加 API 调用
5. 在 `types/` 定义类型

### 添加新功能
1. 在 `components/` 创建组件
2. 在 `services/` 添加 API 调用
3. 在 `stores/` 管理状态
4. 在 `types/` 定义类型
5. 编写单元测试

---

## 测试

### 使用 Vitest
```typescript
// components/__tests__/LessonCard.test.tsx
import { render, screen } from '@testing-library/react';
import { LessonCard } from '../LessonCard';

describe('LessonCard', () => {
  it('renders lesson title', () => {
    const lesson = { id: '1', subject: '数学', teachingGoal: '测试' };
    render(<LessonCard lesson={lesson} />);
    expect(screen.getByText('数学')).toBeInTheDocument();
  });
});
```

---

## 相关文档

- [frontend/QUICK-START.md](./QUICK-START.md) - 快速启动
- [frontend/API-CLIENT.md](./API-CLIENT.md) - API 集成详解
- [frontend/COMPONENTS.md](./COMPONENTS.md) - 组件库规范
- [00-PROJECT-STATUS.md](../00-PROJECT-STATUS.md) - 项目状态

---

## 常见问题

**Q: 如何调用后端 API？**
A: 使用 `services/` 中的封装方法，例如 `lessonService.getAll()`

**Q: 如何管理全局状态？**
A: 使用 Zustand stores，创建可复用的 hook

**Q: 如何处理异步数据？**
A: 使用 React Query (@tanstack/react-query) 或 Zustand 的异步 action

**Q: 如何实现路由保护？**
A: 创建 `<ProtectedRoute>` 包装，检查 token 存在性

**Q: 样式如何组织？**
A: 优先使用 Tailwind 工具类，复杂样式在 CSS 模块中
