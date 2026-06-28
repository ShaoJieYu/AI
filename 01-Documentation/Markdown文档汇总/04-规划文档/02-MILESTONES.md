# 开发阶段规划与里程碑

📌 **文档概述**  
本文档详细描述了全自动家教备课平台的开发时间规划，包括 Phase 1-4 的周详工作任务、关键路径、交付物和成功指标。这是项目经理和技术团队用于制定冲刺计划（Sprint Planning）和跟踪项目进度的重要参考。

⏱️ **阅读时间**  
20-25 分钟

🎯 **适用场景**  
- 项目经理制定周工作计划
- 技术主管评估开发进度
- 团队成员了解当前阶段目标
- 利益相关者跟踪项目里程碑

---

## 开发周期总览

### 全项目时间规划

| Phase | 阶段名称 | 周期 | 交付物 | 目标用户规模 | 成功指标 |
|-------|---------|------|-------|------------|--------|
| **Phase 1** | MVP 基础验证 | 第 1-4 周 | Web MVP、后端核心 API | 内部测试 | 核心功能可用 |
| **Phase 2** | 多端扩展 | 第 5-8 周 | Flutter App、Taro 小程序 | Beta 用户 100+ | 三端同步正常 |
| **Phase 3** | 体验优化 | 第 9-12 周 | 完善版本、生产就绪 | 小范围公测 | AI 准确率 > 85% |
| **Phase 4** | 商业化运营 | 第 13+ 周 | 运营优化、市场推广 | 正式商用 | DAU 1000+、MAU 5000+ |

---

## Phase 1: MVP 基础验证（第 1-4 周）

### 目标
验证核心功能可行性，完成 Web 端 MVP 和后端基础 API，建立 AI 备课的可运行版本。

### 关键路径
```
Week 1: 基础架构
  ├─ 前端脚手架 → 后端项目初始化 → DevOps 环境
  └─ 完成: CI/CD 流水线能自动构建和部署

Week 2: 认证和学生管理
  ├─ 认证 API + Web UI → 学生管理 API + Web UI
  └─ 完成: 教师能登录、创建和管理学生

Week 3: AI 备课核心（关键）
  ├─ 大模型集成 → Prompt 设计 → Milvus 向量库
  └─ 完成: 能生成基础教案（准确率 > 80%）

Week 4: 教案编辑和导出
  ├─ 编辑器 UI → 导出功能 → 版本管理
  └─ 完成: MVP 版本可交付
```

### Week 1: 项目初始化与基础架构

#### 前端开发任务
**目标**: 搭建 React 开发环境，配置基础工程化工具

```
【项目脚手架搭建】
- [ ] 使用 Vite 创建 React 18 项目
- [ ] 配置 TypeScript 5.x
- [ ] 配置 ESLint + Prettier 代码规范
- [ ] 配置 Husky Git Hooks（提交前检查代码）
- [ ] 配置 Tailwind CSS 样式框架
- [ ] 集成 Ant Design 5.x 组件库
- [ ] 配置 Zustand 全局状态管理
- [ ] 配置 React Query 服务端状态管理

【基础布局组件】
- [ ] App 外壳（Header + Sidebar + Content）
- [ ] 响应式侧边栏导航
- [ ] 顶部导航栏（用户菜单、通知）
- [ ] Tailwind 响应式布局

【基础 UI 组件】
- [ ] Button（各种尺寸和状态）
- [ ] Input（文本、密码、搜索）
- [ ] Modal（对话框）
- [ ] Loading（加载状态）
- [ ] Notification（通知提示）
- [ ] Empty（空状态）
```

**交付物**: 
- 项目可正常启动 `npm run dev`
- 可构建生产版本 `npm run build`
- ESLint 检查通过，Prettier 格式统一

#### 后端开发任务
**目标**: 搭建 Spring Boot 微服务框架，配置基础设施

