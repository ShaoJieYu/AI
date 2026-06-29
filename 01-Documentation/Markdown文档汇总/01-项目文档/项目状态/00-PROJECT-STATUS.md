# 项目状态总览

**文档版本**: v2.3 | **更新时间**: 2026-06-29 | **维护者**: AI文档

> 📌 **新AI工程师必读！** 本文档帮助你在5分钟内理解项目当前状态和进度
> **当前最紧要**: 阶段 2b-2（Agent 短期对话记忆）已完成部署验证

> ⚠️ **AI 协作规则**
>
> 完成任务后必须主动更新 md 文档，不要等用户提醒：
> 1. 更新本文件（00-PROJECT-STATUS.md）的"功能完整度"和"当前要做的下一步"
> 2. 完成阶段时更新 02-ROADMAP.md 对应阶段的 checkbox 和状态
> 3. 遇到问题时在 08-工作文档/ 新建排查记录
> 4. 重大架构变更时同步更新 memory 的 project_memory.md

---

## 快速概览

| 项目 | 智能备课平台（大学毕业设计 → 全栈 AI Agent 工程师求职项目） |
|-----|-----------------|
| **现状** | Agent 阶段 2a（RAG）已完成，阶段 2b-1（薄弱点系统）已完成，阶段 2b-2（短期对话记忆）已完成 |
| **当前阶段** | 阶段 2b-2 完成，阶段 3（Planning 自主规划）待开始 |
| **用户身份** | 大学生，6 个月后找工作，目标全栈 AI Agent 工程师 |
| **核心目标** | 把"调 AI API 生成备课内容"的工具升级为真正的 AI Agent 系统 |
| **团队** | AI 驱动开发 + 用户手动测试验证 |

---

## 🎯 Agent 升级路线图（核心任务线）

详见 [02-ROADMAP.md](./02-ROADMAP.md)

| 阶段 | 能力 | 状态 | 完成时间 |
|------|------|------|----------|
| **阶段 1** | Function Calling 工具调用 | ✅ 已完成 | 2026-06-28 |
| **阶段 2a** | RAG 教材知识库 | ✅ 已完成 | 2026-06-28 |
| **阶段 2b-1** | 学生薄弱知识点系统 | ✅ 已完成 | 2026-06-28 |
| **阶段 2b-2** | Agent 短期对话记忆（Redis 持久化 + 聊天面板） | ✅ 已完成 | 2026-06-29 |
| **阶段 3** | Planning 自主规划 | ⏳ 规划中 | 第 3-4 个月 |
| **阶段 4** | Multi-Agent 多智能体协作 | ⏳ 规划中 | 第 5-6 个月 |

### 当前要做的下一步（阶段 3 入口）

**目标**：Planning 自主规划（ReAct 模式 + 任务拆解 + 反馈循环）

**阶段 2b-2 完成内容**：
- [x] **后端 ConversationService**：Redis 持久化会话，消息增删查 + 24h TTL 自动过期
- [x] **后端 ConversationController**：`POST /create`、`POST /send`、`GET /history`、`DELETE /{id}`
- [x] **后端 AiService.callAgent**：消息列表代理到 AI 服务 Agent 端点
- [x] **AI 服务多轮对话支持**：agent_core.py 和 main.py 接受 `messages` 列表
- [x] **前端聊天面板**：消息气泡 + 发送/加载/错误状态 + 右侧决策轨迹
- [x] **Redis 已验证**：4 条消息完整持久化，history 查询正常

**如何开始阶段 3**：
- 查看 Phase 3 设计：project_memory.md 中"Agent 升级路线图 · 阶段 3"
- 核心概念：ReAct 模式（思考→行动→观察→再思考）、Plan-and-Execute、反馈循环

---

## 📊 功能完整度详情

### ✅ 已完成功能

#### 基础平台（MVP）
- [x] **Web 端**: React 18 + TypeScript + Vite + Ant Design + Tailwind CSS
- [x] **状态管理**: Zustand + React Query
- [x] **路由系统**: React Router 完整配置
- [x] **后端框架**: Spring Boot 3.2.5 + Java 21 + MyBatis-Plus
- [x] **安全认证**: Spring Security + JWT
- [x] **微服务治理**: Nacos + Sentinel（Sentinel 日志目录已修复）
- [x] **数据库**: MySQL 8.0 + Redis 缓存
- [x] **AI 服务**: FastAPI + 通义千问 qwen-plus

