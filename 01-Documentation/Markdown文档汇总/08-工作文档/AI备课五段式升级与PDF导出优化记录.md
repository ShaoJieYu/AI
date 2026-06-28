# AI 备课五段式升级与 PDF 导出优化记录

本文档汇总在 d:\AI 家教备课平台项目中完成的两大块工作：
一、AI 备课内容从单段输出升级为五段式结构；
二、PDF 导出功能从无到有，并解决 LaTeX 公式渲染与垂直对齐问题。

---

## 一、AI 备课五段式结构升级

### 1.1 背景

参考"静电场教学指南"的质量标准，将 AI 生成的备课内容从单一文本升级为五段式结构，提升教学深度与实用性。

### 1.2 五段式 contentType 约定

五个 contentType 固定如下，前端按此顺序渲染，后端按此映射：

| contentType | 中文名 | AI 服务返回字段名 |
| --- | --- | --- |
| core_definition | 教材核心原文 | coreDefinition |
| teaching_analysis | 教学深度剖析 | teachingAnalysis |
| mistake_warnings | 易错点拨 | mistakeWarnings |
| score_boosting | 提分技巧 | scoreBoosting |
| example_derivation | 经典例题推导 | exampleDerivation |

### 1.3 改动文件

**AI 服务层（Python）**
- 文件：`04-AI-Service/ai-service/services/tongyi_service.py`
- 改动：prompt 模板重写为五段式结构，输出 JSON 包含上述五个字段
- 关键参数：模型 qwen-plus，max_tokens 提升到 8192（五段式内容量大，4096 会截断）

**后端服务层（Java）**
- 文件：`03-Backend/backend/src/main/java/com/lessonplatform/service/LessonService.java`
- 改动：把 AI 返回的五个字段映射到五条 LessonContent 记录，sortOrder 1 到 5

**前端**
- 文件：`02-Frontend/web-frontend/src/components/MarkdownRenderer.tsx`
- 改动：使用 react-markdown + remark-math + rehype-katex 渲染 LaTeX，行内 $...$，块级 $$...$$
- 文件：`02-Frontend/web-frontend/src/pages/Lesson/LessonDetailPage.tsx`
- 改动：重写详情页，按 contentType 顺序渲染五段内容；主数据与内容列表分两次查询
- 文件：`02-Frontend/web-frontend/src/types/lesson.ts`
- 改动：LessonPlan 字段与后端 model 严格对齐：teachingGoal / generateType / estimatedDuration / difficulty(String) / status(generating|completed|failed)

### 1.4 验证

生成"库仑定律"备课内容，五段全部生成成功，公式渲染正确，状态为 completed。

---

## 二、PDF 导出功能实现

### 2.1 背景

此前 PDF 导出接口未实现，导出的文件损坏打不开。需要新增导出接口，并让 PDF 中显示渲染后的数学公式（而非 LaTeX 源码）。

### 2.2 导出接口

- 路径：`GET /lessons/{id}/export?format=pdf`
- 文件：`03-Backend/backend/src/main/java/com/lessonplatform/controller/LessonController.java`
- 鉴权：基于当前登录的 tutorId 校验备课记录归属

### 2.3 PDF 生成链路

整体流程（在 `LessonExportService.java` 中实现）：

1. 查询备课主数据 + 五段内容列表
2. 用正则提取 Markdown 中的 $$...$$ 和 $...$，替换为占位符
3. commonmark-java 把剩余 Markdown 转 HTML
4. 占位符替换回 SVG（块级公式 div.formula-block，行内 span.formula-inline）
5. openhtmltopdf + BatikSVGDrawer 把 HTML 转 PDF
6. 输出字节流

### 2.4 LaTeX 公式渲染服务

**Node 子进程脚本**
- 文件：`05-Tools/mathjax-renderer/renderer.js`
- 依赖：mathjax-node@2.1.1
- 协议：stdin/stdout 行 JSON，收到 __shutdown__ 时退出

**Java 端管理**
- 文件：`03-Backend/backend/src/main/java/com/lessonplatform/service/LatexRendererService.java`
- 行为：随后端启动自动 fork Node 子进程，停止时发 __shutdown__
- 缓存：SVG 按 (display, latex) 维度缓存，避免重复渲染
- 降级：Node 服务不可用时，公式以 `<code>` 显示 LaTeX 源码

---

## 三、PDF 公式垂直对齐问题修复（6 轮迭代）

### 3.1 问题

导出的 PDF 中，行内公式与文字在垂直方向上对不齐，表现为公式整体偏高或偏低。

### 3.2 关键技术点

- openhtmltopdf 对 `ex` 单位解析不准，对 `em` 解析准确，因此所有偏移最终都用 em 单位
- MathJax 输出的 SVG 自带 `vertical-align`（ex 单位），语义是公式基线相对文字基线的精确偏移，考虑了 descender、分数分母位置等
- 1ex ≈ 0.5em，转换时乘以 0.5

### 3.3 迭代过程

