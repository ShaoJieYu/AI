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
     * 发送消息到 Agent（带会话上下文）
     *
     * 流程：
     * 1. 保存用户消息到 Redis
     * 2. 调 AI 服务 Agent 端点（附带历史消息）
     * 3. 保存 AI 回复到 Redis
     * 4. 返回回复内容 + 决策轨迹
     */
    @PostMapping("/send")
    public Result<Map<String, Object>> sendMessage(@RequestBody Map<String, String> request) {
        String sessionId = request.get("sessionId");
        String message = request.get("message");

        if (sessionId == null || message == null || message.trim().isEmpty()) {
            return Result.error("参数不完整");
        }

        // 检查会话是否存在
        if (!conversationService.sessionExists(sessionId)) {
            return Result.error("会话不存在或已过期");
        }

        // 1. 保存用户消息
        conversationService.addUserMessage(sessionId, message);

        // 2. 获取完整历史消息
        List<Map<String, Object>> history = conversationService.getMessages(sessionId);

        // 3. 调用 AI 服务 Agent 端点
        Map<String, Object> aiResponse = aiService.callAgent(history);

        // 4. 提取结果
        String finalAnswer = (String) aiResponse.getOrDefault("final_answer", "");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> trace = (List<Map<String, Object>>) aiResponse.getOrDefault("trace", new ArrayList<>());

        // 5. 保存 AI 回复到 Redis
        Map<String, Object> traceData = new HashMap<>();
        traceData.put("trace", trace);
        conversationService.addAssistantMessage(sessionId, finalAnswer, traceData);

        // 6. 返回给前端
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("finalAnswer", finalAnswer);
        result.put("trace", trace);
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