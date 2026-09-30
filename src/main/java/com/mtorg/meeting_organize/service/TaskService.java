package com.mtorg.meeting_organize.service;

import com.mtorg.meeting_organize.domain.ChangeHistory;
import com.mtorg.meeting_organize.domain.ChangeType;
import com.mtorg.meeting_organize.domain.Task;
import com.mtorg.meeting_organize.domain.TaskStatus;
import com.mtorg.meeting_organize.dto.TaskDtos;
import com.mtorg.meeting_organize.repository.ChangeHistoryRepository;
import com.mtorg.meeting_organize.repository.TaskRepository;
import com.mtorg.meeting_organize.web.NotFoundException;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class TaskService {

    private final TaskRepository taskRepository;
    private final ChangeHistoryRepository changeHistoryRepository;

    public TaskService(TaskRepository taskRepository,
                       ChangeHistoryRepository changeHistoryRepository) {
        this.taskRepository = taskRepository;
        this.changeHistoryRepository = changeHistoryRepository;
    }

    /** 프로젝트의 삭제되지 않은 작업 목록 */
    public List<Task> findByProject(Long projectId) {
        return taskRepository.findByProjectIdAndDeletedYnOrderBySortOrderAscIdAsc(projectId, "N");
    }

    public Task get(Long id) {
        Task t = taskRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("task not found: " + id));
        if ("Y".equals(t.getDeletedYn())) {
            throw new NotFoundException("task not found: " + id);
        }
        return t;
    }

    @Transactional
    public Task create(Long projectId, TaskDtos.CreateRequest req) {
        Task t = new Task();
        t.setProjectId(projectId);
        t.setParentTaskId(req.parentTaskId());
        t.setTitle(req.title());
        t.setDescription(req.description());
        t.setAssigneeId(req.assigneeId());
        if (req.sortOrder() != null) {
            t.setSortOrder(req.sortOrder());
        }
        t.setDueDate(req.dueDate());
        Task saved = taskRepository.save(t);

        // 수동 작업 추가 → '추가' 이력
        ChangeHistory h = new ChangeHistory();
        h.setProjectId(projectId);
        h.setTaskId(saved.getId());
        h.setChangeType(ChangeType.ADD);
        h.setAfterValue(snapshot(saved));
        changeHistoryRepository.save(h);

        return saved;
    }

    @Transactional
    public Task update(Long id, TaskDtos.UpdateRequest req) {
        Task t = get(id);
        TaskStatus oldStatus = t.getStatus();
        String oldTitle = t.getTitle();
        String oldDesc = t.getDescription();

        t.setParentTaskId(req.parentTaskId());
        t.setTitle(req.title());
        t.setDescription(req.description());
        if (req.status() != null) {
            t.setStatus(req.status());
        }
        t.setAssigneeId(req.assigneeId());
        if (req.sortOrder() != null) {
            t.setSortOrder(req.sortOrder());
        }
        t.setDueDate(req.dueDate());

        // 제목/세부 내용이 바뀌면 '수정' 이력에 기록 (담당자·마감일·정렬만 바뀐 건 제외)
        if (!Objects.equals(oldTitle, t.getTitle()) || !Objects.equals(oldDesc, t.getDescription())) {
            ChangeHistory h = new ChangeHistory();
            h.setProjectId(t.getProjectId());
            h.setTaskId(t.getId());
            h.setChangeType(ChangeType.UPDATE);
            h.setBeforeValue(snapshot(oldTitle, oldDesc));
            h.setAfterValue(snapshot(t.getTitle(), t.getDescription()));
            changeHistoryRepository.save(h);
        }

        // 상태가 '수정필요' 또는 '완료'로 바뀌면 변경이력에 기록
        TaskStatus newStatus = t.getStatus();
        if (newStatus != oldStatus
                && (newStatus == TaskStatus.NEEDS_FIX || newStatus == TaskStatus.DONE)) {
            ChangeHistory h = new ChangeHistory();
            h.setProjectId(t.getProjectId());
            h.setTaskId(t.getId());
            h.setChangeType(ChangeType.UPDATE);
            h.setBeforeValue("상태: " + oldStatus.label());
            h.setAfterValue("상태: " + newStatus.label());
            changeHistoryRepository.save(h);
        }
        return t;
    }

    /** 소프트 삭제 (deleted_yn = 'Y') — 하위 작업까지 재귀 삭제 + 변경이력에 '제외' 기록 */
    @Transactional
    public void delete(Long id) {
        Task t = get(id);
        // 삭제 이력 기록 (최상위 삭제 작업 기준)
        ChangeHistory h = new ChangeHistory();
        h.setProjectId(t.getProjectId());
        h.setTaskId(t.getId());
        h.setChangeType(ChangeType.REMOVE);
        h.setBeforeValue(snapshot(t));
        changeHistoryRepository.save(h);

        softDeleteRecursive(t);
    }

    private void softDeleteRecursive(Task t) {
        t.setDeletedYn("Y");
        for (Task child : taskRepository.findByParentTaskIdAndDeletedYn(t.getId(), "N")) {
            softDeleteRecursive(child);
        }
    }

    private static String snapshot(Task t) {
        return snapshot(t.getTitle(), t.getDescription());
    }

    private static String snapshot(String title, String desc) {
        return (desc != null && !desc.isBlank()) ? title + " — " + desc : title;
    }

    /** 여러 작업에 담당자 일괄 지정 (assigneeId=null 이면 담당 해제) */
    @Transactional
    public int bulkAssign(List<Long> taskIds, Long assigneeId) {
        if (taskIds == null || taskIds.isEmpty()) {
            return 0;
        }
        int updated = 0;
        for (Long id : taskIds) {
            Task t = taskRepository.findById(id).orElse(null);
            if (t == null || "Y".equals(t.getDeletedYn())) {
                continue;
            }
            t.setAssigneeId(assigneeId);
            updated++;
        }
        return updated;
    }

    /**
     * 이번 수정본을 마감한다: 모든 작업을 완료 처리한 뒤 작업 목록을 비우고(소프트삭제),
     * 변경이력에 "YYYY-MM-DD 수정본 완료" 스냅샷 1건을 남긴다.
     * (개별 상태변경 이력은 남기지 않고 요약 1건만 기록. 이력의 작업명은 소프트삭제라 계속 조회됨)
     */
    @Transactional
    public int completeAll(Long projectId) {
        List<Task> tasks = findByProject(projectId);
        int count = tasks.size();
        StringBuilder ids = new StringBuilder();
        for (Task t : tasks) {
            t.setStatus(TaskStatus.DONE);
            t.setDeletedYn("Y"); // 목록 초기화
            if (ids.length() > 0) {
                ids.append(',');
            }
            ids.append(t.getId());
        }
        if (count > 0) {
            ChangeHistory h = new ChangeHistory();
            h.setProjectId(projectId);
            h.setChangeType(ChangeType.UPDATE);
            h.setAfterValue(LocalDate.now() + " 수정본 완료 (전체 " + count + "건)");
            h.setPayload(ids.toString()); // 복구용 task id 목록
            changeHistoryRepository.save(h);
        }
        return count;
    }

    /**
     * 가장 최근 최종완료를 취소(복구)한다: 소프트삭제된 작업들을 되살리고 스냅샷 이력을 제거.
     * @return 복구된 작업 수 (없으면 0)
     */
    @Transactional
    public int undoFinalize(Long projectId) {
        ChangeHistory snapshot = changeHistoryRepository
                .findFirstByProjectIdAndPayloadIsNotNullOrderByCreatedAtDesc(projectId)
                .orElse(null);
        if (snapshot == null || snapshot.getPayload() == null || snapshot.getPayload().isBlank()) {
            return 0;
        }
        int restored = 0;
        for (String part : snapshot.getPayload().split(",")) {
            try {
                Long id = Long.parseLong(part.trim());
                Task t = taskRepository.findById(id).orElse(null);
                if (t != null && "Y".equals(t.getDeletedYn())) {
                    t.setDeletedYn("N");
                    restored++;
                }
            } catch (NumberFormatException ignore) {
                // skip
            }
        }
        changeHistoryRepository.delete(snapshot);
        return restored;
    }
}
