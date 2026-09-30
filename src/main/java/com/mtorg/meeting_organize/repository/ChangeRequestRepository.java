package com.mtorg.meeting_organize.repository;

import com.mtorg.meeting_organize.domain.ChangeRequest;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChangeRequestRepository extends JpaRepository<ChangeRequest, Long> {

    List<ChangeRequest> findByProjectIdOrderByCreatedAtDesc(Long projectId);
}