#### 核心业务功能
- [x] **用户认证**: 注册 / 登录 / JWT 鉴权
- [x] **学生管理**: 增删改查 + 详情页
- [x] **备课生成**: 五段式结构（教材核心原文 / 教学深度剖析 / 易错点拨 / 提分技巧 / 经典例题推导）
- [x] **备课历史**: 列表 / 详情 / 删除（含 Popconfirm 确认）
- [x] **PDF 导出**: MathJax 渲染 LaTeX 公式 + openhtmltopdf（按学科判定是否启用公式渲染）
- [x] **错题拍照解析**: 多图上传 + 通义千问视觉模型分析
- [x] **非理科排版规范**: 引用块 / 列表 / 表格 / 加粗 / 三级标题强制规范

#### Agent 阶段 1：Function Calling（2026-06-28 完成）
- [x] **Agent 核心模块**: `agent/tools.py` + `agent/tool_executor.py` + `agent/agent_core.py`
- [x] **3 个工具**: search_textbook / generate_lesson / save_lesson_to_history
- [x] **Agent Loop**: 最大 10 轮决策循环，含 trace 轨迹记录
- [x] **token 透传**: 前端 → AI 服务 → 后端，鉴权链路打通
- [x] **Agent 端点**: `POST /api/agent/demo`（AI 服务 8001 端口）
- [x] **入库接口**: `POST /lessons/save`（后端 8080，直接持久化 Agent 已生成内容）
- [x] **前端测试页**: AgentDemoPage，自然语言输入 + Steps 决策过程可视化
- [x] **GitHub 规范提交**: feat/agent-stage1-function-calling 分支，4 个 Conventional Commits

### ⏳ 待实现（阶段 2 及以后）

#### Agent 阶段 2a：RAG 教材知识库（2026-06-28 完成）
- [x] **Chroma 向量数据库集成**：PersistentClient 本地持久化，collection 按学科隔离
- [x] **PDF 提取与清洗**：PyMuPDF 逐页提取，去页眉页脚、合并断行
- [x] **文本切分**：chunk_size=500 / overlap=50，按自然段落/句子边界切分
- [x] **通义千问 text-embedding-v2 向量化**：入库和检索统一使用
- [x] **RAG pipeline 全链路**：提取 → 切分 → 向量化 → 检索 → 注入 prompt
- [x] **替换 search_textbook 为真实检索**：从 mock 字典切换为 Chroma query
- [x] **试点教材入库**：人教版七年级下册英语（129 页 → 401 个 chunk，相似度 0.68）
- [x] **空库友好兜底**：collection 不存在时返回明确提示

#### Agent 阶段 2b-1：学生薄弱知识点系统（2026-06-28 完成）
- [x] **新表 student_weak_point**：结构化存储薄弱知识点（学科/知识点名/掌握程度/来源/备注）
- [x] **后端 CRUD 接口**：/students/{id}/weak-points（查/增/改/删）
- [x] **错题分析自动采集**：HomeworkAnalysisRecord 加 studentId，分析完成后自动提取知识点创建薄弱点
- [x] **前端学情分析 Tab**：展示真实薄弱点列表（带颜色标签：薄弱/一般/掌握）
- [x] **前端薄弱点 CRUD**：手动添加/编辑/删除薄弱点（弹窗表单）
- [x] **错题页学生选择器**：选择学生后分析结果自动同步到该生画像
- [x] **备课注入薄弱点**：LessonGeneratePage Step1 展示薄弱点摘要，customRequirements 注入薄弱点
- [x] **AI 服务接收 weak_points**：tongyi_service.py prompt 中注入薄弱点指导备课侧重
- [x] **后端注入链路**：LessonService → AiService → AI 服务完整链路打通

