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

    public HomeworkAnalysisRecord analyzeAndSave(List<String> base64Images) {
        log.info("Receiving {} images for homework analysis", base64Images.size());
        Map<String, String> aiResult = aiService.analyzeHomework(base64Images);

        HomeworkAnalysisRecord record = new HomeworkAnalysisRecord();
        record.setWrongQuestions(aiResult.get("wrongQuestions"));
        record.setErrorAnalysis(aiResult.get("errorAnalysis"));
        record.setKnowledgePoints(aiResult.get("knowledgePoints"));
        record.setSuggestions(aiResult.get("suggestions"));

        mapper.insert(record);
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
