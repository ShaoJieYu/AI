# 前端快速启动指南

**模块**: Web 端应用 | **框架**: React 18 + TypeScript + Vite | **更新**: 2026-03-25

> ⚡ 3步启动，5分钟开始开发

---

## 前置要求

### 系统要求
- **Node.js**: 18.0+ (推荐 18.19.0 或 20.x)
- **npm**: 9.0+ 或 yarn/pnpm
- **操作系统**: Windows / macOS / Linux

### 验证环境
```bash
node --version    # 应该是 18+ 或 20+
npm --version     # 应该是 9+
```

---

## 🚀 3步快速启动

### Step 1: 进入前端目录 (30秒)
```bash
cd web-frontend
```

### Step 2: 安装依赖 (2-3分钟)
```bash
npm install
# 或使用pnpm/yarn
pnpm install
yarn install
```

**预期输出**:
```
added 300+ packages in 2m
```

### Step 3: 启动开发服务器 (30秒)
```bash
npm run dev
```

**预期输出**:
```
  VITE v5.0.12

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

✅ **完成！** 打开浏览器访问 http://localhost:5173

---

## 常见问题

### Q1: 启动时报错 "Cannot find module"
**原因**: Node modules 未正确安装

**解决**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Q2: "localhost:5173 无法连接"
**原因**: 开发服务器未启动或被占用

**解决**:
```bash
# 检查进程
netstat -an | grep 5173

# 如果被占用，使用其他端口
npm run dev -- --port 5174
```

### Q3: 编译错误 "TS1005: ... expected"
**原因**: TypeScript版本不兼容或配置问题

**解决**:
```bash
npm install typescript@5.3.3 --save-dev
```

### Q4: HMR (Hot Module Replacement) 不工作
**原因**: Vite配置问题，常见于 WSL/Docker

**解决**: 编辑 `vite.config.ts`:
```typescript
export default {
  server: {
    hmr: {
      host: 'localhost',
      port: 5173,
    }
  }
}
```

### Q5: Tailwind CSS 样式未加载
**原因**: PostCSS 配置缺失

**解决**:
```bash
# 重新安装依赖
npm install -D tailwindcss postcss autoprefixer
npm run dev
```

---

## 常用命令

| 命令 | 作用 |
|------|------|
| `npm run dev` | 启动开发服务器 (热更新) |
| `npm run build` | 生产构建 (优化压缩) |
| `npm run preview` | 预览生产构建 |
| `npm run lint` | 检查代码规范 |
| `npm run lint:fix` | 自动修复代码规范 |
| `npm run test` | 运行单元测试 |

---

## 构建输出

### 开发构建
```bash
npm run dev
```
- 生成未压缩的文件
- 热模块更新 (HMR)
- Source maps 完整

### 生产构建
```bash
npm run build
```
- 输出目录: `dist/`
- 文件: `dist/index.html` 和 JS/CSS 包
- 自动压缩和优化
- 生成 source maps (可用于调试)

**预期输出**:
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js (主应用包)
│   ├── vendor-[hash].js (第三方库)
│   └── index-[hash].css (样式)
└── [其他静态资源]
```

---

## 项目结构

```
web-frontend/
├── src/
│   ├── components/        # React 组件
│   ├── pages/            # 页面级组件
│   ├── services/         # API调用和业务逻辑
│   ├── stores/           # Zustand 状态管理
│   ├── styles/           # 全局样式
│   ├── types/            # TypeScript 类型定义
│   ├── utils/            # 工具函数
│   ├── App.tsx           # 主应用组件
│   └── main.tsx          # 入口文件
│
├── public/               # 静态资源
├── vite.config.ts        # Vite 配置
├── tsconfig.json         # TypeScript 配置
├── tailwind.config.js    # Tailwind CSS 配置
├── postcss.config.js     # PostCSS 配置
└── package.json          # 依赖和脚本
```

---

## 技术栈速查

| 技术 | 用途 | 学习资源 |
|------|------|---------|
| **React 18** | UI 框架 | [react.dev](https://react.dev) |
| **TypeScript** | 类型安全 | [typescriptlang.org](https://www.typescriptlang.org) |
| **Vite** | 构建工具 | [vitejs.dev](https://vitejs.dev) |
| **React Router** | 路由管理 | [reactrouter.com](https://reactrouter.com) |
| **Zustand** | 状态管理 | [zustand-demo.pmnd.rs](https://zustand-demo.pmnd.rs) |
| **React Query** | 服务端状态 | [tanstack.com/query](https://tanstack.com/query) |
| **Ant Design** | UI 组件库 | [ant.design](https://ant.design) |
| **Tailwind CSS** | 样式方案 | [tailwindcss.com](https://tailwindcss.com) |
| **Axios** | HTTP 客户端 | [axios-http.com](https://axios-http.com) |

---

## 开发建议

### 调试技巧
1. **浏览器DevTools**: F12 打开，检查 Console 和 Network
2. **React DevTools**: 安装浏览器插件，检查组件树和状态
3. **TypeScript 严格模式**: `tsconfig.json` 中开启 `strict: true`

### 性能优化
- 使用 `React.memo` 避免不必要的重新渲染
- 使用 `lazy` 和 `Suspense` 实现代码分割
- 在 Zustand store 中使用 selector 避免状态穿透

### 代码规范
- ESLint 检查: `npm run lint`
- Prettier 格式化: `npm run lint:fix`
- Pre-commit hooks: husky 自动检查

---

## 与后端集成

### API 基础配置
编辑 `src/services/api.ts`:
```typescript
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// 请求拦截器 - 添加认证token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 环境变量配置
创建 `.env.local`:
```env
VITE_API_URL=http://localhost:8080
VITE_AI_SERVICE_URL=http://localhost:8001
```

使用:
```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

---

## 部署

### 构建优化
```bash
npm run build
```

### 静态服务器测试
```bash
npm run preview
```

### 生产部署
1. 将 `dist/` 目录上传到 Web 服务器
2. 配置服务器重定向所有请求到 `index.html` (单页应用)
3. 配置 CDN 加速 (可选)

### Nginx 配置示例
```nginx
server {
  listen 80;
  server_name your-domain.com;
  
  root /var/www/html/dist;
  index index.html;
  
  location / {
    try_files $uri /index.html;
  }
}
```

---

## 下一步

- 详细架构: [frontend/ARCHITECTURE.md](../frontend/ARCHITECTURE.md)
- 组件规范: [frontend/COMPONENTS.md](../frontend/COMPONENTS.md)
- API集成: [frontend/API-CLIENT.md](../frontend/API-CLIENT.md)
- 项目状态: [00-PROJECT-STATUS.md](../00-PROJECT-STATUS.md)

---

## 获得帮助

- **文档导航**: [docs/README.md](./README.md)
- **项目状态**: [00-PROJECT-STATUS.md](./00-PROJECT-STATUS.md)
- **常见问题**: 本文档的"常见问题"部分
