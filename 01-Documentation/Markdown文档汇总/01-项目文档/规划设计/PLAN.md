# 全自动家教备课平台 - 项目计划

## 项目概述

构建一个集 **Web 端**、**移动应用 (App)** 及**小程序**于一体的全自动家教备课内容生成平台。该平台通过 AI 算法对输入的学生信息进行深度分析，自动生成针对性的、结构化的备课内容。

**核心技术升级**：采用 Taro 4.x 替代原生小程序开发，引入 Milvus 向量数据库支持 RAG，集成 LangChain Prompt 管理框架，实现 Spring Cloud Alibaba 服务治理体系。

## 核心价值主张

### 目标用户痛点
- **备课效率低**：平均每次课需要 2-3 小时准备教案、习题和讲解材料
- **个性化程度低**：难以针对每个学生的特点快速定制教学内容
- **经验依赖强**：新老师缺乏教学经验，备课质量参差不齐
- **资源分散**：需要从多个渠道收集习题、知识点和教学方法

### 解决方案
用 AI 替代重复性备课工作，让教师专注于教学本身，提供从学生信息输入到个性化备课内容生成的完整闭环体验。

## 功能模块规划

### 1. 用户与账户模块
**功能点：**
- 手机号/邮箱注册登录
- 微信快捷登录
- 个人信息管理
- 教学资质认证
- 会员管理

**技术实现：**
- Spring Security + JWT (Access Token 2小时 + Refresh Token 7天)
- 短信验证码服务
- 微信 OAuth 2.0 集成
- Nacos 配置中心管理

### 2. 学生管理模块
**功能点：**
- 学生档案管理（基本信息、学校、年级）
- 学情信息录入（学习基础、薄弱知识点、学习习惯、性格特点）
- 教学目标设定（短期、中期、长期目标）
- 成长轨迹记录（课堂表现、成绩变化）

**技术实现：**
- MySQL 8.0 + ShardingSphere 分库分表
- 数据版本控制
- 批量导入导出（Excel 模板）
- 敏感数据 AES-256-GCM 加密存储

### 3. 智能备课模块（核心）
**功能点：**
- 学生信息输入表单（结构化 + 自由文本）
- 备课模式选择（新课讲解、习题讲解、考前复习等 6 种模式）
- AI 备课内容生成（教案、知识点讲解、习题）
- 教案在线编辑和优化
- 习题生成与组卷
- 版本管理（支持版本对比和回滚）

**技术实现：**
- Spring Boot 3.2 业务服务
- Python FastAPI + LangChain AI 服务
- 国产大模型 API（通义千问/文心一言/GLM-4）+ ChatGLM 本地备份
- Milvus 2.4.x 向量数据库（RAG 增强生成）
- 多级缓存策略（Redis + 本地 Caffeine）
- 模型自适应路由 + Fallback 机制

### 4. 教学资源模块
**功能点：**
- 知识点库（按年级、科目分类，支持向量检索）
- 教学模板库
- 题型库与解题方法
- 资源收藏与管理

**技术实现：**
- Meilisearch 1.6.x 轻量级搜索
- 知识点图谱（Milvus 向量存储）
- 资源标签系统
- 智能推荐算法

### 5. 教学进度模块
**功能点：**
- 课程计划与安排
- 进度跟踪与统计
- 学习效果评估
- 学习报告生成

**技术实现：**
- 日历组件
- ECharts 数据可视化
- 报告模板引擎（PDF 导出）
- 成绩趋势预测算法

### 6. 多端协同模块
**功能点：**
- Web 端（React 18 + TypeScript + Vite）
- 移动 App（Flutter 3.x 跨平台）
- 微信小程序（Taro 4.x 一套代码多端）
- 数据实时同步

**技术实现：**
- WebSocket 实时通信（同步协调服务）
- 数据冲突检测与字段级合并算法
- 离线缓存支持（App 端）
- 三端数据一致性保障

## 技术架构

