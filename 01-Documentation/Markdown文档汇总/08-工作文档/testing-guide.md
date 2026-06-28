# 学生功能测试指南

## 🚀 快速启动

### 1. 确保服务运行
```bash
# 检查MySQL服务
服务名: MySQL80 (应为 Running 状态)

# 检查后端服务
端口: 8080 (Java进程 PID: 10580)
测试: http://localhost:8080/api/auth/send-code

# 检查前端服务
端口: 3001
访问: http://localhost:3001
```

## 🧪 测试步骤

### 步骤1: 访问前端
打开浏览器访问: **http://localhost:3001**

### 步骤2: 登录系统
```
用户名: teacher1
密码: 123456
```

> **注意**: 如果密码验证失败，可能需要重置密码。请参考"密码重置"部分。

### 步骤3: 测试学生管理

#### 3.1 查看学生列表
- 导航到: `/students`
- 应该看到现有的3个学生：李明、王芳、余少杰
- 测试功能：
  - ✅ 分页（默认10条/页）
  - ✅ 搜索（输入姓名、学校、家长姓名）
  - ✅ 状态筛选（active/paused/finished）

#### 3.2 查看学生详情
- 点击任意学生的"查看"按钮
- 应该跳转到 `/students/:id`
- 验证显示：
  - ✅ 基本信息（姓名、年级、学校等）
  - ✅ 学生画像（学习基础、薄弱科目等）
  - ✅ 教学目标
  - ✅ 课程历史

#### 3.3 添加新学生
- 点击"添加学生"按钮
- 填写表单：
  ```
  必填字段:
  - 学生姓名: 测试学生
  - 年级: 高一
  - 当前科目: 数学
  
  可选字段:
  - 性别: 男/女
  - 年龄: 16
  - 学校: XX中学
  - 家长姓名: 家长姓名
  - 家长联系方式: 13800138000
  - 其他信息...
  ```
- 点击"提交"
- 验证：
  - ✅ 成功提示消息
  - ✅ 自动跳转到学生详情页
  - ✅ 数据正确显示

#### 3.4 编辑学生
- 从学生列表选择一个学生
- 点击"编辑"按钮
- 验证：
  - ✅ 表单正确回显现有数据
  - ✅ 修改部分字段（如年龄、学校）
  - ✅ 点击"提交"
  - ✅ 成功提示
  - ✅ 数据更新成功

#### 3.5 删除学生
- 从学生列表选择一个学生
- 点击"删除"按钮
- 确认删除
- 验证：
  - ✅ 成功提示
  - ✅ 学生从列表中消失
  - ✅ 数据库中 `deleted=1`（软删除）

### 步骤4: 测试验证功能

#### 4.1 必填字段验证
- 添加学生时，尝试提交空表单
- 验证：
  - ✅ "学生姓名不能为空"
  - ✅ "年级不能为空"
  - ✅ "当前科目不能为空"

#### 4.2 手机号格式验证
- 输入无效手机号（如：12345）
- 验证：
  - ✅ "手机号格式不正确"

#### 4.3 权限验证
- 尝试访问其他教师的学生（如果有多个用户）
- 验证：
  - ✅ 无法看到其他教师的学生
  - ✅ 尝试直接访问其他人的学生ID应返回错误

---

## 🐛 常见问题排查

### 问题1: 无法登录 - "密码错误"

**原因**: 数据库中的密码哈希可能不匹配

**解决方案**:
```sql
-- 打开MySQL命令行
mysql -u root -p721208

USE lesson_platform;

-- 重置teacher1密码为 "123456"
UPDATE sys_user 
SET password = '$2a$10$10W963A6b3VoVDPh/AO5VuDd41qTCEZud4Iaub4V70CahpQq9VTcG' 
WHERE username = 'teacher1';
```

**或者使用PowerShell**:
```powershell
& "C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe" -u root -p721208 lesson_platform -e "UPDATE sys_user SET password='`$2a`$10`$10W963A6b3VoVDPh/AO5VuDd41qTCEZud4Iaub4V70CahpQq9VTcG' WHERE username='teacher1';"
```

### 问题2: 后端服务未启动

**检查端口8080**:
```powershell
Test-NetConnection -ComputerName localhost -Port 8080
```

**如果False，启动后端**:
```bash
cd D:\AI\backend
mvn spring-boot:run
```

### 问题3: 前端服务未启动

**检查端口3001**:
```powershell
Test-NetConnection -ComputerName localhost -Port 3001
```

**如果False，启动前端**:
```bash
cd D:\AI\web-frontend
npm run dev
```

### 问题4: 数据库连接失败

**检查MySQL服务**:
```powershell
Get-Service MySQL80
```

**如果Stopped，启动服务**:
```powershell
Start-Service MySQL80
```

### 问题5: 前端无法连接后端 (CORS错误)

**检查后端CORS配置**:
应该已配置允许 `http://localhost:3001`

