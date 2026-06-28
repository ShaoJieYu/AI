# AI 引擎设计

📌 **文档概述**：本文档详细阐述了全自动家教备课平台的 AI 引擎架构，包括基于 LangChain 和 Milvus 的备课生成流程、Prompt 设计策略、多模型路由机制，以及多端实时同步的数据架构。通过 RAG 增强和智能冲突解决，确保生成内容的准确性和跨设备的数据一致性。

⏱️ **阅读时间**：18-22 分钟  
🎯 **适用场景**：AI 模型集成、LangChain 应用、向量数据库使用、实时同步设计

## 目录

- [备课生成流程](#备课生成流程)
- [Prompt 设计策略](#prompt-设计策略)
- [模型路由策略](#模型路由策略)
- [多端同步设计](#多端同步设计)
  - [数据同步架构](#数据同步架构)
  - [冲突解决策略](#冲突解决策略)

---

## 备课生成流程

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

---

## Prompt 设计策略

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

---

## 模型路由策略

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

## 多端同步设计

### 数据同步架构

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

### 冲突解决策略

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

🔗 **相关文档链接**：
- [API 接口设计](./03-API-DESIGN.md) - AI 引擎的 API 暴露方式
- [数据库设计](./02-DATABASE-DESIGN.md) - 数据存储和检索的实现
- [安全与部署](./06-DEPLOYMENT-SECURITY.md) - AI 服务的部署和监控

📚 **返回导航**：[返回设计文档首页](./README.md)
