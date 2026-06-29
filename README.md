# 智能备课平台 · Multi-Agent 备课系统

> 把"调 AI API 生成备课内容"的工具，升级为真正的 AI Agent 系统。
> 4 个 Agent 协作完成备课全流程，基于 LangGraph 工作流编排 + RAG 教材检索 + ReAct 推理。

## 项目亮点

**1. Multi-Agent 协作工作流（LangGraph 编排）**
- 3 个 Agent 分工：教学设计 → 内容生成 → 质检（QA）
- 质检不合格自动打回重做，根据问题类型路由到对应 Agent（content 问题打回 content_generation，structure 问题打回 teaching_design）
- SSE 流式推送实时可视化每个 Agent 的执行状态

**2. RAG 教材检索三层保障（100% 命中正确章节）**
- 入库时章节边界检测：英语教材用 BIG Question + UNIT 标记，物理教材用"第N章"页眉扫描
- 检索时 Chroma metadata 过滤：`where={"unit": 6}` 只返回第6章内容
- Agent 调用时程序化兜底：LLM 漏传 unit 自动注入，LLM 传错 unit 强制覆盖（用户输入是最可靠信号）

**3. ReAct 推理过程可视化**
- 每个 Agent 记录 Thought / Action / Observation 轨迹
- 前端按事件类型分支渲染（思考/行动/观察/最终答案/错误）
- 用户能实时看到 Agent 的决策过程，不是黑盒

**4. QA 质检 Agent 三维评分**
- 准确性 / 格式 / 公式 三维独立打分
- 雷达图可视化，问题清单驱动打回
- 超过 max_retry 强制结束，防死循环

**5. 状态持久化（Zustand store）**
- 跳转后返回保留工作流结果 + 输入草稿
- 浏览器刷新仍保留输入（localStorage 持久化）

## 技术栈

| 层 | 技术 | 选型理由 |
|---|---|---|
| Agent 框架 | **LangGraph** | 比 LangChain 灵活，适合自定义工作流和条件路由 |
| 向量数据库 | **Chroma** | 本地文件存储，零运维，metadata 过滤能力强 |
| Embedding | **通义千问 text-embedding-v2** | 中文+英文混合效果好，和现有 SDK 一致 |
| Function Calling | **通义千问 qwen-plus** | 原生支持工具调用，已集成 |
| 后端 | Spring Boot 3 + MyBatis Plus + MySQL + Redis | 主流企业级技术栈 |
| 前端 | React 18 + TypeScript + Vite + Ant Design | 主流前端技术栈 |
| AI 服务 | FastAPI + Python | 轻量，与 AI 生态契合 |
| SSE 推送 | SseEmitter + EventSource | Spring 原生支持，浏览器原生接收 |

## 系统架构

```
用户输入 "备一节圆周运动的课"
         ↓
┌─────────────────────────────────────────┐
│  AI 服务 (FastAPI + LangGraph, :8001)   │
│                                          │
│  teaching_design Agent                   │
│    ├─ search_textbook (RAG 检索)        │
│    └─ 输出五段式骨架 + unit 字段         │
│         ↓                                │
│  content_generation Agent                │
│    ├─ search_textbook (RAG 检索, unit=6)│
│    ├─ ReAct 推理循环                     │
│    └─ Markdown 排版后处理（并发）        │
│         ↓                                │
│  qa Agent                                │
│    ├─ 三维评分（准确性/格式/公式）       │
│    └─ 不合格 → 打回 content_generation  │
│         ↓                                │
│  自动保存到备课历史                       │
└─────────────────────────────────────────┘
         ↓ SSE 流式推送
┌─────────────────────────────────────────┐
│  后端 (Spring Boot, :8080)              │
│  SseEmitter 转发 + Redis 持久化          │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│  前端 (React, :3000)                    │
│  三栏可视化：Agent 卡片 / 产出 / 思考轨迹│
└─────────────────────────────────────────┘
```

## Agent 升级路线图

4 个阶段循序渐进，每个阶段都解决一个真实痛点：

