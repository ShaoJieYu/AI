package com.lessonplatform.service;

import com.lessonplatform.model.HomeworkAnalysisRecord;
import com.lessonplatform.repository.HomeworkAnalysisRecordMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class HomeworkAnalysisService {

    private final AiService aiService;
    private final HomeworkAnalysisRecordMapper mapper;
    private final StudentWeakPointService weakPointService;

    public HomeworkAnalysisRecord analyzeAndSave(List<String> base64Images) {
        return analyzeAndSave(base64Images, null);
    }

    public HomeworkAnalysisRecord analyzeAndSave(List<String> base64Images, Long studentId) {
        log.info("Receiving {} images for homework analysis, studentId={}", base64Images.size(), studentId);
        Map<String, String> aiResult = aiService.analyzeHomework(base64Images);

        HomeworkAnalysisRecord record = new HomeworkAnalysisRecord();
        record.setStudentId(studentId);
        record.setWrongQuestions(aiResult.get("wrongQuestions"));
        record.setErrorAnalysis(aiResult.get("errorAnalysis"));
        record.setKnowledgePoints(aiResult.get("knowledgePoints"));
        record.setSuggestions(aiResult.get("suggestions"));

        mapper.insert(record);

        // 自动从知识点文本中提取并创建薄弱点记录
        if (studentId != null) {
            String kpText = aiResult.get("knowledgePoints");
            if (kpText != null && !kpText.isEmpty()) {
                weakPointService.autoCreateFromErrorAnalysis(studentId, kpText, record.getId());
            }
        }

        return record;
    }

    public HomeworkAnalysisRecord getRecord(Long id) {
        HomeworkAnalysisRecord record = mapper.selectById(id);
        if (record == null) {
            throw new RuntimeException("Record not found");
        }
        return record;
    }

    public HomeworkAnalysisRecord updatePdfUrl(Long id, String pdfUrl) {
        HomeworkAnalysisRecord record = getRecord(id);
        record.setPdfUrl(pdfUrl);
        mapper.updateById(record);
        return record;
    }
}