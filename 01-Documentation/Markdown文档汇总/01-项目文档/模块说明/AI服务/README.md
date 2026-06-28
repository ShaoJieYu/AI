# AI Lesson Generation Service

AI服务用于生成个性化的备课内容。

## 快速开始

### 1. 安装依赖

```bash
cd ai-service
pip install -r requirements.txt
```

### 2. 配置API密钥

复制 `.env.example` 为 `.env` 并填入你的通义千问API密钥：

```bash
cp .env.example .env
```

编辑 `.env` 文件：
```
DASHSCOPE_API_KEY=your_actual_api_key_here
```

获取API密钥：访问 https://dashscope.console.aliyun.com/

### 3. 启动服务

```bash
python main.py
```

服务将在 http://localhost:8001 启动

### 4. 测试

健康检查：
```bash
curl http://localhost:8001/health
```

生成测试：
```bash
curl -X POST http://localhost:8001/api/generate-lesson \
  -H "Content-Type: application/json" \
  -d '{"subject":"数学","teaching_goal":"学习二次函数","difficulty":"中等"}'
```

## API文档

访问 http://localhost:8001/docs 查看完整API文档