| 阶段 | 能力 | 核心产出 |
|---|---|---|
| 1. Function Calling | AI 自主调用工具 | search_textbook / generate_lesson / save_to_history |
| 2. RAG + 记忆 | AI 有长期记忆和知识库 | Chroma 向量库 + Redis 会话记忆 + 学生薄弱知识点 |
| 3. Planning | AI 自主规划教学路径 | 混合规划（模板兜底 + AI 动态增减）+ 逐步确认 |
| 4. Multi-Agent | 多 Agent 分工协作 | 3 Agent + LangGraph 工作流 + QA 打回 + SSE 可视化 |

详见 [02-ROADMAP.md](01-Documentation/Markdown文档汇总/01-项目文档/项目状态/02-ROADMAP.md)

## RAG 检索三层保障（核心创新点）

**痛点**：LLM 调用 search_textbook 时不传 unit 参数，或传错 unit，导致检索到前言/目录/错误章节。

**解决方案**：

**第 1 层 - 入库时章节边界检测**
- 英语教材：扫描 BIG Question + UNIT 标记识别 8 个 Unit 边界
- 物理教材：扫描"第N章 XXX"页眉，频次过滤+范围扫描处理偶数页无标记问题
- 入库后每个 chunk 带 `unit` / `unit_title` 元数据

**第 2 层 - 检索时 metadata 过滤**
- `vector_store.search(where={"unit": 6})` 让 Chroma 只返回第6章 chunks
- 学科隔离：物理/英语在独立 collection，跨学科零污染

**第 3 层 - Agent 调用时程序化兜底**
- `extract_unit_from_text` 三种识别模式：显式编号 > 主题词映射 > 无匹配
- 主题词映射表（TOPIC_TO_UNIT）：覆盖"圆周运动→6"、"抛体运动→5"等
- unit_hint 只从用户原始输入提取（不从 LLM 产出的 JSON 提取，因为 LLM 不可靠）
- **冲突强制覆盖**：LLM 传的 unit 和 unit_hint 冲突时，以 unit_hint 为准

**验证结果**：高中必修二圆周运动备课，5 次 search_textbook 调用 100% 命中 unit=6（LLM 4 次传了错误 unit=5，全部被强制覆盖）。

## 目录结构

```
d:\AI\
├── 01-Documentation/      # 项目文档（需求/设计/架构/工作记录）
├── 02-Frontend/           # 前端（React 18 + TypeScript + Vite + Ant Design）
│   └── web-frontend/
│       └── src/pages/MultiAgent/  # Multi-Agent 可视化页面
├── 03-Backend/            # 后端（Spring Boot 3 + MyBatis Plus + MySQL）
│   └── backend/
├── 04-AI-Service/         # AI 服务（FastAPI + 通义千问 + LangGraph）
│   └── ai-service/
│       ├── multi_agent/   # Multi-Agent 核心
│       │   ├── agents/    # 3 个 Agent（teaching_design/content_generation/qa）
│       │   ├── workflow.py    # LangGraph 工作流编排
│       │   ├── react_loop.py # ReAct 推理循环
│       │   ├── tools.py   # 工具定义 + unit 兜底逻辑
│       │   └── schema.py  # Pydantic Schema 校验
│       ├── rag/           # RAG 检索
│       │   ├── unit_detector.py  # 章节边界检测
│       │   ├── vector_store.py   # Chroma 向量库
│       │   └── text_splitter.py  # 文本切分
│       └── agent/         # 阶段 1 单 Agent（已保留）
├── 05-Infrastructure/     # 运行时依赖（Nacos/Redis/MathJax）
└── README.md              # 本文件
```

## 快速启动

### 前置要求

- MySQL 8.0+、Redis 7.x、Nacos 2.x
- Java 21、Node.js 18+、Python 3.10+

### 启动顺序

| 序号 | 服务 | 工作目录 | 启动命令 | 端口 |
|------|------|----------|----------|------|
| 1 | Nacos | `05-Infrastructure/nacos/bin` | `startup.cmd -m standalone` | 8848 |
| 2 | Redis | `05-Infrastructure/redis` | `redis-server.exe` | 6379 |
| 3 | AI 服务 | `04-AI-Service/ai-service` | `$env:NO_PROXY="*"; python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload` | 8001 |
| 4 | 后端 | `03-Backend/backend` | `mvn spring-boot:run` | 8080 |
| 5 | 前端 | `02-Frontend/web-frontend` | `npm run dev` | 3000 |

访问 http://localhost:3000，使用账号 `teacher1 / 123456` 登录。

### 数据库初始化

