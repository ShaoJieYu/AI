# 项目启动指南

## 前置要求

- MySQL 8.0+（端口 3306）
- Redis 3.0+（端口 6379，项目内置在 `05-Infrastructure/AI-Tools/redis`）
- Python 3.8+（用于 AI 服务）
- Java 21（用于后端 Spring Boot）
- Node.js 18+（用于前端 Vite）
- 通义千问（DashScope）API 密钥

## 服务端口说明

| 服务       | 端口  | 备注                                   |
|------------|-------|----------------------------------------|
| MySQL      | 3306  | 数据库                                 |
| Redis      | 6379  | 缓存（后端依赖）                        |
| AI 服务    | 8001  | FastAPI，通义千问调用                  |
| 后端       | 8080  | Spring Boot，context-path 为 `/api`    |
| 前端       | 3000  | Vite 开发服务（被占用时自动切换端口）   |

说明：Nacos 已在 [bootstrap.yml](file:///d:/AI/03-Backend/backend/src/main/resources/bootstrap.yml) 中禁用（`spring.cloud.nacos.discovery.enabled=false` 和 `spring.cloud.nacos.config.enabled=false`），无需启动。

## 快速启动

### 1. 数据库初始化

启动 MySQL 后，执行项目内置的 SQL 脚本（包含表结构和初始数据）：

```bash
mysql -u root -p
```

在 MySQL 中执行：

```sql
CREATE DATABASE IF NOT EXISTS lesson_platform DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE lesson_platform;
SOURCE D:/AI/03-Backend/backend/sql/currentsql.sql;
-- 验证
SHOW TABLES;
SELECT * FROM sys_user;
```

### 2. 启动 Redis

项目内置 Redis（Windows 版），位于 `05-Infrastructure/AI-Tools/redis`。

方式一：作为 Windows 服务启动（推荐）

```powershell
cd D:\AI\05-Infrastructure\AI-Tools\redis
.\redis-server.exe --service-install redis.windows.conf --service-name RedisService
Start-Service RedisService
```

方式二：前台直接运行

```powershell
cd D:\AI\05-Infrastructure\AI-Tools\redis
.\redis-server.exe redis.windows.conf
```

验证：`.\redis-cli.exe ping`，返回 `PONG` 即正常。

### 3. 启动 AI 服务（端口 8001）

```powershell
cd D:\AI\04-AI-Service\ai-service

# 安装依赖
pip install -r requirements.txt

# 配置 API 密钥（首次启动需要）
copy .env.example .env
# 编辑 .env，填入 DASHSCOPE_API_KEY
```

启动服务：

```powershell
python main.py
```

访问 http://localhost:8001/health 验证服务运行。

说明：[config.py](file:///d:/AI/04-AI-Service/ai-service/config.py) 已自动清除 `HTTP_PROXY` / `HTTPS_PROXY` 环境变量，并将 `dashscope.aliyuncs.com` 加入 `NO_PROXY`，确保直连通义千问服务，无需手动处理代理问题。

### 4. 启动后端（端口 8080）

```powershell
cd D:\AI\03-Backend\backend

# 构建项目（首次或代码变更后执行）
mvn clean install

# 启动
mvn spring-boot:run
```

访问 http://localhost:8080/api 验证后端运行。

数据库连接配置见 [application.yml](file:///d:/AI/03-Backend/backend/src/main/resources/application.yml)，默认：
- 数据库：`localhost:3306/lesson_platform`
- Redis：`localhost:6379`
- AI 服务：`http://localhost:8001`

### 5. 启动前端（端口 3000）

```powershell
cd D:\AI\02-Frontend\web-frontend

# 安装依赖（首次启动需要）
npm install

# 启动开发服务
npm run dev
```

访问 http://localhost:3000

说明：Vite 默认配置端口为 3000（见 [vite.config.ts](file:///d:/AI/02-Frontend/web-frontend/vite.config.ts)）。若 3000 被占用，Vite 会自动切换到下一个可用端口（如 3001），请以终端实际输出为准。前端已配置代理，`/api` 请求会转发到 `http://localhost:8080`。

## 测试账号

- 用户名：`teacher1`
- 密码：`123456`

## 启动顺序建议

由于存在依赖关系，建议按以下顺序启动：

1. MySQL（数据库）
2. Redis（缓存）
3. AI 服务（后端会调用）
4. 后端 Spring Boot
5. 前端 Vite

## 常见问题

**Q: AI 服务启动失败？**
A: 检查 `.env` 文件中是否配置了 `DASHSCOPE_API_KEY`。代理问题已由 config.py 自动处理，无需手动清除。

**Q: 后端连接数据库失败？**
A: 检查 [application.yml](file:///d:/AI/03-Backend/backend/src/main/resources/application.yml) 中的 `spring.datasource.password` 是否与本地 MySQL 一致。

**Q: 后端启动报 Redis 连接错误？**
A: 确认 Redis 已在 6379 端口运行，可用 `redis-cli ping` 验证。

**Q: 前端页面打不开或端口不是 3000？**
A: 查看终端输出，Vite 会在 3000 被占用时自动切换端口（如 3001）。

**Q: 生成课程内容或错题分析失败？**
A: 确保 AI 服务已启动并运行在 8001 端口，可通过 http://localhost:8001/health 检查。

**Q: 是否需要启动 Nacos？**
A: 不需要。Nacos 的服务发现和配置中心功能已在 [bootstrap.yml](file:///d:/AI/03-Backend/backend/src/main/resources/bootstrap.yml) 中禁用。
