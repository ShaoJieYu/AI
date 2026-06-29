package com.lessonplatform.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * Multi-Agent 服务（阶段 4：多智能体协作）
 *
 * 职责：
 * 1. 流式调用 AI 服务的 /multi-agent/run SSE 端点，转发给前端
 * 2. 查询 AI 服务的 /multi-agent/state 端点，读取 Redis 中的工作流 State（断线恢复用）
 *
 * 说明：
 * - 后端仅做 SSE 流的透传，不解析事件内容（前端自己解析）
 * - AI 服务负责实际的工作流编排、Agent 调用、Redis 持久化
 * - token 通过 query 参数传递（EventSource 不支持自定义 Header）
 */
@Service
@Slf4j
public class MultiAgentService {

    private final WebClient webClient;

    public MultiAgentService(@Value("${ai.service.url}") String aiServiceUrl) {
        this.webClient = WebClient.builder()
                .baseUrl(aiServiceUrl)
                .build();
    }

    /**
     * 流式调用 AI 服务的 Multi-Agent SSE 端点，按行接收
     *
     * WebClient 对 text/event-stream 内容类型用 bodyToFlux(String.class) 会按行分割。
     * 每行是一个 String，形如 "data: {...}" 或空行。
     *
     * @param userRequest      用户需求（如"初二物理牛顿第二定律备课"）
     * @param sessionId        会话 ID（用于 Redis 持久化）
     * @param useFullWorkflow  是否使用完整工作流（含质检打回循环）
     * @param token            JWT token（透传给 AI 服务，用于调用后端保存接口）
     * @return SSE 行流 Flux<String>，每个元素是一行
     */
    public Flux<String> runMultiAgentStreamLines(String userRequest, String sessionId,
                                                  boolean useFullWorkflow, String token) {
        log.info("调用 Multi-Agent SSE 端点: sessionId={}, useFullWorkflow={}", sessionId, useFullWorkflow);

        String uri = UriComponentsBuilder.fromPath("/multi-agent/run")
                .queryParam("user_request", userRequest)
                .queryParam("session_id", sessionId)
                .queryParam("use_full_workflow", useFullWorkflow)
                .toUriString();

        WebClient.RequestHeadersSpec<?> spec = webClient.get()
                .uri(uri)
                .accept(MediaType.TEXT_EVENT_STREAM);

        if (token != null && !token.isEmpty()) {
            spec.header("Authorization", "Bearer " + token);
        }

        // 按 行 接收 AI 服务的 SSE 响应（不设全局超时，让工作流跑完）
        return spec.retrieve().bodyToFlux(String.class);
    }

    /**
     * 查询 Multi-Agent 工作流的 State（从 AI 服务的 Redis 读取）
     *
     * @param sessionId 会话 ID
     * @return State 字典 {success, state, session_id} 或 {success: false, error}
     */
    public Map<String, Object> getMultiAgentState(String sessionId) {
        log.info("查询 Multi-Agent State: sessionId={}", sessionId);

        try {
            String uri = UriComponentsBuilder.fromPath("/multi-agent/state")
                    .queryParam("session_id", sessionId)
                    .toUriString();

            @SuppressWarnings("unchecked")
            Map<String, Object> result = webClient.get()
                    .uri(uri)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            log.info("Multi-Agent State 查询完成: sessionId={}, success={}",
                    sessionId, result != null && result.get("success") != null ? result.get("success") : "null");
            return result;
        } catch (Exception e) {
            log.error("查询 Multi-Agent State 失败: sessionId={}", sessionId, e);
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("error", "查询失败: " + e.getMessage());
            err.put("session_id", sessionId);
            return err;
        }
    }
}

