package com.mtorg.meeting_organize.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * 작업. parent_task_id 로 기능 → 요구사항 → 세부사항 계층 구조를 표현한다.
 */
@Entity
@Table(name = "task")
@Getter
@Setter
@NoArgsConstructor
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "task_id")
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    /** 상위 작업 (계층 구조). 최상위면 null */
    @Column(name = "parent_task_id")
    private Long parentTaskId;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TaskStatus status = TaskStatus.NOT_STARTED;

    /** 담당자 (USER.user_id) */
    @Column(name = "assignee_id")
    private Long assigneeId;

    @Column(name = "sort_order")
    private Integer sortOrder = 0;

    /** 마감일 (선택) */
    @Column(name = "due_date")
    private java.time.LocalDate dueDate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** 소프트 삭제 여부 (Y/N) */
    @Column(name = "deleted_yn", nullable = false, length = 1)
    private String deletedYn = "N";
}
