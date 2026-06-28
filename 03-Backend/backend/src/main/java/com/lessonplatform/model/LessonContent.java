package com.lessonplatform.model;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * 备课内容实体类
 */
@Data
@TableName("lesson_content")
public class LessonContent {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long lessonPlanId;

    private String contentType;

    private String title;

    private String content;

    private Integer sortOrder;

    private String metadata;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    @TableLogic
    private Integer deleted;
}
