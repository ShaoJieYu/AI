# 功能模块详细设计

📌 **文档概述**  
本文档深入介绍各个功能模块的详细设计、功能点清单、技术实现方案和实现细节。这是开发团队重要的参考文档，涵盖了用户与账户、学生管理、智能备课、教学资源、教学进度以及多端协同等六大核心模块。

⏱️ **阅读时间**  
15-20 分钟

🎯 **适用场景**  
- 开发团队需求分析和技术方案设计
- 代码实现的功能参考
- 模块间接口和数据交互设计
- 技术债务和优化建议讨论

---

## 1. 用户与账户模块

### 1.1 功能概览

**模块职责**: 提供安全的身份认证、用户信息管理和权限控制

### 1.2 功能点详解

#### 注册与登录
- **手机号注册**: 验证手机号唯一性 → 发送短信验证码 → 设置密码 → 完善基本信息
- **邮箱注册**: 验证邮箱唯一性 → 发送验证邮件 → 设置密码 → 完善基本信息
- **微信快捷登录**: 微信扫码 → OAuth 2.0 授权 → 自动创建账户 → 完善教师信息
- **登录方式**: 手机号 + 密码 / 邮箱 + 密码 / 微信快捷登录

#### 个人信息管理
- 基本信息编辑（姓名、头像、性别、地区）
- 联系方式管理（手机号、邮箱、微信号）
- 教学背景信息（教龄、教学科目、教学年级）
- 账户安全设置（密码修改、二次验证、登录设备管理）

#### 教学资质认证
- 身份证认证（身份证号 + 正反面照片）
- 教师证认证（教师证号 + 照片）
- 学位证认证（学位证号 + 照片）
- 审核状态追踪（待审核、已通过、未通过）

#### 会员管理
- 会员等级（体验版 / 专业版 / 高级版）
- 订阅管理（订阅周期、自动续费）
- 额度控制（月度备课次数限制）
- 价格模型（按月 / 按年订阅）

### 1.3 技术实现方案

#### 身份认证
```
技术栈: Spring Security 6.x + JWT + OAuth 2.0

工作流程:
1. 用户提交凭证（手机号+密码 或 邮箱+密码 或 微信授权码）
2. 后端验证凭证有效性
3. 若有效，生成 JWT Token:
   - Access Token: 2 小时有效期
   - Refresh Token: 7 天有效期
4. 返回 Token 给前端
5. 前端将 Token 存储到 localStorage/sessionStorage
6. 后续请求在 Authorization header 中带入 Token
7. 后端通过 JwtFilter 验证 Token 有效性
```

#### 短信验证码服务
- 集成阿里云短信服务
- 验证码有效期: 5 分钟
- 防重发: 同一手机号 60 秒内只能发送一次
- 错误重试: 连续错误 3 次后需要重新发送验证码

#### 微信 OAuth 2.0 集成
- 配置微信应用 AppID 和 AppSecret
- 前端引导用户点击"微信登录"
- 跳转到微信授权页面
- 微信回调返回授权码
- 后端用授权码从微信服务器换取用户信息
- 创建或更新本地用户账户

#### 数据加密存储
- 密码存储: bcrypt 加密（salt rounds: 12）
- 敏感信息加密: AES-256-GCM（身份证号、教师证号）
- 加密密钥: 从 Nacos 配置中心获取，定期轮换

### 1.4 数据模型

```sql
-- 用户表
CREATE TABLE user (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    phone_number VARCHAR(20) UNIQUE,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    wechat_id VARCHAR(100),
    real_name VARCHAR(50),
    avatar_url VARCHAR(255),
    gender ENUM('MALE', 'FEMALE', 'UNKNOWN'),
    region VARCHAR(100),
    teaching_age INT,
    teaching_subjects VARCHAR(500),
    teaching_grades VARCHAR(500),
    member_level ENUM('TRIAL', 'PROFESSIONAL', 'PREMIUM'),
    subscription_start_date DATE,
    subscription_end_date DATE,
    auto_renew BOOLEAN DEFAULT TRUE,
    monthly_lesson_quota INT DEFAULT 10,
    is_certified BOOLEAN DEFAULT FALSE,
    certification_status ENUM('PENDING', 'APPROVED', 'REJECTED'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);
```

---

## 2. 学生管理模块

### 2.1 功能概览

**模块职责**: 建立学生档案系统，全面记录学生学情，为个性化教学提供数据基础

### 2.2 功能点详解

