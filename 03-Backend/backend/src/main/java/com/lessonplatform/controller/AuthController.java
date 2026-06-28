package com.lessonplatform.controller;

import com.lessonplatform.common.Result;
import com.lessonplatform.dto.LoginRequest;
import com.lessonplatform.dto.LoginResponse;
import com.lessonplatform.dto.RegisterRequest;
import com.lessonplatform.dto.SendCodeRequest;
import com.lessonplatform.model.User;
import com.lessonplatform.security.SecurityUtils;
import com.lessonplatform.service.UserService;
import com.lessonplatform.service.VerificationCodeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 用户认证控制器
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final VerificationCodeService verificationCodeService;

    @PostMapping("/send-code")
    public Result<Void> sendCode(@Valid @RequestBody SendCodeRequest request) {
        verificationCodeService.sendCode(request.getPhone());
        return Result.success("验证码发送成功", null);
    }

    @PostMapping("/login")
    public Result<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = userService.login(request);
        return Result.success("登录成功", response);
    }

    @PostMapping("/register")
    public Result<LoginResponse> register(@Valid @RequestBody RegisterRequest request) {
        LoginResponse response = userService.register(request);
        return Result.success("注册成功", response);
    }

    @GetMapping("/currentUser")
    public Result<Map<String, Object>> getCurrentUser() {
        Long userId = SecurityUtils.getCurrentUserId();
        User user = userService.getUserById(userId);

        Map<String, Object> data = new HashMap<>();
        data.put("userId", user.getId());
        data.put("username", user.getUsername());
        data.put("realName", user.getRealName());
        data.put("email", user.getEmail());
        data.put("phone", user.getPhone());
        data.put("avatar", user.getAvatar());
        data.put("role", user.getRole());
        data.put("subjects", user.getSubjects());
        data.put("teachingYears", user.getTeachingYears());

        return Result.success(data);
    }

    @PutMapping("/updateProfile")
    public Result<User> updateProfile(@Valid @RequestBody RegisterRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        User user = userService.updateUser(userId, request);
        return Result.success("更新成功", user);
    }

    @PutMapping("/updatePassword")
    public Result<Void> updatePassword(@RequestBody Map<String, String> params) {
        Long userId = SecurityUtils.getCurrentUserId();
        String oldPassword = params.get("oldPassword");
        String newPassword = params.get("newPassword");
        userService.updatePassword(userId, oldPassword, newPassword);
        return Result.success("密码修改成功", null);
    }

    @PostMapping("/logout")
    public Result<Void> logout() {
        return Result.success("登出成功", null);
    }
}
