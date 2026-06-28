# 智能备课平台 Web 端

> 全自动家教备课平台的 Web 端应用，基于 React 18 + TypeScript + Ant Design + Tailwind CSS 构建。

## 技术栈

- **框架**: React 18.x + TypeScript 5.x
- **路由**: React Router DOM 6.x
- **状态管理**: Zustand 4.x (全局状态) + React Query 5.x (服务端状态)
- **UI 组件**: Ant Design 5.x
- **样式**: Tailwind CSS 3.x
- **构建工具**: Vite 5.x
- **HTTP 客户端**: Axios
- **日期处理**: Day.js

## 项目结构

```
web-frontend/
├── src/
│   ├── api/                    # API 接口封装
│   │   ├── client.ts          # Axios 实例配置
│   │   ├── auth.ts            # 认证相关 API
│   │   ├── student.ts         # 学生管理 API
│   │   └── lesson.ts         # 备课相关 API
│   ├── components/            # 组件库
│   │   └── layout/           # 布局组件
│   ├── hooks/                 # 自定义 Hooks
│   ├── pages/                 # 页面组件
│   │   ├── Auth/             # 认证页面
│   │   ├── Dashboard/        # 工作台
│   │   ├── Students/          # 学生管理
│   │   ├── Lesson/           # 备课相关
│   │   ├── Resources/        # 教学资源
│   │   ├── Progress/         # 进度跟踪
│   │   └── Settings/         # 设置页面
│   ├── stores/                # Zustand 状态管理
│   ├── styles/               # 全局样式
│   ├── types/                # TypeScript 类型定义
│   ├── utils/                # 工具函数
│   ├── App.tsx               # 根组件
│   └── main.tsx              # 入口文件
├── public/                   # 静态资源
├── index.html                # HTML 模板
├── package.json              # 依赖配置
├── tsconfig.json             # TypeScript 配置
├── vite.config.ts           # Vite 配置
├── tailwind.config.js       # Tailwind CSS 配置
└── postcss.config.js        # PostCSS 配置
```

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
```

### 代码检查

```bash
# 检查代码
npm run lint

# 自动修复
npm run lint:fix
```

## 功能模块

### 1. 认证模块
- [x] 手机号 + 验证码登录
- [x] 密码登录
- [x] 用户注册
- [x] JWT Token 管理
- [x] 路由守卫

### 2. 工作台
- [x] 统计概览
- [x] 快速入口
- [x] 最近备课
- [x] 我的学生

### 3. 学生管理
- [x] 学生列表
- [x] 添加学生
- [x] 编辑学生
- [x] 学生详情
- [x] 学情分析
- [x] 教学目标

### 4. 智能备课
- [x] 新建备课向导
- [x] AI 备课生成
- [x] 备课详情
- [x] 教案查看
- [x] 备课历史
- [x] 导出功能 (PDF/Word)
- [ ] 编辑功能

### 5. 教学资源
- [ ] 知识点库
- [ ] 教学模板
- [ ] 题型库
- [ ] 搜索功能

### 6. 教学进度
- [ ] 课程安排
- [ ] 进度跟踪
- [ ] 学习报告

### 7. 设置
- [x] 个人资料
- [x] 账号安全
- [ ] 通知设置

## API 代理配置

开发环境下，API 请求通过 Vite 代理到后端服务。配置见 `vite.config.ts`:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
  },
},
```

## 环境变量

创建 `.env.local` 文件:

```env
VITE_API_BASE_URL=/api
```

## 设计规范

### 色彩系统

主色调使用 Tailwind CSS 的 Indigo 色系 (`#6366F1`)。

### 布局

- 使用 Ant Design Layout 组件
- 侧边栏宽度: 240px (展开) / 80px (折叠)
- 内容区域: 自适应宽度
- 页面内边距: 24px

### 响应式断点

| 断点 | 宽度 | 设备 |
|------|------|------|
| xs | < 576px | 手机 |
| sm | 576-768px | 平板竖屏 |
| md | 768-992px | 平板横屏 |
| lg | 992-1200px | 笔记本 |
| xl | 1200px+ | 桌面 |

## 相关文档

- [需求文档](../requirements/README.md)
- [设计文档](../DESIGN.md)
- [项目计划](../PLAN.md)

## License

MIT
