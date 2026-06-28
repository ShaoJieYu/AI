package com.lessonplatform.controller;

import com.lessonplatform.common.PageQuery;
import com.lessonplatform.common.PageResult;
import com.lessonplatform.common.Result;
import com.lessonplatform.dto.LessonGenerateRequest;
import com.lessonplatform.model.LessonContent;
import com.lessonplatform.model.LessonPlan;
import com.lessonplatform.service.LessonExportService;
import com.lessonplatform.service.LessonService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

/**
 * 备课控制器
 */
@Slf4j
@RestController
@RequestMapping("/lessons")
@RequiredArgsConstructor
public class LessonController {

    private final LessonService lessonService;
    private final LessonExportService lessonExportService;

    @GetMapping
    public Result<PageResult<LessonPlan>> getLessonPlanList(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status) {

        PageQuery query = new PageQuery();
        query.setPage(page);
        query.setPageSize(pageSize);

        PageResult<LessonPlan> result = lessonService.getLessonPlanList(query, keyword, status);
        return Result.success(result);
    }

    @GetMapping("/{id}")
    public Result<LessonPlan> getLessonPlanById(@PathVariable Long id) {
        LessonPlan lessonPlan = lessonService.getLessonPlanById(id);
        return Result.success(lessonPlan);
    }

    @GetMapping("/{id}/contents")
    public Result<List<LessonContent>> getLessonContents(@PathVariable Long id) {
        List<LessonContent> contents = lessonService.getLessonContents(id);
        return Result.success(contents);
    }

    @PostMapping("/generate")
    public Result<LessonPlan> generateLessonPlan(@Valid @RequestBody LessonGenerateRequest request) {
        LessonPlan lessonPlan = lessonService.generateLessonPlan(request);
        return Result.success("备课内容生成成功", lessonPlan);
    }

    @DeleteMapping("/{id}")
    public Result<Void> deleteLessonPlan(@PathVariable Long id) {
        lessonService.deleteLessonPlan(id);
        return Result.success("删除成功", null);
    }

    /**
     * 导出备课内容
     * 目前支持 pdf；word 暂未实现，返回 400 提示
     */
    @GetMapping("/{id}/export")
    public ResponseEntity<?> exportLesson(@PathVariable Long id, @RequestParam String format) {
        if (!"pdf".equalsIgnoreCase(format)) {
            return ResponseEntity.badRequest().body(
                    Result.error("暂不支持 " + format + " 格式导出，目前仅支持 pdf"));
        }

        byte[] pdfBytes = lessonExportService.exportLessonToPdf(id);

        // 文件名用备课主题，URL 编码避免乱码
        LessonPlan lesson = lessonService.getLessonPlanById(id);
        String fileName = "备课_" + (lesson.getTeachingGoal() != null ? lesson.getTeachingGoal() : String.valueOf(id)) + ".pdf";
        String encodedFileName = URLEncoder.encode(fileName, StandardCharsets.UTF_8).replace("+", "%20");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.set(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"" + encodedFileName + "\"; filename*=UTF-8''" + encodedFileName);
        headers.setContentLength(pdfBytes.length);

        return new ResponseEntity<>(pdfBytes, headers, org.springframework.http.HttpStatus.OK);
    }

    @GetMapping("/statistics")
    public Result<Map<String, Object>> getLessonStatistics() {
        Map<String, Object> statistics = lessonService.getLessonStatistics();
        return Result.success(statistics);
    }
}
