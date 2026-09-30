package com.mtorg.meeting_organize.domain;

/**
 * 작업 상태 (기획서 8. 작업 상태 관리)
 */
public enum TaskStatus {
    NOT_STARTED("미진행"),
    IN_PROGRESS("진행중"),
    REVIEW_REQUESTED("재확인요청"),
    NEEDS_FIX("수정필요"),
    DONE("진행완료");

    private final String label;

    TaskStatus(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
