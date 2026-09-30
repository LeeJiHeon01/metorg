package com.mtorg.meeting_organize.repository;

import com.mtorg.meeting_organize.domain.Project;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    List<Project> findAllByOrderByUpdatedAtDesc();
}
