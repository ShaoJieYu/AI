# 项目状态总览

**文档版本**: v3.5 | **更新时间**: 2026-07-01 | **维护者**: AI文档

> 📌 **新AI工程师必读！** 本文档帮助你在5分钟内理解项目当前状态和进度
> **当前最紧要**: 2b 2路虽然速度最快（74s），但有 5 处物理错误（自由落体公式错用、弹簧常数错入、周期概念错误等），**生产环境推荐 4b 2路（90s, 0 错误）**

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
| **现状** | Agent 四阶段全部完成（Function Calling + RAG/记忆 + Planning + Multi-Agent） |
| **当前阶段** | 阶段 4（Multi-Agent 多智能体协作）已完成，下一步进入优化/答辩准备 |
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
| **阶段 3** | Planning 自主规划（混合策略 + 逐步执行确认） | ✅ 已完成 | 2026-06-29 |
| **阶段 4** | Multi-Agent 多智能体协作（3 Agent + SSE + 自动保存） | ✅ 已完成 | 2026-06-29 |

### 当前要做的下一步（阶段 4 已完成）

**阶段 4 完成内容**：
- [x] **3 个 Agent 分工**：教学设计 Agent / 内容生成 Agent / 质检 Agent（移除导出 Agent，用户通过备课历史页面按钮导出 PDF）
- [x] **LangGraph 工作流编排**：teaching_design → content_generation → qa → END（QA 通过即结束）
- [x] **质检打回重做**：QA 不通过时根据 issue_type 打回到 content_generation（内容问题）或 teaching_design（结构问题），超过 max_retry 强制结束
- [x] **ReAct 思考过程**：每个 Agent 记录 Thought/Action/Observation 轨迹，前端可视化展示
- [x] **四层保障**：System Prompt 强约束 + Few-shot 示例 + Pydantic Schema 校验 + 模板兜底
- [x] **SSE 流式推送**：AI 服务 LangGraph stream() → 后端 SseEmitter 转发 → 前端 EventSource 接收
- [x] **Redis 持久化**：每个 Agent 执行后保存 State 到 Redis（RESP2 协议兼容旧版 Redis）
- [x] **自动保存到备课历史**：工作流完成后 AI 服务自动调用 save_lesson_to_history（含学科英文→中文映射），推送 lesson_saved 事件
- [x] **前端三栏可视化**：左栏 Agent 卡片 + 中栏产出内容/保存状态 + 右栏 ReAct 思考/雷达图
- [x] **SVG 拓扑图**：3 节点状态动画 + 红色虚线打回回路
- [x] **纯 SVG 雷达图**：QA 三维评分（准确性/格式/公式）可视化，无第三方图表库依赖
- [x] **端到端验证**：3 agent_complete + qa_reject + lesson_saved + workflow_complete 完整链路通过

**阶段 4 质量优化（2026-06-29）**：以 Unit 6 Rain or Shine 为案例全链路诊断，修复三个内容质量问题
- [x] **检索链路修复**：subject 字段中英文不一致（schema Literal 改中文九学科）、top_k 5→6、新增 min_score=0.40 阈值过滤低质量 chunks、search_textbook 工具加 enum 约束和关键词组合建议
- [x] **Markdown 排版后处理器**：LLM 在 JSON 字段值里不主动写 Markdown，新增 `format_content_with_markdown()` 后处理函数，检测每段是否已有 Markdown 排版，没有的段调用 LLM 重写加排版（不改内容）
- [x] **字数下限提升**：每段从 300 字 → 800 字
- [x] **max_tokens 修复**：ReActLoop 从 4096 → 8192（按项目硬约束，防止五段式内容截断）
- [x] **验证结果**：五段式合计字数 3650 → 12198（+234%），每段含完整 Markdown 结构（H2/H3/列表/加粗/表格/引用）

**阶段 4 性能优化（2026-06-30）**：Markdown 后处理器从串行改为并发
- [x] **并发重写**：`format_content_with_markdown()` 使用 `ThreadPoolExecutor(max_workers=5)` 并发重写 5 段，dashscope SDK 线程安全
- [x] **单段失败兜底**：单段重写异常不影响其他段，保留原文
- [x] **验证结果**：响应时间 103s → 78.5s（-23.8%），内容质量保持不变（QA 评分 94/96/92 全部通过）