### 前端技术栈（优化后）
- **Web 框架**：React 18 + TypeScript 5.x
- **状态管理**：Zustand 4.x + React Query 14.x
- **UI 组件库**：Ant Design 5.x
- **样式方案**：Tailwind CSS 3.x
- **构建工具**：Vite 5.x
- **移动框架**：Flutter 3.x
- **小程序框架**：**Taro 4.x**（替代原生开发，一套代码多端编译）

### 后端技术栈（优化后）
- **主框架**：Spring Boot 3.2+（Java 21）
- **API 网关**：Spring Cloud Gateway 2023.x
- **服务治理**：Spring Cloud Alibaba 2023.x（Nacos + Sentinel + Seata）
- **ORM**：Spring Data JPA + MyBatis-Plus 3.5+
- **安全框架**：Spring Security 6.x + OAuth2 + JWT
- **AI 服务**：Python + FastAPI + LangChain 0.1.x
- **消息队列**：Redis Streams + RocketMQ 5.x
- **API 文档**：SpringDoc OpenAPI 2.x

### 基础设施（优化后）
- **关系数据库**：MySQL 8.0+ + ShardingSphere 5.0.x（分库分表）
- **缓存数据库**：Redis 7.x Cluster
- **向量数据库**：Milvus 2.4.x（知识点向量存储）
- **文件存储**：MinIO + OSS
- **搜索引擎**：Meilisearch 1.6.x（替代 Elasticsearch，轻量级）
- **容器化**：Docker 24.x + Kubernetes 1.28+

---

## 开发阶段规划

### Phase 1：MVP（第 1-4 周）- 基础验证

#### Week 1：项目初始化与基础架构
**前端开发任务：**
- [ ] 项目脚手架搭建（Vite + React 18 + TypeScript）
  - 配置 ESLint + Prettier + Husky
  - 配置 Tailwind CSS + Ant Design
  - 配置 Zustand 状态管理
  - 配置 React Query 服务端状态
- [ ] 基础布局组件开发
  - 侧边栏导航（Ant Design Menu）
  - 顶部 Header
  - 响应式布局（Tailwind）
- [ ] 基础 UI 组件封装
  - Button、Input、Modal、Loading 等

**后端开发任务：**
- [ ] Spring Boot 项目初始化
  - 配置 Spring Boot 3.2 + Java 21
  - 配置 Spring Data JPA + MyBatis-Plus
  - 配置 Spring Security + JWT
  - 配置 Nacos 配置中心
- [ ] 基础架构搭建
  - 全局异常处理（@ControllerAdvice）
  - 统一 API 响应格式（requestId 追踪）
  - 日志配置（Logback + ELK）
- [ ] 数据库设计实现
  - 用户表、学生表实体
  - 数据库初始化脚本（Flyway）
- [ ] API 网关配置（Spring Cloud Gateway）

**DevOps 任务：**
- [ ] 开发环境搭建
  - Docker Compose 配置（MySQL + Redis + Nacos）
  - 本地开发环境文档
- [ ] CI/CD 流水线初始化
  - GitHub Actions 配置
  - Dockerfile 编写

#### Week 2：用户与学生管理
**前端开发任务：**
- [ ] 认证模块
  - 登录/注册页面
  - JWT Token 管理（Zustand persist）
  - 路由守卫（React Router + PrivateRoute）
- [ ] 学生管理模块
  - 学生列表页面（Ant Design Table + 分页）
  - 添加学生表单（分步表单设计）
  - 学生详情页面
- [ ] 学情信息录入表单
  - 分步表单设计（Ant Design Steps）
  - 表单验证（Zod schema validation）
  - 草稿自动保存（React Query mutation）

**后端开发任务：**
- [ ] 认证 API 实现
  - 用户注册/登录
  - JWT Token 生成与验证
  - 短信验证码（阿里云短信服务）
  - 微信 OAuth 登录
- [ ] 学生管理 API
  - 学生 CRUD 接口
  - 学情信息管理
  - 数据权限控制（@DataPermission）
- [ ] 文件上传服务
  - 学生照片上传（MinIO）
  - 文件存储策略

