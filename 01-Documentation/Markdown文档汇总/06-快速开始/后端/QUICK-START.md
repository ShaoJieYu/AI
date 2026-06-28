# 后端快速启动指南

**模块**: Spring Boot 后端应用 | **框架**: Java 21 + Spring Boot 3.2.5 | **更新**: 2026-03-25

> ⚡ 3步启动，5分钟开始开发

---

## 前置要求

### 系统要求
- **Java**: 21 (JDK 21 LTS)
- **Maven**: 3.8.1+ (推荐 3.9.x)
- **MySQL**: 8.0+ (且已启动)
- **Redis**: 7.0+ (推荐，缓存和会话用)
- **操作系统**: Windows / macOS / Linux

### 验证环境
```bash
java --version       # 应该显示 Java 21
mvn --version        # 应该显示 3.8+
mysql --version      # MySQL 8.0+
redis-cli --version  # Redis 7.0+
```

### 数据库初始化
```bash
# 启动 MySQL
mysql -u root -p

# 在 MySQL 中执行
source D:/AI/backend/sql/schema.sql
source D:/AI/backend/sql/schema2.sql
source D:/AI/backend/sql/data.sql

# 验证
USE lesson_platform;
SHOW TABLES;
```

---

## 🚀 3步快速启动

### Step 1: 进入后端目录 (30秒)
```bash
cd backend
```

### Step 2: 构建项目 (3-5分钟)
```bash
mvn clean install
```

**预期输出**:
```
[INFO] Building lesson-platform-backend 1.0.0
...
[INFO] BUILD SUCCESS
```

### Step 3: 启动应用 (30秒)
```bash
mvn spring-boot:run
```

**预期输出**:
```
o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat started on port(s): 8080
o.lessonplatform.LessonPlatformApplication : Started LessonPlatformApplication
```

✅ **完成！** 访问 http://localhost:8080/api 验证

---

## 常见问题

### Q1: 编译错误 "Java 21 not found"
**原因**: JDK 版本不符或 JAVA_HOME 配置错误

**解决**:
```bash
# 检查 JAVA_HOME
echo $JAVA_HOME

# Windows 设置 JAVA_HOME
set JAVA_HOME=C:\Program Files\Java\jdk-21

# macOS/Linux 设置 JAVA_HOME
export JAVA_HOME=$(/usr/libexec/java_home -v 21)

# 验证
java --version
```

### Q2: Maven 下载依赖太慢
**原因**: 默认仓库速度慢

**解决**: 编辑 `~/.m2/settings.xml`:
```xml
<mirror>
  <id>aliyun</id>
  <mirrorOf>central</mirrorOf>
  <name>Aliyun Maven Mirror</name>
  <url>https://maven.aliyun.com/repository/central</url>
</mirror>
```

### Q3: "数据库连接失败"
**原因**: MySQL 未启动或密码错误

**解决**:
```bash
# 检查 MySQL 是否运行
mysql -u root -p -h 127.0.0.1

# 编辑 application.yml 中的数据库配置
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/lesson_platform
    username: root
    password: your_password
```

### Q4: "端口 8080 已被占用"
**原因**: 其他应用占用了端口

**解决**:
```bash
# 查看进程
netstat -an | grep 8080

# 修改端口，编辑 application.yml
server:
  port: 8081
```

### Q5: "Redis 连接失败"
**原因**: Redis 未启动或配置错误

**解决**:
```bash
# 启动 Redis
redis-server

# 验证连接
redis-cli ping  # 应该返回 PONG
```

### Q6: "Nacos 连接失败"
**原因**: Nacos 服务未启动 (可选的)

**解决**: 当前仅使用 Nacos 的基础功能，可以暂时禁用
编辑 `application.yml`:
```yaml
spring:
  cloud:
    nacos:
      discovery:
        enabled: false
```

---

## 常用命令

| 命令 | 作用 |
|------|------|
| `mvn clean` | 清理编译产物 |
| `mvn compile` | 编译源代码 |
| `mvn test` | 运行单元测试 |
| `mvn install` | 构建和安装到本地仓库 |
| `mvn spring-boot:run` | 运行应用 |
| `mvn package` | 打包成 JAR 文件 |
| `mvn clean install -DskipTests` | 跳过测试编译 |

---

## 项目结构

```
backend/
├── src/
│   ├── main/
│   │   ├── java/com/lessonplatform/
│   │   │   ├── config/           # Spring 配置
│   │   │   ├── controller/       # REST API 接口
│   │   │   ├── service/          # 业务逻辑
│   │   │   ├── mapper/           # 数据访问层 (MyBatis)
│   │   │   ├── entity/           # JPA 实体类
│   │   │   ├── dto/              # 数据传输对象
│   │   │   ├── exception/        # 自定义异常
│   │   │   ├── security/         # 安全相关
│   │   │   └── LessonPlatformApplication.java  # 启动类
│   │   └── resources/
│   │       ├── application.yml   # 应用配置
│   │       ├── application-dev.yml
│   │       ├── application-prod.yml
│   │       └── db/
│   │           └── migration/    # 数据库迁移脚本
│   └── test/
│       └── java/                 # 测试代码
│
├── sql/
│   ├── schema.sql               # 主表设计
│   ├── schema2.sql              # 补充表设计
│   └── data.sql                 # 初始数据
│
├── pom.xml                       # Maven 依赖配置
└── target/                       # 编译输出目录
```