**RAG 检索准确性修复（2026-06-30）**：解决"生成内容与向量库实际内容不符"问题
- [x] **问题定位**：检索 Unit 6 时返回前言"致同学"（第 4 页）而非课文正文（第 50 页），因为前言提及所有 Unit 主题，关键词密度高导致相似度偏高
- [x] **Unit 边界检测**：新增 `rag/unit_detector.py`，通过 BIG Question + UNIT 标记识别 8 个 Unit 边界，支持 Type A（标题在 UNIT 前）和 Type B（标题在 UNIT 后，如 Unit 7 "A Day to Remember"）
- [x] **元数据入库**：`text_splitter.py` 的 chunk 元数据加 `unit`/`unit_title` 字段，英语教材重新入库后 192/401 chunk 带 Unit 元数据
- [x] **向量库过滤**：`vector_store.py` 的 search/search_as_text 支持 `where` 参数（Chroma metadata 过滤），如 `where={"unit": 6}` 只在 Unit 6 范围内检索
- [x] **工具 schema 升级**：search_textbook 工具加 `unit` 可选参数（agent/tools.py + multi_agent/tools.py）
- [x] **Prompt 引导（方案 A）**：TEACHING_DESIGN_PROMPT 和 CONTENT_GENERATION_PROMPT 明确描述 unit 参数，任务流程加强制规则，Few-shot 示例展示带 unit 的调用
- [x] **程序化兜底（方案 B）**：`extract_unit_from_text()` 函数支持 Unit N / 第N单元 / 第N章 / JSON "unit": N 字段（含中文数字一到十），ReActLoop 从 user_input + context 提取 unit_hint，LLM 漏传时自动注入到 search_textbook
- [x] **验证结果**：Unit 6 Rain or Shine 备课请求，2 次 search_textbook 调用均正确检索到第 50 页 Unit 6 内容（而非前言），耗时 74.7s，生成内容正确引用教材原文

**物理教材入库与跨学科隔离（2026-06-30）**：复用 RAG 优化方案，支持第二本教材
- [x] **物理章节检测**：`unit_detector.py` 新增 `detect_units_physics` 函数，三步走策略（找锚点 → 频次过滤 → 范围扫描），支持"第 N 章 XXX"中文数字格式
- [x] **学科路由**：`detect_units` 新增 subject 参数，物理走"第N章"策略，英语走"BIG Question + UNIT"策略
- [x] **入库验证**：物理必修2.pdf 111 页 → 220 chunks，220/220 带 Unit 元数据，4 章正确识别（第五章抛体运动 / 第六章圆周运动 / 第七章万有引力 / 第八章机械能守恒）
- [x] **跨学科隔离**：物理检索只返回物理教材内容，英语检索只返回英语教材内容（Chroma collection 按学科隔离）
- [x] **迭代上限修复**：content_generation Agent 的 `max_iterations` 从 3 提升到 5，解决 LLM 用 3 次迭代全调 search_textbook 触发模板兜底问题
- [x] **验证结果**：第五章抛体运动备课请求，2 次 search_textbook 全部命中物理教材（第3/5/19页），生成内容含教材原文引用+LaTeX公式+Markdown排版，耗时 124s

