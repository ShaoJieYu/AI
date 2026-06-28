# 文科备课 PDF 导出伪公式修复记录

## 一、问题现象

用户对备课历史中"一般现在时"(英语学科,新课讲解)备课记录点击"导出 PDF",前端弹窗显示"导出失败",无法下载 PDF 文件。

请求信息:`GET /api/lessons/4/export?format=pdf`

## 二、根因分析

### 2.1 直接原因:前端超时

前端 axios 实例全局 `timeout: 30000`(30 秒),PDF 导出涉及 MathJax 渲染 + openhtmltopdf 生成,耗时较长。多个伪公式串行渲染累计超过 30 秒,前端直接 reject,弹"导出失败"。

### 2.2 深层原因:AI 生成伪公式

AI 服务的 prompt 无差别强制"公式一律使用 LaTeX 语法",但英语语法课没有真正的数学公式。AI 为满足要求,硬造了一批伪公式,典型示例:

- "教材核心原文"小节:把动词第三人称单数变化规则套成数学 cases 分段函数

```
$$V_3 = \begin{cases}
V+s, & \text{若 V 以元音字母结尾或为不规则动词} \\
V-y+ies, & \text{若 V 以辅音字母 + y 结尾} \\
V+es, & \text{若 V 以 -s,-x,-ch,-sh,-o 结尾} \\
V+s, & \text{其他常规情况}
\end{cases}$$
```

- "教学深度剖析"小节:造 `$$f(x)$$`、`$$\{x | x \in Z^+\}$$`
- "易错点拨"小节:造 `$$Does + S + V_{base}?$$`

这些伪公式:
1. 内容荒谬,违反教学常识(英语语法套数学公式)
2. MathJax 渲染 cases 环境等复杂 LaTeX 耗时较长,多个伪公式串行渲染累计超时

### 2.3 次要问题:错误信息被掩盖

前端拦截器对 blob 请求的错误响应不解析,后端返回 JSON 错误体被当成 Blob,前端只弹通用"导出失败",掩盖真实错误。

## 三、修复方案

标本兼治:治本(避免未来生成伪公式)+ 治标(让现有文科备课能导出)+ 健壮性增强。

### 3.1 治本:AI prompt 按学科分支

文件:`04-AI-Service/ai-service/services/tongyi_service.py`

改动:在 prompt 构造前增加学科判定,理科才强制 LaTeX 公式,非理科严禁 `$...$`。

- 理科(物理/化学/生物/数学):保留原公式要求,并增加"严禁把非公式文本用 $...$ 包裹"
- 非理科(英语/语文等):严禁使用 LaTeX 公式,语法规则、句型结构、文字定义用普通文字、表格或缩进列表表达

同时调整"教材核心原文""经典例题推导"小节的公式相关要求,按学科分支生成。

### 3.2 治标:后端导出按学科跳过公式渲染

文件:`03-Backend/backend/src/main/java/com/lessonplatform/service/LessonExportService.java`

改动:`buildHtml` 方法中根据 `lessonPlan.getSubject()` 判定 `renderFormulas`,仅理科(物理/化学/生物/数学)走 MathJax 渲染,非理科直接走 commonmark,`$` 符号按普通文本处理。

`markdownToHtml` 方法签名改为 `markdownToHtml(String markdown, boolean renderFormulas)`,非理科分支跳过 LaTeX 提取与 MathJax 调用。

### 3.3 治标:前端详情页按学科禁用数学插件

文件:`02-Frontend/web-frontend/src/components/MarkdownRenderer.tsx`

改动:新增 `enableMath` prop(默认 true),非理科时不加载 `remarkMath`/`rehypeKatex`,避免残留 `$` 被识别为公式。

文件:`02-Frontend/web-frontend/src/pages/Lesson/LessonDetailPage.tsx`

改动:计算 `isStemSubject`,传给 `MarkdownRenderer` 的 `enableMath` prop。

### 3.4 健壮性:前端超时与错误解析

文件:`02-Frontend/web-frontend/src/api/lesson.ts`

改动:`exportLesson` 接口单独设置 `timeout: 120000`,不受全局 30s 限制。

文件:`02-Frontend/web-frontend/src/api/client.ts`

改动:拦截器 error 分支新增 blob 错误体解析。当 `responseType === 'blob'` 且 `error.response.data instanceof Blob` 时,用 `await error.response.data.text()` + `JSON.parse` 解析后端真实 message,调 `message.error` 显示。

文件:`02-Frontend/web-frontend/src/pages/Lesson/LessonDetailPage.tsx`

改动:`handleExport` 的 catch 分支不再重复弹"导出失败"(拦截器已显示真实错误),仅在网络不可用时兜底。

### 3.5 健壮性:MathJax 单公式超时缩短

文件:`03-Backend/backend/src/main/java/com/lessonplatform/service/LatexRendererService.java`

改动:`@Value("${app.mathjax.timeout-ms:15000}")` 改为 `8000`。单公式超时从 15s 降到 8s,避免少数复杂公式卡死整次导出。

## 四、涉及文件清单

| 层 | 文件 | 改动类型 |
| --- | --- | --- |
| AI 服务 | `04-AI-Service/ai-service/services/tongyi_service.py` | prompt 按学科分支 |
| 后端 | `03-Backend/backend/src/main/java/com/lessonplatform/service/LessonExportService.java` | buildHtml/markdownToHtml 按学科判定 |
| 后端 | `03-Backend/backend/src/main/java/com/lessonplatform/service/LatexRendererService.java` | 单公式超时 15s → 8s |
| 前端组件 | `02-Frontend/web-frontend/src/components/MarkdownRenderer.tsx` | 新增 enableMath prop |
| 前端页面 | `02-Frontend/web-frontend/src/pages/Lesson/LessonDetailPage.tsx` | 按学科传 enableMath,handleExport 错误处理优化 |
| 前端 API | `02-Frontend/web-frontend/src/api/lesson.ts` | 导出接口 timeout: 120000 |
| 前端拦截器 | `02-Frontend/web-frontend/src/api/client.ts` | blob 错误响应解析 |

## 五、验证步骤

1. 重启后端和 AI 服务(让 prompt 改动生效)
2. 刷新前端
3. 对现有 id=4 "一般现在时"备课点击导出 PDF,确认能成功导出(非理科走纯文本渲染,不再卡 MathJax)
4. 新建一个英语备课(如"定语从句"),确认 AI 不再生成伪公式,详情页和 PDF 导出都正常
5. 新建一个物理备课(如"牛顿第二定律"),确认理科公式渲染不受影响

## 六、后续注意事项

- 若后续扩展学科(如地理、历史),无需额外改动,默认走非理科分支即可
- 若 prompt 调整后 AI 仍偶发生成伪公式,后端 `renderFormulas=false` 分支会兜底,把 `$` 当普通文本,不会卡死导出
- 理科判定关键词为"物理/化学/生物/数学"四科,若新增理科(如"科学"综合课),需在 LessonExportService.java 和 LessonDetailPage.tsx 的判定列表中补充
