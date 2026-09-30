package com.mtorg.meeting_organize.dto;

import com.mtorg.meeting_organize.ai.AiDtos;
import com.mtorg.meeting_organize.domain.ChangeHistory;
import com.mtorg.meeting_organize.domain.ChangeRequest;
import com.mtorg.meeting_organize.domain.ChangeType;
import com.mtorg.meeting_organize.domain.SourceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;

public class ChangeDtos {

    /** AI 분석 경로: 출처 + 수정내용만 받고, 비교/반영은 서버가 Claude 로 수행 */
    public record CreateRequest(
            @NotNull SourceType sourceType,
            @NotBlank String content,
            Long createdBy) {}

    /** 수동 반영 경로: 이미 확정된 변경목록을 그대로 적용 (AI 초안 사용자 수정 후 확정 / 키 없이 테스트) */
    public record ApplyRequest(
            @NotNull SourceType sourceType,
            @NotBlank String content,
            Long createdBy,
            List<AiDtos.Change> changes) {}

    public record RequestResponse(
            Long id, SourceType sourceType, String content, Long createdBy, LocalDateTime createdAt) {

        public static RequestResponse from(ChangeRequest c) {
            return new RequestResponse(c.getId(), c.getSourceType(), c.getContent(),
                    c.getCreatedBy(), c.getCreatedAt());
        }
    }

    public record HistoryResponse(
            Long id, Long projectId, Long taskId, String taskTitle, String assigneeName, Long changeId,
            SourceType sourceType, String before, String after, ChangeType changeType, LocalDateTime createdAt) {

        public static HistoryResponse from(ChangeHistory h) {
            return from(h, null, null, null);
        }

        public static HistoryResponse from(ChangeHistory h, String taskTitle, String assigneeName) {
            return from(h, taskTitle, assigneeName, null);
        }

        public static HistoryResponse from(ChangeHistory h, String taskTitle, String assigneeName,
                                           SourceType sourceType) {
            return new HistoryResponse(h.getId(), h.getProjectId(), h.getTaskId(), taskTitle, assigneeName,
                    h.getChangeId(), sourceType, h.getBeforeValue(), h.getAfterValue(),
                    h.getChangeType(), h.getCreatedAt());
        }
    }

    /** 변경 반영 결과: 저장된 수정요청 id + 적용 건수 + 이력 + 반영 후 작업 목록 */
    public record ApplyResult(
            Long changeRequestId,
            int appliedCount,
            List<HistoryResponse> histories,
            List<TaskDtos.Response> tasks) {}
}
