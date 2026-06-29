package com.lessonplatform.controller;

import com.lessonplatform.common.Result;
import com.lessonplatform.security.SecurityUtils;
import com.lessonplatform.service.AiService;
import com.lessonplatform.service.ConversationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * 对话会话控制器（阶段 2b-2：Agent 短期对话记忆）
 *
 * 提供会话的创建、消息发送和历史查询功能。
 * 消息通过后端 Redis 持久化，支持多轮上下文。
 */
@RestController
@RequestMapping("/conversation")
@RequiredArgsConstructor
public class ConversationController {

    private final ConversationService conversationService;
    private final AiService aiService;

    /**
     * 创建新会话
     */
    @PostMapping("/create")
    public Result<Map<String, Object>> createSession() {
        Long userId = SecurityUtils.getCurrentUserId();
        String sessionId = conversationService.createSession(userId);
        Map<String, Object> data = new HashMap<>();
        data.put("sessionId", sessionId);
        return Result.success("会话创建成功", data);
    }

    /**
     * 发送消息到 Agent（阶段 3：支持 Planning 逐步执行模式）
     *
     * 请求体字段：
     * - sessionId: 会话 ID（必填）
     * - message: 用户消息（plan 模式下必填，其他模式可选）
     * - mode: 模式（plan / execute_step / summary / null=旧模式）
     * - planStep: 当前步骤信息（execute_step 模式必填）
     * - plan: 完整计划（summary 模式必填）
     *
     * 流程：
     * 1. 保存用户消息到 Redis（plan 模式或有 message 时）
     * 2. 调 AI 服务 Agent 端点（附带历史消息 + mode + 额外参数）
     * 3. 保存 AI 回复到 Redis
     * 4. 返回结果
     */
    @PostMapping("/send")
    public Result<Map<String, Object>> sendMessage(@RequestBody Map<String, Object> request) {
        String sessionId = (String) request.get("sessionId");
        String message = (String) request.get("message");
        String mode = (String) request.get("mode");

        if (sessionId == null) {
            return Result.error("缺少 sessionId");
        }

        // 检查会话是否存在
        if (!conversationService.sessionExists(sessionId)) {
            return Result.error("会话不存在或已过期");
        }

        // 1. 保存用户消息（plan 模式或有 message 时）
        if (message != null && !message.trim().isEmpty()) {
            conversationService.addUserMessage(sessionId, message);
        }

        // 2. 获取完整历史消息
        List<Map<String, Object>> history = conversationService.getMessages(sessionId);

        // 3. 调用 AI 服务（根据 mode 传不同参数）
        Map<String, Object> extra = new HashMap<>();
        if ("execute_step".equals(mode)) {
            @SuppressWarnings("unchecked")
            Map<String, Object> planStep = (Map<String, Object>) request.get("planStep");
            extra.put("plan_step", planStep);
        } else if ("summary".equals(mode)) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> plan = (List<Map<String, Object>>) request.get("plan");
            extra.put("plan", plan);
        }

        Map<String, Object> aiResponse = aiService.callAgent(history, mode, extra);

        // 4. 提取 AI 回复内容并保存到 Redis
        String assistantContent = "";
        String responseType = (String) aiResponse.getOrDefault("type", "");

        if ("plan".equals(responseType)) {
            // 计划模式：把计划摘要作为 assistant 消息存入
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> plan = (List<Map<String, Object>>) aiResponse.getOrDefault("plan", new ArrayList<>());
            StringBuilder sb = new StringBuilder("📋 执行计划（共" + plan.size() + "步）：\n");
            for (Map<String, Object> step : plan) {
                sb.append("  ").append(step.get("step")).append(". ").append(step.get("name"));
                if (step.get("description") != null) {
                    sb.append(" - ").append(step.get("description"));
                }
                sb.append("\n");
            }
            assistantContent = sb.toString();
        } else if ("step_result".equals(responseType)) {
            // 步骤结果模式
            assistantContent = "✅ 第" + aiResponse.get("step") + "步完成：" + aiResponse.get("step_name")
                    + "\n\n" + aiResponse.getOrDefault("result", "");
        } else if ("summary".equals(responseType)) {
            // 总结模式
            assistantContent = (String) aiResponse.getOrDefault("summary", "所有步骤已完成");
        } else {
            // 旧模式或 error
            assistantContent = (String) aiResponse.getOrDefault("final_answer",
                    aiResponse.getOrDefault("message", "未知响应"));
        }

        // 保存 AI 回复
        Map<String, Object> traceData = new HashMap<>();
        Object trace = aiResponse.get("trace");
        if (trace != null) {
            traceData.put("trace", trace);
        }
        if (aiResponse.get("plan") != null) {
            traceData.put("plan", aiResponse.get("plan"));
        }
        conversationService.addAssistantMessage(sessionId, assistantContent, traceData);

        // 5. 返回完整响应给前端
        Map<String, Object> result = new LinkedHashMap<>();
        result.putAll(aiResponse);
        result.put("sessionId", sessionId);

        return Result.success(result);
    }

    /**
     * 获取会话历史消息
     */
    @GetMapping("/{sessionId}/history")
    public Result<Map<String, Object>> getHistory(@PathVariable String sessionId) {
        if (!conversationService.sessionExists(sessionId)) {
            return Result.error("会话不存在或已过期");
        }

        List<Map<String, Object>> messages = conversationService.getMessages(sessionId);

        Map<String, Object> data = new HashMap<>();
        data.put("sessionId", sessionId);
        data.put("messages", messages);
        data.put("total", messages.size());

        return Result.success(data);
    }

    /**
     * 删除会话
     */
    @DeleteMapping("/{sessionId}")
    public Result<Void> deleteSession(@PathVariable String sessionId) {
        conversationService.deleteSession(sessionId);
        return Result.success("会话已删除", null);
    }
}