**本地模型接入（2026-06-30）**：双 Provider 架构，云端通义千问与本地 Ollama 可切换
- [x] **Ollama 安装**：v0.3.11 程序装在 `D:\Ollama\bin\`，Qwen2.5-7B（4.7GB）下载在 `D:\Ollama\blobs\`（D 盘，不占 C 盘）
- [x] **硬件配置**：RTX 4060 Laptop 8GB 显存，CUDA v12，29/29 层全部 GPU offload，模型占用 4168 MiB 显存
- [x] **LLM 层抽象**：`common/llm.py` 重构为 `BaseLLM` 抽象基类 + `QwenPlusLLM`（云端）+ `OllamaLLM`（本地）+ `get_llm()` 工厂函数
- [x] **配置切换**：`.env` 设置 `LLM_PROVIDER=cloud`（默认云端）/ `local`（本地模型）即可切换
- [x] **OpenAI 兼容 API**：OllamaLLM 通过 `openai` SDK 调用 Ollama 的 `/v1/chat/completions`，参数格式与 OpenAI 一致
- [x] **向后兼容**：保留 `qwen_plus = llm` 别名，阶段 1-3 的 `agent/` 代码不受影响
- [x] **单元测试**：chat() / chat_with_tools() / response_format JSON 三项测试全部通过
- [x] **E2E 验证**：本地模型跑通完整备课流程，耗时 2 分 47 秒（云端 78s，本地 167s，零 token 成本）

**前端模型切换功能（2026-06-30）**：设置页新增「AI 模型」Tab，运行期热切换 cloud/local，无需重启 AI 服务
- [x] **LLMRegistry 注册表**：`common/llm.py` 新增 `LLMRegistry` 类替代原固定单例，支持 `switch(provider)` 运行期热切换，线程安全（threading.Lock）
- [x] **代理对象向后兼容**：`_LLMProxy` 类所有方法转发到 `registry.get()`，7 处 `from common.llm import llm` 调用方代码零改动
- [x] **持久化**：provider 写入 `.runtime_llm.json`，AI 服务重启后仍记住上次选择（不依赖 .env 默认值）
- [x] **3 个 AI 服务接口**：GET/POST `/api/llm/provider`（查当前/切）、GET `/api/llm/status`（含 Ollama 探活）
- [x] **后端 Java 转发**：`LlmProviderController` + `AiService` 3 个方法，走统一 `/api` 网关，JWT 鉴权
- [x] **前端 UI**：设置页第 4 个 Tab「AI 模型」，当前模型卡片（连通状态 Tag）+ Radio.Group 切换器，React Query 数据加载
- [x] **单元测试**：9 项测试全部通过（初始化/切换/幂等/非法值/持久化/重启读取/代理转发）
- [x] **端到端验证**：登录拿 token → 网关转发 → AI 服务热切换 cloud/local 全链路通过，未带 token 返回 403

**本地模型性能测试与选型（2026-06-30）**：4 套基准测试 + 选型决策，为 Agent 各环节确定最优模型 + 并发方案
- [x] **测试一：基础速度对比**：qwen3.5:2b/4b/9b 短文本速度测试，9b 41.8 t/s、4b 67.5 t/s、2b 89.8 t/s，3 轮波动均 < 1 t/s
- [x] **测试二：4b 并行 vs 9b 单路**：4b 2 路加速 1.96x（接近理论极限 2x），端到端 27.4 t/s vs 9b 10.2 t/s（2.69x 优势）
- [x] **测试三：4b 多路压力测试**：1/2/3/4 路显存监控，短文本 4 路拿到 2.32x 加速，**关键发现：4 路没爆显存**（Ollama 自动复用模型权重，1 路 5013MB / 4 路 4904MB）
- [x] **测试四：4b 长文本多路测试**：800-1000 字 5 知识点内容生成，**关键发现：长文本下加速比急剧衰减**（4 路仅 1.28x vs 短文本 2.32x），2 路是性价比拐点
- [x] **GPU 利用率诊断（理论分析）**：纯生成 t/s 接近 4x vs 端到端 1.28x，差距来自 prompt prefill CPU 串行 + 调度器开销
- [x] **选型决策**：
  - 短文本任务（RAG 检索、分类）：4b 4 路（37.66 t/s 端到端）
  - 长文本内容生成（800-1000 字）：4b 2 路（53.09 t/s 端到端）
  - 教学设计（ReAct 决策）：9b 1 路（10.19 t/s，4b ReAct 必失败）
  - 质检 Agent：暂停中
- [x] **五段式内容生成最优策略**：4b 2 路拆 3+2 批并行，总耗时 ~60s（vs 1 路 ~99s 节省 40%）
- [x] **完整技术文档**：[08-工作文档/本地模型性能测试与选型方案.md](../../08-工作文档/本地模型性能测试与选型方案.md)
- [x] **测试产物**：4 个 JSON 数据 + 4 个运行日志 + 4 个测试脚本（全部保存在 d:\AI\ 根目录）

**下一步可选方向**：
- 浏览器端到端测试（登录后 token 透传，验证 save_lesson_to_history 成功入库）
- 答辩演示准备（Multi-Agent 可视化是杀手锏）
- 教学设计 Agent 的 ReAct 循环耗时波动（7-21s），可考虑缓存或简化 prompt
- 更多学科教材入库（化学/生物等，复用 unit_detector.py 的章节检测能力）

---

## 🆕 2026-07-01 内容生成并发数动态化重构

**问题诊断**（来自 5 套对比测试脚本）：
- [x] **测试一 `test_local_model_speed.py`**：3 模型 3 轮短文本速度基线，2b 89.8 t/s、4b 67.5 t/s、9b 41.8 t/s
- [x] **测试二 `test_compare_configs.py`**：5 套配置对比（2b 5路/2路、4b 1路/2路、9b 1路），关键发现**2b 5路 最长段 76.1s（撞 num_predict=1600 上限）**
- [x] **测试三 `test_realistic_compare.py`**：匹配项目实际参数 num_predict=16384 复测，2b 5路 66.4s/不均匀 3.25x vs 2b 2路 63.2s/不均匀 1.74x —— **2路 总耗时更短且稳定**
- [x] **关键反直觉结论**：memory 中记录的"4b 2路 ~60s"是 TEST_MODE 200字场景，实测真实 800字场景 4b 2路 86.3s（不是 60s）

**代码改动**（仅 2 处，约 30 行）：
- [x] **`multi_agent/agents/content_generation.py:get_max_workers_for_model`**：2b 模型并发数 5 → 2
- [x] **`multi_agent/agents/content_generation.py:generate_five_sections_parallel`**：从 `config.OLLAMA_MODEL` 静态导入改为 `registry.get().model` 动态感知，热切换 provider 后并发数立即更新
- [x] **新增段级计时输出**：`[并行生成] 5 段全部完成（max_workers=N, 总耗时 Xs）`

**验证结果**：
- [x] **端到端耗时**：`test_e2e_timing.py` 圆周运动场景从 115.02s → 90.24s（提速 22%）
- [x] **内容生成阶段**：98.68s → 61.94s（提速 37%）
- [x] **热切换验证 `test_hot_switch_workers.py`**：4 个场景（2b/4b/9b/cloud）max_workers 全部正确（2/2/1/5）
- [x] **`registry.switch()` 验证 `test_registry_switch.py`**：provider 切换 + 模型替换 5 个步骤全部通过
- [x] **质量保持**：QA 准确性 88、排版 92 通过（公式 65 未通过但质检 Agent 暂停中，符合预期）

**架构灵活性提升**：
- 之前：用户从云端切到本地 2b 后，内容生成仍跑 5 路（因为查的是 config.OLLAMA_MODEL 静态值）
- 现在：热切换后，registry.get() 返回新实例，新实例的 .model 决定 max_workers
- 用户场景：4b 2路 慢但稳（86s） / 2b 2路 快但有质量风险（63s） / 9b 1路 最稳但慢（142s），可热切换自由选择

**三模型质量对比（2026-07-01）**：相同教学设计 + 相同 RAG 检索结果下 2b/4b/9b 质量实测
- [x] **测试脚本** `test_quality_compare.py`：9b 跑一次教学设计 → 3 个模型用相同输入跑 content_generation → 产出保存到 quality_*.json
- [x] **基础统计对比**：2B 74.1s/10595字/126公式, 4B 90.3s/8833字/109公式, 9B 145.8s/9154字/134公式
- [x] **关键物理错误检测（17 个 LaTeX pattern 扫描）**：
  - **2B：5 处严重错误**（⚠️ 生产环境禁用）
    1. `$v=\sqrt{2gh}$` 误用在圆周运动例题（自由落体公式错入）
    2. `$a=\sqrt{k/(mr)}$` 弹簧常数 k 错入圆周运动
    3. `$a=r\omega$` 笔误（应为 `$v=r\omega$`）
    4. "在线圈模型中，边缘点转一圈耗时更长" —— **物理概念错误**（刚体转动各点周期相同）
    5. `$\theta = n \times 360°$` 量纲混乱（n 是频率 1/s，360°是角度，量纲不一致）
  - **4B：0 处错误** ✅
  - **9B：0 处错误** ✅
- [x] **质量/速度权衡决策**：
  - 生产环境：4b 2路（90s, 0 错误，质量稳定）
  - 草稿/演示：2b 2路（74s, 5 错误，仅供快速预览）
  - 最高质量：9b 1路（146s, 0 错误，慢但稳）
- [x] **建议方案**（下一步可做）：2b 跑前 4 段 + 4b 跑 exampleDerivation 兜底，耗时不变（~90s）但保证例题质量

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

#### Agent 阶段 3：Planning 自主规划（2026-06-29 完成）
- [x] **混合规划策略**：固定三步模板兜底（检索教材→生成内容→保存历史）+ AI 动态增减步骤，AI 失败时自动降级到模板
- [x] **planner.py 模块**：generate_plan(user_message) 返回 {type: "plan", plan: [...], user_message}
- [x] **run_agent_step 单步执行**：构造 STEP_EXECUTION_PROMPT 告诉 AI"现在执行第 N 步"，只调用一个工具就返回 {type: "step_result", ...}
- [x] **generate_summary 总结生成**：所有步骤完成后生成 {type: "summary", summary: "..."}
- [x] **后端 mode 透传**：AiService.callAgent(messages, mode, extra) 支持 plan/execute_step/summary 三种模式
- [x] **ConversationController 改造**：sendMessage 按 mode 分支，AI 回复按 type 格式化存入 Redis
- [x] **前端三种卡片视图**：plan（计划列表+确认按钮）/ step_result（结果+进度+重新执行+确认继续）/ summary（绿色总结框）
- [x] **逐步确认机制**：用户确认计划 → 逐步执行 → 每步结果确认 → 总结
- [x] **重新执行机制**：用户输入修改意见后重新执行当前步骤（方案 A）
- [x] **端到端验证**：plan → execute_step × 2 → summary 完整链路通过，Redis 5 条消息正确持久化

#### Agent 阶段 4：Multi-Agent 多智能体协作（2026-06-29 完成）
- [x] **3 个 Agent 分工**：教学设计 / 内容生成 / 质检（移除导出 Agent，用户通过备课历史页面按钮导出 PDF）
- [x] **LangGraph 工作流编排**：StateGraph + 条件路由 + 打回循环
- [x] **质检打回重做**：QA 不通过时根据 issue_type 打回，超过 max_retry 强制结束
- [x] **ReAct 思考过程**：Thought/Action/Observation 轨迹记录与可视化
- [x] **四层保障**：System Prompt + Few-shot + Pydantic Schema + 模板兜底
- [x] **SSE 流式推送**：AI 服务 → 后端 SseEmitter → 前端 EventSource
- [x] **Redis 持久化**：每个 Agent 执行后保存 State（RESP2 协议）
- [x] **自动保存到备课历史**：工作流完成后自动调用 save_lesson_to_history
- [x] **前端三栏可视化**：Agent 卡片 + 产出内容 + ReAct 思考/雷达图
- [x] **SVG 拓扑图 + 雷达图**：纯 SVG 实现，无第三方图表库

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
- `04-AI-Service/ai-service/agent/agent_core.py` - Agent Loop 决策循环（含 run_agent_step + generate_summary）
- `04-AI-Service/ai-service/agent/planner.py` - 阶段 3 混合规划器（模板兜底 + AI 动态增减）
- `04-AI-Service/ai-service/main.py` - Agent 端点 `POST /api/agent/demo`（支持 mode 参数路由）
- `03-Backend/backend/src/main/java/com/lessonplatform/controller/LessonController.java` - `POST /lessons/save`
- `03-Backend/backend/src/main/java/com/lessonplatform/service/ConversationService.java` - Redis 会话管理（24h TTL）
- `03-Backend/backend/src/main/java/com/lessonplatform/controller/ConversationController.java` - 对话端点（支持 mode 分支）
- `03-Backend/backend/src/main/java/com/lessonplatform/service/AiService.java` - callAgent 重载（mode + extra 透传）
- `02-Frontend/web-frontend/src/pages/Agent/AgentDemoPage.tsx` - Agent 测试页（三种卡片 + 逐步确认 + 重新执行）
- `02-Frontend/web-frontend/src/api/conversation.ts` - 对话 API（Planning 类型 + generatePlan/executeStep/retryStep/generateSummary）
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
