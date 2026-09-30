package com.mtorg.meeting_organize.service;

import com.mtorg.meeting_organize.domain.Role;
import com.mtorg.meeting_organize.domain.User;
import com.mtorg.meeting_organize.dto.AuthDtos;
import com.mtorg.meeting_organize.repository.UserRepository;
import com.mtorg.meeting_organize.web.NotFoundException;
import com.mtorg.meeting_organize.web.UnauthorizedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public User signup(AuthDtos.SignupRequest req) {
        String username = req.username().trim();
        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("이미 사용 중인 아이디입니다: " + username);
        }
        String name = (req.name() != null && !req.name().isBlank()) ? req.name().trim() : username;
        User user = new User(username, passwordEncoder.encode(req.password()), name, Role.USER);
        return userRepository.save(user);
    }

    public User login(AuthDtos.LoginRequest req) {
        User user = userRepository.findByUsername(req.username().trim())
                .orElseThrow(() -> new UnauthorizedException("아이디 또는 비밀번호가 올바르지 않습니다."));
        if (user.getPassword() == null || !passwordEncoder.matches(req.password(), user.getPassword())) {
            throw new UnauthorizedException("아이디 또는 비밀번호가 올바르지 않습니다.");
        }
        return user;
    }

    @Transactional
    public void changePassword(Long userId, String currentPassword, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("user not found: " + userId));
        if (user.getPassword() == null || !passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new UnauthorizedException("현재 비밀번호가 올바르지 않습니다.");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
    }

    @Transactional
    public User updateProfile(Long userId, String name) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("user not found: " + userId));
        if (name != null && !name.isBlank()) {
            user.setName(name.trim());
        }
        return user;
    }
}