**测试任务：**
- [ ] 单元测试编写
  - Service 层测试（JUnit 5 + Mockito）
  - Controller 层测试（MockMvc）
  - 覆盖率目标 > 70%

#### Week 3：AI 备课生成核心功能
**前端开发任务：**
- [ ] 备课输入页面
  - 备课模式选择（Radio/Segmented）
  - 主题和时长设置
  - 难度系数调整（Rate 组件）
- [ ] 备课生成进度显示
  - 进度条组件（Progress）
  - 实时状态更新（WebSocket + React Query）
  - 生成阶段展示（Steps +Descriptions）
- [ ] 备课内容展示页面
  - 教案结构展示（Collapse）
  - 知识点讲解（Markdown 渲染）
  - 习题展示（卡片布局）

**后端开发任务：**
- [ ] AI 服务集成
  - FastAPI 项目初始化
  - LangChain 集成
  - 国产大模型 API 对接（通义千问/GLM-4）
  - Prompt 模板设计（LangChain PromptTemplate）
  - **Milvus 向量数据库集成**
  - **RAG 增强生成流程**
- [ ] 备课内容管理
  - 备课记录存储（JSON 列存储）
  - 版本管理（乐观锁 @Version）
  - 内容审核（百度内容审核 API）
- [ ] WebSocket 服务
  - 实时进度推送（STOMP + SockJS）
  - 状态同步

**AI 训练任务：**
- [ ] Prompt 优化
  - 备课生成 Prompt 设计
  - Few-shot 示例准备
  - Chain-of-Thought 推理
- [ ] 模型路由配置
  - 简单任务 → qwen-turbo
  - 完整教案 → qwen-plus
  - 复杂推理 → qwen-max
  - Fallback → chatglm-pro

#### Week 4：教案编辑与导出
**前端开发任务：**
- [ ] 教案编辑器
  - 富文本编辑器（TinyMCE / TipTap）
  - 公式编辑支持（KaTeX）
  - 内容拖拽排序（dnd-kit）
- [ ] 教案导出功能
  - PDF 导出（react-pdf）
  - Word 导出（docx-templates）
  - 打印预览（Print.js）
- [ ] 用户反馈收集
  - 评分组件（5 星评分）
  - 意见收集表单

**后端开发任务：**
- [ ] 教案编辑 API
  - 内容更新接口（乐观锁保护）
  - 版本保存（历史记录表）
  - 版本对比（diff 算法）
- [ ] 导出服务
  - PDF 生成（iText 7）
  - Word 生成（Apache POI）
- [ ] 反馈收集
  - 反馈存储（lesson_feedback 表）
  - 统计分析（准确率、实用性评分）

**Week 4 交付物：**
- 可运行的 MVP 版本
- 支持学生信息管理
- AI 备课内容生成（LangChain + Milvus RAG）
- 基础教案编辑和导出
- Web 端完整功能

---

### Phase 2：多端扩展（第 5-8 周）- 能力提升

#### Week 5：移动 App 开发
**Flutter 开发任务：**
- [ ] Flutter 项目初始化
  - 项目结构搭建（Feature-first 架构）
  - 基础组件封装（Flutter Widgets）
  - 状态管理（flutter_bloc / Riverpod）
- [ ] 认证模块
  - 登录/注册页面
  - 生物识别登录（local_auth）
  - 离线 Token 缓存
- [ ] 学生管理
  - 学生列表（ListView.builder）
  - 学生详情（Card 布局）
  - 快速添加（BottomSheet）
- [ ] 备课查看
  - 教案浏览（Markdown widget）
  - 习题查看
  - 离线缓存（Hive 本地存储）

#### Week 6：微信小程序开发（**Taro 迁移**）
**Taro 开发任务：**
- [ ] **Taro 项目初始化**
  - 基础框架搭建（React 模式）
  - UI 组件库引入（tdesign-miniprogram）
  - 与 Web 端共用组件（80%+ 复用）
- [ ] 核心功能
  - 快速备课（简化版）
  - 学生列表
  - 教案分享（生成分享海报）
