# 数据库设计

📌 **文档概述**：本文档详细描述了全自动家教备课平台的数据库架构设计，包括用户与权限管理、学生信息档案、备课内容存储等核心数据模型。通过规范化设计和适当的索引策略，确保系统的数据一致性、查询性能和可扩展性。

⏱️ **阅读时间**：15-20 分钟  
🎯 **适用场景**：数据库开发、数据架构设计、ORM 映射、数据库优化

## 目录

- [核心数据模型](#核心数据模型)
  - [用户与权限](#用户与权限)
  - [学生管理](#学生管理)
  - [备课内容](#备课内容)

---

## 核心数据模型

### 用户与权限

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

### 学生管理

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

### 备课内容

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

🔗 **相关文档链接**：
- [API 接口设计](./03-API-DESIGN.md) - 数据库与 API 的映射
- [系统架构设计](../design/01-ARCHITECTURE-DESIGN.md) - 架构整体视图
- [前端架构设计](./04-FRONTEND-DESIGN.md) - 数据模型在前端的应用

📚 **返回导航**：[返回设计文档首页](./README.md)