```
【Spring Boot 项目初始化】
- [ ] 创建 Spring Boot 3.2 项目（Java 21）
- [ ] 配置 Spring Data JPA + MyBatis-Plus
- [ ] 配置 Spring Security + JWT
- [ ] 配置 Nacos 配置中心连接
- [ ] 配置 Spring Cloud Gateway API 网关
- [ ] 配置日志系统（Logback）

【基础架构搭建】
- [ ] 全局异常处理 (@ControllerAdvice)
- [ ] 统一 API 响应格式 (ApiResponse<T>)
- [ ] RequestId 追踪（MDC）
- [ ] 日志配置（INFO / DEBUG / ERROR）
- [ ] 代码生成工具配置（Mybatis-Plus Generator）

【数据库初始化】
- [ ] 用户表实体设计
- [ ] 学生表实体设计
- [ ] 数据库初始化脚本（Flyway 或 Liquibase）
- [ ] 本地 MySQL 环境部署

【API 网关】
- [ ] 路由配置（路由到各个微服务）
- [ ] 请求转发
- [ ] 限流配置（初版可不实现）
```

**交付物**: 
- Spring Boot 应用可启动，访问 http://localhost:8080/health 返回 200
- API 文档可访问 http://localhost:8080/swagger-ui.html
- 本地 MySQL + Nacos 正常运行

#### DevOps 任务
**目标**: 搭建本地开发环境和 CI/CD 流水线

```
【开发环境搭建】
- [ ] Docker Compose 编写
  - MySQL 8.0 (root:root, database: lesson_platform)
  - Redis 7.x
  - Nacos 2.1.x (用户名密码 nacos:nacos)
- [ ] 本地开发环境启动脚本 (start-dev-env.sh)
- [ ] 本地开发环境文档编写

【CI/CD 流水线】
- [ ] GitHub Actions 工作流创建 (.github/workflows/ci.yml)
  - 代码检查 (Checkstyle / ESLint)
  - 单元测试执行
  - 构建 Docker 镜像
  - 镜像推送到 Docker Registry
- [ ] 环境变量配置（GitHub Secrets）
- [ ] 手工部署脚本（暂未自动化）
```

**交付物**: 
- `docker-compose up` 可启动完整开发环境
- 代码推送到 GitHub 自动触发 CI 流水线

#### Week 1 检查清单
- [ ] 前端项目可运行和构建
- [ ] 后端应用可启动，接口可访问
- [ ] 本地开发环境通过 Docker Compose 一键启动
- [ ] CI 流水线自动化正常工作

---

### Week 2: 用户与学生管理

#### 前端开发任务
```
【认证模块】
- [ ] 登录页面 UI
  - 手机号输入框
  - 密码输入框
  - 记住密码 checkbox
  - 登录按钮
- [ ] 注册页面 UI（分步表单）
- [ ] JWT Token 管理（Zustand store with localStorage persist）
- [ ] 路由守卫（React Router PrivateRoute）
- [ ] 登录状态检查（App 启动时验证 Token 有效性）

【学生管理模块】
- [ ] 学生列表页面
  - Ant Design Table 展示学生列表
  - 分页、排序功能
  - 搜索和筛选
  - 删除和编辑按钮
- [ ] 添加学生页面（分步表单）
  - Step 1: 基本信息
  - Step 2: 学情信息
  - Step 3: 教学目标
  - 提交和取消按钮
- [ ] 学生详情页面
  - 学生全部信息展示
  - 编辑按钮

【学情信息录入】
- [ ] 分步表单 UI（Ant Design Steps）
- [ ] 表单验证（Zod schema 定义验证规则）
- [ ] 草稿自动保存（React Query 的 useMutation 实现）
- [ ] 返回时提示保存未提交的更改
```

#### 后端开发任务
```
【认证 API】
- [ ] POST /api/auth/register - 用户注册
  输入: phone, password, confirmPassword
  输出: userId, token

- [ ] POST /api/auth/login - 用户登录
  输入: phone, password
  输出: accessToken, refreshToken, user

- [ ] POST /api/auth/refresh-token - 刷新 Token
  输入: refreshToken
  输出: accessToken, refreshToken

- [ ] POST /api/auth/send-sms-code - 发送短信验证码
  输入: phone
  输出: { success: true }

- [ ] POST /api/auth/login-wechat - 微信登录
  输入: wechatAuthCode
  输出: accessToken, refreshToken, user

【学生管理 API】
- [ ] POST /api/students - 创建学生
  输入: { name, gender, school, grade, ... }
  
- [ ] GET /api/students - 获取学生列表
  查询参数: page, size, search
  
- [ ] GET /api/students/:id - 获取学生详情
  
- [ ] PUT /api/students/:id - 更新学生信息
  
- [ ] DELETE /api/students/:id - 删除学生

- [ ] POST /api/students/:id/learning-info - 更新学情信息

【文件上传】
- [ ] POST /api/upload - 上传头像或学生照片
  返回: { fileUrl: "..." }
  存储: MinIO（暂用本地存储）

【数据权限】
- [ ] @DataPermission 注解实现：只能看到自己的学生
```

