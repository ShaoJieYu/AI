package com.lessonplatform.model;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * 学生薄弱知识点
 */
@Data
@TableName("student_weak_point")
public class StudentWeakPoint {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long studentId;

    private String subject;

    private String knowledgePoint;

    private String masteryLevel;

    private String source;

    private Long sourceId;

    private String notes;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    @TableLogic
    private Integer deleted;
}