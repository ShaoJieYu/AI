# 部署和运维指南

**环境**: Docker + Linux/macOS | **更新**: 2026-03-25

---

## Docker 部署

### 前置要求
- Docker 24.x+ 已安装
- Docker Compose 2.x+ (可选，用于多容器编排)

### 后端部署

#### 构建 Docker 镜像
```bash
cd backend

# 1. 构建 JAR 文件
mvn clean package -DskipTests

# 2. 创建 Dockerfile
# 参考下方 Dockerfile 内容

# 3. 构建镜像
docker build -t lesson-platform-backend:1.0 .
```

#### Dockerfile 示例
```dockerfile
FROM openjdk:21-slim

WORKDIR /app

# 复制构建产物
COPY target/lesson-platform-backend-1.0.0.jar app.jar

# 环境变量
ENV SPRING_PROFILES_ACTIVE=prod
ENV SERVER_PORT=8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
```

#### 运行容器
```bash
docker run -d \
  --name lesson-backend \
  -p 8080:8080 \
  -e SPRING_DATASOURCE_URL=jdbc:mysql://host.docker.internal:3306/lesson_platform \
  -e SPRING_DATASOURCE_USERNAME=root \
  -e SPRING_DATASOURCE_PASSWORD=root \
  -e SPRING_REDIS_HOST=host.docker.internal \
  lesson-platform-backend:1.0
```

### 前端部署

#### 构建和部署
```bash
cd web-frontend

# 构建生产版本
npm run build

# 输出在 dist/ 目录

# 使用 Nginx 服务
docker run -d \
  --name lesson-frontend \
  -p 80:80 \
  -v $(pwd)/dist:/usr/share/nginx/html \
  -v $(pwd)/nginx.conf:/etc/nginx/nginx.conf \
  nginx:latest
```

#### Nginx 配置 (nginx.conf)
```nginx
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;
  
  location / {
    try_files $uri $uri/ /index.html;
  }
  
  location /api {
    proxy_pass http://backend:8080/api;
  }
}
```

### AI 服务部署

#### Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1
ENV SERVICE_PORT=8001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

EXPOSE 8001

CMD ["python", "main.py"]
```

#### 运行容器
```bash
docker run -d \
  --name lesson-ai-service \
  -p 8001:8001 \
  -e DASHSCOPE_API_KEY=sk-xxxxx \
  lesson-platform-ai:1.0
```

---

## Docker Compose 编排

创建 `docker-compose.yml`:
```yaml
version: '3.8'

services:
  # MySQL 数据库
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: lesson_platform
    ports:
      - "3306:3306"
    volumes:
      - ./backend/sql:/docker-entrypoint-initdb.d
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis 缓存
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # 后端应用
  backend:
    build: ./backend
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/lesson_platform
      SPRING_DATASOURCE_USERNAME: root
      SPRING_DATASOURCE_PASSWORD: root
      SPRING_REDIS_HOST: redis
    ports:
      - "8080:8080"
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy

  # AI 服务
  ai-service:
    build: ./ai-service
    environment:
      DASHSCOPE_API_KEY: ${DASHSCOPE_API_KEY}
    ports:
      - "8001:8001"

  # 前端应用
  frontend:
    build: ./web-frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mysql_data:
```

### 启动所有服务
```bash
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

---

## Kubernetes 部署 (可选，规划中)

### 部署步骤
1. 编写 Deployment 和 Service
2. 配置 ConfigMap 和 Secret
3. 设置资源限制和自动扩缩容
4. 配置 Ingress 路由

### 示例 Deployment (backend)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lesson-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: lesson-backend
  template:
    metadata:
      labels:
        app: lesson-backend
    spec:
      containers:
      - name: backend
        image: lesson-platform-backend:1.0
        ports:
        - containerPort: 8080
        env:
        - name: SPRING_DATASOURCE_URL
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: db-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
```

---

## 监控和日志 (规划中)

### ELK Stack (规划)
- Elasticsearch: 日志存储
- Logstash: 日志采集
- Kibana: 可视化

### SkyWalking (规划)
- 分布式链路追踪
- 性能分析
- 告警管理

### Prometheus + Grafana (规划)
- 指标采集
- 仪表板
- 告警规则

---

## 常见问题

**Q: Docker 中应用无法连接宿主机的 MySQL**
A: 使用 `host.docker.internal` 代替 `localhost`

**Q: 镜像体积太大**
A: 使用多阶段构建，仅保留必要的运行时依赖

**Q: 应用启动缓慢**
A: 增加 health check 的 start-period，或优化应用启动时间

---

## 相关文档
- [infrastructure/DATABASE.md](./DATABASE.md) - 数据库配置
- [00-PROJECT-STATUS.md](../00-PROJECT-STATUS.md) - 项目状态
- [02-ROADMAP.md](../02-ROADMAP.md) - 未来规划
