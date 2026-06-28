# API 接口设计

📌 **文档概述**：本文档定义了全自动家教备课平台的 RESTful API 规范、接口设计规范和核心接口定义。包括统一的请求/响应格式、错误码规范、版本管理策略，以及备课生成、学生管理等核心业务 API。

⏱️ **阅读时间**：12-15 分钟  
🎯 **适用场景**：API 开发、前后端集成、API 文档参考、测试用例设计

## 目录

- [RESTful API 规范](#restful-api-规范)
  - [统一响应格式](#统一响应格式)
  - [错误码规范](#错误码规范)
- [核心 API 接口](#核心-api-接口)
  - [备课生成接口](#备课生成接口)
- [API 版本管理](#api-版本管理)

---

## RESTful API 规范

### 统一响应格式

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

### 错误码规范

| 错误码范围 | 含义 | 示例 |
|------------|------|------|
| 1000-1999 | 系统错误 | 1001-系统繁忙, 1002-服务不可用 |
| 2000-2999 | 参数错误 | 2001-参数为空, 2002-参数格式错误 |
| 3000-3999 | 认证错误 | 3001-未登录, 3002-Token过期, 3003-权限不足 |
| 4000-4999 | 业务错误 | 4001-学生不存在, 4002-备课生成失败 |
| 5000-5999 | AI 服务错误 | 5001-AI服务超时, 5002-内容审核不通过 |

---

## 核心 API 接口

### 备课生成接口

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

---

## API 版本管理

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

🔗 **相关文档链接**：
- [数据库设计](./02-DATABASE-DESIGN.md) - API 数据结构的数据库映射
- [系统架构设计](../design/01-ARCHITECTURE-DESIGN.md) - API 网关和路由设计
- [前端架构设计](./04-FRONTEND-DESIGN.md) - 前端 API 客户端实现

📚 **返回导航**：[返回设计文档首页](./README.md)
