package com.lessonplatform.model;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("homework_analysis_record")
public class HomeworkAnalysisRecord {
    
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long studentId;

    private String wrongQuestions;
    
    private String errorAnalysis;
    
    private String knowledgePoints;
    
    private String suggestions;
    
    private String pdfUrl; // Store the PDF url if generated

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