**实现示例** (使用伪代码):
```java
@RestController
@RequestMapping("/api/students")
public class StudentController {
    
    @PostMapping
    public ApiResponse<StudentDto> createStudent(
        @RequestBody CreateStudentRequest req,
        @AuthenticationPrincipal UserDetails user
    ) {
        Student student = studentService.createStudent(req, user.getId());
        return ApiResponse.success(StudentMapper.toDto(student));
    }
    
    @GetMapping
    public ApiResponse<Page<StudentDto>> listStudents(
        Pageable pageable,
        @RequestParam(required = false) String search,
        @AuthenticationPrincipal UserDetails user
    ) {
        Page<Student> students = studentService.listByUserId(
            user.getId(), search, pageable
        );
        return ApiResponse.success(
            students.map(StudentMapper::toDto)
        );
    }
}
```

#### 测试任务
```
【单元测试】
- [ ] StudentService 业务逻辑测试（JUnit 5 + Mockito）
  - 创建学生
  - 查询学生
  - 更新学生信息
  - 删除学生
  
- [ ] 密码加密工具测试
- [ ] Token 生成和验证测试
- 目标覆盖率: > 70%

【测试命令】
- `./mvnw test` 运行所有单元测试
- `./mvnw test -Dtest=StudentServiceTest` 运行特定测试
```

#### Week 2 检查清单
- [ ] 用户能正常登录和注册
- [ ] 用户能创建和管理学生信息
- [ ] 学情信息分步表单可正常填写和保存
- [ ] 单元测试覆盖率 > 70%

---

### Week 3: AI 备课生成核心功能

**⚠️ 关键周，影响整个项目的可行性**

#### 前端开发任务
```
【备课输入页面】
- [ ] 学生选择下拉菜单
- [ ] 课程科目选择
- [ ] 年级选择
- [ ] 备课主题输入框
- [ ] 课程时长输入（分钟）
- [ ] 备课模式选择（Radio Group）
  - 新课讲解
  - 习题讲解
  - 考前复习
  - 巩固强化
  - 拓展延伸
  - 快速问答
- [ ] 难度系数调整（Slider 1-10）
- [ ] 提交按钮

【备课生成进度显示】
- [ ] 进度条（Progress）显示生成进度
- [ ] 状态列表（Steps）显示各阶段状态
  - 解析需求中...
  - 检索知识库中...
  - AI 生成中...
  - 内容审核中...
  - 完成
- [ ] 实时更新（WebSocket 连接，React Query 更新状态）
- [ ] 预计时间提示（"预计还需 3 秒"）

【备课内容展示页面】
- [ ] 教案展示（Collapse 组件展开各个部分）
  - 导入部分
  - 知识讲解
  - 例题分析
  - 课堂练习
  - 总结
- [ ] Markdown 渲染（react-markdown）
- [ ] 数学公式渲染（react-katex）
- [ ] 习题卡片布局
- [ ] 编辑按钮（跳转到编辑页面）
- [ ] 导出按钮（PDF/Word）
```

#### 后端开发任务
**这是最复杂的部分，需要集成多个系统**

