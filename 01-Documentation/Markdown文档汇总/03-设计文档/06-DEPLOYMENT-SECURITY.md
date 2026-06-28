# 安全设计与部署架构

📌 **文档概述**：本文档完整描述了全自动家教备课平台的安全防护策略和生产环境部署架构。包括 JWT 认证、权限控制、数据加密、容器化部署、Kubernetes 编排等核心内容，确保系统的安全性、可靠性和可扩展性。

⏱️ **阅读时间**：20-25 分钟  
🎯 **适用场景**：安全评审、部署上线、DevOps 实施、系统运维

## 目录

- [安全设计](#安全设计)
  - [认证与授权](#认证与授权)
  - [数据安全](#数据安全)
- [部署架构设计](#部署架构设计)
  - [Docker 容器化](#docker-容器化)
  - [生产环境 Kubernetes 部署](#生产环境-kubernetes-部署)

---

## 安全设计

### 认证与授权

#### JWT Token 机制

```java
// JWT Token 生成配置
@Configuration
public class JwtConfig {
    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.access-token-ttl:7200}")  // 2小时
    private long accessTokenTtl;

    @Value("${jwt.refresh-token-ttl:604800}")  // 7天
    private long refreshTokenTtl;

    @Bean
    public JwtTokenProvider jwtTokenProvider() {
        return new JwtTokenProvider(secret, accessTokenTtl, refreshTokenTtl);
    }
}

// Token 生成
public String createAccessToken(Long userId, String role) {
    Date now = new Date();
    Date expiryDate = new Date(now.getTime() + accessTokenTtl * 1000);

    return Jwts.builder()
        .setSubject(String.valueOf(userId))
        .claim("role", role)
        .claim("type", "access")
        .setIssuedAt(now)
        .setExpiration(expiryDate)
        .signWith(key, SignatureAlgorithm.HS256)
        .compact();
}
```

#### 权限控制

```java
// 基于角色的访问控制
@PreAuthorize("hasRole('TEACHER')")
@PostMapping("/lessons")
public ResponseEntity<LessonPlan> createLesson(@RequestBody LessonPlan lesson) {
    // 创建备课
}

// 数据权限（只能访问自己的学生）
@PreAuthorize("@securityService.isOwnerStudent(#studentId, authentication)")
@GetMapping("/students/{studentId}")
public ResponseEntity<Student> getStudent(@PathVariable Long studentId) {
    // 获取学生信息
}

// SecurityService 实现
@Service
public class SecurityService {
    public boolean isOwnerStudent(Long studentId, Authentication auth) {
        Long userId = getCurrentUserId(auth);
        return studentRepository.existsByIdAndUserId(studentId, userId);
    }
}
```

### 数据安全

#### 敏感数据加密

```java
// 密码加密存储
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);  // 强度12
}

// 敏感信息 AES 加密
@Component
public class EncryptionService {
    @Value("${encryption.secret-key}")
    private String secretKey;

    public String encrypt(String data) {
        // AES-256-GCM 加密
    }

    public String decrypt(String encryptedData) {
        // AES-256-GCM 解密
    }
}

// 手机号等敏感字段加密存储
@Column(name = "phone", nullable = false)
@Convert(converter = AesEncryptConverter.class)
private String phone;
```

---

## 部署架构设计

### Docker 容器化

#### 后端 Dockerfile

```dockerfile
# 后端服务 Dockerfile
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /app
COPY . .
RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

# JVM 优化配置
ENV JAVA_OPTS="-XX:+UseContainerSupport \
                -XX:MaxRAMPercentage=75.0 \
                -XX:+UseG1GC \
                -XX:+HeapDumpOnOutOfMemoryError"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

#### Docker Compose 配置

```yaml
version: '3.8'

services:
  # Nginx / API Gateway
  gateway:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
    networks:
      - app-network

  # MySQL 数据库
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: lesson_platform
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "3306:3306"
    command: --default-authentication-plugin=mysql_native_password
    networks:
      - app-network

  # Redis 缓存
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - app-network

  # 后端服务
  backend:
    build: ./backend
    environment:
      SPRING_PROFILES_ACTIVE: ${ENVIRONMENT}
      DATABASE_URL: jdbc:mysql://mysql:3306/lesson_platform
      REDIS_URL: redis://redis:6379
      NACOS_ADDR: nacos
      NACOS_PORT: 8848
    depends_on:
      - mysql
      - redis
    networks:
      - app-network

  # AI 服务
  ai-service:
    build: ./ai-service
    environment:
      LLM_API_KEY: ${LLM_API_KEY}
      MILVUS_HOST: milvus
      MILVUS_PORT: 19530
    ports:
      - "8000:8000"
    networks:
      - app-network

  # Nacos 配置中心
  nacos:
    image: nacos/nacos-server:v2.2.3
    environment:
      MODE: standalone
    ports:
      - "8848:8848"
    networks:
      - app-network

  # Sentinel 限流
  sentinel:
    image: bladex/sentinel-dashboard:1.8.6
    ports:
      - "8858:8858"
    networks:
      - app-network

volumes:
  mysql_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

### 生产环境 Kubernetes 部署

```yaml
# Kubernetes 部署配置 (简化示例)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-service
  labels:
    app: backend-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend-service
  template:
    metadata:
      labels:
        app: backend-service
    spec:
      containers:
      - name: backend
        image: ${DOCKER_REGISTRY}/backend:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        env:
        - name: SPRING_PROFILES_ACTIVE
          value: "prod"
        - name: JAVA_OPTS
          value: "-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"
        readinessProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 15
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  selector:
    app: backend-service
  ports:
  - port: 8080
    targetPort: 8080
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: backend-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
spec:
  tls:
  - hosts:
    - api.lesson-platform.com
    secretName: tls-secret
  rules:
  - host: api.lesson-platform.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 8080
```

---

🔗 **相关文档链接**：
- [系统架构设计](../design/01-ARCHITECTURE-DESIGN.md) - 整体安全架构
- [AI 引擎设计](./05-AI-ENGINE-DESIGN.md) - AI 服务的安全部署
- [API 接口设计](./03-API-DESIGN.md) - API 层面的安全设计

📚 **返回导航**：[返回设计文档首页](./README.md)
