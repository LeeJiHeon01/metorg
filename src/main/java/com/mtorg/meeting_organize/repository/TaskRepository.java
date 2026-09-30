package com.mtorg.meeting_organize.repository;

import com.mtorg.meeting_organize.domain.Task;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskRepository extends JpaRepository<Task, Long> {

    /** 삭제되지 않은 작업만 정렬 순서대로 조회 */
    List<Task> findByProjectIdAndDeletedYnOrderBySortOrderAscIdAsc(Long projectId, String deletedYn);

    /** 특정 상위 작업의 (삭제되지 않은) 하위 작업들 */
    List<Task> findByParentTaskIdAndDeletedYn(Long parentTaskId, String deletedYn);
}
