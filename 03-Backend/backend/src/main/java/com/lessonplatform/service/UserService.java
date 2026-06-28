package com.lessonplatform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.lessonplatform.common.BusinessException;
import com.lessonplatform.dto.LoginRequest;
import com.lessonplatform.dto.LoginResponse;
import com.lessonplatform.dto.RegisterRequest;
import com.lessonplatform.model.User;
import com.lessonplatform.repository.UserMapper;
import com.lessonplatform.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * 用户服务类
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final VerificationCodeService verificationCodeService;

    public LoginResponse login(LoginRequest request) {
        User user = userMapper.selectOne(new LambdaQueryWrapper<User>()
                .eq(User::getUsername, request.getUsername()));

        if (user == null) {
            throw new BusinessException("用户不存在");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BusinessException("密码错误");
        }

        if (user.getStatus() != 1) {
            throw new BusinessException("账号已被禁用");
        }

        String token = jwtTokenProvider.generateToken(user.getId(), user.getUsername(), user.getRole());

        return new LoginResponse(token, user.getId(), user.getUsername(),
                user.getRealName(), user.getRole(), user.getAvatar());
    }

    public LoginResponse register(RegisterRequest request) {
        // 校验必填项
        if (request.getUsername() == null || request.getUsername().trim().isEmpty()) {
            throw new BusinessException("用户名不能为空");
        }
        if (request.getPassword() == null || request.getPassword().trim().isEmpty()) {
            throw new BusinessException("密码不能为空");
        }
        if (request.getRealName() == null || request.getRealName().trim().isEmpty()) {
            throw new BusinessException("真实姓名不能为空");
        }
        if (request.getPhone() == null || request.getPhone().trim().isEmpty()) {
            throw new BusinessException("手机号不能为空");
        }
        if (request.getCode() == null || request.getCode().trim().isEmpty()) {
            throw new BusinessException("验证码不能为空");
        }

        // 1. 校验验证码
        if (!verificationCodeService.verifyCode(request.getPhone(), request.getCode())) {
            throw new BusinessException("验证码错误或已过期");
        }

        User existUser = userMapper.selectOne(new LambdaQueryWrapper<User>()
                .eq(User::getUsername, request.getUsername()));
        if (existUser != null) {
            throw new BusinessException("用户名已存在");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRealName(request.getRealName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setSubjects(request.getSubjects());
        user.setTeachingYears(request.getTeachingYears());
        user.setEducationBackground(request.getEducationBackground());
        user.setSelfIntro(request.getSelfIntro());
        user.setStatus(1);
        user.setRole(2);

        userMapper.insert(user);
        
        // 生成Token以支持注册后自动登录
        String token = jwtTokenProvider.generateToken(user.getId(), user.getUsername(), user.getRole());
        
        return new LoginResponse(token, user.getId(), user.getUsername(),
                user.getRealName(), user.getRole(), user.getAvatar());
    }

    public User getUserById(Long id) {
        User user = userMapper.selectById(id);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        user.setPassword(null);
        return user;
    }

    public User updateUser(Long id, RegisterRequest request) {
        User user = userMapper.selectById(id);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }

        if (request.getRealName() != null) {
            user.setRealName(request.getRealName());
        }
        if (request.getEmail() != null) {
            user.setEmail(request.getEmail());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        if (request.getSubjects() != null) {
            user.setSubjects(request.getSubjects());
        }
        if (request.getTeachingYears() != null) {
            user.setTeachingYears(request.getTeachingYears());
        }
        if (request.getEducationBackground() != null) {
            user.setEducationBackground(request.getEducationBackground());
        }
        if (request.getSelfIntro() != null) {
            user.setSelfIntro(request.getSelfIntro());
        }

        userMapper.updateById(user);
        user.setPassword(null);
        return user;
    }

    public void updatePassword(Long id, String oldPassword, String newPassword) {
        User user = userMapper.selectById(id);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }

        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new BusinessException("原密码错误");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userMapper.updateById(user);
    }
}
