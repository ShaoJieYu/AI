# 📚 文档导航

**版本**: v1.0 (原始版) | **更新**: 2026-03-25 | **语言**: 中文

> 👋 欢迎！这是项目文档的入口。选择你需要的内容快速导航。

---

## 🌟 新增功能：增强版导航索引

**推荐优先使用：[📖 INDEX.md](./INDEX.md) (增强版导航)**

我们已创建了一个**智能导航索引**，包含：
- ✅ **26个文档的完整一览表** - 每个文档都有3-5句概述 + 阅读时间
- ✅ **按场景的快速导航** - 6种常见使用场景，直达所需文档
- ✅ **学习路径建议** - 初级(30分钟) / 中级(2小时) / 高级(半天)

**使用方式**: 打开 [INDEX.md](./INDEX.md) → 扫描文档一览表 → 找到需要的文档 → 直接链接跳转

**优点**: 像使用skills一样，快速判断是否需要阅读，节省token！

### 📖 INDEX.md 的三种使用方式

1️⃣ **快速查找（推荐）** - 按场景导航（2-3分钟内找到答案）
   - 新人入门？→ 查看"我是新人"场景
   - 遇到问题？→ 查看"我遇到问题"场景
   - 了解规划？→ 查看"我想了解项目规划"场景

2️⃣ **系统学习** - 按学习路径（从入门到精通）
   - 初级路径：掌握项目基础（30分钟）
   - 中级路径：能够独立开发模块（2小时）
   - 高级路径：理解全局架构和优化（半天）

3️⃣ **完整参考** - 按分类浏览（26个文档一览）
   - 快速开始 | 项目管理 | 架构设计 | 模块开发 | 部署运维 | 参考文档

---

## 🎯 快速导航

### 🚀 我是新人，5分钟了解项目
1. 先读这个: **[00-PROJECT-STATUS.md](./00-PROJECT-STATUS.md)** - 项目进度一览
2. 然后看: **[../QUICKSTART.md](../QUICKSTART.md)** - 快速启动指南
3. 遇到问题: 查看对应模块的 QUICK-START.md

### 🔧 我要开发某个模块
- **前端**: [frontend/QUICK-START.md](./frontend/QUICK-START.md) + [frontend/ARCHITECTURE.md](./frontend/ARCHITECTURE.md)
- **后端**: [backend/QUICK-START.md](./backend/QUICK-START.md) + [backend/ARCHITECTURE.md](./backend/ARCHITECTURE.md)
- **AI服务**: [ai-service/QUICK-START.md](./ai-service/QUICK-START.md) + [ai-service/ARCHITECTURE.md](./ai-service/ARCHITECTURE.md)

