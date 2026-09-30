package com.mtorg.meeting_organize.dto;

import com.mtorg.meeting_organize.domain.Project;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;

public class ProjectDtos {

    public record CreateRequest(
            @NotBlank String projectName,
            String description,
            Long createdBy) {}

    public record UpdateRequest(
            @NotBlank String projectName,
            String description) {}

    public record Response(
            Long id,
            String projectName,
            String description,
            Long createdBy,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {

        public static Response from(Project p) {
            return new Response(
                    p.getId(),
                    p.getProjectName(),
                    p.getDescription(),
                    p.getCreatedBy(),
                    p.getCreatedAt(),
                    p.getUpdatedAt());
        }
    }
}
