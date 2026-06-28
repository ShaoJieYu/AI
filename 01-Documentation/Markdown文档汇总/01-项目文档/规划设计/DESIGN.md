# 全自动家教备课平台 - 详细设计文档

## 文档索引

> **本文档是设计文档，与以下文档配套使用：**
> - [需求文档](./requirements/README.md) - 产品需求、功能规格、验收标准
> - [项目计划](./PLAN.md) - 开发计划、里程碑、风险评估
>
> **文档版本**: v2.0.0 | **最后更新**: 2026-03-24 | **状态**: 已审核

---

## 目录

1. [系统架构设计](#1-系统架构设计)
2. [技术选型说明](#2-技术选型说明)
3. [数据库设计](#3-数据库设计)
4. [API 接口设计](#4-api-接口设计)
5. [前端架构设计](#5-前端架构设计)
6. [AI 引擎设计](#6-ai-引擎设计)
7. [多端同步设计](#7-多端同步设计)
8. [安全设计](#8-安全设计)
9. [部署架构设计](#9-部署架构设计)

---

## 1. 系统架构设计

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              用户接入层 (Nginx/Spring Cloud Gateway)         │
│                    HTTPS / 负载均衡 / 限流熔断 / SSL 卸载 / 静态资源缓存      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              前端应用层                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                    │
│  │   Web 端     │  │  移动 App    │  │  微信小程序   │                    │
│  │ React 18     │  │  Flutter     │  │  Taro 4.x    │                    │
│  │ TypeScript   │  │  iOS/Android │  │  多端编译     │                    │
│  └──────────────┘  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API 网关层                                      │
│              认证鉴权 / 请求路由 / 限流熔断 / 日志追踪 / API 版本管理           │
│                         (Spring Cloud Gateway + Sentinel)                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
┌───────────────┐            ┌───────────────┐            ┌───────────────┐
│   业务服务层   │            │   AI 服务层    │            │   基础服务层   │
│(Spring Boot)  │            │(Python/FastAPI│           │(Common Services│
├───────────────┤            ├───────────────┤            ├───────────────┤
│ • 用户服务    │            │ • 备课生成     │            │ • 文件服务     │
│ • 学生服务    │◄──────────►│ • 学情分析     │◄──────────►│ • 消息服务     │
│ • 备课服务    │            │ • 习题生成     │            │ • 推送服务     │
│ • 进度服务    │            │ • 内容审核     │            │ • 定时任务     │
│ • 资源服务    │            │               │            │               │
└───────────────┘            └───────────────┘            └───────────────┘
        │                             │                             │
        └─────────────────────────────┼─────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              基础设施层                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   MySQL      │  │    Redis     │  │    MinIO     │  │   Meilisearch│ │
│  │ +ShardingSphere│  │   Cluster   │  │  (文件存储)   │  │   (搜索)     │ │
│  │  (主数据库)   │  │  (缓存/会话)  │  │              │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           外部服务集成                                       │
│  ┌─────────────────────────────────────────────────────────┐              │
│  │                    国产大模型 API                         │              │
│  │              （通义千问 / 文心一言 / GLM-4）              │              │
│  │                    + ChatGLM 本地                         │              │
│  └─────────────────────────────────────────────────────────┘              │
│  ┌─────────────────────────────────────────────────────────┐              │
│  │                   LangChain + Milvus                      │              │
│  │                  （Prompt 工程 + 向量数据库）              │              │
│  └─────────────────────────────────────────────────────────┘              │
│  ┌─────────────────────────────────────────────────────────┐              │
│  │               短信服务 / 邮件服务 / 内容审核              │              │
│  └─────────────────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 技术栈选型（优化后）

#### 1.2.1 前端技术栈

| 层级 | 技术选型 | 版本 | 用途 |
|------|----------|------|------|
| Web 框架 | React | 18.x | UI 开发 |
| 开发语言 | TypeScript | 5.x | 类型安全 |
| 状态管理 | Zustand + React Query | 4.x / 14.x | 全局状态 + 服务端状态 |
| UI 组件库 | Ant Design | 5.x | 组件库 |
| 样式方案 | Tailwind CSS | 3.x | 样式工具 |
| 构建工具 | Vite | 5.x | 构建打包 |
| 移动框架 | Flutter | 3.x | 跨平台 App |
| 小程序框架 | Taro | 4.x | 微信/支付宝/京东小程序 |
| 实时协作 | Y.js | - | 教案协作编辑（可选） |

#### 1.2.2 后端技术栈

| 层级 | 技术选型 | 版本 | 用途 |
|------|----------|------|------|
| 主框架 | Spring Boot | 3.2+ | 业务服务 |
| 开发语言 | Java | 21 (LTS) | 业务逻辑 |
| API 网关 | Spring Cloud Gateway | 2023.x | 网关路由 |
| 服务治理 | Spring Cloud Alibaba | 2023.x | Nacos + Sentinel |
| ORM 框架 | Spring Data JPA + MyBatis-Plus | 3.2+ / 3.5+ | 数据访问 |
| 安全框架 | Spring Security | 6.x | 认证授权 |
| 分布式事务 | Seata | 2.x | 事务管理 |
| 消息队列 | Redis Streams + RocketMQ | 7.x / 5.x | 异步任务 |
| API 文档 | SpringDoc OpenAPI | 2.x | Swagger 文档 |
| AI 服务 | Python + FastAPI | 0.100+ | AI 推理服务 |
| Prompt 框架 | LangChain | 0.1.x | Prompt 管理 |

#### 1.2.3 基础设施

| 组件 | 技术选型 | 版本 | 用途 |
|------|----------|------|------|
| 关系数据库 | MySQL + ShardingSphere | 8.0+ / 5.0.x | 主数据库 + 分库分表 |
| 缓存数据库 | Redis Cluster | 7.x | 缓存/会话 |
| 向量数据库 | Milvus | 2.4.x | 知识点向量存储 |
| 文件存储 | MinIO + OSS | 2023+ | 对象存储 |
| 搜索引擎 | Meilisearch | 1.6.x | 轻量级搜索 |
| 容器化 | Docker | 24.x | 容器化 |
| 编排工具 | Kubernetes | 1.28+ | 容器编排 |
| 配置中心 | Nacos | 2.x | 配置管理 |
| 链路追踪 | SkyWalking / Jaeger | 9.x | 分布式追踪 |
| 日志收集 | ELK Stack | 8.x | 日志分析 |

### 1.3 服务拆分

#### 1.3.1 业务服务（Spring Boot 微服务）

```
用户服务 (user-service)
  - 用户注册/登录
  - 用户信息管理
  - 会员管理
  - 认证授权

学生服务 (student-service)
  - 学生档案管理
  - 学情信息管理
  - 教学目标管理
  - 成长轨迹记录

备课服务 (lesson-service)
  - 备课请求处理
  - 教案管理
  - 习题管理
  - 版本管理

进度服务 (progress-service)
  - 课程安排
  - 进度跟踪
  - 效果评估

资源服务 (resource-service)
  - 知识点管理
  - 教学模板
  - 题型管理
  - 搜索服务
```

#### 1.3.2 AI 服务（Python/FastAPI）

```
备课生成服务 (lesson-generation-service)
  - 学生画像分析
  - 教案框架生成
  - 知识点讲解生成
  - 教学建议生成

习题生成服务 (exercise-generation-service)
  - 习题生成
  - 答案解析生成
  - 难度评估
  - 知识点匹配

内容审核服务 (content-moderation-service)
  - 内容准确性校验
  - 敏感信息过滤
  - 质量评分

知识库服务 (knowledge-service)
  - 知识点向量化管理
  - 相似知识点检索
  - RAG 增强生成
```

---

## 2. 技术选型说明

### 2.1 小程序框架选型（Taro 替代原生开发）

**背景**: 原生小程序开发维护成本高，无法跨平台复用。

**Taro 优势**:
- ✅ 一套代码多端编译（微信/支付宝/京东/百度）
- ✅ 支持 React/Vue 开发方式
- ✅ 组件库丰富（Taro UI）
- ✅ 与主项目技术栈统一（React）

**迁移成本评估**:
- 现有 React 组件可直接复用 80%+
- 需要适配 Taro 特有 API（约 5%工作量）
- 预计 Phase 2 第 1 周完成迁移

### 2.2 向量数据库选型（Milvus）

**背景**: AI 备课需要精准的知识匹配和检索能力。

**Milvus 优势**:
- ✅ 高性能向量检索（百万级数据 < 10ms）
- ✅ 支持多种索引类型（HNSW/IVF/DiskANN）
- ✅ 分布式架构，水平扩展
- ✅ 与 LangChain 无缝集成

**应用场景**:
- 知识点相似度匹配
- 教案内容去重
- 基于上下文的 Prompt 增强（RAG）

### 2.3 服务治理选型（Spring Cloud Alibaba）

**背景**: 微服务需要完整的服务治理能力。

**组件说明**:
| 组件 | 功能 | 选型原因 |
|------|------|----------|
| Nacos | 服务注册/配置中心 | 功能完整，与 Spring Cloud 集成好 |
| Sentinel | 熔断限流 | 丰富的流量控制策略 |
| Seata | 分布式事务 | AT 模式对业务代码无侵入 |

### 2.4 搜索引擎选型（Meilisearch 替代 Elasticsearch）

**背景**: 搜索场景相对简单，Elasticsearch 过于重量级。

**Meilisearch 优势**:
- ✅ 部署简单，资源占用少
- ✅ 搜索速度快（< 50ms）
- ✅ 中文分词支持好
- ✅ 适合中小规模数据（千万级）

**使用场景**:
- 知识点搜索
- 模板搜索
- 习题搜索

---

## 3. 数据库设计

### 3.1 核心数据模型

#### 3.1.1 用户与权限

```sql
-- 用户表
CREATE TABLE users (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    phone           VARCHAR(20) UNIQUE COMMENT '手机号',
    email           VARCHAR(100) UNIQUE COMMENT '邮箱',
    password_hash   VARCHAR(255) NOT NULL COMMENT '密码哈希',
    nickname        VARCHAR(50) COMMENT '昵称',
    avatar_url      VARCHAR(500) COMMENT '头像URL',
    teaching_subjects JSON COMMENT '可教科目',
    teaching_grades JSON COMMENT '可教年级',
    profile         JSON COMMENT '详细信息',
    membership_type VARCHAR(20) DEFAULT 'free' COMMENT '会员类型: free/monthly/yearly',
    membership_expire DATE COMMENT '会员过期时间',
    status          TINYINT DEFAULT 1 COMMENT '状态: 1正常 0禁用',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP NULL COMMENT '软删除时间',
    INDEX idx_phone (phone),
    INDEX idx_email (email),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 会员表
CREATE TABLE memberships (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id         BIGINT NOT NULL COMMENT '用户ID',
    type            VARCHAR(20) NOT NULL COMMENT '类型: free/monthly/yearly',
    start_date      DATE NOT NULL COMMENT '开始日期',
    end_date        DATE NOT NULL COMMENT '结束日期',
    daily_limit     INT DEFAULT 3 COMMENT '每日备课次数限制',
    student_limit   INT DEFAULT 5 COMMENT '学生数量限制',
    status          TINYINT DEFAULT 1 COMMENT '状态',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员表';

-- 操作日志表
CREATE TABLE operation_logs (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id         BIGINT NOT NULL COMMENT '操作用户ID',
    action          VARCHAR(50) NOT NULL COMMENT '操作类型',
    resource_type   VARCHAR(50) COMMENT '资源类型',
    resource_id     BIGINT COMMENT '资源ID',
    detail          JSON COMMENT '操作详情',
    ip_address      VARCHAR(50) COMMENT 'IP地址',
    user_agent      VARCHAR(500) COMMENT '浏览器标识',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表';
```

#### 3.1.2 学生管理

```sql
-- 学生档案表
CREATE TABLE students (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id         BIGINT NOT NULL COMMENT '所属教师ID',
    name            VARCHAR(50) NOT NULL COMMENT '学生姓名',
    grade           VARCHAR(20) NOT NULL COMMENT '年级',
    school          VARCHAR(100) COMMENT '学校',
    photo_url       VARCHAR(500) COMMENT '照片URL',
    parent_name     VARCHAR(50) COMMENT '家长姓名',
    parent_contact  VARCHAR(50) COMMENT '家长联系方式',
    status          VARCHAR(20) DEFAULT 'active' COMMENT '状态: active/paused/finished',
    current_subject VARCHAR(20) COMMENT '当前科目',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP NULL COMMENT '软删除时间',
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学生档案表';

-- 学情信息表
CREATE TABLE student_profiles (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id          BIGINT UNIQUE NOT NULL COMMENT '学生ID',
    academic_level      JSON COMMENT '学习基础',
    weak_subjects      JSON COMMENT '薄弱科目',
    weak_knowledge     JSON COMMENT '薄弱知识点',
    study_habits       JSON COMMENT '学习习惯',
    personality         JSON COMMENT '性格特点',
    special_needs      TEXT COMMENT '特殊需求',
    goals              JSON COMMENT '教学目标',
    learning_style     VARCHAR(20) COMMENT '学习风格: visual/auditory/kinesthetic',
    attention_level    VARCHAR(20) COMMENT '专注程度: high/medium/low',
    homework_completion VARCHAR(20) COMMENT '作业完成度: good/medium/poor',
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学情信息表';

-- 教学目标表
CREATE TABLE teaching_goals (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id      BIGINT NOT NULL COMMENT '学生ID',
    goal_type       VARCHAR(20) NOT NULL COMMENT '目标类型: short/medium/long',
    target_score    INT COMMENT '目标分数',
    target_date     DATE COMMENT '目标日期',
    description     TEXT COMMENT '目标描述',
    priority        VARCHAR(20) DEFAULT 'normal' COMMENT '优先级: high/normal/low',
    status          VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/achieved/abandoned',
    achieved_at     TIMESTAMP NULL COMMENT '完成时间',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_student_id (student_id),
    FOREIGN KEY (student_id) REFERENCES students(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教学目标表';
```

#### 3.1.3 备课内容

```sql
-- 备课记录表
CREATE TABLE lesson_plans (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id         BIGINT NOT NULL COMMENT '教师ID',
    student_id      BIGINT NOT NULL COMMENT '学生ID',
    subject         VARCHAR(20) NOT NULL COMMENT '科目',
    grade           VARCHAR(20) NOT NULL COMMENT '年级',
    topic           VARCHAR(200) NOT NULL COMMENT '备课主题',
    mode            VARCHAR(20) DEFAULT 'new_lesson' COMMENT '备课模式',
    duration        INT DEFAULT 90 COMMENT '课程时长(分钟)',
    difficulty      TINYINT DEFAULT 3 COMMENT '难度1-5',
    content         JSON NOT NULL COMMENT '备课内容JSON',
    status          VARCHAR(20) DEFAULT 'draft' COMMENT '状态: draft/published',
    version         INT DEFAULT 1 COMMENT '版本号',
    parent_id       BIGINT COMMENT '父版本ID(用于版本管理)',
    source_type     VARCHAR(20) COMMENT '来源: ai/manual/template',
    usage_count     INT DEFAULT 0 COMMENT '使用次数',
    rating          DECIMAL(3,2) COMMENT '平均评分',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP NULL COMMENT '软删除时间',
    INDEX idx_user_id (user_id),
    INDEX idx_student_id (student_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (student_id) REFERENCES students(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='备课记录表';

-- 教案版本历史表
CREATE TABLE lesson_plan_versions (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    lesson_id       BIGINT NOT NULL COMMENT '备课ID',
    version         INT NOT NULL COMMENT '版本号',
    content         JSON NOT NULL COMMENT '版本内容',
    change_summary  TEXT COMMENT '变更说明',
    created_by      BIGINT NOT NULL COMMENT '创建人',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_lesson_id (lesson_id),
    FOREIGN KEY (lesson_id) REFERENCES lesson_plans(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教案版本历史表';

-- 习题表
CREATE TABLE exercises (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    lesson_id           BIGINT COMMENT '所属备课ID',
    knowledge_point     VARCHAR(100) COMMENT '所属知识点',
    question_type       VARCHAR(20) NOT NULL COMMENT '题型: choice/fill/answer/proof',
    difficulty          TINYINT NOT NULL COMMENT '难度1-5',
    content             JSON NOT NULL COMMENT '题目内容',
    answer              JSON NOT NULL COMMENT '答案',
    explanation         TEXT COMMENT '解析',
    similar_count       INT DEFAULT 0 COMMENT '相似题数量',
    usage_count         INT DEFAULT 0 COMMENT '使用次数',
    correct_rate        DECIMAL(5,2) COMMENT '正确率',
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_lesson_id (lesson_id),
    INDEX idx_knowledge_point (knowledge_point),
    INDEX idx_difficulty (difficulty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='习题表';

-- 备课评价表
CREATE TABLE lesson_feedback (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    lesson_id       BIGINT NOT NULL COMMENT '备课ID',
    user_id         BIGINT NOT NULL COMMENT '评价用户',
    rating          TINYINT NOT NULL COMMENT '评分1-5',
    accuracy_rating TINYINT COMMENT '准确性评分',
    usefulness_rating TINYINT COMMENT '实用性评分',
    feedback        TEXT COMMENT '文字反馈',
    improvement_suggestions TEXT COMMENT '改进建议',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_lesson_id (lesson_id),
    FOREIGN KEY (lesson_id) REFERENCES lesson_plans(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='备课评价表';
```

---

## 4. API 接口设计

### 4.1 RESTful API 规范

#### 4.1.1 统一响应格式

```typescript
// 成功响应
interface SuccessResponse<T> {
  code: number;           // 200 成功
  message: string;        // "success"
  data: T;
  timestamp: number;
  requestId: string;      // 请求追踪ID
}

// 错误响应
interface ErrorResponse {
  code: number;           // 错误码
  message: string;        // 错误消息
  details?: any;          // 详细错误
  timestamp: number;
  requestId: string;
}

// 分页响应
interface PaginatedResponse<T> {
  code: number;
  message: string;
  data: {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  timestamp: number;
}
```

#### 4.1.2 错误码规范

| 错误码范围 | 含义 | 示例 |
|------------|------|------|
| 1000-1999 | 系统错误 | 1001-系统繁忙, 1002-服务不可用 |
| 2000-2999 | 参数错误 | 2001-参数为空, 2002-参数格式错误 |
| 3000-3999 | 认证错误 | 3001-未登录, 3002-Token过期, 3003-权限不足 |
| 4000-4999 | 业务错误 | 4001-学生不存在, 4002-备课生成失败 |
| 5000-5999 | AI 服务错误 | 5001-AI服务超时, 5002-内容审核不通过 |

### 4.2 核心 API 接口

#### 4.2.1 备课生成接口

```yaml
# 生成备课内容
POST /api/v1/lessons/generate
Request:
  headers:
    Authorization: Bearer <token>
  body:
    studentId: number          # 学生ID (必填)
    subject: string           # 科目 (必填)
    topic: string            # 主题 (必填, 2-200字符)
    mode: string             # 备课模式 (必填)
    duration: number         # 时长分钟 (必填, 60/90/120)
    difficulty: number       # 难度 (必填, 1-5)
    customRequirements: string # 自定义要求 (可选)
Response:
  success:
    data:
      lessonId: number
      status: string         # "generating" | "ready"
      estimatedTime: number  # 预计生成时间(秒)
  error:
    code: 4001
    message: "学生不存在"

# 查询生成进度
GET /api/v1/lessons/{lessonId}/progress
Response:
  success:
    data:
      progress: number       # 0-100
      stage: string         # "analyzing" | "generating" | "reviewing"
      message: string
  error:
    code: 4001
    message: "备课不存在"

# 获取备课内容
GET /api/v1/lessons/{lessonId}
Response:
  success:
    data:
      id: number
      studentId: number
      subject: string
      topic: string
      mode: string
      duration: number
      difficulty: number
      content:
        teachingObjectives: string[]
        keyPoints: string[]
        difficultPoints: string[]
        timeAllocation:
          introduction: number
          lecture: number
          practice: number
          summary: number
          homework: number
        knowledgeExplanation:
          concept: string
          formulas: string[]
          examples: Array<{problem: string, solution: string}>
        exercises: Exercise[]
        teachingSuggestions: string
        homeworkSuggestions: string
      status: string
      version: number
      createdAt: string
      updatedAt: string
```

### 4.3 API 版本管理

```yaml
版本策略:
  - URL 版本号: /api/v1/, /api/v2/
  - 向后兼容: 旧版本 API 至少支持 6 个月
  - 废弃通知: 提前 3 个月在响应头中标记
  - 版本文档: 每个版本独立维护

响应头:
  X-API-Version: "v1"
  X-API-Deprecated: "true"        # 当版本废弃时
  X-API-Deprecation-Date: "2026-06-01"  # 废弃日期
```

---

## 5. 前端架构设计

### 5.1 Web 端项目结构

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

### 5.2 状态管理方案

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

## 6. AI 引擎设计

### 6.1 备课生成流程

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI 备课生成引擎 (LangChain + Milvus)          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  输入处理   │───►│  学情分析   │───►│  策略制定   │         │
│  │             │    │             │    │             │         │
│  │ • 表单解析   │    │ • 基础评估   │    │ • 模式选择   │         │
│  │ • 信息验证   │    │ • 薄弱点识别 │    │ • 难度确定   │         │
│  │ • 需求理解   │    │ • 风格匹配   │    │ • 时间分配   │         │
│  └─────────────┘    └──────┬──────┘    └──────┬──────┘         │
│                             │                    │                │
│                             │ 向量检索            │ Prompt 构建    │
│                             ▼                    ▼                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  RAG 增强   │◄───│  知识点检索  │    │  Prompt 组装  │         │
│  │             │    │  (Milvus)   │    │             │         │
│  │ • 上下文注入 │    │ • 相似知识点 │    │ • 模板选择   │         │
│  │ • 知识融合   │    │ • 关联知识   │    │ • Few-shot  │         │
│  └─────────────┘    └─────────────┘    └──────┬──────┘         │
│                             ▲                    │                │
│                             │                    ▼                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  内容组装   │◄───│  内容生成   │◄───│  LLM 调用   │         │
│  │             │    │             │    │             │         │
│  │ • 结构整合   │    │ • 教案生成   │    │ • 通义千问   │         │
│  │ • 格式调整   │    │ • 习题生成   │    │ • GLM-4     │         │
│  │ • 质量检查   │    │ • 解析生成   │    │ • Fallback  │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                  ▲                                      │
│         ▼                  │                                      │
│  ┌─────────────┐    ┌─────────────┐                              │
│  │  内容审核   │───►│  结果校验   │                              │
│  │             │    │             │                              │
│  │ • 准确性检查 │    │ • 格式验证   │                              │
│  │ • 敏感词过滤 │    │ • 知识点校验 │                              │
│  │ • 质量评分   │    │ • 安全性检查 │                              │
│  └─────────────┘    └─────────────┘                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Prompt 设计策略

```python
# 备课生成 Prompt 模板 (LangChain Format)
LESSON_PLAN_PROMPT = """
你是一位经验丰富的{subject}教师，拥有{years_of_experience}年教学经验。
请为以下学生设计一份个性化教案：

【学生画像】
- 年级：{grade}
- 学习基础：{academic_level}
- 薄弱知识点：{weak_knowledge}
- 学习习惯：{study_habits}
- 性格特点：{personality}
- 学习风格：{learning_style}

【教学要求】
- 课题：{topic}
- 备课模式：{mode}
- 课程时长：{duration}分钟
- 难度系数：{difficulty}/5
- 特殊需求：{custom_requirements}

【相关知识点参考】(从知识库检索)
{retrieved_knowledge}

请生成一份完整的教案，JSON格式：
{{
  "teachingObjectives": ["知识目标1", "能力目标1"],
  "keyPoints": ["重点1", "重点2"],
  "difficultPoints": ["难点1"],
  "timeAllocation": {{
    "introduction": 5,
    "lecture": 30,
    "practice": 40,
    "summary": 10,
    "homework": 5
  }},
  "knowledgeExplanation": {{
    "concept": "概念定义",
    "formulas": ["公式1", "公式2"],
    "examples": [
      {{"problem": "例题", "solution": "解法"}}
    ]
  }},
  "exercises": [
    {{
      "type": "choice",
      "difficulty": 2,
      "content": "题目内容",
      "answer": "答案",
      "explanation": "解析"
    }}
  ],
  "teachingSuggestions": "针对该学生的教学建议",
  "homeworkSuggestions": "课后作业建议"
}}

注意：
- 内容要符合{grade}学生的认知水平
- 重点讲解薄弱知识点
- 根据性格特点设计互动方式
- 难度控制在{difficulty}星
- 确保知识点准确无误
"""
```

### 6.3 模型路由策略

```python
# 模型路由配置
MODEL_ROUTING = {
    "simple_generation": {
        "model": "qwen-turbo",  # 通义千问轻量版
        "max_tokens": 2000,
        "temperature": 0.7,
        "use_case": "快速补充内容"
    },
    "full_lesson_plan": {
        "model": "qwen-plus",  # 通义千问增强版
        "max_tokens": 8000,
        "temperature": 0.8,
        "use_case": "完整教案生成"
    },
    "complex_reasoning": {
        "model": "qwen-max",  # 通义千问最强版
        "max_tokens": 16000,
        "temperature": 0.9,
        "use_case": "复杂教学设计"
    },
    "fallback": {
        "model": "chatglm-pro",  # 智谱GLM备选
        "max_tokens": 8000,
        "temperature": 0.8,
        "use_case": "主服务不可用时"
    }
}

# 缓存策略
CACHE_CONFIG = {
    "enabled": True,
    "ttl": 3600,  # 1小时
    "cache_key_pattern": "{student_id}_{topic}_{mode}_{difficulty}",
    "invalidates": ["student_profile_update", "manual_edit"]
}
```

---

## 7. 多端同步设计

### 7.1 数据同步架构

```
┌─────────────────────────────────────────────────────────────┐
│                     实时同步架构                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────┐      ┌─────────┐      ┌─────────┐          │
│   │  Web 端   │      │  App 端   │      │ 小程序   │          │
│   │ React 18 │      │ Flutter  │      │  Taro   │          │
│   └────┬────┘      └────┬────┘      └────┬────┘          │
│        │ WebSocket      │ WebSocket      │ WebSocket       │
│        │                │                │                  │
│        └────────────────┼────────────────┘                  │
│                         │                                   │
│                         ▼                                   │
│              ┌──────────────────┐                           │
│              │  同步协调服务     │                           │
│              │  Sync Service   │                           │
│              │  (WebSocket)    │                           │
│              └────────┬─────────┘                           │
│                       │                                     │
│         ┌─────────────┼─────────────┐                       │
│         ▼             ▼             ▼                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ 变更日志  │  │ 冲突检测  │  │ 版本控制  │                  │
│  │Changelog │  │Conflict  │  │Versioning│                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│                       │                                     │
│                       ▼                                     │
│              ┌──────────────────┐                           │
│              │    主数据库       │                           │
│              │    MySQL         │                           │
│              └──────────────────┘                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 冲突解决策略

```typescript
// 冲突检测与解决
interface SyncConflict {
  resourceId: string;
  resourceType: 'lesson' | 'student' | 'profile';
  localVersion: number;
  remoteVersion: number;
  localChanges: Record<string, any>;
  remoteChanges: Record<string, any>;
  conflictFields: string[];  // 冲突字段
}

// 解决策略
enum ConflictResolution {
  LAST_WRITE_WINS = 'last_write_wins',     // 最后写入优先
  MERGE_CHANGES = 'merge_changes',          // 合并变更
  MANUAL_MERGE = 'manual_merge',            // 手动合并
  FIELD_LEVEL_MERGE = 'field_merge'         // 字段级合并（推荐）
}

// 字段级合并算法
function fieldLevelMerge(local: any, remote: any): any {
  const merged = { ...local };

  for (const key of Object.keys(remote)) {
    if (local[key] === remote[key]) {
      // 值相同，无需处理
      continue;
    }

    if (!local.hasOwnProperty(key)) {
      // 本地没有，直接使用远程
      merged[key] = remote[key];
    } else {
      // 都有值，保留最新的（基于updatedAt）
      merged[key] = local.updatedAt > remote.updatedAt
        ? local[key]
        : remote[key];
    }
  }

  return merged;
}
```

---

## 8. 安全设计

### 8.1 认证与授权

#### 8.1.1 JWT Token 机制

```java
// JWT Token 生成配置
@Configuration
public class JwtConfig {
    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.access-token-ttl:7200}")  // 2小时
    private long accessTokenTtl;

    @Value("${jwt.refresh-token-ttl:604800}")  // 7天
    private long refreshTokenTtl;

    @Bean
    public JwtTokenProvider jwtTokenProvider() {
        return new JwtTokenProvider(secret, accessTokenTtl, refreshTokenTtl);
    }
}

// Token 生成
public String createAccessToken(Long userId, String role) {
    Date now = new Date();
    Date expiryDate = new Date(now.getTime() + accessTokenTtl * 1000);

    return Jwts.builder()
        .setSubject(String.valueOf(userId))
        .claim("role", role)
        .claim("type", "access")
        .setIssuedAt(now)
        .setExpiration(expiryDate)
        .signWith(key, SignatureAlgorithm.HS256)
        .compact();
}
```

#### 8.1.2 权限控制

```java
// 基于角色的访问控制
@PreAuthorize("hasRole('TEACHER')")
@PostMapping("/lessons")
public ResponseEntity<LessonPlan> createLesson(@RequestBody LessonPlan lesson) {
    // 创建备课
}

// 数据权限（只能访问自己的学生）
@PreAuthorize("@securityService.isOwnerStudent(#studentId, authentication)")
@GetMapping("/students/{studentId}")
public ResponseEntity<Student> getStudent(@PathVariable Long studentId) {
    // 获取学生信息
}

// SecurityService 实现
@Service
public class SecurityService {
    public boolean isOwnerStudent(Long studentId, Authentication auth) {
        Long userId = getCurrentUserId(auth);
        return studentRepository.existsByIdAndUserId(studentId, userId);
    }
}
```

### 8.2 数据安全

#### 8.2.1 敏感数据加密

```java
// 密码加密存储
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);  // 强度12
}

// 敏感信息 AES 加密
@Component
public class EncryptionService {
    @Value("${encryption.secret-key}")
    private String secretKey;

    public String encrypt(String data) {
        // AES-256-GCM 加密
    }

    public String decrypt(String encryptedData) {
        // AES-256-GCM 解密
    }
}

// 手机号等敏感字段加密存储
@Column(name = "phone", nullable = false)
@Convert(converter = AesEncryptConverter.class)
private String phone;
```

---

## 9. 部署架构设计

### 9.1 Docker 容器化

#### 9.1.1 后端 Dockerfile

```dockerfile
# 后端服务 Dockerfile
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /app
COPY . .
RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

# JVM 优化配置
ENV JAVA_OPTS="-XX:+UseContainerSupport \
                -XX:MaxRAMPercentage=75.0 \
                -XX:+UseG1GC \
                -XX:+HeapDumpOnOutOfMemoryError"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

#### 9.1.2 Docker Compose 配置

```yaml
version: '3.8'

services:
  # Nginx / API Gateway
  gateway:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
    networks:
      - app-network

  # MySQL 数据库
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: lesson_platform
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "3306:3306"
    command: --default-authentication-plugin=mysql_native_password
    networks:
      - app-network

  # Redis 缓存
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - app-network

  # 后端服务
  backend:
    build: ./backend
    environment:
      SPRING_PROFILES_ACTIVE: ${ENVIRONMENT}
      DATABASE_URL: jdbc:mysql://mysql:3306/lesson_platform
      REDIS_URL: redis://redis:6379
      NACOS_ADDR: nacos
      NACOS_PORT: 8848
    depends_on:
      - mysql
      - redis
    networks:
      - app-network

  # AI 服务
  ai-service:
    build: ./ai-service
    environment:
      LLM_API_KEY: ${LLM_API_KEY}
      MILVUS_HOST: milvus
      MILVUS_PORT: 19530
    ports:
      - "8000:8000"
    networks:
      - app-network

  # Nacos 配置中心
  nacos:
    image: nacos/nacos-server:v2.2.3
    environment:
      MODE: standalone
    ports:
      - "8848:8848"
    networks:
      - app-network

  # Sentinel 限流
  sentinel:
    image: bladex/sentinel-dashboard:1.8.6
    ports:
      - "8858:8858"
    networks:
      - app-network

volumes:
  mysql_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

### 9.2 生产环境 Kubernetes 部署

```yaml
# Kubernetes 部署配置 (简化示例)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-service
  labels:
    app: backend-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend-service
  template:
    metadata:
      labels:
        app: backend-service
    spec:
      containers:
      - name: backend
        image: ${DOCKER_REGISTRY}/backend:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        env:
        - name: SPRING_PROFILES_ACTIVE
          value: "prod"
        - name: JAVA_OPTS
          value: "-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"
        readinessProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 15
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  selector:
    app: backend-service
  ports:
  - port: 8080
    targetPort: 8080
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: backend-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
spec:
  tls:
  - hosts:
    - api.lesson-platform.com
    secretName: tls-secret
  rules:
  - host: api.lesson-platform.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 8080
```

---

**文档版本**: 2.0  
**最后更新**: 2026-03-24  
**作者**: 全自动家教备课平台团队