```
【FastAPI Python AI 服务初始化】
- [ ] FastAPI 项目创建
- [ ] 虚拟环境配置 (poetry / venv)
- [ ] Uvicorn 启动配置
- [ ] 请求日志和错误处理
- [ ] 与 Java 后端的通信接口设计

【LangChain 集成】
- [ ] 安装 langchain 0.1.x
- [ ] 定义 Prompt 模板
  - 备课生成 Prompt
  - 习题生成 Prompt
  - 内容审核 Prompt
- [ ] 创建 LLM 对象（与大模型通信）
- [ ] 链式处理流程（Chain）

【大模型 API 对接】
- [ ] 注册阿里云通义千问账户，获取 API Key
- [ ] 配置 LangChain 的通义千问集成
- [ ] 实现简单的 API 调用测试
- [ ] 错误处理和重试逻辑
- [ ] ChatGLM 备选方案部署

【Milvus 向量数据库】
- [ ] Milvus 部署（Docker 或本地）
- [ ] Python milvus SDK 集成
- [ ] 创建知识点向量库
  - Collection 名称: knowledge_points
  - 字段: id, text, vector, metadata
  - 向量维度: 1536 (使用 text-embedding-3-small)
- [ ] 知识点数据导入（50+ 初始数据）
- [ ] 向量相似度搜索实现
- [ ] RAG 检索流程实现

【备课生成 API】
- [ ] POST /ai/generate-lesson
  输入: {
    student_id,
    topic,
    subject,
    grade,
    mode,
    duration,
    difficulty
  }
  流程:
    1. 解析输入
    2. 从 Milvus 检索相关知识点
    3. 构建增强 Prompt
    4. 调用大模型
    5. 返回结果
    
  输出: {
    lesson_plan: { ... },
    knowledge_points: [ ... ],
    exercises: [ ... ],
    generation_time_ms: 8000
  }

【WebSocket 服务】
- [ ] WebSocket Server 启动
- [ ] 用户连接和认证
- [ ] 进度消息推送
  例如: { type: "progress", stage: "generating", percent: 50 }
```

**技术架构参考**:
```
用户请求 (Web)
  ↓
Java 后端 API (POST /api/lessons/generate)
  ↓
FastAPI 后端 (POST /ai/generate-lesson)
  ↓
Milvus 知识库检索 + 大模型调用
  ↓
分阶段 WebSocket 推送进度
  ↓
结果保存到 MySQL
  ↓
返回给前端
```

#### AI 工程师任务
```
【Prompt 优化】
- [ ] 备课生成 Prompt 完整设计
  - 角色定义: "你是一位经验丰富的教师"
  - 输入定义: 学生信息、课程信息
  - 输出格式定义: Markdown 教案结构
  - 约束条件: 长度、难度、时间分配

- [ ] Few-shot 示例准备（最少 3 个示例）
  - 高中数学导数讲解
  - 初中英语语法讲解
  - 小学数学应用题讲解

- [ ] Chain-of-Thought 推理激发
  "让我一步步思考这个教案应该如何设计..."

【模型路由配置】
- [ ] 简单问答 (duration <= 20 min) → qwen-turbo
- [ ] 标准备课 → qwen-plus
- [ ] 复杂深入讲解 → qwen-max
- [ ] 后备方案 → ChatGLM 本地模型
```

#### Week 3 验收标准
- [ ] 用户能触发备课生成
- [ ] AI 能生成基础教案（内容可用，结构合理）
- [ ] 生成时间 < 10 秒
- [ ] 生成准确率 > 80%（人工评估 10 份样本）

---

### Week 4: 教案编辑与导出

#### 前端开发任务
```
【富文本编辑器】
- [ ] 集成 TinyMCE 或 TipTap 编辑器
- [ ] 支持的功能:
  - 文本格式 (加粗、斜体、下划线)
  - 列表 (有序、无序)
  - 标题 (H1-H3)
  - 表格
  - 链接
  - 图片上传
- [ ] 公式编辑 (KaTeX)

【内容拖拽排序】
- [ ] 使用 dnd-kit 实现
- [ ] 教案各部分（导入、讲解、例题、练习、总结）可拖拽排序
- [ ] 拖拽时视觉反馈

【版本管理 UI】
- [ ] 版本历史侧边栏
- [ ] 显示每个版本的生成时间、修改摘要
- [ ] 点击可切换到该版本
- [ ] 版本对比（显示差异高亮）

【导出功能】
- [ ] PDF 导出 (react-pdf)
  - 包含封面 (学生名称、课题、日期)
  - 完整教案内容
  - 分页正确
  
- [ ] Word 导出 (docx-templates)
  - 使用模板导出
  - 格式美观
  
- [ ] 打印预览 (Print.js)
  - 浏览器打印友好格式

【反馈收集】
- [ ] 5 星评分组件
- [ ] 文本意见输入框
  问题: "这份教案对您的帮助程度如何?"
- [ ] 提交按钮
```

