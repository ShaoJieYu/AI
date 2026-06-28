package com.lessonplatform;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class PasswordTest {
    @Test
    public void testPassword() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        System.out.println("TEST_PASSWORD_HASH_START");
        System.out.println(encoder.encode("123456"));
        System.out.println("TEST_PASSWORD_HASH_END");
    }
}
