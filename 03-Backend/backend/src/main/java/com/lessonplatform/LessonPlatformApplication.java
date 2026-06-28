package com.lessonplatform;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 全自动家教备课内容生成平台 - 后端服务启动类
 */
@SpringBootApplication
@MapperScan("com.lessonplatform.repository")
@EnableScheduling
public class LessonPlatformApplication {

    public static void main(String[] args) {
        // Sentinel 日志目录重定向到项目内，避免 C:\Users\<user>\logs\csp 权限问题导致请求链路异常
        // 必须在 SpringApplication.run 触发 Sentinel 静态初始化之前设置
        System.setProperty("csp.sentinel.log.dir", "D:/AI/03-Backend/backend/logs/sentinel");
        SpringApplication.run(LessonPlatformApplication.class, args);
    }
}
