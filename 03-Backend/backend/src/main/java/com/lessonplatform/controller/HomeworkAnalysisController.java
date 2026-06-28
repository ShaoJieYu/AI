package com.lessonplatform.controller;

import com.lessonplatform.common.Result;
import com.lessonplatform.model.HomeworkAnalysisRecord;
import com.lessonplatform.service.HomeworkAnalysisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/homework")
@RequiredArgsConstructor
@Slf4j
public class HomeworkAnalysisController {

    private final HomeworkAnalysisService homeworkAnalysisService;

    @PostMapping("/analyze")
    public Result<HomeworkAnalysisRecord> analyzeHomeworkImages(@RequestParam("images") MultipartFile[] images) {
        try {
            List<String> base64Images = new ArrayList<>();
            for (MultipartFile file : images) {
                if (!file.isEmpty()) {
                    String base64 = Base64.getEncoder().encodeToString(file.getBytes());
                    base64Images.add(base64);
                }
            }

            if (base64Images.isEmpty()) {
                return Result.error("No images provided");
            }

            HomeworkAnalysisRecord record = homeworkAnalysisService.analyzeAndSave(base64Images);
            return Result.success("分析成功", record);
        } catch (Exception e) {
            log.error("Failed to analyze homework images", e);
            return Result.error(e.getMessage());
        }
    }

    @PostMapping("/{id}/save-pdf")
    public Result<HomeworkAnalysisRecord> savePdfUrl(@PathVariable Long id, @RequestBody Map<String, String> request) {
        try {
            String pdfUrl = request.get("pdfUrl");
            HomeworkAnalysisRecord record = homeworkAnalysisService.updatePdfUrl(id, pdfUrl);
            return Result.success("保存成功", record);
        } catch (Exception e) {
            log.error("Failed to update PDF URL", e);
            return Result.error(e.getMessage());
        }
    }
}
