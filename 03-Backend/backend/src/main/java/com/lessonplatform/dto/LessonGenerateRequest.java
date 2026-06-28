package com.lessonplatform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 备课生成请求DTO
 * 字段与前端 GenerateLessonRequest 对齐
 */
@Data
public class LessonGenerateRequest {

    private Long studentId;

    @NotBlank(message = "科目不能为空")
    private String subject;

    @NotBlank(message = "备课主题不能为空")
    private String topic;

    @NotBlank(message = "备课模式不能为空")
    private String mode;

    @NotNull(message = "课程时长不能为空")
    private Integer duration;

    @NotNull(message = "难度不能为空")
    private Integer difficulty;

    private String customRequirements;
}