#### 学生档案管理
- **基本信息**: 姓名、性别、出生日期、学号
- **学校信息**: 学校名称、所在班级、年级
- **学习背景**: 起始学习时间、已学课时数
- **联系方式**: 家长手机号、邮箱

#### 学情信息录入
系统提供分步表单，教师可逐步补充学生信息：

1. **学习基础**
   - 数学基础：强 / 中等 / 弱
   - 上一阶段学习成绩（百分制）
   - 主要薄弱知识点（多选）

2. **学习能力**
   - 理解能力: 快 / 中等 / 慢
   - 记忆能力: 强 / 中等 / 弱
   - 解题能力: 独立 / 需引导 / 依赖讲解

3. **学习习惯**
   - 学习态度: 积极主动 / 配合 / 被动
   - 学习动力: 强 / 中等 / 弱
   - 预习习惯: 有 / 无
   - 复习频率: 每天 / 每周 / 不主动复习

4. **性格特点**
   - 性格类型: 内向 / 外向 / 中立
   - 学习焦虑度: 高 / 中 / 低
   - 挫折承受能力: 强 / 中等 / 弱
   - 竞争意识: 强 / 中等 / 弱

#### 教学目标设定
- **短期目标**（2-4 周）: 掌握某个知识点或技能
- **中期目标**（2-3 个月）: 学科成绩达到某个水平
- **长期目标**（1 年）: 学科综合提升或竞赛目标

#### 成长轨迹记录
- 课堂表现记录（课堂活跃度、提问次数、作业完成情况）
- 成绩变化记录（各次测试成绩、进度评估）
- 里程碑标记（达成目标、突破瓶颈）
- 备注和建议（教师特别观察）

### 2.3 技术实现方案

#### 数据存储架构
- **主库**: MySQL 8.0
- **分片策略**: 基于用户 ID 分库，基于学生创建时间分表
- **版本控制**: student_version 字段，每次更新递增
- **审计日志**: student_audit_log 表，记录所有修改

#### 批量导入导出
- **格式**: Excel 模板（.xlsx）
- **导入流程**: 文件上传 → 模板验证 → 数据解析 → 批量插入
- **导出流程**: 查询数据 → Excel 生成 → 文件下载
- **模板**: 包含学生基本信息、学情信息、目标等字段

#### 敏感信息加密
```
加密字段:
- 学生姓名（个人隐私）
- 身份证号（如有）
- 家长手机号
- 学校信息（精确到班级）

加密算法: AES-256-GCM
加密密钥: 从 Nacos 配置中心获取，分离式加密（不同用户可能使用不同密钥）
```

### 2.4 数据模型

