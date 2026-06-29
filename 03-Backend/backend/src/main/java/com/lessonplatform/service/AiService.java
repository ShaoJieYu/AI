package com.lessonplatform.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * AI服务类 - 用于调用外部AI服务生成备课内容
 */
@Service
@Slf4j
public class AiService {

    private final WebClient webClient;

    public AiService(@Value("${ai.service.url}") String aiServiceUrl) {
        this.webClient = WebClient.builder()
                .baseUrl(aiServiceUrl)
                .build();
    }

    public Map<String, String> generateLessonContent(Map<String, Object> params) {
        log.info("开始生成备课内容，参数：{}", params);

        try {
            Map<String, Object> request = new HashMap<>();
            request.put("subject", params.get("subject"));
            request.put("teaching_goal", params.get("teachingGoal"));
            request.put("difficulty", params.getOrDefault("difficulty", "中等"));

            if (params.containsKey("student")) {
                request.put("student_info", params.get("student"));
            }

            // 注入学生薄弱知识点
            if (params.containsKey("weakPoints")) {
                request.put("weak_points", params.get("weakPoints"));
            }

            // 透传备课模式、时长、自定义要求（含学段/课本/章节/教学备注）给 AI 服务
            if (params.get("mode") != null) {
                request.put("mode", params.get("mode"));
            }
            if (params.get("duration") != null) {
                request.put("duration", params.get("duration"));
            }
            if (params.get("customRequirements") != null) {
                request.put("custom_requirements", params.get("customRequirements"));
            }

            Map<String, String> result = webClient.post()
                    .uri("/api/generate-lesson")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(120))
                    .block();

            log.info("备课内容生成完成，返回字段：{}", result != null ? result.keySet() : "null");
            return result;
        } catch (Exception e) {
            log.error("AI服务调用失败，将返回兜底内容", e);
            return generateFallbackContent(params);
        }
    }

    public Map<String, String> analyzeHomework(List<String> base64Images) {
        log.info("开始调用AI分析作业图片，图片数量：{}", base64Images.size());
        try {
            Map<String, Object> request = new HashMap<>();
            request.put("images", base64Images);

            Map<String, String> result = webClient.post()
                    .uri("/api/analyze-homework-images")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(120))
                    .block();

            log.info("作业图片分析完成");
            return result;
        } catch (Exception e) {
            log.error("AI图片分析失败", e);
            Map<String, String> fallback = new HashMap<>();
            fallback.put("wrongQuestions", "解析失败，请检查AI服务");
            fallback.put("errorAnalysis", "解析失败");
            fallback.put("knowledgePoints", "解析失败");
            fallback.put("suggestions", "解析失败");
            return fallback;
        }
    }

    /**
     * 调用 AI 服务 Agent 端点（带会话消息列表）
     *
     * @param messages 历史消息列表 [{role, content}, ...]
     * @return Agent 返回结果 {final_answer, trace}
     */
    public Map<String, Object> callAgent(List<Map<String, Object>> messages) {
        log.info("调用 Agent 端点，消息数：{}", messages.size());

        try {
            Map<String, Object> request = new HashMap<>();
            request.put("messages", messages);

            Map<String, Object> result = webClient.post()
                    .uri("/api/agent/demo")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(180))
                    .block();

            log.info("Agent 调用完成");
            return result;
        } catch (Exception e) {
            log.error("Agent 调用失败", e);
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("final_answer", "Agent 服务暂时不可用，请稍后重试。错误：" + e.getMessage());
            fallback.put("trace", new ArrayList<>());
            return fallback;
        }
    }

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
}