- [ ] 微信集成
  - 微信登录（Taro.getUserProfile）
  - 微信分享（onShareAppMessage）
  - 消息推送（微信订阅消息）

#### Week 7：数据同步服务
**后端开发任务：**
- [ ] 同步服务开发
  - 数据变更日志（Change Log 表）
  - 同步协调服务（WebSocket Server）
  - 冲突检测算法（字段级合并）
- [ ] WebSocket 优化
  - 连接管理（Session Map）
  - 消息队列（Redis Streams）
  - 心跳机制（Ping-Pong）
- [ ] 缓存策略
  - Redis 缓存（热点数据）
  - 本地 Caffeine 缓存（二级缓存）
  - 缓存预热和失效策略

**前端开发任务：**
- [ ] 同步逻辑实现
  - 本地存储（Taro.getStorageSync）
  - 冲突处理 UI（Diff 展示）
  - 同步状态显示（SyncStatus 组件）

#### Week 8：教学资源库
**前端开发任务：**
- [ ] 知识点库页面
  - 知识点浏览（Tree 组件）
  - 搜索功能（Taro SearchBar + Meilisearch）
  - 收藏功能
- [ ] 教学模板库
  - 模板展示（Card 网格）
  - 模板使用（一键应用）
  - 模板上传
- [ ] 题型库页面
  - 题型分类（Tabs）
  - 解题技巧（Markdown）
  - 经典例题

**后端开发任务：**
- [ ] 资源管理服务
  - 知识点管理（CRUD + 批量操作）
  - 模板管理
  - 题型管理
- [ ] 搜索服务
  - Meilisearch 集成
  - 全文搜索
  - 智能推荐（协同过滤）

**Week 8 交付物：**
- Flutter App 上线（iOS/Android）
- **Taro 小程序上线**（微信/支付宝/京东）
- 三端数据实时同步
- 教学资源库完善（Meilisearch 搜索）

---

### Phase 3：体验优化（第 9-12 周）- 精致打磨

#### Week 9：教学进度管理
**前端开发任务：**
- [ ] 课程安排页面
  - 日历视图（FullCalendar / Taro calendar）
  - 课程计划（拖拽调整）
  - 课程提醒（本地通知）
- [ ] 进度跟踪页面
  - 进度统计（ECharts 仪表盘）
  - 完成度展示（Progress Ring）
  - 预警提示（Badge + Notification）
- [ ] 学习报告页面
  - 成绩趋势图（Line Chart）
  - 知识点掌握度（ Radar Chart）
  - 报告导出（PDF）

**后端开发任务：**
- [ ] 进度管理服务
  - 课程计划管理
  - 进度记录（Learning Progress 表）
  - 统计分析（聚合查询）
- [ ] 报告生成服务
  - 报告模板（Thymeleaf / Freemarker）
  - 数据可视化（ECharts JSON 配置）
  - PDF 导出

#### Week 10：AI 能力增强
**AI 服务优化任务：**
- [ ] 备课质量提升
  - Prompt 优化迭代（A/B 测试）
  - Few-shot 示例扩充（50+ 优质案例）
  - Chain-of-Thought 推理增强
- [ ] 习题生成优化
  - 难度控制算法优化
  - 知识点匹配算法（向量相似度）
  - 变式题生成（题型变换）
- [ ] 内容审核增强
  - 准确性校验（知识点 fact-checking）
  - 敏感信息过滤
  - 质量评分（多维度评分模型）

**后端开发任务：**
- [ ] AI 服务性能优化
  - 响应时间优化（P95 < 5s）
  - 并发能力提升（多实例 + 限流）
  - **多级缓存策略**（Redis + 本地 + 结果缓存）

#### Week 11：UI/UX 全面优化
**前端开发任务：**
- [ ] 设计系统完善
  - 统一色彩规范（CSS Variables）
  - 组件样式统一（Design Tokens）
  - 动画效果优化（Framer Motion）