```sql
-- 学生表
CREATE TABLE student (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL REFERENCES user(id),
    name VARCHAR(50) NOT NULL,
    gender ENUM('MALE', 'FEMALE', 'UNKNOWN'),
    birth_date DATE,
    student_id VARCHAR(50),
    school_name VARCHAR(100),
    grade INT,
    class_name VARCHAR(50),
    learning_start_date DATE,
    total_lesson_hours INT DEFAULT 0,
    parent_phone VARCHAR(20),
    parent_email VARCHAR(100),
    is_archived BOOLEAN DEFAULT FALSE,
    version INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    UNIQUE KEY uk_user_student_name (user_id, name),
    KEY idx_user_created (user_id, created_at)
);

-- 学情信息表
CREATE TABLE student_learning_info (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id BIGINT NOT NULL REFERENCES student(id),
    math_foundation ENUM('STRONG', 'MEDIUM', 'WEAK'),
    previous_score INT,
    weak_knowledge_points JSON,
    comprehension_speed ENUM('FAST', 'MEDIUM', 'SLOW'),
    memory_ability ENUM('STRONG', 'MEDIUM', 'WEAK'),
    problem_solving ENUM('INDEPENDENT', 'GUIDED', 'DEPENDENT'),
    learning_attitude ENUM('ACTIVE', 'COOPERATIVE', 'PASSIVE'),
    learning_motivation ENUM('STRONG', 'MEDIUM', 'WEAK'),
    preview_habit BOOLEAN,
    review_frequency ENUM('DAILY', 'WEEKLY', 'INACTIVE'),
    personality_type ENUM('INTROVERT', 'EXTROVERT', 'NEUTRAL'),
    learning_anxiety ENUM('HIGH', 'MEDIUM', 'LOW'),
    frustration_tolerance ENUM('STRONG', 'MEDIUM', 'WEAK'),
    competition_awareness ENUM('STRONG', 'MEDIUM', 'WEAK'),
    version INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 教学目标表
CREATE TABLE teaching_goal (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id BIGINT NOT NULL REFERENCES student(id),
    goal_type ENUM('SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM'),
    target_description VARCHAR(500) NOT NULL,
    deadline DATE NOT NULL,
    status ENUM('NOT_STARTED', 'IN_PROGRESS', 'ACHIEVED', 'CANCELLED'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 学生成长轨迹表
CREATE TABLE student_growth_record (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id BIGINT NOT NULL REFERENCES student(id),
    record_type ENUM('CLASS_PERFORMANCE', 'SCORE', 'MILESTONE', 'REMARK'),
    content TEXT NOT NULL,
    metric_value DECIMAL(5,2),
    recorded_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. 智能备课模块（核心）

### 3.1 功能概览

**模块职责**: AI 驱动的个性化备课内容自动生成，是平台的核心竞争力

### 3.2 功能点详解

#### 学生信息输入表单
用户可以选择两种方式输入：

1. **结构化输入**：使用表单逐项填写
   - 学生选择（从已有学生列表中选）
   - 课程信息（科目、年级、章节）
   - 授课时间（课程时长）
   - 学习目标（本节课的教学目标）
   - 其他特殊需求

2. **自由文本输入**：手写或粘贴文本
   - 系统 NLP 解析，自动提取关键信息
   - 示例："高三数学，学生基础一般，要讲导数应用，约 40 分钟，需要重点讲解且提供习题"

#### 备课模式选择
系统提供 6 种预设模式，用户选择后系统自动调整生成策略：

| 模式 | 适用场景 | 生成内容 | 时间预估 |
|------|--------|--------|--------|
| **新课讲解** | 学生首次学习新知识点 | 知识点讲解 + 例题 + 习题 | 8-10 秒 |
| **习题讲解** | 学生做错习题需要讲解 | 习题分析 + 详细解答 + 同类型题 | 5-8 秒 |
| **考前复习** | 考试前综合复习 | 知识点总结 + 易错点 + 模拟题 | 10-12 秒 |
| **巩固强化** | 复习已学知识点 | 关键点梳理 + 对比题 + 进阶题 | 6-9 秒 |
| **拓展延伸** | 拓展学生思维 | 知识点应用 + 推导过程 + 竞赛题 | 8-10 秒 |
| **快速问答** | 学生临时提问 | 直接回答 + 简要解释 + 参考资源 | 3-5 秒 |

#### AI 备课内容生成
系统生成以下内容类型：

1. **教案结构** (Markdown 格式)
   ```
   # 第X课 知识点名称
   
   ## 一、导入（5分钟）
   - 生活场景导入
   - 旧知识回顾
   
   ## 二、知识讲解（15分钟）
   - 概念定义
   - 原理解释
   - 推导过程
   - 注意事项
   
   ## 三、例题分析（10分钟）
   - 例题1（基础）
   - 例题2（中等）
   - 例题3（提升）
   
   ## 四、课堂练习（8分钟）
   - 题型1: XXX（2道）
   - 题型2: XXX（2道）
   
   ## 五、课堂总结（2分钟）
   - 关键点总结
   - 作业布置
   ```

2. **知识点讲解** 
   - 定义和性质
   - 推导和证明过程
   - 常见误区
   - 应用场景

3. **习题系统**
   - 基础题（巩固知识点）
   - 中等题（综合应用）
   - 提升题（拓展思维）
   - 答案与解析

#### 教案在线编辑
- **富文本编辑**: TinyMCE 或 TipTap 富文本编辑器
- **公式支持**: KaTeX 数学公式
- **内容拖拽**: dnd-kit 库支持章节拖拽排序
- **实时预览**: 所见即所得编辑
- **版本管理**: 编辑历史，支持版本回滚

#### 习题生成与组卷
- **自动组卷**: 系统根据难度等级和题型自动组合题目
- **难度分配**: 基础题 30% + 中等题 50% + 提升题 20%
- **题型均衡**: 避免重复题型
- **自定义组卷**: 教师可手动调整题目顺序和选择

#### 版本管理
- **自动保存**: 编辑时每 30 秒自动保存一次
- **版本历史**: 保存所有版本，支持快速切换
- **版本对比**: 可视化对比两个版本的差异（diff 高亮）
- **版本标注**: 教师可对版本添加标注说明

### 3.3 技术实现方案

#### AI 服务架构
```
┌─ FastAPI 应用 ──────────────────────┐
│  │                                  │
│  ├─ Prompt 管理层                  │
│  │   ├─ 备课 Prompt 模板            │
│  │   ├─ 习题 Prompt 模板            │
│  │   └─ 内容审核 Prompt             │
│  │                                  │
│  ├─ LangChain 编排层                │
│  │   ├─ 链式处理（Chain）           │
│  │   ├─ 智能路由（Router）          │
│  │   └─ RAG 检索增强                │
│  │                                  │
│  ├─ 大模型调用层                    │
│  │   ├─ 通义千问（qwen-turbo）      │
│  │   ├─ 通义千问增强版（qwen-plus） │
│  │   ├─ 通义千问最强版（qwen-max）  │
│  │   └─ ChatGLM 本地备选            │
│  │                                  │
│  ├─ Milvus RAG 层                   │
│  │   ├─ 知识点向量库                │
│  │   ├─ 教案案例库                  │
│  │   └─ 习题库                      │
│  │                                  │
│  └─ 缓存与性能优化                  │
│      ├─ Redis 缓存                  │
│      ├─ 本地 Caffeine 缓存          │
│      └─ 结果缓存（相同输入）       │
└────────────────────────────────────┘
```

#### Prompt 工程
```python
# 备课内容生成 Prompt 模板