```bash
mysql -u root -p
# 在 MySQL 中执行
source D:/AI/03-Backend/backend/sql/currentsql.sql;
```

### 教材入库（RAG 知识库）

```bash
cd 04-AI-Service/ai-service
python -m rag.ingest --pdf path/to/textbook.pdf --subject 物理
# 人教版英语七年级下册: 129 页 → 401 chunks
# 人教版物理必修第二册: 111 页 → 220 chunks
```

## 关键技术决策

**1. 为什么选 LangGraph 而不是 LangChain Agent？**
LangChain Agent 是黑盒，难以插入条件路由和状态共享。LangGraph 用 StateGraph 显式建模工作流，QA 不合格时可以根据 issue_type 路由到不同 Agent 重做。

**2. 为什么不用 LangChain 的 ReAct 实现？**
自己实现 ReAct 循环更可控：能在 Action 之前注入 unit_hint（程序化兜底），在 Observation 之后更新 trace（让前端看到实际参数）。LangChain 的 AgentExecutor 难以插入这些定制逻辑。

**3. 为什么 RAG 检索要三层保障？**
LLM 行为难通过 prompt 完全控制（即使加了强制规则和 few-shot 示例，LLM 仍然会漏传或传错 unit 参数）。程序化兜底是确保 100% 命中的必要手段，用户输入是最可靠的信号源。

**4. 为什么 QA Agent 不通过就让 END，而是支持打回？**
备课内容质量问题不能一次性解决。QA 三维评分能精确定位问题（如"公式未注明适用前提"），打回时把问题清单传给 content_generation Agent，让它针对性修复，比一次性生成质量更高。

**5. 为什么前端用 Zustand 而不是 Redux？**
Multi-Agent 页面状态比较简单（业务结果 + 运行时状态 + 输入草稿），Zustand 的 store 模式更轻量，配合 persist 中间件能轻松实现跳转后状态保留。

## 性能数据

| 指标 | 数据 |
|---|---|
| 端到端响应时间 | 78-130s（含 Markdown 后处理） |
| search_textbook 检索延迟 | <1s（Chroma 本地查询） |
| 五段式内容字数 | 6000-12000 字 |
| QA 评分（典型） | 准确性 92 / 格式 95 / 公式 86 |
| RAG unit 命中率 | 100%（三层保障后） |

## 文档导航

- [项目状态总览](01-Documentation/Markdown文档汇总/01-项目文档/项目状态/00-PROJECT-STATUS.md)
- [Agent 升级路线图](01-Documentation/Markdown文档汇总/01-项目文档/项目状态/02-ROADMAP.md)
- [快速开始](01-Documentation/Markdown文档汇总/06-快速开始/整体/QUICKSTART.md)
- [实现架构](01-Documentation/Markdown文档汇总/05-架构文档/整体/01-ARCHITECTURE-ACTUAL.md)
- [工作记录](01-Documentation/Markdown文档汇总/08-工作文档/)
- [文档索引](01-Documentation/Markdown文档汇总/01-项目文档/导航索引/INDEX.md)

## 简历话术

> 我的毕设是一个基于 Multi-Agent 的智能备课平台。系统由 3 个 Agent（教学设计 / 内容生成 / 质检）通过 LangGraph 编排协作完成备课，质检不合格自动打回重做。每个 Agent 能自主调用工具，基于 RAG 检索教材知识库生成内容，并通过 ReAct 模式记录思考过程。工作流通过 SSE 流式推送实时可视化，完成后自动保存到备课历史。
>
> 技术栈：Python + LangGraph + Chroma + 通义千问 + Spring Boot + React。
>
> 项目亮点：RAG 检索三层保障（100% 命中正确章节）、QA 打回重做机制、ReAct 推理过程可视化、跨学科教材隔离。

## 注意事项

- AI 服务必须清除系统代理：`$env:NO_PROXY="*"` 后再启动，否则无法访问 dashscope.aliyuncs.com
- AI 内容生成必须用 qwen-plus 模型 + max_tokens=8192，4096 会截断五段式内容
- 公式仅限理科使用 LaTeX，文科严禁 `$...$` 避免伪公式
- PDF 导出字体使用微软雅黑（msyh.ttc），公式经 MathJax 渲染为 SVG 后嵌入
- `_archive/` 是历史归档，不要在此目录开发或引用其中的代码
