# 学生列表空数据 Bug 排查记录

**日期**：2026-06-27
**涉及模块**：前端（Dashboard 工作台、学生管理）、API 拦截器
**严重程度**：高（核心功能不可用）
**状态**：已解决

---

## 一、问题现象

1. Dashboard 工作台「我的学生」统计显示 **0 人**
2. 学生管理页面表格显示「暂无数据」
3. 数据库中实际有 3 名学生（李明、王芳、余少杰），均关联到 teacher1

---

## 二、排查过程

### 阶段一：验证后端数据层

1. 直接查询 MySQL 数据库，确认 `student` 表有 3 条记录，`tutor_id=1`，`deleted=0`，`status=active`
2. 数据完全正常，排除数据库层问题

### 阶段二：验证后端 API 层

1. 用 `teacher1` / `123456` 登录 `/api/auth/login`，成功获取 token
2. 用该 token 请求 `/api/students`，返回 `code:200, data.total:3, data.items:[3名学生]`
3. API 响应结构完全正确，排除后端层问题

### 阶段三：排查端口与代理（走的弯路）

1. 发现 3000 端口被一个昨晚启动的旧 node 进程（PID 19528）占用
2. 我们启动的 Vite 退而求其次运行在 3001 端口
3. 怀疑浏览器访问的是旧服务，于是终止旧进程，重启 Vite 让它独占 3000 端口
4. 通过 3000 代理测试 API，成功返回 3 名学生
5. **但浏览器页面仍然显示空**——这一步是假阳性，误判了问题方向

### 阶段四：排查认证与拦截器（走的弯路）

1. 检查 axios 请求拦截器，确认 token 正确添加到 Authorization 头
2. 检查响应拦截器的 401 处理逻辑，发现当 `refreshToken` 为 null 时既不刷新也不登出的缺陷
3. 修复了 401 静默失败问题，但**页面仍然显示空**
4. 此时开始怀疑是前端取值路径问题

### 阶段五：诊断工具验证

1. 创建临时诊断页面 `diag.html`，用原生 fetch 绕过 React 应用直接测试
2. 4 个诊断步骤全部通过：登录成功、获取学生成功、token 有效、auth-storage 正常
3. **关键结论**：API、token、代理全部正常，问题一定在 React 应用内部

### 阶段六：定位根因

1. 对比组件取值路径 `data?.data?.items` 与 axios 响应结构
2. 发现响应拦截器 `return response` 返回了完整 axios response 对象
3. 导致数据多嵌套一层，组件取值路径错位
4. 修复后验证数据链路完全打通

---

## 三、根本原因

