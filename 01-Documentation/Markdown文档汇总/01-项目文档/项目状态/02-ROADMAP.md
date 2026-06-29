# Agent 升级路线图

**文档版本**: v2.7 | **更新时间**: 2026-06-29

> 📋 本文档是项目核心任务线：把"调 AI API 生成备课内容"的工具升级为真正的 AI Agent 系统
> **当前进度**: ✅ 四阶段全部完成（Function Calling + RAG/记忆 + Planning + Multi-Agent）+ 阶段 4 质量优化

---

## 背景

用户是大学生，6 个月后找工作，目标全栈 AI Agent 工程师。当前项目是"调用 AI API 生成备课内容"的工具，要升级为真正的 AI Agent 系统。四大核心能力全做，边做边学，和 AI 协作完成。

---

## 路线图总览

```
阶段 1 (第1月)        阶段 2 (第2月)        阶段 3 (第3-4月)      阶段 4 (第5-6月)
Function Calling  →   RAG + 记忆        →   Planning          →   Multi-Agent
✅ 已完成              ✅ 已完成              ✅ 已完成              ✅ 已完成

AI 自主调用工具        AI 有长期记忆和        AI 自主规划教学        多个 Agent 分工
                      知识库                路径                  协作完成复杂任务
```

---

## 阶段 1：Function Calling 工具调用 ✅ 已完成

**完成时间**: 2026-06-28

### 目标
把"代码硬编码调 AI"升级成"AI 自主决定调用什么工具"

### 改动前 vs 改动后
- **改动前**：用户点"生成备课" → 代码调 generate_lesson() → AI 返回 → 存库（流程写死）
- **改动后**：用户说"帮我备一节静电场的课" → AI 自主决策：search_textbook → generate_lesson → save_lesson_to_history

### 已实现
- [x] Agent 核心模块：`agent/tools.py` + `agent/tool_executor.py` + `agent/agent_core.py`
- [x] 3 个工具：search_textbook / generate_lesson / save_lesson_to_history
- [x] Agent Loop 决策循环（最大 10 轮，含 trace 记录）
- [x] token 透传链路（前端 → AI 服务 → 后端）
- [x] Agent 端点 `POST /api/agent/demo`
- [x] 入库接口 `POST /lessons/save`（不重复调 AI）
- [x] 前端测试页 AgentDemoPage（自然语言输入 + Steps 决策可视化）
- [x] 备课历史删除按钮（Popconfirm 确认）

### 技术选型
- 通义千问 qwen-plus 原生 Function Calling
- JSON Schema 工具定义
- Python dashscope SDK

### 验证结果
用户输入"帮我备一节静电场的物理课，难度中等，45分钟"
→ Agent 自主 3 步决策：search_textbook → generate_lesson → save_lesson_to_history
→ 备课记录自动入库，可在备课历史页面查看/删除/导出 PDF

### 详细排查记录
见 [Agent阶段1升级与联调排查记录.md](../../08-工作文档/Agent阶段1升级与联调排查记录.md)

---

## 阶段 2：RAG 检索增强 + 记忆 ✅ 已完成

**预计时间**: 第 2 个月
**阶段 2a（教材知识库）已完成**: 2026-06-28
**阶段 2b-1（学生薄弱知识点系统）已完成**: 2026-06-28
**阶段 2b-2（Agent 短期对话记忆）已完成**: 2026-06-29
**阶段 3（Planning）已完成**: 2026-06-29

### 目标
给 AI 注入长期记忆和知识库

### 已完成（阶段 2a：教材知识库）
- [x] **Chroma 向量数据库集成**：PersistentClient 本地持久化，collection 按学科隔离
- [x] **PDF 提取与清洗**：PyMuPDF（fitz）逐页提取，去页眉页脚、合并断行
- [x] **文本切分**：chunk_size=500 / overlap=50，按自然段落/句子边界切分
- [x] **通义千问 text-embedding-v2 向量化**：入库和检索统一使用，中文+英文混合效果好
- [x] **RAG pipeline**：提取 → 切分 → 向量化 → 检索 → 注入 prompt 全链路跑通
- [x] **替换 search_textbook 为真实检索**：从 mock 字典切换为 Chroma query
- [x] **试点教材入库**：人教版七年级下册英语（129 页 → 401 个 chunk）
- [x] **空库友好兜底**：collection 不存在或检索结果为空时返回明确提示

