package com.mtorg.meeting_organize.config;

import com.mtorg.meeting_organize.domain.Role;
import com.mtorg.meeting_organize.domain.User;
import com.mtorg.meeting_organize.repository.UserRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * 관리자 계정(webmaster) 시드. 없으면 생성한다.
 * 비밀번호는 환경변수 ADMIN_PASSWORD 로 덮어쓸 수 있고, 미지정 시 기본값 사용.
 */
@Component
public class AdminSeeder implements ApplicationRunner {

    private static final String ADMIN_USERNAME = "webmaster";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String adminPassword;

    public AdminSeeder(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       org.springframework.core.env.Environment env) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminPassword = env.getProperty("ADMIN_PASSWORD", "rhdxhd12");
    }

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.findByUsername(ADMIN_USERNAME).isEmpty()) {
            User admin = new User(ADMIN_USERNAME, passwordEncoder.encode(adminPassword), "관리자", Role.ADMIN);
            userRepository.save(admin);
        }
    }
}
