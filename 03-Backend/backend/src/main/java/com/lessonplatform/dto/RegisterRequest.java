package com.lessonplatform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 注册请求DTO
 */
@Data
public class RegisterRequest {

    private String username;

    private String password;

    private String realName;

    private String email;

    private String phone;

    private String subjects;

    private String teachingYears;

    private String educationBackground;

    private String selfIntro;

    private String code;
}
