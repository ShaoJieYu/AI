package com.lessonplatform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 备课内容直接入库请求 DTO
 *
 * 用于 Agent 已生成五段式内容后直接入库的场景（不重复调 AI）。
 * 字段对齐 AI 服务 generate_lesson 工具的输出。
 */
@Data
public class LessonSaveRequest {

    @NotBlank(message = "科目不能为空")
    private String subject;

    @NotBlank(message = "备课主题不能为空")
    private String teachingGoal;

    /** 难度：基础/中等/提高 */
    private String difficulty;

    /** 课程时长（分钟） */
    private Integer duration;

    /** 备课模式，默认 new_lesson */
    private String generateType;

    /** 五段式内容（字段名与 AI 服务返回对齐） */
    private String coreDefinition;
    private String teachingAnalysis;
    private String mistakeWarnings;
    private String scoreBoosting;
    private String exampleDerivation;
}