- [ ] 响应式设计优化
  - 移动端适配（Media Queries）
  - 平板适配（Flex 布局）
  - 触摸操作优化（手势支持）
- [ ] 暗色模式
  - 主题切换（Ant Design Dark Mode）
  - 暗色主题配色

**用户体验优化：**
- [ ] 新手引导
  - 交互式教程（Shepherd.js）
  - 功能引导（Tooltips）
  - 示例数据（Onboarding）
- [ ] 错误处理优化
  - 友好错误提示（Error Boundaries）
  - 修正建议（Contextual Help）
  - 重试机制（React Query Retry）

#### Week 12：测试与上线准备
**测试任务：**
- [ ] 集成测试
  - 端到端测试（Playwright）
  - 性能测试（k6）
  - 安全测试（OWASP ZAP）
- [ ] Bug 修复
  - 问题收集（Jira）
  - 优先级排序（MoSCoW）
  - 集中修复（Sprint 冲刺）
- [ ] 文档完善
  - 用户手册
  - API 文档（Swagger 更新）
  - FAQ

**运维任务：**
- [ ] 生产环境部署
  - Kubernetes 集群配置
  - Helm Chart 编写
  - 监控配置（Prometheus + Grafana）
  - 日志收集（ELK Stack）
- [ ] 性能优化
  - 数据库优化（索引优化 + SQL 优化）
  - CDN 配置（七牛云 CDN）
  - 缓存优化（热点数据分离）

**Week 12 交付物：**
- 完整的三端应用（Web + Flutter + Taro）
- 完善的教学资源库
- 精致的 UI 界面
- 生产就绪版本（99.5% 可用性）

---

## 成功指标

### 技术指标

#### 核心功能指标
| 指标 | 目标值 | 测量方法 | 验收标准 |
|------|--------|----------|----------|
| 备课内容生成准确率 | > 85% | 基于 1000 份测试集 | P0 功能必须达标 |
| 教案结构完整性 | > 90% | 人工评审 | Phase 1 验收标准 |
| 习题难度匹配度 | > 80% | 用户反馈统计 | Phase 2 验收标准 |
| 学生情况分析准确率 | > 85% | 人工评估 | Phase 2 验收标准 |

#### 性能指标
| 指标 | 目标值 | 测量方法 | 监控频率 |
|------|--------|----------|----------|
| 备课生成响应时间 | < 10 秒（P95） | APM 监控 | 实时 |
| 简单查询响应时间 | < 200ms（P95） | APM 监控 | 实时 |
| 系统可用性 | > 99.5% | uptime 监控 | 月度 |
| API 成功率 | > 99.5% | 日志统计 | 实时 |
| 并发用户数 | 500+ | 压力测试 | 每周 |

#### 代码质量指标
| 指标 | 目标值 | 工具 | 检查频率 |
|------|--------|------|----------|
| 单元测试覆盖率 | > 70% | JaCoCo | 每次构建 |
| 集成测试覆盖率 | > 50% | JaCoCo | 每次构建 |
| 代码规范合规 | 100% | Checkstyle/ESLint | 每次提交 |
| 安全漏洞 | 0 高危 | SonarQube | 每日 |

### 用户指标

#### 用户行为指标
| 指标 | 目标值 | 测量方法 | 统计周期 |
|------|--------|----------|----------|
| 新用户完成首次备课时间 | < 10 分钟 | 埋点统计 | 每日 |
| 用户满意度（NPS） | > 50 | 用户调研 | 每月 |
| 功能满意度评分 | > 4.5/5.0 | 应用内评分 | 实时 |
| 日活跃用户数（DAU） | 1000+ | 统计分析 | 每日 |
| 月活跃用户数（MAU） | 5000+ | 统计分析 | 每月 |
| 用户留存率（30 日） | > 40% | cohort 分析 | 每月 |