LESSON_GENERATION_PROMPT = """
你是一位经验丰富的教师，需要根据学生信息生成个性化的教案。

【学生信息】
- 学生姓名: {student_name}
- 学科: {subject}
- 年级: {grade}
- 学习基础: {learning_foundation}
- 薄弱知识点: {weak_points}
- 学习特点: {learning_characteristics}

【课程信息】
- 课题: {topic}
- 课程时长: {duration} 分钟
- 教学模式: {mode}
- 学习目标: {learning_objective}

【要求】
1. 教案结构: 导入 -> 知识讲解 -> 例题分析 -> 课堂练习 -> 总结
2. 针对学生的学习特点进行设计
3. 包含 {num_examples} 个由浅到深的例题
4. 避免学生已掌握的知识点重复讲解
5. 添加学生容易出错的地方的特别提醒

【输出格式】
使用 Markdown 格式，包含标题、小标题、列表等格式化内容。
"""

# Few-shot 示例
EXAMPLES = [
    {
        "input": "初中数学，学生二次方程较弱，要讲配方法",
        "output": "# 第X课 配方法\n\n## 一、导入（5分钟）\n..."
    },
    # 更多示例...
]
```

#### 模型路由策略
```python
def select_model(lesson_type: str, complexity: int, use_rag: bool) -> str:
    """
    根据备课类型和复杂度选择合适的模型
    
    路由规则:
    1. 快速问答 -> qwen-turbo（快速便宜）
    2. 新课讲解（基础） -> qwen-plus（质量平衡）
    3. 新课讲解（高级） -> qwen-max（最高质量）
    4. 考前复习 -> qwen-plus（内容综合性强）
    5. 如果需要 RAG 增强 -> 优先使用较强模型
    6. 如果主模型失败 -> 自动 Fallback 到 ChatGLM 本地模型
    """
    
    if lesson_type == "quick_answer":
        return "qwen-turbo"
    elif lesson_type == "new_lesson" and complexity <= 3:
        return "qwen-plus"
    elif lesson_type == "new_lesson" and complexity > 3:
        return "qwen-max"
    elif lesson_type in ["exam_review", "consolidation"]:
        return "qwen-plus"
    
    if use_rag:
        return "qwen-plus" if "qwen" in selected else "chatglm-pro"
    
    return selected
```

#### RAG（检索增强生成）流程
```
1. 用户输入备课需求
   ↓
2. 提取关键信息（科目、知识点、学生学情等）
   ↓
3. Milvus 向量检索
   - 查询知识点库：找相关知识点讲解案例
   - 查询教案库：找相似学生和教学场景的教案
   - 查询习题库：找对应知识点的高质量习题
   ↓
4. 知识融合
   - 将检索到的知识融入 Prompt
   - 结合学生学情调整相关案例
   ↓
5. LLM 生成
   - 增强后的 Prompt 送入大模型
   - 大模型生成个性化教案
   ↓
6. 质量审核
   - 检查内容准确性
   - 检查与学生学情的适配度
   ↓
7. 返回结果给用户
```

#### 多级缓存策略
```
第一层: Redis 缓存（分布式）
- 缓存 Key: "lesson:{user_id}:{student_id}:{topic}"
- 缓存内容: 完整教案 JSON
- TTL: 7 天
- 命中率预期: 60%（相同学生相同知识点）

