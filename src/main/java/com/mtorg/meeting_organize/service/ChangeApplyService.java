package com.mtorg.meeting_organize.service;

import com.mtorg.meeting_organize.ai.AiDtos;
import com.mtorg.meeting_organize.domain.*;
import com.mtorg.meeting_organize.dto.ChangeDtos;
import com.mtorg.meeting_organize.dto.TaskDtos;
import com.mtorg.meeting_organize.repository.ChangeHistoryRepository;
import com.mtorg.meeting_organize.repository.ChangeRequestRepository;
import com.mtorg.meeting_organize.repository.TaskRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 수정사항(ChangeSet)을 기존 작업 목록에 반영하고, 변경 전/후 이력을 저장한다.
 * (기획서 6·7. 기존 작업 비교 → 반영 → 이력)
 */
@Service
public class ChangeApplyService {

    private final TaskRepository taskRepository;
    private final ChangeRequestRepository changeRequestRepository;
    private final ChangeHistoryRepository changeHistoryRepository;

    public ChangeApplyService(TaskRepository taskRepository,
                              ChangeRequestRepository changeRequestRepository,
                              ChangeHistoryRepository changeHistoryRepository) {
        this.taskRepository = taskRepository;
        this.changeRequestRepository = changeRequestRepository;
        this.changeHistoryRepository = changeHistoryRepository;
    }

    @Transactional
    public ChangeDtos.ApplyResult apply(Long projectId, SourceType sourceType, String content,
                                        Long createdBy, List<AiDtos.Change> changes) {
        // 1) 수정사항 원문 저장
        ChangeRequest cr = new ChangeRequest();
        cr.setProjectId(projectId);
        cr.setSourceType(sourceType);
        cr.setContent(content);
        cr.setCreatedBy(createdBy);
        cr = changeRequestRepository.save(cr);

        List<ChangeHistory> histories = new ArrayList<>();
        int nextOrder = nextSortOrder(projectId);

        if (changes != null) {
            for (AiDtos.Change c : changes) {
                ChangeType type = parseType(c.type());
                if (type == null) {
                    continue;
                }
                switch (type) {
                    case ADD -> {
                        Task t = new Task();
                        t.setProjectId(projectId);
                        t.setParentTaskId(c.parentTaskId());
                        t.setTitle(nonBlank(c.title()) ? c.title() : "(제목 없음)");
                        t.setDescription(c.description() != null ? c.description() : c.after());
                        t.setSortOrder(nextOrder++);
                        Task saved = taskRepository.save(t);
                        histories.add(saveHistory(projectId, saved.getId(), cr.getId(),
                                null, snapshot(saved), ChangeType.ADD));
                    }
                    case UPDATE -> {
                        Optional<Task> found = findActive(projectId, c.taskId());
                        if (found.isEmpty()) {
                            continue;
                        }
                        Task t = found.get();
                        String before = c.before() != null ? c.before() : snapshot(t);
                        if (nonBlank(c.title())) {
                            t.setTitle(c.title());
                        }
                        if (c.after() != null) {
                            t.setDescription(c.after());
                        } else if (c.description() != null) {
                            t.setDescription(c.description());
                        }
                        String after = c.after() != null ? c.after() : snapshot(t);
                        histories.add(saveHistory(projectId, t.getId(), cr.getId(),
                                before, after, ChangeType.UPDATE));
                    }
                    case REMOVE -> {
                        Optional<Task> found = findActive(projectId, c.taskId());
                        if (found.isEmpty()) {
                            continue;
                        }
                        Task t = found.get();
                        String before = snapshot(t);
                        t.setDeletedYn("Y");
                        histories.add(saveHistory(projectId, t.getId(), cr.getId(),
                                before, null, ChangeType.REMOVE));
                    }
                }
            }
        }

        List<TaskDtos.Response> tasks = taskRepository
                .findByProjectIdAndDeletedYnOrderBySortOrderAscIdAsc(projectId, "N")
                .stream().map(TaskDtos.Response::from).toList();
        List<ChangeDtos.HistoryResponse> histResp = histories.stream()
                .map(ChangeDtos.HistoryResponse::from).toList();

        return new ChangeDtos.ApplyResult(cr.getId(), histResp.size(), histResp, tasks);
    }

    /**
     * 최초 MD 분석으로 생성된 작업들을 하나의 ChangeRequest(출처 포함) + 각 작업 ADD 이력으로 기록한다.
     */
    @Transactional
    public void recordInitialImport(Long projectId, SourceType sourceType, String content,
                                    Long createdBy, List<Task> createdTasks) {
        if (createdTasks == null || createdTasks.isEmpty()) {
            return;
        }
        ChangeRequest cr = new ChangeRequest();
        cr.setProjectId(projectId);
        cr.setSourceType(sourceType);
        cr.setContent(content);
        cr.setCreatedBy(createdBy);
        cr = changeRequestRepository.save(cr);
        for (Task t : createdTasks) {
            saveHistory(projectId, t.getId(), cr.getId(), null, snapshot(t), ChangeType.ADD);
        }
    }

    private ChangeHistory saveHistory(Long projectId, Long taskId, Long changeId,
                                      String before, String after, ChangeType type) {
        ChangeHistory h = new ChangeHistory();
        h.setProjectId(projectId);
        h.setTaskId(taskId);
        h.setChangeId(changeId);
        h.setBeforeValue(before);
        h.setAfterValue(after);
        h.setChangeType(type);
        return changeHistoryRepository.save(h);
    }

    private Optional<Task> findActive(Long projectId, Long taskId) {
        if (taskId == null) {
            return Optional.empty();
        }
        return taskRepository.findById(taskId)
                .filter(t -> projectId.equals(t.getProjectId()))
                .filter(t -> !"Y".equals(t.getDeletedYn()));
    }

    private int nextSortOrder(Long projectId) {
        return taskRepository.findByProjectIdAndDeletedYnOrderBySortOrderAscIdAsc(projectId, "N")
                .stream().map(Task::getSortOrder).filter(Objects::nonNull)
                .max(Integer::compareTo).map(m -> m + 1).orElse(0);
    }

    private static String snapshot(Task t) {
        return nonBlank(t.getDescription()) ? t.getTitle() + " — " + t.getDescription() : t.getTitle();
    }

    private static boolean nonBlank(String s) {
        return s != null && !s.isBlank();
    }

    private static ChangeType parseType(String s) {
        if (s == null) {
            return null;
        }
        try {
            return ChangeType.valueOf(s.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