### 🏛️ 我要了解架构设计
- **当前实现**: [01-ARCHITECTURE-ACTUAL.md](./01-ARCHITECTURE-ACTUAL.md) - 真实的技术架构
- **理想设计**: [../DESIGN.md](../DESIGN.md) - 原始规划文档
- **差异说明**: [01-ARCHITECTURE-ACTUAL.md#架构偏差分析](./01-ARCHITECTURE-ACTUAL.md#架构偏差分析) - 为什么与设计不同

### 📖 我要查询具体内容

#### 数据库和API
- [backend/DATABASE-SCHEMA.md](./backend/DATABASE-SCHEMA.md) - 数据库表设计
- [backend/API-DESIGN.md](./backend/API-DESIGN.md) - REST API规范
- [backend/SERVICE-MODULES.md](./backend/SERVICE-MODULES.md) - 业务服务模块说明

#### 业务逻辑
- [backend/ARCHITECTURE.md](./backend/ARCHITECTURE.md) - 后端架构和服务划分
- [ai-service/ARCHITECTURE.md](./ai-service/ARCHITECTURE.md) - AI服务架构
- [frontend/ARCHITECTURE.md](./frontend/ARCHITECTURE.md) - 前端架构

#### 部署和配置
- [infrastructure/DEPLOYMENT.md](./infrastructure/DEPLOYMENT.md) - Docker/K8s部署
- [infrastructure/DATABASE.md](./infrastructure/DATABASE.md) - 数据库配置
- [infrastructure/MONITORING.md](./infrastructure/MONITORING.md) - 监控和日志 (规划中)

### 🗺️ 我想知道未来的计划
- [02-ROADMAP.md](./02-ROADMAP.md) - Phase 2和Phase 3规划
- 包含: 多端应用、向量知识库、可观测性等计划

### 🐛 我遇到了问题
- 查看对应模块的 QUICK-START.md 中的 "常见问题" 部分
- 前端: [frontend/QUICK-START.md#常见问题](./frontend/QUICK-START.md#常见问题)
- 后端: [backend/QUICK-START.md#常见问题](./backend/QUICK-START.md#常见问题)
- AI: [ai-service/QUICK-START.md#常见问题](./ai-service/QUICK-START.md#常见问题)

---

## 📁 完整目录树

```
docs/
├── README.md                          ← 你在这里
├── 00-PROJECT-STATUS.md              ✨ 必读：项目状态、进度、完整度
├── 01-ARCHITECTURE-ACTUAL.md         ✨ 技术栈实现和架构偏差分析
├── 02-ROADMAP.md                     ✨ 未来规划 (Phase 2-3)
│
├── frontend/
│   ├── QUICK-START.md               快速启动 (npm install → npm run dev)
│   ├── ARCHITECTURE.md              架构设计、目录结构、技术栈说明
│   ├── API-CLIENT.md                API客户端集成方式
│   └── COMPONENTS.md                UI组件库和使用规范
│
├── backend/
│   ├── QUICK-START.md               快速启动 (mvn clean install → mvn spring-boot:run)
│   ├── ARCHITECTURE.md              Spring Boot架构、微服务划分、Nacos治理
│   ├── API-DESIGN.md                REST API规范、错误处理、版本管理
│   ├── DATABASE-SCHEMA.md           MySQL表设计、索引、关键关系
│   └── SERVICE-MODULES.md           各服务模块的职责和接口
│
├── ai-service/
│   ├── QUICK-START.md               快速启动 (pip install → python main.py)
│   ├── ARCHITECTURE.md              FastAPI架构、LLM集成、Prompt设计
│   ├── LLM-INTEGRATION.md           通义千问集成说明
│   └── PROMPT-DESIGN.md             Prompt编写规范和最佳实践
│
└── infrastructure/
    ├── DATABASE.md                  MySQL/Redis 配置和部署
    ├── DEPLOYMENT.md                Docker/K8s 部署配置
    └── MONITORING.md                可观测性规划 (ELK/SkyWalking/Prometheus)
```

---

## 🔗 按用途分类

### 开发者路径

#### 新开发者快速上手 (15分钟)
```
1. 读: 00-PROJECT-STATUS.md (5分钟)
   → 了解项目阶段、进度、完整度
   
2. 读: ../QUICKSTART.md (5分钟)
   → 知道如何启动整个项目
   
3. 选择模块并读对应的 QUICK-START.md (5分钟)
   → 快速启动你的开发模块
```

#### 前端开发者 (30分钟深度)
```
1. frontend/QUICK-START.md (5分钟)
2. frontend/ARCHITECTURE.md (10分钟)
   → 目录结构、状态管理、组件设计
3. frontend/API-CLIENT.md (10分钟)
   → 如何调用后端API
4. frontend/COMPONENTS.md (5分钟)
   → 使用Ant Design和Tailwind
```

#### 后端开发者 (30分钟深度)
```
1. backend/QUICK-START.md (5分钟)
2. backend/ARCHITECTURE.md (10分钟)
   → 微服务划分、Nacos治理
3. backend/DATABASE-SCHEMA.md (10分钟)
   → 表设计和关键关系
4. backend/API-DESIGN.md (5分钟)
   → API规范和错误处理
```

#### AI开发者 (30分钟深度)
```
1. ai-service/QUICK-START.md (5分钟)
2. ai-service/ARCHITECTURE.md (10分钟)
   → FastAPI架构、集成方式
3. ai-service/LLM-INTEGRATION.md (10分钟)
   → 通义千问API集成
4. ai-service/PROMPT-DESIGN.md (5分钟)
   → Prompt最佳实践
```

#### DevOps/基础设施 (30分钟深度)
```
1. infrastructure/DATABASE.md (10分钟)
   → MySQL、Redis配置
2. infrastructure/DEPLOYMENT.md (15分钟)
   → Docker镜像、K8s配置
3. infrastructure/MONITORING.md (5分钟)
   → 可观测性规划
```

### 管理者路径

#### 项目经理/产品经理
```
1. 00-PROJECT-STATUS.md (10分钟)
   → 项目阶段、进度、完整度、已知问题
   
2. 02-ROADMAP.md (15分钟)
   → 未来计划、时间表、优先级
   
3. [DESIGN.md](../DESIGN.md) (20分钟, 可选)
   → 理想架构和为什么与实现不同
```

#### 决策层
```
仅需阅读:
- 00-PROJECT-STATUS.md 的"快速概览"和"功能完整度" (5分钟)
- 02-ROADMAP.md 的"规划总览"和"时间规划" (10分钟)
```

---

## 📖 按学习深度分类

### 初级 (5-10分钟)
- ✅ 00-PROJECT-STATUS.md - 快速概览
- ✅ ../QUICKSTART.md - 3步启动
- ✅ 对应模块的 QUICK-START.md

### 中级 (20-30分钟)
- ✅ 01-ARCHITECTURE-ACTUAL.md - 实现架构
- ✅ 对应模块的 ARCHITECTURE.md
- ✅ 02-ROADMAP.md - 未来规划

### 高级 (1-2小时)
- ✅ [DESIGN.md](../DESIGN.md) - 完整设计文档
- ✅ backend/DATABASE-SCHEMA.md - 详细表设计
- ✅ backend/API-DESIGN.md - API规范
- ✅ infrastructure/* - 部署和运维

### 专家级 (逐行阅读源代码)
- ✅ 各模块的源代码注释
- ✅ 参考 ARCHITECTURE.md 中的目录结构

---

## 🎓 学习路径

### 快速上手 (MVP理解)
```
Total: 20分钟

00-PROJECT-STATUS.md (10分钟)
  ↓
选择模块的 QUICK-START.md (5分钟)
  ↓
开始编码 (5分钟环境准备)
```

### 深入理解 (架构理解)
```
Total: 60分钟

00-PROJECT-STATUS.md (10分钟)
  ↓
01-ARCHITECTURE-ACTUAL.md (15分钟)
  ↓
02-ROADMAP.md (10分钟)
  ↓
对应模块的 ARCHITECTURE.md (15分钟)
  ↓
DESIGN.md (理想架构，10分钟，可选)
```

### 生产准备 (运维理解)
```
Total: 90分钟

上述全部内容 (60分钟)
  ↓
infrastructure/DATABASE.md (15分钟)
  ↓
infrastructure/DEPLOYMENT.md (15分钟)
```

---

## 📊 文档统计

| 文档 | 阅读时间 | 难度 | 必读 |
|------|---------|------|------|
| 00-PROJECT-STATUS.md | 10分钟 | ⭐ | ✅ |
| 01-ARCHITECTURE-ACTUAL.md | 15分钟 | ⭐⭐ | ✅ |
| 02-ROADMAP.md | 10分钟 | ⭐ | ✅ |
| frontend/QUICK-START.md | 5分钟 | ⭐ | 前端必读 |
| frontend/ARCHITECTURE.md | 10分钟 | ⭐⭐ | 前端深入 |
| backend/QUICK-START.md | 5分钟 | ⭐ | 后端必读 |
| backend/ARCHITECTURE.md | 15分钟 | ⭐⭐ | 后端深入 |
| backend/DATABASE-SCHEMA.md | 15分钟 | ⭐⭐⭐ | 后端高级 |
| backend/API-DESIGN.md | 10分钟 | ⭐⭐ | 后端深入 |
| ai-service/QUICK-START.md | 5分钟 | ⭐ | AI必读 |
| ai-service/ARCHITECTURE.md | 15分钟 | ⭐⭐⭐ | AI深入 |
| infrastructure/DATABASE.md | 10分钟 | ⭐⭐ | 运维必读 |
| infrastructure/DEPLOYMENT.md | 15分钟 | ⭐⭐⭐ | 运维高级 |
| DESIGN.md | 30分钟 | ⭐⭐ | 可选理解 |

---

## 💡 常见问题

**Q: 我只有5分钟，应该读什么？**
A: 只读 `00-PROJECT-STATUS.md` 的"快速概览"部分

**Q: 我是新手，应该从哪里开始？**
A: 按照"快速上手"路径，20分钟内可以开始编码

**Q: 架构文档和DESIGN.md有什么区别？**
A: 
- DESIGN.md = 理想架构（全部规划）
- 01-ARCHITECTURE-ACTUAL.md = 实现架构（当前做了什么）

**Q: 某个功能为什么没实现？**
A: 查看 01-ARCHITECTURE-ACTUAL.md 的"架构偏差分析"部分

**Q: 接下来要做什么？**
A: 查看 02-ROADMAP.md 的"Phase 2"规划

**Q: 我需要搭建多个模块，按什么顺序？**
A: 推荐顺序：
  1. 后端API (backend/QUICK-START.md + ARCHITECTURE.md)
  2. 前端应用 (frontend/QUICK-START.md)
  3. AI服务 (ai-service/QUICK-START.md)
  4. 基础设施 (infrastructure/*)

---

## 🔄 文档维护

### 更新触发条件
- [ ] 完成新功能 → 更新 00-PROJECT-STATUS.md
- [ ] 架构大变动 → 更新 01-ARCHITECTURE-ACTUAL.md
- [ ] 启动新阶段 → 更新 02-ROADMAP.md

### 文档所有者
- 总览: AI文档系统维护
- 各模块: 对应开发团队

### 审核流程
- 代码merged后，24小时内更新相应文档
- 每月检查一次文档准确性

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-03-25 | 初始文档体系创建 |

---

## 相关资源

- **[项目根目录README](../README.md)** - 项目概述
- **[快速启动](../QUICKSTART.md)** - 一键启动指南
- **[原始设计](../DESIGN.md)** - 理想架构设计
- **[开发计划](../PLAN.md)** - 原始计划文档

---

最后更新: 2026-03-25 | 下一次审查: 2026-04-25
