package com.lessonplatform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 发送验证码请求DTO
 */
@Data
public class SendCodeRequest {
    @NotBlank(message = "手机号不能为空")
    private String phone;
}
