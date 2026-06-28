package com.lessonplatform.model;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * 备课计划实体类
 */
@Data
@TableName("lesson_plan")
public class LessonPlan {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long tutorId;

    private Long studentId;

    private String title;

    private String subject;

    private String grade;

    private String teachingGoal;

    private String difficulty;

    private String estimatedDuration;

    private String status;

    private String generateType;

    private String aiModel;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    @TableLogic
    private Integer deleted;
}
