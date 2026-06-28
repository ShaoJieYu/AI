package com.lessonplatform.service;

import com.lessonplatform.common.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Random;
import java.util.concurrent.TimeUnit;

/**
 * 验证码服务类
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VerificationCodeService {

    // 使用内存 Map 替代 Redis，针对开发环境
    private static final java.util.Map<String, CodeInfo> codeMap = new java.util.concurrent.ConcurrentHashMap<>();
    private static final long EXPIRE_MINUTES = 5;

    @lombok.Data
    @lombok.AllArgsConstructor
    private static class CodeInfo {
        private String code;
        private long expireTime;
    }

    /**
     * 发送验证码
     */
    public void sendCode(String phone) {
        // 1. 生成6位随机数字验证码
        String code = String.format("%06d", new Random().nextInt(1000000));
        
        // 2. 保存到内存，设置5分钟过期
        long expireTime = System.currentTimeMillis() + EXPIRE_MINUTES * 60 * 1000;
        codeMap.put(phone, new CodeInfo(code, expireTime));
        
        // 3. 模拟发送（打印到控制台）
        log.info("【验证码】正在向手机号 {} 发送验证码: {}", phone, code);
        System.out.println("【验证码】正在向手机号 " + phone + " 发送验证码: " + code);
    }

    /**
     * 校验验证码
     */
    public boolean verifyCode(String phone, String code) {
        if (code == null || code.isEmpty()) {
            return false;
        }
        
        CodeInfo info = codeMap.get(phone);
        if (info == null) {
            return false;
        }
        
        // 检查过期
        if (System.currentTimeMillis() > info.getExpireTime()) {
            codeMap.remove(phone);
            return false;
        }
        
        boolean match = info.getCode().equals(code);
        if (match) {
            // 验证通过后删除验证码，防止重复使用
            codeMap.remove(phone);
        }
        return match;
    }
}