#### Agent 阶段 2b-2：短期对话记忆（2026-06-29 完成）
- [x] **后端 ConversationService**：Redis 字符串 + JSON 持久化，24h TTL 自动过期
- [x] **后端 ConversationController**：4 个端点（创建/发送/历史/删除）+ 异常兜底
- [x] **后端 AiService.callAgent**：消息列表代理到 AI 服务，180s timeout
- [x] **AI 服务多轮对话**：agent_core.py 接受 messages 列表，兼容旧版单条消息
- [x] **前端聊天面板**：消息气泡（用户蓝/AI 灰）+ 加载动画 + 错误提示 + 自动滚底
- [x] **前端决策轨迹面板**：右侧 Steps 可视化 Agent 工具调用链
- [x] **新建/删除会话**：一键切换上下文
- [x] **Redis 持久化验证**：多轮消息完整读写

**阶段 2b-1 已在上方列出**

#### Agent 阶段 3：Planning 自主规划
- [ ] ReAct 模式（思考 → 行动 → 观察 → 再思考）
- [ ] Plan-and-Execute 任务拆解
- [ ] 反馈循环（基于学情反馈自主规划教学路径）

#### Agent 阶段 4：Multi-Agent 多智能体协作
- [ ] 4 个 Agent 分工：教学设计 / 内容生成 / 质检 / 导出
- [ ] LangGraph 工作流编排
- [ ] 消息传递 + 冲突解决 + 质检打回重做

---

## 🏗️ 当前架构

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  前端 (3000)    │    │  后端 (8080)     │    │  AI 服务 (8001) │
│  React + Vite   │───▶│  Spring Boot     │───▶│  FastAPI        │
│  Ant Design     │    │  JWT 鉴权        │    │  通义千问        │
│  Zustand        │    │  MyBatis-Plus    │    │  Agent Loop     │
│  React Query    │    │  MySQL + Redis   │    │  3 个工具        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                                              │
        │  Agent 测试页直连 AI 服务（带 JWT token）      │
        └──────────────────────────────────────────────▶│
                                                       │
                                              ┌────────┴────────┐
                                              │  Agent 决策链    │
                                              │  search_textbook │
                                              │       ↓          │
                                              │  generate_lesson │
                                              │       ↓          │
                                              │  save_lesson     │
                                              │  _to_history     │
                                              └────────┬────────┘
                                                       │
                                              ┌────────┴────────┐       ┌─────────────────┐
                                              │  Chroma 向量库   │──────▶│ 通义千问         │
                                              │  (data/chroma_db)│       │ text-embedding-v2│
                                              │                 │       │ (检索时向量化)   │
                                              └───────┬─────────┘       └─────────────────┘
                                                       │
                                              ┌────────┴─────────┐
                                              │  PDF 教材库       │
                                              │  人教版英语七下   │
                                              │  129页→401 chunk │
                                              └──────────────────┘