---

## 核心配置文件

### application.yml
```yaml
spring:
  application:
    name: lesson-platform
  
  # 数据库配置
  datasource:
    url: jdbc:mysql://localhost:3306/lesson_platform
    username: root
    password: root
    driver-class-name: com.mysql.cj.jdbc.Driver
  
  # JPA 配置
  jpa:
    hibernate:
      ddl-auto: validate  # 仅验证，不修改表
    show-sql: false
  
  # Redis 配置
  redis:
    host: localhost
    port: 6379
    database: 0
    timeout: 2000
    jedis:
      pool:
        max-active: 8
        max-idle: 8
        min-idle: 0

# 服务器配置
server:
  port: 8080
  servlet:
    context-path: /api
```

---

## 技术栈速查

| 技术 | 用途 | 版本 |
|------|------|------|
| **Spring Boot** | Web 框架 | 3.2.5 |
| **Spring Security** | 认证授权 | 6.x |
| **Spring Data JPA** | ORM 框架 | 3.2.5 |
| **MyBatis-Plus** | 数据访问增强 | 3.5.6 |
| **MySQL** | 关系数据库 | 8.0+ |
| **Redis** | 缓存和会话 | 7.x |
| **JWT** | Token 认证 | 0.12.6 |
| **Nacos** | 服务注册/配置 | 2023.0.1.0 |
| **Sentinel** | 限流降级 | 2023.0.1.0 |

---

## 开发建议

### API 开发流程
1. 定义 `Entity` (数据库实体)
2. 创建 `Mapper` 或 `Repository`
3. 编写 `Service` (业务逻辑)
4. 实现 `Controller` (REST API)
5. 添加 `@Validated` 参数校验
6. 编写单元测试

### 代码规范
- 使用 Lombok 简化代码: `@Data`, `@Slf4j`
- 异常使用自定义异常类
- 统一返回格式: `Result<T>`
- 使用 `@Transactional` 管理事务

### 性能优化
- 数据库添加适当索引
- Redis 缓存热数据
- 使用分页查询
- 避免 N+1 查询问题

---

## 与前端集成

### CORS 配置
编辑 `config/WebConfig.java`:
```java
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("http://localhost:5173", "http://localhost:3000")
            .allowedMethods("GET", "POST", "PUT", "DELETE")
            .allowedHeaders("*")
            .allowCredentials(true);
    }
}
```

### 返回格式统一
```java
@Data
public class Result<T> {
    private int code;
    private String message;
    private T data;
    
    public static <T> Result<T> success(T data) {
        Result<T> result = new Result<>();
        result.setCode(200);
        result.setMessage("Success");
        result.setData(data);
        return result;
    }
}
```

---

## 数据库初始化

### 检查已初始化的表
```bash
mysql -u root -p
USE lesson_platform;
SHOW TABLES;
```

### 常用表查询
```sql
-- 查看用户
SELECT * FROM sys_user LIMIT 5;

-- 查看权限
SELECT * FROM sys_role LIMIT 5;

-- 查看菜单
SELECT * FROM sys_menu LIMIT 5;
```

---

## 部署

### 生产构建
```bash
mvn clean package -DskipTests
```

输出文件: `target/lesson-platform-backend-1.0.0.jar`

### 运行 JAR
```bash
java -jar target/lesson-platform-backend-1.0.0.jar
```

### 后台运行 (Linux/macOS)
```bash
nohup java -jar target/lesson-platform-backend-1.0.0.jar > app.log 2>&1 &
```

### Docker 部署
```dockerfile
FROM openjdk:21-slim
COPY target/lesson-platform-backend-1.0.0.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
```

---

## 下一步

- 详细架构: [backend/ARCHITECTURE.md](../backend/ARCHITECTURE.md)
- 数据库设计: [backend/DATABASE-SCHEMA.md](../backend/DATABASE-SCHEMA.md)
- API 规范: [backend/API-DESIGN.md](../backend/API-DESIGN.md)
- 项目状态: [00-PROJECT-STATUS.md](../00-PROJECT-STATUS.md)

---

## 获得帮助

- **文档导航**: [docs/README.md](./README.md)
- **项目状态**: [00-PROJECT-STATUS.md](./00-PROJECT-STATUS.md)
- **常见问题**: 本文档的"常见问题"部分
