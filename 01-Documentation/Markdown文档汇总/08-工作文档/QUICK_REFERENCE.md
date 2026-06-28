# 🚀 学生功能 - 快速参考卡

## ✅ 实施状态: 已完成核心功能

**完成时间**: 2026-03-30  
**状态**: Phase 1-4 完成 (10/16 任务), 等待UI测试

---

## 📍 访问地址

| 服务 | 地址 | 状态 |
|------|------|------|
| **前端UI** | http://localhost:3001 | ✅ 运行中 |
| **后端API** | http://localhost:8080/api | ✅ 运行中 (PID 10580) |
| **数据库** | localhost:3306/lesson_platform | ✅ MySQL80 运行中 |

---

## 🔑 测试账号

```
用户名: teacher1
密码: 123456
用户ID: 1
角色: 教师 (role=2)
```

> ⚠️ 如果登录失败，查看 `D:\AI\work\testing-guide.md` 的"密码重置"部分

---

## 🎯 API端点速查

### 学生管理API (需要JWT Token)

| 方法 | 路径 | 功能 | 参数 |
|------|------|------|------|
| `GET` | `/api/students` | 分页查询学生列表 | page, pageSize, keyword, status |
| `GET` | `/api/students/{id}` | 获取学生详情 | id (路径参数) |
| `POST` | `/api/students` | 创建学生 | StudentFormDTO (JSON) |
| `PUT` | `/api/students/{id}` | 更新学生 | id + StudentFormDTO |
| `DELETE` | `/api/students/{id}` | 删除学生(软删除) | id |
| `GET` | `/api/students/all` | 获取所有活跃学生 | 无 |

### 认证API (公开访问)

| 方法 | 路径 | 功能 |
|------|------|------|
| `POST` | `/api/auth/login` | 登录 |
| `POST` | `/api/auth/register` | 注册 |
| `POST` | `/api/auth/send-code` | 发送验证码 |
| `GET` | `/api/auth/currentUser` | 获取当前用户 |

---

## 📝 请求/响应格式

### 创建学生请求 (POST /api/students)

```json
{
  "name": "张三",              // 必填
  "grade": "高一",             // 必填
  "currentSubject": "数学",    // 必填
  "gender": "男",              // 可选
  "age": 16,                   // 可选
  "school": "市第一中学",      // 可选
  "parentName": "张父",        // 可选
  "parentContact": "13800138000",  // 可选(需符合手机号格式)
  "weakSubjects": "几何",      // 可选
  "learningBasics": "基础较好",// 可选
  "studyHabits": "认真",       // 可选
  "personality": "外向",       // 可选
  "tags": "重点培养",          // 可选
  "remark": "备注信息"         // 可选
}
```

### 统一响应格式

**成功响应**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": { ...实际数据... }
}
```

**分页响应**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "total": 100,
    "items": [...],
    "page": 1,
    "pageSize": 10,
    "totalPages": 10
  }
}
```

**错误响应**:
```json
{
  "code": 500,
  "message": "错误信息",
  "data": null
}
```

---

## 🗂️ 数据库表结构速查

### student 表核心字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | BIGINT | 自动 | 主键 |
| tutor_id | BIGINT | ✅ | 所属教师ID (自动设置) |
| name | VARCHAR(50) | ✅ | 学生姓名 |
| grade | VARCHAR(20) | ✅ | 年级 |
| current_subject | VARCHAR(100) | - | 当前科目 |
| gender | VARCHAR(10) | - | 性别 |
| age | INT | - | 年龄 |
| school | VARCHAR(100) | - | 学校 |
| parent_contact | VARCHAR(50) | - | 家长联系方式 |
| status | VARCHAR(20) | - | active/paused/finished |
| created_at | DATETIME | 自动 | 创建时间 |
| updated_at | DATETIME | 自动 | 更新时间 |
| deleted | INT | 自动 | 软删除标记(0/1) |

---

## 🔧 故障排查命令

### 检查服务状态
```powershell
# 检查后端端口
Test-NetConnection localhost -Port 8080

# 检查前端端口
Test-NetConnection localhost -Port 3001

# 检查MySQL服务
Get-Service MySQL80

# 查看后端进程
Get-Process -Id 10580
```

### 重启服务
```bash
# 重启后端 (先停止PID 10580)
Stop-Process -Id 10580
cd D:\AI\backend && mvn spring-boot:run

# 重启前端
cd D:\AI\web-frontend && npm run dev

# 重启MySQL
Restart-Service MySQL80
```

### 查看数据库数据
```powershell
& "C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe" -u root -p721208 lesson_platform -e "SELECT * FROM student WHERE deleted=0;"
```

---

## ⚡ 快速测试 (PowerShell)

```powershell
# 1. 登录获取Token
$login = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" `
    -Method POST -ContentType "application/json" `
    -Body '{"username":"teacher1","password":"123456"}'
$token = $login.data.token

# 2. 查询学生列表
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:8080/api/students" -Headers $headers

# 3. 创建学生
$student = @{
    name = "测试学生"
    grade = "高一"
    currentSubject = "数学"
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8080/api/students" `
    -Method POST -Headers $headers -ContentType "application/json" -Body $student
```

---

## 📚 文档链接

| 文档 | 路径 | 说明 |
|------|------|------|
| **实施总结** | `D:\AI\work\implementation-summary.md` | 完整实施报告 |
| **测试指南** | `D:\AI\work\testing-guide.md` | 详细测试步骤 |
| **实施计划** | `~\.copilot\...\plan.md` | 原始计划 |
| **设计文档** | 用户提供的需求文档 | API设计 |

---

## ✅ 验收清单

### 核心功能 (必须)
- [x] 数据库表结构正确
- [x] 后端API实现完整
- [x] 前端类型定义更新
- [x] 字段验证规则添加
- [x] JWT认证机制正常
- [ ] UI端到端测试通过

### 安全功能 (必须)
- [x] tutorId自动设置
- [x] 查询自动过滤tutorId
- [x] 软删除实现
- [x] 密码BCrypt加密

### 可选功能
- [ ] 性能优化 (<200ms)
- [ ] API文档生成
- [ ] 代码格式化
- [ ] 单元测试

---

## 🎉 成功标准

**当前进度**: 62.5% (10/16 任务完成)

**下一步**: 在浏览器中测试完整用户流程

**验收通过标准**:
1. ✅ 可以登录系统
2. ⏳ 可以添加学生
3. ⏳ 可以编辑学生
4. ⏳ 可以查看学生列表
5. ⏳ 可以删除学生
6. ⏳ 表单验证正常工作

---

**创建时间**: 2026-03-30 21:33  
**版本**: 1.0  
**状态**: ✅ Ready for UI Testing
