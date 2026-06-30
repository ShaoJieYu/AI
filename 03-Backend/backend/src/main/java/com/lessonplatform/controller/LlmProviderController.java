package com.lessonplatform.controller;

import com.lessonplatform.common.Result;
import com.lessonplatform.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * LLM Provider 转发控制器
 *
 * 将前端请求转发到 AI 服务（Python FastAPI，运行在 http://localhost:8001）。
 * 提供 LLM Provider 查询、切换及状态查询能力。
 * 走默认鉴权（需要登录），前端会带 JWT token 请求。
 */
@RestController
@RequestMapping("/llm")
@RequiredArgsConstructor
public class LlmProviderController {

    private final AiService aiService;

    /**
     * 获取当前 LLM Provider 及可选项列表
     */
    @GetMapping("/provider")
    public Result<Map<String, Object>> getLlmProvider() {
        Map<String, Object> data = aiService.getLlmProvider();
        return Result.success(data);
    }

    /**
     * 切换 LLM Provider
     *
     * 请求体字段：
     * - provider: "cloud" | "local"
     */
    @PostMapping("/provider")
    public Result<Map<String, Object>> switchLlmProvider(@RequestBody Map<String, Object> request) {
        String provider = (String) request.get("provider");
        if (provider == null || provider.trim().isEmpty()) {
            return Result.error("缺少 provider 参数");
        }
        Map<String, Object> data = aiService.switchLlmProvider(provider);
        return Result.success(data);
    }

    /**
     * 获取 LLM 状态
     */
    @GetMapping("/status")
    public Result<Map<String, Object>> getLlmStatus() {
        Map<String, Object> data = aiService.getLlmStatus();
        return Result.success(data);
    }
}
