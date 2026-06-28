# 物理小节层级与 AI 生成超时修复记录

本次会话完成两项备课生成相关的改进：一、为物理学科增加"章下小节"层级选择；二、修复 AI 生成超时导致"显示失败但历史有记录且无内容"的 bug。

## 一、物理学科增加小节层级

### 1.1 问题现象

新建备课页选择"物理 → 高中 → 必修第三册 → 第九章 静电场及其应用"后，章节选择到此为止，没有更细的"小节"选项（如"电荷""库仑定律""电场 电场强度"等）。用户希望物理学科能精确到小节，让 AI 生成的备课内容更聚焦。仅修改物理学科，英语等不受影响。

### 1.2 架构调研结论

章节目录数据是前端硬编码的 TS 常量，不走 API、不进数据库：

- 数据源：`02-Frontend/web-frontend/src/data/textbooks.ts` 的 `TEXTBOOK_DATA` 常量
- 前端级联：`LessonGeneratePage.tsx` 用 `getStages / getTextbooks / getChapters` 三个纯函数从内存读取
- 后端承接：章节信息不作为独立字段传后端，而是在 `handleGenerate` 里拼成文本 `【教材依据】物理 · 高中 · 必修第三册 · 第九章 静电场及其应用` 塞进 `customRequirements` 字段，最终透传给 AI 作为 prompt 上下文
- 数据结构：`TextbookChapter` 接口只有 `{ id, title }`，无 `parentId`、无 `children`，是扁平结构

结论：扩展"小节"只需改前端两处，后端与数据库完全不动。符合项目"教材信息只作 AI prompt 上下文、不结构化存储"的既有设计取舍。

### 1.3 修复方案

**文件一：`02-Frontend/web-frontend/src/data/textbooks.ts`**

- 新增 `TextbookSection` 接口 `{ id: string; title: string }`
- 给 `TextbookChapter` 增加可选字段 `sections?: TextbookSection[]`
- 为高中物理 6 册（必修第一至三册 + 选择性必修第一至三册）的全部章节补录小节，数据基于人教版 2019 版并联网核对
- `sections` 是可选字段，英语和初中物理未补录，保持原有"只有章节"的行为，互不影响

例如"必修第三册 第九章 静电场及其应用"现在有 4 个小节：电荷 / 库仑定律 / 电场 电场强度 / 静电的防止与利用。

**文件二：`02-Frontend/web-frontend/src/pages/Lesson/LessonGeneratePage.tsx`**

- 新增 `watchedSectionId` 字段订阅，保证实时更新
- 级联重置：切换学生 / 科目 / 课本 / 章节时自动清空小节，避免残留错位（新增两个 useEffect 分别处理课本变化、章节变化时的清空）
- 当选中章节有小节时，显示"小节"下拉框（必填）；无小节的章节不显示，行为不变
- 第二步校验、第三步确认页、生成请求的 `customRequirements` 拼接均已接入小节标题
- 最终 AI 收到的教材上下文形如：`【教材依据】物理 · 高中 · 必修第三册 · 第九章 静电场及其应用 · 2. 库仑定律`

### 1.4 说明

一、初中物理（人教版 2024 版）暂未补录小节，因为 2024 新版目录未完全核实，贸然录入可能出错。如需要可以再补。

二、高中物理小节标题里含实验类条目（如"实验：用打点计时器测速度"），已按教材原样保留。

## 二、AI 生成超时导致空内容修复

### 2.1 问题现象

用户反馈：新建备课（余少杰 / 物理 / 电场和电场强度 / 新课讲解 / 90 分钟）点击生成后，前端弹出"生成失败"，但备课历史里有记录，点进去却没有任何内容。

### 2.2 复现与定位

**复现**：用 teacher1 账号按完全相同的参数调用 `POST /api/lessons/generate`，返回 200 且 status=completed，但查数据库 `lesson_content` 表该 lessonPlanId 下 0 条记录。

**直连 Python AI 服务测耗时**：用相同参数直接调 `http://localhost:8001/api/generate-lesson`，生成耗时 70.4 秒，返回五段式内容完整正常。