#### 后端开发任务
```
【教案编辑 API】
- [ ] PUT /api/lessons/:id - 更新教案内容
  输入: { content: "更新的内容", version: 2 }
  乐观锁检查: 提交时的版本必须是最新的
  
- [ ] GET /api/lessons/:id/versions - 获取版本历史
  输出: [
    { version: 1, created_at, changed_by, content },
    { version: 2, created_at, changed_by, content }
  ]

- [ ] POST /api/lessons/:id/compare - 版本对比
  输入: { version1: 1, version2: 2 }
  输出: { diff: "diff 内容" } (JSON Merge Patch 格式)

【导出服务】
- [ ] PDF 生成 (iText 7 库)
  输入: lesson content, student info
  输出: PDF 字节流
  
- [ ] Word 生成 (Apache POI)
  输入: lesson content, template
  输出: DOCX 字节流

- [ ] POST /api/lessons/:id/export
  查询参数: format (pdf / docx)
  返回: 文件二进制流，Content-Disposition 为 attachment

【反馈收集 API】
- [ ] POST /api/lessons/:id/feedback
  输入: { rating: 5, comment: "..." }
  保存到 lesson_feedback 表

- [ ] GET /api/feedback/stats - 反馈统计
  输出: { avg_rating, total_count, accuracy_rate }
```

#### 测试任务
```
【集成测试】
- [ ] 教案编辑流程集成测试
  1. 生成教案
  2. 修改内容
  3. 保存
  4. 版本检查

- [ ] 导出功能测试
  1. 导出 PDF
  2. 导出 Word
  3. 验证文件内容

【性能测试基线】
- [ ] 编辑 API 响应时间 < 500ms
- [ ] 列表查询响应时间 < 200ms
```

#### Phase 1 最终交付物
```
✅ Web 端 MVP 版本
  ├─ 用户认证和管理
  ├─ 学生信息管理
  ├─ AI 备课生成
  ├─ 教案编辑和导出
  └─ 基础教学资源库

✅ 后端核心 API
  ├─ 用户和学生管理
  ├─ AI 备课服务
  ├─ 教案管理
  └─ 基础数据接口

✅ 基础设施
  ├─ Docker Compose 开发环境
  ├─ CI/CD 流水线
  └─ 部署脚本

✅ 文档
  ├─ API 文档 (Swagger)
  ├─ 开发指南
  └─ 本地部署指南
```

---

## Phase 2: 多端扩展（第 5-8 周）

### 目标
在 Phase 1 的基础上，扩展到移动端 (Flutter) 和微信小程序 (Taro)，实现三端数据同步。

### 关键改进
- Flutter App 上线 iOS 和 Android
- Taro 小程序支持微信、支付宝、京东等小程序平台
- 三端数据实时同步（WebSocket + 冲突检测算法）
- 教学资源库完善（支持向量搜索和推荐）

### 周详规划

#### Week 5: 移动 App 开发
- Flutter 项目初始化和架构搭建
- 认证模块（登录、生物识别）
- 学生管理（列表、详情）
- 备课查看和离线缓存
- **交付**: App 基础版本可安装

#### Week 6: 微信小程序开发
- Taro 项目初始化，与 Web 共用 80% 组件
- 核心功能（快速备课、教案查看、分享）
- 微信集成（登录、分享、推送）
- **交付**: 小程序提交微信审核

#### Week 7: 数据同步服务
- WebSocket 长连接服务
- 冲突检测和字段级合并算法
- 离线编辑和同步
- **交付**: 三端数据同步正常

#### Week 8: 教学资源库
- 知识点库前端
- 教学模板库和题型库
- Meilisearch 搜索集成
- 智能推荐算法
- **交付**: 资源库功能完整

---

## Phase 3: 体验优化（第 9-12 周）

### 目标
打磨产品细节，优化用户体验，提升 AI 能力，达到生产就绪状态。

### 关键工作

#### Week 9: 教学进度管理
- 课程计划和日历视图
- 进度统计和可视化
- 学习报告生成
- **交付**: 教学管理模块完整

#### Week 10: AI 能力增强
- Prompt 优化迭代（A/B 测试）
- 习题生成优化
- 内容准确性校验
- 多级缓存优化
- **指标目标**: 准确率 > 85%

#### Week 11: UI/UX 优化
- 设计系统完善
- 响应式设计优化
- 暗色模式支持
- 新手引导和教程
- **交付**: 界面精致、易用

