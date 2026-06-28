package com.lessonplatform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.lessonplatform.common.BusinessException;
import com.lessonplatform.model.LessonContent;
import com.lessonplatform.model.LessonPlan;
import com.lessonplatform.repository.LessonContentMapper;
import com.lessonplatform.repository.LessonPlanMapper;
import com.lessonplatform.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.commonmark.node.Node;
import org.commonmark.parser.Parser;
import org.commonmark.renderer.html.HtmlRenderer;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 备课内容导出服务
 * 将五段式备课内容导出为 PDF
 * 流程：Markdown -> LaTeX 提取渲染 SVG -> 占位替换 -> HTML -> PDF（openhtmltopdf）
 * 公式渲染通过 LatexRendererService 调用 MathJax 子进程，失败时降级为源码显示
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LessonExportService {

    private final LessonPlanMapper lessonPlanMapper;
    private final LessonContentMapper lessonContentMapper;
    private final LatexRendererService latexRendererService;

    private static final Parser PARSER = Parser.builder().build();
    private static final HtmlRenderer HTML_RENDERER = HtmlRenderer.builder().build();

    // 块级公式 $$...$$（非贪婪，跨行支持）
    private static final Pattern DISPLAY_MATH = Pattern.compile("\\$\\$(.+?)\\$\\$", Pattern.DOTALL);
    // 行内公式 $...$（非贪婪，单行内，且 $ 后第一个字符不是 $ 避免与块级冲突）
    private static final Pattern INLINE_MATH = Pattern.compile("(?<![\\\\$])\\$(?!\\$)(.+?)(?<!\\\\)\\$");

    /**
     * 导出备课内容为 PDF
     */
    public byte[] exportLessonToPdf(Long lessonId) {
        Long tutorId = SecurityUtils.getCurrentUserId();

        LessonPlan lessonPlan = lessonPlanMapper.selectOne(new LambdaQueryWrapper<LessonPlan>()
                .eq(LessonPlan::getId, lessonId)
                .eq(LessonPlan::getTutorId, tutorId));

        if (lessonPlan == null) {
            throw new BusinessException("备课记录不存在");
        }

        List<LessonContent> contents = lessonContentMapper.selectList(
                new LambdaQueryWrapper<LessonContent>()
                        .eq(LessonContent::getLessonPlanId, lessonId)
                        .orderByAsc(LessonContent::getSortOrder));

        if (contents.isEmpty()) {
            throw new BusinessException("该备课记录暂无内容，无法导出");
        }

        String html = buildHtml(lessonPlan, contents);

        try {
            return htmlToPdf(html);
        } catch (Exception e) {
            log.error("PDF 导出失败，lessonId={}", lessonId, e);
            throw new BusinessException("PDF 导出失败：" + e.getMessage());
        }
    }

    private String buildHtml(LessonPlan lessonPlan, List<LessonContent> contents) {
        StringBuilder body = new StringBuilder();

        // 标题区
        body.append("<div class='cover'>");
        body.append("<h1>").append(escapeHtml(lessonPlan.getTeachingGoal())).append("</h1>");
        body.append("<div class='meta'>");
        body.append("<span>科目：").append(escapeHtml(lessonPlan.getSubject())).append("</span>");
        if (lessonPlan.getGrade() != null) {
            body.append("<span>年级：").append(escapeHtml(lessonPlan.getGrade())).append("</span>");
        }
        if (lessonPlan.getDifficulty() != null) {
            body.append("<span>难度：").append(escapeHtml(lessonPlan.getDifficulty())).append("</span>");
        }
        if (lessonPlan.getEstimatedDuration() != null) {
            body.append("<span>时长：").append(escapeHtml(lessonPlan.getEstimatedDuration())).append(" 分钟</span>");
        }
        if (lessonPlan.getAiModel() != null) {
            body.append("<span>生成模型：").append(escapeHtml(lessonPlan.getAiModel())).append("</span>");
        }
        body.append("</div>");
        if (!latexRendererService.isAvailable()) {
            body.append("<div class='hint'>提示：MathJax 渲染服务不可用，公式以 LaTeX 源码显示。</div>");
        }
        body.append("</div>");

        // 判定学科是否需要 LaTeX 公式渲染：理科才渲染，文科/语言类跳过避免伪公式卡死导出
        String subject = lessonPlan.getSubject();
        boolean renderFormulas = subject != null
                && (subject.contains("物理") || subject.contains("化学")
                || subject.contains("生物") || subject.contains("数学"));

        // 五段式内容
        for (LessonContent c : contents) {
            body.append("<div class='section'>");
            body.append("<h2>").append(escapeHtml(c.getTitle() != null ? c.getTitle() : c.getContentType()))
                    .append("</h2>");
            body.append(markdownToHtml(c.getContent() != null ? c.getContent() : "", renderFormulas));
            body.append("</div>");
        }

        return "<!DOCTYPE html><html><head><meta charset='UTF-8'/>" + CSS + "</head><body>"
                + body.toString() + "</body></html>";
    }

    /**
     * Markdown 转 HTML，并处理 LaTeX 公式
     * 步骤：
     * 1. 先把 $$...$$ 和 $...$ 替换成唯一占位符（避免 commonmark 破坏 LaTeX 语法）
     * 2. commonmark 转 HTML
     * 3. 占位符替换回 SVG（块级公式用 div.formula-block，行内用 span.formula-inline）
     *
     * @param renderFormulas true 时走 MathJax 渲染；false 时（非理科）把 $...$$ 直接当普通文本，
     *                       避免 AI 误生成的伪公式（如把英语语法套数学公式）卡死导出
     */
    private String markdownToHtml(String markdown, boolean renderFormulas) {
        if (!renderFormulas) {
            // 非理科：直接转 HTML，$ 符号按普通字符处理
            Node document = PARSER.parse(markdown);
            return HTML_RENDERER.render(document);
        }

        // 占位符表：placeholder -> svg html
        java.util.Map<String, String> placeholders = new java.util.HashMap<>();

        String text = markdown;

        // 1. 先处理块级公式 $$...$$
        text = replaceMath(text, DISPLAY_MATH, true, placeholders);
        // 2. 再处理行内公式 $...$
        text = replaceMath(text, INLINE_MATH, false, placeholders);

        // 3. commonmark 转 HTML
        Node document = PARSER.parse(text);
        String html = HTML_RENDERER.render(document);

        // 4. 把占位符替换回 SVG HTML
        for (java.util.Map.Entry<String, String> e : placeholders.entrySet()) {
            html = html.replace(e.getKey(), e.getValue());
        }

        return html;
    }

    /**
     * 用正则匹配公式，渲染 SVG，替换为占位符
     */
    private String replaceMath(String text, Pattern pattern, boolean display,
                               java.util.Map<String, String> placeholders) {
        Matcher m = pattern.matcher(text);
        StringBuffer sb = new StringBuffer();
        while (m.find()) {
            String latex = m.group(1).trim();
            String placeholder = "@@MATH_" + UUID.randomUUID().toString().replace("-", "") + "@@";
            String svgHtml = renderFormulaHtml(latex, display);
            placeholders.put(placeholder, svgHtml);
            m.appendReplacement(sb, Matcher.quoteReplacement(placeholder));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    /**
     * 把单个 LaTeX 公式渲染成 HTML 片段（含 SVG）
     * 渲染失败时降级为 <code> 显示源码
     */
    private String renderFormulaHtml(String latex, boolean display) {
        String svg = latexRendererService.renderToSvg(latex, display);
        if (svg == null || svg.isEmpty()) {
            // 降级：用 code 显示源码
            String escaped = escapeHtml("$" + (display ? "$" : "") + latex + (display ? "$$" : "$"));
            return "<code class='formula-fallback'>" + escaped + "</code>";
        }

        if (display) {
            // 块级公式：移除自带 style，居中显示
            svg = svg.replaceAll("\\s*style=\"[^\"]*\"", "");
            return "<div class='formula-block'>" + svg + "</div>";
        } else {
            // 行内公式：根据公式高度分类处理 vertical-align
            // - 矮公式（height < 2.5ex，如 q、F、E=mc^2）：用固定 -0.17em 对齐文字基线
            //   原因：MathJax 对含 descender 的字母（q、p、g）会多下移以避免 descender 出界，
            //         但在 PDF 中反而让公式主体偏低。固定偏移让所有矮公式视觉一致。
            // - 高公式（height >= 2.5ex，如分数、根号）：保留 MathJax 精确偏移，ex 转 em
            //   原因：高公式的偏移涉及分数分母、根号等结构位置，MathJax 的值是精确的
            svg = applySmartVerticalAlign(svg);
            return "<span class='formula-inline'>" + svg + "</span>";
        }
    }

    /**
     * 智能设置行内公式的 vertical-align
     * 按公式高度分类，统一使用 MathJax 原始 vertical-align 值按比例缩放：
     * - 矮公式（height < 2.5ex，如 q、F、E=mc^2）：MathJax 值 × 0.25
     *   原因：MathJax 对含 descender 的字母（q、p、g）会下移较多（如 -0.671ex），
     *         完整保留会让公式主体在 PDF 中偏低；普通字母（F、r）MathJax 给 -0.338ex，
     *         完整保留也略偏下。按 0.25 缩放后：
     *         q 约 -0.084em（轻微下移，descender 自然下沉），F/r 约 -0.042em（基本对齐基线）。
     * - 高公式（height >= 2.5ex，如分数、根号）：MathJax 值 × 0.5
     *   原因：高公式偏移涉及分数分母、根号等结构位置，需要较大比例保留 MathJax 精确值。
     */
    private String applySmartVerticalAlign(String svg) {
        // 先读取 height（用于分类）
        Pattern heightPattern = Pattern.compile("height=\"([0-9.]+)ex\"");
        Matcher hm = heightPattern.matcher(svg);
        double heightEx = 2.0;
        if (hm.find()) {
            try {
                heightEx = Double.parseDouble(hm.group(1));
            } catch (NumberFormatException ignored) {}
        }

        // 读取 MathJax 原始 vertical-align 值（ex 单位）
        Pattern vaPattern = Pattern.compile("vertical-align:\\s*(-?[0-9.]+)ex");
        Matcher vm = vaPattern.matcher(svg);
        double mathjaxVaEx = 0;
        if (vm.find()) {
            try {
                mathjaxVaEx = Double.parseDouble(vm.group(1));
            } catch (NumberFormatException ignored) {}
        }

        // 移除 SVG 自带的 style 属性
        svg = svg.replaceAll("\\s*style=\"[^\"]*\"", "");

        // 按公式高度选择缩放比例，ex 转 em（1ex ≈ 0.5em）
        double scale = (heightEx < 2.5) ? 0.25 : 0.5;
        double offsetEm = mathjaxVaEx * 0.5 * scale;
        String styleAttr = String.format(java.util.Locale.US,
                " style=\"vertical-align: %.4fem;\"", offsetEm);

        svg = svg.replaceFirst("<svg", "<svg" + styleAttr);
        return svg;
    }

    /**
     * HTML 转 PDF，注册中文字体并启用 SVG（Batik）支持
     */
    private byte[] htmlToPdf(String html) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        com.openhtmltopdf.pdfboxout.PdfRendererBuilder builder =
                new com.openhtmltopdf.pdfboxout.PdfRendererBuilder();

        // 中文字体
        File chineseFont = findChineseFont();
        if (chineseFont != null) {
            builder.useFont(chineseFont, "ChineseFont");
            log.info("PDF 导出使用中文字体：{}", chineseFont.getAbsolutePath());
        }

        // SVG 支持：通过 BatikSVGDrawer 渲染内联 <svg>
        try {
            builder.useSVGDrawer(new com.openhtmltopdf.svgsupport.BatikSVGDrawer());
            log.debug("已启用 BatikSVGDrawer");
        } catch (Throwable t) {
            log.warn("BatikSVGDrawer 初始化失败，SVG 将无法渲染：{}", t.getMessage());
        }

        builder.withHtmlContent(html, null);
        builder.toStream(out);
        builder.run();

        return out.toByteArray();
    }

    private File findChineseFont() {
        // 优先用微软雅黑：同一字体文件含中英文 glyphs，baseline 统一，
        // 避免中英文混排时因 fallback 到不同字体导致水平不齐
        String[] candidates = {
                "C:/Windows/Fonts/msyh.ttc",      // 微软雅黑（中英文混排首选）
                "C:/Windows/Fonts/msyhbd.ttc",    // 微软雅黑粗体
                "C:/Windows/Fonts/simhei.ttf",    // 黑体（纯中文，仅作兜底）
                "C:/Windows/Fonts/simkai.ttf",
                "C:/Windows/Fonts/simsun.ttc",
                "/System/Library/Fonts/PingFang.ttc",
                "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"
        };
        for (String path : candidates) {
            File f = new File(path);
            if (f.exists() && f.canRead()) {
                return f;
            }
        }
        return null;
    }

    private String escapeHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private static final String CSS = "<style>"
            + "@page { size: A4; margin: 2cm 1.8cm; }"
            + "body { font-family: 'ChineseFont'; "
            + "  font-size: 11pt; line-height: 1.7; color: #222; }"
            + ".cover { text-align: center; border-bottom: 2px solid #1677ff; "
            + "  padding-bottom: 16px; margin-bottom: 20px; }"
            + ".cover h1 { font-size: 20pt; color: #1677ff; margin: 0 0 12px 0; }"
            + ".cover .meta { font-size: 10pt; color: #666; }"
            + ".cover .meta span { margin: 0 8px; }"
            + ".cover .hint { font-size: 9pt; color: #d46b08; margin-top: 8px; font-style: italic; }"
            + ".section { margin-bottom: 18px; page-break-inside: avoid; }"
            + ".section h2 { font-size: 14pt; color: #1677ff; "
            + "  border-left: 4px solid #1677ff; padding-left: 8px; margin: 0 0 10px 0; }"
            + "h3 { font-size: 12pt; color: #333; margin: 12px 0 6px 0; }"
            + "h4 { font-size: 11pt; color: #444; margin: 10px 0 6px 0; }"
            + "p { margin: 6px 0; }"
            + "ul, ol { margin: 6px 0; padding-left: 24px; }"
            + "li { margin: 3px 0; }"
            + "blockquote { border-left: 4px solid #fadb14; background: #fffbe6; "
            + "  padding: 6px 12px; margin: 8px 0; color: #555; }"
            + "code { font-family: 'ChineseFont'; "
            + "  background: #f5f5f5; padding: 1px 4px; border-radius: 3px; "
            + "  font-size: 10pt; color: #c41d7f; }"
            + "pre { background: #f5f5f5; padding: 10px; border-radius: 4px; "
            + "  overflow-x: auto; font-size: 10pt; }"
            + "pre code { background: none; color: #333; padding: 0; }"
            + "table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 10pt; }"
            + "th, td { border: 1px solid #d9d9d9; padding: 6px 10px; text-align: left; }"
            + "th { background: #fafafa; font-weight: bold; }"
            + "strong { font-weight: bold; color: #000; }"
            + "hr { border: none; border-top: 1px solid #e8e8e8; margin: 16px 0; }"
            // 公式渲染样式
            + ".formula-block { text-align: center; margin: 12px 0; page-break-inside: avoid; }"
            + ".formula-block svg { max-width: 100%; height: auto; }"
            // 行内公式：vertical-align 由 SVG 自带 style 控制（已把 ex 转 em）
            + ".formula-inline { display: inline-block; }"
            + ".formula-inline svg { display: inline-block; }"
            + ".formula-fallback { background: #fff7e6; color: #d46b08; "
            + "  padding: 2px 6px; border-radius: 3px; }"
            + "</style>";
}