**根因锁定**：AI 生成实际耗时约 70 秒，但前后端有两处 timeout 卡在 60 秒以内，导致链路中断。

### 2.3 根因分析

**直接原因一：前端 axios 默认 timeout 30 秒（最先超时）**

文件：`02-Frontend/web-frontend/src/api/client.ts` 第 10 行 `timeout: 30000`。

`lessonApi.generateLesson` 未单独设置 timeout，用的是全局 30 秒。30 秒时前端 axios 抛超时错误，前端 catch 兜底显示"生成失败"。但后端仍在继续生成，最终 status 会变成 completed——这就是"显示失败但历史记录里有"的原因。

**直接原因二：后端 WebClient timeout 60 秒（次超时）**

文件：`03-Backend/backend/src/main/java/com/lessonplatform/service/AiService.java` 第 56 行 `.timeout(Duration.ofSeconds(60))`。

60 秒时 Java 调 Python 超时，触发 catch 返回 fallback 兜底内容。但 fallback 用的是旧字段名（knowledgePoints / teachingPlan / exercises / homework / summary），与五段式的 coreDefinition 等不匹配。`LessonService` 用 `containsKey("coreDefinition")` 检查时全部落空，五段 content 一条都没插入。最终 status 被设为 completed，但 lesson_content 表 0 条记录——这就是"历史有记录但无内容"的原因。

**完整失败链路**：

1. 前端发起请求，后端 `LessonService.generateLessonPlan` 先 insert lessonPlan 记录（status=generating）
2. 调 `AiService.generateLessonContent`，WebClient 调 Python，60 秒超时
3. AiService catch 返回 fallback map（旧字段名）
4. LessonService 用 `containsKey("coreDefinition")` 检查，fallback 不含此键，五段 content 全部不插入
5. status 被设为 completed，updateById 落库
6. 返回前端 200，但此时前端 axios 早已在 30 秒超时，显示"生成失败"

### 2.4 修复方案

**修复一：前端 generateLesson 单独设置 timeout 180 秒**

文件：`02-Frontend/web-frontend/src/api/lesson.ts`

```typescript
generateLesson: async (data: GenerateLessonRequest): Promise<ApiResponse<LessonPlan>> => {
  // AI 生成五段式备课内容耗时较长（qwen-plus 生成 1800+ 字通常需 60-90 秒），
  // 默认 axios timeout 30s 会先超时导致"生成失败"误报，单独放宽到 180s
  return axiosInstance.post('/lessons/generate', data, { timeout: 180000 });
},
```

**修复二：后端 WebClient timeout 60 秒改为 120 秒，并增加日志**

文件：`03-Backend/backend/src/main/java/com/lessonplatform/service/AiService.java`

- `.timeout(Duration.ofSeconds(60))` 改为 `.timeout(Duration.ofSeconds(120))`
- 成功路径增加日志 `log.info("备课内容生成完成，返回字段：{}", result != null ? result.keySet() : "null")`，便于后续排查是否走了 fallback
- catch 日志改为 `log.error("AI服务调用失败，将返回兜底内容", e)`，语义更清晰

**修复三：fallback 字段名对齐五段式（防御性修复）**

文件：`03-Backend/backend/src/main/java/com/lessonplatform/service/AiService.java` 的 `generateFallbackContent` 方法

原 fallback 用旧字段名（knowledgePoints / teachingPlan / exercises / homework / summary），与 `LessonService` 的 `containsKey("coreDefinition")` 检查不匹配，导致即使超时也不会插入任何 content，出现"completed 但空内容"的静默失败。

改为五段式字段名，即使将来再超时，也会插入五段"生成失败，请重试"的提示内容，不再静默失败：

