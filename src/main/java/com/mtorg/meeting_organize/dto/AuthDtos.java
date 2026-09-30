package com.mtorg.meeting_organize.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class AuthDtos {

    public record SignupRequest(
            @NotBlank String username,
            @NotBlank String password,
            String name) {}

    public record LoginRequest(
            @NotBlank String username,
            @NotBlank String password) {}

    public record ChangePasswordRequest(
            @NotNull Long userId,
            @NotBlank String currentPassword,
            @NotBlank String newPassword) {}

    public record UpdateProfileRequest(
            @NotNull Long userId,
            @NotBlank String name) {}
}