#### 业务价值指标
| 指标 | 目标值 | 测量方法 | 统计周期 |
|------|--------|----------|----------|
| 备课效率提升 | 从 2 小时降至 20 分钟 | 用户调研 | 每月 |
| 付费转化率 | > 8% | 业务统计 | 每月 |
| 客户生命周期价值（LTV） | > ¥2000 | 财务统计 | 每季度 |
| 获客成本（CAC） | < ¥300 | 财务统计 | 每月 |

---

## 风险与应对

### 高风险

| 风险 | 概率 | 影响 | 风险值 | 应对措施 | 负责人 |
|------|------|------|--------|----------|--------|
| **AI 生成内容准确性低** | 高 | 高 | 极高 | 1. 建立人工审核和反馈机制<br>2. 持续优化 Prompt 和 Few-shot 示例<br>3. 实现内容质量评分<br>4. **引入 Milvus RAG 增强知识准确性** | AI 负责人 |
| **大模型 API 成本过高** | 高 | 高 | 极高 | 1. 实现多级缓存策略<br>2. 设置每日调用限额<br>3. 优化 Prompt 减少 Token 消耗<br>4. **准备 ChatGLM 本地模型备选方案** | 技术负责人 |
| **核心开发人员离职** | 中 | 高 | 高 | 1. 代码文档化（ADR 架构决策记录）<br>2. 知识分享会（每周 Tech Talk）<br>3. 关键模块双人备份<br>4. 完善 CI/CD 减少人工依赖 | 项目经理 |

### 中风险

| 风险 | 概率 | 影响 | 风险值 | 应对措施 | 负责人 |
|------|------|------|--------|----------|--------|
| **多端同步复杂度高** | 中 | 高 | 中高 | 1. **采用 Taro 一套代码多端**<br>2. 实现冲突检测和字段级合并算法<br>3. 充分的测试覆盖<br>4. 预留 2 周专项优化 | 后端负责人 |
| **数据安全问题** | 低 | 高 | 中 | 1. 安全代码审查（SAST）<br>2. 渗透测试（Week 10）<br>3. 数据加密（传输 + 存储）<br>4. 定期安全审计 | 安全工程师 |
| **应用商店审核不通过** | 中 | 中 | 中 | 1. 提前了解审核规则<br>2. 准备多套方案<br>3. 预留审核时间缓冲<br>4. 建立申诉渠道 | 产品负责人 |
| **需求变更频繁** | 中 | 中 | 中 | 1. 敏捷开发，短迭代周期<br>2. 需求变更控制流程<br>3. 优先级管理（MoSCoW 法则）<br>4. 预留 20% 缓冲时间 | 产品经理 |

### 低风险

| 风险 | 概率 | 影响 | 风险值 | 应对措施 | 负责人 |
|------|------|------|--------|----------|--------|
| **用户学习成本高** | 中 | 低 | 低 | 1. 交互式新手引导（Shepherd.js）<br>2. 丰富的示例数据<br>3. 视频教程 + 帮助文档<br>4. 在线客服支持 | 产品经理 |
| **竞品抢先发布** | 低 | 中 | 低 | 1. 加快 MVP 发布速度<br>2. 聚焦差异化功能（AI 备课深度）<br>3. 快速迭代响应市场 | 产品负责人 |
| **技术选型失误** | 低 | 中 | 低 | 1. 技术预研和 POC 验证<br>2. 技术决策文档化（ADR）<br>3. 保持架构可扩展性 | 架构师 |

### 风险监控机制
- **每周风险 Review**：周会评估风险状态
- **风险 Dashboard**：可视化风险跟踪（Jira）
- **预警机制**：风险升级时自动通知（PagerDuty）
- **应急预案**：高风险制定详细应急预案（Runbook）

---

## 质量保证

### 测试策略

#### 单元测试
- **目标覆盖率**：> 70%
- **测试框架**：JUnit 5 + Mockito（后端），Vitest + React Testing Library（前端）
- **测试范围**：
  - Service 层业务逻辑
  - 工具类方法（加密、格式化）
  - 数据转换逻辑（DTD/Entity 转换）
- **执行频率**：每次代码提交（Git Hooks）