### 已完成（阶段 2b-1：学生薄弱知识点系统）
- [x] **新表 student_weak_point**：结构化存储薄弱知识点（学科/知识点名/掌握程度/来源/备注）
- [x] **后端 CRUD 接口**：/students/{id}/weak-points（查/增/改/删）
- [x] **错题分析自动采集**：HomeworkAnalysisRecord 加 studentId，分析完成后自动提取知识点创建薄弱点
- [x] **前端学情分析 Tab**：展示真实薄弱点列表 + 手动添加/编辑/删除（弹窗表单）
- [x] **错题页学生选择器**：选择学生后分析结果自动同步到该生画像
- [x] **备课注入薄弱点**：LessonGeneratePage Step1 展示薄弱点摘要，customRequirements 注入薄弱点
- [x] **AI 服务接收 weak_points**：tongyi_service.py prompt 注入薄弱点指导备课侧重
- [x] **后端注入链路**：LessonService → AiService → AI 服务完整链路打通

### 部署验证（2026-06-29）
- [x] SQL 迁移脚本已执行（student_weak_point 表已建 + homework_analysis_record 已加 student_id）
- [x] AI 服务（uvicorn port 8001）已重启运行
- [x] 后端（Spring Boot port 8080）已重启运行

### 已完成（阶段 2b-2：Agent 短期对话记忆）
- [x] **后端 ConversationService**：Redis 持久化会话，消息增删查 + 24h TTL 自动过期
- [x] **后端 ConversationController**：4 个端点的 REST API
- [x] **后端 AiService.callAgent**：消息列表代理到 AI 服务
- [x] **AI 服务多轮对话支持**：agent_core.py 和 main.py 接受 messages 列表
- [x] **前端聊天面板**：消息气泡 + 右侧决策轨迹面板 + 新建/删除会话
- [x] **Redis 持久化验证**：多轮消息（user→assistant→user→assistant）完整读写

### 阶段 3（Planning 自主规划）已完成 — 详见下方阶段 3 章节
- [x] **混合规划策略**：模板兜底 + AI 动态增减
- [x] **逐步执行确认**：每步结果用户确认后再继续
- [x] **重新执行机制**：用户反馈后重新执行当前步骤

### 技术选型
| 能力 | 选型 | 理由 |
|------|------|------|
| 向量数据库 | Chroma | 本地文件存储，零运维 |
| Embedding | 通义千问 text-embedding-v2 | 和现有 dashscope SDK 一致，中文+英文效果好 |

### 要学的概念
- Embedding（文本向量化）✅ 已掌握
- Chroma 向量库基本操作（collection / add / query）✅ 已掌握
- RAG pipeline（切分 → 向量化 → 检索 → 注入 prompt）✅ 已掌握
- Memory 设计（短期对话内 + 长期跨会话）⏳ 待学习

### 产出预期
- [x] search_textbook 工具返回真实教材内容（不再是静态模拟数据）
- [ ] Agent 能基于学生历史记忆做个性化推荐

### 验证结果
用户输入"帮我备一节一般过去时的英语课，中等难度，45分钟"
→ Agent search_textbook 从 Chroma 检索到第 101-103 页真实语法内容（相似度 0.68）
→ 基于真实教材生成完整五段式备课内容
→ 验证通过

---

## 阶段 3：Planning 自主规划 ✅ 已完成

**预计时间**: 第 3-4 个月
**完成时间**: 2026-06-29

### 目标
AI 先制定计划再逐步执行，支持用户逐步确认和重新执行，实现 Plan-and-Execute 任务拆解

### 设计决策（边推进边讲解）
1. **交互模式选择**：每步执行后用户确认再继续（而非一次性执行完所有步骤），让用户保持控制权
2. **重新执行机制**：方案 A — 用户输入修改意见后重新执行当前步骤，替换最后一个 step_result 卡片
3. **规划策略选择**：混合策略 C — 固定三步模板兜底（检索教材→生成内容→保存历史）+ AI 动态增减步骤，AI 失败时自动降级到模板

### 已实现
- [x] **混合规划器 planner.py**：BASE_LESSON_PLAN_STEPS 固定三步模板 + PLANNER_PROMPT 让 AI 在模板基础上动态增减，generate_plan(user_message) 返回 {type: "plan", plan: [...], user_message}
- [x] **单步执行 run_agent_step**：构造 STEP_EXECUTION_PROMPT 告诉 AI"现在执行第 N 步：{step_name}"，只调用一个工具就返回 {type: "step_result", step, step_name, tool, tool_args, result, trace, success}
- [x] **总结生成 generate_summary**：所有步骤完成后调用 AI 生成 {type: "summary", summary}
- [x] **后端 mode 透传**：AiService.callAgent(messages, mode, extra) 重载方法，支持 plan/execute_step/summary 三种模式
- [x] **ConversationController 改造**：sendMessage 请求体改为 Map<String,Object>，按 mode 分支构造 extra 参数，AI 回复按 type 格式化存入 Redis
- [x] **前端三种卡片视图**：plan（计划列表+确认按钮）/ step_result（结果+进度+重新执行+确认继续）/ summary（绿色总结框）
- [x] **前端状态管理**：currentPlan、currentStepIndex、retryInput、retrying
- [x] **逐步确认流程**：handleSend → generatePlan → handleConfirmPlan → executeStep → handleConfirmStep → handleGenerateSummary
- [x] **重新执行 handleRetryStep**：用户输入修改意见后重新执行当前步骤，替换最后一个 step_result 卡片
- [x] **右侧计划进度面板**：Steps 展示当前计划执行进度