第二层: Caffeine 缓存（本地）
- 缓存热门知识点的讲解模板
- 缓存常用的 Prompt 模板
- TTL: 24 小时
- 预热: 每天凌晨加载

第三层: 结果缓存
- 如果输入完全相同，直接返回缓存
- 通过 Hash 计算输入指纹
```

### 3.4 数据模型

```sql
-- 备课记录表
CREATE TABLE lesson_record (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL REFERENCES user(id),
    student_id BIGINT NOT NULL REFERENCES student(id),
    subject VARCHAR(50) NOT NULL,
    topic VARCHAR(200) NOT NULL,
    mode ENUM('NEW_LESSON', 'PROBLEM_SOLVING', 'EXAM_REVIEW', 'CONSOLIDATION', 'EXTENSION', 'QUICK_QA'),
    lesson_plan JSON NOT NULL,
    knowledge_points JSON,
    exercises JSON,
    generation_model VARCHAR(50),
    generation_time_ms INT,
    status ENUM('DRAFT', 'GENERATED', 'EDITED', 'PUBLISHED'),
    version INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_user_created (user_id, created_at),
    KEY idx_student_created (student_id, created_at)
);

-- 备课版本历史表
CREATE TABLE lesson_version_history (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    lesson_record_id BIGINT NOT NULL REFERENCES lesson_record(id),
    version_number INT NOT NULL,
    content JSON NOT NULL,
    changed_by VARCHAR(100),
    change_reason VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_lesson_version (lesson_record_id, version_number)
);
```

---

## 4. 教学资源模块

### 4.1 功能概览

**模块职责**: 构建知识点库、教学模板库、题型库等资源库，支持备课 RAG 检索和教学资源推荐

### 4.2 功能点详解

#### 知识点库
- **分类体系**: 按科目和年级分类
  - 科目: 数学、语文、英语、物理、化学、生物、历史、地理、政治
  - 年级: 小学（1-6年级）、初中（7-9年级）、高中（10-12年级）
  - 子知识点: 树形结构，支持多级

- **知识点内容**:
  - 定义和性质
  - 重要公式和定理
  - 常见变化和拓展
  - 易错点提醒
  - 相关知识点关联

- **向量存储**: 每个知识点的讲解内容转化为向量存储在 Milvus 中，支持语义检索

#### 教学模板库
- **模板类型**:
  - 课程导入模板（故事引入、现实场景引入等）
  - 讲解模板（递进式讲解、对比式讲解等）
  - 练习模板（渐进式练习、分类练习等）
  - 总结模板（知识图谱总结、要点梳理等）

- **使用场景**:
  - 系统生成教案时自动选择合适的模板
  - 教师可手动应用某个模板到教案中
  - 教师可上传自己的模板供他人参考

#### 题型库与解题方法
- **题型分类**:
  - 选择题、填空题、简答题、证明题、计算题等
  - 每种题型按难度分级（基础、中等、提升）

- **解题方法**:
  - 解题思路（第一步怎么想，第二步怎么做）
  - 常见错误和改正
  - 快速技巧和口诀
  - 变式拓展

- **经典例题**:
  - 每种题型提供 3-5 个代表性例题
  - 包含完整解答过程和关键点注解

#### 资源收藏与管理
- 收藏知识点、模板、题型
- 创建收藏夹进行分类管理
- 标签系统用于快速检索
- 分享收藏给其他教师

### 4.3 技术实现方案

#### Meilisearch 搜索
```
配置:
- 版本: 1.6.x
- 特点: 轻量级、快速、开箱即用
- 优势: 比 Elasticsearch 资源消耗少 50%

搜索类型:
1. 全文搜索: 知识点名称、讲解内容
2. 模糊搜索: 拼音搜索、近似匹配
3. 字段过滤: 按科目、年级、难度过滤
4. 排序: 按热度、按收藏量、按最新
```

#### 知识点图谱
```
结构:
- 节点: 知识点
- 边: 知识点之间的关系
  - 前置关系: A 是 B 的前置知识
  - 包含关系: A 是 B 的子概念
  - 应用关系: A 的应用场景涉及 B
  - 相关关系: A 和 B 相关

