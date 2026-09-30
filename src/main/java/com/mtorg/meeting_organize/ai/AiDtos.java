package com.mtorg.meeting_organize.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

/**
 * Claude 응답 JSON 을 파싱하기 위한 DTO.
 * AI 가 스키마 외 필드를 섞어 보내도 견디도록 unknown 무시.
 */
public class AiDtos {

    /** 최초 MD 분석 결과: 작업 트리 */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TaskTree(List<TaskNode> tasks) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TaskNode(String title, String description, List<TaskNode> children) {}

    /** 수정사항 분석 결과: 변경 목록 */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ChangeSet(List<Change> changes) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Change(
            String type,          // ADD | UPDATE | REMOVE
            Long taskId,          // UPDATE/REMOVE 대상
            Long parentTaskId,    // ADD 시 상위 작업
            String title,
            String before,
            String after,
            String description) {}
}