#### Week 12: 测试和上线准备
- E2E 测试 (Playwright)
- 性能测试 (k6)
- 安全测试 (OWASP ZAP)
- 生产环境部署
- **交付**: 生产就绪版本（99.5% 可用性）

---

## 成功指标

### 技术指标

#### 核心功能指标
| 指标 | 目标值 | Phase 1 | Phase 2 | Phase 3 |
|------|-------|--------|---------|---------|
| 备课内容生成准确率 | > 85% | 80% | 82% | 85%+ |
| 教案结构完整性 | > 90% | 85% | 88% | 90%+ |
| 习题难度匹配度 | > 80% | - | 78% | 80%+ |
| 学生情况分析准确率 | > 85% | - | 82% | 85%+ |

#### 性能指标
| 指标 | 目标值 | 测量 | 目标阶段 |
|------|-------|------|--------|
| 备课生成响应时间 | < 10s (P95) | APM 监控 | Phase 3 |
| 简单查询响应时间 | < 200ms (P95) | APM 监控 | Phase 2 |
| 系统可用性 | > 99.5% | uptime 监控 | Phase 3 |
| API 成功率 | > 99.5% | 日志统计 | Phase 2 |
| 并发用户数 | 500+ | 压力测试 | Phase 3 |

#### 代码质量指标
| 指标 | 目标值 | 工具 | 检查频率 |
|------|-------|------|--------|
| 单元测试覆盖率 | > 70% | JaCoCo | 每次构建 |
| 集成测试覆盖率 | > 50% | JaCoCo | 每次构建 |
| 代码规范合规 | 100% | Checkstyle/ESLint | 每次提交 |
| 安全漏洞 | 0 高危 | SonarQube | 每日 |

### 用户指标

#### 用户行为指标
| 指标 | 目标值 | 测量方法 | 统计周期 |
|------|-------|---------|--------|
| 新用户首次备课完成时间 | < 10 分钟 | 埋点统计 | 每日 |
| 用户满意度（NPS） | > 50 | 用户调研 | 每月 |
| 功能满意度评分 | > 4.5/5.0 | 应用内评分 | 实时 |
| 日活跃用户数（DAU） | 1000+ | 统计分析 | 每日 |
| 月活跃用户数（MAU） | 5000+ | 统计分析 | 每月 |
| 用户留存率（30 日） | > 40% | cohort 分析 | 每月 |

#### 业务价值指标
| 指标 | 目标值 | 测量方法 |
|------|-------|---------|
| 备课效率提升 | 2h → 20min | 用户调研 |
| 付费转化率 | > 8% | 业务统计 |
| 客户生命周期价值（LTV） | > ¥2000 | 财务统计 |
| 获客成本（CAC） | < ¥300 | 财务统计 |

---

## 关键路径和依赖关系

```
┌─ Week 1: 基础架构 ──┐
│                     │
├─ Week 2: 认证和学生 ──┤
│                       │ (需要 Week 1 完成)
├─ Week 3: AI 备课 ─────┤ (关键路径)
│                       │
└─ Week 4: 编辑和导出 ──┘

    │
    ├─ Week 5-6: 多端开发 (需要 Week 1-4 完成)
    │ (可并行)
    │
    ├─ Week 7: 数据同步 (需要 Week 5-6 完成)
    │
    └─ Week 8: 资源库 (相对独立)

    │
    └─ Week 9-12: 优化和测试 (需要 Phase 1-2 完成)
```

---

## 相关文档导航

🔗 **相关文档链接**

- 📖 [**00-PROJECT-OVERVIEW.md**](./00-PROJECT-OVERVIEW.md) - 返回项目概述
- 📖 [**01-MODULE-DETAILS.md**](./01-MODULE-DETAILS.md) - 功能模块详细设计
- ⚠️ [**03-RISK-ASSESSMENT.md**](./03-RISK-ASSESSMENT.md) - 风险分析与应对
- 📚 [**INDEX.md**](../INDEX.md) - 返回完整文档导航

---

📚 **返回导航**

[← 返回文档索引](../INDEX.md)

---

**文档版本**: 2.0  
**最后更新**: 2026-03-24  
**作者**: 全自动家教备课平台团队
