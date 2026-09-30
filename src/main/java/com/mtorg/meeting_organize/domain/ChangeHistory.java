package com.mtorg.meeting_organize.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

/**
 * 작업 변경 전/후 이력 (기획서 7. 변경 전/후 이력 자동 저장).
 */
@Entity
@Table(name = "change_history")
@Getter
@Setter
@NoArgsConstructor
public class ChangeHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "history_id")
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "task_id")
    private Long taskId;

    /** 이 변경을 유발한 수정사항 (CHANGE_REQUEST.change_id) */
    @Column(name = "change_id")
    private Long changeId;

    @Column(name = "before_value", length = 4000)
    private String beforeValue;

    @Column(name = "after_value", length = 4000)
    private String afterValue;

    @Enumerated(EnumType.STRING)
    @Column(name = "change_type", nullable = false, length = 20)
    private ChangeType changeType;

    /** 부가 데이터 (예: 최종완료 스냅샷의 복구 대상 task id 목록 CSV) */
    @Column(name = "payload", length = 4000)
    private String payload;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