用途:
1. 推荐学习路径: 基于学生当前学习的知识点，推荐相关知识
2. 诊断学习问题: 如果学生在 A 点卡住，可能是前置知识 B 不掌握
3. 生成学习报告: 可视化学生掌握的知识点网络
```

#### 资源标签系统
```
标签维度:
1. 学科维度: 数学、语文、英语...
2. 年级维度: 小学、初中、高中
3. 难度维度: 基础、中等、提升、竞赛
4. 题型维度: 选择题、填空题、证明题...
5. 知识点维度: 导数、三角函数、向量...
6. 教学方法维度: 归纳法、演绎法、类比法...

标签使用:
- 资源可同时有多个标签
- 教师可通过标签组合快速检索
- 推荐系统基于标签进行精准推荐
```

#### 智能推荐算法
```
推荐维度:

1. 基于用户行为的协同过滤
   - 如果用户 A 喜欢的资源，与用户 B 喜欢的相似
   - 向 B 推荐 A 喜欢的其他资源

2. 基于内容的推荐
   - 推荐与用户当前浏览资源相似的其他资源
   - 使用向量相似度计算

3. 基于教学场景的推荐
   - 根据用户当前编辑的教案
   - 推荐相关的知识点讲解、例题、模板

4. 基于学生学情的推荐
   - 根据学生的学情信息（基础弱、进度快等）
   - 推荐对应难度的习题和讲解方式
```

### 4.4 数据模型

```sql
-- 知识点表
CREATE TABLE knowledge_point (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    subject VARCHAR(50) NOT NULL,
    grade INT NOT NULL,
    parent_id BIGINT REFERENCES knowledge_point(id),
    name VARCHAR(100) NOT NULL,
    definition TEXT,
    key_formulas JSON,
    common_mistakes JSON,
    application_scenarios JSON,
    vector_embedding VECTOR(1536),
    search_keywords VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_subject_grade_name (subject, grade, name)
);

-- 知识点关系表
CREATE TABLE knowledge_graph_edge (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    source_id BIGINT NOT NULL REFERENCES knowledge_point(id),
    target_id BIGINT NOT NULL REFERENCES knowledge_point(id),
    relationship_type ENUM('PREREQUISITE', 'CONTAINS', 'APPLICATION', 'RELATED'),
    strength DECIMAL(3,2),
    UNIQUE KEY uk_edge (source_id, target_id, relationship_type)
);

