package com.mtorg.meeting_organize.web;

import com.mtorg.meeting_organize.dto.AuthDtos;
import com.mtorg.meeting_organize.dto.UserDtos;
import com.mtorg.meeting_organize.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    public UserDtos.Response signup(@Valid @RequestBody AuthDtos.SignupRequest req) {
        return UserDtos.Response.from(authService.signup(req));
    }

    @PostMapping("/login")
    public UserDtos.Response login(@Valid @RequestBody AuthDtos.LoginRequest req) {
        return UserDtos.Response.from(authService.login(req));
    }

    @PostMapping("/change-password")
    public void changePassword(@Valid @RequestBody AuthDtos.ChangePasswordRequest req) {
        authService.changePassword(req.userId(), req.currentPassword(), req.newPassword());
    }

    @PutMapping("/profile")
    public UserDtos.Response updateProfile(@Valid @RequestBody AuthDtos.UpdateProfileRequest req) {
        return UserDtos.Response.from(authService.updateProfile(req.userId(), req.name()));
    }
}
