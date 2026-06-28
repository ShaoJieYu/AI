package com.lessonplatform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * 学生表单DTO
 */
@Data
public class StudentFormDTO {

    private Long id;

    @NotBlank(message = "学生姓名不能为空")
    private String name;

    private String gender;

    private Integer age;

    @NotBlank(message = "年级不能为空")
    private String grade;

    private String school;

    @NotBlank(message = "当前科目不能为空")
    private String currentSubject;

    private String weakSubjects;

    private String learningBasics;

    private String studyHabits;

    private String personality;

    private String parentName;

    @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式不正确")
    private String parentContact;

    private String status;

    private String tags;

    private String remark;

    private Integer midtermTarget;

    private Integer knowledgeMastery;

    private Integer homeworkCompletion;
}
