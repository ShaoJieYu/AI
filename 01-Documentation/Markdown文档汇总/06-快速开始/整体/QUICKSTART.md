# 项目启动指南

> 更新：2026-06-27。本文档反映清理后的实际目录结构与端口配置。

## 前置要求

- MySQL 8.0+
- Redis 7.x（位于 `05-Infrastructure/AI-Tools/redis/`）
- Nacos 2.x（位于 `05-Infrastructure/AI-Tools/nacos/`）
- Python 3.8+
- Java 21
- Node.js 18+

## 快速启动（5 个服务）

按顺序启动，缺一不可。

### 1. 启动 Nacos（配置中心，端口 8848）

```bash
cd D:/AI/05-Infrastructure/nacos/bin
startup.cmd -m standalone
```

访问 http://localhost:8848/nacos 验证（默认账号 nacos/nacos）。

### 2. 启动 Redis（缓存，端口 6379）

```bash
cd D:/AI/05-Infrastructure/redis
redis-server.exe
```

### 3. 数据库初始化（一次性）

```bash
mysql -u root -p
# 在 MySQL 中执行
source D:/AI/03-Backend/backend/sql/currentsql.sql;
USE lesson_platform;
SHOW TABLES;
SELECT * FROM sys_user;
```

### 4. 启动 AI 服务（端口 8001）

```bash
cd D:/AI/04-AI-Service/ai-service

# 安装依赖
pip install -r requirements.txt

# 配置 API 密钥
cp .env.example .env
# 编辑 .env 文件，填入通义千问 DASHSCOPE_API_KEY

# 启动服务
python main.py
```

访问 http://localhost:8001/health 验证服务运行。

注：AI 服务必须直连 dashscope.aliyuncs.com，启动前需清除系统代理：
```bash
set HTTP_PROXY=
set HTTPS_PROXY=
```

### 5. 启动后端（端口 8080）

```bash
cd D:/AI/03-Backend/backend

# 构建项目（首次或依赖变更时）
mvn clean install

# 启动
mvn spring-boot:run
```

访问 http://localhost:8080/api 验证后端运行。

### 6. 启动前端（端口 3000）

```bash
cd D:/AI/02-Frontend/web-frontend

# 安装依赖（首次或依赖变更时）
npm install

# 启动
npm run dev
```

访问 http://localhost:3000 进入系统。

## 测试账号

- 用户名：teacher1
- 密码：123456

## 端口说明

| 服务 | 端口 | 说明 |
|------|------|------|
| MySQL | 3306 | 数据库 |
| Redis | 6379 | 缓存 |
| Nacos | 8848 | 配置中心 |
| AI 服务 | 8001 | 通义千问 qwen-plus |
| 后端 | 8080 | Spring Boot |
| 前端 | 3000 | Vite dev server（代理 /api → 8080） |

## 常见问题

**Q: AI 服务启动失败？**
A: 检查是否配置了 DASHSCOPE_API_KEY，并确认已清除 HTTP_PROXY/HTTPS_PROXY 环境变量。

**Q: 后端连接数据库失败？**
A: 检查 `03-Backend/backend/src/main/resources/application.yml` 中的数据库密码是否正确。

**Q: 生成课程内容失败？**
A: 确保按顺序启动了 Nacos → Redis → AI 服务（8001）→ 后端（8080），任一缺失都会导致生成失败。

**Q: 前端 3000 端口被占用？**
A: Vite 会自动切到 3001/3002。若出现端口混乱，用 `netstat -ano | findstr :3000` 查找占用进程并结束，或确认只在 `02-Frontend/web-frontend` 下启动一个 vite 实例。

**Q: PDF 导出公式渲染异常？**
A: mathjax-renderer（位于 `05-Infrastructure/mathjax-renderer/`）是后端按需 fork 的 Node 子进程，无需手动启动。若导出失败，检查 Node.js 是否在 PATH 中，并确认后端配置 `app.mathjax.renderer-dir` 指向正确路径。

## 相关文档

- [整体架构](../05-架构文档/整体/01-ARCHITECTURE-ACTUAL.md)
- [数据库设计](../03-设计文档/02-DATABASE-DESIGN.md)
- [项目根目录 README](../../../README.md)
