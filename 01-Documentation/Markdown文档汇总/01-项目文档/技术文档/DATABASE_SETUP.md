# 数据库设置指南

## 步骤1：创建数据库

在MySQL中执行：

```bash
mysql -u root -p < backend/sql/schema.sql
mysql -u root -p lesson_platform < backend/sql/schema2.sql
```

或者手动执行：

```sql
-- 1. 创建数据库和基础表
source D:/AI/backend/sql/schema.sql

-- 2. 创建课程相关表
source D:/AI/backend/sql/schema2.sql

-- 3. 插入测试数据
source D:/AI/backend/sql/data.sql
```

## 步骤2：验证

```sql
USE lesson_platform;
SHOW TABLES;
SELECT * FROM sys_user;
SELECT * FROM student;
```

## 测试账号

- 用户名：teacher1
- 密码：123456

## 注意事项

确保MySQL配置与 `backend/src/main/resources/application.yml` 中的一致：
- 端口：3306
- 用户名：root
- 密码：root123
