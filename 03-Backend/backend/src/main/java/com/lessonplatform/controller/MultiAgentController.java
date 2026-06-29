package com.lessonplatform.controller;

import com.lessonplatform.common.Result;
import com.lessonplatform.service.MultiAgentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import reactor.core.publisher.Flux;

import java.io.IOException;
import java.util.Map;

/**
 * Multi-Agent 控制器（阶段 4：多智能体协作）
 *
 * 提供两个端点：
 * 1. GET /multi-agent/run      — SSE 流式运行 Multi-Agent 工作流（前端用 EventSource 连接）
 * 2. GET /multi-agent/state    — 查询工作流 State（断线恢复用，从 Redis 读取）
 *
 * 安全说明：
 * - /multi-agent/** 在 SecurityConfig 中设为 permitAll（与 /conversation/** 一致）
 * - 因为浏览器原生 EventSource 不支持自定义 Header，token 通过 query 参数传递
 *
 * 实现说明：
 * - 用 SseEmitter（专门为 SSE 设计，自动处理 data: 前缀和 \n\n 结尾）
 * - 超时设为 0L（永不超时），Multi-Agent 工作流可能执行 1-3 分钟
 * - 用 WebClient bodyToFlux(String.class) 按行接收 AI 服务的 SSE 流
 * - 每遇到 data: 行，提取内容后用 SseEmitter.send 重新封装发送
 */
@RestController
@RequestMapping("/multi-agent")
@RequiredArgsConstructor
@Slf4j
public class MultiAgentController {

    private final MultiAgentService multiAgentService;

    /**
     * SSE 流式运行 Multi-Agent 工作流
     *
     * 前端用 EventSource 连接：
     *   const es = new EventSource('/api/multi-agent/run?userRequest=xxx&sessionId=xxx&useFullWorkflow=true&token=xxx');
     *   es.onmessage = (e) => { const event = JSON.parse(e.data); ... };
     *
     * SSE 事件类型（由 AI 服务产生，后端透传）：
     * - agent_start / agent_complete / qa_reject / workflow_complete / agent_error
     *
     * @param userRequest      用户需求（如"初二物理牛顿第二定律备课，45分钟"）
     * @param sessionId        会话 ID（用于 Redis 持久化，前端生成）
     * @param useFullWorkflow  是否使用完整工作流（含质检打回循环），默认 true
     * @param token            JWT token（query 参数，因为 EventSource 不支持 Header）
     */
    @GetMapping(value = "/run", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter runMultiAgent(
            @RequestParam String userRequest,
            @RequestParam String sessionId,
            @RequestParam(defaultValue = "true") boolean useFullWorkflow,
            @RequestParam(required = false) String token) {

        log.info("Multi-Agent SSE 请求: sessionId={}, useFullWorkflow={}, userRequest={}",
                sessionId, useFullWorkflow, userRequest.length() > 50 ? userRequest.substring(0, 50) : userRequest);

        // 0L = 永不超时
        SseEmitter emitter = new SseEmitter(0L);

        final String finalToken = token;

        // 订阅 WebClient 的 Flux，按行接收 AI 服务的 SSE 流
        Flux<String> lineFlux = multiAgentService.runMultiAgentStreamLines(
                userRequest, sessionId, useFullWorkflow, finalToken);

        lineFlux.subscribe(
                line -> {
                    // WebClient 对 text/event-stream 用 ServerSentEventHttpMessageReader，
                    // 自动解析 SSE 格式，line 已是去掉 "data:" 前缀的事件数据（JSON 字符串）
                    if (line != null && !line.trim().isEmpty()) {
                        try {
                            emitter.send(SseEmitter.event().data(line));
                        } catch (IOException e) {
                            log.warn("发送 SSE 事件失败: sessionId={}, error={}", sessionId, e.getMessage());
                        }
                    }
                },
                error -> {
                    log.error("Multi-Agent SSE 流错误: sessionId={}", sessionId, error);
                    try {
                        emitter.send(SseEmitter.event().data(
                                "{\"type\":\"agent_error\",\"error\":\"" + error.getMessage().replace("\"", "'") + "\"}"));
                    } catch (IOException ignored) {
                    }
                    emitter.completeWithError(error);
                },
                () -> {
                    log.info("Multi-Agent SSE 流完成: sessionId={}", sessionId);
                    emitter.complete();
                }
        );

        return emitter;
    }

    /**
     * 查询 Multi-Agent 工作流的 State（断线恢复用）
     *
     * 前端在页面刷新后调用此端点，从 Redis 恢复之前的工作流状态。
     *
     * @param sessionId 会话 ID
     * @return {success, state, session_id} 或 {success: false, error}
     */
    @GetMapping("/state")
    public Result<Map<String, Object>> getState(@RequestParam String sessionId) {
        Map<String, Object> state = multiAgentService.getMultiAgentState(sessionId);
        return Result.success(state);
    }
}