**问题代码**：[client.ts](file:///d:/AI/02-Frontend/web-frontend/src/api/client.ts) 响应拦截器

```typescript
// 修复前（错误）
axiosInstance.interceptors.response.use(
  (response) => {
    const res = response.data as ApiResponse;
    if (res.code !== 200) {
      message.error(res.message || '请求失败');
      return Promise.reject(new Error(res.message || '请求失败'));
    }
    if (!res.timestamp) {
      res.timestamp = Date.now();
    }
    return response;  // 错误：返回完整 axios response
  },
  ...
);
```

**数据嵌套层级错位**：

axios response 结构是 `{ data: { code, message, data:{ total, items } } }`，组件用 `data?.data?.items` 取值：

1. `data` 等于 axios response
2. `data.data` 等于 `{code, message, data:{...}}`
3. `data.data.items` 等于 **undefined**（items 实际在 `data.data.data.items`）

可选链 `?.` 让 undefined 静默通过，`|| []` 兜底成空数组，导致：

1. 没有报错
2. 没有异常
3. 没有 401
4. React Query 拿到"成功"的空响应
5. UI 正常渲染"暂无数据"

整个链路都在**正确地执行错误逻辑**，这是最隐蔽的 bug 类型。

---

## 四、解决方案

### 修复一：响应拦截器返回值

[client.ts](file:///d:/AI/02-Frontend/web-frontend/src/api/client.ts) 第 40 行：

```diff
- return response;   // 返回 axios response（多一层包装）
+ return res;        // 返回服务器 body（扁平化）
```

修复后拦截器返回 `{code, message, data}`，组件 `data?.data?.items` 取值路径正确对齐。

### 修复二：RegisterPage 同步调整

[RegisterPage.tsx](file:///d:/AI/02-Frontend/web-frontend/src/pages/Auth/RegisterPage.tsx) 第 40 行：

```diff
- login(response.data.data);
+ login(response.data);
```

### 修复三：401 拦截器缺陷补全

[client.ts](file:///d:/AI/02-Frontend/web-frontend/src/api/client.ts) 第 45-54 行：

```diff
  if (error.response?.status === 401 && !originalRequest._retry) {
    originalRequest._retry = true;

-   try {
-     const refreshToken = useAuthStore.getState().refreshToken;
-     if (refreshToken) {
-       // 刷新 token 逻辑
-     }
-   } catch (refreshError) {
-     // 登出跳转
-   }
+   const refreshToken = useAuthStore.getState().refreshToken;
+   if (!refreshToken) {
+     useAuthStore.getState().logout();
+     window.location.href = '/auth/login';
+     return Promise.reject(error);
+   }
+   try {
+     // 刷新 token 逻辑
+   } catch (refreshError) {
+     // 登出跳转
+   }
  }
```

避免 token 失效时静默失败，改为主动登出并跳转登录页。

---

## 五、影响范围

1. **StudentListPage**：学生管理列表显示空
2. **DashboardPage**：「我的学生」统计显示 0
3. **LessonHistoryPage**：备课历史列表显示空（同一 bug）
4. **RegisterPage**：注册后登录状态异常（修复二涉及）

所有使用 `data?.data?.items` 或 `response.data.data` 取值的页面均受影响。

---

## 六、经验总结

### 1. 排查顺序反思

本次排查走了弯路，按以下顺序进行：

1. 数据库（正常）
2. 后端 API（正常）
3. 端口与代理（误判方向）
4. 认证与拦截器（部分修复但非根因）
5. 诊断工具（确认问题在 React 内部）
6. 取值路径（定位根因）

**正确的排查顺序应该是**：

1. 先打印 `useQuery` 的 `data` 看真实结构
2. 对比取值路径与数据结构
3. 定位嵌套层级问题

### 2. 静默失败的特征

本次 bug 属于"静默失败"类型，特征是：

1. 所有传统诊断手段显示"一切正常"
2. 数据库、API、代理、token 全部正常
3. 浏览器 Network 面板请求显示 200 成功
4. 但页面数据为空

遇到此类问题，优先怀疑前端取值逻辑而非网络层。

### 3. 架构规范沉淀

axios 响应拦截器的返回值必须有明确约定：

1. 统一返回服务器 body（`{code, message, data}`）
2. 组件统一用 `data?.data?.xxx` 取值
3. 拦截器与组件取值路径必须文档化对齐

已记入 [project_memory.md](file:///c:/Users/16685/.trae-cn/memory/projects/-d-AI/project_memory.md) 防止复发。

---

## 七、涉及文件清单

| 文件 | 修改内容 |
|------|----------|
| [client.ts](file:///d:/AI/02-Frontend/web-frontend/src/api/client.ts) | 响应拦截器返回值改为 `res`，401 处理逻辑补全 |
| [RegisterPage.tsx](file:///d:/AI/02-Frontend/web-frontend/src/pages/Auth/RegisterPage.tsx) | 登录数据取值层级调整 |

---

## 八、验证结果

修复后通过 PowerShell 模拟前端完整数据链路验证：

1. 登录成功，token 获取正常
2. 学生 API 响应：`code=200, data.total=3, data.items 数量=3`
3. 组件取值路径：`data.data.items` 等于学生列表（3 名学生）
4. 学生名单：余少杰（初二）、李明（初三）、王芳（初二）

浏览器刷新后，Dashboard 工作台与学生管理页面均正常显示数据。
