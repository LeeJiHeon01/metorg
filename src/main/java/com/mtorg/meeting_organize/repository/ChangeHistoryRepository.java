package com.mtorg.meeting_organize.repository;

import com.mtorg.meeting_organize.domain.ChangeHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChangeHistoryRepository extends JpaRepository<ChangeHistory, Long> {

    List<ChangeHistory> findByProjectIdOrderByCreatedAtDesc(Long projectId);

    /** 가장 최근 최종완료 스냅샷 (복구 대상 payload 보유) */
    java.util.Optional<ChangeHistory> findFirstByProjectIdAndPayloadIsNotNullOrderByCreatedAtDesc(Long projectId);
}
