package com.lessonplatform.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;

/**
 * LaTeX 公式渲染服务
 * 通过 fork Node.js 子进程调用 mathjax-node，把 LaTeX 公式渲染成 SVG
 * 协议：每行一个 JSON 请求 / 一个 JSON 响应（id 配对）
 * 缓存：按 (latex + display) 哈希缓存 SVG，避免重复渲染
 */
@Slf4j
@Service
public class LatexRendererService {

    /** MathJax 渲染器脚本根目录（含 renderer.js 和 node_modules） */
    @Value("${app.mathjax.renderer-dir:d:/AI/05-Infrastructure/mathjax-renderer}")
    private String rendererDir;

    /** Node 可执行文件路径，默认 PATH 中查找 */
    @Value("${app.mathjax.node-exec:node}")
    private String nodeExec;

    /** 单次渲染超时（毫秒），默认 8s：兼顾复杂公式渲染与导出总耗时控制 */
    @Value("${app.mathjax.timeout-ms:8000}")
    private long timeoutMs;

    private final ObjectMapper mapper = new ObjectMapper();

    /** SVG 缓存：key = display + "|" + latex */
    private final ConcurrentHashMap<String, String> svgCache = new ConcurrentHashMap<>();

    /** 子进程读写锁（单写多读不适用，渲染需串行访问 stdin/stdout） */
    private final ReentrantLock processLock = new ReentrantLock();

    private Process nodeProcess;
    private BufferedWriter processStdin;
    private BufferedReader processStdout;

    @PostConstruct
    public void start() {
        try {
            ProcessBuilder pb = new ProcessBuilder(nodeExec, "renderer.js");
            pb.directory(new File(rendererDir));
            pb.redirectErrorStream(false);
            // 清除代理环境变量，避免 Node 走代理（mathjax-node 不需要联网）
            pb.environment().remove("HTTP_PROXY");
            pb.environment().remove("HTTPS_PROXY");
            pb.environment().remove("http_proxy");
            pb.environment().remove("https_proxy");

            nodeProcess = pb.start();
            processStdin = new BufferedWriter(
                    new OutputStreamWriter(nodeProcess.getOutputStream(), StandardCharsets.UTF_8));
            processStdout = new BufferedReader(
                    new InputStreamReader(nodeProcess.getInputStream(), StandardCharsets.UTF_8));

            // 等待就绪信号 {"id":"__ready__",...}
            String readyLine = processStdout.readLine();
            if (readyLine == null || !readyLine.contains("__ready__")) {
                throw new IllegalStateException("MathJax 子进程未发送就绪信号，收到: " + readyLine);
            }
            log.info("MathJax 渲染子进程已启动，目录: {}", rendererDir);
        } catch (Exception e) {
            log.error("启动 MathJax 子进程失败，PDF 公式将降级为源码显示", e);
            nodeProcess = null;
        }
    }

    @PreDestroy
    public void stop() {
        if (nodeProcess == null) return;
        try {
            processLock.lock();
            try {
                processStdin.write("{\"id\":\"__shutdown__\"}\n");
                processStdin.flush();
            } finally {
                processLock.unlock();
            }
            if (!nodeProcess.waitFor(2, TimeUnit.SECONDS)) {
                nodeProcess.destroyForcibly();
                log.warn("MathJax 子进程未在 2 秒内退出，已强制销毁");
            } else {
                log.info("MathJax 渲染子进程已正常退出");
            }
        } catch (Exception e) {
            log.warn("关闭 MathJax 子进程异常", e);
            nodeProcess.destroyForcibly();
        }
    }

    /**
     * 渲染 LaTeX 公式为 SVG
     *
     * @param latex  LaTeX 源码（不含 $ 定界符）
     * @param display true=块级公式（居中、displaystyle），false=行内公式
     * @return SVG 字符串；若子进程不可用或渲染失败返回 null（调用方降级为源码显示）
     */
    public String renderToSvg(String latex, boolean display) {
        if (nodeProcess == null || !nodeProcess.isAlive()) {
            log.warn("MathJax 子进程不可用，公式将降级为源码显示: {}", latex);
            return null;
        }

        String cacheKey = (display ? "1|" : "0|") + latex;
        String cached = svgCache.get(cacheKey);
        if (cached != null) {
            return cached;
        }

        String id = UUID.randomUUID().toString().replace("-", "");
        try {
            ObjectNode req = mapper.createObjectNode();
            req.put("id", id);
            req.put("latex", latex);
            req.put("display", display);
            String reqLine = mapper.writeValueAsString(req);

            String respLine;
            processLock.lock();
            try {
                processStdin.write(reqLine);
                processStdin.write("\n");
                processStdin.flush();

                // 等待响应（带超时）
                long deadline = System.currentTimeMillis() + timeoutMs;
                while (System.currentTimeMillis() < deadline) {
                    if (processStdout.ready()) {
                        respLine = processStdout.readLine();
                        if (respLine == null) {
                            log.error("MathJax 子进程 stdout 已关闭");
                            return null;
                        }
                        JsonNode resp = mapper.readTree(respLine);
                        String respId = resp.path("id").asText();
                        if (!id.equals(respId)) {
                            // id 不匹配，跳过该行继续等
                            log.warn("MathJax 响应 id 不匹配，期望 {} 收到 {}", id, respId);
                            continue;
                        }
                        if (resp.has("error") && !resp.path("error").isNull()) {
                            log.warn("MathJax 渲染失败: latex={}, error={}", latex, resp.path("error").asText());
                            return null;
                        }
                        String svg = resp.path("svg").asText("");
                        if (svg.isEmpty()) {
                            return null;
                        }
                        svgCache.put(cacheKey, svg);
                        return svg;
                    }
                    Thread.sleep(20);
                }
                log.error("MathJax 渲染超时（{}ms）: {}", timeoutMs, latex);
                return null;
            } finally {
                processLock.unlock();
            }
        } catch (Exception e) {
            log.error("调用 MathJax 子进程异常: latex={}", latex, e);
            return null;
        }
    }

    /**
     * 渲染器是否可用（用于调用方决定是否走降级路径）
     */
    public boolean isAvailable() {
        return nodeProcess != null && nodeProcess.isAlive();
    }
}
