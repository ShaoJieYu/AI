package com.lessonplatform.model;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * 学生实体类
 */
@Data
@TableName("student")
public class Student {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long tutorId;

    private String name;

    private String gender;

    private Integer age;

    private String grade;

    private String school;

    private String currentSubject;

    private String weakSubjects;

    private String learningBasics;

    private String studyHabits;

    private String personality;

    private String parentName;

    private String parentContact;

    private String status;

    private String tags;

    private String remark;

    private Integer midtermTarget;

    private Integer knowledgeMastery;

    private Integer homeworkCompletion;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    @TableLogic
    private Integer deleted;
}
