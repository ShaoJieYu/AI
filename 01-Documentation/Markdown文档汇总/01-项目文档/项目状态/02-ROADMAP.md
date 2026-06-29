# Agent 升级路线图

**文档版本**: v2.3 | **更新时间**: 2026-06-29

> 📋 本文档是项目核心任务线：把"调 AI API 生成备课内容"的工具升级为真正的 AI Agent 系统
> **当前进度**: 阶段 2（RAG）+ ✅ 阶段 1 已完成，⏳ 阶段 2 进行中（教材知识库就绪，学生记忆待实现）

---

## 背景

用户是大学生，6 个月后找工作，目标全栈 AI Agent 工程师。当前项目是"调用 AI API 生成备课内容"的工具，要升级为真正的 AI Agent 系统。四大核心能力全做，边做边学，和 AI 协作完成。

---

## 路线图总览

```
阶段 1 (第1月)        阶段 2 (第2月)        阶段 3 (第3-4月)      阶段 4 (第5-6月)
Function Calling  →   RAG + 记忆        →   Planning          →   Multi-Agent
✅ 已完成              🚧 进行中              ⏳ 规划中              ⏳ 规划中

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

## 阶段 2：RAG 检索增强 + 记忆 🚧 进行中

**预计时间**: 第 2 个月
**阶段 2a（教材知识库）已完成**: 2026-06-28
**阶段 2b-1（学生薄弱知识点系统）已完成**: 2026-06-28
**阶段 2b-2（Agent 短期对话记忆）已完成**: 2026-06-29
**阶段 3（Planning）**: 待开始

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

### 待实现（阶段 3：Planning 自主规划）
- [ ] **ReAct 模式**：思考→行动→观察→再思考循环
- [ ] **Plan-and-Execute**：任务拆解与规划执行
- [ ] **反馈循环**：基于学情反馈自主规划教学路径

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

## 阶段 3：Planning 自主规划 ⏳ 规划中

**预计时间**: 第 3-4 个月

### 目标
AI 根据学生反馈自主规划备课方向和教学路径

### 应用场景
- 系统说"学生A三角函数连续错3题"
- AI 自主规划"补基础 → 生成练习 → 导出 → 一周后追踪"

### 待实现
- [ ] ReAct 模式（思考 → 行动 → 观察 → 再思考）
- [ ] Plan-and-Execute 任务拆解
- [ ] 反馈循环（基于学情反馈自主规划教学路径）

### 要学的概念
- ReAct 模式
- Plan-and-Execute
- 任务拆解策略
- 反馈循环设计

### 产出预期
输入"学生A需要提升"，AI 自主输出教学计划并执行

---

## 阶段 4：Multi-Agent 多智能体协作 ⏳ 规划中

**预计时间**: 第 5-6 个月

### 目标
多个 Agent 分工协作完成复杂任务

### 四个 Agent 分工
| Agent | 职责 |
|-------|------|
| 教学设计 Agent | 拆解教学目标 |
| 内容生成 Agent | 生成五段式内容 |
| 质检 Agent | 准确性 + 排版 + 公式校验（不合格打回重做） |
| 导出 Agent | PDF + 排版优化 |

### 待实现
- [ ] 4 个 Agent 角色分工
- [ ] LangGraph 工作流编排
- [ ] 消息传递机制
- [ ] 冲突解决策略
- [ ] 质检打回重做循环

### 要学的概念
- LangGraph（或 CrewAI / AutoGen）
- 角色分工和消息传递
- 冲突解决
- 工作流编排（DAG / 状态机）

### 技术选型
- **LangGraph**（Python，面试认可度高，比 LangChain 灵活，适合自定义工作流）

### 产出预期
- 多个 Agent 协作完成备课全流程
- 质检 Agent 不合格会打回内容生成 Agent 重做

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

> 我的毕设是一个基于 Multi-Agent 的智能备课平台。系统由 4 个 Agent（教学设计 / 内容生成 / 质检 / 导出）通过 LangGraph 编排协作完成。每个 Agent 能自主调用工具，基于 RAG 检索教材知识库生成内容，并通过 ReAct 模式根据学情反馈自主规划教学路径。技术栈：Python + LangGraph + Chroma + 通义千问 + Spring Boot + React。

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