#### 集成测试
- **目标覆盖率**：> 50%
- **测试框架**：Spring Boot Test + TestContainers
- **测试范围**：
  - API 接口测试（REST Assured）
  - 数据库操作测试
  - Redis 缓存操作测试
  - 外部服务 Mock 测试（WireMock）
- **执行频率**：每日构建（CI/CD 流水线）

#### E2E 测试
- **测试工具**：Playwright（Web）、Flutter Integration Test（App）
- **测试场景**：
  - 用户注册登录流程
  - 学生管理流程
  - 备课生成流程（AI 服务 Mock）
  - 教案导出流程
- **执行频率**：每周回归测试

#### 性能测试
- **测试工具**：k6（Go 编写的现代负载测试工具）
- **测试场景**：
  - 并发用户查询（500 并发）
  - AI 生成压力测试（限流验证）
  - 大数据量查询（10万学生数据）
- **执行频率**：Phase 2 结束、上线前

### 代码审查
- **审查方式**：Pull Request + Code Review
- **审查人员**：至少 1 名 Senior Engineer
- **审查内容**：
  - 代码规范合规性（Checkstyle/ESLint）
  - 业务逻辑正确性
  - 安全漏洞检查（SonarQube）
  - 性能优化建议
- **审查标准**：
  - 无严重问题才能合并（Blocker 级别必须修复）
  - 审查响应时间 < 24 小时

### 持续集成/持续部署

#### CI 流水线
```yaml
# GitHub Actions - ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'

      - name: Cache Maven packages
        uses: actions/cache@v3
        with:
          path: ~/.m2/repository
          key: ${{ runner.os }}-maven-${{ hashFiles('**/pom.xml') }}

      - name: Build with Maven
        run: ./mvnw clean package -DskipTests

      - name: Run Unit Tests
        run: ./mvnw test

      - name: Run Integration Tests
        run: ./mvnw verify -Pintegration-tests

      - name: SonarQube Scan
        uses: sonarsource/sonarqube-scan-action@master
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}

      - name: Build Docker Image
        run: |
          docker build -t lesson-platform:${{ github.sha }} .

      - name: Push to Registry
        run: |
          docker push ${{ env.REGISTRY }}/lesson-platform:${{ github.sha }}
```

#### CD 流水线
```yaml
# GitHub Actions - cd.yml
name: CD Pipeline

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        type: choice
        options:
          - staging
          - production

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    steps:
      - name: Deploy to Kubernetes
        uses: azure/k8s-deploy@v1
        with:
          manifests: |
            k8s/deployment.yml
            k8s/service.yml
            k8s/ingress.yml
          images: |
            docker.io/lesson-platform:${{ github.sha }}

      - name: Health Check
        run: |
          kubectl rollout status deployment/backend-service
          kubectl rollout status deployment/ai-service

      - name: Smoke Test
        run: |
          curl -f https://api.lesson-platform.com/health
```

---

## 交付物

### 1. 代码交付物
- **前端代码**：
  - Web 端：React 18 + TypeScript 完整源码
  - 移动 App：Flutter 3.x 完整源码
  - 微信小程序：**Taro 4.x** 完整源码（一套代码多端）
- **后端代码**：
  - Spring Boot 微服务完整源码
  - Python FastAPI AI 服务完整源码
- **基础设施代码**：
  - Docker Compose 配置
  - Kubernetes 部署清单（Helm Chart）
  - CI/CD 流水线配置

### 2. 文档交付物
- **需求文档**：产品需求规格说明书
- **设计文档**：
  - 架构设计文档（DESIGN.md）
  - 数据库设计文档（ER 图 + SQL 脚本）
  - API 接口文档（SpringDoc Swagger UI）
- **开发文档**：
  - 开发环境搭建指南
  - 代码规范文档
  - 贡献者指南（CONTRIBUTING.md）
- **运维文档**：
  - 部署手册（Runbook）
  - 监控告警配置
  - 故障排查手册
- **用户文档**：
  - 用户手册
  - 快速上手指南
  - FAQ

