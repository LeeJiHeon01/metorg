package com.mtorg.meeting_organize.dto;

import com.mtorg.meeting_organize.domain.Task;
import com.mtorg.meeting_organize.domain.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class TaskDtos {

    public record CreateRequest(
            Long parentTaskId,
            @NotBlank String title,
            String description,
            Long assigneeId,
            Integer sortOrder,
            LocalDate dueDate) {}

    public record UpdateRequest(
            Long parentTaskId,
            @NotBlank String title,
            String description,
            TaskStatus status,
            Long assigneeId,
            Integer sortOrder,
            LocalDate dueDate) {}

    public record Response(
            Long id,
            Long projectId,
            Long parentTaskId,
            String title,
            String description,
            TaskStatus status,
            Long assigneeId,
            Integer sortOrder,
            LocalDate dueDate,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {

        public static Response from(Task t) {
            return new Response(
                    t.getId(),
                    t.getProjectId(),
                    t.getParentTaskId(),
                    t.getTitle(),
                    t.getDescription(),
                    t.getStatus(),
                    t.getAssigneeId(),
                    t.getSortOrder(),
                    t.getDueDate(),
                    t.getCreatedAt(),
                    t.getUpdatedAt());
        }
    }
}