### 三种响应类型
| type | 触发时机 | 包含字段 |
|------|----------|----------|
| plan | mode="plan" | plan[], user_message |
| step_result | mode="execute_step" | step, step_name, tool, tool_args, result, trace, success |
| summary | mode="summary" | summary |

### 验证结果（2026-06-29）
用户输入"帮我准备一节物理课，主题是静电场，难度中等，时长45分钟"
- generatePlan 返回三步计划（检索教材→生成五段式内容→保存历史）
- executeStep 第1步：search_textbook 调用成功（物理教材未入库，返回明确提示）
- executeStep 第2步：generate_lesson 调用成功，返回完整五段式教案（库仑定律、电场强度、例题推导）
- generateSummary 返回完整中文总结（任务概述+每步关键结果+查看方式）
- Redis 持久化 5 条消息，history 查询正常

### 技术选型
| 能力 | 选型 | 理由 |
|------|------|------|
| 规划策略 | 混合（模板+AI） | 模板保证基础流程不丢，AI 增加灵活性 |
| 交互模式 | 逐步确认 | 用户保持控制权，每步可重新执行 |
| 重新执行 | 替换最后卡片 | 简单可靠，保留历史轨迹 |

### 要学的概念
- Plan-and-Execute 模式 ✅ 已掌握
- 任务拆解策略（固定模板 + 动态增减）✅ 已掌握
- 反馈循环设计（逐步确认 + 重新执行）✅ 已掌握

### 产出预期
- [x] 输入备课需求，AI 自主输出三步计划并逐步执行
- [x] 每步结果用户确认后再继续，支持重新执行

---

## 阶段 4：Multi-Agent 多智能体协作 ✅ 已完成

**完成时间**: 2026-06-29

### 目标
多个 Agent 分工协作完成复杂任务

### 三个 Agent 分工（移除导出 Agent，用户通过备课历史页面按钮导出 PDF）
| Agent | 职责 |
|-------|------|
| 教学设计 Agent | 拆解教学目标，输出五段式骨架 |
| 内容生成 Agent | 基于 RAG 检索生成五段式完整内容 |
| 质检 Agent | 三维评分（准确性/格式/公式），不合格打回重做 |

### 已实现
- [x] **3 个 Agent 角色分工**：教学设计 / 内容生成 / 质检（移除导出 Agent，用户通过备课历史页面按钮导出 PDF）
- [x] **LangGraph 工作流编排**：StateGraph + 条件路由 + 打回循环
- [x] **消息传递机制**：LessonPlanState 全局共享 State，Agent 间通过 State 传递产出
- [x] **质检打回重做循环**：QA 不通过时根据 issue_type 打回到 content_generation（内容问题）或 teaching_design（结构问题），超过 max_retry 强制结束
- [x] **ReAct 思考过程**：每个 Agent 记录 Thought/Action/Observation 轨迹
- [x] **四层保障**：System Prompt + Few-shot + Pydantic Schema + 模板兜底
- [x] **SSE 流式推送**：AI 服务 LangGraph stream() → 后端 SseEmitter → 前端 EventSource
- [x] **Redis 持久化**：每个 Agent 执行后保存 State（RESP2 协议兼容旧版 Redis）
- [x] **自动保存到备课历史**：工作流完成后 AI 服务自动调用 save_lesson_to_history（含学科英文→中文映射），推送 lesson_saved 事件
- [x] **前端三栏可视化**：左栏 Agent 卡片 + 中栏产出内容/保存状态 + 右栏 ReAct 思考/雷达图
- [x] **SVG 拓扑图**：3 节点状态动画 + 红色虚线打回回路
- [x] **纯 SVG 雷达图**：QA 三维评分可视化，无第三方图表库依赖
- [x] **端到端验证**：3 agent_complete + qa_reject + lesson_saved + workflow_complete 完整链路通过

### 技术选型
- **LangGraph**（Python，面试认可度高，比 LangChain 灵活，适合自定义工作流）
- **SseEmitter**（Spring 原生 SSE 支持，自动处理 data: 前缀和 \n\n 结尾）
- **EventSource**（浏览器原生 SSE，不支持自定义 Header，token 通过 query 参数传递）

