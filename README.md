# 全自动家教备课内容生成平台

基于 AI 的个性化备课内容生成平台，集成通义千问大模型，自动生成五段式教学指南并支持 PDF 导出。

## 目录结构

```
d:\AI\
├── 01-Documentation/      # 项目文档（需求/设计/架构/快速开始/工作记录）
├── 02-Frontend/           # 前端（React 18 + TypeScript + Vite + Ant Design）
│   └── web-frontend/      # 前端工程根目录（在此执行 npm run dev）
├── 03-Backend/            # 后端（Spring Boot 3 + MyBatis Plus + MySQL）
│   └── backend/           # 后端工程根目录（在此执行 mvn spring-boot:run）
├── 04-AI-Service/         # AI 服务（FastAPI + 通义千问 qwen-plus）
│   └── ai-service/        # AI 服务工程根目录（在此执行 python main.py）
├── 05-Infrastructure/     # 运行时依赖与渲染工具
│   ├── nacos/             # 配置中心，启动：bin/startup.cmd -m standalone
│   ├── redis/             # 缓存，启动：redis-server.exe
│   └── mathjax-renderer/  # PDF 公式渲染 Node 子进程（被后端按需 fork，无需手动启动）
├── _archive/              # 历史归档（不再参与日常开发）
│   ├── group_homeword/    # 小组作业提交版本快照
│   └── 06-Tools/          # 一次性维护脚本（md 整理、项目清理）
└── README.md              # 本文件
```

## 快速启动

### 前置要求

- MySQL 8.0+、Redis 7.x、Nacos 2.x
- Java 21、Node.js 18+、Python 3.8+

### 启动顺序（5 个服务）

| 序号 | 服务 | 工作目录 | 启动命令 | 端口 |
|------|------|----------|----------|------|
| 1 | Nacos | `05-Infrastructure/nacos/bin` | `startup.cmd -m standalone` | 8848 |
| 2 | Redis | `05-Infrastructure/redis` | `redis-server.exe` | 6379 |
| 3 | AI 服务 | `04-AI-Service/ai-service` | `python main.py` | 8001 |
| 4 | 后端 | `03-Backend/backend` | `mvn spring-boot:run` | 8080 |
| 5 | 前端 | `02-Frontend/web-frontend` | `npm run dev` | 3000 |

访问 http://localhost:3000 进入系统。

### 数据库初始化

```bash
mysql -u root -p
# 在 MySQL 中执行
source D:/AI/03-Backend/backend/sql/currentsql.sql;
```

### 测试账号

- 用户名：teacher1
- 密码：123456

## 关键约定

- AI 模型使用 qwen-plus，max_tokens=8192，直连 dashscope.aliyuncs.com（须清除系统代理）
- AI 备课内容采用五段式结构：core_definition / teaching_analysis / mistake_warnings / score_boosting / example_derivation
- 公式仅限理科（物理/化学/生物/数学）使用 LaTeX，文科严禁 `$...$` 避免伪公式
- 前端多步表单使用 Form.useWatch 订阅字段变化，不用 form.getFieldValue
- PDF 导出字体使用微软雅黑（msyh.ttc），公式经 MathJax 渲染为 SVG 后嵌入
- mathjax-renderer 路径配置：后端 `LatexRendererService` 默认 `d:/AI/05-Infrastructure/mathjax-renderer`，可通过 `app.mathjax.renderer-dir` 覆盖

## 文档导航

完整文档位于 `01-Documentation/Markdown文档汇总/`，关键入口：

- 快速开始：`06-快速开始/整体/QUICKSTART.md`
- 项目状态：`01-项目文档/项目状态/00-PROJECT-STATUS.md`
- 实现架构：`05-架构文档/整体/01-ARCHITECTURE-ACTUAL.md`
- 工作记录：`08-工作文档/`（含五段式升级、PDF 导出优化、各类 bug 排查记录）
- 文档索引：`01-项目文档/导航索引/INDEX.md`

## 注意事项

- `_archive/` 是历史归档，不要在此目录开发或引用其中的代码
- 后端 `03-Backend/backend/` 下的本地调试文件（如 `reset_pass.sql`）已清理，如需重置密码请直接在 MySQL 中操作
