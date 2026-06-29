package com.lessonplatform.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * 对话会话管理服务（Redis 持久化）
 *
 * 每个 session 对应一次 Agent 对话，支持多轮消息上下文。
 * Redis key: conversation:{sessionId} (String, JSON)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ConversationService {

    private static final String KEY_PREFIX = "conversation:";
    private static final long SESSION_TTL_HOURS = 24;

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    /**
     * 创建新会话
     */
    public String createSession(Long userId) {
        String sessionId = UUID.randomUUID().toString().replace("-", "");
        String key = KEY_PREFIX + sessionId;

        Map<String, Object> session = new LinkedHashMap<>();
        session.put("sessionId", sessionId);
        session.put("userId", userId);
        session.put("createdAt", System.currentTimeMillis());
        session.put("messages", new ArrayList<>());

        try {
            redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(session),
                    SESSION_TTL_HOURS, TimeUnit.HOURS);
            log.info("创建对话会话: sessionId={}, userId={}", sessionId, userId);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("序列化会话失败", e);
        }

        return sessionId;
    }

    /**
     * 获取会话中的所有消息
     */
    public List<Map<String, Object>> getMessages(String sessionId) {
        Map<String, Object> session = getSession(sessionId);
        if (session == null) return Collections.emptyList();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> messages = (List<Map<String, Object>>) session.get("messages");
        return messages != null ? messages : Collections.emptyList();
    }

    /**
     * 添加一条消息到会话
     */
    public void addMessage(String sessionId, String role, String content, Map<String, Object> extra) {
        String key = KEY_PREFIX + sessionId;
        Map<String, Object> session = getSession(sessionId);
        if (session == null) {
            log.warn("会话不存在: sessionId={}", sessionId);
            return;
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> messages = (List<Map<String, Object>>) session.get("messages");
        if (messages == null) {
            messages = new ArrayList<>();
            session.put("messages", messages);
        }

        Map<String, Object> msg = new LinkedHashMap<>();
        msg.put("role", role);
        msg.put("content", content);
        msg.put("timestamp", System.currentTimeMillis());
        if (extra != null) {
            msg.putAll(extra);
        }
        messages.add(msg);

        try {
            // 刷新 TTL
            redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(session),
                    SESSION_TTL_HOURS, TimeUnit.HOURS);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("序列化会话失败", e);
        }
    }

    /**
     * 添加用户消息
     */
    public void addUserMessage(String sessionId, String content) {
        addMessage(sessionId, "user", content, null);
    }

    /**
     * 添加 Agent 回复消息
     */
    public void addAssistantMessage(String sessionId, String content, Map<String, Object> traceData) {
        Map<String, Object> extra = new HashMap<>();
        if (traceData != null) {
            extra.put("trace", traceData.get("trace"));
        }
        addMessage(sessionId, "assistant", content, extra);
    }

    /**
     * 删除会话
     */
    public void deleteSession(String sessionId) {
        String key = KEY_PREFIX + sessionId;
        redisTemplate.delete(key);
        log.info("删除对话会话: sessionId={}", sessionId);
    }

    /**
     * 检查会话是否存在
     */
    public boolean sessionExists(String sessionId) {
        String key = KEY_PREFIX + sessionId;
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }

    // ===== 内部方法 =====

    @SuppressWarnings("unchecked")
    private Map<String, Object> getSession(String sessionId) {
        String key = KEY_PREFIX + sessionId;
        String json = redisTemplate.opsForValue().get(key);
        if (json == null) return null;
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (JsonProcessingException e) {
            log.error("反序列化会话失败: sessionId={}", sessionId, e);
            return null;
        }
    }
}