-- 教学模板表
CREATE TABLE teaching_template (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    template_type ENUM('INTRODUCTION', 'EXPLANATION', 'PRACTICE', 'SUMMARY'),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    applicable_grades JSON,
    applicable_subjects JSON,
    applicable_modes JSON,
    creator_id BIGINT REFERENCES user(id),
    is_public BOOLEAN DEFAULT FALSE,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 题型库表
CREATE TABLE exercise_type (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    subject VARCHAR(50) NOT NULL,
    type_name VARCHAR(100) NOT NULL,
    difficulty ENUM('BASIC', 'MEDIUM', 'ADVANCED'),
    solving_methods JSON,
    common_errors JSON,
    tips_and_tricks JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_subject_type_difficulty (subject, type_name, difficulty)
);
```

---

## 5. 教学进度模块

### 5.1 功能概览

**模块职责**: 追踪教学进度，评估学习效果，生成学习报告

### 5.2 功能点详解

#### 课程计划与安排
- 创建课程计划（科目、总课时、计划周期）
- 分课时设定教学目标和内容
- 日历视图展示课程安排
- 课程提醒（课前提醒、课后跟进提醒）
- 支持拖拽调整课程时间

#### 进度跟踪与统计
- 课程完成进度（已完成 X / 总计 Y）
- 学时统计（已授课时数、计划课时数）
- 进度仪表板（可视化展示多维度进度）
- 进度预警（如果进度落后计划，自动提醒）

#### 学习效果评估
- **成绩评估**: 学生各次考试成绩、单元测试成绩
- **能力评估**: 基于教师观察的学生能力维度评分
  - 知识掌握度（0-100）
  - 理解深度（0-100）
  - 应用能力（0-100）
  - 学习主动性（0-100）
  
- **进度评估**: 学习是否按计划进行，是否达成短期目标

#### 学习报告生成
- **周报**: 本周学习内容总结、成绩变化、建议
- **月报**: 本月学习总结、进度评估、下月计划
- **阶段报告**: 一个学习阶段（如一个学期）的综合报告
- **报告内容**:
  - 成绩趋势图（折线图展示成绩变化）
  - 知识点掌握雷达图
  - 学习目标完成情况表
  - 学习建议（个性化建议）

### 5.3 技术实现方案

#### 数据可视化（ECharts）
```javascript
// 成绩趋势图
{
  type: 'line',
  data: {
    xAxis: ['Week1', 'Week2', 'Week3', ...],
    series: [
      { name: '本次成绩', data: [85, 87, 89, ...] },
      { name: '班级平均', data: [82, 83, 85, ...] },
      { name: '目标值', data: [90, 90, 90, ...] }
    ]
  },
  options: {
    smooth: true,
    animation: true,
    dataZoom: { enable: true }
  }
}

// 知识点掌握雷达图
{
  type: 'radar',
  data: {
    indicators: [
      { name: '集合', max: 100 },
      { name: '函数', max: 100 },
      { name: '导数', max: 100 },
      { name: '积分', max: 100 },
      { name: '概率', max: 100 }
    ],
    series: [
      { name: '学生掌握度', value: [85, 72, 90, 68, 80] }
    ]
  }
}
```

#### 报告模板引擎
```
技术: Thymeleaf / Freemarker 模板引擎

模板结构:
1. 报告头部: 学生信息、报告生成时间
2. 关键指标: 总成绩、进度完成度、目标达成率
3. 详细数据: 成绩列表、学习记录、评估评分
4. 可视化图表: ECharts 配置 JSON（前端渲染）
5. 总结与建议: AI 生成的个性化建议
6. 报告尾部: 教师签字区、学生签字区（打印时）

PDF 导出:
- 前端: 使用 react-pdf 库或浏览器 print 功能
- 后端: 使用 iText 7 或 Flying Saucer 库生成 PDF
```

### 5.4 数据模型

```sql
-- 课程计划表
CREATE TABLE course_plan (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL REFERENCES user(id),
    student_id BIGINT NOT NULL REFERENCES student(id),
    subject VARCHAR(50) NOT NULL,
    total_hours INT NOT NULL,
    planned_start_date DATE NOT NULL,
    planned_end_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_user_student (user_id, student_id)
);

-- 课程记录表
CREATE TABLE lesson_session (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    course_plan_id BIGINT NOT NULL REFERENCES course_plan(id),
    lesson_date DATE NOT NULL,
    lesson_time_start TIME NOT NULL,
    lesson_time_end TIME NOT NULL,
    duration_minutes INT,
    topic VARCHAR(200),
    status ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED'),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_course_date (course_plan_id, lesson_date)
);

-- 学生成绩表
CREATE TABLE student_score (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id BIGINT NOT NULL REFERENCES student(id),
    exam_name VARCHAR(100) NOT NULL,
    subject VARCHAR(50),
    score DECIMAL(5,2) NOT NULL,
    exam_date DATE NOT NULL,
    full_score INT DEFAULT 100,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_student_date (student_id, exam_date)
);

-- 学生能力评估表
CREATE TABLE student_ability_assessment (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id BIGINT NOT NULL REFERENCES student(id),
    assessment_date DATE NOT NULL,
    knowledge_mastery INT,
    understanding_depth INT,
    application_ability INT,
    learning_initiative INT,
    overall_comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 学习报告表
CREATE TABLE learning_report (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id BIGINT NOT NULL REFERENCES student(id),
    report_type ENUM('WEEKLY', 'MONTHLY', 'PHASE'),
    report_period_start DATE NOT NULL,
    report_period_end DATE NOT NULL,
    content JSON NOT NULL,
    ai_suggestions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. 多端协同模块

### 6.1 功能概览

**模块职责**: 实现 Web、App、小程序三端数据实时同步和无缝协作

### 6.2 功能点详解

#### Web 端
- 技术栈: React 18 + TypeScript + Vite
- 完整功能: 所有 6 个模块的完整功能
- 用户场景: 教师在办公室或家中的主要工作平台

#### 移动 App
- 技术栈: Flutter 3.x（iOS + Android）
- 核心功能:
  - 学生管理（查看、编辑）
  - 快速备课（简化版界面）
  - 教案查看和打印
  - 学习报告查看
  - 消息推送（课程提醒、学生动态）

- 特色功能:
  - 生物识别登录（指纹、Face ID）
  - 离线缓存（无网络时可查看已下载的教案）
  - 离线编辑（有网时自动同步）

#### 微信小程序
- 技术栈: **Taro 4.x**（一套代码多端编译）
- 核心功能:
  - 学生快速查看
  - 简化备课（快速问答）
  - 教案分享（生成分享海报、分享给学生）
  - 通知提醒

- 分享功能:
  - 教师可将教案生成分享海报
  - 学生扫码可预览教案（需要权限）
  - 支持发送到微信群

#### 数据实时同步
- **同步场景**:
  1. 教师在 Web 端修改学生信息 → App 和小程序实时更新
  2. 教师在 App 端编辑教案 → Web 端实时显示（如果打开）
  3. 学生信息更新 → 所有端同步，用于备课时的最新信息

- **同步机制**:
  - 使用 WebSocket 建立长连接
  - 数据变更时推送通知
  - 离线情况下通过轮询同步

### 6.3 技术实现方案

#### WebSocket 实时通信
```
架构:
┌─ Web 浏览器         ─ WebSocket ─┐
├─ Flutter App        ─ WebSocket ─┼─ WebSocket Server
└─ 微信小程序         ─ WebSocket ─┤
                                   └─ 应用服务器

工作流程:
1. 客户端连接: 用户登录时建立 WebSocket 连接
2. 身份认证: 通过 JWT Token 验证用户身份
3. 房间管理: 用户加入个人的同步房间（room: user_{user_id}）
4. 事件订阅: 监听特定类型的数据变更事件
5. 数据变更: 当数据更新时，服务器推送给所有连接的客户端
6. 离线处理: 连接断开时，缓存消息，重连后补发

消息格式:
{
  "type": "STUDENT_UPDATED",
  "data": {
    "student_id": 123,
    "changes": {
      "name": "新名字",
      "learning_foundation": "STRONG"
    }
  },
  "timestamp": "2026-03-24T10:30:00Z"
}
```

#### 冲突检测与合并算法
```
场景: 教师同时在 Web 端和 App 端修改同一个学生的信息

冲突检测:
- 每条记录有版本号 (version)
- 提交修改时比对当前版本和提交版本
- 版本不一致 -> 检测冲突

合并算法 (字段级合并):
1. 获取最新数据库版本（基准版本 base）
2. 获取本地版本（local）
3. 获取远程版本（remote）
4. 对比三个版本，逐字段合并：
   - 如果字段在 base 和 local 中相同 -> 使用 remote
   - 如果字段在 base 和 remote 中相同 -> 使用 local
   - 如果三个版本都不同 -> 冲突，提示用户选择
5. 更新版本号，保存合并结果

冲突UI:
用户看到冲突时，系统显示：
- 本地值 vs 远程值
- 用户选择保留哪个值或手动合并
- 确认后自动同步
```

#### 离线缓存支持
```
App 端离线缓存策略:

缓存位置: Hive 本地数据库

缓存数据:
1. 当前用户的学生列表
2. 最近 10 份教案
3. 学生基本信息和学情
4. 知识点库（离线搜索用）

缓存更新:
- 第一次登录时全量下载
- 每次打开 App 时同步增量更新
- 支持手动刷新

离线编辑:
- 用户可离线编辑教案
- 编辑的内容保存到本地
- 有网络时自动上传和同步
- 如果远程有新版本，提示冲突

离线同步:
- 记录用户离线时的所有操作
- 网络恢复时按顺序提交
- 如果有冲突，使用合并算法解决
```

#### 三端共享逻辑
```
通过 Taro 和 Flutter 实现多端共享:

1. 共享的业务逻辑:
   - 数据验证逻辑
   - 加密/解密逻辑
   - 计算和转换逻辑

2. 实现方式:
   - 后端 API 执行核心逻辑（推荐）
   - 共享代码库（JavaScript for Web + Taro, Dart for Flutter）
   - 接口标准化确保三端调用一致

3. 数据一致性保障:
   - 所有数据修改操作通过后端 API
   - API 包含校验逻辑，保证数据完整性
   - 版本控制和乐观锁机制防止并发冲突
```

---

## 相关文档导航

🔗 **相关文档链接**

- 📖 [**00-PROJECT-OVERVIEW.md**](./00-PROJECT-OVERVIEW.md) - 返回项目概述
- 📅 [**02-MILESTONES.md**](./02-MILESTONES.md) - 开发阶段详细规划
- ⚠️ [**03-RISK-ASSESSMENT.md**](./03-RISK-ASSESSMENT.md) - 风险分析与应对
- 📚 [**INDEX.md**](../INDEX.md) - 返回完整文档导航

---

📚 **返回导航**

[← 返回文档索引](../INDEX.md)

---

**文档版本**: 2.0  
**最后更新**: 2026-03-24  
**作者**: 全自动家教备课平台团队
