# 后端架构设计

**模块**: Spring Boot 应用 | **框架**: Java 21 + Spring Boot 3.2.5 | **更新**: 2026-03-25

---

## 架构概览

```
┌──────────────────────────────────────────────────┐
│    REST API 接口 (Spring Web + Spring Security)  │
│         :8080/api                               │
├──────────────────────────────────────────────────┤
│                                                  │
│  控制层 Controllers                              │
│  ├─ UserController      (用户认证、管理)        │
│  ├─ StudentController   (学生管理)              │
│  ├─ LessonController    (备课生成)              │
│  ├─ ProgressController  (进度跟踪)              │
│  └─ ResourceController  (资源管理)              │
│                          │                      │
│  业务层 Services                                │
│  ├─ UserService         (用户业务逻辑)         │
│  ├─ StudentService      (学生信息管理)         │
│  ├─ LessonService       (备课内容生成)         │
│  ├─ AIIntegrationService (AI 服务调用)        │
│  └─ ResourceService     (资源管理业务)        │
│                          │                      │
│  数据访问层 Data Access                         │
│  ├─ UserRepository      (JPA)                  │
│  ├─ StudentMapper       (MyBatis)              │
│  ├─ LessonMapper        (MyBatis)              │
│  └─ ResourceMapper      (MyBatis)              │
└──────────────────────────────────────────────────┘
          │                    │
    ┌─────┴────────────────────┴─────┐
    ▼                                ▼
MySQL Database              Redis Cache
(业务数据)                   (会话、缓存)
```

---

## 目录结构

```
backend/src/main/java/com/lessonplatform/
├── config/                      # Spring 配置
│   ├── WebConfig.java          # Web MVC 配置
│   ├── SecurityConfig.java     # Spring Security 配置
│   ├── JpaConfig.java          # JPA 配置
│   └── RedisConfig.java        # Redis 配置
│
├── controller/                  # REST API 接口层
│   ├── UserController.java
│   ├── StudentController.java
│   ├── LessonController.java
│   ├── ProgressController.java
│   └── ResourceController.java
│
├── service/                     # 业务逻辑层
│   ├── UserService.java
│   ├── StudentService.java
│   ├── LessonService.java
│   ├── AIIntegrationService.java
│   ├── ProgressService.java
│   ├── ResourceService.java
│   └── impl/
│       ├── UserServiceImpl.java
│       ├── StudentServiceImpl.java
│       ├── LessonServiceImpl.java
│       └── ...
│
├── mapper/                      # 数据访问层 (MyBatis)
│   ├── UserMapper.java
│   ├── StudentMapper.java
│   ├── LessonMapper.java
│   ├── ProgressMapper.java
│   └── ResourceMapper.java
│
├── entity/                      # JPA 实体类
│   ├── User.java
│   ├── Student.java
│   ├── Lesson.java
│   ├── Progress.java
│   └── Resource.java
│
├── dto/                         # 数据传输对象
│   ├── request/
│   │   ├── LoginRequest.java
│   │   ├── CreateLessonRequest.java
│   │   └── ...
│   └── response/
│       ├── LoginResponse.java
│       ├── LessonResponse.java
│       └── ...
│
├── exception/                   # 自定义异常
│   ├── BusinessException.java
│   ├── AuthException.java
│   └── NotFoundException.java
│
├── security/                    # 安全相关
│   ├── JwtTokenProvider.java
│   ├── CustomUserDetails.java
│   └── AuthenticationFilter.java
│
├── utils/                       # 工具类
│   ├── Result.java             # 统一返回格式
│   ├── MD5Utils.java
│   ├── DateUtils.java
│   └── TokenUtils.java
│
└── LessonPlatformApplication.java  # Spring Boot 启动类
```

---

## 核心模块

### 用户认证 (User Service)
- **功能**: 用户注册、登录、权限管理
- **认证方式**: JWT Token
- **密码加密**: MD5 or BCrypt
- **存储**: MySQL user 表

### 学生管理 (Student Service)
- **功能**: 学生档案、学情分析、成长轨迹
- **数据**: student 表 + progress 表
- **关键字段**: grade, weakness, strengths

### 备课服务 (Lesson Service)
- **功能**: 备课请求处理、教案保存、版本管理
- **与 AI 的集成**: 
  - 调用 AI 服务 (http://localhost:8001/api/generate-lesson)
  - 存储生成的内容到 MySQL
- **缓存**: Redis 存储热门备课

### 进度服务 (Progress Service)
- **功能**: 课程安排、进度跟踪、效果评估
- **数据**: progress, course_arrangement 表

### 资源服务 (Resource Service)
- **功能**: 知识点管理、教学模板、题型管理
- **数据**: resource, knowledge_point 表

---

## 技术架构详情

### Spring Security + JWT

#### SecurityConfig
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf().disable()
            .authorizeRequests()
                .requestMatchers("/api/login", "/api/register").permitAll()
                .anyRequest().authenticated()
            .and()
            .addFilterBefore(
                new JwtAuthenticationFilter(jwtTokenProvider),
                UsernamePasswordAuthenticationFilter.class
            )
            .sessionManagement()
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS);
        return http.build();
    }
}
```

#### JWT Token Provider
```java
@Component
public class JwtTokenProvider {
    private static final String SECRET = "your-secret-key-min-256-bits";
    private static final long EXPIRATION = 86400000; // 24 hours
    