```java
private Map<String, String> generateFallbackContent(Map<String, Object> params) {
    // 兜底内容必须使用五段式字段名（与 LessonService 的 containsKey 检查对齐），
    // 否则会出现"status=completed 但 lesson_content 表 0 条记录"的静默失败
    Map<String, String> result = new HashMap<>();
    result.put("coreDefinition", "# 教材核心原文\n\nAI 服务调用失败，请检查 AI 服务是否启动或稍后重试。");
    result.put("teachingAnalysis", "# 教学深度剖析\n\n生成失败，请重试。");
    result.put("mistakeWarnings", "# 易错点拨\n\n生成失败，请重试。");
    result.put("scoreBoosting", "# 提分技巧\n\n生成失败，请重试。");
    result.put("exampleDerivation", "# 经典例题推导\n\n生成失败，请重试。");
    return result;
}
```

**修复四：application.yml 配置对齐**

文件：`03-Backend/backend/src/main/resources/application.yml`

`ai.service.timeout` 从 60000 调整为 120000，与代码中硬编码的 timeout 保持一致（注：该配置当前未被代码读取，AiService 用的是硬编码值，但保持配置一致便于将来可维护）。

### 2.5 验证结果

重新编译后端并以 `mvn spring-boot:run` 重启。用 teacher1 账号按相同参数（余少杰 / 物理 / 电场和电场强度 / 新课讲解 / 90 分钟）重新生成：

- 耗时 69.95 秒（在 120 秒 timeout 内，不再超时）
- 返回 status=completed
- lesson_content 表 5 条记录齐全：
  - core_definition（教材核心原文）2460 字符
  - teaching_analysis（教学深度剖析）2316 字符
  - mistake_warnings（易错点拨）2647 字符
  - score_boosting（提分技巧）1854 字符
  - example_derivation（经典例题推导）3007 字符
- 后端日志确认输出：`备课内容生成完成，返回字段：[coreDefinition, teachingAnalysis, mistakeWarnings, scoreBoosting, exampleDerivation]`，证明未走 fallback

## 三、涉及文件清单

| 层 | 文件 | 改动内容 |
|----|------|---------|
| 前端数据 | `02-Frontend/web-frontend/src/data/textbooks.ts` | 新增 TextbookSection 接口；TextbookChapter 增加可选 sections 字段；高中物理 6 册全部章节补录小节 |
| 前端 UI | `02-Frontend/web-frontend/src/pages/Lesson/LessonGeneratePage.tsx` | 新增 sectionId 订阅；级联重置逻辑；小节选择器 UI；校验与拼接接入 |
| 前端 API | `02-Frontend/web-frontend/src/api/lesson.ts` | generateLesson 单独设置 timeout 180000 |
| 后端服务 | `03-Backend/backend/src/main/java/com/lessonplatform/service/AiService.java` | WebClient timeout 60s 改 120s；增加返回字段日志；fallback 字段名对齐五段式 |
| 后端配置 | `03-Backend/backend/src/main/resources/application.yml` | ai.service.timeout 60000 改 120000 |

## 四、经验沉淀

一、超时问题需全链路排查。本次"显示失败但有记录"的怪象，根因是前后端两处 timeout 不一致：前端 30 秒先超时报错给用户看，后端 60 秒后超时走 fallback 但 fallback 字段名不对导致空内容。任何一处单独看都"合理"，组合起来就成了静默失败。

二、fallback / 兜底逻辑的字段名必须与正常路径的消费方严格对齐。本次 fallback 用旧字段名（knowledgePoints 等），而 LessonService 用五段式新字段名（coreDefinition 等）检查，导致 fallback 内容被静默丢弃。修改字段名后，即使超时也会显式提示"生成失败，请重试"，不再出现"completed 但空内容"。

三、AI 生成耗时随内容量增长。五段式升级后（max_tokens=8192，整篇 1800+ 字），qwen-plus 单次生成稳定在 60-90 秒，远超常规接口的 30 秒 timeout。涉及 AI 生成的接口必须单独放宽 timeout，不能复用全局默认值。此条与此前 PDF 导出 timeout 修复属同类问题。

四、教材目录作为"AI prompt 上下文"而非"结构化业务实体"的架构取舍，使得扩展小节层级的成本极低：只改前端数据与 UI，后端与数据库零改动。但这也意味着小节信息无法被结构化查询，未来若要做"按小节统计备课数量"等分析，需要重新评估是否建表。