**检查Vite代理配置**:
`vite.config.ts` 应该有:
```typescript
server: {
  port: 3000,
  proxy: {
    '/api': 'http://localhost:8080'
  }
}
```

---

## 📊 数据库验证

### 查看所有学生
```sql
mysql -u root -p721208 lesson_platform

SELECT id, tutor_id, name, grade, school, status, created_at 
FROM student 
WHERE deleted = 0;
```

### 查看已删除的学生
```sql
SELECT id, name, deleted, updated_at 
FROM student 
WHERE deleted = 1;
```

### 查看教师的学生数量
```sql
SELECT u.username, u.real_name, COUNT(s.id) as student_count
FROM sys_user u
LEFT JOIN student s ON u.id = s.tutor_id AND s.deleted = 0
WHERE u.deleted = 0 AND u.role = 2
GROUP BY u.id;
```

---

## 🔍 API测试（使用PowerShell/Postman）

### 1. 登录获取Token
```powershell
$loginBody = @{
    username = "teacher1"
    password = "123456"
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "http://localhost:8080/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $loginBody

$token = $response.data.token
Write-Output "Token: $token"
```

### 2. 获取学生列表
```powershell
$headers = @{
    Authorization = "Bearer $token"
}

Invoke-RestMethod `
    -Uri "http://localhost:8080/api/students?page=1&pageSize=10" `
    -Method GET `
    -Headers $headers
```

### 3. 创建学生
```powershell
$studentData = @{
    name = "API测试学生"
    grade = "高二"
    currentSubject = "英语"
    school = "API测试中学"
    parentName = "测试家长"
    parentContact = "13900139000"
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "http://localhost:8080/api/students" `
    -Method POST `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $studentData
```

### 4. 获取单个学生
```powershell
Invoke-RestMethod `
    -Uri "http://localhost:8080/api/students/1" `
    -Method GET `
    -Headers $headers
```

### 5. 更新学生
```powershell
$updateData = @{
    name = "更新后的名字"
    grade = "高三"
    currentSubject = "物理"
    status = "active"
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "http://localhost:8080/api/students/1" `
    -Method PUT `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $updateData
```

### 6. 删除学生
```powershell
Invoke-RestMethod `
    -Uri "http://localhost:8080/api/students/1" `
    -Method DELETE `
    -Headers $headers
```

---

## ✅ 验收标准

### 功能验收
- [ ] 能够成功登录系统
- [ ] 能够查看学生列表
- [ ] 能够添加新学生
- [ ] 能够查看学生详情
- [ ] 能够编辑学生信息
- [ ] 能够删除学生（软删除）
- [ ] 分页功能正常
- [ ] 搜索功能正常
- [ ] 筛选功能正常

### 验证验收
- [ ] 必填字段验证生效
- [ ] 手机号格式验证生效
- [ ] 提交空表单显示错误提示
- [ ] 后端验证错误正确显示

### 安全验收
- [ ] 未登录无法访问学生API
- [ ] 只能查看自己的学生
- [ ] 无法访问其他教师的学生
- [ ] Token过期后自动跳转登录

### 性能验收
- [ ] 列表查询响应时间 < 200ms
- [ ] 创建学生响应时间 < 500ms
- [ ] 更新学生响应时间 < 500ms
- [ ] 页面加载流畅，无明显卡顿

---

## 📞 技术支持

**遇到问题？**
1. 查看本文档的"常见问题排查"部分
2. 检查浏览器控制台错误信息
3. 检查后端日志（控制台输出）
4. 查看 `D:\AI\work\implementation-summary.md` 了解实现细节

**日志位置**:
- 后端日志: 控制台输出
- 前端日志: 浏览器开发者工具 Console
- MySQL日志: MySQL错误日志

---

**最后更新**: 2026-03-30 21:30  
**文档版本**: 1.0