```

---

## 📁 关键文件位置

### Agent 阶段 2b-1 关键文件
- `03-Backend/.../model/StudentWeakPoint.java` - 薄弱点实体
- `03-Backend/.../repository/StudentWeakPointMapper.java` - MyBatis-Plus Mapper
- `03-Backend/.../service/StudentWeakPointService.java` - CRUD + 错题自动提取
- `03-Backend/.../controller/StudentController.java` - 薄弱点 CRUD 端点
- `03-Backend/.../service/HomeworkAnalysisService.java` - 错题分析加 studentId + 自动创建薄弱点
- `03-Backend/.../service/LessonService.java` - 备课加载薄弱点注入 AI 服务
- `03-Backend/sql/migration_20260628_weak_points.sql` - SQL 迁移脚本
- `02-Frontend/.../pages/Students/StudentDetailPage.tsx` - 学情分析 Tab 展示薄弱点
- `02-Frontend/.../pages/Homework/HomeworkUploadPage.tsx` - 学生选择器
- `02-Frontend/.../pages/Lesson/LessonGeneratePage.tsx` - Step1 薄弱点摘要
- `04-AI-Service/ai-service/services/tongyi_service.py` - prompt 注入 weak_points
- `04-AI-Service/ai-service/rag/pdf_extractor.py` - PDF 提取与清洗
- `04-AI-Service/ai-service/rag/text_splitter.py` - 文本切分（500字符/50重叠）
- `04-AI-Service/ai-service/rag/embedder.py` - 通义千问 text-embedding-v2 封装
- `04-AI-Service/ai-service/rag/vector_store.py` - Chroma 增/查封装（通义千问向量化）
- `04-AI-Service/ai-service/rag/ingest.py` - 入库脚本
- `04-AI-Service/ai-service/data/textbooks/` - PDF 教材存放目录
- `04-AI-Service/ai-service/data/chroma_db/` - Chroma 持久化目录（自动生成）
- `04-AI-Service/ai-service/agent/tool_executor.py` - search_textbook 已改为 Chroma 真实检索
- `04-AI-Service/ai-service/agent/tools.py` - 工具定义（JSON Schema）
- `04-AI-Service/ai-service/agent/tool_executor.py` - 工具执行器（含 token 透传）
- `04-AI-Service/ai-service/agent/agent_core.py` - Agent Loop 决策循环
- `04-AI-Service/ai-service/main.py` - Agent 端点 `POST /api/agent/demo`
- `03-Backend/backend/src/main/java/com/lessonplatform/controller/LessonController.java` - `POST /lessons/save`
- `02-Frontend/web-frontend/src/pages/Agent/AgentDemoPage.tsx` - Agent 测试页
- `02-Frontend/web-frontend/src/api/agent.ts` - Agent API 封装（独立 axios 实例）

### 排查记录
- `01-Documentation/Markdown文档汇总/08-工作文档/Agent阶段1升级与联调排查记录.md` - 本次升级的 9 个问题完整排查记录

---

## ⚠️ 重要工程约定（必须遵守）

1. **AI 服务必须清除代理**：`config.py` 显式清除 HTTP_PROXY/HTTPS_PROXY，直连 dashscope.aliyuncs.com
2. **AI 内容生成参数**：qwen-plus 模型 + max_tokens=8192（防止五段式内容截断）
3. **前后端 DTO 字段对齐**：teachingGoal/generateType/estimatedDuration/difficulty(String)/status
4. **公式渲染按学科判定**：理科用 LaTeX（$...$ / $$...$$），非理科严禁 $ 符号
5. **Sentinel 日志目录**：必须显式设置为 `D:/AI/03-Backend/backend/logs/sentinel`，否则权限问题导致 500
6. **Git 规范**：Conventional Commits 格式，commit-msg + pre-commit hooks 已配置
7. **Agent 入库不重复调 AI**：`/lessons/save` 直接持久化 Agent 已生成内容，不调 AI

---

## 🚀 快速启动

### 启动顺序
1. **MySQL + Redis**（基础设施）
2. **后端**（8080）：`LessonPlatformApplication.java`
3. **AI 服务**（8001）：`cd 04-AI-Service/ai-service && python main.py`
4. **前端**（3000）：`cd 02-Frontend/web-frontend && npm run dev`

### 测试 Agent
1. 打开 http://localhost:3000 登录
2. 左侧菜单 **Agent智能备课**
3. 输入"帮我备一节静电场的物理课，难度中等，45分钟"
4. 等待 2-3 分钟，观察 3 次工具调用的决策过程
5. 去备课历史页面验证记录已入库

---

## 📋 快速导航

| 需求 | 文档位置 |
|------|---------|
| **下一步做什么？** | [02-ROADMAP.md](./02-ROADMAP.md) |
| **阶段 1 怎么实现的？** | [Agent阶段1升级与联调排查记录.md](../../08-工作文档/Agent阶段1升级与联调排查记录.md) |
| **快速启动？** | [QUICKSTART.md](../../06-快速开始/整体/QUICKSTART.md) |
| **架构设计？** | [01-ARCHITECTURE-ACTUAL.md](../../05-架构文档/整体/01-ARCHITECTURE-ACTUAL.md) |
| **历史 bug 排查？** | [08-工作文档/](../../08-工作文档/) |
| **memory 在哪？** | `c:\Users\16685\.trae-cn\memory\projects\-d-AI\` |

---

## 🔧 维护建议

当进行以下操作时，请更新本文档：
- [ ] 完成新阶段时 - 更新"Agent 升级路线图"表格状态
- [ ] 启动新阶段时 - 更新"当前要做的下一步"区块
- [ ] 重大架构变更时 - 更新"当前架构"图
- [ ] 新增工程约定时 - 更新"重要工程约定"

---

## 相关文档
- [02-ROADMAP.md](./02-ROADMAP.md) - Agent 升级路线图（四阶段详细规划）
- [DESIGN.md](../DESIGN.md) - 原始设计文档
- [INDEX.md](../导航索引/INDEX.md) - 文档导航索引