    public String generateToken(String username) {
        return Jwts.builder()
            .setSubject(username)
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION))
            .signWith(SignatureAlgorithm.HS512, SECRET)
            .compact();
    }
    
    public String getUsernameFromToken(String token) {
        return Jwts.parser()
            .setSigningKey(SECRET)
            .parseClaimsJws(token)
            .getBody()
            .getSubject();
    }
}
```

### 数据访问层 (JPA + MyBatis)

#### Spring Data JPA
```java
// UserRepository - 继承 CrudRepository
public interface UserRepository extends CrudRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
}

// 使用
User user = userRepository.findByUsername("john").orElseThrow();
```

#### MyBatis Plus
```java
// StudentMapper
@Mapper
public interface StudentMapper extends BaseMapper<Student> {
    // 自定义查询
    @Select("SELECT * FROM student WHERE grade = #{grade}")
    List<Student> findByGrade(String grade);
}

// 使用
List<Student> students = studentMapper.findByGrade("初三");
```

### 与 AI 服务的集成

#### AIIntegrationService
```java
@Service
public class AIIntegrationService {
    private static final String AI_SERVICE_URL = "http://localhost:8001";
    
    @Autowired
    private RestTemplate restTemplate;
    
    public LessonContent generateLesson(LessonRequest request) {
        String url = AI_SERVICE_URL + "/api/generate-lesson";
        HttpEntity<LessonRequest> entity = new HttpEntity<>(request);
        ResponseEntity<LessonResponse> response = restTemplate
            .postForEntity(url, entity, LessonResponse.class);
        return convertToEntity(response.getBody());
    }
}
```

### 统一返回格式

```java
@Data
public class Result<T> {
    private int code;           // 200=成功, 其他=失败
    private String message;     // 错误信息
    private T data;             // 返回数据
    private long timestamp;     // 时间戳
    
    public static <T> Result<T> success(T data) {
        Result<T> result = new Result<>();
        result.code = 200;
        result.message = "Success";
        result.data = data;
        result.timestamp = System.currentTimeMillis();
        return result;
    }
    
    public static <T> Result<T> fail(String message) {
        Result<T> result = new Result<>();
        result.code = 500;
        result.message = message;
        result.timestamp = System.currentTimeMillis();
        return result;
    }
}
```

### 事务管理

```java
@Service
public class LessonService {
    
    @Transactional(rollbackFor = Exception.class)
    public Lesson createLesson(CreateLessonRequest request) {
        // 1. 调用 AI 服务生成内容
        LessonContent content = aiService.generateLesson(request);
        
        // 2. 保存到数据库
        Lesson lesson = new Lesson();
        lesson.setContent(content.getContent());
        lessonRepository.save(lesson);
        
        // 如果任何步骤失败，整个事务回滚
        return lesson;
    }
}
```

---

## API 设计规范

### 请求格式
```json
POST /api/lessons
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "subject": "数学",
  "teachingGoal": "学习二次方程",
  "difficulty": "中等",
  "studentInfo": {
    "grade": "初三",
    "weaknesses": ["因式分解"]
  }
}
```

### 响应格式
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "id": "123",
    "subject": "数学",
    "content": "..."
  },
  "timestamp": 1711353600000
}
```

### 错误响应
```json
{
  "code": 400,
  "message": "Invalid request parameter",
  "timestamp": 1711353600000
}
```

---

## 数据库关键表

| 表名 | 说明 | 关键字段 |
|------|------|---------|
| `sys_user` | 用户信息 | id, username, password, email |
| `student` | 学生档案 | id, user_id, grade, school |
| `lesson` | 备课内容 | id, user_id, subject, content |
| `progress` | 学生进度 | id, student_id, lesson_id, status |
| `resource` | 教学资源 | id, name, type, url |
| `knowledge_point` | 知识点 | id, name, subject, level |

---

## 性能优化

### 缓存策略
```java
@Cacheable(value = "lessons", key = "#id")
public Lesson getLessonById(Long id) {
    return lessonRepository.findById(id).orElse(null);
}

@CacheEvict(value = "lessons", key = "#lesson.id")
public void updateLesson(Lesson lesson) {
    lessonRepository.save(lesson);
}
```

### 数据库索引
```sql
-- 常用查询添加索引
CREATE INDEX idx_user_username ON sys_user(username);
CREATE INDEX idx_lesson_user_id ON lesson(user_id);
CREATE INDEX idx_student_grade ON student(grade);
```

### 分页查询
```java
Page<Lesson> lessons = lessonRepository.findByUserId(
    userId, 
    PageRequest.of(page, 10, Sort.by("createTime").descending())
);
```

---

## 相关文档

- [backend/QUICK-START.md](./QUICK-START.md) - 快速启动
- [backend/DATABASE-SCHEMA.md](./DATABASE-SCHEMA.md) - 数据库设计
- [backend/API-DESIGN.md](./API-DESIGN.md) - API 规范
- [00-PROJECT-STATUS.md](../00-PROJECT-STATUS.md) - 项目状态