### 3. 测试交付物
- **测试报告**：
  - 单元测试报告（JaCoCo HTML）
  - 集成测试报告
  - 性能测试报告（k6 HTML Report）
  - 安全测试报告（OWASP ZAP Report）
- **测试数据**：
  - 测试数据集（脱敏，100+ 学生档案）
  - AI 测试用例集（1000+ 组）
  - 自动化测试脚本

### 4. 演示交付物
- **Demo 视频**：
  - 产品功能演示（5 分钟）
  - 技术架构介绍（10 分钟）
  - 使用教程（系列视频 10集）
- **演示环境**：
  - 在线演示地址（staging.lesson-platform.com）
  - 演示账号（3个教师 + 10个学生）

### 交付时间表

| 交付物 | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|--------|---------|---------|---------|---------|
| Web 端代码 | MVP 版本 | 功能完善 | 体验优化 | 完整功能 |
| 移动 App 代码 | - | Flutter 上线 | 功能完善 | 优化迭代 |
| 小程序代码 | - | **Taro 上线** | 功能完善 | 优化迭代 |
| 后端代码 | MVP 版本 | 核心功能 | 体验优化 | 完整功能 |
| AI 服务代码 | MVP 版本 | **RAG 增强** | 能力增强 | 完整功能 |
| API 文档 | 基础版 | 完整版 | 完善 | 最终版 |
| 测试报告 | 基础测试 | 完整测试 | 回归测试 | 验收测试 |
| 部署文档 | 开发环境 | 生产环境 | 完善 | 最终版 |
| Demo 环境 | 内部演示 | 客户演示 | 公测 | 正式上线 |

---

## 团队协作

### 团队组成
- **产品经理**：1 名 - 需求管理、产品设计
- **前端开发**：3 名 - Web 端、Flutter App、**Taro 小程序**
- **后端开发**：3 名 - 业务服务、AI 服务、**服务治理（Nacos/Sentinel）**
- **AI 工程师**：2 名 - **LangChain Prompt 工程、Milvus RAG**
- **测试工程师**：1 名 - 测试计划、质量保证
- **UI 设计师**：1 名 - 界面设计、交互设计

### 开发流程
- **敏捷开发**：Scrum 框架
- **迭代周期**：2 周一个 Sprint
- **每日站会**：15 分钟同步进度（Scrum Daily）
- **Sprint 计划**：每 2 周初规划（Sprint Planning）
- **Sprint 回顾**：每 2 周末复盘（Sprint Retrospective）

### 沟通工具
- **项目管理**：Jira（需求、任务、缺陷跟踪）
- **文档协作**：Notion（知识库、决策记录）
- **代码管理**：GitHub（Code Review + Actions）
- **即时通讯**：企业微信/钉钉
- **设计协作**：Figma（设计稿 + 原型）

### 技术分享
- **每周 Tech Talk**：周五下午 2 点，分享技术踩坑和最佳实践
- **架构 Decision Records (ADR)**：重大技术决策记录在 Notion
- **Pair Programming**：关键模块采用结对编程

---

## 技术升级亮点总结

| 升级项 | 原方案 | 优化后方案 | 价值 |
|--------|--------|------------|------|
| 小程序开发 | 原生开发 | **Taro 4.x** | 一套代码多端，复用率 80%+ |
| AI 服务 | 简单 API 调用 | **LangChain + Milvus RAG** | 知识准确性提升 15%+ |
| 服务治理 | 手写网关 | **Spring Cloud Alibaba** | 限流熔断、服务注册自动发现 |
| 数据库 | 单库 | **MySQL + ShardingSphere** | 支持水平扩展 |
| 搜索引擎 | Elasticsearch | **Meilisearch** | 轻量快速，资源节省 50% |
| 缓存 | 单级 Redis | **Redis + Caffeine 二级缓存** | 热点数据访问提升 3 倍 |
| 状态管理 | Zustand only | **Zustand + React Query** | 服务端状态自动同步 |

---

**文档版本**: 2.0  
**最后更新**: 2026-03-24  
**作者**: 全自动家教备课平台团队
