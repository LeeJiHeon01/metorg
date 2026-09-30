package com.mtorg.meeting_organize.dto;

import com.mtorg.meeting_organize.domain.User;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;

public class UserDtos {

    public record CreateRequest(@NotBlank String name) {}

    public record Response(Long id, String username, String name, String role, LocalDateTime createdAt) {
        public static Response from(User u) {
            return new Response(
                    u.getId(),
                    u.getUsername(),
                    u.getName(),
                    u.getRole() == null ? "USER" : u.getRole().name(),
                    u.getCreatedAt());
        }
    }
}