**第 1 轮：移除 SVG style，用 vertical-align: middle**
- 结果：公式比左右文字略高
- 原因：middle 让公式中点对齐文字中线，但公式视觉重心偏上

**第 2 轮：固定 vertical-align: -0.15em**
- 结果：所有公式竖直方向一致，但带分式的公式没对齐
- 原因：固定偏移无法适配不同高度 SVG

**第 3 轮：自定义动态偏移 -(H/2 - 0.35em)**
- 结果：带分式公式仍未对齐
- 原因：公式完全错误，MathJax 的 vertical-align 不是简单的 -height/2

**第 4 轮：保留 MathJax 原始 vertical-align，ex 转 em**
- 结果：带分式公式基本对齐，但单符号公式（如 $q$）偏下
- 原因：含 descender 的字母（q、p、g）MathJax 会多下移（-0.671ex），在 PDF 中反而让公式主体偏低

**第 5 轮：智能分类（矮公式固定偏移 + 高公式保留 MathJax 值）**
- 矮公式（height < 2.5ex）：固定 -0.17em
- 高公式（height ≥ 2.5ex）：MathJax 值 × 0.5
- 结果：单符号公式仍偏下，固定 -0.17em 对无 descender 字母下移过多

**第 6 轮（最终方案）：按比例缩放 MathJax 原值**
- 矮公式（height < 2.5ex）：MathJax 值 × 0.25
- 高公式（height ≥ 2.5ex）：MathJax 值 × 0.5
- 效果：q 约 -0.084em（descender 自然下沉），F/r 约 -0.042em（基本对齐基线）

### 3.4 关键数据（MathJax 实际输出）

| 公式 | height (ex) | MathJax vertical-align (ex) |
| --- | --- | --- |
| $q$ | 2.009 | -0.671 |
| $F$ | 2.176 | -0.338 |
| $r$ | 1.676 | -0.338 |
| $E=mc^2$ | 2.676 | -0.338 |
| $\frac{a}{b}$ | 4.843 | -2.005 |
| $F=k\frac{...}$ | 6.009 | -2.171 |
| $\sqrt{x}$ | 3.009 | -1.005 |

### 3.5 最终代码位置

文件：`03-Backend/backend/src/main/java/com/lessonplatform/service/LessonExportService.java`

核心方法 `applySmartVerticalAlign`（约第 195-238 行）：
- 读取 SVG 的 height 属性（ex 单位）做分类
- 读取 MathJax 原始 vertical-align 值（ex 单位）
- 移除 SVG 自带 style 属性
- 按公式高度选择缩放比例（矮 0.25，高 0.5）
- ex 转 em（×0.5）后写入新的 style 属性

---

## 四、PDF 文字水平对齐问题修复

### 4.1 问题

PDF 中同一行的中英文文字水平不齐（baseline 不一致）。

### 4.2 根因

原字体配置使用 simhei.ttf（纯中文字体），不含英文字形，导致英文/数字 fallback 到系统 sans-serif，两者 baseline 不同。

### 4.3 修复

- 字体切换：优先使用微软雅黑 msyh.ttc（同一字体文件含中英文 glyphs，baseline 统一）
- CSS 调整：body 和 code 的 font-family 设为单一 'ChineseFont'，移除 fallback 链
- 字体注册名：'ChineseFont'，在 `htmlToPdf` 方法中通过 `builder.useFont` 注册

### 4.4 验证

PDF 文件大小从 444KB 增加到 654KB（字体被完整嵌入），中英文混排 baseline 统一。

---

## 五、关键约束与经验

### 5.1 已固化的工程约束

- AI 备课必须使用 qwen-plus + max_tokens=8192，防止五段式内容截断
- 五段式 contentType 固定，AI 服务返回字段名与后端映射必须一致
- 前后端 DTO 字段必须严格对齐（topic/teachingGoal、mode/generateType、duration/estimatedDuration）
- 自定义需求（教材章节、教学笔记）必须完整透传给 AI 服务
- PDF 字体使用微软雅黑，CSS font-family 设为单一字体，避免 fallback
- PDF 行内公式 vertical-align 必须用 em 单位（openhtmltopdf 对 ex 解析不准）

### 5.2 经验教训

- 排查"数据正常但页面空"问题，第一步是打印 useQuery 的 data 看真实结构，而不是查网络层
- MathJax 的 vertical-align 不是简单的 -height/2，而是包含 descender、分数分母等结构的精确偏移
- 含 descender 字母（q、p、g）与普通字母需要差异化处理，固定偏移无法兼顾
- 中英文混排必须使用同一字体文件，避免 fallback 导致 baseline 不一致

---

## 六、后续可优化方向

- 当前 AI 一次性生成五段内容，质量约 60-70%。可改为分段单独生成，每段独立调用 AI，预计质量可提升到 85-90%
- PDF 公式对齐的缩放比例（矮 0.25 / 高 0.5）为经验值，若用户反馈仍不满意可微调
- 可考虑对特定 descender 字母（q、p、g、y）做特殊处理，而非统一缩放