### 产出预期
- [x] 多个 Agent 协作完成备课全流程
- [x] 质检 Agent 不合格会打回内容生成 Agent 重做
- [x] 工作流完成后自动保存到备课历史，用户在备课历史详情页点导出按钮导出 PDF

### 质量优化（2026-06-29 完成）

以 Unit 6 Weather and Feelings（初中英语七年级下册）为案例全链路诊断，发现并修复三个内容质量问题：

**问题 1：内容少**
- 现象：五段式合计仅 3650 字符，`teachingAnalysis` 仅 356 字符
- 根因：每段字数下限设为 300 字过低
- 修复：字数下限提升到 800 字
- 结果：合计字数 3650 → 12198（+234%）

**问题 2：排版挤（一大堆文字挤在一起）**
- 现象：所有段落为连贯文字流，0 个 Markdown 元素
- 根因：LLM 在 JSON 字段值里不主动写 Markdown（担心破坏 JSON 结构）；prompt 排版规范约束力不足
- 修复：新增 `format_content_with_markdown()` 后处理器，检测无 Markdown 排版的段落，调 LLM 重写加排版（不改内容）
- 结果：每段含完整 Markdown 结构（H2/H3/列表/加粗/表格/引用）

**问题 3：检索不准**
- 现象：subject 字段中英文混用（schema 要英文，工具要中文）；top_k=5 偏少；无相似度门槛
- 根因：3 个独立缺陷叠加（最严重是 subject 不一致）
- 修复：
  - `Subject` Literal 改为中文九学科，Pydantic 强制校验
  - 工具 schema 加 `enum` 约束，关键词组合建议（Unit 编号+章节标题+主题词）
  - `top_k` 5→6，新增 `min_score=0.40`（基于实际相似度分布调出，0.65 太严会把所有结果过滤光）
  - `auto_save_to_history` 兼容老数据（subject 已中文则直接用，仍是英文则转换）
- 结果：检索结果从模糊命中变为精准命中教材原文

**性能权衡**：Markdown 后处理器耗时约 60s（5 段 × 1 次 LLM 重写），响应时间从 38s → 103s。这是质量换时间的合理取舍。

**验证结果**（同一请求修复前后对比）：
| 指标 | 修复前 | 修复后 |
|---|---|---|
| teaching_design.subject | english | 英语 |
| content_draft.subject | english | 英语 |
| search_textbook 调用 subject | 英语（碰运气对） | 英语（强制 Literal） |
| RAG top_k | 5 | 6 |
| RAG min_score | 无门槛 | 0.40 |
| 五段式合计字数 | 3650 | 12198 |
| Markdown 元素 | 全 0 | 每段含 H2/H3/列表/加粗/表格/引用 |

---

## 技术栈总览

| 能力 | 选型 | 理由 |
|------|------|------|
| Agent 框架 | LangGraph | 比 LangChain 灵活，适合自定义工作流 |
| 向量数据库 | Chroma | 本地文件存储，零运维 |
| Embedding | 通义千问 text-embedding-v2 | 和现有 dashscope SDK 一致 |
| Function Calling | 通义千问 qwen-plus | 已有模型，原生支持 |
| 前端可视化 | 现有 React + Ant Design | 加"Agent 思考过程"可视化面板 |

---

## 简历话术（目标）

> 我的毕设是一个基于 Multi-Agent 的智能备课平台。系统由 3 个 Agent（教学设计 / 内容生成 / 质检）通过 LangGraph 编排协作完成备课，质检不合格自动打回重做。每个 Agent 能自主调用工具，基于 RAG 检索教材知识库生成内容，并通过 ReAct 模式记录思考过程。工作流通过 SSE 流式推送实时可视化，完成后自动保存到备课历史。技术栈：Python + LangGraph + Chroma + 通义千问 + Spring Boot + React。

---

## Git 工作流规范

每个阶段按企业级规范提交：
- 分支命名：`feat/agent-stageN-xxx`（如 `feat/agent-stage1-function-calling`）
- Conventional Commits 格式：`<type>(<scope>): <subject>`
- type 白名单：feat / fix / docs / style / refactor / perf / test / build / ci / chore / revert / wip
- commit-msg hook + pre-commit hook 已配置
- main 分支禁止直接 push，必须通过 PR 合并（GitHub 端 Branch Protection 规则）

---

## 相关文档
- [00-PROJECT-STATUS.md](./00-PROJECT-STATUS.md) - 项目当前状态总览
- [Agent阶段1升级与联调排查记录.md](../../08-工作文档/Agent阶段1升级与联调排查记录.md) - 阶段 1 完整排查记录
- [INDEX.md](../导航索引/INDEX.md) - 文档导航索引
