# 数据库配置指南

**环境**: MySQL 8.0+ + Redis 7.x | **更新**: 2026-03-25

📌 **文档概述**
包含 MySQL 和 Redis 的完整配置指南，涵盖安装启动、Schema 导入、配置参数和常见问题排查。是后端本地开发和部署的必读文档。

⏱️ **阅读时间**: 10-15 分钟

🎯 **适用场景**: 本地环境搭建、数据库初始化、连接问题排查

---

## MySQL 数据库

### 初始化步骤

#### 1. 启动 MySQL
```bash
# Windows
net start MySQL80

# macOS (Homebrew)
brew services start mysql

# Linux
sudo systemctl start mysql
```

#### 2. 导入 Schema

在 MySQL 中执行：

```bash
mysql -u root -p < D:/AI/backend/sql/schema.sql
mysql -u root -p < D:/AI/backend/sql/schema2.sql
```

或手动执行：

```sql
-- 1. 创建数据库和基础表
source D:/AI/backend/sql/schema.sql

-- 2. 创建课程相关表
source D:/AI/backend/sql/schema2.sql

-- 3. 插入测试数据
source D:/AI/backend/sql/data.sql
```

#### 3. 验证数据库

```bash
mysql -u root -p
USE lesson_platform;
SHOW TABLES;
SELECT * FROM sys_user;
SELECT * FROM student;
```

### 测试账号

- **用户名**: teacher1
- **密码**: 123456

### 关键表说明

| 表名 | 说明 | 行数 |
|------|------|------|
| `sys_user` | 用户表 | 初始化后查询 |
| `student` | 学生表 | 初始化后查询 |
| `lesson` | 备课表 | 初始化后查询 |
| `progress` | 进度表 | 初始化后查询 |
| `resource` | 资源表 | 初始化后查询 |
| `knowledge_point` | 知识点表 | 初始化后查询 |

### 配置文件

#### application.yml
```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/lesson_platform?serverTimezone=UTC&useSSL=false&allowPublicKeyRetrieval=true
    username: root
    password: root123  # 改为你的密码
    driver-class-name: com.mysql.cj.jdbc.Driver
  
  jpa:
    hibernate:
      ddl-auto: validate  # 仅验证，不修改表
    show-sql: false
    properties:
      hibernate:
        format_sql: true

  # 数据库连接池
  hikari:
    maximum-pool-size: 20
    minimum-idle: 5
    connection-timeout: 30000
```

#### 连接配置说明

- **端口**: 3306（默认）
- **用户名**: root
- **密码**: root123（与 application.yml 一致）
- **数据库**: lesson_platform
- **编码**: utf8mb4（支持中文）

---

## Redis 缓存

### 启动 Redis

```bash
# Windows (使用 WSL2 或 Docker)
redis-server

# macOS
brew services start redis

# Linux
sudo systemctl start redis-server
```

### 验证连接
```bash
redis-cli ping
# 返回: PONG
```

### 配置文件

#### application.yml
```yaml
spring:
  redis:
    host: localhost
    port: 6379
    database: 0
    timeout: 2000
    password:  # 如果设置了密码，填在这里
    jedis:
      pool:
        max-active: 8
        max-idle: 8
        min-idle: 0
        max-wait: -1
```

### 常用命令
```bash
redis-cli

# 查看所有 key
KEYS *

# 查看 key 数量
DBSIZE

# 清空数据库
FLUSHDB

# 查看 key 类型
TYPE key_name

# 查看内存使用
INFO memory
```

---

## 连接测试

### 测试 MySQL 连接
```bash
# 使用 MySQL CLI
mysql -h localhost -u root -p -e "SELECT VERSION();"

# 或启动后端应用，检查日志
mvn spring-boot:run
# 应该看到: Hibernate: select ... from sys_user
```

### 测试 Redis 连接
```bash
# 使用 redis-cli
redis-cli ping

# 或在 Java 中测试
StringRedisTemplate redisTemplate;
redisTemplate.opsForValue().set("test_key", "test_value");
String value = redisTemplate.opsForValue().get("test_key");
```

---

## 常见问题与排查

### MySQL 相关

**Q: MySQL 连接被拒绝 (Connection refused)**
```
A: 检查以下几点：
1. MySQL 服务是否已启动：
   - Windows: net start MySQL80
   - macOS: brew services start mysql
2. 检查端口 3306 是否被占用：
   - Windows: netstat -ano | findstr :3306
   - Linux: netstat -lntp | grep 3306
3. 检查用户名和密码是否正确
```

**Q: "Access denied for user 'root'@'localhost'"**
```
A: 重置 MySQL root 密码或使用正确的密码：
1. Windows: mysql -u root -p (输入你设置的密码)
2. 如忘记密码，参考 MySQL 官方文档重置
```

**Q: "Unknown database 'lesson_platform'"**
```
A: 需要先导入 Schema：
mysql -u root -p < D:/AI/backend/sql/schema.sql
```

### Redis 相关

**Q: Redis 连接超时 (Connection timeout)**
```
A: 检查 Redis 服务是否运行：
1. redis-cli ping (返回 PONG 则正常)
2. 检查端口 6379 未被占用：
   - netstat -ano | findstr :6379
3. 确保 spring.redis.host 和 port 配置正确
```

**Q: "WRONGPASS invalid username-password pair"**
```
A: Redis 密码错误或 Redis 没有设置密码：
1. 检查 application.yml 中 spring.redis.password
2. 如果 Redis 不需要密码，留空即可
```

---

## 性能优化

### MySQL 优化

```sql
-- 1. 创建索引加快查询
CREATE INDEX idx_user_id ON lesson_plans(user_id);
CREATE INDEX idx_created_at ON lesson_plans(created_at);

-- 2. 启用慢查询日志
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;

-- 3. 查看表统计信息
ANALYZE TABLE lesson_plans;
```

### Redis 优化

```bash
# 1. 配置持久化（RDB 或 AOF）
# 在 redis.conf 中：
save 900 1       # 900秒内至少有1个key变化
appendonly yes   # 启用 AOF

# 2. 设置内存上限
maxmemory 2gb
maxmemory-policy allkeys-lru  # LRU 淘汰

# 3. 监控性能
redis-cli
> INFO stats
> INFO memory
```

---

## 相关文档

- **[backend/QUICK-START.md](../backend/QUICK-START.md)** - 后端快速启动指南
- **[design/02-DATABASE-DESIGN.md](../design/02-DATABASE-DESIGN.md)** - 数据库设计详情
- **[00-PROJECT-STATUS.md](../00-PROJECT-STATUS.md)** - 项目状态和进度

---

**版本**: v1.0.1 | **更新**: 2026-03-25 | **状态**: 已完成

📚 **返回导航**: [infrastructure/](./infrastructure/) | [docs/INDEX.md](../INDEX.md)
